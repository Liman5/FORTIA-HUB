"use client";

import React from "react";
import { Edit, EyeOff, Trash2 } from "lucide-react";
import type { DigitalProduct } from "@/lib/types";
import { apiWritePlatform } from "@/lib/services/platformWrite";

export function AdminProductsTab({
  digitalProducts,
  onEditProduct,
  onDeleteProduct,
  refreshPlatformData,
  loadAdminData,
}: {
  digitalProducts: DigitalProduct[];
  onEditProduct: (product: DigitalProduct) => void;
  onDeleteProduct: (product: DigitalProduct) => void;
  refreshPlatformData?: () => Promise<void> | void;
  loadAdminData?: () => Promise<void> | void;
}) {
  return (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#021231] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-4">Produit Numérique</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Format</th>
                    <th className="p-4">Prix USD</th>
                    <th className="p-4">Ventes</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {digitalProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#021231]/50 transition">
                      <td className="p-4 flex items-center gap-3 font-bold text-white">
                        <img src={p.image} alt={p.title} className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0" />
                        <div>
                          <p className="line-clamp-1">{p.title}</p>
                          {p.isPopular && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-400 font-extrabold px-1.5 py-0.5 rounded border border-amber-500/30">
                              Top Vente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-[#D69E25] font-semibold">{p.typeLabel}</td>
                      <td className="p-4 text-slate-400">{p.fileFormat}</td>
                      <td className="p-4 font-bold text-white">${p.price}</td>
                      <td className="p-4">{p.salesCount}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onEditProduct(p)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 hover:bg-blue-600 hover:text-white transition flex items-center gap-1.5 font-bold text-[11px]"
                            title="Modifier ce produit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Modifier</span>
                          </button>
                          <button
                            onClick={async () => {
                              const reason = window.prompt(
                                `Suspendre le produit « ${p.title} » ?\n\nMotif communiqué au vendeur (produit non authentique, violation de droits d'auteur…) :`,
                                "Produit non conforme aux règles de la plateforme."
                              );
                              if (reason === null) return;
                              if (!reason.trim()) {
                                alert("Le motif est obligatoire.");
                                return;
                              }
                              const res = await apiWritePlatform("moderate-content", {
                                targetType: "product",
                                targetId: p.id,
                                reason: reason.trim(),
                              });
                              if (res.success) {
                                alert(
                                  `Produit « ${p.title} » suspendu : il est dépublié et ses fonds sont gelés.`
                                );
                                await refreshPlatformData?.();
                                await loadAdminData?.();
                              } else {
                                alert(res.error || "Suspension impossible.");
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-600/25 border border-amber-500/40 text-amber-300 hover:bg-amber-600 hover:text-white transition flex items-center gap-1.5 font-bold text-[11px]"
                            title="Suspendre ce produit (fonds gelés)"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Suspendre</span>
                          </button>
                          <button
                            onClick={() => onDeleteProduct(p)}
                            className="px-2.5 py-1.5 rounded-lg bg-red-600/30 border border-red-500/40 text-red-300 hover:bg-red-600 hover:text-white transition flex items-center gap-1.5 font-bold text-[11px]"
                            title="Supprimer ce produit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
  );
}
