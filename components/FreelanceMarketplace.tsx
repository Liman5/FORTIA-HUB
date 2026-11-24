"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { FreelanceProfile, FreelanceService, RegistrationFeeConfig } from '@/lib/types';
import {
  Search,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Briefcase,
  PlusCircle,
  Lock,
  X,
  Star,
  Sparkles,
  BadgeCheck,
  TrendingUp,
  Award,
  BriefcaseBusiness,
} from 'lucide-react';

interface FreelanceMarketplaceProps {
  freelances: FreelanceProfile[];
  feeConfig: RegistrationFeeConfig;
  onOpenKycModal: () => void;
  /** Masque l'appel à soumettre un dossier KYC (compte déjà vérifié). */
  hideKycCta?: boolean;
  onOrderService: (service: FreelanceService, freelance: FreelanceProfile) => void;
}

export const FreelanceMarketplace: React.FC<FreelanceMarketplaceProps> = ({
  freelances,
  feeConfig: _feeConfig,
  onOpenKycModal,
  hideKycCta = false,
  onOrderService
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [badgeFilter, setBadgeFilter] = useState<string>('all');
  const [selectedFreelance, setSelectedFreelance] = useState<FreelanceProfile | null>(null);

  const categories = [
    { id: 'all', label: 'Toutes les catégories' },
    { id: 'IA & Automatisation', label: 'IA & Automatisation' },
    { id: 'Développement Web', label: 'Développement Web' },
    { id: 'Développement Mobile', label: 'Développement Mobile' },
    { id: 'UI/UX & Infographie', label: 'UI/UX & Infographie' },
    { id: 'Montage vidéo', label: 'Montage Vidéo' },
    { id: 'Branding', label: 'Branding & Design' }
  ];

  const filteredFreelances = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return (freelances || []).filter((f) => {
      const matchesSearch =
        !q ||
        (f.name && f.name.toLowerCase().includes(q)) ||
        (f.title && f.title.toLowerCase().includes(q)) ||
        (f.skills && f.skills.some(s => s && s.toLowerCase().includes(q)));

      const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory || (f.services && f.services.some((s: FreelanceService) => s.category === selectedCategory));

      const matchesBadge =
        badgeFilter === 'all' ||
        (badgeFilter === 'green' && f.badge === 'green') ||
        (badgeFilter === 'gold' && f.badge === 'gold') ||
        (badgeFilter === 'none' && f.badge === 'none');

      return matchesSearch && matchesCategory && matchesBadge;
    });
  }, [freelances, searchQuery, selectedCategory, badgeFilter]);

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || badgeFilter !== 'all';

  const handleReset = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setBadgeFilter('all');
  };

  const getBadgeStyles = (badge: string) => {
    if (badge === 'gold') {
      return {
        wrapper: "bg-gradient-to-r from-amber-400 to-yellow-600 text-[#021231] border border-amber-300/50",
        icon: <ShieldCheck className="w-3 h-3" />,
        label: "Badge Doré"
      };
    }
    if (badge === 'green') {
      return {
        wrapper: "bg-emerald-500/10 text-emerald-400 border border-emerald-400/40",
        icon: <CheckCircle2 className="w-3 h-3" />,
        label: "Badge Vert"
      };
    }
    return {
      wrapper: "bg-white/5 text-slate-500 border border-white/10",
      icon: <Lock className="w-3 h-3" />,
      label: "Non Vérifié"
    };
  };

  return (
    <section className="relative min-h-[520px] overflow-hidden py-8" id="freelance-section">
      {/* Background decoration */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/20 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="ibx-badge"
              style={{
                borderColor: "color-mix(in srgb, var(--ibx-success) 35%, transparent)",
                backgroundColor: "var(--ibx-success-soft)",
                color: "var(--ibx-success)",
              }}
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Freelances
            </span>
            <span className="ibx-small font-semibold">
              {filteredFreelances.length} talent{filteredFreelances.length > 1 ? "s" : ""}
            </span>
          </div>

          {!hideKycCta && (
            <button type="button" onClick={onOpenKycModal} className="ibx-btn ibx-btn-outline">
              <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Soumettre profil &amp; KYC
            </button>
          )}
        </div>

        {/* Filtres */}
        <div className="ibx-card space-y-2.5 p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative flex w-full items-center lg:flex-1">
              <Search
                className="pointer-events-none absolute left-3 h-4 w-4"
                style={{ color: "var(--ibx-fg-subtle)" }}
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un nom, une compétence…"
                aria-label="Rechercher un freelance"
                className="ibx-input pl-9"
              />
            </div>

            <div className="ibx-scroll-x" role="group" aria-label="Filtrer par badge">
              <button
                type="button"
                onClick={() => setBadgeFilter("all")}
                className="ibx-chip"
                data-active={badgeFilter === "all" ? "true" : "false"}
              >
                Tous les badges
              </button>
              <button
                type="button"
                onClick={() => setBadgeFilter("green")}
                className="ibx-chip"
                data-active={badgeFilter === "green" ? "true" : "false"}
              >
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Badge vert
              </button>
              <button
                type="button"
                onClick={() => setBadgeFilter("gold")}
                className="ibx-chip"
                data-active={badgeFilter === "gold" ? "true" : "false"}
              >
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                Badge doré
              </button>
            </div>
          </div>

          {/* Catégories : une seule ligne défilante */}
          <div
            className="ibx-scroll-x border-t pt-2.5"
            style={{ borderColor: "var(--ibx-border)" }}
            role="group"
            aria-label="Filtrer par catégorie"
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className="ibx-chip"
                data-active={selectedCategory === cat.id ? "true" : "false"}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between gap-3">
          <span className="ibx-small font-semibold">
            {filteredFreelances.length} talent{filteredFreelances.length > 1 ? "s" : ""} trouvé
            {filteredFreelances.length > 1 ? "s" : ""}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="ibx-btn ibx-btn-ghost"
            >
              <Search className="h-3 w-3" aria-hidden="true" />
              Réinitialiser
            </button>
          )}
        </div>

        {/* Freelances */}
        {filteredFreelances.length === 0 ? (
          <div className="ibx-empty">
            <p className="ibx-h3">Aucun talent ne correspond à votre recherche</p>
            <p className="ibx-small mt-1">
              Essayez de réinitialiser vos filtres ou de modifier les mots-clés.
            </p>
            <button type="button" onClick={handleReset} className="ibx-btn ibx-btn-primary mt-3">
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="ibx-cards-row md:grid-cols-2 lg:grid-cols-3">
            {filteredFreelances.map((freelance, index) => {
              const badgeStyles = getBadgeStyles(freelance.badge || 'none');
              return (
                <motion.div
                  key={freelance.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.04, ease: "easeOut" }}
                  className="ibx-card ibx-interactive group relative flex w-[270px] flex-col overflow-hidden md:w-auto"
                >
                  <div className="flex-1 space-y-3 p-4">
                    {/* En-tête du profil */}
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <img
                          src={freelance.avatar}
                          alt={freelance.name}
                          className="h-12 w-12 rounded-xl border object-cover"
                          style={{ borderColor: "var(--ibx-border)" }}
                        />
                        {freelance.badge === 'gold' && (
                          <span
                            className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full"
                            style={{ backgroundColor: "var(--ibx-accent)", color: "#1c1405" }}
                          >
                            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h3 className="ibx-h3 truncate !text-[13px]">{freelance.name}</h3>
                        <p className="ibx-tiny truncate !text-[10px] font-semibold" style={{ color: "var(--ibx-accent-strong)" }}>
                          {freelance.title}
                        </p>
                        <div className="flex items-center gap-2 text-[9.5px]" style={{ color: "var(--ibx-fg-muted)" }}>
                          <span className="flex min-w-0 items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{freelance.location}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-0.5 font-bold" style={{ color: "var(--ibx-accent-strong)" }}>
                            <Star className="h-2.5 w-2.5" style={{ fill: "var(--ibx-accent)" }} aria-hidden="true" />
                            {freelance.rating}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${badgeStyles.wrapper}`}>
                        {badgeStyles.icon}
                        <span>{badgeStyles.label}</span>
                      </span>
                      {(freelance.badge === 'green' || freelance.badge === 'gold') && (
                        <span className="ibx-badge !text-[9px]">
                          <BadgeCheck className="h-2.5 w-2.5" aria-hidden="true" />
                          KYC vérifié
                        </span>
                      )}
                    </div>

                    {/* Bio & compétences */}
                    <p className="ibx-tiny line-clamp-2 !text-[10px]">{freelance.bio}</p>

                    <div className="flex flex-wrap gap-1">
                      {freelance.skills.map((skill: string, idx: number) => (
                        <span
                          key={idx}
                          className="rounded border px-1.5 py-0.5 text-[9px] font-medium"
                          style={{ borderColor: "var(--ibx-border)", color: "var(--ibx-fg-muted)" }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Prestation phare */}
                    {freelance.services && freelance.services.length > 0 && (
                      <div
                        className="space-y-1.5 border-t pt-2.5"
                        style={{ borderColor: "var(--ibx-border)" }}
                      >
                        <span
                          className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide"
                          style={{ color: "var(--ibx-success)" }}
                        >
                          <Briefcase className="h-2.5 w-2.5" aria-hidden="true" />
                          Service phare
                        </span>
                        {freelance.services.slice(0, 1).map((serv: FreelanceService) => (
                          <div
                            key={serv.id}
                            className="ibx-card-muted flex items-center justify-between gap-2 p-2"
                          >
                            <div className="min-w-0">
                              <div className="ibx-h3 line-clamp-1 !text-[10.5px]">{serv.title}</div>
                              <div className="ibx-tiny !text-[9px]">Délai : {serv.deliveryDays} jours</div>
                            </div>
                            <span className="shrink-0 text-[10.5px] font-bold" style={{ color: "var(--ibx-accent-strong)" }}>
                              {serv.startingPrice}$
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pied de carte */}
                  <div
                    className="flex items-center justify-between gap-2 border-t px-4 py-2.5"
                    style={{ borderColor: "var(--ibx-border)", backgroundColor: "var(--ibx-surface-muted)" }}
                  >
                    <span className="ibx-tiny flex items-center gap-1 !text-[9.5px]">
                      <TrendingUp className="h-2.5 w-2.5" style={{ color: "var(--ibx-accent-strong)" }} aria-hidden="true" />
                      <strong style={{ color: "var(--ibx-fg)" }}>{freelance.completedJobs}</strong>
                      missions
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedFreelance(freelance)}
                      className="ibx-btn ibx-btn-outline !px-2.5 !py-1 !text-[10px]"
                    >
                      Voir le profil
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Selected Freelance Detail Modal */}
        {selectedFreelance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative bg-[#021231] border border-[#D69E25]/40 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl shadow-[#D69E25]/10"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent" />

              <button
                onClick={() => setSelectedFreelance(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Profile Header Modal */}
              <div className="flex items-start gap-5 pt-2">
                <img
                  src={selectedFreelance.avatar}
                  alt={selectedFreelance.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#D69E25]/40"
                />
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-white">{selectedFreelance.name}</h2>
                    {selectedFreelance.badge === 'gold' && (
                      <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-[#021231] text-[10px] font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Badge Doré
                      </span>
                    )}
                    {selectedFreelance.badge === 'green' && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Badge Vert Vérifié
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#D69E25]">{selectedFreelance.title}</p>
                  <p className="text-xs text-slate-400">{selectedFreelance.location}</p>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {selectedFreelance.rating}/5
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Award className="w-3.5 h-3.5 text-[#D69E25]" />
                      {selectedFreelance.hourlyRate}$/h
                    </span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-white">À propos du Talent</h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{selectedFreelance.bio}</p>
              </div>

              {/* Services Offered List */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <BriefcaseBusiness className="w-4 h-4 text-[#D69E25]" />
                  <span>Prestations & Services Commercialisés</span>
                </h4>

                {selectedFreelance.services.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Aucune prestation pré-packagée pour le moment.</p>
                ) : (
                  selectedFreelance.services.map((serv: FreelanceService) => (
                    <div key={serv.id} className="bg-white/[0.04] rounded-2xl p-4 border border-white/10 space-y-3 hover:border-[#D69E25]/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h5 className="font-bold text-sm text-white">{serv.title}</h5>
                          <p className="text-xs text-slate-400 mt-1">{serv.description}</p>
                        </div>
                        <span className="font-black text-sm text-emerald-400 shrink-0">{serv.startingPrice}$</span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <span className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Briefcase className="w-3.5 h-3.5 text-[#D69E25]" />
                          Livraison : {serv.deliveryDays} jours
                        </span>

                        <button
                          onClick={() => {
                            onOrderService(serv, selectedFreelance);
                            setSelectedFreelance(null);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] hover:brightness-110 text-[#021231] font-bold text-xs transition-all duration-300 active:scale-95 shadow-lg shadow-[#D69E25]/20"
                        >
                          Commander cette Prestation
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setSelectedFreelance(null)}
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