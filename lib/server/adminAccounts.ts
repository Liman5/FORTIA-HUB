import "server-only";

// ============================================================
// FORTIA HUB — RÈGLES DES COMPTES ADMINISTRATEURS
// ------------------------------------------------------------
// • Mot de passe : 8 caractères minimum, au moins une lettre et un chiffre.
// • UNICITÉ : un mot de passe ne peut pas être réutilisé par un autre
//   compte administrateur (comparaison bcrypt contre tous les hashes).
// • Un SUPERADMIN ne peut être ni supprimé, ni désactivé, ni rétrogradé
//   (« personne ne peut supprimer un superadmin »).
// ============================================================
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isSuperAdminRole } from "@/lib/server/requireAdmin";

export const ADMIN_PASSWORD_MIN_LENGTH = 8;

/** Valide la robustesse minimale d'un mot de passe admin. */
export function validateAdminPassword(password: string): string | null {
  if (!password || password.length < ADMIN_PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${ADMIN_PASSWORD_MIN_LENGTH} caractères.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  }
  return null;
}

/**
 * Le mot de passe est-il déjà utilisé par un AUTRE compte administrateur ?
 * Les hashes invalides (placeholders, longueur anormale) sont ignorés.
 */
export async function isPasswordUsedByAnotherAdmin(
  password: string,
  excludeAdminId?: string
): Promise<boolean> {
  const admins = await prisma.adminUser.findMany({
    select: { id: true, passwordHash: true },
  });

  for (const admin of admins) {
    if (excludeAdminId && admin.id === excludeAdminId) continue;
    const hash = String(admin.passwordHash || "");
    if (hash.length < 20) continue; // hash factice → non comparable
    try {
      if (await bcrypt.compare(password, hash)) return true;
    } catch {
      // hash illisible → ignoré
    }
  }
  return false;
}

/** Vérifie toutes les règles d'un nouveau mot de passe admin. */
export async function checkNewAdminPassword(
  password: string,
  excludeAdminId?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const weak = validateAdminPassword(password);
  if (weak) return { ok: false, error: weak };

  if (await isPasswordUsedByAnotherAdmin(password, excludeAdminId)) {
    return {
      ok: false,
      error:
        "Ce mot de passe est déjà utilisé par un autre compte administrateur. Chaque compte doit avoir un mot de passe unique.",
    };
  }
  return { ok: true };
}

/** Hash bcrypt d'un mot de passe admin. */
export function hashAdminPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export { isSuperAdminRole };
