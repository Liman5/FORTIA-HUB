// ============================================================
// FORTIA HUB — POLITIQUE D'ACCÈS DES ÉCRITURES (Phase 1A)
// ------------------------------------------------------------
// Chaque action de POST /api/platform/write possède une politique
// EXPLICITE. Aucune action inconnue n'est exécutée (refus par défaut).
//
//   public : action ouverte (devis, candidature, support, commande)
//            → limitée en débit + validée dans la route.
//   user   : session obligatoire ; l'identité vient de la SESSION,
//            jamais du payload. Un admin peut agir si son rôle couvre
//            le domaine indiqué (adminBypassDomain).
//   admin  : administrateur authentifié + domaine d'écriture requis
//            (superviseur = lecture seule, financier = finance, etc.).
//
// ⚠️ L'absence d'administrateur n'autorise JAMAIS une action.
// ============================================================

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/services/authSession";
import { requireAdmin, type AdminContext } from "@/lib/server/requireAdmin";
import { canWriteDomain, isReadOnlyAdmin, normalizeAdminRole } from "@/lib/server/adminRoles";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";

export type WriteAdminDomain = "content" | "finance" | "kyc";

type ActorKind = "public" | "user" | "admin";

interface WritePolicy {
  /** Type d'acteur minimal autorisé. */
  actor: ActorKind;
  /** Domaine requis quand actor = "admin". */
  adminDomain?: WriteAdminDomain;
  /** Domaine autorisé pour un admin qui déclenche une action "user". */
  adminBypassDomain?: WriteAdminDomain;
  /** Limitation de débit des actions publiques. */
  limit?: { max: number; windowMs: number };
}

