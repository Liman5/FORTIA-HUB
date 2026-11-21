"use client";

import React from "react";
import type { ServiceQuoteRequest } from "@/lib/types";

export function AdminQuotesTab({ serviceQuotes }: { serviceQuotes: ServiceQuoteRequest[] }) {
  return (
            <div className="divide-y divide-slate-800">
              {serviceQuotes.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">Aucune demande de devis pour le moment.</div>
              ) : (
                serviceQuotes.map((q) => (
                  <div key={q.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{q.clientName}</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/40">
                          {q.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{q.clientEmail} • {q.serviceTitle}</p>
                      <p className="text-[11px] text-slate-300 mt-1 italic">"{q.details || 'Pas de détails particuliers'}"</p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-[#D69E25]">${q.estimatedPrice}</span>
                      <span className="text-[10px] text-slate-400 block">{q.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
  );
}
