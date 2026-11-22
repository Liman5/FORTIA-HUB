"use client";

import React from "react";
import { Store, ArrowUpRight, Trash2, CheckCircle2 } from "lucide-react";
import { CommissionRatesPanel } from "@/components/admin/CommissionRatesPanel";
import type { VendorStore, PayoutRequest } from "@/lib/types";

export function AdminMarketplaceTab({
  stores, payoutRequests, totalMarketplaceVolumeUsd, totalPlatformCommissionsUsd,
  pendingApplicationsCount, pendingPayoutsCount, isPaid, isPending,
  onApprovePayout, onApproveStore, onSuspendStore, onDeleteStore,
}: {
  stores: VendorStore[];
  payoutRequests: PayoutRequest[];
  totalMarketplaceVolumeUsd: number;
  totalPlatformCommissionsUsd: number;
  pendingApplicationsCount: number;
  pendingPayoutsCount: number;
  isPaid: (status: string) => boolean;
  isPending: (status: string) => boolean;
  onApprovePayout?: (id: string) => void;
  onApproveStore?: (id: string) => void;
  onSuspendStore?: (id: string) => void;
  onDeleteStore?: (id: string) => void;
}) {
  return (
    <div className="p-6 space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#021231] p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Volume Total Marketplace</span>
          <p className="text-2xl font-black text-white">${totalMarketplaceVolumeUsd.toLocaleString("en-US")}</p>
          <span className="text-[10px] text-emerald-400">≈ {Math.round(totalMarketplaceVolumeUsd * 600).toLocaleString("en-US")} FCFA</span>
        </div>
        <div className="bg-[#021231] p-4 rounded-2xl border border-[#D69E25]/40 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Commissions encaissées</span>
          <p className="text-2xl font-black text-[#D69E25]">${totalPlatformCommissionsUsd.toLocaleString("en-US")}</p>
          <span className="text-[10px] text-[#D69E25] font-bold">Revenu Net FORTIA HUB</span>
        </div>
        <div className="bg-[#021231] p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Boutiques Actives</span>
          <p className="text-2xl font-black text-white">{stores.filter((s) => s.status === "active").length} / {stores.length}</p>
          <span className="text-[10px] text-emerald-400 font-bold">Vendeurs certifiés</span>
        </div>
        <div className="bg-[#021231] p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Demandes en Attente</span>
          <p className="text-2xl font-black text-amber-400">{pendingApplicationsCount} Vendeurs | {pendingPayoutsCount} Retraits</p>
          <span className="text-[10px] text-amber-400 font-bold">Nécessite votre validation</span>
        </div>
      </div>

      <CommissionRatesPanel />

      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="font-black text-base text-white flex items-center gap-2">
          <Store className="w-5 h-5 text-[#D69E25]" />
          <span>Toutes les Boutiques de la Marketplace ({stores.length})</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#021231] text-slate-400 uppercase text-[10px]">
              <tr><th className="p-3">Boutique</th><th className="p-3">Propriétaire</th><th className="p-3">Ventes Cumulées</th>
                <th className="p-3">Revenu Brut</th><th className="p-3">Statut</th><th className="p-3">Actions Admin</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {stores.map((st) => (
                <tr key={st.id} className="hover:bg-[#021231]/50 transition">
                  <td className="p-3 flex items-center gap-2.5">
                    <img src={st.logo} alt={st.name} className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0" />
                    <div><p className="font-bold text-white">{st.name}</p><p className="text-[10px] text-slate-400">{st.slug}</p></div>
                  </td>
                  <td className="p-3"><p className="font-semibold text-slate-200">{st.ownerName}</p><p className="text-[10px] text-slate-400">{st.ownerEmail}</p></td>
                  <td className="p-3 font-bold text-white">{st.salesCount} ventes</td>
                  <td className="p-3 font-bold text-[#D69E25]">${st.totalRevenueUsd}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${st.status === "active" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
                      {st.status === "active" ? "Actif / Validé" : "Suspendu"}
                    </span>
                  </td>
                  <td className="p-3 flex items-center gap-1.5">
                    {st.status === "active" ? (
                      <button onClick={() => onSuspendStore && onSuspendStore(st.id)} className="px-2.5 py-1 bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white font-bold text-[10px] rounded-lg transition">Suspendre</button>
                    ) : (
                      <button onClick={() => onApproveStore && onApproveStore(st.id)} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition">Réactiver</button>
                    )}
                    <button onClick={() => onDeleteStore && onDeleteStore(st.id)} className="p-1 rounded bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white transition" title="Supprimer la boutique"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="font-black text-base text-white flex items-center gap-2">
          <ArrowUpRight className="w-5 h-5 text-emerald-400" />
          <span>Demandes de Retrait Vendeurs ({payoutRequests.length})</span>
        </h3>
        {payoutRequests.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Aucune demande de retrait en attente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#021231] text-slate-400 uppercase text-[10px]">
                <tr><th className="p-3">Vendeur / Boutique</th><th className="p-3">Montant Retrait</th><th className="p-3">Equiv. FCFA</th>
                  <th className="p-3">Compte Réception</th><th className="p-3">Statut</th><th className="p-3">Action Admin</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payoutRequests.map((pay) => (
                  <tr key={pay.id} className="hover:bg-[#021231]/50 transition">
                    <td className="p-3"><p className="font-bold text-white">{pay.vendorName}</p><p className="text-[10px] text-amber-400">{pay.storeName}</p></td>
                    <td className="p-3 font-black text-white">${pay.amountUsd}</td>
                    <td className="p-3 font-semibold text-amber-400">{pay.amountFcfa.toLocaleString("en-US")} FCFA</td>
                    <td className="p-3 text-cyan-300 font-mono text-[11px]">{pay.payoutMethod}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isPaid(pay.status) ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>{pay.status}</span></td>
                    <td className="p-3">
                      {isPending(pay.status) ? (
                        <button onClick={() => onApprovePayout && onApprovePayout(pay.id)} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition shadow">Valider & Marquer Payé</button>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Payé</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
