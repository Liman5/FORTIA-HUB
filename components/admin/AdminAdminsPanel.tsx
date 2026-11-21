"use client";

// ============================================================
// FORTIA HUB — ADMIN : COMPTES ADMINISTRATEURS
// ------------------------------------------------------------
// Réservé au SUPERADMINISTRATEUR :
//   • il crée les administrateurs et DÉFINIT leur mot de passe ;
//   • chaque mot de passe est UNIQUE entre comptes admin (vérifié serveur) ;
//   • un superadministrateur ne peut être ni supprimé, ni désactivé,
//     ni rétrogradé (« personne ne peut supprimer un superadmin »).
// ============================================================

import React, { useCallback, useEffect, useState } from "react";
import type { AdminRoleKey } from "@/lib/shared/adminRoles";
import { ADMIN_ROLE_LABELS, normalizeAdminRole } from "@/lib/shared/adminRoles";
import {
  ShieldCheck,
  Plus,
  Trash2,
  KeyRound,
  Save,
  X,
  Loader2,
  UserPlus,
  Power,
  Mail,
} from "lucide-react";

interface AdminAccount {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt?: string;
}

const SUPER_ROLES = ["superadmin", "super_admin", "owner", "root"];

/** Profils d'administration et leurs droits (miroir de lib/server/adminRoles.ts). */
const ADMIN_ROLE_OPTIONS: { value: AdminRoleKey; label: string; hint: string }[] = [
  {
    value: "general",
    label: "Administrateur général",
    hint: "Modifie tout comme un superadmin, mais peut être supprimé par un superadmin.",
  },
  {
    value: "superviseur",
    label: "Superviseur (lecture seule)",
    hint: "Supervise sans rien modifier : aucune écriture autorisée.",
  },
  {
    value: "financier",
    label: "Administrateur financier",
    hint: "Gère uniquement le domaine finance (commandes, retraits, frais).",
  },
  {
    value: "kyc",
    label: "Vérificateur KYC",
    hint: "Gère uniquement les vérifications KYC.",
  },
  {
    value: "superadmin",
    label: "Superadministrateur",
    hint: "Tous les droits + gestion des comptes. Ne peut jamais être supprimé.",
  },
];

function normalizedRole(role?: string): string {
  return String(role || "").toLowerCase().replace(/[\s_-]+/g, "");
}

function isSuper(role?: string): boolean {
  return SUPER_ROLES.map((r) => r.replace(/[\s_-]+/g, "")).includes(normalizedRole(role));
}

function authToken(): string {
  try {
    return localStorage.getItem("fortia_admin_token") || "";
  } catch {
    return "";
  }
}

