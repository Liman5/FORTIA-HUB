// ============================================================
// FORTIA HUB — HANDLERS D'ÉCRITURE (Phase 5)
// Généré depuis l'ancien switch ; l'autorisation et la validation
// restent centralisées dans /api/platform/write.
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/services/notifyUser";

import { requireStoreAccess } from "@/lib/server/writeAuthorization";

import { EMAIL_PATTERN } from "../helpers";
import type { WriteHandlerContext } from "../types";

export async function handleVendorsAction(
  action: string,
  context: WriteHandlerContext
): Promise<Response | null> {
  const { auth, data } = context;
  switch (action) {
    case "submit-vendor-app": {
        // Candidature ouverte aux visiteurs ; si un membre est connecté,
        // le dossier est rattaché à SON compte (jamais à un userId fourni).
        const applicantUserId = auth.user?.id || undefined;
        const applicantName = String(data.applicantName || "").trim();
        const applicantEmail = String(data.email || "").trim().toLowerCase();
        const storeName = String(data.storeName || "").trim();
        if (!applicantName || !storeName || !EMAIL_PATTERN.test(applicantEmail)) {
          return NextResponse.json(
            {
              success: false,
              error: "Nom, nom de boutique et adresse e-mail valides requis.",
            },
            { status: 400 }
          );
        }
        const created = await prisma.vendorApplication.create({
          data: {
            userId: applicantUserId,
            applicantName,
            email: applicantEmail,
            phone: data.phone || "",
            storeName,
            storeCategory: data.storeCategory || "",
            storeDescription: data.storeDescription || "",
            experienceBio: data.experienceBio || "",
            status: "En_attente",
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

    case "approve-vendor-app": {
        const app = await prisma.vendorApplication.findUnique({
          where: { id: data.id },
        });
        if (!app) {
          return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
        }

        await prisma.vendorApplication.update({
          where: { id: data.id },
          data: { status: "Approuve" } as any,
        });

        const baseSlug = app.storeName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const slug = `${baseSlug}-${Date.now().toString(36)}`;

        const store = await prisma.store.create({
          data: {
            vendorId: app.userId || undefined,
            ownerName: app.applicantName,
            ownerEmail: app.email,
            ownerPhone: app.phone,
            name: app.storeName,
            slug,
            description: app.storeDescription,
            categories: [app.storeCategory],
            status: "active",
            isVerified: false,
            salesCount: 0,
            totalRevenueUsd: 0,
            rating: 5,
          } as any,
        });

        const sellerUser = app.userId
          ? await prisma.user.findUnique({ where: { id: app.userId } })
          : await prisma.user.findFirst({ where: { email: app.email } });

        if (sellerUser) {
          await notifyUser(sellerUser.id, {
            title: "Boutique approuvee !",
            message: "Felicitations " + app.applicantName + " ! Votre boutique " + app.storeName + " a ete approuvee.",
            type: "success",
            linkTab: "vendor",
          });
        }

        return NextResponse.json({ success: true, storeId: store.id, notified: !!sellerUser });
      }

    case "reject-vendor-app": {
        const app = await prisma.vendorApplication.findUnique({
          where: { id: data.id },
        });
        if (!app) {
          return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
        }

        await prisma.vendorApplication.update({
          where: { id: data.id },
          data: { status: "Rejete" } as any,
        });

        const sellerUser = app.userId
          ? await prisma.user.findUnique({ where: { id: app.userId } })
          : await prisma.user.findFirst({ where: { email: app.email } });

        if (sellerUser) {
          await notifyUser(sellerUser.id, {
            title: "Boutique non approuvee",
            message: "Bonjour " + app.applicantName + ", votre demande de boutique " + app.storeName + " n'a pas ete approuvee.",
            type: "warning",
            linkTab: "vendor",
          });
        }

        return NextResponse.json({ success: true, notified: !!sellerUser });
      }

    case "update-store": {
        // Boutique résolue et propriété vérifiée (propriétaire ou admin).
        const targetStore = await requireStoreAccess(auth, data.storeId);

        const storeData: any = {};
        if (typeof data.name === "string" && data.name) storeData.name = data.name;
        if (typeof data.description === "string") storeData.description = data.description;
        if (typeof data.logo === "string") storeData.logo = data.logo;
        if (typeof data.banner === "string") storeData.banner = data.banner;
        if (Array.isArray(data.categories)) storeData.categories = data.categories;

        const updated = await prisma.store.update({
          where: { id: targetStore.id },
          data: storeData,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }
  }
  return null;
}
