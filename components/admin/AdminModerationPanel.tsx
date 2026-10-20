"use client";

import React, { useState } from "react";
import { Course, DigitalProduct } from "@/lib/types";
import { ShieldAlert, RotateCcw, MessageSquare, ExternalLink, Snowflake } from "lucide-react";

/**
 * ADMIN → MODÉRATION
 * Liste les contenus suspendus (formations et produits) : motif, fonds gelés,
 * demande d'examen du propriétaire et rétablissement par l'administrateur.
 */
interface AdminModerationPanelProps {
  courses: Course[];
  products: DigitalProduct[];
  onRestore: (targetType: "course" | "product", id: string) => Promise<void> | void;
}

export function AdminModerationPanel({
  courses = [],
  products = [],
  onRestore,
}: AdminModerationPanelProps) {
  const [filter, setFilter] = useState<"all" | "course" | "product">("all");
  const [busy, setBusy] = useState<string | null>(null);

  const suspendedCourses = courses.filter((c) => c.moderationStatus === "suspended");
  const suspendedProducts = products.filter((p) => p.moderationStatus === "suspended");

  const items = [
    ...suspendedCourses.map((c) => ({
      key: `course-${c.id}`,
      type: "course" as const,
      id: c.id,
      title: c.title,
      owner: c.instructor?.name || "",
      price: c.price,
      reason: c.moderationReason || "",
      appeal: c.appealMessage || "",
      at: c.moderationAt || "",
      frozen: c.fundsFrozen !== false,
    })),
    ...suspendedProducts.map((p) => ({
      key: `product-${p.id}`,
      type: "product" as const,
      id: p.id,
      title: p.title,
      owner: (p as unknown as { storeName?: string }).storeName || "",
      price: p.price,
      reason: p.moderationReason || "",
      appeal: p.appealMessage || "",
      at: p.moderationAt || "",
      frozen: p.fundsFrozen !== false,
    })),
  ].filter((item) => filter === "all" || item.type === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Modération des contenus
          </h2>
          <p className="text-[11px] text-slate-400">
            {items.length} contenu{items.length > 1 ? "s" : ""} suspendu{items.length > 1 ? "s" : ""} —
            formations et produits non conformes.
          </p>
        </div>
        <div className="flex gap-1.5">
          {(["all", "course", "product"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition ${
                filter === f
                  ? "bg-[#D69E25] text-[#021231] border-[#D69E25]"
                  : "bg-[#011D46] text-slate-300 border-slate-700 hover:border-[#D69E25]"
              }`}
            >
              {f === "all" ? "Tout" : f === "course" ? "Formations" : "Produits"}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 && (
        <div className="rounded-2xl border border-slate-700 bg-[#011D46] p-6 text-center text-[11px] text-slate-400">
          Aucun contenu suspendu. Les suspensions prononcées depuis Formateurs ou Produits
          apparaîtront ici.
        </div>
      )}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.key} className="rounded-xl border border-red-500/30 bg-[#011D46] p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-red-500/15 border border-red-500/40 px-2 py-0.5 text-[9px] font-black text-red-300">
                {item.type === "course" ? "Formation suspendue" : "Produit suspendu"}
              </span>
              <span className="text-xs font-black text-white break-words flex-1 min-w-0">{item.title}</span>
              <span className="text-[11px] font-black text-[#D69E25]">${Number(item.price) || 0}</span>
            </div>

            <p className="text-[10px] text-slate-400">
              {item.owner && <>Auteur : {item.owner} - </>}
              {item.at ? String(item.at).slice(0, 10) : "date inconnue"} -{" "}
              {item.frozen ? (
                <span className="inline-flex items-center gap-1 text-sky-300">
                  <Snowflake className="w-3 h-3" /> fonds geles
                </span>
              ) : (
                <span className="text-emerald-300">fonds disponibles</span>
              )}
            </p>

            <p className="text-[11px] text-slate-300">
              <strong className="text-red-300">Motif :</strong> {item.reason || "-"}
            </p>

            {item.appeal && (
              <p className="text-[11px] text-slate-300 flex items-start gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#D69E25]" />
                <span>
                  <strong className="text-[#D69E25]">Demande d examen :</strong> {item.appeal}
                </span>
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={async () => {
                  if (!window.confirm(`Retablir "${item.title}" et degeler les fonds ?`)) return;
                  setBusy(item.key);
                  try {
                    await onRestore(item.type, item.id);
                  } finally {
                    setBusy(null);
                  }
                }}
                disabled={busy === item.key}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600/25 border border-emerald-500/40 text-emerald-300 text-[10px] font-black hover:bg-emerald-600 hover:text-white transition flex items-center gap-1.5 disabled:opacity-60"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retablir et degeler
              </button>
              <a
                href={item.type === "course" ? "/academy" : `/product/${item.id}`}
                className="px-2.5 py-1.5 rounded-lg bg-[#021231] border border-slate-700 text-slate-300 text-[10px] font-black hover:border-[#D69E25] transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Voir
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
