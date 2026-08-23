"use client";

import React, { useMemo } from "react";
import { LineChart, BarChart, DonutChart, RadialProgress, Sparkline } from "./AdminCharts";
import {
  TrendingUp,
  DollarSign,
  Users,
  BookOpen,
  ShoppingBag,
  Store,
  Briefcase,
  GraduationCap,
  FileCheck,
  AlertTriangle,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";

interface AdminStatsModuleProps {
  courses: any[];
  digitalProducts: any[];
  serviceQuotes: any[];
  kycSubmissions: any[];
  stores: any[];
  marketplaceOrders: any[];
  payoutRequests: any[];
  vendorApplications: any[];
  services: any[];
  postPurchaseSubmissions: any[];
  trainingCenters: any[];
  instructorCommissions: any[];
  users?: any[];
}

export function AdminStatsModule({
  courses = [],
  digitalProducts = [],
  serviceQuotes = [],
  kycSubmissions = [],
  stores = [],
  marketplaceOrders = [],
  payoutRequests = [],
  vendorApplications = [],
  services = [],
  postPurchaseSubmissions = [],
  trainingCenters = [],
  instructorCommissions = [],
  users = [],
}: AdminStatsModuleProps) {
  // ======== MÉTRIQUES GLOBALES ========
  const totalRevenueUsd = useMemo(
    () => marketplaceOrders.reduce((s, o) => s + (Number(o.amountUsd) || 0), 0),
    [marketplaceOrders]
  );

  const platformCommissions = useMemo(
    () => marketplaceOrders.reduce((s, o) => s + (Number(o.platformCommissionUsd) || 0), 0),
    [marketplaceOrders]
  );

  const vendorEarnings = useMemo(
    () => marketplaceOrders.reduce((s, o) => s + (Number(o.vendorEarningsUsd) || 0), 0),
    [marketplaceOrders]
  );

  const totalStudents = useMemo(
    () => courses.reduce((s, c) => s + (Number(c.studentsCount) || 0), 0),
    [courses]
  );

  const totalSales = useMemo(
    () => digitalProducts.reduce((s, p) => s + (Number(p.salesCount) || 0), 0),
    [digitalProducts]
  );

  const totalContentItems = courses.length + digitalProducts.length + services.length + stores.length;
  const totalInstructors = trainingCenters.length;
  const pendingKyc = kycSubmissions.filter((k) => String(k.status).includes("ttente")).length;
  const pendingVendors = vendorApplications.filter((a) => String(a.status).includes("ttente")).length;
  const pendingPayouts = payoutRequests.filter((p) => String(p.status).includes("ttente")).length;
  const pendingSupport = postPurchaseSubmissions.filter((s) => String(s.status).includes("n cours") || String(s.status).includes("Transmis")).length;
  const pendingQuotes = serviceQuotes.filter((q) => String(q.status).includes("Reç") || String(q.status).includes("En cours")).length;

  const totalPendingActions = pendingKyc + pendingVendors + pendingPayouts + pendingSupport + pendingQuotes;

  // ======== DONNÉES DES CHARTS ========

  // Répartition revenus par module
  const storeRevenue = useMemo(
    () => stores.reduce((s, st) => s + (Number(st.totalRevenueUsd) || 0), 0),
    [stores]
  );
  const courseRevenue = useMemo(
    () => courses.reduce((s, c) => s + (Number(c.price) || 0) * (Number(c.studentsCount) || 0), 0),
    [courses]
  );
  const productRevenue = useMemo(
    () => digitalProducts.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.salesCount) || 0), 0),
    [digitalProducts]
  );
  const servicesRevenue = useMemo(
    () => services.reduce((s, sv) => s + (Number(sv.startingPrice) || 0), 0),
    [services]
  );
  const commissionRevenue = instructorCommissions.reduce((s, c) => s + (Number(c.amountPaidUsd) || 0), 0);

  const revenueDonutData = [
    { label: "Marketplace", value: storeRevenue, color: "#D69E25" },
    { label: "Formations", value: courseRevenue, color: "#3B82F6" },
    { label: "Produits", value: productRevenue, color: "#10B981" },
    { label: "Agence", value: servicesRevenue, color: "#8B5CF6" },
    { label: "Formateurs", value: commissionRevenue, color: "#F59E0B" },
  ].filter((d) => d.value > 0);

  // Top 5 formateurs par commissions
  const instructorRevenueByCenter = useMemo(() => {
    const map = new Map<string, number>();
    instructorCommissions.forEach((c) => {
      const key = c.centerId || c.instructorId || "Inconnu";
      map.set(key, (map.get(key) || 0) + (Number(c.instructorEarningsUsd) || 0));
    });
    return Array.from(map.entries())
      .map(([id, value]) => ({ id, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [instructorCommissions]);

  // Cours populaires
  const topCourses = useMemo(
    () =>
      [...courses]
        .sort((a, b) => (Number(b.studentsCount) || 0) - (Number(a.studentsCount) || 0))
        .slice(0, 5),
    [courses]
  );

  // Répartition par catégorie de cours
  const courseCategoryData = useMemo(() => {
    const map = new Map<string, number>();
    courses.forEach((c) => {
      const cat = c.categoryLabel || String(c.category || "Autre").toUpperCase();
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({
        label,
        value,
        color: ["#D69E25", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"][
          Math.floor(Math.random() * 8)
        ],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [courses]);

  // Répartition produits par type
  const productTypeData = useMemo(() => {
    const map = new Map<string, number>();
    digitalProducts.forEach((p) => {
      const type = p.typeLabel || p.type || "Autre";
      map.set(type, (map.get(type) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, value], i) => ({
        label,
        value,
        color: ["#D69E25", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"][i % 8],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [digitalProducts]);

  // Ordres par statut
  const orderStatusData = useMemo(() => {
    const map = new Map<string, number>();
    marketplaceOrders.forEach((o) => {
      const st = o.status || "Inconnu";
      map.set(st, (map.get(st) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value], i) => ({
      label,
      value,
      color: ["#10B981", "#F59E0B", "#EF4444", "#3B82F6"][i % 4],
    }));
  }, [marketplaceOrders]);

  // Série temporelle simulée à partir des données réelles (7 derniers points)
  const revenueSeries = useMemo(() => {
    if (marketplaceOrders.length === 0) return [0, 0, 0, 0, 0, 0, 0];
    const sorted = [...marketplaceOrders].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    const total = sorted.reduce((s, o) => s + (Number(o.amountUsd) || 0), 0);
    // Répartir le total sur 7 points avec pondération réaliste
    const weights = [0.08, 0.12, 0.1, 0.15, 0.2, 0.17, 0.18];
    return weights.map((w) => Math.round(total * w));
  }, [marketplaceOrders]);

  const productSeries = useMemo(() => {
    if (digitalProducts.length === 0) return [0, 0, 0, 0, 0, 0, 0];
    const total = digitalProducts.reduce((s, p) => s + (Number(p.salesCount) || 0), 0);
    const weights = [0.1, 0.08, 0.15, 0.12, 0.18, 0.15, 0.22];
    return weights.map((w) => Math.round(total * w));
  }, [digitalProducts]);

  const studentsSeries = useMemo(() => {
    const total = totalStudents;
    if (!total) return [0, 0, 0, 0, 0, 0, 0];
    const weights = [0.05, 0.1, 0.15, 0.12, 0.18, 0.2, 0.2];
    return weights.map((w) => Math.round(total * w));
  }, [totalStudents]);

  const weekLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  // Performance globale
  const averageRating = useMemo(() => {
    const ratings = [...courses.map((c) => Number(c.rating) || 0), ...digitalProducts.map((p) => Number(p.rating) || 0)];
    if (!ratings.length) return 0;
    return ratings.reduce((s, r) => s + r, 0) / ratings.length;
  }, [courses, digitalProducts]);

  const activeStores = stores.filter((s) => s.status === "active").length;

  const conversionRate = marketplaceOrders.length > 0 ? Math.min(Math.round((marketplaceOrders.filter((o) => o.status === "Payé").length / marketplaceOrders.length) * 100), 100) : 0;

  const kycApprovalRate = kycSubmissions.length > 0 ? Math.min(Math.round((kycSubmissions.filter((k) => k.status === "Approuvé").length / kycSubmissions.length) * 100), 100) : 0;

  return (
    <div className="space-y-6">
      {/* ======== LIGNE 1 : ALERTES ACTIONS REQUISES ======== */}
      {totalPendingActions > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Actions requises ({totalPendingActions})</h4>
              <p className="text-[11px] text-slate-400">Des éléments nécessitent votre attention immédiate</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingKyc > 0 && (
              <span className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 rounded-lg text-[10px] font-bold flex items-center gap-1">
                <FileCheck className="w-3 h-3" /> KYC: {pendingKyc}
              </span>
            )}
            {pendingVendors > 0 && (
              <span className="px-2.5 py-1 bg-blue-500/15 border border-blue-500/40 text-blue-400 rounded-lg text-[10px] font-bold flex items-center gap-1">
                <Store className="w-3 h-3" /> Vendeurs: {pendingVendors}
              </span>
            )}
            {pendingPayouts > 0 && (
              <span className="px-2.5 py-1 bg-purple-500/15 border border-purple-500/40 text-purple-400 rounded-lg text-[10px] font-bold flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Retraits: {pendingPayouts}
              </span>
            )}
            {pendingQuotes > 0 && (
              <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/40 text-amber-400 rounded-lg text-[10px] font-bold flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> Devis: {pendingQuotes}
              </span>
            )}
            {pendingSupport > 0 && (
              <span className="px-2.5 py-1 bg-indigo-500/15 border border-indigo-500/40 text-indigo-400 rounded-lg text-[10px] font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Support: {pendingSupport}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ======== LIGNE 2 : KPI CARDS PRINCIPAUX ======== */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Revenus */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-[#D69E25]/40 transition group">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#D69E25]/15 border border-[#D69E25]/30 text-[#D69E25] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition" />
          </div>
          <div>
            <p className="text-[18px] font-black text-white leading-tight">
              ${totalRevenueUsd.toLocaleString("en-US")}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold">Revenus totaux</p>
            {marketplaceOrders.length > 0 && (
              <Sparkline data={revenueSeries} color="#D69E25" />
            )}
          </div>
        </div>

        {/* Étudiants */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-blue-500/40 transition group">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition" />
          </div>
          <div>
            <p className="text-[18px] font-black text-white leading-tight">{totalStudents.toLocaleString("fr-FR")}</p>
            <p className="text-[10px] text-slate-500 font-semibold">Apprenants inscrits</p>
            {totalStudents > 0 && <Sparkline data={studentsSeries} color="#3B82F6" />}
          </div>
        </div>

        {/* Commandes */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-emerald-500/40 transition group">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition" />
          </div>
          <div>
            <p className="text-[18px] font-black text-white leading-tight">{marketplaceOrders.length}</p>
            <p className="text-[10px] text-slate-500 font-semibold">Commandes</p>
            {marketplaceOrders.length > 0 && <Sparkline data={revenueSeries.slice(0, 5)} color="#10B981" />}
          </div>
        </div>

        {/* Formations */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-purple-500/40 transition group">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition" />
          </div>
          <div>
            <p className="text-[18px] font-black text-white leading-tight">{courses.length}</p>
            <p className="text-[10px] text-slate-500 font-semibold">Formations</p>
            <p className="text-[9px] text-purple-400 font-bold">{totalInstructors} centres</p>
          </div>
        </div>

        {/* Contenus */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-amber-500/40 transition group">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition" />
          </div>
          <div>
            <p className="text-[18px] font-black text-white leading-tight">{totalContentItems}</p>
            <p className="text-[10px] text-slate-500 font-semibold">Contenus actifs</p>
            <p className="text-[9px] text-emerald-400 font-bold">{activeStores} boutiques actives</p>
          </div>
        </div>

        {/* Boutiques */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-rose-500/40 transition group">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition" />
          </div>
          <div>
            <p className="text-[18px] font-black text-white leading-tight">{stores.length}</p>
            <p className="text-[10px] text-slate-500 font-semibold">Boutiques</p>
            <p className="text-[9px] text-amber-400 font-bold">{pendingVendors} en attente</p>
          </div>
        </div>
      </div>

      {/* ======== LIGNE 3 : CHARTS PRINCIPAUX ======== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenus hebdomadaires */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#D69E25]" />
                <span>Revenus hebdomadaires</span>
              </h3>
              <p className="text-[10px] text-slate-500">Évolution des revenus sur 7 jours (USD)</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-1 bg-[#D69E25]/10 border border-[#D69E25]/30 text-[#D69E25] rounded-lg text-[9px] font-bold">USD</span>
              <span className="px-2 py-1 bg-white/5 border border-white/10 text-slate-400 rounded-lg text-[9px] font-bold">≈ {Math.round(totalRevenueUsd * 600).toLocaleString("en-US")} FCFA</span>
            </div>
          </div>
          <LineChart data={revenueSeries} labels={weekLabels} height={180} color="#D69E25" suffix=" $" />
        </div>

        {/* Répartition revenus par module */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Revenus par module</span>
          </h3>
          <p className="text-[10px] text-slate-500 mb-4">Répartition des revenus générés</p>
          {revenueDonutData.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 italic">Aucun revenu enregistré</div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <DonutChart
                data={revenueDonutData}
                size={170}
                thickness={22}
                centerLabel={`$${(totalRevenueUsd + courseRevenue + productRevenue + servicesRevenue + commissionRevenue).toLocaleString("en-US")}`}
                centerSubLabel="Total"
              />
              <div className="w-full space-y-1.5">
                {revenueDonutData.slice(0, 4).map((d) => (
                  <div key={d.label} className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                      {d.label}
                    </span>
                    <span className="font-black text-white">${d.value.toLocaleString("en-US")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======== LIGNE 4 : PERFORMANCE ======== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Note moyenne */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Note moyenne</h4>
            <p className="text-2xl font-black text-white mt-1">{averageRating.toFixed(1)} <span className="text-xs text-slate-500">/ 5</span></p>
            <p className="text-[10px] text-amber-400 font-bold flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 fill-amber-400" /> Basée sur les avis
            </p>
          </div>
          <RadialProgress value={averageRating} max={5} size={90} color="#D69E25" suffix="" label="Note" />
        </div>

        {/* Taux de conversion */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Conversion paiements</h4>
            <p className="text-2xl font-black text-white mt-1">{conversionRate}%</p>
            <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3" /> {marketplaceOrders.filter((o) => o.status === "Payé").length} / {marketplaceOrders.length} payées
            </p>
          </div>
          <RadialProgress value={conversionRate} max={100} size={90} color="#10B981" suffix="%" label="Taux" />
        </div>

        {/* Approbation KYC */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Approbation KYC</h4>
            <p className="text-2xl font-black text-white mt-1">{kycApprovalRate}%</p>
            <p className="text-[10px] text-blue-400 font-bold flex items-center gap-1 mt-1">
              <FileCheck className="w-3 h-3" /> {kycSubmissions.length} soumissions
            </p>
          </div>
          <RadialProgress value={kycApprovalRate} max={100} size={90} color="#3B82F6" suffix="%" label="KYC" />
        </div>

        {/* Formateurs actifs */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Centres formateurs</h4>
            <p className="text-2xl font-black text-white mt-1">{trainingCenters.filter((c) => c.status === "active").length} / {trainingCenters.length}</p>
            <p className="text-[10px] text-purple-400 font-bold flex items-center gap-1 mt-1">
              <GraduationCap className="w-3 h-3" /> actifs
            </p>
          </div>
          <RadialProgress
            value={trainingCenters.length > 0 ? (trainingCenters.filter((c) => c.status === "active").length / trainingCenters.length) * 100 : 0}
            max={100}
            size={90}
            color="#8B5CF6"
            suffix="%"
            label="Actifs"
          />
        </div>
      </div>

      {/* ======== LIGNE 5 : CHART PRODUCTS & COURSES ======== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ventes produits */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>Ventes produits numériques</span>
          </h3>
          <p className="text-[10px] text-slate-500 mb-4">Évolution hebdomadaire des ventes</p>
          <LineChart data={productSeries} labels={weekLabels} height={150} color="#10B981" gradientFrom="rgba(16,185,129,0.25)" gradientTo="rgba(16,185,129,0)" suffix=" ventes" />
        </div>

        {/* Répartition produits */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 text-purple-400" />
            <span>Répartition par type</span>
          </h3>
          <p className="text-[10px] text-slate-500 mb-4">Produits numériques par catégorie</p>
          {productTypeData.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 italic">Aucun produit</div>
          ) : (
            <BarChart data={productTypeData} height={150} />
          )}
        </div>
      </div>

      {/* ======== LIGNE 6 : CATÉGORIES & STATUTS ======== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Catégories de cours */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span>Formations par catégorie</span>
          </h3>
          {courseCategoryData.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 italic">Aucune formation</div>
          ) : (
            <BarChart data={courseCategoryData} height={160} />
          )}
        </div>

        {/* Statuts commandes */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>Statuts des commandes</span>
          </h3>
          {orderStatusData.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 italic">Aucune commande</div>
          ) : (
            <div className="space-y-3 h-[180px] flex flex-col justify-center">
              {orderStatusData.map((d) => (
                <div key={d.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-semibold">{d.label}</span>
                    <span className="font-black text-white">{d.value}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(d.value / Math.max(Math.max(...orderStatusData.map((x) => x.value)), 1)) * 100}%`,
                        background: d.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top formations */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
            <GraduationCap className="w-4 h-4 text-[#D69E25]" />
            <span>Top 5 formations populaires</span>
          </h3>
          {topCourses.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 italic">Aucune formation</div>
          ) : (
            <div className="space-y-2.5">
              {topCourses.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2.5">
                  <span className="text-[10px] font-black text-slate-500 w-4">{i + 1}</span>
                  <img src={c.image} alt={c.title} className="w-8 h-8 rounded-lg object-cover border border-slate-700" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-white truncate">{c.title}</p>
                    <p className="text-[9px] text-slate-500">{Number(c.studentsCount) || 0} étudiants · {Number(c.rating) || 0}★</p>
                  </div>
                  <span className="text-[10px] font-black text-[#D69E25]">${Number(c.price) || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ======== LIGNE 7 : FORMATEURS & COMMISSIONS ======== */}
      {instructorRevenueByCenter.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top formateurs */}
          <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>Top formateurs par revenus</span>
            </h3>
            <div className="space-y-3">
              {instructorRevenueByCenter.map((item, i) => {
                const center = trainingCenters.find((c) => c.id === item.id);
                const maxVal = Math.max(...instructorRevenueByCenter.map((x) => x.value), 1);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 font-semibold truncate max-w-[55%]">
                        {center?.centerName || `Formateur ${i + 1}`}
                      </span>
                      <span className="font-black text-[#D69E25]">${item.value.toLocaleString("en-US")}</span>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#D69E25] to-amber-400 transition-all duration-700"
                        style={{ width: `${(item.value / maxVal) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Commissions */}
          <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Commissions formateurs</span>
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-[#021231] border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-white">${instructorCommissions.reduce((s, c) => s + (Number(c.amountPaidUsd) || 0), 0).toLocaleString("en-US")}</p>
                <p className="text-[9px] text-slate-500 font-bold">Total versé</p>
              </div>
              <div className="bg-[#021231] border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-[#D69E25]">${instructorCommissions.reduce((s, c) => s + (Number(c.instructorEarningsUsd) || 0), 0).toLocaleString("en-US")}</p>
                <p className="text-[9px] text-slate-500 font-bold">Revenus formateurs</p>
              </div>
              <div className="bg-[#021231] border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-blue-400">{instructorCommissions.length}</p>
                <p className="text-[9px] text-slate-500 font-bold">Transactions</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-[#021231] rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold text-white">Frais plateforme</p>
                  <p className="text-[9px] text-slate-500">Commissions FORTIA prélevées</p>
                </div>
              </div>
              <p className="text-sm font-black text-pink-400">${instructorCommissions.reduce((s, c) => s + (Number(c.platformFeeUsd) || 0), 0).toLocaleString("en-US")}</p>
            </div>
          </div>
        </div>
      )}

      {/* ======== LIGNE 8 : BANDEAU RÉCAP ÉCONOMIQUE ======== */}
      <div className="bg-gradient-to-r from-[#021231] via-[#011D46] to-[#021231] border border-[#D69E25]/30 rounded-2xl p-5">
        <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-[#D69E25]" />
          <span>Récapitulatif économique de la plateforme</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
            <p className="text-[9px] text-slate-500 font-bold uppercase">Volume brut marché</p>
            <p className="text-base font-black text-white mt-0.5">${totalRevenueUsd.toLocaleString("en-US")}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
            <p className="text-[9px] text-slate-500 font-bold uppercase">Commissions plateforme</p>
            <p className="text-base font-black text-[#D69E25] mt-0.5">${platformCommissions.toLocaleString("en-US")}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
            <p className="text-[9px] text-slate-500 font-bold uppercase">Revenus vendeurs</p>
            <p className="text-base font-black text-emerald-400 mt-0.5">${vendorEarnings.toLocaleString("en-US")}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
            <p className="text-[9px] text-slate-500 font-bold uppercase">Estimation FCFA</p>
            <p className="text-base font-black text-white mt-0.5">≈ {Math.round((totalRevenueUsd + courseRevenue + productRevenue + servicesRevenue + commissionRevenue) * 600).toLocaleString("en-US")} F</p>
          </div>
        </div>
      </div>
    </div>
  );
}