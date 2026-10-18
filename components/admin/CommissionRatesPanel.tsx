"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  CircleSlash,
  Loader2,
  Percent,
  Pencil,
  RefreshCw,
  Save,
  ShoppingCart,
  Wallet,
  X,
} from "lucide-react";
import { apiWritePlatform } from "@/lib/services/platformWrite";

/**
 * ADMIN → Marketplace → « Taux de Commission de la Plateforme ».
 *
 * • Récapitulatif RÉEL : combien de taux sont définis / actifs, et si le
 *   calcul fonctionne (ventes enregistrées + commission réellement prélevée).
 * • Un taux par type de vente : produits numériques, formations, services,
 *   stockage vidéo — en pourcentage OU en montant fixe par vente.
 * • Le taux général sert de repli quand aucun taux spécifique n'est actif.
 */

type Mode = "percent" | "fixed";

interface Rule {
  scope: string;
  mode: Mode;
  value: number;
  isActive: boolean;
  label: string;
  updatedAt?: string;
}

interface Stats {
  ordersCount: number;
  volumeUsd: number;
  commissionUsd: number;
  vendorPayoutUsd: number;
  lastOrderAt: string | null;
}

const SCOPE_LABELS: Record<string, string> = {
  general: "Taux général (par défaut)",
  digital_product: "Produits numériques",
  course: "Formations",
  service: "Prestations de services",
  storage: "Stockage vidéo (formateurs)",
};

const SCOPE_ORDER = ["general", "digital_product", "course", "service", "storage"];

