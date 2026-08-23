"use client";

import React, { useMemo } from "react";

/* ============================================================
   COMPOSANTS DE GRAPHIQUES SVG PERSONNALISÉS
   Aucune dépendance externe - 100% SVG natif
   ============================================================ */

interface LineChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  suffix?: string;
}

export function LineChart({
  data,
  labels = [],
  height = 200,
  color = "#D69E25",
  gradientFrom = "rgba(214, 158, 37, 0.25)",
  gradientTo = "rgba(214, 158, 37, 0)",
  suffix = "",
}: LineChartProps) {
  const { points, path, areaPath, maxVal, minVal } = useMemo(() => {
    if (!data.length) return { points: [], path: "", areaPath: "", maxVal: 0, minVal: 0 };
    const max = Math.max(...data, 1) * 1.1;
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const w = 100;
    const h = 100;
    const pts = data.map((v, i) => ({
      x: (i / Math.max(data.length - 1, 1)) * w,
      y: h - ((v - min) / range) * h,
    }));
    const p = pts
      .map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(2)},${pt.y.toFixed(2)}`)
      .join(" ");
    const a = `${p} L100,100 L0,100 Z`;
    return { points: pts, path: p, areaPath: a, maxVal: max, minVal: min };
  }, [data]);

  const cid = useMemo(() => `lg-${Math.random().toString(36).slice(2, 9)}`, []);

  if (!data.length) {
    return <div className="text-xs text-slate-500 italic py-8 text-center">Aucune donnée à afficher</div>;
  }

  return (
    <div className="w-full">
      <svg viewBox={`0 0 100 ${100 + (labels.length ? 12 : 0)}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={cid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>
        {/* Grille horizontale */}
        {[0, 25, 50, 75].map((g) => (
          <line key={g} x1="0" y1={g + 6} x2="100" y2={g + 6} stroke="rgba(148,163,184,0.1)" strokeWidth="0.3" strokeDasharray="2,3" />
        ))}
        {/* Aire sous la courbe */}
        <path d={areaPath} fill={`url(#${cid})`} />
        {/* Ligne principale */}
        <path d={path} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {/* Points */}
        {points.map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y + 6} r="1.4" fill={color} stroke="#021231" strokeWidth="0.5" />
            <title>{`${labels[i] || "Point " + (i + 1)} : ${data[i]}${suffix}`}</title>
          </g>
        ))}
      </svg>
      {labels.length > 0 && (
        <div className="flex justify-between px-1 mt-1">
          {labels.map((l, i) => (
            <span key={i} className="text-[8px] text-slate-500 font-medium truncate max-w-[40px]">{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  suffix?: string;
}

export function BarChart({ data, height = 220, suffix = "" }: BarChartProps) {
  const maxVal = useMemo(() => Math.max(...data.map((d) => d.value), 1) * 1.1, [data]);

  if (!data.length) {
    return <div className="text-xs text-slate-500 italic py-8 text-center">Aucune donnée à afficher</div>;
  }

  return (
    <div className="w-full flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full group">
          <span className="text-[9px] font-black text-slate-300 opacity-0 group-hover:opacity-100 transition">
            {d.value.toLocaleString("fr-FR")}{suffix}
          </span>
          <div
            className="w-full rounded-t-lg transition-all duration-500 group-hover:brightness-125"
            style={{
              height: `${(d.value / maxVal) * 100}%`,
              background: d.color || "linear-gradient(180deg, #D69E25, #AB6F10)",
              minHeight: d.value > 0 ? "6px" : "2px",
              opacity: d.value > 0 ? 1 : 0.15,
            }}
          />
          <span className="text-[8px] text-slate-500 font-semibold truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSubLabel?: string;
}

export function DonutChart({ data, size = 200, thickness = 24, centerLabel = "", centerSubLabel = "" }: DonutChartProps) {
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;

  if (!total) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-xs text-slate-500 italic">Aucune donnée</span>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.12)"
          strokeWidth={thickness}
        />
        {data.map((d, i) => {
          const fraction = d.value / total;
          const dash = fraction * circumference;
          const offset = -cumulative * circumference;
          cumulative += fraction;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
            >
              <title>{`${d.label} : ${d.value}`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-black text-white">{centerLabel}</span>
        {centerSubLabel && <span className="text-[9px] text-slate-400 font-semibold">{centerSubLabel}</span>}
      </div>
    </div>
  );
}

interface RadialProgressProps {
  value: number;
  max?: number;
  size?: number;
  color?: string;
  label?: string;
  suffix?: string;
}

export function RadialProgress({ value, max = 100, size = 120, color = "#10B981", label = "", suffix = "%" }: RadialProgressProps) {
  const thickness = 10;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min((value / max) * 100, 100);
  const dash = (pct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.15)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-white">{Math.round(pct)}{suffix}</span>
        {label && <span className="text-[8px] text-slate-400 font-semibold">{label}</span>}
      </div>
    </div>
  );
}

interface SparklineProps {
  data: number[];
  color?: string;
}

export function Sparkline({ data, color = "#10B981" }: SparklineProps) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * 100;
    const y = 30 - ((v - min) / range) * 26;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const lastPct = ((data[data.length - 1] - min) / range) * 100;
  const lastY = 30 - (lastPct / 100) * 26;

  return (
    <svg viewBox="0 0 100 32" className="w-full h-8" preserveAspectRatio="none">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={100} cy={lastY} r="2" fill={color} />
    </svg>
  );
}