export function AdminAdminsPanel() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    email: "",
    name: "",
    role: "general" as AdminRoleKey,
    password: "",
  });
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});

  /** Appel API avec le jeton admin (Bearer). */
  const api = useCallback(async (method: string, url: string, body?: unknown) => {
    const token = authToken();
    const res = await fetch(url, {
      method,
      cache: "no-store",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json };
  }, []);

  const load = useCallback(async () => {
    const { ok, json, status } = await api("GET", "/api/admin/users");
    if (ok && json?.admins) {
      setAdmins(json.admins as AdminAccount[]);
      setMessage(null);
    } else if (status === 403) {
      setMessage({
        type: "error",
        text: json?.error || "Seul un superadministrateur peut gérer les comptes administrateurs.",
      });
    } else if (status === 401) {
      setMessage({ type: "error", text: "Session administrateur requise : reconnectez-vous." });
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const { ok, json } = await api("POST", "/api/admin/users", form);
    if (ok) {
      setMessage({ type: "ok", text: `Administrateur créé : ${form.email}` });
      setForm({ email: "", name: "", role: "general", password: "" });
      setShowForm(false);
      await load();
    } else {
      setMessage({ type: "error", text: json?.error || "Création impossible." });
    }
    setBusy(false);
  };

  const handlePassword = async (admin: AdminAccount) => {
    const password = passwordDrafts[admin.id] || "";
    if (!password) return;
    setBusy(true);
    setMessage(null);
    const { ok, json } = await api("PATCH", "/api/admin/users", { id: admin.id, password });
    if (ok) {
      setMessage({ type: "ok", text: `Mot de passe mis à jour pour ${admin.email}` });
      setPasswordDrafts((prev) => ({ ...prev, [admin.id]: "" }));
    } else {
      setMessage({ type: "error", text: json?.error || "Modification impossible." });
    }
    setBusy(false);
  };

  const handleToggleActive = async (admin: AdminAccount) => {
    setBusy(true);
    setMessage(null);
    const { ok, json } = await api("PATCH", "/api/admin/users", {
      id: admin.id,
      isActive: !admin.isActive,
    });
    if (ok) await load();
    else setMessage({ type: "error", text: json?.error || "Modification impossible." });
    setBusy(false);
  };

  const handleDelete = async (admin: AdminAccount) => {
    if (
      !window.confirm(
        `Supprimer définitivement le compte administrateur « ${admin.email} » ?`
      )
    )
      return;
    setBusy(true);
    setMessage(null);
    const { ok, json } = await api("DELETE", `/api/admin/users?id=${encodeURIComponent(admin.id)}`);
    if (ok) {
      setMessage({ type: "ok", text: `Compte supprimé : ${admin.email}` });
      await load();
    } else {
      setMessage({ type: "error", text: json?.error || "Suppression impossible." });
    }
    setBusy(false);
  };

  const inputClass =
    "w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]";
  const labelClass = "block text-xs font-bold text-slate-300 mb-1";

  return (
    <div className="space-y-6">
      {/* ================= EN-TÊTE ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#021231] p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D69E25]/20 border border-[#D69E25] text-[#D69E25] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-black text-sm flex items-center gap-2">
              <span>Comptes administrateurs</span>
              <span className="bg-[#D69E25]/20 text-[#D69E25] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D69E25]/40">
                {admins.length} compte(s)
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Réservé au superadministrateur : création des admins, définition de leur mot de
              passe (unique pour chaque compte). Un superadmin ne peut jamais être supprimé.
            </p>
          </div>
        </div>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2.5 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nouvel administrateur</span>
          </button>
        ) : (
          <button
            onClick={() => setShowForm(false)}
            className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            <span>Annuler</span>
          </button>
        )}
      </div>

      {/* ================= MESSAGE ================= */}
      {message && (
        <p
          className={`text-xs font-bold rounded-xl p-3 border ${
            message.type === "ok"
              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
              : "text-red-400 bg-red-500/10 border-red-500/30"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* ================= FORMULAIRE DE CRÉATION ================= */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-[#011D46] rounded-2xl border border-slate-700 p-6 space-y-4"
        >
          <h4 className="text-white font-black text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#D69E25]" />
            <span>Créer un compte administrateur</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Adresse e-mail *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin2@fortia-hub.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Nom complet *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nom de l'administrateur"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Rôle</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as AdminRoleKey })}
                className={inputClass}
              >
                {ADMIN_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                {ADMIN_ROLE_OPTIONS.find((option) => option.value === form.role)?.hint}
              </p>
            </div>
            <div>
              <label className={labelClass}>Mot de passe (défini par vous) *</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="8 caractères min. · lettre + chiffre · unique"
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            8 caractères minimum, au moins une lettre et un chiffre. Ce mot de passe ne doit être
            utilisé par aucun autre compte administrateur (le serveur le vérifie).
          </p>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition flex items-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Créer le compte</span>
            </button>
          </div>
        </form>
      )}

      {/* ================= LISTE DES COMPTES ================= */}
      {loading ? (
        <p className="p-8 text-center text-xs text-slate-400 font-semibold bg-[#011D46] rounded-2xl border border-slate-800 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#D69E25]" />
          Chargement des comptes…
        </p>
      ) : admins.length === 0 ? (
        <p className="p-8 text-center text-xs text-slate-400 font-semibold bg-[#011D46] rounded-2xl border border-slate-800">
          Aucun compte administrateur lisible. Vérifiez que vous êtes connecté en
          superadministrateur.
        </p>
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => {
            const superAdmin = isSuper(admin.role);
            return (
              <div
                key={admin.id}
                className="bg-[#011D46] rounded-2xl border border-slate-800 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D69E25]/15 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm truncate">
                      {admin.name || "Sans nom"}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{admin.email}</p>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      superAdmin
                        ? "bg-[#D69E25]/15 border-[#D69E25]/40 text-[#D69E25]"
                        : "bg-slate-500/15 border-slate-500/40 text-slate-300"
                    }`}
                  >
                    {ADMIN_ROLE_LABELS[normalizeAdminRole(admin.role)]}
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      admin.isActive
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : "bg-red-500/10 border-red-500/30 text-red-400"
                    }`}
                  >
                    {admin.isActive ? "Actif" : "Inactif"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {admin.lastLoginAt
                      ? `Dernière connexion : ${new Date(admin.lastLoginAt).toLocaleDateString("fr-FR")}`
                      : "Jamais connecté"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Mot de passe : défini par le superadmin, unique par compte */}
                  <input
                    type="password"
                    value={passwordDrafts[admin.id] || ""}
                    onChange={(e) =>
                      setPasswordDrafts((prev) => ({ ...prev, [admin.id]: e.target.value }))
                    }
                    placeholder="Nouveau mot de passe (unique)"
                    autoComplete="new-password"
                    className="flex-1 min-w-[200px] bg-[#021231] border border-slate-700 text-xs rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D69E25]"
                  />
                  <button
                    onClick={() => handlePassword(admin)}
                    disabled={busy || !(passwordDrafts[admin.id] || "")}
                    className="px-3 py-2 rounded-xl bg-[#D69E25]/15 border border-[#D69E25]/40 text-[#D69E25] hover:bg-[#D69E25] hover:text-[#021231] transition text-[10px] font-black flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <KeyRound className="w-3 h-3" />
                    Définir le mot de passe
                  </button>

                  {/* Activation : interdite sur un superadmin */}
                  {!superAdmin && (
                    <button
                      onClick={() => handleToggleActive(admin)}
                      disabled={busy}
                      className={`px-3 py-2 rounded-xl border transition text-[10px] font-black flex items-center gap-1.5 disabled:opacity-40 ${
                        admin.isActive
                          ? "bg-slate-500/15 border-slate-500/40 text-slate-300 hover:bg-slate-600/40"
                          : "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30"
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      {admin.isActive ? "Désactiver" : "Activer"}
                    </button>
                  )}

                  {/* Suppression : JAMAIS un superadmin */}
                  {superAdmin ? (
                    <span
                      className="px-3 py-2 rounded-xl bg-[#021231] border border-slate-700 text-[10px] font-black text-slate-500 cursor-not-allowed"
                      title="Personne ne peut supprimer un superadministrateur."
                    >
                      Superadmin protégé
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDelete(admin)}
                      disabled={busy}
                      className="px-3 py-2 rounded-xl bg-red-600/25 border border-red-500/40 text-red-400 hover:bg-red-600 hover:text-white transition text-[10px] font-black flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Trash2 className="w-3 h-3" />
                      Supprimer
                    </button>
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
