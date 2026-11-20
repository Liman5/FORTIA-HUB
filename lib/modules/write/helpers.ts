// ============================================================
// FORTIA HUB — HELPERS PARTAGÉS DES HANDLERS D'ÉCRITURE
// ============================================================

import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;
export const FROM_EMAIL =
  process.env.SENDER_EMAIL || "Fortia Hub <onboarding@resend.dev>";

/** Extrait la clé R2 d'une valeur stockée (clé brute ou URL publique). */
export function r2KeyFromValue(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return raw.replace(/^\/+/, "");
  try {
    const url = new URL(raw);
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return "";
  }
}

export async function resolveStoreRef(raw: unknown): Promise<{
  id: string;
  name: string;
  slug: string;
  vendorId?: string | null;
  logo?: string | null;
} | null> {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value || value === "undefined" || value === "null") return null;

  if (UUID_PATTERN.test(value)) {
    return prisma.store.findUnique({ where: { id: value } }).catch(() => null);
  }

  const bySlug = await prisma.store
    .findUnique({ where: { slug: value } })
    .catch(() => null);
  if (bySlug) return bySlug;

  return prisma.store.findFirst({ where: { name: value } }).catch(() => null);
}

/** Identifiant sûr : null si la valeur n'est pas un UUID. */
export function uuidOrNull(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw && UUID_PATTERN.test(raw) ? raw : null;
}

export function slugifyTitle(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function uniqueCourseSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugifyTitle(base) || `cours-${Date.now()}`;
  let candidate = root;
  let suffix = 2;
  while (suffix < 500) {
    const existing = await prisma.course
      .findUnique({ where: { slug: candidate }, select: { id: true } })
      .catch(() => null);
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }
  return `${root}-${Date.now()}`;
}

const COURSE_LEVELS = new Set([
  "Debutant",
  "Intermediaire",
  "Avance",
  "Expert",
  "Tous_niveaux",
]);

export function normalizeCourseLevel(raw: unknown): string {
  const normalized = String(raw || "Tous_niveaux")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  return COURSE_LEVELS.has(normalized) ? normalized : "Tous_niveaux";
}
