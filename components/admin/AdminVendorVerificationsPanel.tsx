"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  User,
  X,
  XCircle,
} from "lucide-react";
import { apiWritePlatform } from "@/lib/services/platformWrite";

/**
 * ADMIN → « Vérification Boutique »
 * Module INDÉPENDANT : examen des candidatures vendeurs avec TOUTES les
 * informations du candidat (identité, coordonnées, projet, dossier KYC)
 * AVANT approbation. La liste est mise à jour EN PLACE après une action,
 * puis resynchronisée : plus de disparition inexpliquée.
 */

type Status = "En attente" | "Approuve" | "Rejete";

interface VendorApp {
  id: string;
  userId?: string | null;
  applicantName?: string;
  email?: string;
  phone?: string;
  storeName?: string;
  storeCategory?: string;
  storeDescription?: string;
  experienceBio?: string;
  submittedAt?: string;
  status?: string;
  adminNotes?: string;
}

interface KycRow {
  id: string;
  email?: string;
  fullName?: string;
  documentType?: string;
  status?: string;
  submittedAt?: string;
}

interface StoreRow {
  id: string;
  name?: string;
  ownerEmail?: string;
  status?: string;
}

const STATUS_LABEL: Record<Status, string> = {
  "En attente": "En attente",
  Approuve: "Approuvée",
  Rejete: "Rejetée",
};

const STATUS_CLASS: Record<Status, string> = {
  "En attente": "text-amber-300 bg-amber-500/10 border-amber-500/40",
  Approuve: "text-emerald-300 bg-emerald-500/10 border-emerald-500/40",
  Rejete: "text-red-300 bg-red-500/10 border-red-500/40",
};

const adminHeaders = (): Record<string, string> => {
  let token = "";
  try {
    token = localStorage.getItem("fortia_admin_token") || "";
  } catch {
    token = "";
  }
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const normalizeStatus = (raw?: string): Status => {
  const value = String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (value.includes("approuv")) return "Approuve";
  if (value.includes("rejet") || value.includes("refus")) return "Rejete";
  return "En attente";
};

const dateLabel = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Ligne d'information (libellé + valeur). */
const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="rounded-xl border border-slate-800 bg-[#011D46] p-3">
    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
      <span className="text-[#D69E25]">{icon}</span> {label}
    </p>
    <p className="text-sm text-white mt-0.5 break-words">{value || "—"}</p>
  </div>
);

