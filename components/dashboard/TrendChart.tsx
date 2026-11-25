"use client";

import React, { useMemo, useState } from "react";

export interface TrendChartPoint {
  date: string;
  value: number;
}

/**
 * Courbe d'évolution (SVG, sans dépendance externe).
 * Aire dégradée + ligne + grille + infobulle au survol : le rendu
 * « dashboard » attendu, dans les deux thèmes (tokens IBX).
 */
export function TrendChart({
  points,
  height = 180,
  formatValue,
  accent = "var(--ibx-accent)",
  emptyLabel = "Aucune donnée sur la période",
}: {
  points: TrendChartPoint[];
  height?: number;
  formatValue?: (value: number) => string;
  accent?: string;
  emptyLabel?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const geometry = useMemo(() => {
    const width = 100;
    const innerHeight = 36;
    const values = points.map((point) => Number(point.value) || 0);
    const max = Math.max(1, ...values);
    const step = points.length > 1 ? width / (points.length - 1) : width;

    const coords = values.map((value, index) => ({
      x: index * step,
      y: innerHeight - (value / max) * innerHeight,
    }));

    const line = coords
      .map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x.toFixed(2)},${coord.y.toFixed(2)}`)
      .join(" ");
    const area = `${line} L${width},${innerHeight} L0,${innerHeight} Z`;

    return { width, innerHeight, max, coords, line, area };
  }, [points]);

  const format = formatValue || ((value: number) => String(Math.round(value)));
  const activeIndex = hover !== null ? Math.min(Math.max(hover, 0), points.length - 1) : null;
  const activePoint = activeIndex !== null ? points[activeIndex] : null;

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-[var(--ibx-radius-md)] border border-dashed"
        style={{ height, borderColor: "var(--ibx-border)", color: "var(--ibx-fg-subtle)" }}
      >
        <span className="ibx-small">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="relative w-full"
        style={{ height }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          if (rect.width === 0) return;
          const ratio = (event.clientX - rect.left) / rect.width;
          setHover(Math.round(ratio * (points.length - 1)));
        }}
      >
        <svg
          viewBox={`0 0 ${geometry.width} ${geometry.innerHeight}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          role="img"
          aria-label="Courbe d'évolution"
        >
          <defs>
            <linearGradient id="ibxTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              x2={geometry.width}
              y1={geometry.innerHeight * ratio}
              y2={geometry.innerHeight * ratio}
              stroke="var(--ibx-border)"
              strokeWidth="0.25"
              strokeDasharray="1.2 1.2"
            />
          ))}

          <path d={geometry.area} fill="url(#ibxTrendFill)" />
          <path
            d={geometry.line}
            fill="none"
            stroke={accent}
            strokeWidth="0.7"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {activeIndex !== null && geometry.coords[activeIndex] && (
            <line
              x1={geometry.coords[activeIndex].x}
              x2={geometry.coords[activeIndex].x}
              y1="0"
              y2={geometry.innerHeight}
              stroke={accent}
              strokeWidth="0.3"
              strokeDasharray="1 1"
            />
          )}
        </svg>

        {activePoint && geometry.coords[activeIndex ?? 0] && (
          <div
            className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-[var(--ibx-radius-sm)] border px-2 py-1 text-[10px] font-bold shadow-sm"
            style={{
              left: `${((geometry.coords[activeIndex ?? 0].x / geometry.width) * 100).toFixed(2)}%`,
              backgroundColor: "var(--ibx-surface)",
              borderColor: "var(--ibx-border)",
              color: "var(--ibx-fg)",
            }}
          >
            <span className="block">{format(activePoint.value)}</span>
            <span className="block text-[9px] font-medium" style={{ color: "var(--ibx-fg-subtle)" }}>
              {new Date(`${activePoint.date}T00:00:00Z`).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          </div>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between text-[9px]" style={{ color: "var(--ibx-fg-subtle)" }}>
        <span>
          {new Date(`${points[0].date}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
        </span>
        <span>max {format(geometry.max)}</span>
        <span>
          {new Date(`${points[points.length - 1].date}T00:00:00Z`).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
          })}
        </span>
      </div>
    </div>
  );
}
