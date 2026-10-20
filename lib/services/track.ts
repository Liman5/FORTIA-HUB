// ============================================================
// FORTIA HUB — STATISTIQUES PRODUITS (côté navigateur)
// ------------------------------------------------------------
// Envoie un événement anonyme (vue, clic, ajout au panier) vers
// /api/track. Ne bloque jamais l'interface : toute erreur est ignorée.
// Une « vue » n'est comptée qu'une fois par session et par produit.
// ============================================================

export type TrackType = "view" | "click" | "add_to_cart";

const alreadySent = new Set<string>();

export function trackProductEvent(
  type: TrackType,
  productId?: string | null,
  storeId?: string | null
): void {
  if (typeof window === "undefined" || !productId) return;

  const key = `${type}:${productId}`;
  if (alreadySent.has(key)) return;
  alreadySent.add(key);

  const payload = JSON.stringify({ type, productId, storeId: storeId || undefined });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      return;
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // statistiques accessoires : jamais d'erreur visible
  }
}
