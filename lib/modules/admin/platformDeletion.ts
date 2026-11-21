// ============================================================
// FORTIA HUB — SUPPRESSION DIFFÉRÉE DES COMPTES (7 JOURS)
// ============================================================

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminContext } from "@/lib/server/requireAdmin";
import { clearSessionCaches } from "@/lib/services/authSession";
import { PlatformUserError } from "./platformUsers";
import { assertCanManageTarget, writeAdminAudit } from "./platformUserStatus";

export const DELETION_RETENTION_DAYS = 7;
const RETENTION_MS = DELETION_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export async function requestAccountDeletion(input: {
  userId: string;
  actor?: AdminContext | null;
  origin: "user" | "admin";
  reason?: string;
}) {
  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, accountType: true, accountStatus: true },
  });
  if (!target) throw new PlatformUserError(404, "USER_NOT_FOUND", "Utilisateur introuvable.");
  if (target.accountStatus === "anonymized") {
    throw new PlatformUserError(409, "ANONYMIZED", "Ce compte a déjà été anonymisé.");
  }
  if (input.actor) await assertCanManageTarget(input.actor, target);

  const existing = await prisma.pendingDeletion.findFirst({
    where: { userId: target.id, status: "pending" },
    orderBy: { requestedAt: "desc" },
  });
  if (existing) {
    return {
      id: existing.id,
      requestedAt: existing.requestedAt,
      deleteAt: existing.deleteAt,
      status: existing.status,
      alreadyRequested: true,
    };
  }

  const now = new Date();
  const deleteAt = new Date(now.getTime() + RETENTION_MS);
  const pending = await prisma.$transaction(async (tx) => {
    const created = await tx.pendingDeletion.create({
      data: {
        userId: target.id,
        email: target.email,
        requestedAt: now,
        deleteAt,
        origin: input.origin,
        reason: String(input.reason || "").slice(0, 500),
        status: "pending",
        adminId: input.actor?.id || null,
      },
    });
    await tx.user.update({
      where: { id: target.id },
      data: {
        deletionRequestedAt: now,
        deletionScheduledFor: deleteAt,
        accountStatus: "deletion_pending",
        statusUpdatedAt: now,
      },
    });
    if (input.actor) {
      await writeAdminAudit(tx, input.actor, "user.deletion_requested", target, input.reason || "", {
        origin: input.origin,
        deleteAt: deleteAt.toISOString(),
        requestId: created.id,
      });
    }
    return created;
  });

  return {
    id: pending.id,
    requestedAt: pending.requestedAt,
    deleteAt: pending.deleteAt,
    status: pending.status,
    alreadyRequested: false,
  };
}

export async function cancelAccountDeletion(input: {
  userId: string;
  requestId?: string;
  actor?: AdminContext | null;
  reason?: string;
}) {
  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, accountType: true, accountStatus: true },
  });
  if (!target) throw new PlatformUserError(404, "USER_NOT_FOUND", "Utilisateur introuvable.");

  const pending = await prisma.pendingDeletion.findFirst({
    where: {
      userId: target.id,
      status: "pending",
      ...(input.requestId ? { id: input.requestId } : {}),
    },
    orderBy: { requestedAt: "desc" },
  });
  if (!pending) {
    throw new PlatformUserError(404, "DELETION_NOT_FOUND", "Aucune suppression en attente.");
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const cancelled = await tx.pendingDeletion.updateMany({
      where: { id: pending.id, status: "pending" },
      data: { status: "cancelled", cancelledAt: now, processed: false },
    });
    if (cancelled.count === 0) {
      throw new PlatformUserError(409, "DELETION_ALREADY_PROCESSED", "Demande déjà traitée.");
    }
    await tx.user.update({
      where: { id: target.id },
      data: {
        deletionRequestedAt: null,
        deletionScheduledFor: null,
        accountStatus:
          target.accountStatus === "deletion_pending" ? "active" : target.accountStatus,
        statusUpdatedAt: now,
      },
    });
    if (input.actor) {
      await writeAdminAudit(tx, input.actor, "user.deletion_cancelled", target, input.reason || "", {
        requestId: pending.id,
      });
    }
  });

  return { cancelled: true, requestId: pending.id };
}