export const AdminVendorVerificationsPanel: React.FC = () => {
  const [apps, setApps] = useState<VendorApp[]>([]);
  const [kycRows, setKycRows] = useState<KycRow[]>([]);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [statusFilter, setStatusFilter] = useState<Status | "Toutes">("En attente");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/platform/admin-sync", {
        headers: adminHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        setError(
          res.status === 401
            ? "Session administrateur requise : reconnectez-vous à l'espace d'administration."
            : "Impossible de charger les candidatures."
        );
        return;
      }
      const json = await res.json();
      const data = json?.data || {};
      setApps(Array.isArray(data.vendorApplications) ? data.vendorApplications : []);
      setKycRows(Array.isArray(data.kycSubmissions) ? data.kycSubmissions : []);
      setStores(Array.isArray(data.stores) ? data.stores : []);
      setError("");
    } catch {
      setError("Impossible de charger les candidatures (réseau).");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const counts = useMemo(() => {
    const base = { "En attente": 0, Approuve: 0, Rejete: 0 } as Record<Status, number>;
    apps.forEach((app) => {
      base[normalizeStatus(app.status)] += 1;
    });
    return base;
  }, [apps]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return apps
      .filter((app) => statusFilter === "Toutes" || normalizeStatus(app.status) === statusFilter)
      .filter((app) => {
        if (!term) return true;
        return [app.applicantName, app.email, app.storeName, app.storeCategory, app.phone]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      });
  }, [apps, statusFilter, query]);

  const selected = useMemo(
    () => apps.find((app) => app.id === selectedId) || null,
    [apps, selectedId]
  );

  const selectedKyc = useMemo(() => {
    if (!selected?.email) return null;
    return (
      kycRows.find(
        (row) => String(row.email || "").toLowerCase() === String(selected.email).toLowerCase()
      ) || null
    );
  }, [kycRows, selected]);

  const selectedStore = useMemo(() => {
    if (!selected) return null;
    return (
      stores.find(
        (store) =>
          (store.ownerEmail &&
            String(store.ownerEmail).toLowerCase() ===
              String(selected.email || "").toLowerCase()) ||
          (store.name && store.name === selected.storeName)
      ) || null
    );
  }, [stores, selected]);

  const decide = async (app: VendorApp, approve: boolean) => {
    setBusyId(app.id);
    setError("");
    setNotice("");

    const res = await apiWritePlatform(approve ? "approve-vendor-app" : "reject-vendor-app", {
      id: app.id,
      adminNotes: approve ? "" : rejectReason.trim(),
      reason: approve ? "" : rejectReason.trim(),
    });

    setBusyId(null);

    if (!res.success) {
      setError(
        (res as { error?: string }).error ||
          "Action impossible : vérifiez votre session administrateur."
      );
      return;
    }

    // Mise à jour EN PLACE : la candidature reste visible, son statut change.
    setApps((prev) =>
      prev.map((row) =>
        row.id === app.id
          ? { ...row, status: approve ? "Approuve" : "Rejete", adminNotes: rejectReason.trim() }
          : row
      )
    );
    setRejectReason("");
    setNotice(
      approve
        ? `Boutique « ${app.storeName || "—"} » approuvée : elle est active et le vendeur a été notifié.`
        : `Candidature de « ${app.storeName || "—"} » rejetée. Le candidat a été notifié.`
    );

    void load(true);
  };

  return (
    <div className="space-y-5">
      {/* ===== RÉCAPITULATIF ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["En attente", "Approuve", "Rejete"] as Status[]).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`text-left rounded-2xl border p-4 transition ${
              statusFilter === status
                ? "border-[#D69E25] bg-[#011D46]"
                : "border-slate-800 bg-[#021231] hover:border-[#D69E25]/50"
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {STATUS_LABEL[status]}
            </span>
            <p className="text-2xl font-black text-white mt-1">{counts[status]}</p>
            <span className="text-[10px] text-slate-500">
              {status === "En attente"
                ? "À examiner"
                : status === "Approuve"
                  ? "Boutiques ouvertes"
                  : "Refusées"}
            </span>
          </button>
        ))}
      </div>

      {/* ===== RECHERCHE + ACTIONS ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 h-11 px-3 rounded-xl bg-[#011D46] border border-slate-700 focus-within:border-[#D69E25]">
          <Search className="w-4 h-4 text-[#D69E25] shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un candidat, un e-mail, une boutique…"
            className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Effacer">
              <X className="w-4 h-4 text-slate-400 hover:text-white" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("Toutes")}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
              statusFilter === "Toutes"
                ? "bg-[#D69E25] text-[#021231] border-[#D69E25]"
                : "border-slate-700 text-slate-300 hover:border-[#D69E25]"
            }`}
          >
            Toutes ({apps.length})
          </button>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 hover:border-[#D69E25] transition flex items-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Actualiser
          </button>
        </div>
      </div>

      {notice && (
        <p className="text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
          {notice}
        </p>
      )}
      {error && (
        <p className="text-xs font-bold text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          {error}
        </p>
      )}

      {/* ===== LISTE ===== */}
      {loading && apps.length === 0 ? (
        <p className="text-sm text-slate-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement des candidatures…
        </p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#021231] p-8 text-center space-y-2">
          <Store className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-white">
            {statusFilter === "En attente"
              ? "Aucune candidature en attente"
              : `Aucune candidature « ${STATUS_LABEL[statusFilter as Status] || statusFilter} »`}
          </p>
          <p className="text-xs text-slate-400">
            Les nouvelles demandes de boutique apparaissent ici dès leur envoi.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
          {filtered.map((app) => {
            const status = normalizeStatus(app.status);
            const hasKyc = kycRows.some(
              (row) =>
                String(row.email || "").toLowerCase() === String(app.email || "").toLowerCase()
            );
            return (
              <div
                key={app.id}
                className="p-4 bg-[#011D46] flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-[#D69E25]/15 border border-[#D69E25]/30 flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-[#D69E25]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {app.storeName || "Boutique sans nom"}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {app.applicantName || "—"} · {app.email || "—"} · {app.storeCategory || "—"}
                    </p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3" /> {dateLabel(app.submittedAt)}
                      {hasKyc && (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> KYC reçu
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[9px] font-black px-2 py-1 rounded-full border ${STATUS_CLASS[status]}`}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(app.id);
                      setRejectReason(app.adminNotes || "");
                      setNotice("");
                      setError("");
                    }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-black border border-slate-700 text-slate-200 hover:border-[#D69E25] transition flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> Examiner
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== PANNEAU DÉTAIL : toutes les informations du candidat ===== */}
      {selected && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl bg-[#021231] border border-slate-700 rounded-2xl overflow-hidden">
            <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-800 bg-[#011D46]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#D69E25]">
                  Dossier candidature vendeur
                </p>
                <h3 className="text-lg font-black text-white">{selected.storeName || "Boutique"}</h3>
                <p className="text-[11px] text-slate-400">
                  Envoyée le {dateLabel(selected.submittedAt)} ·{" "}
                  {STATUS_LABEL[normalizeStatus(selected.status)]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="p-2 rounded-xl border border-slate-700 text-slate-300 hover:border-[#D69E25]"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow icon={<User className="w-4 h-4" />} label="Candidat" value={selected.applicantName} />
                <InfoRow icon={<Mail className="w-4 h-4" />} label="E-mail" value={selected.email} />
                <InfoRow icon={<Phone className="w-4 h-4" />} label="Téléphone / WhatsApp" value={selected.phone} />
                <InfoRow icon={<Store className="w-4 h-4" />} label="Catégorie" value={selected.storeCategory} />
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#011D46] p-3 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Description de la boutique
                </p>
                <p className="text-sm text-slate-200 whitespace-pre-line">
                  {selected.storeDescription || "Non renseignée"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#011D46] p-3 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Expérience / motivation
                </p>
                <p className="text-sm text-slate-200 whitespace-pre-line">
                  {selected.experienceBio || "Non renseignée"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#011D46] p-3 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D69E25]" /> Vérification d'identité (KYC)
                </p>
                {selectedKyc ? (
                  <p className="text-sm text-slate-200">
                    {selectedKyc.fullName || "—"} · {selectedKyc.documentType || "Document"} ·{" "}
                    <span className="text-slate-400">
                      statut {selectedKyc.status || "en attente"} · {dateLabel(selectedKyc.submittedAt)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-amber-300">
                    Aucun dossier KYC associé à cet e-mail — à vérifier avant d'approuver.
                  </p>
                )}
              </div>

              {selectedStore && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs text-emerald-200">
                    Une boutique « {selectedStore.name} » existe déjà ({selectedStore.status || "active"}).
                    L'approbation ne créera pas de doublon.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <textarea
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  rows={2}
                  placeholder="Motif (facultatif) — transmis au candidat en cas de rejet, conservé en note interne si approbation."
                  className="w-full bg-[#011D46] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    disabled={busyId === selected.id}
                    onClick={() => decide(selected, true)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-xs hover:bg-emerald-500 transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {busyId === selected.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Approuver et ouvrir la boutique
                  </button>
                  <button
                    type="button"
                    disabled={busyId === selected.id}
                    onClick={() => decide(selected, false)}
                    className="px-4 py-2.5 rounded-xl border border-red-500/50 text-red-300 font-black text-xs hover:bg-red-600 hover:text-white transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {busyId === selected.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Rejeter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVendorVerificationsPanel;
