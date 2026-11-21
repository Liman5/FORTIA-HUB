// ============================================================
// FORTIA HUB — ADAPTATEUR FLUTTERWAVE (Phase 2/6)
// Variables : FLUTTERWAVE_SECRET_KEY, FLUTTERWAVE_WEBHOOK_SECRET
// ============================================================

import { timingSafeEqual } from "node:crypto";
import { fromMinorUnits, toMinorUnits } from "../money";
import {
  PaymentError,
  type CreateCheckoutInput,
  type CreateCheckoutResult,
  type ParsedProviderEvent,
  type PaymentProvider,
  type ProviderRefundInput,
  type ProviderRefundResult,
} from "../types";

const API = "https://api.flutterwave.com/v3";

function secret(): string {
  return String(process.env.FLUTTERWAVE_SECRET_KEY || "").trim();
}
function webhookSecret(): string {
  return String(process.env.FLUTTERWAVE_WEBHOOK_SECRET || "").trim();
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

export const flutterwaveProvider: PaymentProvider = {
  code: "flutterwave",
  label: "Flutterwave (Afrique)",

  isConfigured(): boolean {
    return !!secret() && !!webhookSecret();
  },

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    if (!this.isConfigured()) {
      throw new PaymentError(503, "PROVIDER_NOT_CONFIGURED", "Flutterwave n'est pas configuré.");
    }
    const response = await fetch(`${API}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: input.paymentId,
        amount: fromMinorUnits(input.amountMinor, input.currency),
        currency: input.currency,
        redirect_url: input.successUrl,
        customer: { email: input.customerEmail },
        customizations: { title: "FORTIA HUB", description: input.description },
        meta: {
          paymentId: input.paymentId,
          orderId: input.orderId,
          orderNumber: input.orderNumber,
        },
      }),
    }).catch(() => null);
    const json: any = response ? await response.json().catch(() => null) : null;
    if (!response?.ok || !json?.data?.link) {
      throw new PaymentError(502, "PROVIDER_ERROR", "Flutterwave a refusé l'initialisation.");
    }
    return {
      providerRef: input.paymentId,
      checkoutUrl: String(json.data.link),
      raw: { tx_ref: input.paymentId, status: json.status },
    };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<ParsedProviderEvent> {
    if (!this.isConfigured()) {
      throw new PaymentError(503, "PROVIDER_NOT_CONFIGURED", "Webhook Flutterwave non configuré.");
    }
    const hash = headers.get("verif-hash") || "";
    if (!hash || !equal(webhookSecret(), hash)) {
      throw new PaymentError(400, "INVALID_SIGNATURE", "Signature Flutterwave invalide.");
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      throw new PaymentError(400, "INVALID_PAYLOAD", "Événement Flutterwave illisible.");
    }
    const data = event?.data || {};
    const transactionId = String(data.id || "");
    const txRef = String(data.tx_ref || "");
    const eventId = `${String(event?.event || "event")}:${transactionId || txRef}`;
    const metadata = (data.meta || {}) as Record<string, unknown>;
    const paymentId =
      typeof metadata.paymentId === "string" ? metadata.paymentId : txRef || undefined;

    if (String(event?.event || "") === "charge.completed") {
      if (String(data.status || "").toLowerCase() !== "successful") {
        return {
          eventId,
          type: "payment_failed",
          providerRef: txRef,
          paymentId,
          metadata,
          raw: event,
        };
      }
      const verified = await fetch(
        `${API}/transactions/${encodeURIComponent(transactionId)}/verify`,
        { headers: { Authorization: `Bearer ${secret()}` } }
      ).catch(() => null);
      const verifiedJson: any = verified ? await verified.json().catch(() => null) : null;
      const verifiedData = verifiedJson?.data;
      if (!verified?.ok || !verifiedData || verifiedData.status !== "successful") {
        throw new PaymentError(502, "PROVIDER_VERIFY_FAILED", "Transaction Flutterwave non vérifiée.");
      }
      return {
        eventId,
        type: "payment_succeeded",
        providerRef: String(verifiedData.tx_ref || txRef),
        paymentId,
        amountMinor: toMinorUnits(verifiedData.amount, verifiedData.currency),
        currency: String(verifiedData.currency || "").toUpperCase() || undefined,
        metadata: { ...metadata, transactionId },
        raw: event,
      };
    }

    return { eventId, type: "ignored", providerRef: txRef, paymentId, metadata, raw: event };
  },

  async refund(input: ProviderRefundInput): Promise<ProviderRefundResult> {
    if (!this.isConfigured()) {
      throw new PaymentError(503, "PROVIDER_NOT_CONFIGURED", "Flutterwave n'est pas configuré.");
    }
    const lookup = await fetch(
      `${API}/transactions?tx_ref=${encodeURIComponent(input.providerRef)}`,
      { headers: { Authorization: `Bearer ${secret()}` } }
    ).catch(() => null);
    const lookupJson: any = lookup ? await lookup.json().catch(() => null) : null;
    const transactionId = lookupJson?.data?.[0]?.id;
    if (!lookup?.ok || !transactionId) {
      throw new PaymentError(404, "TRANSACTION_NOT_FOUND", "Transaction Flutterwave introuvable.");
    }
    const response = await fetch(`${API}/transactions/${transactionId}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: fromMinorUnits(input.amountMinor, input.currency),
        comments: String(input.reason || "").slice(0, 200),
      }),
    }).catch(() => null);
    const json: any = response ? await response.json().catch(() => null) : null;
    if (!response?.ok || !json?.data) {
      throw new PaymentError(502, "PROVIDER_ERROR", "Flutterwave a refusé le remboursement.");
    }
    return {
      providerRef: String(json.data.id || transactionId),
      succeeded: true,
      raw: { id: json.data.id, status: json.data.status },
    };
  },
};

