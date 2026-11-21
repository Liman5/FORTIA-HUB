"use client";

// ============================================================
// FORTIA HUB — CONTRAT FRONTEND DES PAIEMENTS
// ------------------------------------------------------------
// Toutes les pages/composants passent par ce client typé au lieu
// d'appeler /api/payments/* directement. Le contrat est stable et
// testable ; aucune clé ni logique serveur ne fuit ici.
// ============================================================

export type CheckoutItemType =
  | "course"
  | "product"
  | "subscription"
  | "storage"
  | "service"
  | "feature";

export interface CheckoutItem {
  type: CheckoutItemType;
  id?: string;
  planCode?: string;
  centerId?: string;
  quantity?: number;
}

export interface CheckoutRequest {
  items: CheckoutItem[];
  provider?: string;
  buyer?: { name?: string; email?: string; phone?: string };
}

export interface CheckoutResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  status?: "paid" | "pending";
  totalMinor?: number;
  currency?: string;
  provider?: string;
  paymentId?: string;
  requiresRedirect?: boolean;
  checkoutUrl?: string;
  message?: string;
  error?: string;
}

export interface PaymentProvidersResponse {
  success: boolean;
  available: string[];
  providers: Array<{ code: string; label: string; configured: boolean }>;
}

export const PAYMENT_PROVIDER_PREFERENCE = [
  "stripe",
  "paystack",
  "flutterwave",
  "sandbox",
] as const;

/** Premier fournisseur configuré selon l'ordre de préférence. */
export function pickPreferredProvider(available: string[]): string | undefined {
  return PAYMENT_PROVIDER_PREFERENCE.find((code) => available.includes(code)) || available[0];
}

async function readJson(response: Response): Promise<Record<string, any> | null> {
  return response.json().catch(() => null);
}

export async function fetchPaymentProviders(): Promise<PaymentProvidersResponse> {
  try {
    const response = await fetch("/api/payments/providers", { cache: "no-store" });
    const json = await readJson(response);
    const available = Array.isArray(json?.data?.available)
      ? (json.data.available as string[])
      : [];
    const providers = Array.isArray(json?.data?.providers) ? json.data.providers : [];
    return { success: response.ok, available, providers };
  } catch {
    return { success: false, available: [], providers: [] };
  }
}

export async function createCheckout(input: CheckoutRequest): Promise<CheckoutResponse> {
  try {
    const response = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await readJson(response);
    if (!response.ok || !json?.success) {
      return {
        success: false,
        error: String(json?.error || "Le paiement n'a pas pu être initialisé."),
      };
    }
    return { ...(json as CheckoutResponse), success: true };
  } catch {
    return { success: false, error: "Connexion impossible. Réessayez." };
  }
}

export interface PaymentStatusResult {
  success: boolean;
  status?: string;
  orderId?: string;
  error?: string;
}

export async function fetchPaymentStatus(orderId: string): Promise<PaymentStatusResult> {
  try {
    const response = await fetch(`/api/payments/status/${encodeURIComponent(orderId)}`, {
      cache: "no-store",
    });
    const json = await readJson(response);
    if (!response.ok || !json?.success) {
      return { success: false, error: String(json?.error || "Statut indisponible.") };
    }
    return {
      success: true,
      orderId,
      status: String(json?.data?.paymentStatus || json?.data?.status || "pending"),
    };
  } catch {
    return { success: false, error: "Statut indisponible." };
  }
}

export interface SignedUrlResult {
  ok: boolean;
  status: number;
  url?: string;
  error?: string;
}

/** URL signée temporaire d'un livrable privé (le serveur vérifie le droit). */
export async function requestSignedDownloadUrl(key: string): Promise<SignedUrlResult> {
  try {
    const response = await fetch("/api/storage/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const json = await readJson(response);
    if (!response.ok || !json?.url) {
      return {
        ok: false,
        status: response.status,
        error: String(json?.error || "Téléchargement indisponible."),
      };
    }
    return { ok: true, status: response.status, url: String(json.url) };
  } catch {
    return { ok: false, status: 0, error: "Connexion impossible." };
  }
}