/** Politique des 58 actions. Toute action absente = refus. */
export const WRITE_POLICIES: Record<string, WritePolicy> = {
  // ---- Public (validées + limitées) ----
  "submit-quote": { actor: "public", limit: { max: 20, windowMs: 60_000 } },
  "submit-vendor-app": { actor: "public", limit: { max: 10, windowMs: 60_000 } },
  "submit-support": { actor: "public", limit: { max: 20, windowMs: 60_000 } },
  "order-service": { actor: "public", limit: { max: 10, windowMs: 60_000 } },
  "submit-order": { actor: "public", limit: { max: 30, windowMs: 60_000 } },

  // ---- Membre : identité imposée par la session ----
  "submit-kyc": { actor: "user", adminBypassDomain: "kyc" },
  "update-profile": { actor: "user", adminBypassDomain: "content" },
  "update-freelance-profile": { actor: "user", adminBypassDomain: "content" },
  "update-enterprise-profile": { actor: "user", adminBypassDomain: "content" },
  "sync-user-learning": { actor: "user", adminBypassDomain: "content" },
  "issue-certificate": { actor: "user", adminBypassDomain: "content" },
  "register-course-media-storage": { actor: "user", adminBypassDomain: "content" },
  "register-free-purchase": { actor: "user", adminBypassDomain: "content" },
  "mark-notification-read": { actor: "user", adminBypassDomain: "content" },
  "delete-notification": { actor: "user", adminBypassDomain: "content" },
  "rate-product": { actor: "user", adminBypassDomain: "content" },
  "rate-course": { actor: "user", adminBypassDomain: "content" },
  "create-training-center": { actor: "user", adminBypassDomain: "content" },
  "update-training-center-config": { actor: "user", adminBypassDomain: "content" },
  "pay-training-center-fee": { actor: "user", adminBypassDomain: "finance" },
  "register-instructor-purchase": { actor: "user", adminBypassDomain: "finance" },
  "submit-payout": { actor: "user", adminBypassDomain: "finance" },

  // ---- Propriétaire de contenu (formateur / vendeur) ----
  "update-course": { actor: "user", adminBypassDomain: "content" },
  "suspend-course": { actor: "user", adminBypassDomain: "content" },
  "delete-course": { actor: "user", adminBypassDomain: "content" },
  "submit-course-by-instructor": { actor: "user", adminBypassDomain: "content" },
  "create-product": { actor: "user", adminBypassDomain: "content" },
  "update-product": { actor: "user", adminBypassDomain: "content" },
  "update-store": { actor: "user", adminBypassDomain: "content" },
  "appeal-moderation": { actor: "user", adminBypassDomain: "content" },

  // ---- Administration ----
  "save-commission-rule": { actor: "admin", adminDomain: "finance" },
  "approve-payout": { actor: "admin", adminDomain: "finance" },
  "approve-kyc": { actor: "admin", adminDomain: "kyc" },
  "kyc-set-lock": { actor: "admin", adminDomain: "kyc" },
  "kyc-unlock": { actor: "admin", adminDomain: "kyc" },
  "kyc-remove-doc": { actor: "admin", adminDomain: "kyc" },
  "approve-kyc-full": { actor: "admin", adminDomain: "kyc" },
  "create-course": { actor: "admin", adminDomain: "content" },
  "create-course-category": { actor: "admin", adminDomain: "content" },
  "update-course-category": { actor: "admin", adminDomain: "content" },
  "delete-course-category": { actor: "admin", adminDomain: "content" },
  "set-course-featured": { actor: "admin", adminDomain: "content" },
  "create-banner": { actor: "admin", adminDomain: "content" },
  "update-banner": { actor: "admin", adminDomain: "content" },
  "delete-banner": { actor: "admin", adminDomain: "content" },
  "create-blog-post": { actor: "admin", adminDomain: "content" },
  "update-blog-post": { actor: "admin", adminDomain: "content" },
  "delete-blog-post": { actor: "admin", adminDomain: "content" },
  "moderate-content": { actor: "admin", adminDomain: "content" },
  "restore-content": { actor: "admin", adminDomain: "content" },
  "create-service": { actor: "admin", adminDomain: "content" },
  "update-service": { actor: "admin", adminDomain: "content" },
  "delete-service": { actor: "admin", adminDomain: "content" },
  "approve-vendor-app": { actor: "admin", adminDomain: "content" },
  "reject-vendor-app": { actor: "admin", adminDomain: "content" },
  "admin-add-instructor": { actor: "admin", adminDomain: "content" },
  "ban-training-center": { actor: "admin", adminDomain: "content" },
  "delete-training-center": { actor: "admin", adminDomain: "content" },
};

export const WRITE_ACTION_NAMES = Object.keys(WRITE_POLICIES);

// ============================================================
// ERREURS MÉTIER (statuts HTTP normalisés)
// ============================================================

export type WriteErrorStatus = 400 | 401 | 403 | 404 | 409 | 429 | 500;

export class WriteError extends Error {
  status: WriteErrorStatus;
  code?: string;

  constructor(status: WriteErrorStatus, message: string, code?: string) {
    super(message);
    this.name = "WriteError";
    this.status = status;
    this.code = code;
  }
}

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidOrNull(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw && UUID_PATTERN.test(raw) ? raw : null;
}

// ============================================================
// CONTEXTE D'APPEL
// ============================================================

type SessionUser = Awaited<ReturnType<typeof getCurrentUser>>;

export interface WriteActorContext {
  /** Utilisateur membre connecté (null pour un anonyme ou un admin Bearer). */
  user: SessionUser;
  /** Administrateur authentifié (cookie admin ou Bearer), sinon null. */
  admin: AdminContext | null;
  actorId: string;
  email: string;
  isAdmin: boolean;
  /** Superviseur = lecture seule : aucune écriture autorisée. */
  isSupervisor: boolean;
}

/**
 * Autorise (ou refuse) une action AVANT toute écriture.
 * Lève une `WriteError` : 400 action inconnue, 401 non authentifié,
 * 403 droits insuffisants, 429 trop de requêtes.
 */
