// ============================================================
// FORTIA HUB — SLUGS DE LIBELLÉS (fonction pure)
// ------------------------------------------------------------
// Utilisé par les catégories (formations et produits) ainsi que par le
// sélecteur de catégorie. Aucune dépendance React : ce module est
// importable côté serveur comme dans les tests unitaires.
// ============================================================

/** Identifiant stable et lisible dérivé d'un libellé (« IA & Data » → « ia-data »). */
export function slugifyLabel(label: string): string {
  return (
    String(label || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "autre"
  );
}
