"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Loader2, Eye, MousePointerClick, ShoppingCart, Wallet } from "lucide-react";
import type { ProductAnalytics } from "@/lib/data/analyticsTypes";
import { useAppStore } from "@/lib/store/AppStore";
import { resolveMoneyConfig, formatFcfa } from "@/lib/data/currency";
import { TrendChart } from "./TrendChart";
import { KpiCard } from "./KpiCard";

type Metric = "views" | "clicks" | "carts" | "sales";

/**
 * Statistiques détaillées d'un produit (30 derniers jours) :
 * vues, clics, ajouts au panier, ventes et revenus — données réelles.
 */
export function ProductAnalyticsModal({
  productId,
  onClose,
}: {
  productId: string;
  onClose: () => void;
}) {
  const { siteContent } = useAppStore();
  const money = useMemo(() => resolveMoneyConfig(siteContent), [siteContent]);
  const [data, setData] = useState<ProductAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metric, setMetric] = useState<Metric>("views");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/analytics/product?productId=${encodeURIComponent(productId)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        const payload = await response.json();
        if (!cancelled) setData(payload?.analytics || null);
      })
      .catch(() => {
        if (!cancelled) setError("Statistiques indisponibles pour ce produit.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const points = useMemo(() => {
    if (!data) return [];
    return data.series.map((point) => ({ date: point.date, value: point[metric] }));
  }, [data, metric]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-6">
      <div
        className="ibx-card relative max-h-[90vh] w-full max-w-3xl overflow-y-auto p-4 sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-label="Statistiques du produit"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border"
          style={{
            borderColor: "var(--ibx-border)",
            color: "var(--ibx-fg-muted)",
            backgroundColor: "var(--ibx-surface)",
          }}
          aria-label="Fermer"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="space-y-1 pr-8">
          <span className="ibx-label">Statistiques produit · 30 jours</span>
          <h2 className="ibx-h2">{data?.product.title || "Analyse du produit"}</h2>
          {data?.product.categoryLabel && <p className="ibx-tiny">{data.product.categoryLabel}</p>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--ibx-accent)" }} />
          </div>
        ) : error || !data ? (
          <p className="ibx-small mt-4">{error || "Aucune donnée disponible."}</p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <KpiCard label="Vues" value={String(data.totals.views)} icon={Eye} tone="info" />
              <KpiCard label="Clics" value={String(data.totals.clicks)} icon={MousePointerClick} tone="neutral" />
              <KpiCard label="Paniers" value={String(data.totals.carts)} icon={ShoppingCart} tone="accent" />
              <KpiCard
                label="Ventes"
                value={String(data.totals.sales)}
                hint={formatFcfa(data.totals.revenue * money.rate, 0)}
                icon={Wallet}
                tone="success"
              />
            </div>

            <div className="ibx-card-flat p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="ibx-h3 !text-[12px]">Évolution</p>
                <div className="ibx-toolbar">
                  {([
                    { id: "views" as Metric, label: "Vues" },
                    { id: "clicks" as Metric, label: "Clics" },
                    { id: "carts" as Metric, label: "Paniers" },
                    { id: "sales" as Metric, label: "Ventes" },
                  ]).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setMetric(option.id)}
                      className="ibx-chip !px-2 !py-0.5 !text-[9.5px]"
                      data-active={metric === option.id ? "true" : "false"}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <TrendChart points={points} height={150} emptyLabel="Aucune activité sur la période" />
            </div>

            <div>
              <p className="ibx-h3 !text-[12px]">Dernières commandes</p>
              {data.recentOrders.length === 0 ? (
                <p className="ibx-tiny mt-1">Aucune commande récente.</p>
              ) : (
                <div className="mt-1.5 space-y-1">
                  {data.recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between gap-2 rounded border px-2 py-1"
                      style={{ borderColor: "var(--ibx-border)" }}
                    >
                      <span className="min-w-0 truncate text-[10px]">
                        {order.buyerName} · {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="ibx-badge !text-[8.5px]">{order.status}</span>
                        <span className="text-[10px] font-bold" style={{ color: "var(--ibx-accent-strong)" }}>
                          {formatFcfa(order.amount * money.rate, 0)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
