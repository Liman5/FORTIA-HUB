"use client";

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { EnterpriseProfile, RegistrationFeeConfig } from '../types';
import { OptimizedImage } from './OptimizedImage';
import {
  Building2,
  ShieldCheck,
  Mail,
  Phone,
  Globe,
  PlusCircle,
  ExternalLink,
  X,
  Award,
  BadgeCheck,
  Users,
  Briefcase,
  TrendingUp,
} from 'lucide-react';

interface EnterpriseDirectoryProps {
  enterprises: EnterpriseProfile[];
  feeConfig: RegistrationFeeConfig;
  onOpenKycModal: () => void;
  /** Masque l'appel à soumettre un dossier KYC (compte déjà vérifié). */
  hideKycCta?: boolean;
}

export const EnterpriseDirectory: React.FC<EnterpriseDirectoryProps> = ({
  enterprises,
  feeConfig,
  onOpenKycModal,
  hideKycCta = false
}) => {
  const [selectedEnterprise, setSelectedEnterprise] = useState<EnterpriseProfile | null>(null);

  return (
    <section className="relative min-h-[520px] overflow-hidden py-8" id="enterprise-section">
      {/* Background decoration */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/20 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="ibx-card flex flex-col items-start justify-between gap-5 p-5 sm:p-6 md:flex-row md:items-center"
        >
          <div className="max-w-2xl space-y-2.5">
            <span className="ibx-badge">
              <Building2 className="h-3 w-3" aria-hidden="true" />
              Répertoire des entreprises certifiées
            </span>
            <h1 className="ibx-h1 !text-[1.35rem] sm:!text-[1.6rem]">
              Espace entreprises &amp;{" "}
              <span style={{ color: "var(--ibx-accent-strong)" }}>agences partenaires</span>
            </h1>
            <p className="ibx-body max-w-xl">
              Découvrez les sociétés certifiées arborant le badge doré FORTIA HUB.
              Immatriculations juridiques vérifiées, équipes de spécialistes et solutions B2B
              sur-mesure.
            </p>

            <div className="ibx-toolbar pt-0.5">
              <span className="ibx-badge">
                <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                Immatriculation vérifiée
              </span>
              <span className="ibx-badge">
                <Award className="h-3 w-3" aria-hidden="true" />
                Badge doré exclusif
              </span>
            </div>
          </div>

          {/* CTA */}
          {!hideKycCta && (
          <div className="ibx-card-flat w-full shrink-0 space-y-3 p-4 text-center md:w-72">
            <span
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-[var(--ibx-radius-sm)]"
              style={{ backgroundColor: "var(--ibx-accent-soft)", color: "var(--ibx-accent-strong)" }}
              aria-hidden="true"
            >
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="ibx-h3 !text-[12.5px]">Inscrire votre entreprise ?</h2>
              <p className="ibx-tiny mt-1 !text-[9.5px]">
                Frais de vérification :{" "}
                <span className="font-bold" style={{ color: "var(--ibx-accent-strong)" }}>
                  {feeConfig.enterpriseFeeUsd}$ / {feeConfig.enterpriseFeeFcfa.toLocaleString()} FCFA
                </span>
              </p>
            </div>
            <button type="button" onClick={onOpenKycModal} className="ibx-btn ibx-btn-primary w-full">
              <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Demande de validation
            </button>
          </div>
          )}
        </motion.div>

        {/* Chiffres clés */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {[
            { icon: Building2, value: `${enterprises.length}`, label: "Entreprises certifiées" },
            { icon: Users, value: "100%", label: "Badges dorés vérifiés" },
            { icon: Briefcase, value: "B2B", label: "Solutions sur-mesure" },
            { icon: TrendingUp, value: "24/7", label: "Accompagnement dédié" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="ibx-card-flat flex items-center gap-2 p-2.5">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--ibx-radius-sm)]"
                  style={{ backgroundColor: "var(--ibx-surface-muted)", color: "var(--ibx-accent-strong)" }}
                  aria-hidden="true"
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="ibx-h3 !text-[12px] leading-none">{stat.value}</div>
                  <div className="ibx-tiny mt-0.5 truncate !text-[9px]">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Entreprises */}
        <div className="ibx-cards-row md:grid-cols-2">
          {enterprises.map((enterprise, index) => (
            <motion.div
              key={enterprise.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.05, ease: "easeOut" }}
              className="ibx-card ibx-interactive group relative flex w-[280px] flex-col overflow-hidden md:w-auto"
            >
              <div className="flex-1 space-y-3 p-4">
                {/* En-tête société */}
                <div className="flex items-start gap-3">
                  <OptimizedImage
                    src={enterprise.logo}
                    alt={enterprise.companyName}
                    fallbackCategory={enterprise.sector}
                    className="h-12 w-12 shrink-0 rounded-xl border object-cover"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="ibx-h3 truncate !text-[13px]">{enterprise.companyName}</h3>
                      <span className="ibx-badge !text-[8.5px]">
                        <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" />
                        Badge doré
                      </span>
                    </div>
                    <p className="ibx-tiny truncate !text-[10px] font-semibold" style={{ color: "var(--ibx-accent-strong)" }}>
                      {enterprise.tagline}
                    </p>
                    <p className="ibx-tiny truncate !text-[9px]">
                      {enterprise.sector} • {enterprise.country}
                    </p>
                  </div>
                </div>

                <p className="ibx-tiny line-clamp-3 !text-[10px]">{enterprise.description}</p>

                {/* Services institutionnels */}
                {enterprise.offeredServices && enterprise.offeredServices.length > 0 && (
                  <div className="space-y-1.5 border-t pt-2.5" style={{ borderColor: "var(--ibx-border)" }}>
                    <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "var(--ibx-accent-strong)" }}>
                      Services institutionnels
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {enterprise.offeredServices.map((serv, idx) => (
                        <div
                          key={idx}
                          className="ibx-card-muted flex items-center justify-between gap-2 p-2"
                        >
                          <span className="ibx-h3 truncate !text-[10.5px]">{serv.title}</span>
                          <span className="shrink-0 text-[10px] font-bold" style={{ color: "var(--ibx-accent-strong)" }}>
                            Dès {serv.startingPrice}$
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Équipe */}
                {enterprise.team && enterprise.team.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "var(--ibx-fg-subtle)" }}>
                      Équipe dirigeante
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {enterprise.team.map((member, idx) => (
                        <div key={idx} className="ibx-card-muted flex items-center gap-1.5 px-2 py-1">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="h-5 w-5 rounded-full object-cover"
                          />
                          <span className="ibx-tiny !text-[9px] font-semibold">{member.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pied de carte */}
              <div
                className="flex items-center justify-between gap-3 border-t px-4 py-2.5"
                style={{ borderColor: "var(--ibx-border)", backgroundColor: "var(--ibx-surface-muted)" }}
              >
                <div className="flex items-center gap-2.5" style={{ color: "var(--ibx-fg-muted)" }}>
                  {enterprise.contactEmail && (
                    <span className="flex items-center gap-1 text-[9px]">
                      <Mail className="h-3 w-3" aria-hidden="true" />
                      Email
                    </span>
                  )}
                  {enterprise.contactPhone && (
                    <span className="flex items-center gap-1 text-[9px]">
                      <Phone className="h-3 w-3" aria-hidden="true" />
                      Tél
                    </span>
                  )}
                  {enterprise.website && (
                    <span className="flex items-center gap-1 text-[9px]">
                      <Globe className="h-3 w-3" aria-hidden="true" />
                      Web
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedEnterprise(enterprise)}
                  className="ibx-btn ibx-btn-outline !px-2.5 !py-1 !text-[10px]"
                >
                  Fiche société
                  <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Selected Enterprise Detail Modal */}
        {selectedEnterprise && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative bg-[#021231] border border-[#D69E25]/40 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl shadow-[#D69E25]/10"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent" />

              <button
                onClick={() => setSelectedEnterprise(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-5 pt-2">
                <img
                  src={selectedEnterprise.logo}
                  alt={selectedEnterprise.companyName}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400/40 p-1 bg-[#011D46]"
                />
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-white">{selectedEnterprise.companyName}</h2>
                    <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-[#021231] text-[10px] font-extrabold flex items-center gap-1 shadow-lg shadow-amber-500/20">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Badge Doré
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#D69E25]">{selectedEnterprise.tagline}</p>
                  <p className="text-xs text-slate-400">{selectedEnterprise.sector} • {selectedEnterprise.country}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-sm text-white">Présentation de l'Établissement</h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{selectedEnterprise.description}</p>
              </div>

              {/* Portfolio */}
              {selectedEnterprise.portfolio && selectedEnterprise.portfolio.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-white">Réalisations & Portfolio</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedEnterprise.portfolio.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] space-y-2 pb-3 group/portfolio hover:border-[#D69E25]/40 transition-colors"
                      >
                        <div className="relative overflow-hidden">
                          <img src={item.image} alt={item.title} className="w-full h-32 object-cover group-hover/portfolio:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#021231]/80 to-transparent" />
                          <span className="absolute bottom-2 left-3 px-2 py-0.5 rounded-md bg-[#D69E25]/90 text-[#021231] text-[9px] font-black">
                            {item.category}
                          </span>
                        </div>
                        <div className="px-3">
                          <div className="font-bold text-xs text-white">{item.title}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="bg-white/[0.04] p-4 rounded-2xl border border-white/10 space-y-2 text-xs">
                <h4 className="font-bold text-white">Contacts Directs de l'Entreprise</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#D69E25]" />
                    <strong className="text-white truncate">{selectedEnterprise.contactEmail}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#D69E25]" />
                    <strong className="text-white">{selectedEnterprise.contactPhone}</strong>
                  </div>
                  {selectedEnterprise.website && (
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Globe className="w-3.5 h-3.5 text-[#D69E25]" />
                      <a
                        href={selectedEnterprise.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#D69E25] font-bold underline hover:text-amber-300 transition"
                      >
                        {selectedEnterprise.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setSelectedEnterprise(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-bold text-xs hover:bg-white/10 hover:text-white transition"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
};