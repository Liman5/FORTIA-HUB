// ============================================================
// FORTIA HUB — COMMANDES (Phase 2)
// ------------------------------------------------------------
// • Prix calculés exclusivement côté serveur (pricing.ts).
// • Une commande GRATUITE (total 0) est réglée immédiatement.
// • Une commande payante reste En_attente_API jusqu'au webhook vérifié.
// ============================================================

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  computeCommissionUsd,
  resolveCommissionRule,
  type SaleScope,
} from "@/lib/server/commissions";
import { grantEntitlement, type EntitlementDb } from "./entitlements";
import { fromMinorUnits } from "./money";
import { resolveOrderItems } from "./pricing";
import { activateSubscriptionForOrder } from "./subscriptions";
import {
  PaymentError,
  type BuyerInfo,
  type CreateOrderItemInput,
  type ResolvedOrderItem,
} from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function saleScopeFor(items: ResolvedOrderItem[]): SaleScope {
  if (items.some((item) => item.type === "course")) return "course";
  if (items.some((item) => item.type === "service")) return "service";
  if (items.some((item) => item.type === "storage")) return "storage";
  return "digital_product";
}

export interface CreateOrderInput {
  buyer: BuyerInfo;
  items: CreateOrderItemInput[];
}

export interface CreateOrderResult {
  orderId: string;
  orderNumber: string;
  status: "pending" | "paid";
  totalMinor: number;
  currency: string;
  requiresPayment: boolean;
}

