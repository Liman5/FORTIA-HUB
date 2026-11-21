// ============================================================
// FORTIA HUB — GARDE D'ACCÈS À LA GESTION DES UTILISATEURS
// ============================================================

import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import {
  requireAdmin,
  unauthorizedResponse,
  forbiddenResponse,
  type AdminContext,
} from "@/lib/server/requireAdmin";
import { canManagePlatformUsers } from "@/lib/shared/adminRoles";

export type PlatformAdminGuard =
  | { admin: AdminContext; error: null }
  | { admin: null; error: Response };

/**
 * La gestion centralisée des utilisateurs contient des données personnelles :
 * elle est réservée aux administrateurs généraux / superadministrateurs.
 * Un membre authentifié reçoit 403 ; un anonyme reçoit 401.
 */
export async function requirePlatformAdmin(req: NextRequest): Promise<PlatformAdminGuard> {
  const admin = await requireAdmin(req).catch(() => null);
  if (!admin) {
    const user = await getCurrentUser(req).catch(() => null);
    if (user) {
      return {
        admin: null,
        error: forbiddenResponse("Vos droits ne permettent pas de gérer les comptes utilisateurs."),
      };
    }
    return { admin: null, error: unauthorizedResponse("Accès réservé à l'administration.") };
  }
  if (!canManagePlatformUsers(admin.role)) {
    return {
      admin: null,
      error: forbiddenResponse(
        "Vos droits ne permettent pas de gérer les comptes utilisateurs."
      ),
    };
  }
  return { admin, error: null };
}
