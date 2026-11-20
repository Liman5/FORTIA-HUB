// ============================================================
// FORTIA HUB — VUE PUBLIQUE D'UN PRODUIT (marketplace)
// ------------------------------------------------------------
// Les URL de livrables et les notes internes de modération ne
// sortent que vers le vendeur propriétaire ou un administrateur.
// ============================================================

export interface ProductViewer {
  viewerId?: string | null;
  isAdmin?: boolean;
}

export function toPublicProducts(
  products: Array<Record<string, any>>,
  viewer: ProductViewer
): Array<Record<string, any>> {
  return (products || []).map((product) => {
    if (!product || typeof product !== "object") return product;
    const canManage =
      !!viewer.isAdmin || (!!viewer.viewerId && product.vendorId === viewer.viewerId);
    if (canManage) return product;

    const {
      downloadUrl,
      moderationReason,
      moderationAt,
      fundsFrozen,
      appealMessage,
      ...safe
    } = product;
    return safe;
  });
}
