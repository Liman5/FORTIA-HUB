"use client";

import React from "react";
import { BadgeCheck, BookOpen, Award, ShoppingBag, ShieldCheck, Sparkles, Pencil } from "lucide-react";
import type { UserProfile } from "@/lib/types";

export function ProfileHeader({
  user,
  badgeType,
  kycStatus,
  isProviderApproved,
  stats,
  onEdit,
  onOpenKyc,
}: {
  user: UserProfile;
  badgeType?: "green" | "gold" | "none";
  kycStatus: string;
  isProviderApproved: boolean;
  stats: { courses: number; certificates: number; purchases: number };
  onEdit: () => void;
  onOpenKyc?: () => void;
}) {
  const qualified = badgeType === "green" || badgeType === "gold";
  const isGold = badgeType === "gold";
  const kycVerified = kycStatus === "approuve";
  const initials = (user.name || user.email || "M").slice(0, 2).toUpperCase();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="h-20 bg-gradient-to-r from-[#0B1F3A] via-[#12365C] to-[#1C4B7A]" />
      <div className="px-5 sm:px-7 pb-5">
        <div className="-mt-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-end gap-4 min-w-0">
            <div className="relative shrink-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || "Membre"}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white shadow-md bg-slate-100"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white shadow-md bg-slate-100 flex items-center justify-center text-slate-500 font-black text-2xl">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">
                  {user.name || "Membre"}
                </h1>
                {qualified && (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                    isGold
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}>
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {isGold ? "Profil vérifié — Entreprise" : "Profil qualifié"}
                  </span>
                )}
                {kycVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700">
                    <ShieldCheck className="w-3.5 h-3.5" /> Identité vérifiée
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenKyc}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> KYC non validé
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500 truncate">
                {user.email}
                {user.phone ? ` · ${user.phone}` : ""}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-[#B07A14]" />
                {isProviderApproved ? "Espace professionnel actif" : "Membre FORTIA HUB"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B1F3A] px-4 py-2.5 text-[11px] font-bold text-white hover:bg-[#12365C] transition"
            >
              <Pencil className="w-3.5 h-3.5" /> Modifier mon profil
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <Stat icon={<BookOpen className="w-4 h-4" />} value={stats.courses} label="Formations" />
          <Stat icon={<Award className="w-4 h-4" />} value={stats.certificates} label="Certificats" />
          <Stat icon={<ShoppingBag className="w-4 h-4" />} value={stats.purchases} label="Achats" />
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
      <span className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#B07A14] border border-slate-200">
        {icon}
      </span>
      <p className="text-lg font-black text-slate-900">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
