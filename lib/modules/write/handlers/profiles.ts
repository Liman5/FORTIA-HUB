// ============================================================
// FORTIA HUB — HANDLERS D'ÉCRITURE (Phase 5)
// Généré depuis l'ancien switch ; l'autorisation et la validation
// restent centralisées dans /api/platform/write.
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { resolveTargetUserId } from "@/lib/server/writeAuthorization";

import type { WriteHandlerContext } from "../types";

export async function handleProfilesAction(
  action: string,
  context: WriteHandlerContext
): Promise<Response | null> {
  const { auth, data } = context;
  switch (action) {
    case "update-freelance-profile": {
        // Identité imposée par la session (un admin peut cibler un utilisateur).
        const ownerUserId = resolveTargetUserId(auth, data.userId);
        // La vérification KYC ne peut JAMAIS être auto-attribuée par ce formulaire.
        const owner = await prisma.user.findUnique({
          where: { id: ownerUserId },
          select: { kycStatus: true },
        });
        const kycApproved = owner?.kycStatus === "approuve";
        // La table freelance_profiles n'a PAS de contrainte unique sur user_id :
        // on utilise findFirst + update/create (l'upsert Prisma échouerait en base).
        const existingFreelanceProfile = await prisma.freelanceProfile.findFirst({
          where: { userId: ownerUserId },
        });
        const profile = existingFreelanceProfile
          ? await prisma.freelanceProfile.update({
              where: { id: existingFreelanceProfile.id },
              data: {
                name: data.name ?? undefined,
                title: data.title ?? undefined,
                bio: data.bio ?? undefined,
                avatar: data.avatar ?? undefined,
                category: data.category ?? undefined,
                hourlyRate: data.hourlyRate ?? undefined,
                skills: data.skills ?? undefined,
                location: data.location ?? undefined,
                isVisible: data.isVisible ?? undefined,
                kycVerified: kycApproved,
                canSellServices: kycApproved,
              } as any,
            })
          : await prisma.freelanceProfile.create({
              data: {
                userId: ownerUserId,
                name: data.name || "Freelance",
                title: data.title || "",
                bio: data.bio || "",
                avatar: data.avatar || "",
                category: data.category || "",
                hourlyRate: data.hourlyRate || 0,
                skills: data.skills || [],
                location: data.location || "",
                kycVerified: kycApproved,
                canSellServices: kycApproved,
                isVisible: true,
              },
            });

        // Services du freelance (remplacement complet si fournis)
        if (Array.isArray(data.services)) {
          await prisma.freelanceService.deleteMany({ where: { freelanceId: profile.id } });
          for (const [si, serv] of data.services.entries()) {
            await prisma.freelanceService.create({
              data: {
                freelanceId: profile.id,
                title: serv.title || "Service " + (si + 1),
                category: serv.category || "",
                description: serv.description || "",
                startingPrice: serv.startingPrice || 0,
                deliveryDays: serv.deliveryDays || 3,
                image: serv.image || "",
              } as any,
            });
          }
        }

        return NextResponse.json({ success: true, id: profile.id });
      }

    case "update-enterprise-profile": {
        // Identité imposée par la session (un admin peut cibler un utilisateur).
        const ownerUserId = resolveTargetUserId(auth, data.userId);
        // La vérification KYC ne peut JAMAIS être auto-attribuée par ce formulaire.
        const owner = await prisma.user.findUnique({
          where: { id: ownerUserId },
          select: { kycStatus: true },
        });
        const kycApproved = owner?.kycStatus === "approuve";
        // La table enterprise_profiles n'a PAS de contrainte unique sur user_id :
        // on utilise findFirst + update/create (l'upsert Prisma échouerait en base).
        const existingEnterpriseProfile = await prisma.enterpriseProfile.findFirst({
          where: { userId: ownerUserId },
        });
        const profile = existingEnterpriseProfile
          ? await prisma.enterpriseProfile.update({
              where: { id: existingEnterpriseProfile.id },
              data: {
                companyName: data.companyName ?? undefined,
                tagline: data.tagline ?? undefined,
                description: data.description ?? undefined,
                logo: data.logo ?? undefined,
                sector: data.sector ?? undefined,
                country: data.country ?? undefined,
                contactEmail: data.contactEmail ?? undefined,
                contactPhone: data.contactPhone ?? undefined,
                website: data.website ?? undefined,
                isVisible: data.isVisible ?? undefined,
                verifiedDocuments: kycApproved,
                canSellServices: kycApproved,
              } as any,
            })
          : await prisma.enterpriseProfile.create({
              data: {
                userId: ownerUserId,
                companyName: data.companyName || "Entreprise",
                tagline: data.tagline || "",
                description: data.description || "",
                logo: data.logo || "",
                sector: data.sector || "",
                country: data.country || "",
                verifiedDocuments: kycApproved,
                canSellServices: kycApproved,
                contactEmail: data.contactEmail || "",
                contactPhone: data.contactPhone || "",
                website: data.website || "",
                isVisible: true,
              },
            });

        // Services de l'entreprise (remplacement complet si fournis)
        if (Array.isArray(data.services)) {
          await prisma.enterpriseService.deleteMany({ where: { enterpriseId: profile.id } });
          for (const [si, serv] of data.services.entries()) {
            await prisma.enterpriseService.create({
              data: {
                enterpriseId: profile.id,
                title: serv.title || "Service " + (si + 1),
                description: serv.description || "",
                startingPrice: serv.startingPrice || 0,
                displayOrder: si,
              } as any,
            });
          }
        }

        return NextResponse.json({ success: true, id: profile.id });
      }

    case "update-profile": {
        // Un membre ne peut modifier QUE son profil ; un admin peut cibler un id.
        const targetUserId = resolveTargetUserId(auth, data.id);
        const updatedUser = await prisma.user.update({
          where: { id: targetUserId },
          data: {
            avatar: data.avatar ?? undefined,
            name: data.name ?? undefined,
            phone: data.phone ?? undefined,
          } as any,
        });
        return NextResponse.json({ success: true, id: updatedUser.id });
      }
  }
  return null;
}
