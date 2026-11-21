// ============================================================
// FORTIA HUB — STATUTS DES UTILISATEURS (suspension / blocage)
// ============================================================

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminContext } from "@/lib/server/requireAdmin";
import { canDeleteAdministrator } from "@/lib/shared/adminRoles";
import { clearSessionCaches } from "@/lib/services/authSession";
import { PlatformUserError } from "./platformUsers";

export async function writeAdminAudit(
  db: Prisma.TransactionClient | typeof prisma,
  actor: AdminContext,
  action: string,
  target: { id: string; email: string },
  reason: string,
  metadata: Record<string, unknown> = {}
) {
  await db.adminAuditLog.create({
    data: {
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action,
      targetUserId: target.id,
      targetEmail: target.email,
      reason: reason.slice(0, 500),
      metadata: metadata as never,
    },
  });
}

/** Interdit l'auto-modération et protège les comptes administrateurs. */
export async function assertCanManageTarget(
  actor: AdminContext,
  target: { id: string; accountType: string }
) {
  if (target.id === actor.id) {
    throw new PlatformUserError(
      403,
      "SELF_ACTION_FORBIDDEN",
      "Vous ne pouvez pas appliquer cette action à votre propre compte."
    );
  }
  const isAdminTarget = ["admin", "superadmin", "super_admin"].includes(target.accountType);
  if (isAdminTarget && !canDeleteAdministrator(actor.role)) {
    throw new PlatformUserError(
      403,
      "ADMIN_TARGET_FORBIDDEN",
      "Seul un superadministrateur peut modifier un compte administrateur."
    );
  }
  if (isAdminTarget) {
    const otherAdmins = await prisma.user.count({
      where: {
        id: { not: target.id },
        accountType: { in: ["admin", "superadmin", "super_admin"] },
        isActive: true,
      },
    });
    if (otherAdmins === 0) {
      throw new PlatformUserError(
        409,
        "LAST_ADMIN",
        "Impossible de désactiver le dernier administrateur actif."
      );
    }
  }
}

export type PlatformUserAction = "suspend" | "block" | "reactivate";

export async function setPlatformUserStatus(input: {
  userId: string;
  action: PlatformUserAction;
  reason?: string;
  until?: string | null;
  actor: AdminContext;
}) {
  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      accountType: true,
      isActive: true,
      accountStatus: true,
    },
  });
  if (!target) throw new PlatformUserError(404, "USER_NOT_FOUND", "Utilisateur introuvable.");

  if (input.action === "reactivate") {
    if (target.accountStatus === "anonymized") {
      throw new PlatformUserError(409, "ANONYMIZED", "Ce compte a été anonymisé.");
    }
    return prisma.$transaction(async (tx) => {
      const row = await tx.user.update({
        where: { id: target.id },
        data: {
          isActive: true,
          accountStatus: "active",
          statusReason: "",
          suspendedUntil: null,
          statusUpdatedAt: new Date(),
        },
        select: { id: true, isActive: true, accountStatus: true },
      });
      await writeAdminAudit(tx, input.actor, "user.reactivate", target, input.reason || "", {
        previousStatus: target.accountStatus,
      });
      clearSessionCaches(undefined, target.id);
      return row;
    });
  }

  await assertCanManageTarget(input.actor, target);

  const until = input.until ? new Date(input.until) : null;
  if (until && (Number.isNaN(until.getTime()) || until.getTime() <= Date.now())) {
    throw new PlatformUserError(400, "INVALID_UNTIL", "La date de fin de suspension est invalide.");
  }
  const status = input.action === "suspend" ? "suspended" : "blocked";

  return prisma.$transaction(async (tx) => {
    const row = await tx.user.update({
      where: { id: target.id },
      data: {
        isActive: false,
        accountStatus: status,
        statusReason: String(input.reason || "").slice(0, 500),
        suspendedUntil: status === "suspended" ? until : null,
        statusUpdatedAt: new Date(),
      },
      select: { id: true, isActive: true, accountStatus: true, suspendedUntil: true },
    });
    // Révoque toutes les sessions : un navigateur ouvert ne contourne pas le blocage.
    await tx.session.deleteMany({ where: { userId: target.id } });
    await writeAdminAudit(tx, input.actor, `user.${input.action}`, target, input.reason || "", {
      previousStatus: target.accountStatus,
      until: until?.toISOString() || null,
    });
    clearSessionCaches(undefined, target.id);
    return row;
  });
}

export async function processExpiredSuspensions(now: Date = new Date()) {
  const result = await prisma.user.updateMany({
    where: { accountStatus: "suspended", suspendedUntil: { lte: now } },
    data: {
      isActive: true,
      accountStatus: "active",
      statusReason: "",
      suspendedUntil: null,
      statusUpdatedAt: now,
    },
  });
  return { reactivated: result.count };
}
