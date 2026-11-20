// ============================================================
// FORTIA HUB — HANDLERS D'ÉCRITURE (Phase 5)
// Généré depuis l'ancien switch ; l'autorisation et la validation
// restent centralisées dans /api/platform/write.
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/services/notifyUser";

import { assertCenterAccess, requireActorUser } from "@/lib/server/writeAuthorization";

import { uuidOrNull } from "@/lib/validation/common";
import type { WriteHandlerContext } from "../types";

export async function handleCentersAction(
  action: string,
  context: WriteHandlerContext
): Promise<Response | null> {
  const { auth, data } = context;
  switch (action) {
    case "create-training-center": {
        const centerName = data.centerName || "Centre de Formation";
        // UN COMPTE = UN SEUL CENTRE : si l'utilisateur possède déjà un centre,
        // on renvoie celui-ci au lieu d'en créer un doublon (c'est ce qui faisait
        // apparaître plusieurs centres / noms différents sur un même compte).
        const ownerId = auth.isAdmin
          ? uuidOrNull(data.ownerId) || undefined
          : requireActorUser(auth).id;
        if (ownerId) {
          const existing = await prisma.trainingCenter.findFirst({
            where: { ownerId },
            orderBy: [{ feePaid: "desc" }, { createdAt: "desc" }],
          });
          if (existing) {
            return NextResponse.json({
              success: true,
              id: existing.id,
              alreadyExists: true,
              centerName: existing.centerName,
            });
          }
        }
        const slug = centerName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
        const created = await prisma.trainingCenter.create({
          data: {
            ownerId: ownerId || undefined,
            centerName,
            slug,
            description: data.description || "",
            status: "pending",
            feePaid: false,
            feeAmountUsd: 2,
            storageQuotaGb: 4,
            storageUsedBytes: 0,
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

    case "admin-add-instructor": {
        const email = (data.email || "").trim().toLowerCase();
        if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 });
        const user = await prisma.user.findUnique({ where: { email } });
        const centerName = data.centerName || (user ? user.name : email.split("@")[0]) + " Academy";
        const slug = centerName.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);
        const created = await prisma.trainingCenter.create({
          data: {
            ownerId: user?.id || undefined,
            centerName,
            slug,
            description: data.description || "",
            status: "active",
            feePaid: true,
            feeAmountUsd: 2,
            storageQuotaGb: data.storageQuotaGb || 4,
            storageUsedBytes: 0,
          } as any,
        });
        if (user) {
          await notifyUser(user.id, {
            title: "Vous êtes formateur FORTIA HUB !",
            message: "Felicitations " + user.name + " ! L'administration a activé votre centre de formation " + centerName + ".",
            type: "success",
            linkTab: "instructor",
          });
        }
        return NextResponse.json({ success: true, id: created.id, notified: !!user });
      }

    case "ban-training-center": {
        if (!uuidOrNull(data.centerId))
          return NextResponse.json({ error: "centerId (UUID) requis" }, { status: 400 });
        const current = await prisma.trainingCenter.findUnique({
          where: { id: data.centerId },
          select: { status: true },
        });
        if (!current) return NextResponse.json({ error: "Centre introuvable" }, { status: 404 });
        const nextStatus = current.status === "banned" ? "active" : "banned";
        await prisma.trainingCenter.update({
          where: { id: data.centerId },
          data: { status: nextStatus } as any,
        });
        return NextResponse.json({ success: true, status: nextStatus });
      }

    case "delete-training-center": {
        if (!uuidOrNull(data.centerId))
          return NextResponse.json({ error: "centerId (UUID) requis" }, { status: 400 });
        const center = await prisma.trainingCenter.findUnique({
          where: { id: data.centerId },
          include: { courses: true, commissions: true, storagePurchases: true },
        });
        if (!center) {
          return NextResponse.json({ error: "Centre introuvable." }, { status: 404 });
        }

        await prisma.$transaction(async (tx) => {
          const payload = JSON.parse(JSON.stringify(center)) as never;
          await tx.dataArchive.upsert({
            where: {
              tableName_recordId_reason: {
                tableName: "training_centers",
                recordId: center.id,
                reason: "center_deleted",
              },
            },
            create: {
              tableName: "training_centers",
              recordId: center.id,
              reason: "center_deleted",
              payload,
            },
            update: { payload, archivedAt: new Date() },
          });

          // Les formations restent en base mais sont détachées du centre supprimé.
          await tx.course.updateMany({
            where: { centerId: center.id },
            data: { centerId: null },
          });
          await tx.trainingCenter.delete({ where: { id: center.id } });
        });

        return NextResponse.json({ success: true, archived: true });
      }

    case "update-training-center-config": {
        // Propriétaire du centre ou administrateur (vérifié en base).
        await assertCenterAccess(auth, data.centerId);
        const updated = await prisma.trainingCenter.update({
          where: { id: data.centerId },
          data: {
            // Champs sensibles (quota, frais, statut) réservés à l'administration.
            storageQuotaGb: auth.isAdmin ? (data.storageQuotaGb ?? undefined) : undefined,
            feeAmountUsd: auth.isAdmin ? (data.feeAmountUsd ?? undefined) : undefined,
            status: auth.isAdmin ? (data.status ?? undefined) : undefined,
            // Identité du centre (logo/photo de profil, bannière, présentation)
            centerName: typeof data.centerName === "string" && data.centerName.trim() ? data.centerName.trim() : undefined,
            description: typeof data.description === "string" ? data.description : undefined,
            logo: typeof data.logo === "string" ? data.logo : undefined,
            banner: typeof data.banner === "string" ? data.banner : undefined,
          } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }
  }
  return null;
}
