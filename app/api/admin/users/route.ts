import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAdmin,
  isSuperAdminRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/server/requireAdmin";
import {
  checkNewAdminPassword,
  hashAdminPassword,
} from "@/lib/server/adminAccounts";
import { normalizeAdminRole } from "@/lib/server/adminRoles";

export const dynamic = "force-dynamic";

/**
 * /api/admin/users — GESTION DES COMPTES ADMINISTRATEURS
 * ------------------------------------------------------------
 * Réservé au SUPERADMINISTRATEUR (rôle `superadmin` / `super_admin`).
 *
 * RÈGLES MÉTIER :
 *   • le superadmin crée les autres administrateurs et leur DÉFINIT
 *     lui-même le mot de passe ;
 *   • chaque mot de passe est UNIQUE : impossible de réutiliser celui d'un
 *     autre compte administrateur ;
 *   • PERSONNE ne peut supprimer un superadmin (ni le désactiver/rétrograder).
 */

/** Vérifie l'appelant ET son rang de superadministrateur. */
async function requireSuperAdmin(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return { error: unauthorizedResponse(), admin: null };
  if (!isSuperAdminRole(admin.role)) {
    return {
      error: forbiddenResponse(
        "Seul un superadministrateur peut gérer les comptes administrateurs."
      ),
      admin: null,
    };
  }
  return { error: null, admin };
}

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

/** GET — liste des comptes administrateurs. */
export async function GET(req: NextRequest) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;

  const admins = await prisma.adminUser.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ success: true, admins });
}

/** POST — création d'un administrateur (mot de passe défini par le superadmin). */
export async function POST(req: NextRequest) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;

  const body = await req.json().catch(() => ({} as any));
  const email = normalizeEmail(body.email);
  const name = String(body.name || "").trim();
  const password = String(body.password || "");
  const role = normalizeAdminRole(body.role);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json(
      { error: "Le nom de l'administrateur est obligatoire." },
      { status: 400 }
    );
  }

  // Mot de passe : robustesse minimale + UNICITÉ entre comptes admin.
  const passwordCheck = await checkNewAdminPassword(password);
  if (!passwordCheck.ok) {
    return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Un compte administrateur utilise déjà cette adresse e-mail." },
      { status: 400 }
    );
  }

  const created = await prisma.adminUser.create({
    data: {
      email,
      name,
      role,
      passwordHash: await hashAdminPassword(password),
      isActive: true,
    },
    select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true },
  });

  return NextResponse.json({ success: true, admin: created });
}

/** PATCH — mise à jour (nom, rôle, activation, mot de passe) d'un compte. */
export async function PATCH(req: NextRequest) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;

  const body = await req.json().catch(() => ({} as any));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Identifiant requis." }, { status: 400 });

  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });

  const targetIsSuperAdmin = isSuperAdminRole(target.role);
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Le nom ne peut pas être vide." }, { status: 400 });
    data.name = name;
  }

  if (body.role !== undefined) {
    if (targetIsSuperAdmin) {
      return NextResponse.json(
        { error: "Un superadministrateur ne peut pas être rétrogradé." },
        { status: 403 }
      );
    }
    data.role = normalizeAdminRole(body.role);
  }

  if (body.isActive !== undefined) {
    if (targetIsSuperAdmin && body.isActive === false) {
      return NextResponse.json(
        { error: "Un superadministrateur ne peut pas être désactivé." },
        { status: 403 }
      );
    }
    data.isActive = !!body.isActive;
  }

  if (body.password !== undefined && String(body.password).length > 0) {
    const password = String(body.password);
    const passwordCheck = await checkNewAdminPassword(password, id);
    if (!passwordCheck.ok) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }
    data.passwordHash = await hashAdminPassword(password);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Aucune modification fournie." }, { status: 400 });
  }

  const updated = await prisma.adminUser.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true },
  });

  return NextResponse.json({ success: true, admin: updated });
}

/** DELETE — suppression d'un administrateur (JAMAIS un superadmin). */
export async function DELETE(req: NextRequest) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;

  const id = String(req.nextUrl.searchParams.get("id") || "");
  if (!id) return NextResponse.json({ error: "Identifiant requis." }, { status: 400 });

  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });

  // RÈGLE ABSOLUE : personne ne peut supprimer un superadministrateur.
  if (isSuperAdminRole(target.role)) {
    return NextResponse.json(
      { error: "Personne ne peut supprimer un superadministrateur." },
      { status: 403 }
    );
  }

  if (guard.admin && guard.admin.id === target.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte." },
      { status: 403 }
    );
  }

  await prisma.session.deleteMany({ where: { adminUserId: id } });
  await prisma.adminUser.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
