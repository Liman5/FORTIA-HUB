// ============================================================
// FORTIA HUB — HANDLERS D'ÉCRITURE (Phase 5)
// Généré depuis l'ancien switch ; l'autorisation et la validation
// restent centralisées dans /api/platform/write.
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/services/notifyUser";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { requireActorUser } from "@/lib/server/writeAuthorization";

import { deleteFromR2 } from "@/lib/services/r2Storage";

import { KYC_BLOCK_MINUTES, KYC_DOC_SLOTS, KYC_MAX_ATTEMPTS, hashKycCode, normalizeKycCode, normalizeMaskGroups, signKycUnlockToken, validateKycCode, verifyKycCode } from "@/lib/server/kycLock";
import { r2KeyFromValue, UUID_PATTERN } from "../helpers";
import type { WriteHandlerContext } from "../types";

export async function handleKycAction(
  action: string,
  context: WriteHandlerContext
): Promise<Response | null> {
  const { auth, data } = context;
  const req = context.req;
  switch (action) {
    case "submit-kyc": {
        // La colonne applicant_id est de type UUID en base.
        // Le frontend génère parfois un ID mocké "user-..." qui n'est PAS un UUID.
        // → On vérifie la validité et on neutralise si invalide (la relation
        //   avec users est optionnelle : on peut lier plus tard par email).
        // Identité imposée par la session : un membre ne peut pas déposer un
        // dossier KYC au nom d'un autre compte.
        const kycUser = requireActorUser(auth);
        const rawApplicantId = kycUser.id;
        const isValidUuid = UUID_PATTERN.test(rawApplicantId);

        // Les fichiers (base64 DataURL) peuvent être très volumineux.
        // On ne les stocke PAS dans la table (URLs externes/R2 attendues).
        // Si un DataURL est fourni, on le remplace par un marqueur vide.
        const sanitizeFileUrl = (val: unknown): string => {
          if (!val) return "";
          const s = String(val);
          // Tronque les DataURL base64 pour ne pas saturer la colonne TEXT
          return s.startsWith("data:") ? "" : s.slice(0, 2000);
        };

        const created = await prisma.kycSubmission.create({
          data: {
            applicantType: data.applicantType || "freelance",
            applicantId: isValidUuid ? rawApplicantId : undefined,
            applicantName: data.applicantName || "",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            repRole: data.repRole || "",
            email: kycUser.email || data.email || "",
            phone: data.phone || "",
            country: data.country || "",
            address: data.address || "",
            documentType: data.documentType || "CNI",
            documentNumber: data.documentNumber || "",
            idExpirationDate: data.idExpirationDate || "",
            idRectoUrl: sanitizeFileUrl(data.idRectoUrl),
            idVersoUrl: sanitizeFileUrl(data.idVersoUrl),
            selfieUrl: sanitizeFileUrl(data.selfieUrl),
            companyName: data.companyName || "",
            legalForm: data.legalForm || "",
            rccmNumber: data.rccmNumber || "",
            companyDocUrl: sanitizeFileUrl(data.companyDocUrl),
            documentFileUrl: sanitizeFileUrl(data.documentFileUrl),
            status: "En_attente",
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

    case "approve-kyc": {
        const updated = await prisma.kycSubmission.update({
          where: { id: data.id },
          data: { status: "Approuve" } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

    case "kyc-set-lock": {
        const actor = await requireAdmin(req).catch(() => null);
        if (!actor) {
          return NextResponse.json({ error: "Session administrateur requise." }, { status: 401 });
        }
        const kycId = String(data.kycId || "");
        if (!UUID_PATTERN.test(kycId)) {
          return NextResponse.json({ error: "Dossier KYC invalide." }, { status: 400 });
        }
        const sub = await prisma.kycSubmission.findUnique({ where: { id: kycId } });
        if (!sub) {
          return NextResponse.json({ error: "Dossier KYC introuvable." }, { status: 404 });
        }

        const groups = normalizeMaskGroups(data.fields);
        const storedHash = String(sub.lockCodeHash || "");

        // ---- Retrait complet du masquage (aucun groupe sélectionné) ----
        if (groups.length === 0) {
          if (storedHash) {
            const current = normalizeKycCode(data.currentCode ?? data.code);
            const ok = await verifyKycCode(current, storedHash);
            if (!ok) {
              return NextResponse.json(
                { error: "Code actuel incorrect : le masquage ne peut pas être retiré." },
                { status: 403 }
              );
            }
          }
          await prisma.kycSubmission.update({
            where: { id: kycId },
            data: {
              hiddenFields: "",
              lockCodeHash: "",
              lockedAt: null,
              lockAttempts: 0,
              lockBlockedUntil: null,
            },
          });
          return NextResponse.json({
            success: true,
            removed: true,
            hiddenFields: "",
            message: "Masquage retiré : le dossier est de nouveau entièrement visible.",
          });
        }

        // ---- Masquage déjà verrouillé → code actuel obligatoire ----
        if (storedHash) {
          const current = normalizeKycCode(data.currentCode ?? data.code);
          const ok = await verifyKycCode(current, storedHash);
          if (!ok) {
            return NextResponse.json(
              { error: "Code actuel incorrect : impossible de modifier le masquage." },
              { status: 403 }
            );
          }
          const updated = await prisma.kycSubmission.update({
            where: { id: kycId },
            data: { hiddenFields: groups.join(","), lockedAt: new Date() },
          });
          return NextResponse.json({
            success: true,
            hiddenFields: updated.hiddenFields,
            message: "Masquage mis à jour.",
          });
        }

        // ---- Premier masquage → le code à 6 chiffres est défini ici ----
        const code = normalizeKycCode(data.code);
        const invalid = validateKycCode(code);
        if (invalid) {
          return NextResponse.json({ error: invalid }, { status: 400 });
        }
        const updated = await prisma.kycSubmission.update({
          where: { id: kycId },
          data: {
            hiddenFields: groups.join(","),
            lockCodeHash: await hashKycCode(code),
            lockedAt: new Date(),
            lockAttempts: 0,
            lockBlockedUntil: null,
          },
        });
        return NextResponse.json({
          success: true,
          hiddenFields: updated.hiddenFields,
          message: "Informations masquées et protégées par votre code à 6 chiffres.",
        });
      }

    case "kyc-unlock": {
        const actor = await requireAdmin(req).catch(() => null);
        if (!actor) {
          return NextResponse.json({ error: "Session administrateur requise." }, { status: 401 });
        }
        const kycId = String(data.kycId || "");
        if (!UUID_PATTERN.test(kycId)) {
          return NextResponse.json({ error: "Dossier KYC invalide." }, { status: 400 });
        }
        const sub = await prisma.kycSubmission.findUnique({ where: { id: kycId } });
        if (!sub) {
          return NextResponse.json({ error: "Dossier KYC introuvable." }, { status: 404 });
        }

        const storedHash = String(sub.lockCodeHash || "");
        if (!storedHash) {
          const issued = await signKycUnlockToken(kycId);
          return NextResponse.json({
            success: true,
            token: issued.token,
            expiresAt: issued.expiresAt,
            hiddenFields: "",
            message: "Aucun masquage sur ce dossier.",
          });
        }

        // Blocage temporaire après trop d'échecs
        const blockedUntil = sub.lockBlockedUntil ? new Date(sub.lockBlockedUntil).getTime() : 0;
        if (blockedUntil > Date.now()) {
          const minutes = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 60000));
          return NextResponse.json(
            {
              error: `Trop de tentatives : réessayez dans ${minutes} minute(s).`,
              blockedUntil: new Date(blockedUntil).toISOString(),
            },
            { status: 429 }
          );
        }

        const code = normalizeKycCode(data.code);
        if (code.length !== 6) {
          return NextResponse.json(
            { error: "Saisissez les 6 chiffres de votre code secret." },
            { status: 400 }
          );
        }

        const ok = await verifyKycCode(code, storedHash);
        if (!ok) {
          const attempts = sub.lockAttempts + 1;
          const reached = attempts >= KYC_MAX_ATTEMPTS;
          await prisma.kycSubmission.update({
            where: { id: kycId },
            data: {
              lockAttempts: reached ? 0 : attempts,
              lockBlockedUntil: reached ? new Date(Date.now() + KYC_BLOCK_MINUTES * 60000) : null,
            },
          });
          return NextResponse.json(
            {
              error: reached
                ? `Code incorrect. Dossier bloqué ${KYC_BLOCK_MINUTES} minutes.`
                : `Code incorrect. ${KYC_MAX_ATTEMPTS - attempts} tentative(s) restante(s).`,
              attemptsLeft: reached ? 0 : KYC_MAX_ATTEMPTS - attempts,
            },
            { status: 401 }
          );
        }

        await prisma.kycSubmission.update({
          where: { id: kycId },
          data: { lockAttempts: 0, lockBlockedUntil: null },
        });
        const issued = await signKycUnlockToken(kycId);
        return NextResponse.json({
          success: true,
          token: issued.token,
          expiresAt: issued.expiresAt,
          hiddenFields: sub.hiddenFields || "",
          message: "Dossier déverrouillé pour cette session.",
        });
      }

    case "kyc-remove-doc": {
        const actor = await requireAdmin(req).catch(() => null);
        if (!actor) {
          return NextResponse.json({ error: "Session administrateur requise." }, { status: 401 });
        }
        const kycId = String(data.kycId || "");
        const slot = String(data.slot || "");
        if (!UUID_PATTERN.test(kycId)) {
          return NextResponse.json({ error: "Dossier KYC invalide." }, { status: 400 });
        }
        if (!(KYC_DOC_SLOTS as readonly string[]).includes(slot)) {
          return NextResponse.json({ error: "Document ciblé inconnu." }, { status: 400 });
        }
        const sub = await prisma.kycSubmission.findUnique({ where: { id: kycId } });
        if (!sub) {
          return NextResponse.json({ error: "Dossier KYC introuvable." }, { status: 404 });
        }

        const storedHash = String(sub.lockCodeHash || "");
        if (storedHash) {
          const ok = await verifyKycCode(normalizeKycCode(data.code), storedHash);
          if (!ok) {
            return NextResponse.json(
              { error: "Code à 6 chiffres requis (ou incorrect) : suppression refusée." },
              { status: 403 }
            );
          }
        }

        const record = sub as unknown as Record<string, string | undefined>;
        const currentValue = String(record[slot] || "");
        if (!currentValue) {
          return NextResponse.json({
            success: true,
            alreadyEmpty: true,
            message: "Aucun fichier à supprimer.",
          });
        }

        // 1. Retirer le fichier du stockage R2 (bucket privé)
        const key = r2KeyFromValue(currentValue);
        if (key && key.includes("/") && !key.includes("..")) {
          try {
            await deleteFromR2(key);
          } catch (error: any) {
            console.warn("[KYC] Suppression R2 impossible:", error?.message);
          }
        }

        // 2. Effacer la référence en base et journaliser la suppression
        const deletedDocs = Array.from(new Set([...(sub.deletedDocs || []), slot]));
        await prisma.kycSubmission.update({
          where: { id: kycId },
          data: { [slot]: "", deletedDocs } as any,
        });

        return NextResponse.json({
          success: true,
          slot,
          deletedDocs,
          message: "Pièce supprimée définitivement.",
        });
      }

    case "approve-kyc-full": {
        if (!data.id && !data.email) return NextResponse.json({ error: "id ou email requis" }, { status: 400 });
        // Chercher d'abord par UUID direct (si l'ID est valide)
        let sub = null;
        const rawId = data.id ? String(data.id) : "";
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
        if (isUuid) {
          try {
            sub = await prisma.kycSubmission.findUnique({ where: { id: rawId } });
          } catch { sub = null; }
        }
        // Si introuvable, chercher par email (fallback pour les IDs locaux mockes)
        if (!sub && data.email) {
          sub = await prisma.kycSubmission.findFirst({
            where: { email: String(data.email).toLowerCase() },
            orderBy: { submittedAt: "desc" },
          });
        }
        if (!sub) return NextResponse.json({ error: "Demande KYC introuvable" }, { status: 404 });

        // 1. Marquer la demande comme approuvée
        await prisma.kycSubmission.update({
          where: { id: sub.id },
          data: { status: "Approuve", adminNotes: data.adminNotes || sub.adminNotes || "" } as any,
        });

        // 2. Résoudre l'utilisateur (via applicantId réel sinon par email du candidat)
        let user = null;
        if (sub.applicantId) {
          try {
            user = await prisma.user.findUnique({ where: { id: sub.applicantId } });
          } catch {
            user = null;
          }
        }
        if (!user && sub.email) {
          user = await prisma.user.findFirst({ where: { email: sub.email.toLowerCase() } });
        }

        const userId = user?.id || data.userId || undefined;
        const fullName = (sub.firstName || "") + " " + (sub.lastName || "");
        const displayName = fullName.trim() || sub.applicantName || sub.email.split("@")[0];

        let profileId: string | null = null;
        let badgeLabel = "";

        if (sub.applicantType === "enterprise") {
          // Créer le profil ENTREPRISE
        const existingEnterprise = userId
          ? await prisma.enterpriseProfile.findFirst({ where: { userId } })
          : null;
        const enterprise = existingEnterprise
          ? await prisma.enterpriseProfile.update({
              where: { id: existingEnterprise.id },
              data: {
                companyName: sub.companyName || undefined,
                country: sub.country || undefined,
                verifiedDocuments: true,
                registrationFeePaid: true,
                badge: "gold",
                contactEmail: sub.email,
                contactPhone: sub.phone || undefined,
                isVisible: true,
              },
            })
          : await prisma.enterpriseProfile.create({
              data: {
                userId,
                companyName: sub.companyName || displayName,
                tagline: "",
                description: "",
                logo: "",
                badge: "gold",
                badgeLabel: "Badge Doré (Société Certifiée)",
                sector: "",
                country: sub.country || "",
                verifiedDocuments: true,
                registrationFeePaid: true,
                canReceivePayments: data.canReceivePayments ?? false,
                canSellServices: true,
                contactEmail: sub.email,
                contactPhone: sub.phone || "",
                website: data.website || "",
                isVisible: true,
              },
            });
          profileId = enterprise.id;
          badgeLabel = enterprise.badgeLabel;
        } else {
          // Créer le profil FREELANCE
          const existingFreelance = userId
            ? await prisma.freelanceProfile.findFirst({ where: { userId } })
            : null;
          const freelance = existingFreelance
            ? await prisma.freelanceProfile.update({
                where: { id: existingFreelance.id },
                data: {
                  kycVerified: true,
                  registrationFeePaid: true,
                  badge: "green",
                  location: sub.country || undefined,
                  isVisible: true,
                },
              })
            : await prisma.freelanceProfile.create({
                data: {
                  userId,
                  name: displayName,
                  title: data.title || "",
                  bio: "",
                  avatar: user?.avatar || "",
                  badge: "green",
                  badgeLabel: "Badge Vert Vérifié",
                  category: data.category || "",
                  rating: 5,
                  completedJobs: 0,
                  hourlyRate: data.hourlyRate || 0,
                  skills: data.skills || [],
                  kycVerified: true,
                  registrationFeePaid: true,
                  canReceivePayments: data.canReceivePayments ?? false,
                  canSellServices: true,
                  location: sub.country || "",
                  isVisible: true,
                },
              });
          profileId = freelance.id;
          badgeLabel = freelance.badgeLabel;
        }

        // 3. Notifier l'utilisateur
        if (userId) {
          await notifyUser(userId, {
            title: sub.applicantType === "enterprise" ? "Entreprise certifiée Badge Doré" : "Profil Freelance approuvé",
            message:
              "Félicitations " + displayName + " ! Votre dossier KYC a été approuvé. " +
              "Vous êtes désormais visible dans l'annuaire " +
              (sub.applicantType === "enterprise" ? "Entreprises avec le Badge Doré." : "Freelances avec le Badge Vert.") +
              " Accédez à votre espace membre pour compléter votre profil et vos services.",
            type: "success",
            linkTab: "member",
          });
        }

        return NextResponse.json({
          success: true,
          id: sub.id,
          profileId,
          badgeLabel,
          message: "KYC approuvé et profil " + (sub.applicantType === "enterprise" ? "entreprise" : "freelance") + " activé.",
        });
      }
  }
  return null;
}
