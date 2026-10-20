"use client";

// ============================================================
// FORTIA HUB — DOMAINE « INTERFACE »
// ------------------------------------------------------------
// Extrait de `lib/store/AppStore.tsx` (Phase 2). Ce module est
// TOTALEMENT AUTONOME (aucune dépendance aux autres domaines) :
//   • notifications globales + actions de lecture
//   • recherche globale (navbar → boutique)
//   • formation ouverte dans le lecteur
//   • modales d'interface : KYC, candidature vendeur, accès administration
//   (la connexion / l'inscription se font désormais par NAVIGATION vers les
//   pages /login et /register — plus aucune fenêtre superposée)
// ============================================================

import { useCallback, useEffect, useState, useMemo } from "react";
import type { AppNotification, Course } from "@/lib/types";
import { apiWritePlatform } from "@/lib/services/platformWrite";
import { fetchCourseDetail } from "@/lib/services/api/catalog";

export function useUiDomain() {
  // --- Notifications globales ---
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // --- Formation ouverte dans le lecteur de cours ---
  const [selectedCourseForPlayer, setSelectedCourseForPlayer] = useState<Course | null>(null);

  // --- Recherche globale ---
  const [searchQuery, setSearchQueryState] = useState("");
  const setSearchQuery = useCallback((query: string) => setSearchQueryState(query), []);

  // --- Modales d'interface ---
  const [isVendorApplicationModalOpen, setVendorApplicationModalOpen] = useState(false);
  const [isKycModalOpen, setKycModalOpen] = useState(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);

  // --- Actions sur les notifications ---
  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    // Persisté en base : la notification reste lue après rechargement.
    void apiWritePlatform("mark-notification-read", { id });
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    // Persistance de CHAQUE notification non lue (sinon elles réapparaissaient
    // au rechargement suivant puisque seul l'état local avait changé).
    notifications
      .filter((n) => !n.read)
      .forEach((n) => {
        void apiWritePlatform("mark-notification-read", { id: n.id });
      });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [notifications]);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    // Persisté en base : la notification supprimée ne revient plus.
    void apiWritePlatform("delete-notification", { id });
  }, []);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  /**
   * Détail à la demande : le catalogue ne transporte plus les chapitres, les
   * leçons ni les quiz. Dès qu'une formation allégée est ouverte (lecteur,
   * aperçu), son détail complet est récupéré puis fusionné — l'interface ne
   * change pas, elle affiche simplement la version complète une fois reçue.
   */
  useEffect(() => {
    const course = selectedCourseForPlayer as (Course & { isLite?: boolean }) | null;
    if (!course || !course.isLite) return;

    let cancelled = false;
    (async () => {
      const detail = await fetchCourseDetail(course.id);
      if (cancelled || !detail) return;
      setSelectedCourseForPlayer((prev) => {
        const current = prev as (Course & { isLite?: boolean }) | null;
        if (!current || current.id !== course.id) return prev;
        return { ...current, ...detail } as Course;
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseForPlayer?.id]);

  // Objet mémoïsé : son identité ne change que lorsqu'un état du domaine change
  // (les actions sont stables) — d'où des re-rendus strictement ciblés.
  return useMemo(
    () => ({

    notifications,
    setNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearNotifications,
    selectedCourseForPlayer,
    setSelectedCourseForPlayer,
    searchQuery,
    setSearchQuery,
    isVendorApplicationModalOpen,
    setVendorApplicationModalOpen,
    isKycModalOpen,
    setKycModalOpen,
    isAdminAuthModalOpen,
    setIsAdminAuthModalOpen,    }),
    [
      notifications,
      selectedCourseForPlayer,
      searchQuery,
      isVendorApplicationModalOpen,
      isKycModalOpen,
      isAdminAuthModalOpen,
    ]
  );
}