export async function authorizeWriteAction(
  req: NextRequest,
  action: string,
  _data: Record<string, unknown>
): Promise<WriteActorContext> {
  const policy = WRITE_POLICIES[action];
  if (!policy) {
    throw new WriteError(400, "Action inconnue ou non autorisée.", "UNKNOWN_ACTION");
  }

  const [user, admin] = await Promise.all([
    getCurrentUser(req).catch(() => null),
    requireAdmin(req).catch(() => null),
  ]);

  const isAdmin = !!admin;
  const isSupervisor = isAdmin && isReadOnlyAdmin(normalizeAdminRole(admin?.role));

  const context: WriteActorContext = {
    user: user || null,
    admin: admin || null,
    actorId: user?.id || admin?.id || "",
    email: String(user?.email || admin?.email || "").toLowerCase(),
    isAdmin,
    isSupervisor,
  };

  // ---- Actions publiques : limitées en débit, aucune donnée privée ----
  if (policy.actor === "public") {
    if (policy.limit) {
      const wait = rateLimit(
        `write:${action}:${clientIp(req)}`,
        policy.limit.max,
        policy.limit.windowMs
      );
      if (wait) {
        throw new WriteError(
          429,
          `Trop de requêtes. Réessayez dans ${wait} seconde(s).`,
          "RATE_LIMITED"
        );
      }
    }
    return context;
  }

  // ---- Toute action non publique exige une identité ----
  if (!user && !admin) {
    throw new WriteError(401, "Authentification requise pour cette opération.");
  }

  // Le superviseur ne peut jamais écrire, quel que soit le domaine.
  if (isSupervisor) {
    throw new WriteError(
      403,
      "Votre profil est en lecture seule (superviseur) : aucune modification autorisée."
    );
  }

  // ---- Administration : domaine d'écriture obligatoire ----
  if (policy.actor === "admin") {
    if (!admin) {
      throw new WriteError(403, "Accès réservé à l'administration.");
    }
    const domain = policy.adminDomain || "content";
    if (!canWriteDomain(admin.role, domain)) {
      throw new WriteError(
        403,
        domain === "finance"
          ? "Vos droits ne couvrent pas le domaine finance."
          : domain === "kyc"
            ? "Vos droits ne couvrent pas le domaine KYC."
            : "Vos droits ne couvrent pas ce domaine.",
        "ADMIN_DOMAIN_DENIED"
      );
    }
    return context;
  }

  // ---- Action membre : un admin peut agir si son domaine le permet ----
  if (admin) {
    const domain = policy.adminBypassDomain || "content";
    if (!canWriteDomain(admin.role, domain)) {
      throw new WriteError(
        403,
        domain === "finance"
          ? "Vos droits ne couvrent pas le domaine finance."
          : domain === "kyc"
            ? "Vos droits ne couvrent pas le domaine KYC."
            : "Vos droits ne couvrent pas ce domaine.",
        "ADMIN_DOMAIN_DENIED"
      );
    }
  }

  return context;
}

// ============================================================
// GARDES DE PROPRIÉTÉ (vérifiées en base, jamais dans le payload)
// ============================================================

/** Exige un membre connecté (un admin Bearer n'a pas d'identité membre). */
export function requireActorUser(ctx: WriteActorContext): NonNullable<SessionUser> {
  if (!ctx.user?.id) {
    throw new WriteError(401, "Connectez-vous avec un compte membre pour cette opération.");
  }
  return ctx.user;
}

/**
 * Identité cible d'une action « self » :
 *  • membre  → TOUJOURS son propre id (un id différent dans le payload = 403) ;
 *  • admin   → peut cibler un autre utilisateur (UUID validé).
 */
export function resolveTargetUserId(
  ctx: WriteActorContext,
  requested?: unknown
): string {
  const requestedId = uuidOrNull(requested);

  if (ctx.isAdmin) {
    if (requestedId) return requestedId;
    if (ctx.user?.id) return ctx.user.id;
    throw new WriteError(400, "userId requis pour cette opération.");
  }

  const user = requireActorUser(ctx);
  if (requestedId && requestedId !== user.id) {
    throw new WriteError(403, "Vous ne pouvez modifier que vos propres données.");
  }
  return user.id;
}