/** Crée une commande (prix serveur) et la règle immédiatement si gratuite. */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const buyer = input.buyer;
  if (!buyer?.userId) {
    throw new PaymentError(401, "AUTH_REQUIRED", "Connectez-vous pour finaliser la commande.");
  }
  if (!buyer.email) {
    throw new PaymentError(400, "EMAIL_REQUIRED", "Adresse e-mail du client requise.");
  }

  const pricing = await resolveOrderItems(input.items);

  // Achat de stockage ou frais de centre : le centre doit appartenir à l'acheteur.
  for (const item of pricing.items) {
    const metadata = item.metadata as { centerId?: string; planCode?: string };
    const isStorage = item.type === "storage";
    const isCenterFee = item.type === "feature" && metadata?.planCode === "center_fee";
    if (!isStorage && !isCenterFee) continue;
    const centerId = String(metadata?.centerId || "");
    if (!UUID_PATTERN.test(centerId)) {
      throw new PaymentError(
        400,
        "CENTER_REQUIRED",
        isCenterFee
          ? "Centre de formation requis pour ces frais."
          : "Centre de formation requis pour ce stockage."
      );
    }
    const center = await prisma.trainingCenter.findUnique({
      where: { id: centerId },
      select: { ownerId: true },
    });
    if (!center || center.ownerId !== buyer.userId) {
      throw new PaymentError(403, "CENTER_FORBIDDEN", "Ce centre de formation ne vous appartient pas.");
    }
  }

  const scope = saleScopeFor(pricing.items);
  const commissionRule = await resolveCommissionRule(scope);
  const amountUsd = fromMinorUnits(pricing.subtotalMinor, pricing.currency);
  const commission = computeCommissionUsd(amountUsd, commissionRule);

  const firstProduct = pricing.items.find((item) => item.type === "product");
  const firstCourse = pricing.items.find((item) => item.type === "course");
  const storeId = String((firstProduct?.metadata as { storeId?: string })?.storeId || "");
  let storeName = "FORTIA HUB";
  if (UUID_PATTERN.test(storeId)) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { name: true },
    });
    storeName = store?.name || "FORTIA HUB";
  }

  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${randomUUID()
    .slice(0, 4)
    .toUpperCase()}`;

  const order = await prisma.marketplaceOrder.create({
    data: {
      orderNumber,
      buyerName: buyer.name || "Client FORTIA",
      buyerEmail: buyer.email.toLowerCase(),
      buyerPhone: buyer.phone || "",
      buyerUserId: buyer.userId,
      storeId: UUID_PATTERN.test(storeId) ? storeId : undefined,
      storeName,
      productId: firstProduct?.resourceId || undefined,
      productTitle:
        firstProduct?.title || firstCourse?.title || pricing.items[0]?.title || "Commande",
      amountUsd,
      platformCommissionUsd: commission.commissionUsd,
      vendorEarningsUsd: commission.vendorUsd,
      paymentGateway: "",
      transactionRef: "",
      status: "En_attente_API",
      currency: pricing.currency,
      subtotalMinor: pricing.subtotalMinor,
      totalMinor: pricing.subtotalMinor,
      items: {
        create: pricing.items.map((item) => ({
          itemType: item.type,
          resourceId: item.resourceId,
          title: item.title,
          unitPriceMinor: item.unitPriceMinor,
          quantity: item.quantity,
          totalMinor: item.totalMinor,
          metadata: item.metadata as never,
        })),
      },
    },
    select: { id: true, orderNumber: true, status: true },
  });

  if (pricing.subtotalMinor === 0) {
    await settleFreeOrder(order.id, buyer.userId, pricing.currency);
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "paid",
      totalMinor: 0,
      currency: pricing.currency,
      requiresPayment: false,
    };
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: "pending",
    totalMinor: pricing.subtotalMinor,
    currency: pricing.currency,
    requiresPayment: true,
  };
}

/** Commande gratuite : paiement « free » + droits immédiats. */
async function settleFreeOrder(orderId: string, userId: string, currency: string) {
  const existing = await prisma.paymentTransaction.findFirst({
    where: { orderId, provider: "free" },
    select: { id: true },
  });
  if (!existing) {
    await prisma.paymentTransaction.create({
      data: {
        orderId,
        userId,
        provider: "free",
        transactionRef: `PAY-${randomUUID()}`,
        amountUsd: 0,
        amountMinor: 0,
        currency,
        status: "Valide",
        confirmedAt: new Date(),
        gatewayResponse: { free: true } as never,
      },
    });
  }
  await markOrderPaid(orderId, { provider: "free" });
}

/** Passe la commande à « Paye » (une seule fois) puis accorde les droits. */
export async function markOrderPaid(
  orderId: string,
  options: { paymentId?: string; provider?: string; eventId?: string } = {}
) {
  const order = await prisma.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    throw new PaymentError(404, "ORDER_NOT_FOUND", "Commande introuvable.");
  }
  if (!order.buyerUserId) {
    throw new PaymentError(409, "ORDER_WITHOUT_USER", "Commande sans compte membre.");
  }
  if (order.status === "Annule" || order.status === "Rembourse") {
    throw new PaymentError(409, "ORDER_CLOSED", "Cette commande est clôturée.");
  }

  await prisma.$transaction(async (tx) => {
    let transitioned = order.status === "Paye";

    if (order.status !== "Paye") {
      const updated = await tx.marketplaceOrder.updateMany({
        where: { id: orderId, status: "En_attente_API" },
        data: {
          status: "Paye",
          paidAt: new Date(),
          paymentGateway: options.provider || order.paymentGateway,
        },
      });

      if (updated.count === 1) {
        transitioned = true;
        for (const item of order.items) {
          if (item.itemType !== "product" || !item.resourceId) continue;
          await tx.product
            .update({
              where: { id: item.resourceId },
              data: { salesCount: { increment: item.quantity } },
            })
            .catch(() => null);
          const storeId = String((item.metadata as { storeId?: string })?.storeId || "");
          if (storeId) {
            await tx.store
              .update({
                where: { id: storeId },
                data: {
                  salesCount: { increment: 1 },
                  totalRevenueUsd: { increment: fromMinorUnits(item.totalMinor, order.currency) },
                },
              })
              .catch(() => null);
          }
        }
      } else {
        const fresh = await tx.marketplaceOrder.findUnique({
          where: { id: orderId },
          select: { status: true },
        });
        if (fresh?.status !== "Paye") {
          throw new PaymentError(409, "ORDER_STATE", "La commande n'est pas dans un état payable.");
        }
        transitioned = true;
      }
    }

    // Droits accordés dans la MÊME transaction que la confirmation :
    // un paiement « Paye » ne peut plus exister sans ses entitlements.
    if (transitioned) {
      await grantOrderEntitlements(order.id, order.buyerUserId!, options.paymentId, order.items, tx);
    }
  });

  return prisma.marketplaceOrder.findUnique({ where: { id: orderId } });
}

/** Accorde les droits de chaque article (idempotent, transactionnel). */
async function grantOrderEntitlements(
  orderId: string,
  userId: string,
  paymentId: string | undefined,
  items: Array<{
    itemType: string;
    resourceId: string | null;
    title: string;
    totalMinor: number;
    quantity: number;
    metadata: unknown;
  }>,
  db: EntitlementDb
) {
  for (const item of items) {
    const metadata = (item.metadata || {}) as Record<string, unknown>;

    // Frais d'ouverture d'un centre : activation du centre, pas un simple droit.
    if (item.itemType === "feature" && metadata.planCode === "center_fee") {
      const centerId = String(metadata.centerId || "");
      if (!UUID_PATTERN.test(centerId)) continue;
      const alreadyGranted = await db.entitlement.findFirst({
        where: { orderId, resourceType: "feature", resourceId: `center_fee:${centerId}` },
        select: { id: true },
      });
      await grantEntitlement(
        {
          userId,
          resourceType: "feature",
          resourceId: `center_fee:${centerId}`,
          source: "order",
          orderId,
          paymentId: paymentId || null,
          metadata: { ...metadata, centerId },
        },
        db
      );
      if (!alreadyGranted) {
        await db.trainingCenter
          .update({
            where: { id: centerId },
            data: { feePaid: true, status: "active" },
          })
          .catch(() => null);
      }
      continue;
    }

    if (
      item.itemType === "course" ||
      item.itemType === "product" ||
      item.itemType === "service" ||
      item.itemType === "feature"
    ) {
      if (!item.resourceId) continue;
      await grantEntitlement(
        {
          userId,
          resourceType: item.itemType,
          resourceId: item.resourceId,
          source: "order",
          orderId,
          paymentId: paymentId || null,
          metadata,
        },
        db
      );
      continue;
    }

    if (item.itemType === "storage") {
      const centerId = String(metadata.centerId || "");
      if (!centerId) continue;
      const resourceId = `center:${centerId}`;

      const alreadyGranted = await db.entitlement.findFirst({
        where: { orderId, resourceType: "storage", resourceId },
        select: { id: true },
      });

      await grantEntitlement(
        {
          userId,
          resourceType: "storage",
          resourceId,
          source: "order",
          orderId,
          paymentId: paymentId || null,
          metadata: { ...metadata, centerId },
        },
        db
      );

      if (!alreadyGranted) {
        const gb = Number(metadata.gb || 0);
        if (gb > 0) {
          await db.trainingCenter
            .update({
              where: { id: centerId },
              data: { storageQuotaGb: { increment: gb } },
            })
            .catch(() => null);
        }
        await db.instructorStoragePurchase
          .create({
            data: {
              instructorId: userId,
              centerId,
              amountGb: gb,
              amountUsd: fromMinorUnits(item.totalMinor, "USD"),
              status: "Paye",
            } as never,
          })
          .catch(() => null);
      }
      continue;
    }

    if (item.itemType === "subscription") {
      await activateSubscriptionForOrder(orderId, paymentId, db);
    }
  }
}

/** Échec de paiement : la commande ne donne aucun droit. */
export async function markOrderFailed(orderId: string) {
  await prisma.marketplaceOrder.updateMany({
    where: { id: orderId, status: "En_attente_API" },
    data: { status: "Echoue" },
  });
}

/** Annulation d'une commande encore en attente (par son acheteur). */
export async function cancelPendingOrder(orderId: string, userId: string) {
  const order = await prisma.marketplaceOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new PaymentError(404, "ORDER_NOT_FOUND", "Commande introuvable.");
  if (order.buyerUserId !== userId) {
    throw new PaymentError(403, "ORDER_FORBIDDEN", "Cette commande ne vous appartient pas.");
  }
  if (order.status !== "En_attente_API") {
    throw new PaymentError(409, "ORDER_STATE", "Cette commande ne peut plus être annulée.");
  }

  await prisma.marketplaceOrder.update({
    where: { id: orderId },
    data: { status: "Annule", cancelledAt: new Date() },
  });
  await prisma.paymentTransaction.updateMany({
    where: { orderId, status: "En_attente" },
    data: { status: "Echoue", failureReason: "Commande annulée par le client." },
  });
  return { success: true };
}

/** Détail d'une commande, réservé à son acheteur (ou à un admin). */
export async function getOrderForUser(
  orderId: string,
  viewer: { userId?: string; email?: string; isAdmin?: boolean }
) {
  const order = await prisma.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payments: {
        select: {
          id: true,
          provider: true,
          status: true,
          amountMinor: true,
          currency: true,
          checkoutUrl: true,
          confirmedAt: true,
          failureReason: true,
          createdAt: true,
        },
      },
      refunds: true,
      subscription: {
        select: { id: true, status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
      },
    },
  });
  if (!order) throw new PaymentError(404, "ORDER_NOT_FOUND", "Commande introuvable.");

  if (!viewer.isAdmin) {
    const email = String(viewer.email || "").toLowerCase();
    const owns =
      (!!viewer.userId && order.buyerUserId === viewer.userId) ||
      (!!email && String(order.buyerEmail || "").toLowerCase() === email);
    if (!owns) {
      throw new PaymentError(403, "ORDER_FORBIDDEN", "Cette commande ne vous appartient pas.");
    }
  }
  return order;
}



