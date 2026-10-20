"use client";

import React, { useState } from "react";
import {
  Info,
  Award,
  Building2,
  Headphones,
  BookOpen,
  X,
  LogIn,
  UserPlus,
  Settings,
  Bell,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useActiveSection } from "@/lib/store/useActiveSection";
import { usePwaInstall, promptInstall, getInstallDiagnostics } from "@/lib/pwa/pwaStore";
import { Download, Check } from "lucide-react";
import { Loader2, RefreshCw, ChevronRight } from "lucide-react";
import { APP_VERSION } from "@/lib/appInfo";
import { applyUpdate, checkForUpdate } from "@/lib/services/appVersion";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isUserLoggedIn?: boolean;
  onOpenAuthModal?: (mode: "login" | "signup") => void;
}

const sidebarLinks = [
  { id: "blog", label: "Blog & Actualités", icon: BookOpen },
  { id: "about", label: "À Propos", icon: Info },
  { id: "verifier", label: "Attestation", icon: Award },
  { id: "enterprises", label: "Entreprise", icon: Building2 },
  { id: "ai-assistant", label: "Assistance", icon: Headphones },
];

export function Sidebar({ isOpen, onClose, isUserLoggedIn, onOpenAuthModal }: SidebarProps) {
  const { setActiveTab } = useActiveSection();
  const { isInstalled, isIOS } = usePwaInstall();
  const [installMsg, setInstallMsg] = useState<string | null>(null);
  const [updateState, setUpdateState] = useState<"idle" | "checking" | "updating" | "latest">("idle");

  const handleNav = (tab: string) => {
    setActiveTab(tab);
    onClose();
  };

  /** Recherche (et applique) une mise à jour de l'application. */
  const handleCheckUpdate = async () => {
    setUpdateState("checking");
    const available = await checkForUpdate();
    if (!available) {
      setUpdateState("latest");
      window.setTimeout(() => setUpdateState("idle"), 4000);
      return;
    }
    setUpdateState("updating");
    await applyUpdate();
  };

  const handleInstallApp = async () => {
    setInstallMsg(null);
    const installed = await promptInstall();
    if (installed) return;

    // L'invite native n'a pas pu s'ouvrir → diagnostiquer puis guider l'utilisateur
    if (isIOS) {
      setInstallMsg(
        "Sur iPhone/iPad : ouvrez Safari → bouton Partager → « Sur l'écran d'accueil » pour installer l'app."
      );
      return;
    }

    const diag = await getInstallDiagnostics();
    if (!diag.swSupported) {
      setInstallMsg(
        "Ce navigateur ne supporte pas l'installation d'applications web. Utilisez Google Chrome ou Microsoft Edge (PC / Android)."
      );
    } else if (!diag.secureContext) {
      setInstallMsg(
        "La page n'est pas servie en HTTPS : l'installation PWA est bloquée par le navigateur. Ouvrez le site en https:// pour pouvoir installer l'app."
      );
    } else if (diag.standalone) {
      setInstallMsg("Vous utilisez déjà l'application installée. Il n'y a rien de plus à télécharger.");
    } else if (!diag.swRegistered) {
      setInstallMsg(
        "Le service worker n'a pas pu être enregistré. Rechargez la page (F5) puis cliquez à nouveau sur « Télécharger l'App »."
      );
    } else {
      setInstallMsg(
        "Chrome n'a pas affiché l'invite automatique. Utilisez le menu ⋮ (en haut à droite) → « Installer FORTIA HUB », ou rechargez la page puis réessayez."
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Voile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="sidebar-backdrop fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panneau latéral (drawer compact) */}
          <motion.div
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 48 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="sidebar-panel fixed right-0 top-0 bottom-0 z-50 w-[84vw] max-w-[330px] bg-[#011D46] border-l border-[#D69E25]/30 flex flex-col"
          >
            {/* En-tête */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#D69E25]/20">
              <span className="sidebar-title text-sm font-black text-[#F8FAFC]">
                FORTIA <span className="text-[#D69E25]">HUB</span>
              </span>
              <button
                onClick={onClose}
                className="sidebar-close-btn p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5 transition"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Compte / connexion */}
            <div className="px-3 py-3 border-b border-[#D69E25]/10">
              {isUserLoggedIn ? (
                <button
                  onClick={() => handleNav("member")}
                  className="sidebar-account-btn w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-[#D69E25]/10 border border-[#D69E25]/25 hover:bg-[#D69E25]/20 transition text-left"
                >
                  <span className="w-8 h-8 rounded-lg bg-[#D69E25] text-[#021231] font-black text-[11px] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-black text-[#F8FAFC]">Mon compte</span>
                    <span className="block text-[10px] text-[#94A3B8] truncate">
                      Commandes, bibliothèque, paramètres
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#D69E25] shrink-0" />
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onOpenAuthModal?.("login");
                      onClose();
                    }}
                    className="sidebar-btn-connect flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-[#D69E25] text-[#021231] hover:bg-amber-400 text-[11px] font-black transition"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Connexion
                  </button>
                  <button
                    onClick={() => {
                      onOpenAuthModal?.("signup");
                      onClose();
                    }}
                    className="sidebar-btn-auth flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-[#D69E25]/60 text-[#D69E25] hover:bg-[#D69E25]/10 text-[11px] font-bold transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    S'inscrire
                  </button>
                </div>
              )}
            </div>

            {/* Navigation compacte */}
            <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-0.5">
              <p className="px-2 pb-1 text-[9px] font-black uppercase tracking-wider text-[#94A3B8]">
                Explorer
              </p>
              {sidebarLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.id}
                    onClick={() => handleNav(link.id)}
                    className="sidebar-link flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-lg text-[#CBD5E1] hover:bg-white/5 hover:text-[#D69E25] text-[13px] font-semibold transition-colors"
                  >
                    <Icon className="sidebar-link-icon w-4 h-4 text-[#D69E25] shrink-0" />
                    <span className="sidebar-link-text">{link.label}</span>
                  </button>
                );
              })}

              {isUserLoggedIn && (
                <>
                  <p className="px-2 pt-3 pb-1 text-[9px] font-black uppercase tracking-wider text-[#94A3B8]">
                    Mon espace
                  </p>
                  <button
                    onClick={() => handleNav("notifications")}
                    className="sidebar-link flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-lg text-[#CBD5E1] hover:bg-white/5 hover:text-[#D69E25] text-[13px] font-semibold transition-colors"
                  >
                    <Bell className="w-4 h-4 text-[#D69E25] shrink-0" />
                    Notifications
                  </button>
                  <button
                    onClick={() => handleNav("settings")}
                    className="sidebar-link flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-lg text-[#CBD5E1] hover:bg-white/5 hover:text-[#D69E25] text-[13px] font-semibold transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#D69E25] shrink-0" />
                    Paramètres
                  </button>
                </>
              )}
            </div>

            {/* Pied : actions compactes */}
            <div className="px-3 py-3 border-t border-[#D69E25]/10 space-y-2">
              {!isInstalled && (
                <button
                  onClick={handleInstallApp}
                  className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-[#D69E25] text-[#021231] font-black text-[11px] hover:bg-amber-400 transition"
                  title="Installer l'application FORTIA HUB"
                >
                  <Download className="w-3.5 h-3.5" />
                  Installer l'app
                </button>
              )}

              <button
                onClick={handleCheckUpdate}
                disabled={updateState === "checking" || updateState === "updating"}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg border border-[#D69E25]/50 text-[#D69E25] font-bold text-[11px] hover:bg-[#D69E25] hover:text-[#021231] transition disabled:opacity-60"
              >
                {updateState === "checking" || updateState === "updating" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {updateState === "updating"
                  ? "Mise à jour…"
                  : updateState === "checking"
                    ? "Recherche…"
                    : updateState === "latest"
                      ? "À jour"
                      : "Mettre à jour"}
              </button>

              {installMsg && (
                <p className="px-2 py-1.5 rounded-lg bg-[#D69E25]/10 border border-[#D69E25]/30 text-[10px] text-[#FDE68A] leading-relaxed">
                  {installMsg}
                </p>
              )}
              {updateState === "latest" && (
                <p className="text-[10px] text-emerald-400 text-center font-bold">
                  Vous avez la dernière version.
                </p>
              )}

              <p className="text-[10px] text-[#94A3B8] text-center font-semibold">
                FORTIA HUB © {new Date().getFullYear()} · v{APP_VERSION}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