/** L'utilisateur ciblé doit être l'appelant, sauf administrateur. */
export function assertSelfOrAdmin(ctx: WriteActorContext, requestedId: unknown): void {
  if (ctx.isAdmin) return;
  const user = requireActorUser(ctx);
  const target = String(requestedId || "").trim();
  if (!target || target !== user.id) {
    throw new WriteError(403, "Vous ne pouvez modifier que vos propres données.");
  }
}

/** Formation : formateur propriétaire, centre propriétaire, ou admin. */
export async function assertCourseAccess(ctx: WriteActorContext, courseId: unknown) {
  const id = uuidOrNull(courseId);
  if (!id) throw new WriteError(400, "Identifiant de formation invalide.");

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, instructorId: true, centerId: true, slug: true },
  });
  if (!course) throw new WriteError(404, "Formation introuvable.");
  if (ctx.isAdmin) return course;

  const user = requireActorUser(ctx);
  if (course.instructorId && course.instructorId === user.id) return course;

  if (course.centerId && UUID_PATTERN.test(course.centerId)) {
    const center = await prisma.trainingCenter.findUnique({
      where: { id: course.centerId },
      select: { ownerId: true },
    });
    if (center?.ownerId && center.ownerId === user.id) return course;
  }

  throw new WriteError(403, "Vous ne pouvez gérer que vos propres formations.");
}

/** Produit : vendeur propriétaire (ou boutique propriétaire), ou admin. */
export async function assertProductAccess(ctx: WriteActorContext, productId: unknown) {
  const id = uuidOrNull(productId);
  if (!id) throw new WriteError(400, "Identifiant de produit invalide.");

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, vendorId: true, storeId: true },
  });
  if (!product) throw new WriteError(404, "Produit introuvable.");
  if (ctx.isAdmin) return product;

  const user = requireActorUser(ctx);
  if (product.vendorId && product.vendorId === user.id) return product;

  if (product.storeId && UUID_PATTERN.test(product.storeId)) {
    const store = await prisma.store.findUnique({
      where: { id: product.storeId },
      select: { vendorId: true, ownerEmail: true },
    });
    if (store?.vendorId && store.vendorId === user.id) return product;
    if (
      store?.ownerEmail &&
      store.ownerEmail.toLowerCase() === String(user.email || "").toLowerCase()
    ) {
      return product;
    }
  }

  throw new WriteError(403, "Vous ne pouvez gérer que vos propres produits.");
}

/** Boutique : résolue en base puis vérifiée (propriétaire ou admin). */
export async function requireStoreAccess(ctx: WriteActorContext, storeRef: unknown) {
  const raw = typeof storeRef === "string" ? storeRef.trim() : "";
  if (!raw) throw new WriteError(400, "Boutique requise.");

  const select = { id: true, name: true, vendorId: true, ownerEmail: true, logo: true } as const;
  const store =
    (UUID_PATTERN.test(raw)
      ? await prisma.store.findUnique({ where: { id: raw }, select })
      : null) ||
    (await prisma.store.findUnique({ where: { slug: raw }, select }).catch(() => null)) ||
    (await prisma.store.findFirst({ where: { name: raw }, select }).catch(() => null));

  if (!store) throw new WriteError(404, "Boutique introuvable.");
  if (ctx.isAdmin) return store;

  const user = requireActorUser(ctx);
  const email = String(user.email || "").toLowerCase();
  const owns =
    (!!store.vendorId && store.vendorId === user.id) ||
    (!!store.ownerEmail && store.ownerEmail.toLowerCase() === email);

  if (!owns) {
    throw new WriteError(403, "Vous ne pouvez gérer que votre propre boutique.");
  }
  return store;
}

