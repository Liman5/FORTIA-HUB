// ============================================================
// FORTIA HUB — API CLIENT ÉCRITURE
// Persiste les actions frontend dans Supabase via
// POST /api/platform/write (Prisma).
// ============================================================

type WriteAction =
  | "submit-quote"
  | "submit-kyc"
  | "approve-kyc"
  | "submit-vendor-app"
  | "approve-vendor-app"
  | "reject-vendor-app"
  | "submit-order"
  | "submit-support"
  | "mark-notification-read"
  | "create-course"
  | "update-course"
  | "create-product"
  | "update-product"
  | "register-free-purchase"
  | "submit-payout"
  | "approve-payout"
  | "create-training-center"
  | "pay-training-center-fee"
  | "submit-course-by-instructor"
  | "suspend-course"
  | "delete-course"
  | "register-instructor-purchase"
  | "admin-add-instructor"
  | "update-training-center-config"
  | "rate-course"
  | "create-service"
  | "update-service"
  | "delete-service"
  | "order-service"
  | "approve-kyc-full"
  | "update-freelance-profile"
  | "update-enterprise-profile"
  | "update-store"
  | "update-profile";

export interface WriteResult {
  success: boolean;
  id?: string;
  error?: string;
  // Notations de formation (action "rate-course")
  rating?: number;
  reviewsCount?: number;
  alreadyRated?: boolean;
  message?: string;
}

/**
 * Envoie une action d'écriture à Supabase (via /api/platform/write).
 * Retourne { success: false } silencieusement si le réseau/base échoue
 * (le store conserve alors son fallback local — aucune rupture).
 */
export async function apiWritePlatform(
  action: WriteAction,
  data: Record<string, unknown>
): Promise<WriteResult> {
  try {
    const res = await fetch("/api/platform/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || "Échec de l'écriture" };
    }
    return {
      success: true,
      id: json.id || json.storeId,
      rating: json.rating,
      reviewsCount: json.reviewsCount,
      alreadyRated: json.alreadyRated,
      message: json.message,
    };
  } catch (error: any) {
    console.warn("[Platform Write] Offline/erreur réseau:", error?.message);
    return { success: false };
  }
}