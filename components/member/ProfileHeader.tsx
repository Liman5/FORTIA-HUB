"use client";

import React from "react";
import { BadgeCheck, BookOpen, Award, ShoppingBag, ShieldCheck, Pencil } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { IbxBadge, IbxButton } from "@/components/ui/Ibx";

export function ProfileHeader({
  user, badgeType, kycStatus, isProviderApproved, stats, onEdit, onOpenKyc,
}: {
  user: UserProfile;
  badgeType?: "green" | "gold" | "none";
  kycStatus: string;
  isProviderApproved: boolean;
  stats: { courses: number; certificates: number; purchases: number };
  onEdit: () => void;
  onOpenKyc?: () => void;
}) {
  const isGold = badgeType === "gold";
  const qualified = badgeType === "green" || badgeType === "gold";
  const kycVerified = kycStatus === "approuve";
  const initials = (user.name || user.email || "M").slice(0, 2).toUpperCase();

  return (
    <section className="ibx-surface overflow-hidden rounded-[var(--ibx-radius-lg)]">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name || "Membre"} className="h-16 w-16 shrink-0 rounded-[var(--ibx-radius-md)] object-cover sm:h-20 sm:w-20" />
          ) : (
            <div className="ibx-surface-muted flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--ibx-radius-md)] text-lg font-black sm:h-20 sm:w-20">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="ibx-fg truncate text-xl font-black tracking-tight sm:text-2xl">{user.name || "Membre"}</h1>
              {qualified && (
                <IbxBadge tone="success">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {isGold ? "Entreprise vérifiée" : "Profil qualifié"}
                </IbxBadge>
              )}
              {kycVerified ? (
                <IbxBadge tone="info"><ShieldCheck className="h-3.5 w-3.5" /> KYC vérifié</IbxBadge>
              ) : (
                <button type="button" onClick={onOpenKyc}><IbxBadge tone="warning"><ShieldCheck className="h-3.5 w-3.5" /> KYC non validé</IbxBadge></button>
              )}
            </div>
            <p className="ibx-fg-muted mt-1 truncate text-xs">
              {user.email}{user.phone ? ` · ${user.phone}` : ""}
            </p>
            <p className="ibx-fg-subtle mt-1 text-[11px]">
              {isProviderApproved ? "Espace professionnel actif" : "Membre IBXPress"}
            </p>
          </div>
        </div>

        <IbxButton type="button" variant="primary" onClick={onEdit} className="shrink-0 self-start sm:self-auto">
          <Pencil className="h-3.5 w-3.5" /> Modifier mon profil
        </IbxButton>
      </div>

      <div className="ibx-divider flex flex-wrap gap-x-8 gap-y-3 px-5 py-4 sm:px-6">
        <Stat icon={<BookOpen className="h-4 w-4" />} value={stats.courses} label="Formations" />
        <Stat icon={<Award className="h-4 w-4" />} value={stats.certificates} label="Certificats" />
        <Stat icon={<ShoppingBag className="h-4 w-4" />} value={stats.purchases} label="Achats" />
      </div>
    </section>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="ibx-fg-subtle">{icon}</span>
      <span className="ibx-fg text-base font-black">{value}</span>
      <span className="ibx-fg-muted text-[11px] font-semibold">{label}</span>
    </div>
  );
}
