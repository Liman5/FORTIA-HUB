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
    <section className="py-12 bg-[#021231] min-h-[600px] relative overflow-hidden" id="enterprise-section">
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/20 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.03)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(214,158,37,0.03)_0%,transparent_50%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 relative z-10">
        {/* Header Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative bg-white/[0.04] backdrop-blur-xl border border-[#D69E25]/30 rounded-3xl p-8 sm:p-10 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8"
        >
          {/* Glow effect */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#D69E25]/5 blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent" />

          <div className="space-y-4 max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/40 text-xs font-bold uppercase tracking-wider backdrop-blur-xl">
              <Building2 className="w-3.5 h-3.5" />
              <span>Répertoire des Entreprises Certifiées</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              Espace Entreprises &{" "}
              <span className="animated-gradient-text inline-block">Agences Partenaires</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
              Découvrez les sociétés certifiées arborant le Badge Doré FORTIA HUB.
              Immatriculations juridiques vérifiées, équipes de spécialistes et solutions B2B sur-mesure.
            </p>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1.5 bg-white/5 backdrop-blur-xl border border-emerald-400/20 rounded-full px-3 py-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                Immatriculation vérifiée
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 backdrop-blur-xl border border-amber-400/20 rounded-full px-3 py-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Badge Doré exclusif
              </span>
            </div>
          </div>

          {/* CTA Card */}
          {!hideKycCta && (
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative bg-white/[0.03] border border-[#D69E25]/40 p-6 rounded-2xl text-center space-y-4 shrink-0 w-full md:w-80 shadow-lg backdrop-blur-xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <ShieldCheck className="w-7 h-7 text-[#021231]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Inscrire votre Entreprise ?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Frais de vérification :{" "}
                <span className="text-[#D69E25] font-bold">{feeConfig.enterpriseFeeUsd}$ / {feeConfig.enterpriseFeeFcfa.toLocaleString()} FCFA</span>
              </p>
            </div>
            <button
              onClick={onOpenKycModal}
              className="group relative w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#D69E25] via-[#F6E05E] to-[#AB6F10] bg-[length:200%_auto] hover:bg-right text-[#021231] font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg shadow-[#D69E25]/30 overflow-hidden"
            >
              <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 group-hover:animate-shine transition-opacity" />
              <PlusCircle className="w-4 h-4" />
              Demande de Validation & Badge Doré
            </button>
          </motion.div>
          )}
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            { icon: Building2, value: `${enterprises.length}`, label: "Entreprises Certifiées", color: "#D69E25" },
            { icon: Users, value: "100%", label: "Badges Dorés Vérifiés", color: "#F59E0B" },
            { icon: Briefcase, value: "B2B", label: "Solutions Sur-Mesure", color: "#10B981" },
            { icon: TrendingUp, value: "24/7", label: "Accompagnement Dédié", color: "#0EA5E9" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="group relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center hover:border-white/20 transition-all duration-300"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2"
                  style={{ backgroundColor: `${stat.color}15`, border: `1px solid ${stat.color}30` }}
                >
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <div className="text-lg font-black text-white">{stat.value}</div>
                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{stat.label}</div>
              </div>
            );
          })}
        </motion.div>

        {/* Enterprise Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {enterprises.map((enterprise, index) => (
            <motion.div
              key={enterprise.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
              whileHover={{ y: -6, scale: 1.01 }}
              className="group relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl hover:border-[#D69E25]/40 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(214,158,37,0.1)] transition-all duration-500 flex flex-col overflow-hidden"
            >
              {/* Top border gradient on hover */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />

              <div className="p-6 sm:p-8 space-y-5 flex-1">
                {/* Company Header */}
                <div className="flex items-start gap-4">
                  <OptimizedImage
                    src={enterprise.logo}
                    alt={enterprise.companyName}
                    fallbackCategory={enterprise.sector}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/40 p-1 bg-[#011D46] shrink-0"
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-lg text-white truncate">{enterprise.companyName}</h3>
                      <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-[#021231] text-[9px] font-black flex items-center gap-1 shadow-lg shadow-amber-500/20">
                        <ShieldCheck className="w-3 h-3" />
                        Badge Doré
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#D69E25]">{enterprise.tagline}</p>
                    <p className="text-xs text-slate-400">{enterprise.sector} • {enterprise.country}</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                  {enterprise.description}
                </p>

                {/* Services list */}
                {enterprise.offeredServices && enterprise.offeredServices.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-white/10">
                    <span className="text-[10px] font-bold text-[#D69E25] uppercase tracking-wider">
                      Services Institutionnels
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {enterprise.offeredServices.map((serv, idx) => (
                        <div
                          key={idx}
                          className="bg-white/[0.03] p-3 rounded-xl border border-white/10 flex items-center justify-between gap-2 hover:border-[#D69E25]/30 transition-colors"
                        >
                          <span className="text-xs font-bold text-white truncate">{serv.title}</span>
                          <span className="text-xs font-black text-emerald-400 shrink-0">Dès {serv.startingPrice}$</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team preview */}
                {enterprise.team && enterprise.team.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Équipe Dirigeante
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {enterprise.team.map((member, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white/[0.04] px-2.5 py-1.5 rounded-lg border border-white/10">
                          <img src={member.avatar} alt={member.name} className="w-6 h-6 rounded-full object-cover border border-[#D69E25]/30" />
                          <span className="text-[11px] font-semibold text-slate-300">{member.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="p-4 sm:p-5 bg-white/[0.02] border-t border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  {enterprise.contactEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-[#D69E25]" />
                      <span>Email</span>
                    </span>
                  )}
                  {enterprise.contactPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#D69E25]" />
                      <span>Tél</span>
                    </span>
                  )}
                  {enterprise.website && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-[#D69E25]" />
                      <span>Web</span>
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setSelectedEnterprise(enterprise)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] hover:brightness-110 text-[#021231] font-bold text-xs transition-all duration-300 active:scale-95 shadow-lg shadow-[#D69E25]/20"
                >
                  Consulter Fiche Société
                  <ExternalLink className="w-3 h-3" />
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