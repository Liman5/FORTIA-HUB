"use client";

import React from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { useActiveSection } from "@/lib/store/useActiveSection";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Lock } from "lucide-react";

export function NotificationsPage() {
  const {
    isUserLoggedIn,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearNotifications,
    setOpenAuthModal,
    setAuthMode,
  } = useAppStore();

  const { setActiveTab } = useActiveSection();

  if (!isUserLoggedIn) {
    return (
      <div className="py-16 px-4 max-w-2xl mx-auto text-center space-y-6">
        <div className="p-8 sm:p-10 bg-[#011D46]/90 border-2 border-[#D69E25]/40 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Centre de Notifications</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium max-w-lg mx-auto">
              Connectez-vous pour consulter vos alertes personnelles et messages de commande.
            </p>
          </div>
          <button
            onClick={() => {
              setAuthMode("login");
              setOpenAuthModal(true);
            }}
            className="px-6 py-3 bg-[#D69E25] text-[#021231] font-black rounded-xl text-xs shadow-lg hover:bg-amber-400 transition cursor-pointer"
          >
            Se Connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <NotificationCenter
      notifications={notifications}
      onMarkAsRead={markNotificationAsRead}
      onMarkAllAsRead={markAllNotificationsAsRead}
      onDeleteNotification={deleteNotification}
      onClearAllNotifications={clearNotifications}
      onNavigateTab={setActiveTab}
      onClose={() => setActiveTab("landing")}
    />
  );
}
