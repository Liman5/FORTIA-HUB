"use client";

import React from "react";
import { Mail, Users, CheckCircle2, Trash2 } from "lucide-react";
import type { PostPurchaseSupportSubmission } from "@/lib/types";

export function AdminSupportTab({ submissions, onDelete }: { submissions: PostPurchaseSupportSubmission[]; onDelete?: (id: string) => void }) {
  return (
            <div className="p-6 space-y-6">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-indigo-900/60 via-[#011D46] to-[#021231] p-5 rounded-2xl border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
                      <Mail className="w-5 h-5" />
                    </span>
                    <h3 className="text-base font-black text-white">Formulaires & Fiches Support Clients Post-Achat</h3>
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    Collecte automatique des coordonnées clients (Nom, Prénom, Contact, Note) enregistrées au paiement. 
                    Chaque fiche est archivée en administration et transmise directement à <strong className="text-amber-400">l'adresse email du vendeur du produit</strong> (100% transparent et sécurisé).
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 bg-[#021231] p-3 rounded-xl border border-slate-800 text-xs">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Transmission Email</span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Email du Vendeur
                    </span>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#021231] p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Formulaires Enregistrés</span>
                  <div className="text-2xl font-black text-white">{submissions.length}</div>
                  <span className="text-[10px] text-indigo-400 font-semibold">100% Archivés</span>
                </div>

                <div className="bg-[#021231] p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Transmis aux Vendeurs</span>
                  <div className="text-2xl font-black text-emerald-400">{submissions.length}</div>
                  <span className="text-[10px] text-slate-400">Emails Vendeurs Récepteurs</span>
                </div>

                <div className="bg-[#021231] p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Statut Réseau</span>
                  <div className="text-2xl font-black text-[#D69E25]">Actif</div>
                  <span className="text-[10px] text-emerald-400 font-bold">✓ Routage Instantané</span>
                </div>
              </div>

              {/* Submissions Table */}
              <div className="bg-[#021231] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Liste des Coordonnées de Secours Clients ({submissions.length})</span>
                  </h4>
                </div>

                {submissions.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 text-xs">
                    Aucun formulaire post-achat enregistré pour le moment.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#011D46] text-slate-400 text-[10px] font-bold uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-3.5">Date & Heure</th>
                          <th className="p-3.5">Nom & Prénom Client</th>
                          <th className="p-3.5">Contact Direct (Téléphone)</th>
                          <th className="p-3.5">Email Client</th>
                          <th className="p-3.5">Produit Concerné</th>
                          <th className="p-3.5">Email Vendeur (Routage)</th>
                          <th className="p-3.5">Remarques / Problème</th>
                          <th className="p-3.5 text-right">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-300">
                        {submissions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-[#011D46]/50 transition">
                            <td className="p-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                              {sub.submittedAt}
                            </td>
                            <td className="p-3.5 font-bold text-white">
                              {sub.lastName} {sub.firstName}
                            </td>
                            <td className="p-3.5 font-semibold text-amber-400 whitespace-nowrap">
                              {sub.phoneContact}
                            </td>
                            <td className="p-3.5 text-slate-300 whitespace-nowrap">
                              {sub.email}
                            </td>
                            <td className="p-3.5 max-w-[200px] truncate text-slate-200" title={sub.productTitle}>
                              <span className="font-semibold text-white block truncate">{sub.productTitle}</span>
                              {sub.orderNumber && <span className="text-[10px] text-slate-500 font-mono">#{sub.orderNumber}</span>}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1 w-fit">
                                <Mail className="w-3 h-3 text-indigo-400" />
                                {sub.forwardedEmail}
                              </span>
                            </td>
                            <td className="p-3.5 max-w-[220px]">
                              <p className="text-[11px] text-slate-300 italic line-clamp-2" title={sub.notes}>
                                "{sub.notes || 'Aucune note particulière'}"
                              </p>
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap flex items-center justify-end gap-2">
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-2.5 py-1 rounded-full border border-emerald-500/30 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                {sub.status}
                              </span>
                              <button
                                onClick={() => onDelete && onDelete(sub.id)}
                                className="p-1.5 rounded bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white transition"
                                title="Supprimer la soumission"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
