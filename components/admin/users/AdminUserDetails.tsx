"use client";

import React from "react";
import { X, Mail, Phone, Calendar, ShieldCheck, Store, GraduationCap, Briefcase, Clock } from "lucide-react";
import type { PlatformUserDetail } from "@/lib/services/admin/platformUsers";
import { KycBadge, UserRoleBadges, UserStatusBadge, formatUserDate } from "./UserBadges";

export function AdminUserDetails({
  user,
  onClose,
}: {
  user: PlatformUserDetail;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[140] bg-black/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto bg-[#021231] border border-[#D69E25]/30 rounded-3xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 bg-[#011D46] border-b border-slate-800">
          <div className="min-w-0">
            <h3 className="text-base font-black text-white truncate">{user.name || "Utilisateur"}</h3>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10" aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <UserStatusBadge status={user.accountStatus} />
            <KycBadge status={user.kycStatus} />
            <UserRoleBadges roles={user.roles} />
            {!user.isActive && <span className="text-[10px] font-bold text-red-300">Accès désactivé</span>}
          </div>

          {user.statusReason && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-amber-200">
              <p className="font-bold text-[11px]">Motif du statut</p>
              <p className="text-[11px] mt-1 whitespace-pre-wrap">{user.statusReason}</p>
              {user.suspendedUntil && <p className="text-[10px] mt-1">Fin de suspension : {formatUserDate(user.suspendedUntil)}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Info icon={<Mail className="w-3.5 h-3.5" />} label="E-mail" value={user.email} />
            <Info icon={<Phone className="w-3.5 h-3.5" />} label="Téléphone" value={user.phone || "—"} />
            <Info icon={<Calendar className="w-3.5 h-3.5" />} label="Inscription" value={formatUserDate(user.createdAt)} />
            <Info icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Identifiant" value={user.id} mono />
            <Info icon={<GraduationCap className="w-3.5 h-3.5" />} label="Compte" value={user.accountType} />
            <Info icon={<Clock className="w-3.5 h-3.5" />} label="Dernière mise à jour" value={formatUserDate(user.updatedAt)} />
          </div>

          {user.trainingCenters?.length ? (
            <Section title="Centre(s) de formation" icon={<GraduationCap className="w-4 h-4" />}>
              {user.trainingCenters.map((center) => (
                <Row key={center.id} label={center.centerName || center.name || center.id} value={center.status || ""} />
              ))}
            </Section>
          ) : null}

          {user.stores?.length ? (
            <Section title="Boutique(s)" icon={<Store className="w-4 h-4" />}>
              {user.stores.map((store) => (
                <Row key={store.id} label={store.name || store.id} value={store.status || ""} />
              ))}
            </Section>
          ) : null}

          {user.freelanceProfile || user.enterpriseProfile ? (
            <Section title="Profil prestataire" icon={<Briefcase className="w-4 h-4" />}>
              <Row
                label={user.freelanceProfile?.title || user.enterpriseProfile?.companyName || "Profil"}
                value={user.freelanceProfile ? "Freelance" : "Entreprise"}
              />
            </Section>
          ) : null}

          <Section title="Dossiers KYC" icon={<ShieldCheck className="w-4 h-4" />}>
            {user.kycSubmissions?.length ? (
              user.kycSubmissions.map((submission) => (
                <Row
                  key={submission.id}
                  label={`${submission.applicantType || "Dossier"} — ${formatUserDate(submission.submittedAt)}`}
                  value={submission.status}
                />
              ))
            ) : (
              <p className="text-[11px] text-slate-500">Aucun dossier.</p>
            )}
          </Section>

          <Section title="Commandes récentes" icon={<Store className="w-4 h-4" />}>
            {user.purchases?.length ? (
              user.purchases.map((purchase) => (
                <Row
                  key={purchase.id}
                  label={`${purchase.orderNumber} — ${purchase.productTitle}`}
                  value={`${purchase.status} · ${Number(purchase.amountUsd || 0).toFixed(2)} $`}
                />
              ))
            ) : (
              <p className="text-[11px] text-slate-500">Aucune commande.</p>
            )}
          </Section>

          <Section title="Demandes de suppression" icon={<Clock className="w-4 h-4" />}>
            {user.pendingDeletions?.length ? (
              user.pendingDeletions.map((request) => (
                <Row
                  key={request.id}
                  label={`${request.origin} · demandée le ${formatUserDate(request.requestedAt)}`}
                  value={`${request.status} · prévue ${formatUserDate(request.deleteAt)}`}
                />
              ))
            ) : (
              <p className="text-[11px] text-slate-500">Aucune demande.</p>
            )}
          </Section>

          <Section title="Historique administratif" icon={<ShieldCheck className="w-4 h-4" />}>
            {user.auditLogs?.length ? (
              user.auditLogs.map((log) => (
                <Row
                  key={log.id}
                  label={`${log.action} · ${formatUserDate(log.createdAt)}`}
                  value={log.reason || log.actorEmail}
                />
              ))
            ) : (
              <p className="text-[11px] text-slate-500">Aucune action enregistrée.</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#011D46] p-3">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-400 font-bold">
        {icon} {label}
      </p>
      <p className={`mt-1 text-slate-200 break-all ${mono ? "font-mono text-[10px]" : "text-[11px]"}`}>{value}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#011D46]/60 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-black text-[#D69E25] mb-2">
        {icon} {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-800/70 pb-1.5 last:border-0">
      <span className="text-slate-300 min-w-0 break-words">{label}</span>
      <span className="text-slate-400 text-right shrink-0">{value}</span>
    </div>
  );
}


