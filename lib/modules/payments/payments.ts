// ============================================================
// FORTIA HUB — ORCHESTRATION DES PAIEMENTS (Phase 2)
// ------------------------------------------------------------
// Une tentative de paiement est créée côté serveur, puis confiée à
// l'adaptateur du fournisseur. Le retour navigateur ne confirme RIEN.
// ============================================================

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { fromMinorUnits } from "./money";
import { getPaymentProvider } from "./providers";
import { PaymentError, type CreateCheckoutResult } from "./types";

const SENSITIVE_KEY = /secret|token|authorization|api[-_]?key|password/i;

/** Retire récursivement les champs sensibles d'une réponse fournisseur. */
export function sanitizeGatewayPayload(value: unknown, depth = 0): unknown {
  if (depth > 4) return null;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => sanitizeGatewayPayload(entry, depth + 1));
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key)) continue;
      output[key] = sanitizeGatewayPayload(entry, depth + 1);
    }
    return output;
  }
  if (typeof value === "function" || typeof value === "symbol") return null;
  return value;
}

export interface StartPaymentInput {
  orderId: string;
  userId: string;
  providerCode: string;
  successUrl: string;
  cancelUrl: string;
}

export interface StartPaymentResult {
  paymentId: string;
  provider: string;
  providerRef: string;
  checkoutUrl: string;
  status: "pending";
}

/**
 * Crée une tentative de paiement pour une commande en attente.
 * Le montant et la devise proviennent de la COMMANDE (calcul serveur).
 */
export async function startPayment(input: StartPaymentInput): Promise<StartPaymentResult> {
  const order = await prisma.marketplaceOrder.findUnique({
    where: { id: input.orderId },
    include: { items: true },
  });
  if (!order) {
    throw new PaymentError(404, "ORDER_NOT_FOUND", "Commande introuvable.");
  }
  if (order.buyerUserId !== input.userId) {
    throw new PaymentError(403, "ORDER_FORBIDDEN", "Cette commande ne vous appartient pas.");
  }
  if (order.status !== "En_attente_API") {
    throw new PaymentError(409, "ORDER_STATE", "Cette commande n'attend pas de paiement.");
  }
  if (order.totalMinor <= 0) {
    throw new PaymentError(409, "ORDER_FREE", "Cette commande ne nécessite aucun paiement.");
  }

  const provider = getPaymentProvider(input.providerCode);
  if (!provider) {
    throw new PaymentError(400, "PROVIDER_UNKNOWN", "Moyen de paiement inconnu.");
  }
  if (!provider.isConfigured()) {
    throw new PaymentError(
      503,
      "PROVIDER_NOT_CONFIGURED",
      "Ce moyen de paiement n'est pas disponible sur le serveur."
    );
  }

  const payment = await prisma.paymentTransaction.create({
    data: {
      orderId: order.id,
      userId: input.userId,
      provider: provider.code,
      transactionRef: `PAY-${randomUUID()}`,
      amountUsd: fromMinorUnits(order.totalMinor, order.currency),
      amountMinor: order.totalMinor,
      currency: order.currency,
      status: "En_attente",
      gatewayResponse: {} as never,
    },
  });

  const description =
    order.items.map((item) => item.title).join(", ").slice(0, 120) ||
    `Commande ${order.orderNumber}`;

  let result: CreateCheckoutResult;
  try {
    result = await provider.createCheckout({
      paymentId: payment.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountMinor: order.totalMinor,
      currency: order.currency,
      description,
      customerEmail: order.buyerEmail,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });
  } catch (error) {
    const message =
      error instanceof PaymentError ? error.message : "Initialisation du paiement impossible.";
    await prisma.paymentTransaction
      .update({
        where: { id: payment.id },
        data: { status: "Echoue", failureReason: message.slice(0, 300) },
      })
      .catch(() => null);
    if (error instanceof PaymentError) throw error;
    throw new PaymentError(502, "PROVIDER_ERROR", message);
  }

  const updated = await prisma.paymentTransaction.update({
    where: { id: payment.id },
    data: {
      providerRef: result.providerRef,
      checkoutUrl: result.checkoutUrl,
      gatewayResponse: sanitizeGatewayPayload(result.raw) as never,
    },
  });

  await prisma.marketplaceOrder.update({
    where: { id: order.id },
    data: { paymentGateway: provider.code, transactionRef: updated.transactionRef },
  });

  return {
    paymentId: updated.id,
    provider: provider.code,
    providerRef: result.providerRef,
    checkoutUrl: result.checkoutUrl,
    status: "pending",
  };
}

/** Retrouve une tentative par sa référence fournisseur (webhook). */
export async function findPaymentByProviderRef(provider: string, providerRef: string) {
  if (!provider || !providerRef) return null;
  return prisma.paymentTransaction.findFirst({
    where: { provider, providerRef },
    include: { order: { include: { items: true } } },
  });
}
