import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { notifyUser } from "@/lib/services/notifyUser";
import { requireAdmin } from "@/lib/server/requireAdmin";
import {
  authorizeWriteAction,
  WriteError,
  assertCenterAccess,
  assertContentOwnership,
  assertCourseAccess,
  assertNotificationAccess,
  assertOrderAccess,
  assertProductAccess,
  assertSelfOrAdmin,
  logWriteFailure,
  requireActorUser,
  requireStoreAccess,
  resolveTargetUserId,
  toWriteErrorResponse,
} from "@/lib/server/writeAuthorization";
import {
  computeCommissionUsd,
  isSaleScope,
  resolveCommissionRule,
  saveCommissionRule,
  type SaleScope,
} from "@/lib/server/commissions";
import { invalidateResponseCache } from "@/lib/server/responseCache";
import { deleteFromR2 } from "@/lib/services/r2Storage";
import {
  KYC_BLOCK_MINUTES,
  KYC_DOC_SLOTS,
  KYC_MAX_ATTEMPTS,
  hashKycCode,
  normalizeKycCode,
  normalizeMaskGroups,
  signKycUnlockToken,
  validateKycCode,
  verifyKycCode,
} from "@/lib/server/kycLock";

export const dynamic = "force-dynamic";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_EMAIL = process.env.SENDER_EMAIL || "Fortia Hub <onboarding@resend.dev>";

// ============================================================
// RÉSOLUTION DES BOUTIQUES (protection contre les UUID invalides)
// ------------------------------------------------------------
// Le navigateur envoie parfois un slug, un nom ou la chaîne "undefined"
// comme `storeId`. Toute requête `store.findUnique({ where: { id } })` avec
// une valeur non-UUID faisait échouer PostgreSQL :
//   « invalid input syntax for type uuid »
// On résout donc TOUJOURS par id (UUID), sinon par slug, sinon par nom.
// ============================================================
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Adresse e-mail plausible (validation minimale des actions publiques). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Extrait la clé R2 d'une valeur stockée en base : soit déjà une clé
 * (`dossier/entite/fichier.ext`), soit une URL publique R2.
 */
function r2KeyFromValue(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return raw.replace(/^\/+/, "");
  try {
    const url = new URL(raw);
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return "";
  }
}

async function resolveStoreRef(
  raw: unknown
): Promise<{ id: string; name: string; slug: string; vendorId?: string | null; logo?: string | null } | null> {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value || value === "undefined" || value === "null") return null;

  if (UUID_PATTERN.test(value)) {
    return prisma.store.findUnique({ where: { id: value } }).catch(() => null);
  }

  const bySlug = await prisma.store
    .findUnique({ where: { slug: value } })
    .catch(() => null);
  if (bySlug) return bySlug;

  return prisma.store.findFirst({ where: { name: value } }).catch(() => null);
}

/** Variante « identifiant sûr » : null si la valeur n'est pas un UUID. */
function uuidOrNull(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw && UUID_PATTERN.test(raw) ? raw : null;
}

/** Slug lisible (sans accents ni caractères spéciaux). */
function slugifyTitle(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Slug UNIQUE pour une formation.
 * Deux formations portant le même titre ne doivent jamais partager la même
 * URL (sinon la seconde écrase la première côté catalogue).
 */
async function uniqueCourseSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugifyTitle(base) || `cours-${Date.now()}`;
  let candidate = root;
  let suffix = 2;
  while (suffix < 500) {
    const existing = await prisma.course
      .findUnique({ where: { slug: candidate }, select: { id: true } })
      .catch(() => null);
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }
  return `${root}-${Date.now()}`;
}

/** Niveaux acceptés par l'enum PostgreSQL `course_level`. */
const COURSE_LEVELS = new Set([
  "Debutant",
  "Intermediaire",
  "Avance",
  "Expert",
  "Tous_niveaux",
]);

/** Normalise un niveau saisi librement vers une valeur de l'enum SQL. */
function normalizeCourseLevel(raw: unknown): string {
  const normalized = String(raw || "Tous_niveaux")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  return COURSE_LEVELS.has(normalized) ? normalized : "Tous_niveaux";
}


/**
 * POST /api/platform/write
 * Persiste une action d'écriture dans Supabase (via Prisma).
 * Body : { action: string, data: object }
 *
 * DROITS : si l'appelant est un ADMINISTRATEUR authentifié, son rôle limite
 * l'écriture — superviseur = lecture seule, financier = finance uniquement,
 * KYC = KYC uniquement. Les parcours publics (visiteur/membre) restent inchangés.
 */
/**
 * ⚠️ PHASE 2 — Actions retirées : elles accordaient un paiement ou un accès
 * à partir de données client. Remplacées par /api/payments/checkout.
 * Elles restent listées ici pour renvoyer un 410 explicite (aucune exécution).
 */
const DEPRECATED_WRITE_ACTIONS = new Set<string>([
  "submit-order",
  "register-free-purchase",
  "register-instructor-purchase",
  "pay-training-center-fee",
]);

