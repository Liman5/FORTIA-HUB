// ============================================================
// FORTIA HUB — ADRESSE PUBLIQUE D'UNE BOUTIQUE
// ------------------------------------------------------------
// Le slug public (`/vendorstore/{slug}`) est dérivé du `slug` réel de la
// boutique, ou à défaut de son nom. Une seule implémentation, partagée
// par la marketplace, la page boutique et les rails d'accueil.
// ============================================================

export function getStoreSlug(store: { slug?: string; name?: string } | null | undefined): string {
  const base =
    (store?.slug && String(store.slug).trim()) || (store?.name && String(store.name).trim()) || "boutique";
  return (
    base
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "boutique"
  );
}

/** Lien public d'une boutique. */
export function storeHref(store: { slug?: string; name?: string } | null | undefined): string {
  return `/vendorstore/${encodeURIComponent(getStoreSlug(store))}`;
}
