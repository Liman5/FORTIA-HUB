"use client";

import React from "react";

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  suspended: "Suspendu",
  blocked: "Bloqué",
  deletion_pending: "Suppression en attente",
  anonymized: "Anonymisé",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  suspended: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  blocked: "bg-red-500/15 text-red-300 border-red-500/40",
  deletion_pending: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  anonymized: "bg-slate-500/15 text-slate-300 border-slate-500/40",
};

const KYC_LABELS: Record<string, string> = {
  non_soumis: "KYC non soumis",
  en_attente: "KYC en attente",
  approuve: "KYC approuvé",
  rejete: "KYC rejeté",
  suspendu: "KYC suspendu",
};

const ROLE_LABELS: Record<string, string> = {
  member: "Membre",
  instructor: "Formateur",
  vendor: "Vendeur",
  freelance: "Freelance",
  enterprise: "Entreprise",
  admin: "Administrateur",
};

export function UserStatusBadge({ status }: { status: string }) {
  const key = status || "active";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
        STATUS_STYLES[key] || STATUS_STYLES.active
      }`}
    >
      {STATUS_LABELS[key] || key}
    </span>
  );
}

export function KycBadge({ status }: { status: string }) {
  const approved = status === "approuve";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        approved
          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
          : status === "rejete"
            ? "bg-red-500/10 text-red-300 border-red-500/30"
            : "bg-slate-500/10 text-slate-300 border-slate-500/30"
      }`}
    >
      {KYC_LABELS[status] || status}
    </span>
  );
}

export function UserRoleBadges({ roles }: { roles: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {(roles || []).map((role) => (
        <span
          key={role}
          className="inline-flex items-center rounded-md bg-[#D69E25]/10 border border-[#D69E25]/30 px-1.5 py-0.5 text-[10px] font-semibold text-[#D69E25]"
        >
          {ROLE_LABELS[role] || role}
        </span>
      ))}
    </div>
  );
}

export function formatUserDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