const money = (n: number) =>
  `$${(Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const fcfa = (usd: number) => `${Math.round((Number(usd) || 0) * 600).toLocaleString("fr-FR")} FCFA`;

const dateLabel = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const CommissionRatesPanel: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  /** Ligne en cours d'édition (null = aucune). */
  const [editing, setEditing] = useState<Rule | null>(null);
  const [simulationUsd, setSimulationUsd] = useState(100);

  const adminHeaders = useCallback((): Record<string, string> => {
    let token = "";
    try {
      token = localStorage.getItem("fortia_admin_token") || "";
    } catch {
      token = "";
    }
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/commissions", {
        headers: adminHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        const list: Rule[] = (json.data?.rules || []).map((r: Rule) => ({
          scope: r.scope,
          mode: r.mode === "fixed" ? "fixed" : "percent",
          value: Number(r.value) || 0,
          isActive: r.isActive !== false,
          label: r.label || SCOPE_LABELS[r.scope] || r.scope,
          updatedAt: r.updatedAt,
        }));
        list.sort((a, b) => SCOPE_ORDER.indexOf(a.scope) - SCOPE_ORDER.indexOf(b.scope));
        setRules(list);
        setStats(json.data?.stats || null);
      } else {
        setError(json?.error || "Lecture des taux impossible.");
      }
    } catch {
      setError("Lecture des taux impossible (réseau).");
    } finally {
      setLoading(false);
    }
  }, [adminHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (rule: Rule) => {
    if (rule.mode === "percent" && (rule.value < 0 || rule.value > 100)) {
      setError("Le pourcentage doit être compris entre 0 et 100.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const res = await apiWritePlatform("save-commission-rule", {
      scope: rule.scope,
      mode: rule.mode,
      value: rule.value,
      isActive: rule.isActive,
    });
    setSaving(false);

    if (res.success) {
      setNotice(
        `${SCOPE_LABELS[rule.scope] || rule.scope} : ${
          rule.isActive ? "taux enregistré" : "taux désactivé"
        } (${rule.mode === "fixed" ? `${money(rule.value)} par vente` : `${rule.value} %`}).`
      );
      setEditing(null);
      await load();
    } else {
      setError(res.error || "Enregistrement impossible.");
    }
  };

  const defined = rules.length;
  const activeRules = rules.filter((r) => r.isActive);
  const general = rules.find((r) => r.scope === "general");

  /** Simulation avec le taux en cours d'édition (ou le taux général). */
  const simulated = useMemo(() => {
    const rule = editing || general;
    if (!rule) return { commission: 0, vendor: simulationUsd, percent: 0 };
    const amount = Math.max(0, Number(simulationUsd) || 0);
    const raw = rule.mode === "fixed" ? rule.value : (amount * rule.value) / 100;
    const commission = Math.min(Math.max(0, raw), amount);
    return {
      commission,
      vendor: amount - commission,
      percent: amount > 0 ? (commission / amount) * 100 : 0,
    };
  }, [editing, general, simulationUsd]);

  return (
    <div className="bg-[#021231] border border-slate-800 rounded-2xl p-5 space-y-5">
      {/* ===== EN-TÊTE ===== */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="space-y-1">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <Percent className="w-4 h-4 text-[#D69E25]" />
            <span>Taux de Commission de la Plateforme (Frais FORTIA)</span>
          </h4>
          <p className="text-xs text-slate-400 max-w-2xl">
            Un taux général, ou un taux propre à chaque type de vente (produit numérique, formation,
            service, stockage). Le calcul est appliqué côté serveur au moment du paiement.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="px-3 py-2 rounded-xl border border-slate-700 text-slate-300 hover:border-[#D69E25] transition text-xs font-bold flex items-center gap-2 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Actualiser
        </button>
      </div>

      {/* ===== RÉCAPITULATIF : combien de taux, et est-ce appliqué ? ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-[#011D46] border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Taux définis / actifs</span>
          <p className="text-lg font-black text-white">
            {defined} <span className="text-slate-500">/</span>{" "}
            <span className="text-emerald-400">{activeRules.length}</span>
          </p>
          <span className="text-[10px] text-slate-400">
            {general
              ? `Général : ${
                  general.mode === "fixed" ? money(general.value) : `${general.value} %`
                }${general.isActive ? " (actif)" : " (inactif)"}`
              : "Aucun taux général"}
          </span>
        </div>

        <div className="bg-[#011D46] border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Commission prélevée</span>
          <p className="text-lg font-black text-[#D69E25]">{money(stats?.commissionUsd || 0)}</p>
          <span className="text-[10px] text-slate-400">
            sur {stats?.ordersCount || 0} vente(s) enregistrée(s)
          </span>
        </div>

        <div className="bg-[#011D46] border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Volume des ventes</span>
          <p className="text-lg font-black text-white">{money(stats?.volumeUsd || 0)}</p>
          <span className="text-[10px] text-slate-400">≈ {fcfa(stats?.volumeUsd || 0)}</span>
        </div>

        <div className="bg-[#011D46] border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">État du calcul</span>
          <p className="text-sm font-black flex items-center gap-1.5 text-emerald-400">
            <BadgeCheck className="w-4 h-4" />
            {stats && stats.ordersCount > 0 ? "Appliqué et vérifié" : "Actif (aucune vente encore)"}
          </p>
          <span className="text-[10px] text-slate-400">
            Dernière vente : {dateLabel(stats?.lastOrderAt)}
          </span>
        </div>
      </div>

      {notice && (
        <p className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
          {notice}
        </p>
      )}
      {error && (
        <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          {error}
        </p>
      )}

      {/* ===== LISTE DES TAUX PAR TYPE DE VENTE ===== */}
      <div className="space-y-2">
        <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Taux par type de vente
        </h5>

        {loading && rules.length === 0 ? (
          <p className="text-xs text-slate-400 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Chargement des taux…
          </p>
        ) : (
          <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 overflow-hidden">
            {rules.map((rule) => {
              const isEditing = editing?.scope === rule.scope;
              return (
                <div key={rule.scope} className="p-3 bg-[#011D46]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                        {SCOPE_LABELS[rule.scope] || rule.scope}
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                            rule.isActive
                              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/40"
                              : "text-slate-400 bg-slate-500/10 border-slate-600"
                          }`}
                        >
                          {rule.isActive ? "Actif" : "Inactif"}
                        </span>
                        {rule.scope !== "general" && !rule.isActive && general?.isActive && (
                          <span className="text-[9px] font-bold text-slate-500">
                            repli : taux général
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {rule.mode === "fixed"
                          ? `${money(rule.value)} fixe par vente`
                          : `${rule.value} % du montant`}
                        <span className="text-slate-600"> · maj {dateLabel(rule.updatedAt)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setNotice("");
                          setError("");
                          setEditing(
                            isEditing
                              ? null
                              : { ...rule, label: SCOPE_LABELS[rule.scope] || rule.label }
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-black border border-slate-700 text-slate-200 hover:border-[#D69E25] transition flex items-center gap-1.5"
                      >
                        {isEditing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                        {isEditing ? "Fermer" : "Modifier"}
                      </button>
                      <button
                        type="button"
                        onClick={() => save({ ...rule, isActive: !rule.isActive })}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black border transition flex items-center gap-1.5 ${
                          rule.isActive
                            ? "border-red-500/40 text-red-400 hover:bg-red-600 hover:text-white"
                            : "border-emerald-500/40 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                        }`}
                      >
                        {rule.isActive ? (
                          <CircleSlash className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        {rule.isActive ? "Désactiver" : "Activer"}
                      </button>
                    </div>
                  </div>

                  {/* Formulaire d'édition du taux */}
                  {isEditing && editing && (
                    <div className="mt-3 p-3 rounded-xl bg-[#021231] border border-slate-700 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex rounded-xl overflow-hidden border border-slate-700">
                          {(["percent", "fixed"] as Mode[]).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setEditing({ ...editing, mode })}
                              className={`px-3 py-2 text-[11px] font-black transition ${
                                editing.mode === mode
                                  ? "bg-[#D69E25] text-[#021231]"
                                  : "bg-[#011D46] text-slate-300 hover:text-white"
                              }`}
                            >
                              {mode === "percent" ? "Pourcentage" : "Montant fixe"}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={editing.mode === "percent" ? 100 : undefined}
                            step="0.5"
                            value={editing.value}
                            onChange={(e) =>
                              setEditing({ ...editing, value: Number(e.target.value) || 0 })
                            }
                            className="w-24 bg-[#011D46] border border-slate-700 text-center font-bold text-sm rounded-xl p-2 text-white focus:outline-none focus:border-[#D69E25]"
                          />
                          <span className="text-sm font-black text-[#D69E25]">
                            {editing.mode === "percent" ? "%" : "$ / vente"}
                          </span>
                        </div>

                        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                          <input
                            type="checkbox"
                            checked={editing.isActive}
                            onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                            className="w-4 h-4 accent-[#D69E25]"
                          />
                          Taux actif
                        </label>

                        <button
                          type="button"
                          onClick={() => save(editing)}
                          disabled={saving}
                          className="px-4 py-2 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition flex items-center gap-2 disabled:opacity-60"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Enregistrer
                        </button>
                      </div>

                      {/* Simulation chiffrée */}
                      <div className="rounded-xl border border-slate-700 bg-[#011D46] p-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-[#D69E25]" />
                          <span className="text-[11px] font-bold text-slate-300">
                            Simulation sur une vente de
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={simulationUsd}
                            onChange={(e) => setSimulationUsd(Number(e.target.value) || 0)}
                            className="w-24 bg-[#021231] border border-slate-700 text-center font-bold text-sm rounded-lg p-1.5 text-white focus:outline-none focus:border-[#D69E25]"
                          />
                          <span className="text-[11px] font-bold text-slate-400">
                            $ ({fcfa(simulationUsd)})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                          <div className="flex items-center gap-1.5 text-[#D69E25] font-bold">
                            <Percent className="w-3.5 h-3.5" />
                            Commission : {money(simulated.commission)} ({simulated.percent.toFixed(1)} %)
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                            <Wallet className="w-3.5 h-3.5" />
                            Part vendeur : {money(simulated.vendor)}
                          </div>
                          <div className="text-slate-400">
                            Arrondi au centime · plafonné au montant de la vente
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-500 leading-relaxed">
        Le taux spécifique d'un type de vente est prioritaire ; s'il est inactif, le taux général
        s'applique. Le montant prélevé est recalculé côté serveur à chaque paiement : la valeur envoyée
        par le navigateur n'est jamais utilisée pour fixer la commission.
      </p>
    </div>
  );
};

export default CommissionRatesPanel;

