// ============================================================
// FORTIA HUB — HANDLERS D'ÉCRITURE (Phase 5)
// Généré depuis l'ancien switch ; l'autorisation et la validation
// restent centralisées dans /api/platform/write.
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { WriteError, assertContentOwnership, assertProductAccess, requireActorUser, requireStoreAccess } from "@/lib/server/writeAuthorization";

import { uuidOrNull } from "../helpers";
import type { WriteHandlerContext } from "../types";

export async function handleMarketplaceAction(
  action: string,
  context: WriteHandlerContext
): Promise<Response | null> {
  const { auth, data } = context;
  switch (action) {
    case "create-product": {
        // Boutique résolue en base puis vérifiée : un vendeur ne peut créer un
        // produit que dans SA boutique (l'admin peut cibler une boutique).
        const storeRef = data.storeId || data.storeName;
        let store:
          | { id: string; name: string; vendorId: string | null; ownerEmail: string; logo: string }
          | null = null;
        if (storeRef) {
          store = await requireStoreAccess(auth, storeRef);
        } else if (!auth.isAdmin) {
          const seller = requireActorUser(auth);
          store = await prisma.store.findFirst({
            where: { vendorId: seller.id },
            select: { id: true, name: true, vendorId: true, ownerEmail: true, logo: true },
          });
          if (!store) {
            throw new WriteError(403, "Créez une boutique avant de publier un produit.");
          }
        }

        const ownerVendorId = auth.isAdmin
          ? uuidOrNull(data.vendorId) || store?.vendorId || undefined
          : requireActorUser(auth).id;

        const createdProduct = await prisma.product.create({
          data: {
            storeId: store?.id || undefined,
            vendorId: ownerVendorId,
            storeName: store?.name || data.storeName || "FORTIA Digital Official Store",
            storeLogo: data.storeLogo || store?.logo || "",
            title: data.title || "Produit sans titre",
            slug: data.slug || "produit-" + Date.now(),
            type: data.type || "ebook",
            typeLabel: data.typeLabel || data.type || "Produit Numérique",
            description: data.description || "",
            fullDescription: data.fullDescription || "",
            price: data.price || 0,
            originalPrice: data.originalPrice,
            fileFormat: data.fileFormat || "PDF",
            fileSize: data.fileSize || "10 MB",
            image: data.image || "",
            bannerImage: data.bannerImage || "",
            features: data.features || [],
            downloadUrl: data.downloadUrl || "#",
            isPublished: data.isPublished ?? true,
            isApproved: data.isApproved ?? true,
            isPopular: data.isPopular ?? false,
            rating: 5.0,
            reviewsCount: 0,
            salesCount: 0,
          } as any,
        });
        return NextResponse.json({ success: true, id: createdProduct.id });
      }

    case "update-product": {
        // Seul le vendeur propriétaire (ou un admin) peut modifier le produit.
        await assertProductAccess(auth, data.id);
        const updated = await prisma.product.update({
          where: { id: data.id },
          data: {
            title: data.title ?? undefined,
            description: data.description ?? undefined,
            fullDescription: data.fullDescription ?? undefined,
            price: data.price ?? undefined,
            originalPrice: data.originalPrice ?? undefined,
            fileFormat: data.fileFormat ?? undefined,
            fileSize: data.fileSize ?? undefined,
            image: data.image ?? undefined,
            bannerImage: data.bannerImage ?? undefined,
            features: data.features ?? undefined,
            downloadUrl: data.downloadUrl ?? undefined,
            isPublished: data.isPublished ?? undefined,
            // La modération (approbation / mise en avant) reste réservée aux admins.
            isApproved: auth.isAdmin ? (data.isApproved ?? undefined) : undefined,
            isPopular: auth.isAdmin ? (data.isPopular ?? undefined) : undefined,
          } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

    case "moderate-content": {
        const targetType = data.targetType === "product" ? "product" : "course";
        if (!uuidOrNull(data.targetId))
          return NextResponse.json({ error: "targetId (UUID) requis" }, { status: 400 });
        const reason = String(data.reason || "Contenu non conforme aux règles de la plateforme.").slice(0, 600);
        const payload = {
          moderationStatus: "suspended",
          moderationReason: reason,
          moderationAt: new Date(),
          fundsFrozen: true,
          appealStatus: "",
          appealMessage: "",
          isPublished: false,
        } as any;

        if (targetType === "product") {
          await prisma.product.update({ where: { id: data.targetId }, data: payload });
        } else {
          await prisma.course.update({ where: { id: data.targetId }, data: payload as any });
        }
        return NextResponse.json({ success: true });
      }

    case "restore-content": {
        const targetType = data.targetType === "product" ? "product" : "course";
        if (!uuidOrNull(data.targetId))
          return NextResponse.json({ error: "targetId (UUID) requis" }, { status: 400 });
        const payload = {
          moderationStatus: "ok",
          moderationReason: "",
          moderationAt: null,
          fundsFrozen: false,
          appealStatus: "reviewed",
          isPublished: true,
        } as any;
        if (targetType === "product") {
          await prisma.product.update({ where: { id: data.targetId }, data: payload });
        } else {
          await prisma.course.update({ where: { id: data.targetId }, data: payload as any });
        }
        return NextResponse.json({ success: true });
      }

    case "appeal-moderation": {
        const targetType = data.targetType === "product" ? "product" : "course";
        if (!uuidOrNull(data.targetId))
          return NextResponse.json({ error: "targetId (UUID) requis" }, { status: 400 });
        // Seul le propriétaire du contenu suspendu (ou un admin) peut faire appel.
        await assertContentOwnership(auth, targetType, data.targetId);
        const message = String(data.message || "").slice(0, 800);
        if (!message.trim())
          return NextResponse.json({ error: "Expliquez votre demande d'examen." }, { status: 400 });
        const payload = { appealStatus: "pending", appealMessage: message } as any;
        if (targetType === "product") {
          await prisma.product.update({ where: { id: data.targetId }, data: payload });
        } else {
          await prisma.course.update({ where: { id: data.targetId }, data: payload as any });
        }
        return NextResponse.json({ success: true });
      }
  }
  return null;
}
