"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/lib/store/ThemeProvider";
import { Logo } from "@/components/Logo";
import { Bell, Sun, Moon, LogOut, ShieldCheck, Clock, Wifi } from "lucide-react";
import { AppNotification } from "@/lib/types";

interface AdminHeaderProps {
  notifications?: AppNotification[];
  onMarkAllNotificationsAsRead?: () => void;
  onOpenNotifications?: () => void;
  onLogout?: () => void;
}

export function AdminHeader({
  notifications = [],
  onMarkAllNotificationsAsRead,
  onOpenNotifications,
  onLogout,
}: AdminHeaderProps) {
  const { isDarkMode, toggleTheme } = useTheme();
  const [now, setNow] = useState(new Date());
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Horloge temps réel
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const dateStr = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Fermer au clic extérieur
  useEffect(() => {
    if (!isNotifOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".admin-notif-container")) setIsNotifOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [isNotifOpen]);

  return (
    <header className="admin-header-protected sticky top-0 z-40 bg-[#021231]/95 backdrop-blur-md border-b border-[#D69E25]/30 shadow-xl navbar-header">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Logo + badge admin */}
        <div className="flex items-center gap-3 min-w-0">
          <Logo variant="light" size="md" />
          <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#D69E25]/15 border border-[#D69E25]/40 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D69E25]" />
            <span className="text-[10px] font-black text-[#D69E25] uppercase tracking-wider">Admin</span>
          </span>
        </div>

        {/* Horloge temps réel (desktop) */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#011D46]/80 border border-[#D69E25]/30 rounded-xl">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <div className="text-left leading-tight">
            <p className="text-[11px] font-black text-white tabular-nums">
              <Clock className="inline w-3 h-3 text-[#D69E25] mr-1" />
              {timeStr}
            </p>
            <p className="text-[9px] text-slate-400 capitalize">{dateStr}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Horloge mobile compacte */}
          <div className="md:hidden px-2 py-1 bg-[#011D46]/80 border border-[#D69E25]/30 rounded-lg">
            <span className="text-[11px] font-black text-white tabular-nums">
              {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          {/* Notifications */}
          <div className="admin-notif-container relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 rounded-xl bg-[#011D46]/80 text-slate-200 hover:text-[#D69E25] border border-[#D69E25]/30 transition shadow"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {isNotifOpen && (
              <div className="absolute right-0 top-11 w-[320px] max-w-[90vw] bg-[#021231] border border-[#D69E25]/40 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 bg-[#011D46] border-b border-[#D69E25]/30">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#D69E25]" />
                    <span className="text-xs font-black text-white">Notifications admin</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => onMarkAllNotificationsAsRead?.()}
                      className="text-[9px] font-bold text-[#D69E25] hover:underline"
                    >
                      Tout marquer lu
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center py-8 text-xs text-slate-500 italic">Aucune notification</p>
                  ) : (
                    notifications.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-white/5 hover:bg-white/5 transition ${!n.read ? "bg-[#D69E25]/5" : ""}`}
                      >
                        <h4 className={`text-xs font-bold ${!n.read ? "text-white" : "text-slate-300"}`}>{n.title}</h4>
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{n.message}</p>
                        <span className="text-[9px] text-slate-500 block mt-1">{n.date}</span>
                      </div>
                    ))
                  )}
                </div>
                {onOpenNotifications && (
                  <button
                    onClick={() => {
                      setIsNotifOpen(false);
                      onOpenNotifications();
                    }}
                    className="w-full px-4 py-2.5 bg-[#011D46] border-t border-[#D69E25]/30 text-[#D69E25] text-[10px] font-black hover:bg-[#D69E25]/10 transition"
                  >
                    Voir toutes les notifications →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mode nuit / jour */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-[#011D46]/80 text-slate-200 hover:text-[#D69E25] border border-[#D69E25]/30 transition shadow"
            title={isDarkMode ? "Mode Jour" : "Mode Nuit"}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Déconnexion */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition shadow"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline text-[10px] font-black">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}