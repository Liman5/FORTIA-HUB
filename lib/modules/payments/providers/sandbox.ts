// ============================================================
// FORTIA HUB — FOURNISSEUR SANDBOX (TESTS UNIQUEMENT)
// ------------------------------------------------------------
// Ce fournisseur NE PRÉTEND JAMAIS encaisser un paiement réel.
// Il sert aux tests d'intégration du cycle complet :
//   checkout → webhook SIGNÉ (HMAC) → entitlement.
//
// Sécurité :
//   • désactivé par défaut ;
//   • exige PAYMENTS_SANDBOX_ENABLED=true ;
//   • refusé en production sauf PAYMENTS_SANDBOX_ALLOW_PROD=true ;
//   • webhook refusé sans signature HMAC valide (SANDBOX_WEBHOOK_SECRET).
// ============================================================

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  PaymentError,
  type CreateCheckoutInput,
  type CreateCheckoutResult,
  type ParsedProviderEvent,
  type PaymentProvider,
  type ProviderRefundInput,
  type ProviderRefundResult,
} from "../types";

function sandboxEnabled(): boolean {
  if (String(process.env.PAYMENTS_SANDBOX_ENABLED || "").toLowerCase() !== "true") {
    return false;
  }
  const isProduction = process.env.NODE_ENV === "production";
  return !isProduction || process.env.PAYMENTS_SANDBOX_ALLOW_PROD === "true";
}

function sandboxSecret(): string {
  return String(process.env.SANDBOX_WEBHOOK_SECRET || "");
}

function validSignature(rawBody: string, received: string): boolean {
  const secret = sandboxSecret();
  if (!secret || !received) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const EVENT_TYPES: Record<string, ParsedProviderEvent["type"]> = {
  "payment.succeeded": "payment_succeeded",
  "payment.failed": "payment_failed",
  "refund.succeeded": "refund_succeeded",
  "subscription.renewed": "subscription_renewed",
};

export const sandboxProvider: PaymentProvider = {
  code: "sandbox",
  label: "Sandbox (tests — aucun débit réel)",

  isConfigured(): boolean {
    return sandboxEnabled() && !!sandboxSecret();
  },

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    if (!this.isConfigured()) {
      throw new PaymentError(
        503,
        "PROVIDER_NOT_CONFIGURED",
        "Le fournisseur sandbox est désactivé sur ce serveur."
      );
    }
    // Aucune redirection : le paiement reste EN ATTENTE jusqu'au webhook signé.
    return {
      providerRef: `sbx_${randomUUID()}`,
      checkoutUrl: "",
      raw: {
        mode: "sandbox",
        paymentId: input.paymentId,
        orderId: input.orderId,
        amountMinor: input.amountMinor,
        currency: input.currency,
      },
    };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<ParsedProviderEvent> {
    if (!this.isConfigured()) {
      throw new PaymentError(
        503,
        "PROVIDER_NOT_CONFIGURED",
        "Webhook sandbox refusé : fournisseur désactivé."
      );
    }

    const signature = headers.get("x-sandbox-signature") || "";
    if (!validSignature(rawBody, signature)) {
      throw new PaymentError(400, "INVALID_SIGNATURE", "Signature sandbox invalide.");
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      throw new PaymentError(400, "INVALID_PAYLOAD", "Événement sandbox illisible.");
    }

    const eventId = String(event?.id || "");
    const eventType = String(event?.type || "");
    const mapped = EVENT_TYPES[eventType] || "ignored";
    if (!eventId) {
      throw new PaymentError(400, "INVALID_PAYLOAD", "Événement sandbox sans identifiant.");
    }

    return {
      eventId,
      type: mapped,
      providerRef: String(event?.providerRef || ""),
      amountMinor:
        event?.amountMinor === undefined ? undefined : Number(event.amountMinor) || 0,
      currency: event?.currency ? String(event.currency).toUpperCase() : undefined,
      paymentId: event?.paymentId ? String(event.paymentId) : undefined,
      subscriptionId: event?.subscriptionId ? String(event.subscriptionId) : undefined,
      providerRefundId: event?.refundRef ? String(event.refundRef) : undefined,
      metadata: (event?.metadata || {}) as Record<string, unknown>,
      raw: event,
    };
  },

  async refund(input: ProviderRefundInput): Promise<ProviderRefundResult> {
    if (!this.isConfigured()) {
      throw new PaymentError(
        503,
        "PROVIDER_NOT_CONFIGURED",
        "Fournisseur sandbox désactivé : remboursement impossible."
      );
    }
    return {
      providerRef: `sbx_rf_${randomUUID()}`,
      succeeded: true,
      raw: {
        mode: "sandbox",
        amountMinor: input.amountMinor,
        currency: input.currency,
      },
    };
  },
};
