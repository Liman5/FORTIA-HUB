"use client";

// ============================================================
// FORTIA HUB — CLIENT ADMIN DES UTILISATEURS
// ============================================================

export interface PlatformUserRole {
  id: string;
  centerName?: string;
  name?: string;
  status?: string;
  isVerified?: boolean;
  feePaid?: boolean;
}

export interface PlatformUserRow {
  id: string;
  email: string;
  name: string;
  phone: string;
  avatar: string;
  accountType: string;
  badge: string;
  kycStatus: string;
  isActive: boolean;
  accountStatus: string;
  statusReason: string;
  suspendedUntil: string | null;
  deletionRequestedAt: string | null;
  deletionScheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
  roles: string[];
  roleLabel: string;
  trainingCenters?: PlatformUserRole[];
  stores?: PlatformUserRole[];
  freelanceProfile?: { id: string; title: string } | null;
  enterpriseProfile?: { id: string; companyName: string } | null;
}

export interface PlatformUserStats {
  total: number;
  active: number;
  suspended: number;
  blocked: number;
  instructors: number;
  vendors: number;
  members: number;
  deletionPending: number;
}

export interface PlatformUsersResponse {
  users: PlatformUserRow[];
  pagination: { page: number; limit: number; total: number; pages: number; hasMore: boolean };
  stats: PlatformUserStats;
}

export interface PlatformUserDetail extends PlatformUserRow {
  kycSubmissions: Array<{
    id: string;
    applicantType: string;
    status: string;
    submittedAt: string;
    adminNotes?: string;
    rejectionReason?: string;
  }>;
  purchases: Array<{
    id: string;
    orderNumber: string;
    productTitle: string;
    amountUsd: string | number;
    status: string;
    createdAt: string;
  }>;
  pendingDeletions: Array<{
    id: string;
    status: string;
    origin: string;
    reason: string;
    requestedAt: string;
    deleteAt: string;
    processedAt?: string | null;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    reason: string;
    actorEmail: string;
    createdAt: string;
  }>;
}

export interface DeletionRequestRow {
  id: string;
  userId: string;
  email: string;
  origin: string;
  reason: string;
  status: string;
  requestedAt: string;
  deleteAt: string;
  cancelledAt: string | null;
  processedAt: string | null;
  user?: {
    id: string;
    email: string;
    name: string;
    accountStatus: string;
    isActive: boolean;
  };
}

function adminToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("fortia_admin_token") || "";
}

async function adminFetch<T>(
  url: string,
  init: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = adminToken();
  try {
    const response = await fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
      cache: "no-store",
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) {
      return { success: false, error: json?.error || "Action impossible." };
    }
    return { success: true, data: json.data as T };
  } catch {
    return { success: false, error: "Connexion au serveur impossible." };
  }
}

export async function listPlatformUsers(filters: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "" && value !== null) params.set(key, String(value));
  }
  return adminFetch<PlatformUsersResponse>(`/api/admin/platform-users?${params.toString()}`);
}

export async function getPlatformUser(id: string) {
  return adminFetch<{ user: PlatformUserDetail }>(`/api/admin/platform-users/${id}`);
}

export async function setPlatformUserStatus(
  id: string,
  action: "suspend" | "block" | "reactivate",
  reason?: string,
  until?: string
) {
  return adminFetch<{ user: unknown }>(`/api/admin/platform-users/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action, reason, until }),
  });
}

export async function requestAdminDeletion(id: string, reason: string) {
  return adminFetch(`/api/admin/platform-users/${id}/deletion`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function cancelAdminDeletion(id: string, requestId?: string) {
  return adminFetch(`/api/admin/platform-users/${id}/deletion`, {
    method: "DELETE",
    body: JSON.stringify({ requestId }),
  });
}

export async function listDeletionRequests(filters: Record<string, string | number | undefined> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "" && value !== null) params.set(key, String(value));
  }
  return adminFetch<{
    requests: DeletionRequestRow[];
    stats: { pending: number; completed: number; cancelled: number };
    pagination: { page: number; total: number; pages: number };
  }>(`/api/admin/deletion-requests?${params.toString()}`);
}

export async function processDeletionRequest(id: string, action: "cancel" | "process") {
  return adminFetch(`/api/admin/deletion-requests/${id}`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}
