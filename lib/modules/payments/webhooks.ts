// ============================================================
// FORTIA HUB — WEBHOOKS DE PAIEMENT (Phase 2)
// ------------------------------------------------------------
// • Signature vérifiée par l'adaptateur du fournisseur.
// • Événement enregistré avec contrainte unique (fournisseur + eventId).
// • Traitement idempotent : un webhook rejoué ne crée jamais de doublon.
// • Vérification du montant et de la devise avant confirmation.
// ============================================================

import { prisma } from "@/lib/prisma";
import { revokeEntitlementsByOrder, revokeEntitlementsByPayment } from "./entitlements";
import { sameAmount } from "./money";
import { markOrderFailed, markOrderPaid } from "./orders";
import { findPaymentByProviderRef, sanitizeGatewayPayload } from "./payments";
import { getPaymentProvider } from "./providers";
import { renewSubscription } from "./subscriptions";
import { PaymentError, type ParsedProviderEvent } from "./types";

export interface WebhookResult {
  status: number;
  body: {
    received: boolean;
    processed?: boolean;
    duplicate?: boolean;
    error?: string;
  };
}

/**
 * Point d'entrée d'un webhook. Lève une PaymentError si la signature ou
 * la cohérence de la transaction est invalide (aucune modification alors).
 */
export async function handlePaymentWebhook(
  providerCode: string,
  rawBody: string,
  headers: Headers
): Promise<WebhookResult> {
  const provider = getPaymentProvider(providerCode);
  if (!provider) {
    throw new PaymentError(404, "PROVIDER_UNKNOWN", "Fournisseur de paiement inconnu.");
  }
  if (!provider.isConfigured()) {
    throw new PaymentError(
      503,
      "PROVIDER_NOT_CONFIGURED",
      "Ce fournisseur n'est pas configuré sur le serveur."
    );
  }

  const event = await provider.verifyWebhook(rawBody, headers);

  // ---- Idempotence : un même événement n'est traité qu'une fois ----
  const record = await prisma.paymentWebhook.upsert({
    where: {
      gatewayCode_eventId: { gatewayCode: provider.code, eventId: event.eventId },
    },
    create: {
      gatewayCode: provider.code,
      eventId: event.eventId,
      eventType: event.type,
      payload: sanitizeGatewayPayload(event.raw) as never,
      processed: false,
    },
    update: { attempts: { increment: 1 } },
    select: { id: true, processed: true },
  });

  if (record.processed) {
    return { status: 200, body: { received: true, processed: true, duplicate: true } };
  }

  try {
    await processEvent(provider.code, event);
    await prisma.paymentWebhook.update({
      where: { id: record.id },
      data: { processed: true, processedAt: new Date(), processingError: "" },
    });
    return { status: 200, body: { received: true, processed: true } };
  } catch (error) {
    const message =
      error instanceof PaymentError ? error.message : "Erreur de traitement du webhook.";
    await prisma.paymentWebhook
      .update({
        where: { id: record.id },
        data: { processingError: message.slice(0, 500) },
      })
      .catch(() => null);

    if (error instanceof PaymentError) throw error;
    throw new PaymentError(500, "WEBHOOK_PROCESSING_FAILED", message);
  }
}

async function processEvent(providerCode: string, event: ParsedProviderEvent) {
  if (event.type === "ignored") return;

  if (event.type === "subscription_renewed") {
    if (!event.subscriptionId) {
      throw new PaymentError(400, "INVALID_PAYLOAD", "Renouvellement sans abonnement.");
    }
    await renewSubscription(event.subscriptionId, { providerRef: event.providerRef });
    return;
  }

  if (event.type === "refund_succeeded") {
    await processRefundEvent(event);
    return;
  }

  const payment = event.paymentId
    ? await prisma.paymentTransaction.findUnique({
        where: { id: event.paymentId },
        include: { order: true },
      })
    : await findPaymentByProviderRef(providerCode, event.providerRef);

  if (!payment) {
    throw new PaymentError(404, "PAYMENT_NOT_FOUND", "Paiement introuvable pour cet événement.");
  }
  if (payment.provider !== providerCode) {
    throw new PaymentError(409, "PROVIDER_MISMATCH", "Fournisseur incohérent.");
  }
  if (payment.status === "Valide" || payment.status === "Rembourse") {
    return;
  }
  if (payment.status !== "En_attente") {
    throw new PaymentError(409, "PAYMENT_STATE", "Paiement déjà terminé.");
  }
  if (!payment.order) {
    throw new PaymentError(404, "ORDER_NOT_FOUND", "Commande introuvable.");
  }

  if (event.type === "payment_failed") {
    await prisma.paymentTransaction.update({
      where: { id: payment.id },
      data: { status: "Echoue", failureReason: "Paiement refusé par le fournisseur." },
    });
    await markOrderFailed(payment.order.id);
    return;
  }

  // payment_succeeded : vérifier montant et devise AVANT toute écriture.
  if (event.amountMinor !== undefined) {
    const receivedCurrency = event.currency || payment.currency;
    if (!sameAmount(event.amountMinor, receivedCurrency, payment.amountMinor, payment.currency)) {
      throw new PaymentError(
        409,
        "AMOUNT_MISMATCH",
        "Le montant ou la devise reçus ne correspondent pas à la commande."
      );
    }
  }

  const existingResponse = (payment.gatewayResponse || {}) as Record<string, unknown>;
  const paymentIntent = String(
    (event.metadata as { paymentIntent?: string })?.paymentIntent || ""
  );

  const confirmed = await prisma.paymentTransaction.updateMany({
    where: { id: payment.id, status: "En_attente" },
    data: {
      status: "Valide",
      confirmedAt: new Date(),
      eventId: event.eventId,
      providerRef: payment.providerRef || event.providerRef,
      gatewayResponse: {
        ...existingResponse,
        ...(paymentIntent ? { paymentIntent } : {}),
      } as never,
    },
  });

  if (confirmed.count === 0) return;

  await markOrderPaid(payment.order.id, {
    paymentId: payment.id,
    provider: providerCode,
    eventId: event.eventId,
  });
}

async function processRefundEvent(event: ParsedProviderEvent) {
  const providerRef = String(event.providerRefundId || event.providerRef || "");
  const refund = providerRef
    ? await prisma.refund.findFirst({
        where: { providerRef },
        include: { payment: true },
      })
    : null;

  if (!refund) return;
  if (refund.status === "succeeded") return;

  await prisma.refund.update({
    where: { id: refund.id },
    data: { status: "succeeded", processedAt: new Date() },
  });

  if (!refund.paymentId || !refund.payment) return;

  const refunded = await prisma.refund.aggregate({
    where: { paymentId: refund.paymentId, status: "succeeded" },
    _sum: { amountMinor: true },
  });
  const totalRefunded = Number(refunded._sum.amountMinor || 0);

  if (totalRefunded >= refund.payment.amountMinor) {
    await prisma.paymentTransaction.update({
      where: { id: refund.paymentId },
      data: { status: "Rembourse" },
    });
    await prisma.marketplaceOrder.update({
      where: { id: refund.orderId },
      data: { status: "Rembourse" },
    });
    await revokeEntitlementsByPayment(refund.paymentId);
    await revokeEntitlementsByOrder(refund.orderId);
  }
}

