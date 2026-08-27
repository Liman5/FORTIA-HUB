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

  const handleNav = (tab: string) => {
    setActiveTab(tab);
    onClose();
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sidebar-backdrop fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Popup à droite */}
          <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="sidebar-panel fixed right-4 top-4 bottom-4 z-50 w-[320px] max-w-[90vw] bg-[#011D46] border-2 border-[#D69E25]/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="sidebar-header flex items-center justify-between p-4 border-b border-[#D69E25]/20 bg-gradient-to-r from-[#011D46] to-[#D69E25]/10">
              <div className="sidebar-title text-sm font-black text-white">
                FORTIA <span className="text-[#D69E25]">HUB</span>
              </div>
              <button
                onClick={onClose}
                className="sidebar-close-btn p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Auth Section */}
            <div className="sidebar-section p-4 space-y-2 border-b border-[#D69E25]/10 bg-[#021231]/50">
              {isUserLoggedIn ? (
                <>
                  <div className="sidebar-label text-xs text-slate-400 font-semibold mb-2">Connecté</div>
                  <button
                    onClick={() => handleNav("member")}
                    className="sidebar-account-btn flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-[#D69E25]/10 border border-[#D69E25]/30 text-[#D69E25] hover:bg-[#D69E25] hover:text-[#021231] text-xs font-bold transition"
                  >
                    <User className="w-4 h-4" />
                    Mon Compte
                  </button>
                  <button
                    onClick={() => handleNav("settings")}
                    className="sidebar-account-btn flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-[#D69E25]/10 border border-[#D69E25]/30 text-[#D69E25] hover:bg-[#D69E25] hover:text-[#021231] text-xs font-bold transition"
                  >
                    <Settings className="w-4 h-4" />
                    Paramètres
                  </button>
                  <button
                    onClick={() => handleNav("notifications")}
                    className="sidebar-account-btn flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-[#D69E25]/10 border border-[#D69E25]/30 text-[#D69E25] hover:bg-[#D69E25] hover:text-[#021231] text-xs font-bold transition"
                  >
                    <Bell className="w-4 h-4" />
                    Notifications
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      onOpenAuthModal?.("login");
                      onClose();
                    }}
                    className="sidebar-btn-connect flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-[#D69E25] text-[#021231] hover:bg-amber-400 text-xs font-black transition"
                  >
                    <LogIn className="w-4 h-4" />
                    Se Connecter
                  </button>
                  <button
                    onClick={() => {
                      onOpenAuthModal?.("signup");
                      onClose();
                    }}
                    className="sidebar-btn-auth flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl border-2 border-[#D69E25] text-[#D69E25] hover:bg-[#D69E25]/10 text-xs font-bold transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    Créer un Compte
                  </button>
                </>
              )}
            </div>

            {/* Navigation Links */}
            <div className="flex-1 p-4 space-y-1.5 overflow-y-auto">
              <div className="sidebar-label px-3 pt-1 pb-2 text-[10px] uppercase tracking-wider text-slate-500 font-black">
                Navigation
              </div>
              {sidebarLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.id}
                    onClick={() => handleNav(link.id)}
                    className="sidebar-link flex items-center gap-3 w-full px-3 py-3 rounded-xl text-slate-200 hover:bg-[#021231] hover:text-[#D69E25] border border-transparent hover:border-[#D69E25]/30 text-sm font-semibold transition-all"
                  >
                    <Icon className="sidebar-link-icon w-4.5 h-4.5 text-[#D69E25]" />
                    <span className="sidebar-link-text">{link.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="sidebar-footer p-4 border-t border-[#D69E25]/10 bg-[#021231]/50 space-y-2">
              {/* Bouton Télécharger l'App - masqué si déjà installé */}
              {!isInstalled && (
                <button
                  onClick={handleInstallApp}
                  className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black text-xs hover:brightness-110 active:scale-95 transition shadow-lg"
                  title="Télécharger l'application FORTIA HUB"
                >
                  <Download className="w-4 h-4" />
                  Télécharger l'App
                </button>
              )}
              {installMsg && (
                <div className="px-3 py-2 rounded-xl bg-[#D69E25]/10 border border-[#D69E25]/40 text-[10px] text-amber-200 leading-relaxed">
                  {installMsg}
                </div>
              )}
              <div className="sidebar-footer-text text-[10px] text-slate-500 font-semibold">
                FORTIA HUB © {new Date().getFullYear()}
              </div>
              <div className="sidebar-footer-sub text-[10px] text-slate-600">LEARN. BUILD. SUCCEED.</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}