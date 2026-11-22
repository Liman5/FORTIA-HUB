"use client";

import React, { useMemo, useState } from "react";
import { Camera, CheckCircle2, AlertTriangle, Loader2, Pencil, Mail, Phone, ShieldCheck, X } from "lucide-react";
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
      Boolean(user.name?.trim()), Boolean(user.email?.trim()), Boolean(user.phone?.trim()),
      Boolean(user.avatar?.trim()), user.kycStatus === "approuve",
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [user]);

  const missing = [
    !user.name?.trim() && "nom",
    !user.phone?.trim() && "téléphone",
    !user.avatar?.trim() && "photo",
    user.kycStatus !== "approuve" && "vérification KYC",
  ].filter(Boolean) as string[];

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
    <section className="ibx-surface rounded-[var(--ibx-radius-lg)]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <div>
          <h2 className="ibx-section-title">Informations personnelles</h2>
          <p className="ibx-section-subtitle mt-0.5">Coordonnées, photo et complétion du profil.</p>
        </div>
        <button type="button" onClick={() => { setEditing((v) => !v); setError(""); setNotice(""); }} className="ibx-btn ibx-btn-outline">
          {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {editing ? "Annuler" : "Modifier"}
        </button>
      </div>

      <div className="ibx-divider grid gap-6 p-5 sm:p-6 lg:grid-cols-[180px_1fr]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name || "Membre"} className="h-24 w-24 rounded-full object-cover" />
            ) : (
              <div className="ibx-surface-muted flex h-24 w-24 items-center justify-center rounded-full text-xl font-black">{initials}</div>
            )}
            {isUploadingAvatar && <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50"><Loader2 className="h-5 w-5 animate-spin text-white" /></div>}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onAvatarChange} className="hidden" id="avatar-upload-input" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar} className="ibx-btn ibx-btn-secondary">
            <Camera className="h-3.5 w-3.5" /> {isUploadingAvatar ? "Envoi..." : "Changer la photo"}
          </button>
          <p className="ibx-help">JPG, PNG ou WebP · 5 Mo max.</p>
          {avatarError && <p className="ibx-error flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {avatarError}</p>}
          {avatarSuccess && <p className="ibx-success-text flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Photo mise à jour</p>}
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="ibx-label">Complétion du profil</span>
              <span className="ibx-fg text-xs font-black">{completion}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ibx-surface-strong)]">
              <div className="h-full rounded-full bg-[var(--ibx-success)] transition-all" style={{ width: `${completion}%` }} />
            </div>
            <p className="ibx-help mt-2">{missing.length === 0 ? "Votre profil est complet." : `À compléter : ${missing.join(", ")}.`}</p>
          </div>

          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom complet"><input className="ibx-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Adresse e-mail"><input className="ibx-input" value={user.email} disabled /></Field>
              <Field label="Téléphone / WhatsApp"><input className="ibx-input" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
              <Field label="Vérification KYC"><input className="ibx-input" value={user.kycStatus === "approuve" ? "Identité vérifiée" : user.kycStatus === "en_attente" ? "En attente" : user.kycStatus === "rejete" ? "Rejetée" : "Non soumise"} disabled /></Field>
              {error && <p className="ibx-error sm:col-span-2">{error}</p>}
              {notice && <p className="ibx-success-text sm:col-span-2">{notice}</p>}
              <div className="flex justify-end sm:col-span-2">
                <button type="button" onClick={() => void save()} disabled={saving} className="ibx-btn ibx-btn-primary">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--ibx-border)]">
              <Info label="Nom complet" value={user.name || "Non renseigné"} />
              <Info icon={<Mail className="h-3.5 w-3.5" />} label="Adresse e-mail" value={user.email || "Non renseignée"} />
              <Info icon={<Phone className="h-3.5 w-3.5" />} label="Téléphone" value={user.phone || "Non renseigné"} />
              <Info icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Type de compte" value={(user.accountType || "buyer").toUpperCase()} />
              {notice && <p className="ibx-success-text pt-3">{notice}</p>}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="ibx-label mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Info({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <span className="ibx-fg-muted flex items-center gap-1.5 text-[11px] font-semibold">{icon} {label}</span>
      <span className="ibx-fg truncate text-right text-xs font-semibold">{value}</span>
    </div>
  );
}

