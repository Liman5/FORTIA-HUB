// ============================================================
// FORTIA HUB — IDENTITÉ D'UNE FORMATION (règles pures)
// ------------------------------------------------------------
// Slug et niveau normalisés. Aucune dépendance base de données :
// ces règles sont testables unitairement.
// ============================================================

/** Slug lisible (sans accents ni caractères spéciaux). */
export function slugifyCourseTitle(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Niveaux acceptés par l'enum PostgreSQL `course_level`. */
export const COURSE_LEVELS = new Set([
  "Debutant",
  "Intermediaire",
  "Avance",
  "Expert",
  "Tous_niveaux",
]);

/** Normalise un niveau saisi librement vers une valeur de l'enum SQL. */
export function normalizeCourseLevel(raw: unknown): string {
  const normalized = String(raw || "Tous_niveaux")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  return COURSE_LEVELS.has(normalized) ? normalized : "Tous_niveaux";
}

/** Code de catégorie stable dérivé d'un libellé libre. */
export function normalizeCategoryCode(raw: unknown): string {
  const source = String(raw || "categorie");
  return (
    source
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `categorie-${Date.now().toString(36)}`
  );
}
