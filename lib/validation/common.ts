// ============================================================
// FORTIA HUB — SCHÉMAS DE VALIDATION PARTAGÉS (Phase 3)
// ------------------------------------------------------------
// Les schémas Zod valident la FORME des données. Ils ne remplacent
// jamais l'authentification, les permissions ni le contrôle de propriété.
// ============================================================

import { z } from "zod";
import { validationError, type AppErrorDetail } from "@/lib/server/errors";

export const uuidSchema = z.string().uuid("Identifiant invalide.");
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Adresse e-mail invalide.")
  .max(254);

// ============================================================
// Helpers de format partagés (Phase 6)
// ------------------------------------------------------------
// Utilisés par les handlers d'écriture et les modules métier :
// une seule définition d'UUID / e-mail pour tout le projet.
// ============================================================

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Identifiant sûr : null si la valeur n'est pas un UUID. */
export function uuidOrNull(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw && UUID_PATTERN.test(raw) ? raw : null;
}

export const phoneSchema = z.string().trim().max(30).optional();
export const shortText = (min: number, max: number) => z.string().trim().min(min).max(max);
export const optionalShortText = (max: number) => z.string().trim().max(max).optional();
export const moneyAmountSchema = z
  .number()
  .finite()
  .min(0, "Le montant ne peut pas être négatif.")
  .max(10_000_000);

/** Valide une entrée ou lève une `AppError` 400 avec les chemins fautifs. */
export function parseOrThrow<S extends z.ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data as z.infer<S>;

  const details: AppErrorDetail[] = result.error.issues.map((issue) => ({
    path: issue.path.join(".") || "body",
    message: issue.message,
  }));
  throw validationError(details);
}

/** Query string → objet simple. */
export function queryObject(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}
