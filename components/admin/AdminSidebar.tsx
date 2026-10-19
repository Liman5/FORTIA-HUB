"use client";

import React from "react";
import {
  LayoutDashboard,
  BookOpen,
  ShoppingBag,
  Briefcase,
  Store,
  FileCheck,
  Mail,
  Users,
  Settings,
  Globe,
  DollarSign,
  GraduationCap,
  X,
  Images,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";

export type AdminModuleKey =
  | "stats"
  | "formations"
  | "produits"
  | "services"
  | "bannieres"
  | "boutiques"
  | "marketplace"
  | "support"
  | "formateurs"
  | "kyc"
  | "devis"
  | "frais"
  | "cms"
  | "admins";

interface AdminSidebarProps {
  activeModule: AdminModuleKey;
  onModuleChange: (module: AdminModuleKey) => void;
  isOpen: boolean;
  onClose: () => void;
  badges?: Partial<Record<AdminModuleKey, number>>;
  /** Affiche le module « Administrateurs » (réservé au superadministrateur). */
  allowAdmins?: boolean;
  /** Modules visibles pour ce profil (undefined = tous). */
  allowedModules?: AdminModuleKey[];
}

const MODULES: {
  key: AdminModuleKey;
  label: string;
  icon: React.ElementType;
  color: string;
  activeBg: string;
}[] = [
  {
    key: "stats",
    label: "Statistiques Globales",
    icon: LayoutDashboard,
    color: "text-[#D69E25]",
    activeBg: "bg-[#D69E25] text-[#021231]",
  },
  {
    key: "formations",
    label: "Formations",
    icon: BookOpen,
    color: "text-blue-400",
    activeBg: "bg-blue-500 text-white",
  },
  {
    key: "produits",
    label: "Produits Numériques",
    icon: ShoppingBag,
    color: "text-emerald-400",
    activeBg: "bg-emerald-500 text-white",
  },
  {
    key: "services",
    label: "Services Agence",
    icon: Briefcase,
    color: "text-purple-400",
    activeBg: "bg-purple-500 text-white",
  },
  {
    // MODULE INDÉPENDANT : bandeau animé du site (images R2, animation,
    // bouton + lien interne/externe, durée d'affichage).
    key: "bannieres",
    label: "Bannières du Site",
    icon: Images,
    color: "text-[#D69E25]",
    activeBg: "bg-[#D69E25] text-[#021231]",
  },
  {
    key: "boutiques",
    label: "Vérification Boutique",
    icon: BadgeCheck,
    color: "text-orange-400",
    activeBg: "bg-orange-500 text-white",
  },
  {
    key: "marketplace",
    label: "Marketplace & Vendeurs",
    icon: Store,
    color: "text-orange-400",
    activeBg: "bg-orange-500 text-white",
  },
  {
    key: "support",
    label: "Support Post-Achat",
    icon: Mail,
    color: "text-indigo-400",
    activeBg: "bg-indigo-500 text-white",
  },
  {
    key: "formateurs",
    label: "Formateurs",
    icon: GraduationCap,
    color: "text-amber-400",
    activeBg: "bg-amber-500 text-white",
  },
  {
    key: "kyc",
    label: "Vérifications KYC",
    icon: FileCheck,
    color: "text-emerald-400",
    activeBg: "bg-emerald-500 text-white",
  },
  {
    key: "devis",
    label: "Demandes de Devis",
    icon: DollarSign,
    color: "text-yellow-400",
    activeBg: "bg-yellow-500 text-white",
  },
  {
    key: "frais",
    label: "Frais d'Inscription",
    icon: Settings,
    color: "text-rose-400",
    activeBg: "bg-rose-500 text-white",
  },
  {
    key: "cms",
    label: "Contenu du Site (CMS)",
    icon: Globe,
    color: "text-cyan-400",
    activeBg: "bg-cyan-500 text-white",
  },
  {
    // Comptes administrateurs : visible UNIQUEMENT pour un superadministrateur
    // (c'est lui qui crée les admins et définit leur mot de passe unique).
    key: "admins",
    label: "Administrateurs",
    icon: ShieldCheck,
    color: "text-[#D69E25]",
    activeBg: "bg-[#D69E25] text-[#021231]",
  },
];

export function AdminSidebar({ activeModule, onModuleChange, isOpen, onClose, badges = {}, allowAdmins = false, allowedModules }: AdminSidebarProps) {
  return (
    <>
      {/* Backdrop mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-16 bottom-0 left-0 z-40 w-64 bg-[#011D46] border-r border-[#D69E25]/20 overflow-y-auto transition-transform duration-300 sidebar-panel ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-4">
          {/* Titre */}
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <span className="text-sm font-black text-white">Navigation</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 sidebar-label">
            Modules d'administration
          </p>

          <nav className="space-y-1">
            {MODULES.filter(
              (mod) =>
                (mod.key !== "admins" || allowAdmins) &&
                (!allowedModules || allowedModules.includes(mod.key))
            ).map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.key;
              const badge = badges[mod.key] || 0;

              return (
                <button
                  key={mod.key}
                  onClick={() => {
                    onModuleChange(mod.key);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? `${mod.activeBg} shadow-lg scale-[1.02]`
                      : "text-slate-300 hover:bg-white/5 hover:text-white sidebar-link"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "" : mod.color}`} />
                  <span className="flex-1 text-left truncate">{mod.label}</span>
                  {badge > 0 && (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                        isActive ? "bg-white/25 text-white" : "bg-red-500 text-white"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/10 sidebar-divider">
            <div className="px-3 py-2 bg-[#021231] rounded-xl border border-[#D69E25]/20">
              <p className="text-[10px] font-black text-[#D69E25]">FORTIA HUB</p>
              <p className="text-[9px] text-slate-500 mt-0.5 sidebar-footer-text">
                Panneau d'administration v2.0
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}