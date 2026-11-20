// ============================================================
// FORTIA HUB — ABONNEMENTS (Phase 2)
// ------------------------------------------------------------
// Cycle : pending → active → (cancelled) → expired.
// Le renouvellement est MANUEL (une nouvelle commande) tant qu'aucun
// prélèvement automatique n'est configuré chez le fournisseur.
// ============================================================

import { prisma } from "@/lib/prisma";
import { grantEntitlement, revokeEntitlementsBySubscription } from "./entitlements";
import { PaymentError } from "./types";

function addInterval(from: Date, interval: string): Date {
  const next = new Date(from.getTime());
  next.setMonth(next.getMonth() + (String(interval).toLowerCase() === "year" ? 12 : 1));
  return next;
}

/**
 * Active l'abonnement acheté dans une commande payée.
 * Idempotent : un second appel ne prolonge pas la période.
 */
export async function activateSubscriptionForOrder(
  orderId: string,
  paymentId?: string
) {
  const order = await prisma.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order?.buyerUserId) return null;

  const item = order.items.find((row) => row.itemType === "subscription");
  if (!item) return null;

  const metadata = (item.metadata || {}) as { planId?: string };
  const planId = String(metadata.planId || "");
  if (!planId) {
    throw new PaymentError(409, "SUBSCRIPTION_INVALID", "Abonnement sans formule associée.");
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) {
    throw new PaymentError(404, "PLAN_NOT_FOUND", "Formule d'abonnement introuvable.");
  }

  const existing = await prisma.subscription.findUnique({ where: { orderId } }).catch(() => null);
  if (existing && existing.status === "active") {
    return existing;
  }

  const start = new Date();
  const end = addInterval(start, plan.interval);

  const subscription = existing
    ? await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          status: "active",
          provider: String(order.paymentGateway || ""),
          currentPeriodStart: start,
          currentPeriodEnd: end,
          cancelledAt: null,
          cancelAtPeriodEnd: false,
        },
      })
    : await prisma.subscription.create({
        data: {
          userId: order.buyerUserId,
          planId: plan.id,
          orderId,
          status: "active",
          provider: String(order.paymentGateway || ""),
          currentPeriodStart: start,
          currentPeriodEnd: end,
        },
      });

  await grantEntitlement({
    userId: order.buyerUserId,
    resourceType: "subscription",
    resourceId: plan.code,
    source: "subscription",
    orderId,
    subscriptionId: subscription.id,
    paymentId,
    expiresAt: end,
    metadata: { planId: plan.id, interval: plan.interval },
  });

  return subscription;
}

/** Renouvellement (paiement vérifié) : prolonge la période courante. */
export async function renewSubscription(
  subscriptionId: string,
  input: { paymentId?: string; providerRef?: string } = {}
) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!subscription) {
    throw new PaymentError(404, "SUBSCRIPTION_NOT_FOUND", "Abonnement introuvable.");
  }

  const now = new Date();
  const base =
    subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
      ? subscription.currentPeriodEnd
      : now;
  const end = addInterval(base, subscription.plan.interval);

  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "active",
      currentPeriodStart: subscription.currentPeriodStart || now,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
    },
  });

  await grantEntitlement({
    userId: subscription.userId,
    resourceType: "subscription",
    resourceId: subscription.plan.code,
    source: "subscription",
    orderId: subscription.orderId || null,
    subscriptionId: subscription.id,
    paymentId: input.paymentId || null,
    expiresAt: end,
    metadata: {
      planId: subscription.plan.id,
      interval: subscription.plan.interval,
      renewedAt: now.toISOString(),
    },
  });

  return updated;
}

/**
 * Annulation : l'accès reste actif jusqu'à la fin de la période payée.
 * `expireSubscriptions` fera passer le statut à `expired` à échéance.
 */
export async function cancelSubscription(userId: string, subscriptionId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId },
  });
  if (!subscription) {
    throw new PaymentError(404, "SUBSCRIPTION_NOT_FOUND", "Abonnement introuvable.");
  }
  if (subscription.status === "expired") return subscription;
  if (subscription.cancelAtPeriodEnd) return subscription;

  const now = new Date();
  const alreadyEnded =
    !!subscription.currentPeriodEnd && subscription.currentPeriodEnd.getTime() <= now.getTime();

  return prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: alreadyEnded ? "expired" : "cancelled",
      cancelAtPeriodEnd: true,
      cancelledAt: now,
    },
  });
}

/** Expire les abonnements arrivés à échéance et révoque leurs droits. */
export async function expireSubscriptions(now: Date = new Date()): Promise<number> {
  const rows = await prisma.subscription.findMany({
    where: {
      status: { in: ["active", "past_due", "cancelled", "pending"] },
      currentPeriodEnd: { lte: now },
    },
    select: { id: true },
  });
  if (rows.length === 0) return 0;

  for (const row of rows) {
    await prisma.subscription.update({
      where: { id: row.id },
      data: { status: "expired" },
    });
    await revokeEntitlementsBySubscription(row.id);
  }
  return rows.length;
}

export async function listUserSubscriptions(userId: string) {
  const rows = await prisma.subscription.findMany({
    where: { userId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    plan: {
      code: row.plan.code,
      name: row.plan.name,
      amountMinor: row.plan.amountMinor,
      currency: row.plan.currency,
      interval: row.plan.interval,
    },
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    cancelledAt: row.cancelledAt,
  }));
}

