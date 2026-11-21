// ============================================================
// FORTIA HUB — UTILISATEURS DE LA PLATEFORME (liste / détail)
// ============================================================

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PlatformRole =
  | "member"
  | "instructor"
  | "vendor"
  | "freelance"
  | "enterprise"
  | "admin";

export class PlatformUserError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "PlatformUserError";
    this.status = status;
    this.code = code;
  }
}

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function computeRoles(user: {
  accountType: string;
  trainingCenters?: unknown[];
  stores?: unknown[];
  freelanceProfile?: unknown;
  enterpriseProfile?: unknown;
}): PlatformRole[] {
  const roles = new Set<PlatformRole>();
  if (user.trainingCenters?.length) roles.add("instructor");
  if (user.stores?.length) roles.add("vendor");
  if (user.accountType === "freelance" || user.freelanceProfile) roles.add("freelance");
  if (user.accountType === "enterprise" || user.enterpriseProfile) roles.add("enterprise");
  if (["admin", "superadmin", "super_admin"].includes(user.accountType)) roles.add("admin");
  if (roles.size === 0 || user.accountType === "buyer") roles.add("member");
  return [...roles];
}

export const PLATFORM_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  avatar: true,
  accountType: true,
  badge: true,
  kycStatus: true,
  isActive: true,
  accountStatus: true,
  statusReason: true,
  suspendedUntil: true,
  deletionRequestedAt: true,
  deletionScheduledFor: true,
  createdAt: true,
  updatedAt: true,
  trainingCenters: {
    select: { id: true, centerName: true, status: true, isVerified: true, feePaid: true },
    take: 5,
  },
  stores: {
    select: { id: true, name: true, status: true, isVerified: true },
    take: 5,
  },
  freelanceProfile: { select: { id: true, title: true, kycVerified: true, canSellServices: true } },
  enterpriseProfile: { select: { id: true, companyName: true, verifiedDocuments: true } },
} satisfies Prisma.UserSelect;

export interface PlatformUsersFilters {
  q?: string;
  role?: string;
  status?: string;
  kyc?: string;
  deletion?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

function clampLimit(value: unknown): number {
  return Math.min(Math.max(1, Number(value) || 25), 100);
}
function pageNumber(value: unknown): number {
  return Math.max(1, Number(value) || 1);
}

function buildWhere(filters: PlatformUsersFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  const and: Prisma.UserWhereInput[] = [];
  const q = String(filters.q || "").trim();
  if (q) {
    const search: Prisma.UserWhereInput[] = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
    if (UUID_PATTERN.test(q)) search.push({ id: q });
    and.push({ OR: search });
  }

  if (filters.role) {
    const role = String(filters.role);
    if (role === "instructor") and.push({ trainingCenters: { some: {} } });
    else if (role === "vendor") and.push({ stores: { some: {} } });
    else if (role === "admin") {
      and.push({ accountType: { in: ["admin", "superadmin", "super_admin"] } });
    } else if (role === "freelance") {
      and.push({ OR: [{ accountType: "freelance" }, { freelanceProfile: { isNot: null } }] });
    } else if (role === "enterprise") {
      and.push({ OR: [{ accountType: "enterprise" }, { enterpriseProfile: { isNot: null } }] });
    } else if (role === "member") and.push({ accountType: "buyer" });
  }

  if (filters.status) {
    const status = String(filters.status);
    if (status === "active") {
      and.push({ isActive: true, accountStatus: "active" });
    } else if (status === "suspended" || status === "blocked" || status === "anonymized") {
      and.push({ accountStatus: status });
    } else if (status === "deletion_pending") {
      and.push({
        OR: [{ deletionScheduledFor: { not: null } }, { accountStatus: "deletion_pending" }],
      });
    }
  }

  if (filters.kyc) and.push({ kycStatus: filters.kyc as never });
  if (filters.deletion === "pending") and.push({ deletionScheduledFor: { not: null } });

  if (filters.from || filters.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.from) {
      const from = new Date(String(filters.from));
      if (!Number.isNaN(from.getTime())) createdAt.gte = from;
    }
    if (filters.to) {
      const to = new Date(String(filters.to));
      if (!Number.isNaN(to.getTime())) createdAt.lte = to;
    }
    and.push({ createdAt });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export async function platformUserStats() {
  const [total, active, suspended, blocked, instructors, vendors, members, deletionPending] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true, accountStatus: "active" } }),
      prisma.user.count({ where: { accountStatus: "suspended" } }),
      prisma.user.count({ where: { accountStatus: "blocked" } }),
      prisma.user.count({ where: { trainingCenters: { some: {} } } }),
      prisma.user.count({ where: { stores: { some: {} } } }),
      prisma.user.count({ where: { accountType: "buyer" } }),
      prisma.user.count({ where: { deletionScheduledFor: { not: null } } }),
    ]);
  return { total, active, suspended, blocked, instructors, vendors, members, deletionPending };
}

export async function listPlatformUsers(filters: PlatformUsersFilters) {
  const page = pageNumber(filters.page);
  const limit = clampLimit(filters.limit);
  const where = buildWhere(filters);

  const [total, users, stats] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: PLATFORM_USER_SELECT,
      orderBy: orderByFor(filters.sort),
      skip: (page - 1) * limit,
      take: limit,
    }),
    platformUserStats(),
  ]);

  return {
    users: users.map((user) => ({
      ...user,
      roles: computeRoles(user),
      roleLabel: computeRoles(user).join(", "),
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      hasMore: page * limit < total,
    },
    stats,
  };
}

export async function getPlatformUser(userId: string) {
  if (!UUID_PATTERN.test(userId)) {
    throw new PlatformUserError(400, "INVALID_USER_ID", "Identifiant utilisateur invalide.");
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...PLATFORM_USER_SELECT,
      kycSubmissions: {
        select: {
          id: true,
          applicantType: true,
          status: true,
          submittedAt: true,
          adminNotes: true,
          rejectionReason: true,
        },
        orderBy: { submittedAt: "desc" },
        take: 10,
      },
      purchases: {
        select: {
          id: true,
          orderNumber: true,
          productTitle: true,
          amountUsd: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      pendingDeletions: {
        orderBy: { requestedAt: "desc" },
        take: 10,
      },
    },
  });
  if (!user) throw new PlatformUserError(404, "USER_NOT_FOUND", "Utilisateur introuvable.");

  const auditLogs = await prisma.adminAuditLog.findMany({
    where: { targetUserId: userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return { ...user, roles: computeRoles(user), auditLogs };
}

function orderByFor(sort?: string): Prisma.UserOrderByWithRelationInput {
  switch (String(sort || "")) {
    case "created_asc":
      return { createdAt: "asc" };
    case "name_asc":
      return { name: "asc" };
    case "name_desc":
      return { name: "desc" };
    case "updated_desc":
      return { updatedAt: "desc" };
    default:
      return { createdAt: "desc" };
  }
}
