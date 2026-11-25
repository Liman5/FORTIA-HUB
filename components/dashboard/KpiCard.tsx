"use client";

import React from "react";

/**
 * Carte d'indicateur (KPI) d'un tableau de bord : libellé, valeur mise en
 * avant, précision et icône. Style plat, contours visibles, aucun effet.
 */
export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "accent",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ElementType;
  tone?: "accent" | "success" | "info" | "neutral" | "danger";
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    accent: { bg: "var(--ibx-accent-soft)", fg: "var(--ibx-accent-strong)" },
    success: { bg: "var(--ibx-success-soft)", fg: "var(--ibx-success)" },
    info: { bg: "var(--ibx-info-soft)", fg: "var(--ibx-info)" },
    danger: { bg: "var(--ibx-danger-soft)", fg: "var(--ibx-danger)" },
    neutral: { bg: "var(--ibx-surface-muted)", fg: "var(--ibx-fg-muted)" },
  };
  const toneStyle = tones[tone] || tones.accent;
  const Icon = icon;

  return (
    <div className="ibx-card-flat flex items-start gap-2.5 p-3">
      {Icon && (
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--ibx-radius-sm)]"
          style={{ backgroundColor: toneStyle.bg, color: toneStyle.fg }}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0">
        <p className="ibx-label truncate">{label}</p>
        <p className="mt-0.5 truncate text-base font-extrabold leading-tight" style={{ color: "var(--ibx-fg)" }}>
          {value}
        </p>
        {hint && <p className="ibx-tiny mt-0.5 truncate !text-[9px]">{hint}</p>}
      </div>
    </div>
  );
}
