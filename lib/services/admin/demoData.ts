"use client";

// ============================================================
// FORTIA HUB — CLIENT ADMIN DES DONNÉES DE DÉMONSTRATION
// ============================================================

export interface DemoDataCounts {
  categories: number;
  courses: number;
  lessons: number;
  stores: number;
  products: number;
  centers: number;
  freelances: number;
  banners: number;
  users: number;
}

export interface DemoPurgeResult {
  deleted: {
    categories: number;
    courses: number;
    lessons: number;
    stores: number;
    products: number;
    centers: number;
    freelances: number;
    banners: number;
  };
  usersPreserved: number;
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
      return {
        success: false,
        error: json?.error || `Requête refusée (${response.status}).`,
      };
    }
    return { success: true, data: json.data as T };
  } catch {
    return { success: false, error: "Connexion au serveur impossible." };
  }
}

export async function getDemoCounts() {
  return adminFetch<DemoDataCounts>("/api/admin/demo-data");
}

/** Suppression : le serveur exige la confirmation explicite « SUPPRIMER ». */
export async function purgeDemoData() {
  return adminFetch<DemoPurgeResult>("/api/admin/demo-data", {
    method: "DELETE",
    body: JSON.stringify({ confirm: "SUPPRIMER" }),
  });
}
