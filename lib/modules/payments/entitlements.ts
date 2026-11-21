// ============================================================
// FORTIA HUB — ENTITLEMENTS (source de vérité des droits)
// ------------------------------------------------------------
// Les droits sont accordés UNIQUEMENT par des événements serveur :
// paiement confirmé, abonnement actif, décision admin ou migration.
// Aucune route ne doit lire un identifiant client pour accorder un accès.
// ============================================================

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Client Prisma global ou transaction interactive (écritures atomiques). */
export type EntitlementDb = Prisma.TransactionClient | typeof prisma;

export type ResourceType =
  | "course"
  | "product"
  | "subscription"
  | "storage"
  | "service"
  | "feature";

export interface GrantEntitlementInput {
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  source: string;
  orderId?: string | null;
  subscriptionId?: string | null;
  paymentId?: string | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}

/**
 * Vérifie un droit actif à un instant donné.
 * Un droit suspendu, révoqué, expiré ou pas encore commencé est refusé.
 */
export async function hasEntitlement(
  userId: string | null | undefined,
  resourceType: ResourceType,
  resourceId: string | null | undefined,
  at: Date = new Date()
): Promise<boolean> {
  if (!userId || !resourceId) return false;

  const row = await prisma.entitlement.findUnique({
    where: {
      userId_resourceType_resourceId: { userId, resourceType, resourceId },
    },
    select: { status: true, startsAt: true, expiresAt: true },
  });

  if (!row) return false;
  if (row.status !== "active") return false;
  if (row.startsAt.getTime() > at.getTime()) return false;
  if (row.expiresAt && row.expiresAt.getTime() <= at.getTime()) return false;
  return true;
}

/**
 * Accorde (ou réactive) un droit. Idempotent : un même droit n'est jamais
 * dupliqué grâce à la contrainte unique (userId, resourceType, resourceId).
 */
export async function grantEntitlement(
  input: GrantEntitlementInput,
  db: EntitlementDb = prisma
) {
  const expiresAt = input.expiresAt ?? null;
  const metadata = input.metadata ?? {};
  const now = new Date();

  const row = await db.entitlement.upsert({
    where: {
      userId_resourceType_resourceId: {
        userId: input.userId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      },
    },
    create: {
      userId: input.userId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      status: "active",
      source: input.source,
      orderId: input.orderId || null,
      subscriptionId: input.subscriptionId || null,
      paymentId: input.paymentId || null,
      startsAt: now,
      expiresAt,
      metadata: metadata as never,
    },
    update: {
      status: "active",
      source: input.source,
      orderId: input.orderId || null,
      subscriptionId: input.subscriptionId || null,
      paymentId: input.paymentId || null,
      startsAt: now,
      expiresAt,
      revokedAt: null,
      metadata: metadata as never,
    },
  });

  await syncLegacyAccessCache(input.userId, input.resourceType, input.resourceId, true, db);
  return row;
}

export async function suspendEntitlement(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  db: EntitlementDb = prisma
) {
  return db.entitlement.updateMany({
    where: { userId, resourceType, resourceId, status: "active" },
    data: { status: "suspended" },
  });
}

/** Révoque un droit précis et retire le cache d'affichage (tableaux legacy). */
export async function revokeEntitlement(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  db: EntitlementDb = prisma
) {
  const result = await db.entitlement.updateMany({
    where: { userId, resourceType, resourceId, status: { in: ["active", "suspended"] } },
    data: { status: "revoked", revokedAt: new Date() },
  });
  if (result.count > 0) {
    await syncLegacyAccessCache(userId, resourceType, resourceId, false, db);
  }
  return result;
}

/** Révoque tous les droits accordés par un paiement (remboursement). */
export async function revokeEntitlementsByPayment(
  paymentId: string,
  db: EntitlementDb = prisma
) {
  const rows = await db.entitlement.findMany({
    where: { paymentId, status: { in: ["active", "suspended"] } },
    select: { userId: true, resourceType: true, resourceId: true },
  });
  if (rows.length === 0) return 0;

  const updated = await db.entitlement.updateMany({
    where: { paymentId, status: { in: ["active", "suspended"] } },
    data: { status: "revoked", revokedAt: new Date() },
  });

  for (const row of rows) {
    await syncLegacyAccessCache(
      row.userId,
      row.resourceType as ResourceType,
      row.resourceId,
      false,
      db
    );
  }
  return updated.count;
}

