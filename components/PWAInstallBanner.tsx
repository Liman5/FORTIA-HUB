"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Check, Share2 } from "lucide-react";
import { usePwaInstall, promptInstall } from "@/lib/pwa/pwaStore";
import { requestNotificationPermission } from "@/lib/services/appNotifications";

interface PWAInstallBannerProps {
  inlineOnly?: boolean;
}

/**
 * PWAInstallBanner — popup discret (« négligeable ») de téléchargement de l'app.
 * - Compact : une petite pastille en bas d'écran, avec juste un bouton Installer + une croix.
 * - Ne s'affiche JAMAIS si l'app est déjà installée (mode standalone) ou si
 *   l'installation n'est pas disponible.
 * - Se mémorise si l'utilisateur l'a fermée (fortia_pwa_banner_dismissed).
 */
export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ inlineOnly = false }) => {
  const { canInstall, isInstalled, isStandalone, isIOS } = usePwaInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem("fortia_pwa_banner_dismissed");
      if (dismissed === "true") setIsDismissed(true);
    } catch (e) {}
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      window.localStorage.setItem("fortia_pwa_banner_dismissed", "true");
    } catch (e) {}
  };

  // Déjà installé → on ne propose plus le téléchargement
  if (isInstalled || isStandalone) {
    if (inlineOnly) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#D69E25]/10 border border-[#D69E25]/40 text-[#D69E25] rounded-xl text-xs font-bold">
          <Check className="w-3.5 h-3.5" />
          App installée
        </div>
      );
    }
    return null;
  }

  // Pas installable (pas d'événement beforeinstallprompt) et pas iOS → rien à montrer
  if (!canInstall && !isIOS) return null;
  if (isDismissed && !inlineOnly) return null;

  const handleInstallClick = async () => {
    const installed = await promptInstall();
    if (installed) {
      // Après l'installation : demande de permission des notifications système
      setTimeout(() => {
        requestNotificationPermission();
      }, 1200);
    } else if (isIOS) {
      setShowIOSPrompt(true);
    }
  };

  // Version « inline » (bouton dans les paramètres / sidebar)
  if (inlineOnly) {
    return (
      <button
        onClick={handleInstallClick}
        className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-xs hover:brightness-110 active:scale-95 transition shadow-lg"
      >
        <Download className="w-4 h-4" />
        Télécharger l'App FORTIA HUB
      </button>
    );
  }

  // Popup compact et discret en bas d'écran
  return (
    <div className="fixed bottom-24 sm:bottom-28 right-3 left-3 sm:left-auto sm:right-6 sm:max-w-sm z-50">
      <div className="bg-[#011D46]/95 backdrop-blur-md border border-[#D69E25]/50 rounded-2xl p-3 shadow-[0_8px_30px_rgba(0,0,0,0.6)] text-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-300 via-[#D69E25] to-amber-500" />

        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          title="Fermer"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-[#021231] to-[#011D46] border border-[#D69E25] rounded-xl flex items-center justify-center">
            <span className="font-black text-lg text-[#D69E25]">F</span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-[#D69E25] truncate">Installer FORTIA HUB</p>
            <p className="text-[10px] text-slate-300 truncate">Accès instantané & hors-ligne</p>

            {showIOSPrompt && isIOS && (
              <p className="text-[10px] text-amber-300 mt-1 flex items-center gap-1 leading-snug">
                <Share2 className="w-3 h-3 shrink-0" />
                Safari → Partager → « Sur l'écran d'accueil »
              </p>
            )}
          </div>

          <button
            onClick={handleInstallClick}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black rounded-xl text-[10px] hover:brightness-110 active:scale-95 transition shadow-md"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Installer
          </button>
        </div>
      </div>
    </div>
  );
};