export async function POST(req: NextRequest) {
  let actionName = "";
  try {
    const body = await req.json();
    const { action, data } = body || {};
    actionName = String(action || "");

    if (!actionName || !data || typeof data !== "object" || Array.isArray(data)) {
      return NextResponse.json(
        { success: false, error: "Action et données requises." },
        { status: 400 }
      );
    }

    // Parcours de paiement historique : refusé AVANT toute authentification.
    if (DEPRECATED_WRITE_ACTIONS.has(actionName)) {
      return NextResponse.json(
        {
          success: false,
          error: "Ce parcours de paiement est remplacé par /api/payments/checkout.",
          code: "ENDPOINT_MOVED",
        },
        { status: 410 }
      );
    }

    // ⚠️ SÉCURITÉ (Phase 1A) : politique d'accès EXPLICITE avant toute
    // écriture. Action inconnue = refus. L'identité vient de la session,
    // jamais des identifiants envoyés par le navigateur.
    const auth = await authorizeWriteAction(req, actionName, data as Record<string, unknown>);

    // Toute écriture AUTORISÉE invalide le cache serveur des routes publiques :
    // les visiteurs voient immédiatement la nouvelle version.
    invalidateResponseCache();

    switch (action) {
      // ============ DEVIS SERVICE ============
      case "submit-quote": {
        // Action publique : champs obligatoires validés (anti-spam).
        const clientName = String(data.clientName || "").trim();
        const clientEmail = String(data.clientEmail || "").trim().toLowerCase();
        if (!clientName || !EMAIL_PATTERN.test(clientEmail)) {
          return NextResponse.json(
            { success: false, error: "Nom et adresse e-mail valides requis." },
            { status: 400 }
          );
        }
        const created = await prisma.serviceQuote.create({
          data: {
            clientName,
            clientEmail,
            clientPhone: data.phone || "",
            serviceTitle: data.serviceTitle || "",
            serviceId: data.serviceCategory || undefined,
            details: data.details || "",
            estimatedPrice: data.estimatedPrice || 0,
            status: "Recu",
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

      // ============ SOUMISSION KYC ============
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

      // ============ APPROBATION KYC (admin) ============
      case "approve-kyc": {
        const updated = await prisma.kycSubmission.update({
          where: { id: data.id },
          data: { status: "Approuve" } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

      // ============ MASQUAGE VERROUILLÉ D'UN DOSSIER KYC (admin) ============
      // Le code secret à 6 chiffres est PROPRE À CE DOSSIER : il est défini
      // lors du premier masquage, puis exigé pour le modifier ou le retirer.
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

      // ============ DÉVERROUILLAGE TEMPORAIRE D'UN DOSSIER (admin) ============
      // Vérifie le code du dossier et délivre un jeton de 15 minutes : la
      // révélation ne vaut que pour la session en cours, le masquage reste
      // actif en base pour les autres administrateurs.
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

      // ============ SUPPRESSION D'UNE PIÈCE KYC (admin) ============
      // Le fichier est retiré du stockage (bucket privé) et la référence
      // est effacée en base. Si le dossier est verrouillé, le code à
      // 6 chiffres est exigé : on ne supprime pas une preuve en aveugle.
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

      // ============ APPROBATION KYC COMPLÈTE (admin) → création du profil public ============
      // Marque le KYC comme approuvé, crée/active le profil Freelance ou Entreprise,
      // attribue le badge (Vert pour freelance, Doré pour entreprise) et notifie l'utilisateur.
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

      // ============ MISE À JOUR PROFIL FREELANCE (par le freelance) ============
      case "update-freelance-profile": {
        // Identité imposée par la session (un admin peut cibler un utilisateur).
        const ownerUserId = resolveTargetUserId(auth, data.userId);
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
                kycVerified: true,
                canSellServices: true,
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

      // ============ MISE À JOUR PROFIL ENTREPRISE (par l'entreprise) ============
      case "update-enterprise-profile": {
        // Identité imposée par la session (un admin peut cibler un utilisateur).
        const ownerUserId = resolveTargetUserId(auth, data.userId);
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
                verifiedDocuments: true,
                canSellServices: true,
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

      // ============ MISE À JOUR PROFIL UTILISATEUR (avatar, infos) ============
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

      // ============ CANDIDATURE VENDEUR ============
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

      // ============ APPROBATION CANDIDATURE ============
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

      // ============ REJET CANDIDATURE ============
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

      // ============ SYNCHRONISATION APPRENTISSAGE MEMBRE ============
      // Persiste la progression, les inscriptions aux formations et les
      // attestations obtenues (earnedCertificates) sur le compte utilisateur.
      case "sync-user-learning": {
        // Un membre ne synchronise QUE son compte ; un admin peut cibler un id.
        const userId = resolveTargetUserId(auth, data.userId);

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
        }

        // ⚠️ SÉCURITÉ : les inscriptions ne sont JAMAIS acceptées depuis le
        // navigateur (elles proviennent du paiement vérifié ou d'un admin).
        // `data.enrolledCourseIds` est volontairement ignoré.
        const enrolled = Array.isArray(user.enrolledCourseIds) ? [...user.enrolledCourseIds] : [];

        let progress: Record<string, number> = {};
        try {
          const parsed = JSON.parse(String(user.courseProgress || "{}"));
          if (parsed && typeof parsed === "object") progress = { ...parsed };
        } catch {}
        if (data.courseProgress && typeof data.courseProgress === "object") {
          Object.entries(data.courseProgress).forEach(([cid, pct]) => {
            // Progression acceptée uniquement pour une formation DÉJÀ suivie.
            if (cid && enrolled.includes(cid)) {
              progress[cid] = Math.max(0, Math.min(100, Number(pct) || 0));
            }
          });
        }

        let certificates: any[] = [];
        try {
          const parsed = JSON.parse(String(user.earnedCertificates || "[]"));
          if (Array.isArray(parsed)) certificates = [...parsed];
        } catch {}
        if (Array.isArray(data.earnedCertificates)) {
          for (const cert of data.earnedCertificates) {
            const certId = String(cert?.id || "").trim();
            if (!certId || certificates.some((c: any) => c.id === certId)) continue;
            // Attestation acceptée uniquement si le SERVEUR l'a réellement délivrée.
            const official = await prisma.certificate.findFirst({
              where: { certificateNumber: certId, userId },
              select: { certificateNumber: true },
            });
            if (!official) continue;
            certificates.push(cert);
          }
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            enrolledCourseIds: enrolled,
            courseProgress: progress as any,
            earnedCertificates: certificates as any,
          } as any,
        });

        return NextResponse.json({ success: true, enrolledCount: enrolled.length, certificateCount: certificates.length });
      }

      // ============ DÉLIVRANCE ATTESTATION OFFICIELLE ============
      // Génère un numéro UNIQUE en base (contrainte certificate_number),
      // rattaché à la personne (userId) et à la formation (courseId).
      case "issue-certificate": {
        const { courseId, courseTitle, studentName, category, grade } = data;
        // Un membre ne délivre QUE sa propre attestation ; un admin peut cibler.
        const userId = resolveTargetUserId(auth, data.userId);
        if (!courseTitle) {
          return NextResponse.json(
            { success: false, error: "courseTitle requis." },
            { status: 400 }
          );
        }
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
        }

        // ⚠️ Une attestation n'est délivrée que pour une formation réellement
        // suivie (inscription) ou gratuite et publiée.
        if (courseId) {
          const courseUuid = uuidOrNull(courseId);
          if (!courseUuid) throw new WriteError(400, "Formation invalide.");
          const course = await prisma.course.findUnique({
            where: { id: courseUuid },
            select: { price: true, isPublished: true },
          });
          if (!course) throw new WriteError(404, "Formation introuvable.");
          const isFree = Number(course.price) === 0 && course.isPublished;
          const hasEnrollment =
            (user.enrolledCourseIds || []).includes(courseUuid) ||
            !!(await prisma.courseEnrollment
              .findUnique({
                where: { userId_courseId: { userId, courseId: courseUuid } },
                select: { id: true },
              })
              .catch(() => null));
          if (!isFree && !hasEnrollment) {
            throw new WriteError(
              403,
              "Attestation impossible : cette formation n'est pas suivie par ce compte."
            );
          }
        }

        const today = new Date();
        const cat =
          String(category || "FORT")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toUpperCase()
            .slice(0, 4) || "FORT";
        const issueDate = today.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        // Le nom de l'attestation est celui du compte (un admin peut le fixer).
        const safeName = auth.isAdmin && studentName ? String(studentName) : user.name;

        let finalCertificate: any = null;
        for (let attempt = 0; attempt < 5 && !finalCertificate; attempt++) {
          let random = "";
          for (let i = 0; i < 8; i++) random += chars[Math.floor(Math.random() * chars.length)];
          const number = `FORTIA-${today.getFullYear()}-${cat}-${random}`;
          try {
            const row = await prisma.certificate.create({
              data: {
                certificateNumber: number,
                userId,
                courseId: courseId || undefined,
                studentName: safeName,
                courseTitle,
                category,
                issueDate,
                grade: grade || "Mention Excellent (98%)",
                qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  "FORTIA-HUB-CERT:" + number
                )}`,
                verified: true,
              } as any,
            });
            finalCertificate = {
              id: number,
              studentName: safeName,
              courseTitle,
              category,
              issueDate,
              grade: grade || "Mention Excellent (98%)",
              qrCodeUrl: row.qrCodeUrl,
              verified: true,
              courseId: courseId || undefined,
              userId,
            };
          } catch (e: any) {
            const msg = String(e?.message || "");
            // Collision sur certificate_number (P2002) → on regénère un numéro
            if (!msg.includes("P2002") && !msg.toLowerCase().includes("unique")) throw e;
          }
        }
        if (!finalCertificate) {
          return NextResponse.json({ error: "Impossible de générer un numéro unique" }, { status: 409 });
        }

        // Ajoute l'attestation au compte membre (earnedCertificates)
        let certificates: any[] = [];
        try {
          const parsed = JSON.parse(String(user.earnedCertificates || "[]"));
          if (Array.isArray(parsed)) certificates = parsed;
        } catch {}
        if (!certificates.some((c: any) => c.id === finalCertificate.id)) {
          certificates = [finalCertificate, ...certificates];
          await prisma.user.update({
            where: { id: userId },
            data: { earnedCertificates: certificates as any } as any,
          });
        }

        return NextResponse.json({ success: true, certificate: finalCertificate });
      }

  // ============ STOCKAGE FORMATEUR ============
  // Incrémente/décrémente le stockage réellement utilisé (quota plateforme).
  case "register-course-media-storage": {
    const { centerId, deltaBytes } = data;
        if (!centerId) {
      return NextResponse.json({ error: "centerId requis" }, { status: 400 });
    }
    // Seul le propriétaire du centre (ou un admin) peut ajuster son quota.
    await assertCenterAccess(auth, centerId);
    const centerDoc = await prisma.trainingCenter.findUnique({ where: { id: centerId } });
    if (!centerDoc) {
      return NextResponse.json({ error: "Centre introuvable" }, { status: 404 });
    }
    const current =
      typeof centerDoc.storageUsedBytes === "bigint"
        ? centerDoc.storageUsedBytes
        : BigInt(Number(centerDoc.storageUsedBytes || 0));
    const delta = BigInt(Math.round(Number(deltaBytes) || 0));
    const next = current + delta < BigInt(0) ? BigInt(0) : current + delta;

    const updated = await prisma.trainingCenter.update({
      where: { id: centerId },
      data: { storageUsedBytes: next } as any,
    });

    return NextResponse.json({
      success: true,
      storageUsedBytes: Number(next),
      storageQuotaGb: updated.storageQuotaGb,
    });
  }

      // ============ COMMANDE PAYEE ============
      case "submit-order": {
        // ⚠️ SÉCURITÉ : aucune passerelle de paiement n'est intégrée. Le montant
        // est recalculé à partir des prix en BASE et la commande reste
        // « En_attente_API » : AUCUN droit d'accès payant n'est accordé ici.
        const buyerEmail = String(data.buyerEmail || "").trim().toLowerCase();
        if (!EMAIL_PATTERN.test(buyerEmail)) {
          return NextResponse.json(
            { success: false, error: "Adresse e-mail de l'acheteur requise." },
            { status: 400 }
          );
        }
        const saleScope: SaleScope =
          data.saleScope === "course" || data.saleScope === "service" || data.saleScope === "storage"
            ? data.saleScope
            : "digital_product";

        const courseIds = (Array.isArray(data.courseIds) ? data.courseIds : [])
          .map((value: unknown) => String(value || ""))
          .filter((value: string) => UUID_PATTERN.test(value));
        const productIds = (Array.isArray(data.productIds) ? data.productIds : [])
          .map((value: unknown) => String(value || ""))
          .filter((value: string) => UUID_PATTERN.test(value));

        let serverAmount = 0;
        let priceKnown = false;
        if (courseIds.length > 0) {
          const rows = await prisma.course.findMany({
            where: { id: { in: courseIds }, isPublished: true },
            select: { price: true },
          });
          if (rows.length !== courseIds.length) {
            throw new WriteError(404, "Formation introuvable ou non publiée.");
          }
          serverAmount += rows.reduce((sum, row) => sum + Number(row.price || 0), 0);
          priceKnown = true;
        }
        if (productIds.length > 0) {
          const rows = await prisma.product.findMany({
            where: { id: { in: productIds }, isPublished: true },
            select: { price: true },
          });
          if (rows.length !== productIds.length) {
            throw new WriteError(404, "Produit introuvable ou non publié.");
          }
          serverAmount += rows.reduce((sum, row) => sum + Number(row.price || 0), 0);
          priceKnown = true;
        }

        // Services / stockage : aucun prix n'est encore modélisé en base.
        // On conserve le montant déclaré (estimation) mais la commande reste
        // NON PAYÉE tant que le paiement n'est pas vérifié côté serveur.
        const declaredAmount = Math.max(0, Number(data.amountUsd) || 0);
        const amountUsd = priceKnown ? serverAmount : declaredAmount;

        const commissionRule = await resolveCommissionRule(saleScope);
        const { commissionUsd, vendorUsd } = computeCommissionUsd(amountUsd, commissionRule);

        const created = await prisma.marketplaceOrder.create({
          data: {
            orderNumber: data.orderNumber || "ORD-" + Date.now(),
            buyerName: data.buyerName || "",
            buyerEmail,
            buyerPhone: data.buyerPhone || "",
            // Identité issue de la session : jamais l'id envoyé par le client.
            buyerUserId: auth.user?.id || undefined,
            storeId: (await resolveStoreRef(data.storeId))?.id || undefined,
            storeName: data.storeName || "",
            productId: uuidOrNull(data.productId) || undefined,
            productTitle: data.productTitle || "",
            amountUsd,
            platformCommissionUsd: commissionUsd,
            vendorEarningsUsd: vendorUsd,
            paymentGateway: String(data.paymentGateway || "Non vérifié"),
            transactionRef: String(data.transactionRef || ""),
            status: "En_attente_API",
          } as any,
        });

        // ⚠️ PHASE 1A : aucun droit d'accès n'est accordé tant que le paiement
        // n'est pas vérifié par le serveur (aucune passerelle intégrée). L'octroi
        // (enrolledCourseIds / purchasedProductIds / CourseEnrollment) sera
        // réalisé exclusivement par le webhook de paiement (phase dédiée).
        const grantedCourseIds: string[] = [];

        // Aucune notification de « vente » n'est envoyée : la commande n'est
        // pas payée. Le vendeur et l'admin seront notifiés par le webhook de
        // paiement une fois la transaction confirmée.

        return NextResponse.json({
          success: true,
          id: created.id,
          amountUsd,
          commissionUsd,
          vendorUsd,
          commissionRule,
          status: "En_attente_API",
          enrolledCourseIds: grantedCourseIds,
          message:
            "Commande enregistrée. Elle sera validée après vérification du paiement.",
        });
      }

      // ============ TAUX DE COMMISSION (ADMIN → MARKETPLACE) ============
      case "save-commission-rule": {
        // Action réservée aux administrateurs finances (politique d'accès).
        if (!auth.admin) {
          return NextResponse.json(
            {
              success: false,
              error: "Session administrateur requise pour modifier un taux de commission.",
            },
            { status: 401 }
          );
        }

        const scope: SaleScope = isSaleScope(data.scope) ? data.scope : "general";
        const mode = data.mode === "fixed" ? "fixed" : "percent";
        const value = Math.max(0, Number(data.value) || 0);
        const isActive = data.isActive !== false;

        if (mode === "percent" && value > 100) {
          return NextResponse.json(
            { success: false, error: "Un pourcentage ne peut pas dépasser 100 %." },
            { status: 400 }
          );
        }

        const rule = await saveCommissionRule({ scope, mode, value, isActive });
        return NextResponse.json({ success: true, rule });
      }

      // ============ SUPPORT POST-ACHAT ============
      case "submit-support": {
        // Action publique : commande + e-mail valides obligatoires.
        const supportEmail = String(data.email || "").trim().toLowerCase();
        const orderNumber = String(data.orderNumber || "").trim();
        if (!orderNumber || !EMAIL_PATTERN.test(supportEmail)) {
          return NextResponse.json(
            { success: false, error: "Numéro de commande et e-mail valides requis." },
            { status: 400 }
          );
        }
        const created = await prisma.postPurchaseSupport.create({
          data: {
            orderNumber,
            productTitle: data.productTitle || "",
            lastName: data.lastName || "",
            firstName: data.firstName || "",
            phoneContact: data.phoneContact || "",
            email: supportEmail,
            notes: data.notes || "",
            forwardedEmail: data.forwardedEmail || "",
            status: "Transmis_Enregistre",
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

      // ============ NOTIFICATION LUE ============
      case "mark-notification-read": {
        const notification = await assertNotificationAccess(auth, data.id);
        const updated = await prisma.notification.update({
          where: { id: notification.id },
          data: { isRead: true } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

      // ============ SUPPRESSION D'UNE NOTIFICATION ============
      case "delete-notification": {
        // Une notification n'est supprimable que par son destinataire ;
        // une annonce globale est seulement marquée lue.
        const notification = await assertNotificationAccess(auth, data.id);
        const isOwner = !!auth.user?.id && notification.userId === auth.user.id;

        if (notification.isGlobal || !isOwner) {
          await prisma.notification
            .update({ where: { id: notification.id }, data: { isRead: true } as any })
            .catch(() => null);
          return NextResponse.json({ success: true, deleted: false, markedRead: true });
        }

        await prisma.notification.delete({ where: { id: notification.id } });
        return NextResponse.json({ success: true, deleted: true });
      }

      // ============ CRÉATION COURS ============
      case "create-course": {
        const category = data.category
          ? await prisma.courseCategory.findUnique({ where: { code: data.category } })
          : null;

        const createdCourse = await prisma.course.create({
          data: {
            title: data.title || "Cours sans titre",
            slug: data.slug || "cours-" + Date.now(),
            categoryId: category?.id,
            categoryLabel: data.categoryLabel || data.category || "",
            description: data.description || "",
            fullDescription: data.fullDescription || "",
            level: data.level || "Tous_niveaux",
            durationHours: data.durationHours || 0,
            lessonsCount: data.lessonsCount || 0,
            price: data.price || 0,
            rating: 5.0,
            reviewsCount: 0,
            studentsCount: 0,
            image: data.image || "",
            badge: data.badge || "",
            instructorName: data.instructorName || "",
            instructorRole: data.instructorRole || "",
            instructorAvatar: data.instructorAvatar || "",
            learningOutcomes: data.learningOutcomes || [],
            isPublished: data.isPublished ?? true,
            isFeatured: data.isFeatured ?? false,
          } as any,
        });

        if (Array.isArray(data.chapters)) {
          for (const [ci, chapter] of data.chapters.entries()) {
            const createdChapter = await prisma.courseChapter.create({
              data: {
                courseId: createdCourse.id,
                title: chapter.title || "Chapitre " + (ci + 1),
                displayOrder: ci,
              },
            });
            if (Array.isArray(chapter.lessons)) {
              for (const [li, lesson] of chapter.lessons.entries()) {
                await prisma.courseLesson.create({
                  data: {
                    chapterId: createdChapter.id,
                    title: lesson.title || "Lecon " + (li + 1),
                    duration: lesson.duration || "15 min",
                    type: lesson.type || "video",
                    displayOrder: li,
                  } as any,
                });
              }
            }
          }
        }

        return NextResponse.json({ success: true, id: createdCourse.id });
      }

      // ============ MISE À JOUR COURS ============
      case "update-course": {
        // Propriétaire de la formation ou administrateur uniquement.
        await assertCourseAccess(auth, data.id);
        let resolvedCategoryId = data.categoryId ?? undefined;
        if (!resolvedCategoryId && data.category) {
          const category = await prisma.courseCategory.findUnique({
            where: { code: String(data.category) },
          });
          resolvedCategoryId = category?.id ?? undefined;
        }

        const updated = await prisma.course.update({
          where: { id: data.id },
          data: {
            title: data.title ?? undefined,
            slug: data.slug ?? undefined,
            categoryId: resolvedCategoryId,
            categoryLabel: data.categoryLabel ?? undefined,
            description: data.description ?? undefined,
            fullDescription: data.fullDescription ?? undefined,
            level: data.level ?? undefined,
            durationHours: data.durationHours ?? undefined,
            lessonsCount: data.lessonsCount ?? undefined,
            price: data.price ?? undefined,
            image: data.image ?? undefined,
            badge: data.badge ?? undefined,
            instructorName: data.instructorName ?? undefined,
            instructorRole: data.instructorRole ?? undefined,
            instructorAvatar: data.instructorAvatar ?? undefined,
            learningOutcomes: data.learningOutcomes ?? undefined,
            rating: data.rating ?? undefined,
            reviewsCount: data.reviewsCount ?? undefined,
            isPublished: data.isPublished ?? undefined,
            isFeatured: data.isFeatured ?? undefined,
          } as any,
        });

        if (Array.isArray(data.chapters)) {
          await prisma.courseChapter.deleteMany({ where: { courseId: data.id } });
          for (const [ci, chapter] of data.chapters.entries()) {
            const createdChapter = await prisma.courseChapter.create({
              data: {
                courseId: data.id,
                title: chapter.title || "Chapitre " + (ci + 1),
                displayOrder: ci,
              },
            });
            if (Array.isArray(chapter.lessons)) {
              for (const [li, lesson] of chapter.lessons.entries()) {
                await prisma.courseLesson.create({
                  data: {
                    chapterId: createdChapter.id,
                    title: lesson.title || "Lecon " + (li + 1),
                    duration: lesson.duration || "15 min",
                    type: lesson.type || "video",
                    videoUrl: lesson.videoUrl || "",
                    content: lesson.content || "",
                    videoProtected: !!(lesson as any).videoProtected,
                    videoCodeHash: String((lesson as any).videoCodeHash || ""),
                    displayOrder: li,
                  } as any,
                });
              }
            }
          }
        }

        if (Array.isArray(data.quiz)) {
          await prisma.courseQuiz.deleteMany({ where: { courseId: data.id } });
          for (const [qi, quiz] of data.quiz.entries()) {
            const createdQuiz = await prisma.courseQuiz.create({
              data: {
                courseId: data.id,
                question: quiz.question || "",
                explanation: quiz.explanation || "",
                displayOrder: qi,
              },
            });
            if (Array.isArray(quiz.options)) {
              for (const [oi, option] of quiz.options.entries()) {
                await prisma.quizOption.create({
                  data: {
                    quizId: createdQuiz.id,
                    optionText: option,
                    isCorrect: oi === (quiz.correctAnswer ?? 0),
                    displayOrder: oi,
                  },
                });
              }
            }
          }
        }

        return NextResponse.json({ success: true, id: updated.id });
      }

      // ============ CRÉATION PRODUIT ============
      // ============ CATÉGORIES DE FORMATIONS (table course_categories) ============
      case "create-course-category": {
        const rawCode = String(data.code || data.label || "categorie");
        const code =
          rawCode
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "categorie-" + Date.now().toString(36);

        const existingCategory = await prisma.courseCategory.findUnique({ where: { code } });
        if (existingCategory) {
          return NextResponse.json(
            { error: "Une catégorie avec ce code existe déjà." },
            { status: 409 }
          );
        }

        const lastCategory = await prisma.courseCategory.findFirst({
          orderBy: { displayOrder: "desc" },
        });

        const createdCategory = await prisma.courseCategory.create({
          data: {
            code,
            label: String(data.label || rawCode),
            description: String(data.description || ""),
            iconName: String(data.iconName || ""),
            displayOrder: Number(data.displayOrder ?? (lastCategory?.displayOrder || 0) + 1),
            isActive: data.isActive ?? true,
          } as any,
        });

        return NextResponse.json({ success: true, id: createdCategory.id, code });
      }

      case "update-course-category": {
        if (!data.id) {
          return NextResponse.json({ error: "id requis" }, { status: 400 });
        }

        const updatedCategory = await prisma.courseCategory.update({
          where: { id: data.id },
          data: {
            label: data.label ?? undefined,
            description: data.description ?? undefined,
            iconName: data.iconName ?? undefined,
            displayOrder: data.displayOrder ?? undefined,
            isActive: data.isActive ?? undefined,
          } as any,
        });

        // Cohérence d'affichage : les formations rattachées suivent le libellé
        if (data.label) {
          await prisma.course.updateMany({
            where: { categoryId: updatedCategory.id },
            data: { categoryLabel: updatedCategory.label } as any,
          });
        }

        return NextResponse.json({ success: true, id: updatedCategory.id });
      }

      // ============ SUPPRESSION D'UNE CATÉGORIE DE FORMATION ============
      case "delete-course-category": {
        if (!data.id) {
          return NextResponse.json({ error: "id requis" }, { status: 400 });
        }

        const attachedCourses = await prisma.course.count({ where: { categoryId: data.id } });
        if (attachedCourses > 0) {
          return NextResponse.json(
            {
              error: `Suppression refusée : ${attachedCourses} formation(s) utilisent encore cette catégorie.`,
            },
            { status: 409 }
          );
        }

        await prisma.courseCategory.delete({ where: { id: data.id } });
        return NextResponse.json({ success: true });
      }

      // ============ MISE EN AVANT ÉDITORIALE D'UNE FORMATION ============
      case "set-course-featured": {
        if (!data.courseId) {
          return NextResponse.json({ error: "courseId requis" }, { status: 400 });
        }

        const updatedFeatured = await prisma.course.update({
          where: { id: data.courseId },
          data: { isFeatured: !!data.isFeatured } as any,
        });

        return NextResponse.json({
          success: true,
          id: updatedFeatured.id,
          isFeatured: updatedFeatured.isFeatured,
        });
      }

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

      // ============ ACHAT LIBRE ============
      case "register-free-purchase": {
        // Réservé aux commandes GRATUITES du membre connecté : un achat payant
        // ne peut plus ouvrir d'accès tant que le paiement n'est pas vérifié.
        const userId = resolveTargetUserId(auth, data.userId);
        const orderId = uuidOrNull(data.orderId);
        if (!orderId) {
          throw new WriteError(400, "Commande invalide.");
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const order = await prisma.marketplaceOrder.findUnique({ where: { id: orderId } });
        if (!user || !order) {
          throw new WriteError(404, "Utilisateur ou commande introuvable.");
        }
        assertOrderAccess(auth, order);
        if (Number(order.amountUsd) > 0) {
          throw new WriteError(
            409,
            "Cette commande n'est pas gratuite : l'accès sera ouvert après vérification du paiement."
          );
        }
        if (order.productId) {
          const product = await prisma.product.findUnique({
            where: { id: order.productId },
            select: { price: true },
          });
          if (product && Number(product.price) > 0) {
            throw new WriteError(409, "Ce produit est payant : accès en attente de paiement.");
          }
        }

        const purchased = Array.isArray(user.purchasedProductIds) ? user.purchasedProductIds : [];
        let paymentHistory = [] as any[];
        try {
          const parsed = JSON.parse(String(user.paymentHistory));
          if (Array.isArray(parsed)) paymentHistory = parsed;
        } catch {}

        const productId = order.productId || "";
        if (productId && !purchased.includes(productId)) {
          purchased.push(productId);
        }

        const now = new Date();
        const paymentEntry = {
          id: "pay-" + now.getTime(),
          date: now.toISOString().split("T")[0],
          amount: Number(order.amountUsd),
          method: order.paymentGateway,
          items: [order.productTitle],
          status: "Validé",
          orderNumber: order.orderNumber,
          transactionRef: order.transactionRef,
        };
        paymentHistory = [paymentEntry, ...paymentHistory];

        await prisma.user.update({
          where: { id: userId },
          data: {
            purchasedProductIds: purchased,
            paymentHistory: paymentHistory as any,
          } as any,
        });

        if (order.storeId) {
          const storeDoc = await prisma.store.findUnique({ where: { id: order.storeId } });
          if (storeDoc) {
            await prisma.store.update({
              where: { id: order.storeId },
              data: {
                salesCount: (storeDoc.salesCount || 0) + 1,
                totalRevenueUsd: Number(storeDoc.totalRevenueUsd || 0) + Number(order.amountUsd || 0),
              } as any,
            });
          }
        }

        if (order.productId) {
          const productDoc = await prisma.product.findUnique({ where: { id: order.productId } });
          if (productDoc) {
            await prisma.product.update({
              where: { id: order.productId },
              data: { salesCount: (productDoc.salesCount || 0) + 1 } as any,
            });
          }
        }

        return NextResponse.json({
          success: true,
          purchasedProductIds: purchased,
          message: "Achat enregistre dans l'espace membre.",
        });
      }

      // ============ BANNIÈRES DU SITE (module indépendant) ============
      case "create-banner": {
        const created = await prisma.siteBanner.create({
          data: {
            title: data.title || "",
            subtitle: data.subtitle || "",
            imageUrl: data.imageUrl || "",
            imagePosition: data.imagePosition || "50% 50%",
            animation: data.animation || "fade",
            intervalMs: Number(data.intervalMs) || 5000,
            buttonLabel: data.buttonLabel || "",
            buttonLink: data.buttonLink || "",
            linkTarget: data.linkTarget === "external" ? "external" : "internal",
            isActive: data.isActive ?? true,
            displayOrder: Number(data.displayOrder) || 0,
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

      case "update-banner": {
        if (!data.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
        const updated = await prisma.siteBanner.update({
          where: { id: data.id },
          data: {
            title: data.title ?? undefined,
            subtitle: data.subtitle ?? undefined,
            imageUrl: data.imageUrl ?? undefined,
            imagePosition: data.imagePosition ?? undefined,
            animation: data.animation ?? undefined,
            intervalMs: data.intervalMs !== undefined ? Number(data.intervalMs) || 5000 : undefined,
            buttonLabel: data.buttonLabel ?? undefined,
            buttonLink: data.buttonLink ?? undefined,
            linkTarget: data.linkTarget ?? undefined,
            isActive: data.isActive ?? undefined,
            displayOrder: data.displayOrder !== undefined ? Number(data.displayOrder) || 0 : undefined,
          } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

      case "delete-banner": {
        if (!data.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
        await prisma.siteBanner.delete({ where: { id: data.id } });
        return NextResponse.json({ success: true });
      }

      // ============ BLOG (module éditorial) ============
      case "create-blog-post": {
        const created = await prisma.blogPost.create({
          data: {
            title: data.title || "Article",
            slug: data.slug || `article-${Date.now()}`,
            excerpt: data.excerpt || "",
            content: data.content || "",
            authorName: data.authorName || "Équipe FORTIA",
            authorAvatar: data.authorAvatar || "",
            authorRole: data.authorRole || "",
            category: data.category || "",
            date: data.date || new Date().toISOString().split("T")[0],
            readTime: data.readTime || "5 min",
            image: data.image || "",
            accentColor: data.accentColor || "#D69E25",
            coverStyle: data.coverStyle || "image",
            tags: Array.isArray(data.tags) ? data.tags : [],
            isPublished: data.isPublished ?? true,
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

      case "update-blog-post": {
        if (!uuidOrNull(data.id)) return NextResponse.json({ error: "id (UUID) requis" }, { status: 400 });
        const updated = await prisma.blogPost.update({
          where: { id: data.id },
          data: {
            title: data.title ?? undefined,
            slug: data.slug ?? undefined,
            excerpt: data.excerpt ?? undefined,
            content: data.content ?? undefined,
            authorName: data.authorName ?? undefined,
            authorAvatar: data.authorAvatar ?? undefined,
            authorRole: data.authorRole ?? undefined,
            category: data.category ?? undefined,
            date: data.date ?? undefined,
            readTime: data.readTime ?? undefined,
            image: data.image ?? undefined,
            accentColor: data.accentColor ?? undefined,
            coverStyle: data.coverStyle ?? undefined,
            tags: Array.isArray(data.tags) ? data.tags : undefined,
            isPublished: data.isPublished ?? undefined,
          } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

      case "delete-blog-post": {
        if (!uuidOrNull(data.id)) return NextResponse.json({ error: "id (UUID) requis" }, { status: 400 });
        await prisma.blogPost.delete({ where: { id: data.id } });
        return NextResponse.json({ success: true });
      }

      // ============ MODÉRATION DES CONTENUS ============
      // Suspension immédiate d'une formation ou d'un produit non conforme :
      // le contenu est dépublié, les fonds sont GELÉS et le motif est conservé
      // pour être affiché au vendeur / formateur, qui peut demander un examen.
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

      // Rétablissement par l'administration (fin de suspension, fonds dégelés)
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

      // Demande d'examen par le propriétaire du contenu suspendu
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

      // ============ MISE À JOUR PRODUIT ============
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

      // ============ CRÉATION SERVICE AGENCE (admin) ============
      case "create-service": {
        const created = await prisma.servicePackage.create({
          data: {
            title: data.title || "Service sans titre",
            category: data.category || "",
            description: data.description || "",
            startingPrice: data.startingPrice || 0,
            estimatedDays: data.estimatedDays || "3 a 5 jours",
            iconName: data.iconName || "Briefcase",
            deliverables: data.deliverables || [],
            image: data.image || "",
            imagePosition: data.imagePosition || "50% 50%",
            images: Array.isArray(data.images) ? data.images : [],
            borderStyle: data.borderStyle || "gold",
            cardAnimation: data.cardAnimation || "fade-up",
            accentColor: data.accentColor || "#D69E25",
            badgeText: data.badgeText || "",
            featured: data.featured ?? false,
            isActive: data.isActive ?? true,
            displayOrder: data.displayOrder ?? 0,
          } as any,
        });

        if (Array.isArray(data.options)) {
          for (const [oi, option] of data.options.entries()) {
            await prisma.serviceOption.create({
              data: {
                serviceId: created.id,
                name: option.name || "Option " + (oi + 1),
                price: option.price || 0,
                displayOrder: oi,
              } as any,
            });
          }
        }

        return NextResponse.json({ success: true, id: created.id });
      }

      // ============ MISE À JOUR SERVICE AGENCE ============
      case "update-service": {
        if (!data.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
        const updated = await prisma.servicePackage.update({
          where: { id: data.id },
          data: {
            title: data.title ?? undefined,
            category: data.category ?? undefined,
            description: data.description ?? undefined,
            startingPrice: data.startingPrice ?? undefined,
            estimatedDays: data.estimatedDays ?? undefined,
            iconName: data.iconName ?? undefined,
            deliverables: data.deliverables ?? undefined,
            image: data.image ?? undefined,
            imagePosition: data.imagePosition ?? undefined,
            images: Array.isArray(data.images) ? data.images : undefined,
            borderStyle: data.borderStyle ?? undefined,
            cardAnimation: data.cardAnimation ?? undefined,
            accentColor: data.accentColor ?? undefined,
            badgeText: data.badgeText ?? undefined,
            featured: data.featured ?? undefined,
            isActive: data.isActive ?? undefined,
            displayOrder: data.displayOrder ?? undefined,
          } as any,
        });

        if (Array.isArray(data.options)) {
          await prisma.serviceOption.deleteMany({ where: { serviceId: data.id } });
          for (const [oi, option] of data.options.entries()) {
            await prisma.serviceOption.create({
              data: {
                serviceId: data.id,
                name: option.name || "Option " + (oi + 1),
                price: option.price || 0,
                displayOrder: oi,
              } as any,
            });
          }
        }

        return NextResponse.json({ success: true, id: updated.id });
      }

      // ============ SUPPRESSION SERVICE AGENCE ============
      case "delete-service": {
        if (!data.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
        await prisma.servicePackage.delete({ where: { id: data.id } });
        return NextResponse.json({ success: true });
      }

      // ============ COMMANDE SERVICE AGENCE (client) ============
      case "order-service": {
        const orderNumber = "SVC-" + Date.now().toString(36).toUpperCase();
        const serviceTitle = String(data.serviceTitle || data.title || "Service").trim();
        const clientName = String(data.clientName || "").trim();
        const clientEmail = String(data.clientEmail || "").trim().toLowerCase();
        const clientPhone = data.clientPhone || "";
        if (!clientName || !EMAIL_PATTERN.test(clientEmail)) {
          return NextResponse.json(
            { success: false, error: "Nom et adresse e-mail valides requis." },
            { status: 400 }
          );
        }

        const rawServiceId = data.serviceId ? String(data.serviceId) : "";
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawServiceId);

        // Prix recalculé depuis la base quand le service existe (le montant
        // envoyé par le navigateur n'est qu'une estimation).
        let estimatedPrice = Math.max(0, Number(data.estimatedPrice) || 0);
        if (isValidUuid) {
          const service = await prisma.servicePackage
            .findUnique({ where: { id: rawServiceId }, select: { startingPrice: true } })
            .catch(() => null);
          if (service) estimatedPrice = Number(service.startingPrice || 0);
        }

        // 1. Créer le devis (demande de service) visible côté admin
        const created = await prisma.serviceQuote.create({
          data: {
            clientName,
            clientEmail,
            clientPhone,
            serviceTitle,
            serviceId: isValidUuid ? rawServiceId : undefined,
            details: data.details || "",
            estimatedPrice,
            deadline: data.deadline || "",
            status: "Recu",
          } as any,
        });

        // 2. Notifier l'administration + le client (si compte existant)
        const notifDetails = data.details ? " Details: " + data.details : "";
        const notifMsg =
          "Nouvelle commande service: " + data.clientName + " a commande " +
          serviceTitle + " (" + orderNumber + ") - montant estime " +
          estimatedPrice + "$." + notifDetails;

        await prisma.notification.create({
          data: {
            title: "Nouvelle commande service",
            message: notifMsg,
            type: "info",
            linkTab: "admin",
            isGlobal: true,
            isRead: false,
          } as any,
        });

        // Notifier le client connecté (si son compte existe via email)
        let clientNotified = false;
        if (clientEmail) {
          const clientUser = await prisma.user.findFirst({
            where: { email: clientEmail.toLowerCase() },
          });
          if (clientUser) {
            await notifyUser(clientUser.id, {
              title: "Commande envoyée : " + serviceTitle,
              message: "Votre commande " + orderNumber + " a bien été reçue. Notre équipe vous contactera sous 24h pour valider le cahier des charges. Montant estimé : " + estimatedPrice + "$.",
              type: "success",
              linkTab: "member",
            });
            clientNotified = true;
          }
        }

        // 3. Email de confirmation (si Resend configuré)
        let emailSent = false;
        if (resend && clientEmail) {
          try {
            const priceUsd = estimatedPrice;
            const priceFcfa = (priceUsd * 600).toLocaleString("fr-FR");
            const emailHtml =
              "<div style='font-family:sans-serif;background:#010c22;color:#fff;padding:40px 16px;'>" +
              "<div style='max-width:560px;margin:0 auto;background:#021231;border:1px solid #1e293b;border-radius:16px;'>" +
              "<div style='background:#011d46;padding:32px 24px;text-align:center;border-bottom:2px solid #D69E25;'>" +
              "<h1 style='margin:0;color:#fff;font-size:26px;'>FORTIA <span style='color:#D69E25;'>HUB</span></h1>" +
              "</div>" +
              "<div style='padding:36px 32px;'>" +
              "<h2 style='margin:0 0 16px;color:#fff;font-size:22px;'>Votre commande a bien été reçue</h2>" +
              "<p style='color:#94a3b8;font-size:14px;'>Bonjour <strong style='color:#fff;'>" + (data.clientName || "") + "</strong>,</p>" +
              "<p style='color:#94a3b8;font-size:14px;'>Nous avons reçu votre commande du service <strong style='color:#D69E25;'>" + serviceTitle + "</strong>.</p>" +
              "<div style='background:#011D46;border:1px solid #334155;border-radius:12px;padding:20px;margin:24px 0;'>" +
              "<p style='margin:0 0 8px;color:#94a3b8;font-size:12px;'>REFERENCE COMMANDE</p>" +
              "<p style='margin:0;color:#D69E25;font-size:18px;font-weight:800;'>" + orderNumber + "</p>" +
              "<div style='height:1px;background:#334155;margin:16px 0;'></div>" +
              "<p style='margin:0 0 8px;color:#94a3b8;font-size:12px;'>Montant estime</p>" +
              "<p style='margin:0;color:#fff;font-size:20px;font-weight:800;'>" + priceUsd + "$ <span style='font-size:12px;color:#94a3b8;'>approx " + priceFcfa + " FCFA</span></p>" +
              "<div style='height:1px;background:#334155;margin:16px 0;'></div>" +
              "<p style='margin:0 0 8px;color:#94a3b8;font-size:12px;'>Delai estime</p>" +
              "<p style='margin:0;color:#fff;font-size:14px;'>" + (data.deadline || "3 a 5 jours") + "</p>" +
              "</div>" +
              "<p style='color:#94a3b8;font-size:13px;'>Notre equipe va vous contacter rapidement par email ou WhatsApp.</p>" +
              "</div>" +
              "<div style='background:#011d46;padding:20px 32px;text-align:center;border-top:1px solid #1e293b;'>" +
              "<p style='margin:0;color:#64748b;font-size:11px;'>FORTIA HUB © 2026 — Tous droits réservés</p>" +
              "</div>" +
              "</div>" +
              "</div>";

            const { data: emailData, error } = await resend.emails.send({
              from: FROM_EMAIL,
              to: [clientEmail],
              subject: "Commande reçue : " + serviceTitle,
              html: emailHtml,
            });
            if (error) {
              console.warn("[RESEND ORDER ERROR]", error);
            } else {
              emailSent = !!emailData?.id;
            }
          } catch (resendError: any) {
            console.warn("[RESEND ORDER EXCEPTION]", resendError);
          }
        }

        return NextResponse.json({
          success: true,
          id: created.id,
          orderNumber,
          emailSent,
          message: "Commande service créée avec succès",
        });
      }

      // ============ DEMANDE DE RETRAIT VENDEUR ============
      case "submit-payout": {
        // Le vendeur ne peut demander un retrait que sur SA boutique.
        const store = await requireStoreAccess(auth, data.storeId);
        const amountUsd = Math.max(0, Number(data.amountUsd) || 0);
        if (amountUsd <= 0) {
          throw new WriteError(400, "Montant de retrait invalide.");
        }
        const created = await prisma.payoutRequest.create({
          data: {
            storeId: store.id,
            storeName: store.name,
            vendorName: auth.user?.name || data.vendorName || "",
            amountUsd,
            amountFcfa: Number(data.amountFcfa) || Math.round(amountUsd * 600),
            payoutMethod: data.payoutMethod || "",
            accountDetails: data.accountDetails || "",
            status: "En_attente",
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

      // ============ APPROBATION RETRAIT ============
      case "approve-payout": {
        const payout = await prisma.payoutRequest.findUnique({ where: { id: data.id } });
        if (!payout) {
          return NextResponse.json({ error: "Demande de retrait introuvable" }, { status: 404 });
        }

        await prisma.payoutRequest.update({
          where: { id: data.id },
          data: { status: "Paye" } as any,
        });

        if (payout.storeId) {
          const storeDoc = await prisma.store.findUnique({ where: { id: payout.storeId } });
          if (storeDoc) {
            const newBalance = Math.max(
              Number(storeDoc.totalRevenueUsd || 0) - Number(payout.amountUsd || 0),
              0
            );
            await prisma.store.update({
              where: { id: payout.storeId },
              data: { totalRevenueUsd: newBalance } as any,
            });
          }
        }

        return NextResponse.json({
          success: true,
          message: "Retrait approuvé.",
        });
      }

      // ============ CRÉATION CENTRE DE FORMATION ============
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

      // ============ ADMIN : AJOUTER FORMATEUR ============
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

      // ============ CONFIG TARIFS ============
      // ============ ADMIN : BANNIR / SUPPRIMER UN CENTRE ============
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
        // Les formations restent en base mais sont détachées du centre supprimé.
        await prisma.course
          .updateMany({ where: { centerId: data.centerId }, data: { centerId: null } as any })
          .catch(() => null);
        await prisma.trainingCenter.delete({ where: { id: data.centerId } });
        return NextResponse.json({ success: true });
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

      // ============ PAIEMENT FRAIS CENTRE ============
      case "pay-training-center-fee": {
        if (!data.centerId) return NextResponse.json({ error: "centerId requis" }, { status: 400 });
        // Seul le propriétaire du centre (ou un admin) peut régler ses frais.
        await assertCenterAccess(auth, data.centerId);
        const updated = await prisma.trainingCenter.update({
          where: { id: data.centerId },
          data: { feePaid: true, status: "active" } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

      // ============ SUIVI COURS PAR FORMATEUR ============
      case "submit-course-by-instructor": {
        // Catégorie : le client envoie un CODE (« crypto », « ai »…) ou un ID.
        const categoryRef = String(data.category || data.categoryId || "").trim();
        const category = categoryRef
          ? await prisma.courseCategory
              .findUnique({
                where: UUID_PATTERN.test(categoryRef)
                  ? { id: categoryRef }
                  : { code: categoryRef },
              })
              .catch(() => null)
          : null;

        // Identité du formateur issue de la SESSION (un admin peut cibler).
        // Le centerId est validé ET vérifié (propriétaire) avant écriture.
        const instructorId = auth.isAdmin
          ? uuidOrNull(data.instructorId)
          : requireActorUser(auth).id;
        const centerId = uuidOrNull(data.centerId);
        if (!instructorId) {
          throw new WriteError(
            401,
            "Session formateur introuvable ou expirée : reconnectez-vous puis republiez la formation."
          );
        }
        if (centerId) {
          await assertCenterAccess(auth, centerId);
        }

        const title = String(data.title || "").trim() || "Cours sans titre";
        const slug = await uniqueCourseSlug(String(data.slug || title));

        let course: { id: string } | null = null;
        try {
          course = await prisma.course.create({
            data: {
              title,
              slug,
              instructorId,
              centerId: centerId || undefined,
              categoryId: category?.id || undefined,
              categoryLabel: data.categoryLabel || data.category || "",
              description: data.description || "",
              fullDescription: data.fullDescription || "",
              level: normalizeCourseLevel(data.level),
              durationHours: data.durationHours || 0,
              lessonsCount: data.lessonsCount || 0,
              price: data.price || 0,
              image: data.image || "",
              badge: data.badge || "",
              instructorName: data.instructorName || "",
              instructorRole: data.instructorRole || "",
              instructorAvatar: data.instructorAvatar || "",
              learningOutcomes: data.learningOutcomes || [],
              isPublished: data.isPublished ?? false,
            } as any,
          });


        if (Array.isArray(data.chapters)) {
          for (const [ci, chapter] of data.chapters.entries()) {
            const createdChapter = await prisma.courseChapter.create({
              data: {
                courseId: course.id,
                title: chapter.title || "Chapitre " + (ci + 1),
                displayOrder: ci,
              },
            });
            if (Array.isArray(chapter.lessons)) {
              for (const [li, lesson] of chapter.lessons.entries()) {
                await prisma.courseLesson.create({
                  data: {
                    chapterId: createdChapter.id,
                    title: lesson.title || "Lecon " + (li + 1),
                    duration: lesson.duration || "15 min",
                    type: lesson.type || "video",
                    videoUrl: lesson.videoUrl || "",
                    content: lesson.content || "",
                    videoProtected: !!(lesson as any).videoProtected,
                    videoCodeHash: String((lesson as any).videoCodeHash || ""),
                    displayOrder: li,
                  } as any,
                });
              }
            }
          }
        }

        if (Array.isArray(data.quiz)) {
          for (const [qi, quiz] of data.quiz.entries()) {
            const createdQuiz = await prisma.courseQuiz.create({
              data: {
                courseId: course.id,
                question: quiz.question || "",
                explanation: quiz.explanation || "",
                displayOrder: qi,
              },
            });
            if (Array.isArray(quiz.options)) {
              for (const [oi, option] of quiz.options.entries()) {
                await prisma.quizOption.create({
                  data: {
                    quizId: createdQuiz.id,
                    optionText: option,
                    isCorrect: oi === (quiz.correctAnswer ?? 0),
                    displayOrder: oi,
                  },
                });
              }
            }
          }
        }

        } catch (error) {
          // Aucune formation « fantôme » : si un chapitre, une leçon ou le quiz
          // échoue, la formation déjà créée est annulée et l'erreur réelle est
          // remontée au client (qui l'affiche désormais).
          if (course?.id) {
            await prisma.course.delete({ where: { id: course.id } }).catch(() => {});
          }
          throw error;
        }

        return NextResponse.json({ success: true, id: course.id });
      }

      // ============ NOTATION D'UN PRODUIT (membre connecté) ============
      // Une seule note par membre et par produit ; la moyenne et le nombre
      // d'avis sont recalculés puis stockés sur le produit.
      case "rate-product": {
        const productId = String(data.productId || "");
        if (!UUID_PATTERN.test(productId)) {
          return NextResponse.json({ error: "Produit invalide." }, { status: 400 });
        }
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
          return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
        }

        // Identité issue de la session : impossible de noter au nom d'un autre.
        const reviewer = requireActorUser(auth);
        const userId = reviewer.id;

        const clampedRating = Math.max(1, Math.min(5, Math.round(Number(data.rating))));
        if (!Number.isFinite(clampedRating)) {
          return NextResponse.json({ error: "Note invalide (1 à 5)." }, { status: 400 });
        }

        const existing = await prisma.productReview.findFirst({
          where: { productId, userId },
        });
        if (existing) {
          return NextResponse.json({
            success: true,
            alreadyRated: true,
            rating: Number(product.rating) || 0,
            reviewsCount: product.reviewsCount || 0,
            message: "Vous avez déjà noté ce produit.",
          });
        }

        await prisma.productReview.create({
          data: { productId, userId, rating: clampedRating },
        });

        const agg = await prisma.productReview.aggregate({
          _avg: { rating: true },
          _count: { id: true },
          where: { productId },
        });
        const newRating = Number((agg._avg.rating || 0).toFixed(1));
        const newCount = agg._count.id;

        await prisma.product.update({
          where: { id: productId },
          data: { rating: newRating, reviewsCount: newCount },
        });

        return NextResponse.json({
          success: true,
          alreadyRated: false,
          rating: newRating,
          reviewsCount: newCount,
          message: "Merci, votre note a été enregistrée.",
        });
      }

      // ============ NOTATION COURS ============
      case "rate-course": {
        // Identité issue de la session : impossible de noter au nom d'un autre.
        const reviewer = requireActorUser(auth);
        const userId = reviewer.id;
        const { courseId, rating } = data;
        if (!courseId || !rating) {
          return NextResponse.json(
            { success: false, error: "courseId et rating requis." },
            { status: 400 }
          );
        }

        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) {
          return NextResponse.json({ error: "Formation introuvable" }, { status: 404 });
        }

        const clampedRating = Math.max(1, Math.min(5, Math.round(Number(rating))));

        const existingReview = await prisma.courseReview.findUnique({
          where: {
            courseId_userId: { courseId, userId },
          },
        });

        if (existingReview) {
          return NextResponse.json(
            {
              success: true,
              alreadyRated: true,
              message: "Vous avez déjà noté cette formation.",
            },
            { status: 200 }
          );
        }

        await prisma.courseReview.create({
          data: {
            courseId,
            userId,
            rating: clampedRating,
          },
        });

        const agg = await prisma.courseReview.aggregate({
          _avg: { rating: true },
          _count: { id: true },
          where: { courseId },
        });

        const newRating = Number((agg._avg.rating || 0).toFixed(1));
        const newCount = agg._count.id;

        await prisma.course.update({
          where: { id: courseId },
          data: {
            rating: newRating,
            reviewsCount: newCount,
          },
        });

        return NextResponse.json({
          success: true,
          alreadyRated: false,
          rating: newRating,
          reviewsCount: newCount,
        });
      }

      // ============ SUSPENSION COURS ============
      case "suspend-course": {
        // Propriétaire de la formation ou administrateur uniquement.
        await assertCourseAccess(auth, data.id);
        const updated = await prisma.course.update({
          where: { id: data.id },
          data: { isPublished: false } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

      // ============ SUPPRESSION COURS ============
      case "delete-course": {
        // Propriétaire (formateur / centre) ou administrateur uniquement.
        await assertCourseAccess(auth, data.id);
        await prisma.course.delete({ where: { id: data.id } });
        return NextResponse.json({ success: true });
      }

      // ============ ACHAT STOCKAGE FORMATEUR ============
      case "register-instructor-purchase": {
        // Identité issue de la session ; le centre doit appartenir à l'appelant.
        const instructorId = auth.isAdmin
          ? uuidOrNull(data.instructorId) || undefined
          : requireActorUser(auth).id;
        const centerId = uuidOrNull(data.centerId);
        if (!instructorId) {
          throw new WriteError(400, "Formateur invalide.");
        }
        if (centerId) {
          await assertCenterAccess(auth, centerId);
        }
        const purchase = await prisma.instructorStoragePurchase.create({
          data: {
            instructorId,
            centerId: centerId || undefined,
            amountGb: Math.max(0, Number(data.amountGb) || 0),
            amountUsd: Math.max(0, Number(data.amountUsd) || 0),
            status: "Paye",
          } as any,
        });
        if (centerId) {
          const center = await prisma.trainingCenter.findUnique({ where: { id: centerId } });
          if (center) {
            await prisma.trainingCenter.update({
              where: { id: centerId },
              data: {
                storageQuotaGb:
                  (center.storageQuotaGb || 0) + Math.max(0, Number(data.amountGb) || 0),
              } as any,
            });
          }
        }
        return NextResponse.json({ success: true, id: purchase.id });
      }

      // ============ MISE À JOUR BOUTIQUE VENDEUR (logo, bannière, infos) ============
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

      default:
        return NextResponse.json({ error: "Action inconnue: " + action }, { status: 400 });
    }
  } catch (error: any) {
    // Détails techniques UNIQUEMENT dans les logs serveur.
    logWriteFailure(actionName, error);
    const { status, body } = toWriteErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