/**
 * Révoque aussi les droits rattachés à la COMMANDE (y compris ceux créés avant
 * l'ajout du lien paymentId, par migration). Utilisé lors d'un remboursement total.
 */
export async function revokeEntitlementsByOrder(
  orderId: string,
  db: EntitlementDb = prisma
) {
  const rows = await db.entitlement.findMany({
    where: { orderId, status: { in: ["active", "suspended"] } },
    select: { userId: true, resourceType: true, resourceId: true },
  });
  if (rows.length === 0) return 0;

  const updated = await db.entitlement.updateMany({
    where: { orderId, status: { in: ["active", "suspended"] } },
    data: { status: "revoked", revokedAt: new Date() },
  });

  for (const row of rows) {
    await syncLegacyAccessCache(
      row.userId,
      row.resourceType as ResourceType,
      row.resourceId,
      false,
      db
    );
  }
  return updated.count;
}

/** Révoque les droits liés à un abonnement (expiration / annulation). */
export async function revokeEntitlementsBySubscription(
  subscriptionId: string,
  db: EntitlementDb = prisma
) {
  const rows = await db.entitlement.findMany({
    where: { subscriptionId, status: { in: ["active", "suspended"] } },
    select: { userId: true, resourceType: true, resourceId: true },
  });
  if (rows.length === 0) return 0;

  const updated = await db.entitlement.updateMany({
    where: { subscriptionId, status: { in: ["active", "suspended"] } },
    data: { status: "revoked", revokedAt: new Date() },
  });
  for (const row of rows) {
    await syncLegacyAccessCache(
      row.userId,
      row.resourceType as ResourceType,
      row.resourceId,
      false,
      db
    );
  }
  return updated.count;
}

/** Expire les droits temporaires arrivés à échéance (job de maintenance). */
export async function expireEntitlements(
  now: Date = new Date(),
  db: EntitlementDb = prisma
): Promise<number> {
  const rows = await db.entitlement.findMany({
    where: { status: "active", expiresAt: { lte: now } },
    select: { userId: true, resourceType: true, resourceId: true },
  });
  if (rows.length === 0) return 0;

  const updated = await db.entitlement.updateMany({
    where: { status: "active", expiresAt: { lte: now } },
    data: { status: "expired" },
  });
  for (const row of rows) {
    await syncLegacyAccessCache(
      row.userId,
      row.resourceType as ResourceType,
      row.resourceId,
      false,
      db
    );
  }
  return updated.count;
}


export async function listEntitlements(userId: string) {
  const rows = await prisma.entitlement.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const now = Date.now();
  return rows.map((row) => ({
    id: row.id,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    status: row.status,
    source: row.source,
    startsAt: row.startsAt,
    expiresAt: row.expiresAt,
    active:
      row.status === "active" &&
      row.startsAt.getTime() <= now &&
      (!row.expiresAt || row.expiresAt.getTime() > now),
  }));
}

/**
 * Cache d'affichage (tableaux historiques) : n'accorde AUCUN droit.
 * Il permet uniquement à l'ancienne interface de refléter les entitlements.
 */
async function syncLegacyAccessCache(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  grant: boolean,
  db: EntitlementDb = prisma
): Promise<void> {
  try {
    if (resourceType === "course") {
      if (grant) {
        await db.$executeRaw`
          UPDATE users
          SET enrolled_course_ids = (
            SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(enrolled_course_ids, '{}') || ${[resourceId]}::text[]))
          )
          WHERE id = ${userId}::uuid
        `;
      } else {
        await db.$executeRaw`
          UPDATE users
          SET enrolled_course_ids = array_remove(COALESCE(enrolled_course_ids, '{}'), ${resourceId})
          WHERE id = ${userId}::uuid
        `;
      }
    }

    if (resourceType === "product") {
      if (grant) {
        await db.$executeRaw`
          UPDATE users
          SET purchased_product_ids = (
            SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(purchased_product_ids, '{}') || ${[resourceId]}::text[]))
          )
          WHERE id = ${userId}::uuid
        `;
      } else {
        await db.$executeRaw`
          UPDATE users
          SET purchased_product_ids = array_remove(COALESCE(purchased_product_ids, '{}'), ${resourceId})
          WHERE id = ${userId}::uuid
        `;
      }
    }
  } catch (error) {
    // Le cache ne doit jamais empêcher l'octroi du droit lui-même.
    console.warn("[ENTITLEMENTS] Cache d'affichage non mis à jour:", (error as Error)?.message);
  }
}

