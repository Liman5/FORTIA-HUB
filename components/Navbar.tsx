"use client";

import React, { useMemo, useState, useEffect } from "react";
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
  ShoppingCart,
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
  cartCount: number;
  setIsCartOpen: (open: boolean) => void;
  isAdmin: boolean;
  setIsAdmin: (admin: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenAuthModal?: (mode: "signup" | "login") => void;
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
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  setIsCartOpen,
  isAdmin,
  setIsAdmin,
  searchQuery,
  setSearchQuery,
  onOpenAuthModal,
  isUserLoggedIn,
  userEmail,
  userName,
  onLogout,
  notifications = [],
  siteContent,
  onOpenSidebar,
}) => {
  const { isDarkMode, toggleTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

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
      <header className="sticky top-0 z-40 bg-[#021231]/95 backdrop-blur-md border-b border-[#D69E25]/30 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Logo */}
          <div
            onClick={() => setActiveTab("landing")}
            className="cursor-pointer shrink-0 transition hover:opacity-90"
            title="Accueil FORTIA HUB"
          >
            <Logo variant="light" size="md" />
          </div>

          {/* Desktop Search */}
          <div className="hidden lg:flex items-center relative flex-1 max-w-xs mx-2">
            <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher formation, e-book..."
              className="w-full bg-[#011D46]/80 text-xs text-white placeholder-slate-400 pl-8 pr-3 py-1.5 rounded-full border border-[#D69E25]/30 focus:outline-none focus:border-[#D69E25] transition"
            />
          </div>

          {/* Global Controls Only */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Cart */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-xl bg-[#011D46]/80 text-slate-200 hover:text-[#D69E25] border border-[#D69E25]/30 transition shadow"
              title="Panier"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Notifications - Popup Dropdown avec max 5 */}
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

              {/* Popup réduit */}
              {isNotifOpen && (
                <div className="absolute right-0 top-11 w-[340px] max-w-[90vw] bg-[#021231] border border-[#D69E25]/40 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
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
                  <div className="max-h-[320px] overflow-y-auto">
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
              )}
            </div>

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

            {/* Sidebar Button - Menu hamburger avec 3 barres */}
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
          </div>
        </div>
      </header>
    </>
  );
};