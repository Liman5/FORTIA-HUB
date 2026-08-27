"use client";

import React from "react";
import { Home, GraduationCap, ShoppingBag, Briefcase, User } from "lucide-react";

interface BottomNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isUserLoggedIn?: boolean;
  onOpenAuthModal?: (mode: "signup" | "login") => void;
  isLandingPage?: boolean;
}

/**
 * BottomNavbar - Main navigation bar at the bottom
 * Contains the 5 primary navigation links:
 * Accueil, Académie, Marketplace, Services, Mon Compte
 */
export const BottomNavbar: React.FC<BottomNavbarProps> = ({
  activeTab,
  setActiveTab,
  isUserLoggedIn,
  onOpenAuthModal,
  isLandingPage,
}) => {
  // Sur la landing page, le bouton Accueil est masqué
  const navItems = [
    { id: "landing", label: "Accueil", icon: Home, targetTab: "landing" },
    { id: "academy", label: "Académie", icon: GraduationCap, targetTab: "academy" },
    { id: "marketplace", label: "Marketplace", icon: ShoppingBag, targetTab: "marketplace" },
    { id: "services", label: "Services", icon: Briefcase, targetTab: "services" },
    { id: "member", label: "Compte", icon: User, targetTab: "member", requiresAuth: true },
  ];

  const visibleNavItems = isLandingPage ? navItems.filter((item) => item.id !== "landing") : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#011D46]/98 backdrop-blur-xl border-t-2 border-[#D69E25]/40 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className={`max-w-lg mx-auto grid ${isLandingPage ? "grid-cols-4" : "grid-cols-5"} gap-0.5 px-2 py-2`}>
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          const handleClick = () => {
            if (item.requiresAuth && !isUserLoggedIn) {
              onOpenAuthModal?.("login");
              return;
            }
            setActiveTab(item.targetTab);
          };

          return (
            <button
              key={item.id}
              onClick={handleClick}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? "bg-[#D69E25] text-[#021231] shadow-lg scale-105"
                  : "text-slate-300 hover:text-white"
              }`}
              title={item.label}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-[#021231]" : "text-[#D69E25]"}`} />
              <span className={`text-[10px] font-bold ${isActive ? "text-[#021231]" : ""}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};