"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Users, Search, RefreshCw, Eye, ShieldOff, Ban, RotateCcw, Trash2, Clock, AlertTriangle, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { PlatformUserRow, PlatformUsersResponse } from "@/lib/services/admin/platformUsers";
import { getPlatformUser, listPlatformUsers, requestAdminDeletion, setPlatformUserStatus } from "@/lib/services/admin/platformUsers";
import { AdminUserDetails } from "./AdminUserDetails";
import { AdminDeletionRequests } from "./AdminDeletionRequests";
import { KycBadge, UserRoleBadges, UserStatusBadge, formatUserDate } from "./UserBadges";

type ActionKind = "suspend" | "block" | "reactivate" | "delete";
interface DialogState { user: PlatformUserRow; action: ActionKind }

const EMPTY: PlatformUsersResponse = {
  users: [], pagination: { page: 1, limit: 25, total: 0, pages: 1, hasMore: false },
  stats: { total: 0, active: 0, suspended: 0, blocked: 0, instructors: 0, vendors: 0, members: 0, deletionPending: 0 },
};

export function AdminUsersTab() {
  const [data, setData] = useState<PlatformUsersResponse>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [kyc, setKyc] = useState("");
  const [deletion, setDeletion] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("created_desc");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getPlatformUser>>["data"] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [showDeletions, setShowDeletions] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const result = await listPlatformUsers({ q, role, status, kyc, deletion, from, to, sort, page, limit: 25 });
    setLoading(false);
    if (!result.success || !result.data) { setError(result.error || "Chargement impossible."); return; }
    setData(result.data);
  }, [q, role, status, kyc, deletion, from, to, sort, page, reloadKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openDetail = async (user: PlatformUserRow) => {
    setDetailLoading(true);
    const result = await getPlatformUser(user.id);
    setDetailLoading(false);
    if (result.success && result.data) setDetail(result.data);
    else setError(result.error || "Fiche indisponible.");
  };

  return (
    <div className="space-y-5">
      <Header stats={data.stats} loading={loading} showDeletions={showDeletions}
        onToggleDeletions={() => setShowDeletions((v) => !v)} onReload={() => setReloadKey((v) => v + 1)} />
      <StatsBar stats={data.stats} />
      {showDeletions && <AdminDeletionRequests onChanged={() => setReloadKey((v) => v + 1)} />}
      <Filters q={q} role={role} status={status} kyc={kyc} deletion={deletion} from={from} to={to} sort={sort}
        onQ={(v) => { setQ(v); setPage(1); }} onRole={(v) => { setRole(v); setPage(1); }}
        onStatus={(v) => { setStatus(v); setPage(1); }} onKyc={(v) => { setKyc(v); setPage(1); }}
        onDeletion={(v) => { setDeletion(v); setPage(1); }}
        onFrom={(v) => { setFrom(v); setPage(1); }} onTo={(v) => { setTo(v); setPage(1); }}
        onSort={(v) => { setSort(v); setPage(1); }}
        onReset={() => { setQ(""); setRole(""); setStatus(""); setKyc(""); setDeletion(""); setFrom(""); setTo(""); setSort("created_desc"); setPage(1); }} />
      {error && <Flash tone="red" text={error} onClose={() => setError("")} />}
      {notice && <Flash tone="green" text={notice} onClose={() => setNotice("")} />}
      <UserTable data={data} loading={loading} onDetail={(u) => void openDetail(u)} onAction={(user, action) => setDialog({ user, action })} />
      <Pagination data={data} page={page} loading={loading} onPage={setPage} />
      {detailLoading && <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-[#D69E25]" /></div>}
      {dialog && <ActionDialog state={dialog} onClose={() => setDialog(null)} onDone={(message) => { setDialog(null); setNotice(message); setReloadKey((v) => v + 1); }} />}
      {detail?.user && <AdminUserDetails user={detail.user} onClose={() => setDetail(null)} />}
    </div>
  );
}

function Header({ stats, loading, showDeletions, onToggleDeletions, onReload }: {
  stats: PlatformUsersResponse["stats"]; loading: boolean; showDeletions: boolean;
  onToggleDeletions: () => void; onReload: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h3 className="text-lg font-black text-white flex items-center gap-2"><Users className="w-5 h-5 text-[#D69E25]" /> Utilisateurs de la plateforme</h3>
        <p className="text-[11px] text-slate-400 mt-1">Membres, formateurs, vendeurs, freelances, entreprises et administrateurs.</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onToggleDeletions} className="px-3 py-2 rounded-xl border border-orange-500/40 bg-orange-500/10 text-orange-200 text-[11px] font-bold flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Demandes de suppression
          {stats.deletionPending > 0 && <span className="rounded-full bg-orange-500 text-[#021231] px-1.5 text-[10px]">{stats.deletionPending}</span>}
        </button>
        <button type="button" onClick={onReload} className="p-2 rounded-xl border border-slate-700 text-slate-300" aria-label="Actualiser">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
}

function StatsBar({ stats }: { stats: PlatformUsersResponse["stats"] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      <Stat label="Total" value={stats.total} /><Stat label="Actifs" value={stats.active} tone="emerald" />
      <Stat label="Suspendus" value={stats.suspended} tone="amber" /><Stat label="Bloqués" value={stats.blocked} tone="red" />
      <Stat label="Formateurs" value={stats.instructors} /><Stat label="Vendeurs" value={stats.vendors} />
      <Stat label="Membres" value={stats.members} /><Stat label="Suppressions en attente" value={stats.deletionPending} tone="orange" />
    </div>
  );
}

function Filters({ q, role, status, kyc, deletion, from, to, sort, onQ, onRole, onStatus, onKyc, onDeletion, onFrom, onTo, onSort, onReset }: {
  q: string; role: string; status: string; kyc: string; deletion: string; from: string; to: string; sort: string;
  onQ: (v: string) => void; onRole: (v: string) => void; onStatus: (v: string) => void;
  onKyc: (v: string) => void; onDeletion: (v: string) => void; onFrom: (v: string) => void;
  onTo: (v: string) => void; onSort: (v: string) => void; onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#011D46] p-3 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <label className="relative md:col-span-2">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={(e) => onQ(e.target.value)} placeholder="Nom, e-mail ou identifiant…" className="w-full bg-[#021231] border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white" />
        </label>
        <Select value={role} onChange={onRole} label="Tous les rôles">
          <option value="member">Membre</option><option value="instructor">Formateur</option><option value="vendor">Vendeur</option>
          <option value="freelance">Freelance</option><option value="enterprise">Entreprise</option><option value="admin">Administrateur</option>
        </Select>
        <Select value={status} onChange={onStatus} label="Tous les statuts">
          <option value="active">Actif</option><option value="suspended">Suspendu</option><option value="blocked">Bloqué</option>
          <option value="deletion_pending">Suppression en attente</option><option value="anonymized">Anonymisé</option>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Select value={kyc} onChange={onKyc} label="Tous les KYC">
          <option value="non_soumis">Non soumis</option><option value="en_attente">En attente</option>
          <option value="approuve">Approuvé</option><option value="rejete">Rejeté</option><option value="suspendu">Suspendu</option>
        </Select>
        <Select value={deletion} onChange={onDeletion} label="Suppression">
          <option value="pending">Demande en attente</option>
        </Select>
        <Select value={sort} onChange={onSort} label="Tri par défaut">
          <option value="created_desc">Inscription récente</option><option value="created_asc">Inscription ancienne</option>
          <option value="name_asc">Nom A → Z</option><option value="name_desc">Nom Z → A</option>
          <option value="updated_desc">Dernière activité</option>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <label className="text-[10px] text-slate-400 font-bold">
          Inscrit depuis
          <input type="date" value={from} onChange={(e) => onFrom(e.target.value)} className="mt-1 w-full bg-[#021231] border border-slate-700 rounded-xl py-2 px-2.5 text-xs text-white" />
        </label>
        <label className="text-[10px] text-slate-400 font-bold">
          Inscrit jusqu'au
          <input type="date" value={to} onChange={(e) => onTo(e.target.value)} className="mt-1 w-full bg-[#021231] border border-slate-700 rounded-xl py-2 px-2.5 text-xs text-white" />
        </label>
        <button type="button" onClick={onReset} className="self-end rounded-xl border border-slate-700 text-slate-300 text-[11px] font-bold py-2">Réinitialiser les filtres</button>
      </div>
    </div>
  );
}

function UserTable({ data, loading, onDetail, onAction }: {
  data: PlatformUsersResponse; loading: boolean;
  onDetail: (user: PlatformUserRow) => void;
  onAction: (user: PlatformUserRow, action: ActionKind) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#021231]">
      <table className="w-full min-w-[860px] text-left text-xs">
        <thead className="bg-[#011D46] text-[10px] uppercase tracking-wide text-slate-400">
          <tr><th className="px-3 py-3">Utilisateur</th><th className="px-3 py-3">Rôles</th>
            <th className="px-3 py-3">Statut</th><th className="px-3 py-3">KYC</th>
            <th className="px-3 py-3">Inscription</th><th className="px-3 py-3 text-right">Actions</th></tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} className="px-3 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Chargement…</td></tr>
          ) : data.users.length === 0 ? (
            <tr><td colSpan={6} className="px-3 py-10 text-center text-slate-400">Aucun utilisateur ne correspond aux filtres.</td></tr>
          ) : data.users.map((user) => (
            <tr key={user.id} className="border-t border-slate-800 hover:bg-white/[0.02]">
              <td className="px-3 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar user={user} />
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{user.name || "Sans nom"}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                    <p className="text-[9px] text-slate-500 font-mono truncate">{user.id}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3"><UserRoleBadges roles={user.roles} /></td>
              <td className="px-3 py-3"><UserStatusBadge status={user.accountStatus} />
                {user.deletionScheduledFor && <p className="text-[9px] text-orange-300 mt-1">Suppr. {formatUserDate(user.deletionScheduledFor)}</p>}
              </td>
              <td className="px-3 py-3"><KycBadge status={user.kycStatus} /></td>
              <td className="px-3 py-3 text-slate-300">{formatUserDate(user.createdAt)}</td>
              <td className="px-3 py-3">
                <div className="flex items-center justify-end gap-1">
                  <IconButton label="Voir la fiche" onClick={() => onDetail(user)}><Eye className="w-3.5 h-3.5" /></IconButton>
                  {user.accountStatus === "active" || user.accountStatus === "deletion_pending" ? (
                    <>
                      <IconButton label="Suspendre" onClick={() => onAction(user, "suspend")} tone="amber"><ShieldOff className="w-3.5 h-3.5" /></IconButton>
                      <IconButton label="Bloquer" onClick={() => onAction(user, "block")} tone="red"><Ban className="w-3.5 h-3.5" /></IconButton>
                    </>
                  ) : (
                    <IconButton label="Réactiver" onClick={() => onAction(user, "reactivate")} tone="emerald"><RotateCcw className="w-3.5 h-3.5" /></IconButton>
                  )}
                  {user.accountStatus !== "anonymized" && <IconButton label="Demander la suppression" onClick={() => onAction(user, "delete")} tone="red"><Trash2 className="w-3.5 h-3.5" /></IconButton>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ data, page, loading, onPage }: {
  data: PlatformUsersResponse; page: number; loading: boolean; onPage: (updater: (v: number) => number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
      <span>{data.pagination.total} utilisateur(s) — page {data.pagination.page} / {data.pagination.pages}</span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1 || loading} onClick={() => onPage((v) => Math.max(1, v - 1))} className="p-2 rounded-xl border border-slate-700 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
        <button type="button" disabled={!data.pagination.hasMore || loading} onClick={() => onPage((v) => v + 1)} className="p-2 rounded-xl border border-slate-700 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function ActionDialog({ state, onClose, onDone }: {
  state: DialogState; onClose: () => void; onDone: (message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isDelete = state.action === "delete";
  const titles: Record<ActionKind, string> = {
    suspend: "Suspendre le compte", block: "Bloquer le compte",
    reactivate: "Réactiver le compte", delete: "Demander la suppression du compte",
  };
  const canSubmit = isDelete
    ? reason.trim().length >= 3 && confirmText.trim().toUpperCase() === "SUPPRIMER"
    : state.action === "reactivate" || reason.trim().length >= 3;

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true); setError("");
    let result: { success: boolean; error?: string };
    if (isDelete) {
      result = await requestAdminDeletion(state.user.id, reason.trim());
    } else {
      result = await setPlatformUserStatus(
        state.user.id,
        state.action as "suspend" | "block" | "reactivate",
        reason.trim() || undefined,
        until || undefined
      );
    }
    setBusy(false);
    if (!result.success) { setError(result.error || "Action impossible."); return; }
    onDone(
      isDelete
        ? "Demande de suppression enregistrée : elle ne sera exécutée qu'après le délai de rétention de 7 jours."
        : state.action === "reactivate" ? "Compte réactivé." : "Statut du compte mis à jour."
    );
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full max-w-md bg-[#021231] border border-[#D69E25]/30 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#011D46] border-b border-slate-800">
          <h3 className="text-sm font-black text-white">{titles[state.action]}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-300 hover:bg-white/10" aria-label="Fermer"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3 text-xs">
          <p className="text-slate-300">{state.user.name} — {state.user.email}</p>
          {isDelete && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-200 text-[11px] space-y-1">
              <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Suppression différée</p>
              <p>La suppression définitive n'aura pas lieu avant 7 jours. Les commandes, paiements et historiques financiers sont conservés.</p>
              <p>Les sessions seront révoquées à l'exécution. La demande peut être annulée pendant le délai.</p>
            </div>
          )}
          <label className="block">
            <span className="text-[11px] text-slate-400 font-bold">Motif {state.action === "reactivate" ? "(optionnel)" : "obligatoire"}</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-1 w-full bg-[#011D46] border border-slate-700 rounded-xl p-2.5 text-xs text-white" placeholder="Motif administratif…" />
          </label>
          {state.action === "suspend" && (
            <label className="block">
              <span className="text-[11px] text-slate-400 font-bold">Fin de suspension (optionnel)</span>
              <input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} className="mt-1 w-full bg-[#011D46] border border-slate-700 rounded-xl p-2.5 text-xs text-white" />
            </label>
          )}
          {isDelete && (
            <label className="block">
              <span className="text-[11px] text-red-300 font-bold">Tapez SUPPRIMER pour confirmer</span>
              <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="mt-1 w-full bg-[#011D46] border border-red-500/50 rounded-xl p-2.5 text-xs text-white" placeholder="SUPPRIMER" />
            </label>
          )}
          {error && <p className="text-[11px] text-red-300">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold">Annuler</button>
            <button type="button" disabled={!canSubmit || busy} onClick={() => void submit()} className={`flex-1 py-2.5 rounded-xl font-black text-[#021231] disabled:opacity-40 ${isDelete || state.action === "block" ? "bg-red-400" : state.action === "suspend" ? "bg-amber-400" : "bg-emerald-400"}`}>
              {busy ? "Traitement…" : isDelete ? "Enregistrer la demande" : "Confirmer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Flash({ tone, text, onClose }: { tone: "red" | "green"; text: string; onClose: () => void }) {
  return (
    <div className={`rounded-xl border p-3 text-[11px] flex items-center justify-between gap-3 ${tone === "red" ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"}`}>
      <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {text}</span>
      <button type="button" onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "emerald" | "amber" | "red" | "orange" }) {
  const colors = { emerald: "text-emerald-300", amber: "text-amber-300", red: "text-red-300", orange: "text-orange-300" };
  return (
    <div className="rounded-xl border border-slate-800 bg-[#011D46] p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">{label}</p>
      <p className={`text-xl font-black ${tone ? colors[tone] : "text-white"}`}>{value}</p>
    </div>
  );
}

function Select({ value, onChange, label, children }: {
  value: string; onChange: (value: string) => void; label: string; children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}
      className="bg-[#021231] border border-slate-700 rounded-xl py-2 px-2.5 text-xs text-white">
      <option value="">{label}</option>{children}
    </select>
  );
}

function Avatar({ user }: { user: PlatformUserRow }) {
  if (user.avatar) {
    return <img src={user.avatar} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0" />;
  }
  return (
    <span className="w-8 h-8 rounded-lg bg-[#D69E25]/15 border border-[#D69E25]/30 text-[#D69E25] font-black text-[11px] flex items-center justify-center shrink-0">
      {(user.name || user.email || "?").slice(0, 2).toUpperCase()}
    </span>
  );
}

function IconButton({ label, onClick, tone, children }: {
  label: string; onClick: () => void; tone?: "red" | "amber" | "emerald"; children: React.ReactNode;
}) {
  const colors = { red: "hover:text-red-300 hover:border-red-500/50", amber: "hover:text-amber-300 hover:border-amber-500/50", emerald: "hover:text-emerald-300 hover:border-emerald-500/50" };
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick}
      className={`p-1.5 rounded-lg border border-slate-700 text-slate-400 ${tone ? colors[tone] : "hover:text-white hover:border-[#D69E25]"}`}>
      {children}
    </button>
  );
}




