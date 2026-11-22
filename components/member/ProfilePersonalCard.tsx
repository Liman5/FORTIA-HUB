"use client";

import React, { useMemo, useState } from "react";
import { Camera, CheckCircle2, AlertTriangle, Loader2, Pencil, User, Mail, Phone, ShieldCheck, X } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { apiWritePlatform } from "@/lib/services/platformWrite";

export function ProfilePersonalCard({
  user, onSaved, fileInputRef, onAvatarChange, isUploadingAvatar, avatarError, avatarSuccess,
}: {
  user: UserProfile;
  onSaved: (updates: Partial<UserProfile>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingAvatar: boolean;
  avatarError: string | null;
  avatarSuccess: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const completion = useMemo(() => {
    const checks = [
      Boolean(user.name?.trim()),
      Boolean(user.email?.trim()),
      Boolean(user.phone?.trim()),
      Boolean(user.avatar?.trim()),
      user.kycStatus === "approuve",
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [user]);

  const initials = (user.name || user.email || "M").slice(0, 2).toUpperCase();

  const save = async () => {
    if (!name.trim()) { setError("Le nom complet est obligatoire."); return; }
    setSaving(true); setError(""); setNotice("");
    const result = await apiWritePlatform("update-profile", { name: name.trim(), phone: phone.trim() });
    setSaving(false);
    if (!result.success) { setError(result.error || "Enregistrement impossible."); return; }
    onSaved({ name: name.trim(), phone: phone.trim() });
    setEditing(false);
    setNotice("Profil mis à jour avec succès.");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-black text-slate-900">Informations personnelles</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">Vos coordonnées et votre photo de profil.</p>
        </div>
        <button type="button" onClick={() => { setEditing((v) => !v); setError(""); setNotice(""); }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
          {editing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          {editing ? "Annuler" : "Modifier"}
        </button>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
          <div className="relative">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name || "Membre"} className="h-24 w-24 rounded-full border-2 border-white object-cover shadow-sm" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xl font-black text-slate-500 shadow-sm">{initials}</div>
            )}
            {isUploadingAvatar && <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50"><Loader2 className="h-5 w-5 animate-spin text-white" /></div>}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onAvatarChange} className="hidden" id="avatar-upload-input" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:border-slate-300 disabled:opacity-50">
            <Camera className="h-3.5 w-3.5" /> {isUploadingAvatar ? "Envoi..." : "Changer la photo"}
          </button>
          <p className="text-[10px] text-slate-500">JPG, PNG ou WebP · 5 Mo max.</p>
          {avatarError && <p className="flex items-center gap-1 text-[10px] font-semibold text-red-600"><AlertTriangle className="h-3 w-3" /> {avatarError}</p>}
          {avatarSuccess && <p className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Photo mise à jour</p>}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-slate-600">Complétion du profil</span>
              <span className="text-[11px] font-black text-slate-900">{completion}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${completion}%` }} />
            </div>
            <p className="mt-2 text-[10px] text-slate-500">Calculée à partir de vos informations réellement renseignées.</p>
          </div>

          {editing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field icon={<User className="h-3.5 w-3.5" />} label="Nom complet">
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#B07A14]" />
              </Field>
              <Field icon={<Mail className="h-3.5 w-3.5" />} label="Adresse e-mail">
                <input value={user.email} disabled className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500" />
              </Field>
              <Field icon={<Phone className="h-3.5 w-3.5" />} label="Téléphone / WhatsApp">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#B07A14]" />
              </Field>
              <Field icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Vérification KYC">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                  {user.kycStatus === "approuve" ? "Identité vérifiée" : user.kycStatus === "en_attente" ? "En attente" : user.kycStatus === "rejete" ? "Rejetée" : "Non soumise"}
                </div>
              </Field>
              {error && <p className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">{error}</p>}
              {notice && <p className="sm:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">{notice}</p>}
              <div className="sm:col-span-2 flex justify-end">
                <button type="button" onClick={() => void save()} disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-4 py-2.5 text-[11px] font-bold text-white hover:bg-[#12365C] disabled:opacity-50">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Info icon={<User className="h-3.5 w-3.5" />} label="Nom complet" value={user.name || "Non renseigné"} />
              <Info icon={<Mail className="h-3.5 w-3.5" />} label="Adresse e-mail" value={user.email || "Non renseignée"} />
              <Info icon={<Phone className="h-3.5 w-3.5" />} label="Téléphone" value={user.phone || "Non renseigné"} />
              <Info icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Type de compte" value={(user.accountType || "buyer").toUpperCase()} />
              {notice && <p className="sm:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">{notice}</p>}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{icon} {label}</span>
      {children}
    </label>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{icon} {label}</p>
      <p className="mt-1 truncate text-xs font-semibold text-slate-900">{value}</p>
    </div>
  );
}

