// ============================================================
// FORTIA HUB — REGISTRE DES FOURNISSEURS DE PAIEMENT
// ============================================================

import type { PaymentProvider } from "../types";
import { stripeProvider } from "./stripe";
import { paystackProvider } from "./paystack";
import { flutterwaveProvider } from "./flutterwave";
import { sandboxProvider } from "./sandbox";

const PROVIDERS: PaymentProvider[] = [
  stripeProvider,
  paystackProvider,
  flutterwaveProvider,
  sandboxProvider,
];

export function getPaymentProvider(code: string): PaymentProvider | null {
  const normalized = String(code || "").trim().toLowerCase();
  return PROVIDERS.find((provider) => provider.code === normalized) || null;
}

export function listPaymentProviders(): Array<{
  code: string;
  label: string;
  configured: boolean;
}> {
  return PROVIDERS.map((provider) => ({
    code: provider.code,
    label: provider.label,
    configured: provider.isConfigured(),
  }));
}

/** Premier fournisseur réellement configuré (ordre de préférence). */
export function getDefaultProviderCode(): string | null {
  const configured = PROVIDERS.find((provider) => provider.isConfigured());
  return configured?.code ?? null;
}

export { stripeProvider, paystackProvider, flutterwaveProvider, sandboxProvider };
