"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Eye, MousePointerClick, ShoppingCart, TrendingUp, Wallet } from "lucide-react";

/**
 * Statistiques RÉELLES de la boutique (vues, clics, ajouts au panier,
 * ventes et revenus). Aucune valeur fictive : tout vient de la base.
 */
interface StatsPayload {
  store: { id: string; name: string } | null;
  events: {
    last7d: { views: number; clicks: number; cartAdds: number };
    total: { views: number; clicks: number; cartAdds: number };
  } | null;
  sales: {
    ordersCount: number;
    revenueUsd: number;
    days: { date: string; orders: number; revenueUsd: number }[];
  } | null;
  topProducts: { id: string; title: string; salesCount: number; price: unknown }[];
}

const money = (n: number) =>
  `$${(Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export const VendorStatsPanel: React.FC<{ storeId?: string }> = ({ storeId }) => {
  const [data, setData] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const url = storeId
      ? `/api/vendor/stats?storeId=${encodeURIComponent(storeId)}`
      : "/api/vendor/stats";
    fetch(url, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.success) setData(json.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const maxOrders = useMemo(
    () => Math.max(1, ...(data?.sales?.days || []).map((d) => d.orders)),
    [data]
  );

  const events = data?.events?.last7d;

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#021231] p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#D69E25]" />
          Statistiques de la boutique
        </h3>
        <span className="text-[10px] font-bold text-slate-500">7 derniers jours</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="rounded-xl border border-slate-800 bg-[#011D46] p-3">
          <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <Eye className="w-3 h-3 text-[#D69E25]" /> Vues
          </span>
          <p className="text-xl font-black text-white mt-1">{loading ? "…" : events?.views ?? 0}</p>
          <span className="text-[10px] text-slate-500">total : {data?.events?.total.views ?? 0}</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#011D46] p-3">
          <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <MousePointerClick className="w-3 h-3 text-[#D69E25]" /> Clics
          </span>
          <p className="text-xl font-black text-white mt-1">{loading ? "…" : events?.clicks ?? 0}</p>
          <span className="text-[10px] text-slate-500">total : {data?.events?.total.clicks ?? 0}</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#011D46] p-3">
          <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <ShoppingCart className="w-3 h-3 text-[#D69E25]" /> Ajouts panier
          </span>
          <p className="text-xl font-black text-white mt-1">{loading ? "…" : events?.cartAdds ?? 0}</p>
          <span className="text-[10px] text-slate-500">total : {data?.events?.total.cartAdds ?? 0}</span>
        </div>

        <div className="rounded-xl border border-[#D69E25]/40 bg-[#011D46] p-3">
          <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <Wallet className="w-3 h-3 text-[#D69E25]" /> Ventes
          </span>
          <p className="text-xl font-black text-[#D69E25] mt-1">
            {loading ? "…" : money(data?.sales?.revenueUsd || 0)}
          </p>
          <span className="text-[10px] text-slate-500">{data?.sales?.ordersCount ?? 0} commande(s)</span>
        </div>
      </div>

      {/* Graphique : commandes par jour (données réelles) */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-[#D69E25]" /> Commandes par jour
        </p>
        <div className="flex items-end gap-1.5 h-24 sm:h-28">
          {(data?.sales?.days || []).map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-[#D69E25]/30 to-[#D69E25] min-h-[3px]"
                style={{ height: `${Math.round((day.orders / maxOrders) * 100)}%` }}
                title={`${day.date} — ${day.orders} commande(s) · ${money(day.revenueUsd)}`}
              />
              <span className="text-[8px] text-slate-500">{day.date.slice(8, 10)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top produits (ventes réelles) */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          Meilleures ventes
        </p>
        {(data?.topProducts || []).length === 0 ? (
          <p className="text-xs text-slate-500">Aucune vente enregistrée pour le moment.</p>
        ) : (
          (data?.topProducts || []).map((prod) => (
            <div key={prod.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-200 truncate">{prod.title}</span>
              <span className="text-slate-400 shrink-0">
                {prod.salesCount || 0} vente(s) · {money(Number(prod.price) || 0)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VendorStatsPanel;
