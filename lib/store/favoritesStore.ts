"use client";

// ============================================================
// FORTIA HUB — FAVORIS (état partagé côté client)
// ------------------------------------------------------------
// Source de vérité : la table `favorites` (serveur).
// Ce module expose un petit store partagé (useSyncExternalStore) :
//   • un seul chargement par utilisateur connecté ;
//   • mise à jour optimiste immédiate (cœur actif sans attendre) ;
//   • retour arrière automatique si l'API échoue ;
//   • vidage automatique à la déconnexion.
// ============================================================

import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/store/domains/contexts";

export type FavoriteResource = "product" | "course";

export interface FavoriteEntry {
  resourceType: FavoriteResource;
  resourceId: string;
}

type Status = "idle" | "loading" | "ready" | "error";

interface FavoritesState {
  entries: FavoriteEntry[];
  status: Status;
}

const INITIAL_STATE: FavoritesState = { entries: [], status: "idle" };

let state: FavoritesState = INITIAL_STATE;
let loadedForUser: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(next: FavoritesState) {
  state = next;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): FavoritesState {
  return state;
}

function getServerSnapshot(): FavoritesState {
  return INITIAL_STATE;
}

/** Clé stable d'une ressource favorite. */
export function favoriteKey(resourceType: FavoriteResource, resourceId: string): string {
  return `${resourceType}:${resourceId}`;
}

function isInState(entries: FavoriteEntry[], resourceType: FavoriteResource, resourceId: string) {
  return entries.some(
    (entry) => entry.resourceType === resourceType && entry.resourceId === resourceId
  );
}

/** Charge les favoris de l'utilisateur (une seule fois par session de compte). */
export async function loadFavoritesFor(userId: string | null | undefined): Promise<void> {
  if (!userId) {
    loadedForUser = null;
    if (state.entries.length > 0 || state.status !== "ready") {
      setState({ entries: [], status: "ready" });
    }
    return;
  }
  if (loadedForUser === userId && state.status === "ready") return;
  if (state.status === "loading") return;

  setState({ entries: state.entries, status: "loading" });
  try {
    const response = await fetch("/api/favorites", { cache: "no-store" });
    if (response.status === 401) {
      loadedForUser = userId;
      setState({ entries: [], status: "ready" });
      return;
    }
    const payload = await response.json().catch(() => null);
    const entries: FavoriteEntry[] = Array.isArray(payload?.favorites)
      ? payload.favorites
          .map((item: any) => ({
            resourceType: String(item?.resourceType || "") as FavoriteResource,
            resourceId: String(item?.resourceId || ""),
          }))
          .filter(
            (item: FavoriteEntry) =>
              (item.resourceType === "product" || item.resourceType === "course") &&
              !!item.resourceId
          )
      : [];
    loadedForUser = userId;
    setState({ entries, status: "ready" });
  } catch {
    setState({ entries: state.entries, status: "error" });
  }
}

/**
 * Ajoute ou retire un favori.
 * Renvoie l'état final (true = ajouté). En cas d'échec réseau, l'affichage
 * est restauré et `null` est renvoyé.
 */
export async function toggleFavorite(
  resourceType: FavoriteResource,
  resourceId: string
): Promise<boolean | null> {
  const before = state.entries;
  const active = isInState(before, resourceType, resourceId);
  const optimistic = active
    ? before.filter(
        (entry) => !(entry.resourceType === resourceType && entry.resourceId === resourceId)
      )
    : [{ resourceType, resourceId }, ...before];

  setState({ entries: optimistic, status: "ready" });

  try {
    const response = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resourceType,
        resourceId,
        action: active ? "remove" : "add",
      }),
    });
    if (!response.ok) throw new Error("favorite_failed");
    return !active;
  } catch {
    setState({ entries: before, status: "ready" });
    return null;
  }
}

/** Hook de favoris : liste, test et bascule. */
export function useFavorites() {
  const { userProfile } = useAuth();
  const userId = userProfile?.id || null;
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void loadFavoritesFor(userId);
  }, [userId]);

  return {
    entries: snapshot.entries,
    status: snapshot.status,
    isFavorite: (resourceType: FavoriteResource, resourceId: string) =>
      isInState(snapshot.entries, resourceType, resourceId),
    toggle: toggleFavorite,
    reload: () => loadFavoritesFor(userId),
    count: snapshot.entries.length,
  };
}