export async function listDeletionRequests(
  options: { status?: string; page?: number; limit?: number } = {}
) {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(Math.max(1, Number(options.limit) || 25), 100);
  const where: Prisma.PendingDeletionWhereInput = {};
  if (options.status && options.status !== "all") where.status = options.status;

  const [total, requests, pending, completed, cancelled] = await Promise.all([
    prisma.pendingDeletion.count({ where }),
    prisma.pendingDeletion.findMany({
      where,
      orderBy: [{ status: "asc" }, { deleteAt: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            accountType: true,
            accountStatus: true,
            kycStatus: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.pendingDeletion.count({ where: { status: "pending" } }),
    prisma.pendingDeletion.count({ where: { status: "completed" } }),
    prisma.pendingDeletion.count({ where: { status: "cancelled" } }),
  ]);

  return {
    requests,
    stats: { pending, completed, cancelled },
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      hasMore: page * limit < total,
    },
  };
}

async function anonymizeUser(userId: string, requestId: string): Promise<void> {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      await tx.pendingDeletion.updateMany({
        where: { id: requestId, status: "processing" },
        data: { status: "completed", processed: true, processedAt: now },
      });
      return;
    }

    await tx.session.deleteMany({ where: { userId } });
    await tx.pushSubscription.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });

    await tx.kycSubmission.updateMany({
      where: { applicantId: userId },
      data: {
        applicantId: null,
        applicantName: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        country: "",
        address: "",
        documentNumber: "",
        idRectoUrl: "",
        idVersoUrl: "",
        selfieUrl: "",
        companyName: "",
        legalForm: "",
        rccmNumber: "",
        companyDocUrl: "",
        documentFileUrl: "",
        adminNotes: "",
        rejectionReason: "",
        hiddenFields: "",
        lockCodeHash: "",
        lockedAt: null,
        lockBlockedUntil: null,
      },
    });

    await tx.freelanceProfile.deleteMany({ where: { userId } });
    await tx.enterpriseProfile.deleteMany({ where: { userId } });
    await tx.subscription.updateMany({
      where: { userId, status: { in: ["active", "past_due", "pending", "cancelled"] } },
      data: { status: "expired", cancelledAt: now },
    });
    await tx.entitlement.updateMany({
      where: { userId, status: { in: ["active", "suspended"] } },
      data: { status: "revoked", revokedAt: now },
    });

    const anonymizedEmail = `deleted+${user.id}@anonymized.invalid`;
    await tx.user.update({
      where: { id: user.id },
      data: {
        email: anonymizedEmail,
        passwordHash: "!",
        name: "Compte supprimé",
        phone: "",
        avatar: "",
        isActive: false,
        accountStatus: "anonymized",
        statusReason: "Compte supprimé après demande de suppression.",
        suspendedUntil: null,
        statusUpdatedAt: now,
        kycStatus: "rejete",
        enrolledCourseIds: [],
        purchasedProductIds: [],
        courseProgress: {} as never,
        earnedCertificates: [] as never,
        paymentHistory: [] as never,
        deletionRequestedAt: null,
        deletionScheduledFor: null,
      } as never,
    });

    await tx.pendingDeletion.updateMany({
      where: { id: requestId, status: "processing" },
      data: { status: "completed", processed: true, processedAt: now },
    });
    await tx.adminAuditLog.create({
      data: {
        actorId: "system",
        actorEmail: "system",
        actorRole: "system",
        action: "user.deletion_completed",
        targetUserId: user.id,
        targetEmail: anonymizedEmail,
        reason: "Suppression différée arrivée à échéance.",
        metadata: { requestId } as never,
      },
    });
  });
  clearSessionCaches(undefined, userId);
}

export async function processDueDeletions(now: Date = new Date()) {
  const due = await prisma.pendingDeletion.findMany({
    where: { status: "pending", deleteAt: { lte: now } },
    orderBy: { deleteAt: "asc" },
    take: 50,
    select: { id: true, userId: true },
  });

  let completed = 0;
  let failed = 0;
  for (const request of due) {
    const claimed = await prisma.pendingDeletion.updateMany({
      where: { id: request.id, status: "pending" },
      data: { status: "processing" },
    });
    if (claimed.count === 0) continue;
    try {
      await anonymizeUser(request.userId, request.id);
      completed += 1;
    } catch (error) {
      failed += 1;
      await prisma.pendingDeletion
        .update({
          where: { id: request.id },
          data: {
            status: "failed",
            processed: false,
            processedAt: new Date(),
            reason: `Échec: ${String((error as Error)?.message || error).slice(0, 300)}`,
          },
        })
        .catch(() => null);
    }
  }
  return { examined: due.length, completed, failed };
}

export async function processDeletionRequestNow(requestId: string) {
  const request = await prisma.pendingDeletion.findUnique({
    where: { id: requestId },
    select: { id: true, userId: true, status: true, deleteAt: true },
  });
  if (!request) throw new PlatformUserError(404, "DELETION_NOT_FOUND", "Demande introuvable.");
  if (request.status !== "pending" && request.status !== "failed") {
    throw new PlatformUserError(409, "DELETION_NOT_PENDING", "Cette demande n'est pas traitable.");
  }
  if (request.deleteAt.getTime() > Date.now()) {
    throw new PlatformUserError(
      409,
      "RETENTION_NOT_REACHED",
      "Le délai de rétention de sept jours n'est pas atteint."
    );
  }
  const claimed = await prisma.pendingDeletion.updateMany({
    where: { id: request.id, status: { in: ["pending", "failed"] } },
    data: { status: "processing" },
  });
  if (claimed.count === 0) {
    throw new PlatformUserError(409, "DELETION_ALREADY_PROCESSED", "Demande déjà traitée.");
  }
  await anonymizeUser(request.userId, request.id);
  return { processed: true, requestId: request.id };
}