/** Centre de formation : propriétaire ou admin. */
export async function assertCenterAccess(ctx: WriteActorContext, centerId: unknown) {
  const id = uuidOrNull(centerId);
  if (!id) throw new WriteError(400, "Identifiant de centre invalide.");

  const center = await prisma.trainingCenter.findUnique({
    where: { id },
    select: { id: true, ownerId: true, centerName: true, storageQuotaGb: true },
  });
  if (!center) throw new WriteError(404, "Centre de formation introuvable.");
  if (ctx.isAdmin) return center;

  const user = requireActorUser(ctx);
  if (!center.ownerId || center.ownerId !== user.id) {
    throw new WriteError(403, "Vous ne pouvez gérer que votre propre centre de formation.");
  }
  return center;
}

/** Notification : destinataire ou annonce globale. */
export async function assertNotificationAccess(ctx: WriteActorContext, id: unknown) {
  const notificationId = uuidOrNull(id);
  if (!notificationId) throw new WriteError(400, "Notification invalide.");

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true, isGlobal: true },
  });
  if (!notification) throw new WriteError(404, "Notification introuvable.");

  const user = requireActorUser(ctx);
  if (notification.isGlobal) return notification;
  if (notification.userId === user.id) return notification;

  throw new WriteError(403, "Cette notification ne vous appartient pas.");
}

/** Contenu (formation ou produit) : propriétaire ou admin. */
export async function assertContentOwnership(
  ctx: WriteActorContext,
  targetType: "course" | "product",
  targetId: unknown
) {
  if (targetType === "product") {
    await assertProductAccess(ctx, targetId);
    return;
  }
  await assertCourseAccess(ctx, targetId);
}

/** Commande : rattachée à l'appelant (id ou email), sinon refus. */
export function assertOrderAccess(
  ctx: WriteActorContext,
  order: { buyerUserId?: string | null; buyerEmail?: string | null }
): void {
  if (ctx.isAdmin) return;
  const user = requireActorUser(ctx);
  const email = String(user.email || "").toLowerCase();
  const owns =
    (!!order.buyerUserId && order.buyerUserId === user.id) ||
    (!!order.buyerEmail && order.buyerEmail.toLowerCase() === email);
  if (!owns) {
    throw new WriteError(403, "Cette commande ne vous appartient pas.");
  }
}

// ============================================================
// RÉPONSES D'ERREUR (aucun détail technique exposé au navigateur)
// ============================================================

export interface WriteErrorBody {
  success: false;
  error: string;
  code?: string;
}

/**
 * Convertit une erreur en réponse HTTP normalisée.
 * Les messages Prisma bruts ne sont JAMAIS renvoyés : ils restent dans les logs.
 */
export function toWriteErrorResponse(error: unknown): {
  status: WriteErrorStatus;
  body: WriteErrorBody;
} {
  if (error instanceof WriteError) {
    return {
      status: error.status,
      body: {
        success: false,
        error: error.message,
        ...(error.code ? { code: error.code } : {}),
      },
    };
  }

  if (error instanceof SyntaxError) {
    return {
      status: 400,
      body: { success: false, error: "Requête invalide (JSON attendu)." },
    };
  }

  const code =
    typeof (error as { code?: unknown })?.code === "string"
      ? String((error as { code?: string }).code)
      : "";

  if (code === "P2025") {
    return { status: 404, body: { success: false, error: "Ressource introuvable." } };
  }
  if (code === "P2002") {
    return {
      status: 409,
      body: { success: false, error: "Conflit : cette valeur existe déjà." },
    };
  }
  if (code === "P2003") {
    return {
      status: 409,
      body: { success: false, error: "Référence liée invalide ou inexistante." },
    };
  }
  if (code === "P2000" || code === "P2023") {
    return { status: 400, body: { success: false, error: "Donnée invalide." } };
  }

  return {
    status: 500,
    body: { success: false, error: "Erreur interne. Veuillez réessayer." },
  };
}

/** Journalisation serveur (l'action est connue, l'erreur reste interne). */
export function logWriteFailure(action: string, error: unknown): void {
  console.error(`[Platform Write] action="${action || "?"}"`, error);
}




