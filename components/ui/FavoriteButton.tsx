"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useAuth } from "@/lib/store/domains/contexts";
import { useFavorites, type FavoriteResource } from "@/lib/store/favoritesStore";

/**
 * Bouton « favori » réutilisable (produits et formations).
 *
 * • `icon`    : petit cœur pour les cartes (dans une rangée, sans position).
 * • `overlay` : cœur posé sur un visuel (position absolue).
 * • `inline`  : bouton complet pour les fiches détaillées.
 *
 * Un visiteur non connecté est envoyé vers la connexion : les favoris sont
 * enregistrés côté serveur, par compte.
 */
export function FavoriteButton({
  resourceType,
  resourceId,
  variant = "icon",
  className = "",
  stopPropagation = true,
}: {
  resourceType: FavoriteResource;
  resourceId: string;
  variant?: "icon" | "overlay" | "inline";
  className?: string;
  /** Empêche l'ouverture de la carte parente (comportement par défaut). */
  stopPropagation?: boolean;
}) {
  const router = useRouter();
  const { isUserLoggedIn } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const [busy, setBusy] = useState(false);
  const active = isFavorite(resourceType, resourceId);

  const handleClick = async (event: React.MouseEvent) => {
    if (stopPropagation) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!isUserLoggedIn) {
      router.push("/login");
      return;
    }
    if (busy) return;
    setBusy(true);
    await toggle(resourceType, resourceId);
    setBusy(false);
  };

  const label = active ? "Retirer des favoris" : "Ajouter aux favoris";

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-label={label}
        title={label}
        className={`ibx-btn ibx-btn-outline ${className}`}
      >
        <Heart
          className="h-3.5 w-3.5"
          style={{
            color: active ? "var(--ibx-danger)" : "currentColor",
            fill: active ? "var(--ibx-danger)" : "transparent",
          }}
          aria-hidden="true"
        />
        {active ? "Dans mes favoris" : "Ajouter aux favoris"}
      </button>
    );
  }

  if (variant === "overlay") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-label={label}
        title={label}
        className={`absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border transition ${className}`}
        style={{
          backgroundColor: "color-mix(in srgb, var(--ibx-surface) 92%, transparent)",
          borderColor: "var(--ibx-border)",
        }}
      >
        <Heart
          className="h-3.5 w-3.5"
          style={{
            color: active ? "var(--ibx-danger)" : "var(--ibx-fg-muted)",
            fill: active ? "var(--ibx-danger)" : "transparent",
          }}
          aria-hidden="true"
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition hover:scale-105 ${className}`}
    >
      <Heart
        className="h-3.5 w-3.5"
        style={{
          color: active ? "var(--ibx-danger)" : "var(--ibx-fg-subtle)",
          fill: active ? "var(--ibx-danger)" : "transparent",
        }}
        aria-hidden="true"
      />
    </button>
  );
}
