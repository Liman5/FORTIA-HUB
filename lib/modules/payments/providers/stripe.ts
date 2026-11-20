// ============================================================
// FORTIA HUB — ADAPTATEUR STRIPE (Phase 2)
// ------------------------------------------------------------
// Intégration réelle via l'API REST Stripe (aucun SDK requis).
// • Création d'une session Checkout (redirection hébergée par Stripe).
// • Vérification cryptographique du webhook (Stripe-Signature).
// • Remboursement via l'API Refunds.
//
// Variables d'environnement :
//   STRIPE_SECRET_KEY        (sk_live_… / sk_test_…)
//   STRIPE_WEBHOOK_SECRET    (whsec_…)
// Sans ces clés, l'adaptateur est « non configuré » : aucun paiement.
// ============================================================

import { createHmac, timingSafeEqual } from "node:crypto";
import {
  PaymentError,
  type CreateCheckoutInput,
  type CreateCheckoutResult,
  type ParsedProviderEvent,
  type PaymentProvider,
  type ProviderRefundInput,
  type ProviderRefundResult,
} from "../types";

const STRIPE_API = "https://api.stripe.com/v1";
const SIGNATURE_TOLERANCE_SECONDS = 300;

function secretKey(): string {
  return String(process.env.STRIPE_SECRET_KEY || "").trim();
}

function webhookSecret(): string {
  return String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
}

function safeEqualHex(expected: string, received: string): boolean {
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(received, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function parseSignatureHeader(header: string): { timestamp: string; signatures: string[] } {
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }
  return { timestamp, signatures };
}

export const stripeProvider: PaymentProvider = {
  code: "stripe",
  label: "Carte bancaire (Stripe)",

  isConfigured(): boolean {
    return !!secretKey() && !!webhookSecret();
  },

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    if (!this.isConfigured()) {
      throw new PaymentError(
        503,
        "PROVIDER_NOT_CONFIGURED",
        "Stripe n'est pas configuré sur le serveur (clés manquantes)."
      );
    }

    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", input.successUrl);
    body.set("cancel_url", input.cancelUrl);
    body.set("client_reference_id", input.paymentId);
    body.set("customer_email", input.customerEmail);
    body.set("line_items[0][quantity]", "1");
    body.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
    body.set("line_items[0][price_data][unit_amount]", String(input.amountMinor));
    body.set(
      "line_items[0][price_data][product_data][name]",
      String(input.description || "Commande FORTIA HUB").slice(0, 120)
    );
    body.set("metadata[paymentId]", input.paymentId);
    body.set("metadata[orderId]", input.orderId);
    body.set("metadata[orderNumber]", input.orderNumber);

    let response: Response;
    try {
      response = await fetch(`${STRIPE_API}/checkout/sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey()}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Stripe-Version": "2024-06-20",
        },
        body,
      });
    } catch {
      throw new PaymentError(
        502,
        "PROVIDER_UNREACHABLE",
        "Impossible de joindre Stripe. Réessayez plus tard."
      );
    }

    const json: any = await response.json().catch(() => null);
    if (!response.ok || !json?.id || !json?.url) {
      throw new PaymentError(
        502,
        "PROVIDER_ERROR",
        "Stripe a refusé la création du paiement. Vérifiez la configuration."
      );
    }

    return {
      providerRef: String(json.id),
      checkoutUrl: String(json.url),
      raw: {
        id: json.id,
        status: json.status,
        amount_total: json.amount_total,
        currency: json.currency,
        mode: json.mode,
      },
    };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<ParsedProviderEvent> {
    if (!this.isConfigured()) {
      throw new PaymentError(
        503,
        "PROVIDER_NOT_CONFIGURED",
        "Webhook Stripe refusé : intégration non configurée."
      );
    }

    const header = headers.get("stripe-signature") || "";
    const { timestamp, signatures } = parseSignatureHeader(header);
    if (!timestamp || signatures.length === 0) {
      throw new PaymentError(400, "INVALID_SIGNATURE", "Signature Stripe absente.");
    }

    const timestampSeconds = Number(timestamp);
    if (
      !Number.isFinite(timestampSeconds) ||
      Math.abs(Date.now() / 1000 - timestampSeconds) > SIGNATURE_TOLERANCE_SECONDS
    ) {
      throw new PaymentError(400, "INVALID_SIGNATURE", "Signature Stripe expirée.");
    }

    const expected = createHmac("sha256", webhookSecret())
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    if (!signatures.some((signature) => safeEqualHex(expected, signature))) {
      throw new PaymentError(400, "INVALID_SIGNATURE", "Signature Stripe invalide.");
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      throw new PaymentError(400, "INVALID_PAYLOAD", "Événement Stripe illisible.");
    }

    const eventId = String(event?.id || "");
    if (!eventId) {
      throw new PaymentError(400, "INVALID_PAYLOAD", "Événement Stripe sans identifiant.");
    }

    const type = String(event?.type || "");
    const object = event?.data?.object || {};
    const metadata = (object.metadata || {}) as Record<string, unknown>;

    if (type === "checkout.session.completed" || type === "checkout.session.async_payment_succeeded") {
      return {
        eventId,
        type: "payment_succeeded",
        providerRef: String(object.id || ""),
        amountMinor: Number(object.amount_total ?? 0) || undefined,
        currency: String(object.currency || "").toUpperCase() || undefined,
        paymentId: typeof metadata.paymentId === "string" ? metadata.paymentId : undefined,
        metadata: {
          paymentIntent: object.payment_intent || "",
          orderId: metadata.orderId || "",
          orderNumber: metadata.orderNumber || "",
        },
        raw: event,
      };
    }

    if (type === "checkout.session.expired" || type === "checkout.session.async_payment_failed") {
      return {
        eventId,
        type: "payment_failed",
        providerRef: String(object.id || ""),
        paymentId: typeof metadata.paymentId === "string" ? metadata.paymentId : undefined,
        raw: event,
      };
    }

    return {
      eventId,
      type: "ignored",
      providerRef: String(object.id || ""),
      raw: event,
    };
  },

  async refund(input: ProviderRefundInput): Promise<ProviderRefundResult> {
    if (!this.isConfigured()) {
      throw new PaymentError(
        503,
        "PROVIDER_NOT_CONFIGURED",
        "Stripe n'est pas configuré : remboursement impossible."
      );
    }

    const paymentIntent = String(input.metadata?.paymentIntent || "");
    if (!paymentIntent) {
      throw new PaymentError(
        409,
        "REFUND_UNSUPPORTED",
        "Référence Stripe insuffisante pour rembourser cette transaction."
      );
    }

    const body = new URLSearchParams();
    body.set("payment_intent", paymentIntent);
    body.set("amount", String(input.amountMinor));
    body.set("reason", "requested_by_customer");
    body.set("metadata[reason]", String(input.reason || "").slice(0, 200));

    let response: Response;
    try {
      response = await fetch(`${STRIPE_API}/refunds`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey()}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
    } catch {
      throw new PaymentError(502, "PROVIDER_UNREACHABLE", "Stripe est injoignable.");
    }

    const json: any = await response.json().catch(() => null);
    if (!response.ok || !json?.id) {
      throw new PaymentError(502, "PROVIDER_ERROR", "Stripe a refusé le remboursement.");
    }

    return {
      providerRef: String(json.id),
      succeeded: json.status === "succeeded" || json.status === "pending",
      raw: { id: json.id, status: json.status, amount: json.amount },
    };
  },
};

