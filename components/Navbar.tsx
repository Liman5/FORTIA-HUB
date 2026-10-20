"use client";

import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useTheme } from "@/lib/store/ThemeProvider";
import { Logo } from "./Logo";
import { AppNotification } from "../types";
import {
  Search,
  Bell,
  Sun,
  Moon,
  LogIn,
  UserPlus,
  LogOut,
  X,
  CheckCircle2,
  Info,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  setIsAdmin: (admin: boolean) => void;
  /** Ouvre le modal de recherche globale (formations, produits, services…). */
  onOpenSearch?: () => void;
  /** Texte de recherche saisi dans l'en-tête (le modal n'affiche que les résultats). */
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isUserLoggedIn?: boolean;
  userEmail?: string;
  userName?: string;
  onLogout?: () => void;
  notifications?: AppNotification[];
  onMarkNotificationAsRead?: (id: string) => void;
  onMarkAllNotificationsAsRead?: () => void;
  onDeleteNotification?: (id: string) => void;
  siteContent?: any;
  onOpenSidebar?: () => void;
  isLandingPage?: boolean;
  /** Masque la recherche globale de l'en-tête (pages dédiées : /member, /services). */
  hideSearch?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isAdmin,
  setIsAdmin,
  onOpenSearch,
  searchQuery,
  setSearchQuery,
  isUserLoggedIn,
  userEmail,
  userName,
  onLogout,
  notifications = [],
  siteContent,
  onOpenSidebar,
  isLandingPage,
  hideSearch,
}) => {
  const { isDarkMode, toggleTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  /** Saisie dans l'en-tête : alimente le store et ouvre le modal de résultats. */
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    onOpenSearch?.();
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const unreadNotificationsCount = useMemo(() => {
    return (notifications || []).filter((n) => n && !n.read).length;
  }, [notifications]);

  // 5 dernières notifications triées par date
  const recentNotifications = useMemo(() => {
    return [...(notifications || [])]
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .slice(0, 5);
  }, [notifications]);

  const getNotifIcon = (type?: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case "info":
      default:
        return <Info className="w-4 h-4 text-sky-400 shrink-0" />;
    }
  };

  // Fermer le popup au clic extérieur ou Escape
  useEffect(() => {
    if (!isNotifOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".notif-popup-container")) {
        setIsNotifOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsNotifOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isNotifOpen]);

  const announcementBanner = siteContent?.topAnnouncementBanner;

  return (
    <>
      {announcementBanner && (
        <div className="bg-gradient-to-r from-[#D69E25] via-amber-400 to-[#AB6F10] text-[#021231] py-1.5 px-4 text-center text-xs font-black tracking-wide shadow-md flex items-center justify-center gap-2">
          <span>{announcementBanner}</span>
        </div>
      )}

      {/* HEAD APP - Minimal */}
      <header id="app-header" className="sticky top-0 z-40 bg-[#021231]/95 backdrop-blur-md border-b border-[#D69E25]/30 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Logo — dans l'app header : UNIQUEMENT l'icône de marque,
              sans le mot-symbole « FORTIA HUB » ni la tagline. */}
          <div
            onClick={() => setActiveTab("landing")}
            className="cursor-pointer shrink-0 transition hover:opacity-90"
            title="Accueil FORTIA HUB"
          >
            <Logo variant="compact" size="md" />
          </div>

          {/* Recherche — la SAISIE se fait ici, dans l'en-tête ; le modal affiche les résultats */}{" "}
          {!isLandingPage && !hideSearch && (
            <div className="hidden lg:flex items-center gap-3 flex-1 max-w-2xl mx-3 h-11 px-4 rounded-2xl bg-[#011D46]/80 border border-[#D69E25]/30 focus-within:border-[#D69E25] transition">
              <Search className="w-4 h-4 text-[#D69E25] shrink-0" />
              <input
                id="app-search-input"
                type="search"
                value={searchQuery}
                onChange={(event) => handleSearchInput(event.target.value)}
                onFocus={() => onOpenSearch?.()}
                placeholder="Rechercher une formation, un produit, un service…"
                aria-label="Rechercher"
                className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
              />
              {searchQuery.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-white transition shrink-0"
                  aria-label="Effacer la recherche"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          )}

          {/* Global Controls Only */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* La recherche mobile est désormais SOUS l'en-tête (AppShell). */}

            {/* Panier → barre du bas (badge) ; Académie et Marketplace → accueil. */}

            {/* Notifications - Popup Dropdown avec max 5 (masqué sur la landing page) */}
            {!isLandingPage && (
            <div className="notif-popup-container relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-xl bg-[#011D46]/80 text-slate-200 hover:text-[#D69E25] border border-[#D69E25]/30 transition shadow"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#D69E25] text-[#021231] text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Popup rendu dans un PORTAIL : position fixe sous l'en-tête.
                  Sans portail, le backdrop-filter de l'en-tête créait un
                  containing block et le panneau était rogné sur mobile. */}
              {mounted && isNotifOpen && createPortal(
                <div className="notif-popup-container fixed inset-x-0 top-[64px] z-[120] flex justify-center px-3 pointer-events-none">
                <div className="pointer-events-auto w-full max-w-[380px] bg-[#021231] border border-[#D69E25]/40 rounded-2xl overflow-hidden">
                  {/* Header du popup */}
                  <div className="flex items-center justify-between px-4 py-3 bg-[#011D46] border-b border-[#D69E25]/30">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#D69E25]" />
                      <span className="text-xs font-black text-white">Notifications</span>
                      {unreadNotificationsCount > 0 && (
                        <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                          {unreadNotificationsCount}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setIsNotifOpen(false)}
                      className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
                      aria-label="Fermer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Liste des 5 notifications max */}
                  <div className="max-h-[min(60vh,320px)] overflow-y-auto overscroll-contain">
                    {recentNotifications.length === 0 ? (
                      <div className="text-center py-8 px-6">
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                          <Bell className="w-5 h-5 text-slate-500" />
                        </div>
                        <p className="text-xs text-slate-400 font-semibold">Aucune notification</p>
                        <p className="text-[10px] text-slate-500 mt-1">Vous recevrez des alertes ici</p>
                      </div>
                    ) : (
                      recentNotifications.map((n) => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition cursor-pointer ${
                            !n.read ? "bg-[#D69E25]/5" : ""
                          }`}
                        >
                          <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            !n.read ? "bg-[#D69E25]/15 border border-[#D69E25]/30" : "bg-white/5 border border-white/10"
                          }`}>
                            {getNotifIcon(n.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-xs font-bold truncate ${!n.read ? "text-white" : "text-slate-300"}`}>
                                {n.title}
                              </h4>
                              {!n.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D69E25] shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mt-0.5">
                              {n.message}
                            </p>
                            <span className="text-[9px] text-slate-500 font-medium mt-1 block">{n.date}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer - Voir plus */}
                  <button
                    onClick={() => {
                      setIsNotifOpen(false);
                      setActiveTab("notifications");
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-3 bg-[#011D46] border-t border-[#D69E25]/30 text-[#D69E25] hover:bg-[#D69E25]/10 text-xs font-black transition"
                  >
                    Voir toutes les notifications
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                </div>,
                document.body
              )}
            </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-[#011D46]/80 text-slate-200 hover:text-[#D69E25] border border-[#D69E25]/30 transition shadow"
              title={isDarkMode ? "Mode Jour" : "Mode Nuit"}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Auth / Profile — rendu uniquement après hydratation */}
            {!mounted ? null : isUserLoggedIn ? (
              <button
                onClick={onLogout}
                title="Se Déconnecter"
                className="p-2 rounded-xl bg-[#011D46]/80 text-slate-200 hover:text-red-400 border border-[#D69E25]/30 transition shadow"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              (
                <div className="hidden sm:flex items-center gap-1.5">
                  <Link
                    href="/login"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 border border-[#D69E25]/40 hover:bg-[#D69E25] hover:text-[#021231] transition shadow cursor-pointer"
                    title="Se connecter"
                  >
                    <LogIn className="w-3.5 h-3.5 text-[#D69E25]" />
                    <span>Connexion</span>
                  </Link>
                  <Link
                    href="/register"
                    className="flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] hover:brightness-110 transition shadow-lg cursor-pointer"
                    title="Créer un compte"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span className="hidden md:inline ml-1">S'inscrire</span>
                  </Link>
                </div>
              )
            )}

            {/* Sidebar Button - Menu hamburger avec 3 barres (masqué sur la landing page) */}
            {!isLandingPage && (
              <button
                onClick={onOpenSidebar}
                className="sidebar-menu-btn p-2 rounded-xl bg-[#D69E25]/20 text-[#D69E25] hover:bg-[#D69E25] hover:text-[#021231] border border-[#D69E25]/40 transition shadow"
                title="Menu"
                aria-label="Ouvrir le menu"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <line x1="4" y1="6" x2="20" y2="6" stroke="#D69E25" />
                  <line x1="4" y1="12" x2="20" y2="12" stroke="#D69E25" />
                  <line x1="4" y1="18" x2="20" y2="18" stroke="#D69E25" />
                </svg>
              </button>
            )}
          </div>

          {/* La barre de recherche mobile se trouve SOUS l'en-tête (AppShell) :
              elle reste fixe au défilement et n'encombre plus le header. */}
        </div>
      </header>
    </>
  );
};