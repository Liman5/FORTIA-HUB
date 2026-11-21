// ============================================================
// FORTIA HUB — ADAPTATEUR PAYSTACK (Phase 2/6)
// ------------------------------------------------------------
// Intégration REST, sans SDK. Aucune clé = fournisseur non configuré.
// Variables : PAYSTACK_SECRET_KEY
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

const API = "https://api.paystack.co";

function secret(): string {
  return String(process.env.PAYSTACK_SECRET_KEY || "").trim();
}

function equal(expected: string, received: string): boolean {
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const paystackProvider: PaymentProvider = {
  code: "paystack",
  label: "Paystack (Afrique)",

  isConfigured(): boolean {
    return secret().startsWith("sk_");
  },

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    if (!this.isConfigured()) {
      throw new PaymentError(503, "PROVIDER_NOT_CONFIGURED", "Paystack n'est pas configuré.");
    }
    const response = await fetch(`${API}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.customerEmail,
        amount: input.amountMinor,
        currency: input.currency,
        reference: input.paymentId,
        callback_url: input.successUrl,
        metadata: {
          paymentId: input.paymentId,
          orderId: input.orderId,
          orderNumber: input.orderNumber,
        },
      }),
    }).catch(() => null);
    const json: any = response ? await response.json().catch(() => null) : null;
    if (!response?.ok || !json?.data?.authorization_url) {
      throw new PaymentError(502, "PROVIDER_ERROR", "Paystack a refusé l'initialisation.");
    }
    return {
      providerRef: String(json.data.reference || input.paymentId),
      checkoutUrl: String(json.data.authorization_url),
      raw: { reference: json.data.reference, status: json.data.status },
    };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<ParsedProviderEvent> {
    if (!this.isConfigured()) {
      throw new PaymentError(503, "PROVIDER_NOT_CONFIGURED", "Webhook Paystack non configuré.");
    }
    const signature = headers.get("x-paystack-signature") || "";
    const expected = createHmac("sha512", secret()).update(rawBody).digest("hex");
    if (!signature || !equal(expected, signature)) {
      throw new PaymentError(400, "INVALID_SIGNATURE", "Signature Paystack invalide.");
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      throw new PaymentError(400, "INVALID_PAYLOAD", "Événement Paystack illisible.");
    }
    const data = event?.data || {};
    const eventId = `${String(event?.event || "event")}:${String(data.id || data.reference || "")}`;
    const metadata = (data.metadata || {}) as Record<string, unknown>;
    const base = {
      eventId,
      providerRef: String(data.reference || ""),
      paymentId: typeof metadata.paymentId === "string" ? metadata.paymentId : undefined,
      amountMinor: Number(data.amount || 0) || undefined,
      currency: String(data.currency || "").toUpperCase() || undefined,
      metadata,
      raw: event,
    };

    if (event?.event === "charge.success" && data.status === "success") {
      return { ...base, type: "payment_succeeded" };
    }
    if (event?.event === "charge.failed" || data.status === "failed") {
      return { ...base, type: "payment_failed" };
    }
    return { ...base, type: "ignored" };
  },

  async refund(input: ProviderRefundInput): Promise<ProviderRefundResult> {
    if (!this.isConfigured()) {
      throw new PaymentError(503, "PROVIDER_NOT_CONFIGURED", "Paystack n'est pas configuré.");
    }
    const response = await fetch(`${API}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: input.providerRef,
        amount: input.amountMinor,
        merchant_note: String(input.reason || "").slice(0, 200),
      }),
    }).catch(() => null);
    const json: any = response ? await response.json().catch(() => null) : null;
    if (!response?.ok || !json?.data) {
      throw new PaymentError(502, "PROVIDER_ERROR", "Paystack a refusé le remboursement.");
    }
    return {
      providerRef: String(json.data.id || json.data.reference || ""),
      succeeded: true,
      raw: { id: json.data.id, status: json.data.status },
    };
  },
};
