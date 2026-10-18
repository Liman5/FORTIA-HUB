"use client";

// ============================================================
// FORTIA HUB — DOMAINE « BANNIÈRES DU SITE » (module indépendant)
// ------------------------------------------------------------
// Les bannières (image Cloudflare R2, animation, bouton + lien
// interne/externe, durée d'affichage) forment un module AUTONOME :
//   • endpoint dédié : /api/banners ;
//   • cache de domaine dédié (« banners ») ;
//   • état et actions isolés des autres domaines.
//
// Seule dépendance : un rappel de rafraîchissement (injecté) afin que
// le site affiche immédiatement les modifications de l'administration.
// ============================================================

import { useCallback, useMemo, useState } from "react";
import type { SiteBanner } from "@/lib/types";
import { apiWritePlatform } from "@/lib/services/platformWrite";
import { clearCache } from "@/lib/services/api/http";

export interface BannersDomainDeps {
  /** Recharge les données publiques (`force` = ignorer le cache client). */
  onSaved?: (force?: boolean) => void;
}

/** Normalise une bannière reçue de l'API (snake_case → camelCase). */
function mapBanner(raw: any): SiteBanner {
  if (!raw || typeof raw !== "object") return raw;
  return {
    id: String(raw.id || ""),
    title: raw.title || "",
    subtitle: raw.subtitle || "",
    imageUrl: raw.imageUrl || raw.image_url || "",
    animation: raw.animation || "fade",
    intervalMs: Number(raw.intervalMs ?? raw.interval_ms ?? 5000) || 5000,
    buttonLabel: raw.buttonLabel || raw.button_label || "",
    buttonLink: raw.buttonLink || raw.button_link || "",
    linkTarget: (raw.linkTarget || raw.link_target || "internal") as SiteBanner["linkTarget"],
    isActive: raw.isActive ?? raw.is_active ?? true,
    displayOrder: Number(raw.displayOrder ?? raw.display_order ?? 0) || 0,
  };
}

export function useBannersDomain({ onSaved }: BannersDomainDeps = {}) {
  const [siteBanners, setSiteBannersState] = useState<SiteBanner[]>([]);

  /** Remplace la liste (données serveur normalisées). */
  const setSiteBanners = useCallback((banners: any[]) => {
    setSiteBannersState((banners || []).map(mapBanner));
  }, []);

  /** Après une écriture : cache du domaine invalidé + rechargement public. */
  const afterWrite = useCallback(() => {
    clearCache(["banners"]);
    onSaved?.(true);
  }, [onSaved]);

  const addBanner = useCallback(
    (banner: SiteBanner) => {
      const tempId = banner.id || `banner-${Date.now()}`;
      setSiteBannersState((prev) => [...prev, { ...banner, id: tempId }]);
      apiWritePlatform("create-banner", { ...banner, id: undefined }).then((res) => {
        if (res.success) {
          if (res.id) {
            setSiteBannersState((prev) =>
              prev.map((b) => (b.id === tempId ? { ...b, id: res.id as string } : b))
            );
          }
          afterWrite();
        } else {
          console.warn("[Bannières] Création non persistée:", res.error);
        }
      });
    },
    [afterWrite]
  );

  const updateBanner = useCallback(
    (banner: SiteBanner) => {
      setSiteBannersState((prev) => prev.map((b) => (b.id === banner.id ? { ...b, ...banner } : b)));
      apiWritePlatform("update-banner", { ...banner }).then((res) => {
        if (res.success) afterWrite();
        else console.warn("[Bannières] Mise à jour non persistée:", res.error);
      });
    },
    [afterWrite]
  );

  const deleteBanner = useCallback(
    (id: string) => {
      setSiteBannersState((prev) => prev.filter((b) => b.id !== id));
      apiWritePlatform("delete-banner", { id }).then((res) => {
        if (res.success) afterWrite();
        else console.warn("[Bannières] Suppression non persistée:", res.error);
      });
    },
    [afterWrite]
  );

  const toggleBannerActive = useCallback(
    (id: string) => {
      setSiteBannersState((prev) => {
        const target = prev.find((b) => b.id === id);
        if (!target) return prev;
        const next = { ...target, isActive: !(target.isActive ?? true) };
        apiWritePlatform("update-banner", { ...next }).then((res) => {
          if (res.success) afterWrite();
        });
        return prev.map((b) => (b.id === id ? next : b));
      });
    },
    [afterWrite]
  );

  return useMemo(
    () => ({
      siteBanners,
      setSiteBanners,
      addBanner,
      updateBanner,
      deleteBanner,
      toggleBannerActive,
    }),
    [siteBanners, setSiteBanners, addBanner, updateBanner, deleteBanner, toggleBannerActive]
  );
}
