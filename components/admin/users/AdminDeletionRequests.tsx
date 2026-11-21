"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Clock, Loader2, RefreshCw, XCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import type { DeletionRequestRow } from "@/lib/services/admin/platformUsers";
import { listDeletionRequests, processDeletionRequest } from "@/lib/services/admin/platformUsers";
import { formatUserDate } from "./UserBadges";

export function AdminDeletionRequests({ onChanged }: { onChanged: () => void }) {
  const [requests, setRequests] = useState<DeletionRequestRow[]>([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const result = await listDeletionRequests({ status, limit: 50 });
    setLoading(false);
    if (!result.success || !result.data) { setError(result.error || "Chargement impossible."); return; }
    setRequests(result.data.requests);
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  const act = async (request: DeletionRequestRow, action: "cancel" | "process") => {
    if (action === "process" && !window.confirm("Exécuter la suppression maintenant ? Le délai de rétention doit être atteint.")) return;
    if (action === "cancel" && !window.confirm("Annuler cette demande de suppression ?")) return;
    const result = await processDeletionRequest(request.id, action);
    if (!result.success) { setError(result.error || "Action impossible."); return; }
    setNotice(action === "cancel" ? "Demande annulée." : "Suppression exécutée.");
    onChanged();
    await load();
  };

  return (
    <div className="rounded-2xl border border-orange-500/30 bg-[#011D46] p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-black text-orange-200 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Demandes de suppression</h4>
        <div className="flex items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-[#021231] border border-slate-700 rounded-xl py-1.5 px-2 text-[11px] text-white">
            <option value="pending">En attente</option><option value="completed">Terminées</option>
            <option value="cancelled">Annulées</option><option value="failed">En échec</option><option value="all">Toutes</option>
          </select>
          <button type="button" onClick={() => void load()} className="p-1.5 rounded-lg border border-slate-700 text-slate-300"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>
      {error && <p className="text-[11px] text-red-300 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>}
      {notice && <p className="text-[11px] text-emerald-300">{notice}</p>}
      {loading ? <p className="text-[11px] text-slate-400"><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Chargement…</p> : requests.length === 0 ? (
        <p className="text-[11px] text-slate-500">Aucune demande dans ce filtre.</p>
      ) : (
        <div className="space-y-1.5">
          {requests.map((request) => {
            const eligible = new Date(request.deleteAt).getTime() <= Date.now();
            return (
              <div key={request.id} className="rounded-xl border border-slate-800 bg-[#021231] p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">{request.user?.name || request.email}</p>
                  <p className="text-[10px] text-slate-400 truncate">{request.user?.email || request.email}</p>
                  <p className="text-[10px] text-slate-500">Demandée le {formatUserDate(request.requestedAt)} · prévue le {formatUserDate(request.deleteAt)} · {request.origin}</p>
                  {request.reason && <p className="text-[10px] text-slate-400 italic truncate">{request.reason}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] font-bold rounded-full border border-slate-600 px-2 py-0.5 text-slate-300">{request.status}</span>
                  {request.status === "pending" && (
                    <>
                      <button type="button" onClick={() => void act(request, "cancel")} className="px-2 py-1 rounded-lg border border-amber-500/40 text-amber-200 text-[10px] font-bold flex items-center gap-1"><XCircle className="w-3 h-3" /> Annuler</button>
                      <button type="button" disabled={!eligible} onClick={() => void act(request, "process")} title={eligible ? "Exécuter" : "Délai de 7 jours non atteint"} className="px-2 py-1 rounded-lg border border-red-500/40 text-red-200 text-[10px] font-bold disabled:opacity-40 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Exécuter</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
