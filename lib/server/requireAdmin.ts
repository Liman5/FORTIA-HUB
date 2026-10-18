// ============================================================
// FORTIA HUB — Contrôle d'accès ADMINISTRATEUR (côté serveur)
// ------------------------------------------------------------
// Deux voies d'authentification admin sont acceptées :
//   1. Token de session admin  → en-tête `Authorization: Bearer <token>`
//      (créé par POST /api/admin/auth, table `sessions.admin_user_id`)
//   2. Utilisateur connecté dont le rôle (`users.account_type`) est `admin`
//      (session utilisateur `fh_session`, cookie HttpOnly)
//
// Cette vérification est FAITE CÔTÉ SERVEUR : le `isAdmin` du navigateur
// ne doit JAMAIS servir de preuve (il vaut `true` par défaut côté client).
// ============================================================
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/services/authSession";

export interface AdminContext {
  id: string;
  email: string;
  name: string;
  role: string;
  /** Origine de l'authentification (journalisation / diagnostic). */
  via: "admin_user" | "user_role";
}

/** Vérifie la validité d'un token de session admin transmis en Bearer. */
export async function getAdminFromToken(token: string): Promise<AdminContext | null> {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { adminUser: true },
  });

  if (!session || !session.adminUser || session.expiresAt < new Date()) return null;
  if (!session.adminUser.isActive) return null;

  return {
    id: session.adminUser.id,
    email: session.adminUser.email,
    name: session.adminUser.name,
    role: session.adminUser.role,
    via: "admin_user",
  };
}

/**
 * Rôles considérés comme ADMINISTRATEUR.
 * La comparaison est normalisée (casse, espaces, `_`, `-` ignorés) :
 *   admin · Admin · superadmin · super_admin · super-admin · super admin
 * sont donc TOUS acceptés — un compte `superadmin` n'est plus bloqué.
 */
export const ADMIN_ROLES = ["admin", "superadmin", "owner", "root"] as const;

export function normalizeRole(role?: unknown): string {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

export function isAdminRole(role?: unknown): boolean {
  const normalized = normalizeRole(role);
  return !!normalized && (ADMIN_ROLES as readonly string[]).includes(normalized);
}

/**
 * Rôle SUPERADMINISTRATEUR : seul ce rôle peut créer/modifier/supprimer des
 * comptes administrateurs. Un superadmin ne peut jamais être supprimé.
 */
export function isSuperAdminRole(role?: unknown): boolean {
  const normalized = normalizeRole(role);
  return normalized === "superadmin" || normalized === "owner" || normalized === "root";
}

/**
 * Retourne le contexte admin de la requête, ou `null` si l'appelant
 * n'est ni un administrateur authentifié, ni un utilisateur de rôle `admin`.
 */
export async function requireAdmin(req: NextRequest): Promise<AdminContext | null> {
  // 1) Token admin (Authorization: Bearer …)
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (bearer) {
    const admin = await getAdminFromToken(bearer);
    if (admin) return admin;
  }

  // 2) Utilisateur connecté avec un rôle d'administration (source de vérité : la base)
  const user = await getCurrentUser(req);
  if (user && isAdminRole(user.accountType)) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: String(user.accountType),
      via: "user_role",
    };
  }

  return null;
}

/** Réponse JSON normalisée pour un accès refusé. */
export function unauthorizedResponse(message = "Accès réservé à l'administration.") {
  return Response.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Droits insuffisants.") {
  return Response.json({ error: message }, { status: 403 });
}
