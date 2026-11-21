// ============================================================
// FORTIA HUB — REMBOURSEMENTS (Phase 2)
// ------------------------------------------------------------
// • Remboursement via l'adaptateur du fournisseur de paiement.
// • Traçabilité complète (table refunds), jamais de suppression.
// • Remboursement TOTAL : paiement/commande → Rembourse et droits révoqués.
// • Remboursement PARTIEL : historique conservé, droits maintenus (règle métier).
// ============================================================

import { prisma } from "@/lib/prisma";
import { revokeEntitlementsByOrder, revokeEntitlementsByPayment } from "./entitlements";
import { getPaymentProvider } from "./providers";
import { PaymentError } from "./types";

export interface RefundOrderInput {
  orderId: string;
  paymentId?: string;
  amountMinor?: number;
  reason: string;
  adminId: string;
}

export async function refundOrder(input: RefundOrderInput) {
  const order = await prisma.marketplaceOrder.findUnique({
    where: { id: input.orderId },
    include: { payments: true, refunds: true },
  });
  if (!order) {
    throw new PaymentError(404, "ORDER_NOT_FOUND", "Commande introuvable.");
  }
  if (order.status !== "Paye" && order.status !== "Rembourse") {
    throw new PaymentError(409, "ORDER_NOT_PAID", "Seule une commande payée peut être remboursée.");
  }

  const payment = input.paymentId
    ? order.payments.find((row) => row.id === input.paymentId)
    : order.payments.find((row) => row.status === "Valide") ||
      order.payments.find((row) => row.status === "Rembourse");

  if (!payment) {
    throw new PaymentError(404, "PAYMENT_NOT_FOUND", "Paiement introuvable pour cette commande.");
  }
  if (payment.status !== "Valide" && payment.status !== "Rembourse") {
    throw new PaymentError(409, "PAYMENT_NOT_REFUNDABLE", "Ce paiement n'est pas remboursable.");
  }

  const alreadyRefunded = order.refunds
    .filter((row) => row.status === "succeeded" && row.paymentId === payment.id)
    .reduce((sum, row) => sum + row.amountMinor, 0);
  const remaining = payment.amountMinor - alreadyRefunded;
  if (remaining <= 0) {
    throw new PaymentError(409, "ALREADY_REFUNDED", "Ce paiement a déjà été intégralement remboursé.");
  }

  const requested =
    input.amountMinor === undefined
      ? remaining
      : Math.floor(Number(input.amountMinor) || 0);
  if (requested <= 0) {
    throw new PaymentError(400, "INVALID_AMOUNT", "Montant de remboursement invalide.");
  }
  if (requested > remaining) {
    throw new PaymentError(409, "REFUND_TOO_LARGE", "Le montant dépasse le solde remboursable.");
  }

  const provider = getPaymentProvider(payment.provider);
  if (!provider?.refund) {
    throw new PaymentError(
      501,
      "REFUND_UNSUPPORTED",
      "Ce moyen de paiement ne permet pas le remboursement automatique."
    );
  }
  if (!provider.isConfigured()) {
    throw new PaymentError(
      503,
      "PROVIDER_NOT_CONFIGURED",
      "Le fournisseur de paiement n'est pas configuré sur le serveur."
    );
  }

  const gatewayResponse = (payment.gatewayResponse || {}) as { paymentIntent?: string };
  const refund = await prisma.refund.create({
    data: {
      orderId: order.id,
      paymentId: payment.id,
      amountMinor: requested,
      currency: payment.currency,
      reason: String(input.reason || "").slice(0, 500),
      status: "pending",
      provider: payment.provider,
      createdBy: input.adminId || null,
    },
  });

  try {
    const result = await provider.refund({
      providerRef: payment.providerRef || "",
      amountMinor: requested,
      currency: payment.currency,
      reason: input.reason,
      metadata: {
        paymentIntent: gatewayResponse.paymentIntent || "",
        orderId: order.id,
        paymentId: payment.id,
      },
    });

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: result.succeeded ? "succeeded" : "failed",
          providerRef: result.providerRef,
          processedAt: new Date(),
        },
      });

      if (result.succeeded && alreadyRefunded + requested >= payment.amountMinor) {
        // Remboursement TOTAL → révocation des droits liés à ce paiement,
        // dans la même transaction que la mise à jour financière.
        await tx.paymentTransaction.update({
          where: { id: payment.id },
          data: { status: "Rembourse" },
        });
        await tx.marketplaceOrder.update({
          where: { id: order.id },
          data: { status: "Rembourse" },
        });
        await revokeEntitlementsByPayment(payment.id, tx);
        await revokeEntitlementsByOrder(order.id, tx);
      }

      return row;
    });

    return updated;
  } catch (error) {
    await prisma.refund
      .update({
        where: { id: refund.id },
        data: { status: "failed", processedAt: new Date() },
      })
      .catch(() => null);
    if (error instanceof PaymentError) throw error;
    throw new PaymentError(502, "REFUND_FAILED", "Le remboursement a échoué.");
  }
}

export async function listRefunds(limit = 100) {
  return prisma.refund.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
    include: {
      order: { select: { orderNumber: true, buyerEmail: true, status: true } },
      payment: { select: { provider: true, status: true } },
    },
  });
}
