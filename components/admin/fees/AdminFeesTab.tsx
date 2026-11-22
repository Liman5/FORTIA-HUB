"use client";

import React from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export interface AdminFeesTabProps {
  freelanceUsd: number;
  freelanceFcfa: number;
  enterpriseUsd: number;
  enterpriseFcfa: number;
  setFreelanceUsd: (value: number) => void;
  setFreelanceFcfa: (value: number) => void;
  setEnterpriseUsd: (value: number) => void;
  setEnterpriseFcfa: (value: number) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function AdminFeesTab(props: AdminFeesTabProps) {
  const {
    freelanceUsd, freelanceFcfa, enterpriseUsd, enterpriseFcfa,
    setFreelanceUsd, setFreelanceFcfa, setEnterpriseUsd, setEnterpriseFcfa, onSubmit,
  } = props;
  return (
            <form onSubmit={onSubmit} className="p-6 space-y-6 max-w-2xl">
              <div>
                <h3 className="font-bold text-white text-base">Configuration des Frais d'Inscription</h3>
                <p className="text-xs text-slate-400 mt-1">
                  DÃ©finissez le montant des frais requis pour la vÃ©rification KYC et l'attribution des Badges (Vert et DorÃ©). Tapez en USD pour conversion automatique instantanÃ©e en FCFA (Taux fixe : 1 USD = 600 FCFA).
                </p>
              </div>

              {/* Freelance Fee */}
              <div className="bg-[#021231] p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="font-bold text-xs text-emerald-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Frais Inscription Freelance (Badge Vert)</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
                    âš¡ Auto-conversion : 1 USD = 600 FCFA
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">Montant ($ USD)</label>
                    <input
                      type="number"
                      value={freelanceUsd}
                      onChange={(e) => {
                        const usd = Number(e.target.value);
                        setFreelanceUsd(usd);
                        setFreelanceFcfa(Math.round(usd * 600));
                      }}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-2.5 text-white font-black focus:outline-none focus:border-[#D69E25]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Converti : <strong className="text-emerald-400">{Math.round(freelanceUsd * 600).toLocaleString('en-US')} FCFA</strong>
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">Montant (FCFA)</label>
                    <input
                      type="number"
                      value={freelanceFcfa}
                      onChange={(e) => {
                        const fcfa = Number(e.target.value);
                        setFreelanceFcfa(fcfa);
                        setFreelanceUsd(Math.round(fcfa / 600));
                      }}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-2.5 text-white font-black focus:outline-none focus:border-[#D69E25]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Converti : <strong className="text-amber-400">${Math.round(freelanceFcfa / 600)} USD</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Enterprise Fee */}
              <div className="bg-[#021231] p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="font-bold text-xs text-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Frais Inscription Entreprise / Agence (Badge DorÃ©)</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
                    âš¡ Auto-conversion : 1 USD = 600 FCFA
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">Montant ($ USD)</label>
                    <input
                      type="number"
                      value={enterpriseUsd}
                      onChange={(e) => {
                        const usd = Number(e.target.value);
                        setEnterpriseUsd(usd);
                        setEnterpriseFcfa(Math.round(usd * 600));
                      }}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-2.5 text-white font-black focus:outline-none focus:border-[#D69E25]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Converti : <strong className="text-emerald-400">{Math.round(enterpriseUsd * 600).toLocaleString('en-US')} FCFA</strong>
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">Montant (FCFA)</label>
                    <input
                      type="number"
                      value={enterpriseFcfa}
                      onChange={(e) => {
                        const fcfa = Number(e.target.value);
                        setEnterpriseFcfa(fcfa);
                        setEnterpriseUsd(Math.round(fcfa / 600));
                      }}
                      className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-xl p-2.5 text-white font-black focus:outline-none focus:border-[#D69E25]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Converti : <strong className="text-amber-400">${Math.round(enterpriseFcfa / 600)} USD</strong>
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-[#D69E25] text-[#021231] font-black text-xs hover:bg-amber-400 transition"
              >
                Enregistrer la Configuration des Frais
              </button>
            </form>
  );
}
