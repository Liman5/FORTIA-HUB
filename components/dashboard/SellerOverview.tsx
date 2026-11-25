"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Wallet,
  ShoppingBag,
  ShoppingCart,
  GraduationCap,
  Loader2,
  BarChart3,
} from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { resolveMoneyConfig, formatFcfa } from "@/lib/data/currency";
import type { SellerOverview as SellerOverviewData } from "@/lib/data/analyticsTypes";
import { KpiCard } from "./KpiCard";
import { TrendChart } from "./TrendChart";

type Metric = "revenue" | "orders" | "views";

/** Vue d'ensemble vendeur / formateur : chiffres réels de l'API analytics. */
export function SellerOverview({ role }: { role: "vendor" | "instructor" }) {
  const { siteContent } = useAppStore();
  const money = useMemo(() => resolveMoneyConfig(siteContent), [siteContent]);
  const [data, setData] = useState<SellerOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metric, setMetric] = useState<Metric>("revenue");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/analytics/overview?role=${role}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("overview_failed");
        const payload = await response.json();
        if (!cancelled) setData(payload?.overview || null);
      })
      .catch(() => {
        if (!cancelled) setError("Statistiques indisponibles pour le moment.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  const chartPoints = useMemo(() => {
    if (!data) return [];
    return data.series.map((point) => ({
      date: point.date,
      value:
        metric === "revenue" ? point.revenue : metric === "orders" ? point.orders : point.views,
    }));
  }, [data, metric]);

  const formatValue = (value: number) =>
    metric === "revenue" ? formatFcfa(value * money.rate, 0) : String(Math.round(value));

  if (loading) {
    return (
      <div className="ibx-card flex items-center justify-center p-10">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--ibx-accent)" }} />
        <span className="ibx-small ml-2">Chargement de vos statistiques…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="ibx-card p-5">
        <p className="ibx-h3">Statistiques indisponibles</p>
        <p className="ibx-small mt-1">{error || "Réessayez dans un instant."}</p>
      </div>
    );
  }

  const isVendor = data.role === "vendor";

  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <h2 className="ibx-h2 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" style={{ color: "var(--ibx-accent-strong)" }} aria-hidden="true" />
          Vue d&apos;ensemble
        </h2>
        <p className="ibx-small mt-0.5">Activité réelle des 30 derniers jours.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard
          label="Chiffre d'affaires"
          value={formatFcfa(data.kpis.revenue * money.rate, 0)}
          hint={`${data.kpis.orders} commande${data.kpis.orders > 1 ? "s" : ""} payée${data.kpis.orders > 1 ? "s" : ""}`}
          icon={Wallet}
          tone="success"
        />
        <KpiCard
          label={isVendor ? "Vos gains" : "Revenus nets"}
          value={formatFcfa(data.kpis.earnings * money.rate, 0)}
          hint="Après commission plateforme"
          icon={TrendingUp}
          tone="accent"
        />
        <KpiCard
          label={isVendor ? "Produits" : "Formations"}
          value={String(data.kpis.items)}
          hint={isVendor ? "Publiés dans votre boutique" : "Cours en ligne"}
          icon={isVendor ? ShoppingBag : GraduationCap}
          tone="info"
        />
        {isVendor ? (
          <KpiCard
            label="Ajouts au panier"
            value={String(data.kpis.carts)}
            hint={`${data.kpis.clicks} clics · ${data.kpis.views} vues`}
            icon={ShoppingCart}
            tone="neutral"
          />
        ) : (
          <KpiCard
            label="Apprenants"
            value={String(data.kpis.students)}
            hint={`${data.kpis.views} inscription(s) sur 30 j`}
            icon={GraduationCap}
            tone="neutral"
          />
        )}
      </div>

      <div className="ibx-card p-3.5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="ibx-h3 !text-[12px]">
            {metric === "revenue" ? "Revenus" : metric === "orders" ? "Commandes" : isVendor ? "Vues" : "Inscriptions"}
          </p>
          <div className="ibx-toolbar">
            {(["revenue", "orders", "views"] as Metric[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMetric(option)}
                className="ibx-chip !px-2 !py-0.5 !text-[9.5px]"
                data-active={metric === option ? "true" : "false"}
              >
                {option === "revenue" ? "Revenus" : option === "orders" ? "Commandes" : isVendor ? "Vues" : "Inscriptions"}
              </button>
            ))}
          </div>
        </div>
        <TrendChart
          points={chartPoints}
          height={170}
          formatValue={formatValue}
          emptyLabel="Aucune activité enregistrée sur les 30 derniers jours"
        />
      </div>

      {/* Entonnoir + catégories */}
      {isVendor && (data.funnel.views > 0 || data.funnel.carts > 0) && (
        <div className="grid gap-2.5 lg:grid-cols-2">
          <div className="ibx-card p-3.5">
            <p className="ibx-h3 !text-[12px]">Entonnoir de conversion</p>
            <div className="mt-2 space-y-1.5">
              {[
                { label: "Vues", value: data.funnel.views },
                { label: "Clics", value: data.funnel.clicks },
                { label: "Paniers", value: data.funnel.carts },
                { label: "Ventes", value: data.funnel.orders },
              ].map((step) => (
                <div key={step.label} className="flex items-center gap-2">
                  <span className="ibx-tiny w-14 shrink-0 !text-[9.5px]">{step.label}</span>
                  <span
                    className="h-2 flex-1 overflow-hidden rounded-full"
                    style={{ backgroundColor: "var(--ibx-surface-muted)" }}
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (step.value / Math.max(1, data.funnel.views)) * 100)}%`,
                        backgroundColor: "var(--ibx-accent)",
                      }}
                    />
                  </span>
                  <span
                    className="w-10 shrink-0 text-right text-[9.5px] font-bold"
                    style={{ color: "var(--ibx-fg)" }}
                  >
                    {step.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="ibx-card p-3.5">
            <p className="ibx-h3 !text-[12px]">Répartition par catégorie</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.categories.map((item) => (
                <span key={item.label} className="ibx-chip !cursor-default">
                  {item.label}
                  <span className="text-[9px] font-bold opacity-70">{item.count}</span>
                </span>
              ))}
              {data.categories.length === 0 && (
                <p className="ibx-tiny">Aucune catégorie pour le moment.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Meilleurs contenus */}
      <div className="ibx-card p-3.5">
        <p className="ibx-h3 !text-[12px]">Meilleurs {isVendor ? "produits" : "formations"}</p>
        {data.topItems.length === 0 ? (
          <p className="ibx-tiny mt-2">Rien à afficher pour le moment.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[10.5px]">
              <thead>
                <tr style={{ color: "var(--ibx-fg-subtle)" }}>
                  <th className="py-1 font-semibold">Contenu</th>
                  <th className="py-1 text-right font-semibold">{isVendor ? "Vues" : "Inscrits"}</th>
                  {isVendor && <th className="py-1 text-right font-semibold">Clics</th>}
                  {isVendor && <th className="py-1 text-right font-semibold">Paniers</th>}
                  <th className="py-1 text-right font-semibold">Ventes</th>
                  <th className="py-1 text-right font-semibold">Revenus</th>
                </tr>
              </thead>
              <tbody>
                {data.topItems.map((item) => (
                  <tr key={item.id} className="border-t" style={{ borderColor: "var(--ibx-border)" }}>
                    <td className="max-w-[220px] py-1.5">
                      <span className="flex items-center gap-2">
                        <span
                          className="flex h-7 w-7 shrink-0 overflow-hidden rounded"
                          style={{ backgroundColor: "var(--ibx-surface-muted)" }}
                        >
                          {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : null}
                        </span>
                        <span className="truncate font-semibold" style={{ color: "var(--ibx-fg)" }}>
                          {item.title}
                        </span>
                      </span>
                    </td>
                    <td className="py-1.5 text-right">{item.views}</td>
                    {isVendor && <td className="py-1.5 text-right">{item.clicks}</td>}
                    {isVendor && <td className="py-1.5 text-right">{item.carts}</td>}
                    <td className="py-1.5 text-right font-bold">{item.sales}</td>
                    <td className="py-1.5 text-right font-bold" style={{ color: "var(--ibx-accent-strong)" }}>
                      {formatFcfa(item.revenue * money.rate, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dernières commandes */}
      <div className="ibx-card p-3.5">
        <p className="ibx-h3 !text-[12px]">Dernières commandes</p>
        {data.recentOrders.length === 0 ? (
          <p className="ibx-tiny mt-2">Aucune commande enregistrée sur la période.</p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {data.recentOrders.slice(0, 6).map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1.5"
                style={{ borderColor: "var(--ibx-border)" }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[10.5px] font-semibold" style={{ color: "var(--ibx-fg)" }}>
                    {order.productTitle}
                  </span>
                  <span className="ibx-tiny block !text-[9px]">
                    {order.buyerName} · {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="ibx-badge !text-[9px]">{order.status}</span>
                  <span className="text-[10.5px] font-bold" style={{ color: "var(--ibx-accent-strong)" }}>
                    {formatFcfa(order.amount * money.rate, 0)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
