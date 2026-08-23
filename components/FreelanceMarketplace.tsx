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
  onOrderService: (service: FreelanceService, freelance: FreelanceProfile) => void;
}

export const FreelanceMarketplace: React.FC<FreelanceMarketplaceProps> = ({
  freelances,
  feeConfig: _feeConfig,
  onOpenKycModal,
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
    <section className="py-12 bg-[#021231] min-h-[600px] relative overflow-hidden" id="freelance-section">
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/20 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.03)_0%,transparent_50%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7 relative z-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-emerald-500/40 px-4 py-2 rounded-full text-xs font-bold text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Freelances</span>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              {filteredFreelances.length} talent{filteredFreelances.length > 1 ? "s" : ""}
            </span>
          </div>

          <button
            onClick={onOpenKycModal}
            className="group relative inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 bg-[length:200%_auto] hover:bg-right text-white font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg shadow-emerald-500/20 overflow-hidden"
          >
            <span className="absolute inset-0 bg-white/15 opacity-0 group-hover:opacity-100 group-hover:animate-shine transition-opacity" />
            <PlusCircle className="w-3.5 h-3.5" />
            Soumettre Profil & KYC
          </button>
        </div>

        {/* Filters & Search Bar */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1 w-full group">
              <div className="absolute inset-0 bg-[#D69E25]/10 blur-xl rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-white/5 border border-white/15 rounded-xl overflow-hidden focus-within:border-[#D69E25]/60 transition-all duration-300">
                <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom, compétence (React, ChatGPT, Branding)..."
                  className="w-full bg-transparent pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Badge filter */}
            <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none snap-x snap-mandatory scroll-px-2 -mx-4 px-4 lg:mx-0 lg:px-0">
              <button
                onClick={() => setBadgeFilter('all')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 snap-start whitespace-nowrap ${
                  badgeFilter === 'all'
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                Tous Badges
              </button>

              <button
                onClick={() => setBadgeFilter('green')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 snap-start whitespace-nowrap ${
                  badgeFilter === 'green'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-emerald-500/5 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Badge Vert</span>
              </button>

              <button
                onClick={() => setBadgeFilter('gold')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 snap-start whitespace-nowrap ${
                  badgeFilter === 'gold'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-[#021231] shadow-lg shadow-amber-500/20'
                    : 'bg-amber-500/5 text-amber-400 border border-amber-500/20 hover:bg-amber-500/10'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Badge Doré</span>
              </button>
            </div>
          </div>

          {/* Categories Horizontal Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pt-3 border-t border-white/10 scrollbar-none snap-x snap-mandatory scroll-px-2 -mx-4 px-4 lg:mx-0 lg:px-0">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap snap-start shrink-0 transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-bold shadow-lg shadow-[#D69E25]/20'
                      : 'text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium">
            {filteredFreelances.length} talent{filteredFreelances.length > 1 ? "s" : ""} trouvé{filteredFreelances.length > 1 ? "s" : ""}
          </span>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-[#D69E25] hover:text-amber-300 font-semibold transition-colors"
            >
              <Search className="w-3 h-3" />
              Réinitialiser
            </button>
          )}
        </div>

        {/* Freelances Grid */}
        {filteredFreelances.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
              <Search className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-white">Aucun talent ne correspond à votre recherche</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              Essayez de réinitialiser vos filtres ou de modifier les mots-clés.
            </p>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#D69E25]/20"
            >
              Réinitialiser les Filtres
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredFreelances.map((freelance, index) => {
              const badgeStyles = getBadgeStyles(freelance.badge || 'none');
              return (
                <motion.div
                  key={freelance.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
                  whileHover={{ y: -6, scale: 1.01 }}
                  className="group relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl hover:border-[#D69E25]/40 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(214,158,37,0.1)] transition-all duration-500 flex flex-col overflow-hidden"
                >
                  {/* Top border gradient on hover */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />

                  <div className="p-6 space-y-4 flex-1">
                    {/* Profile Header */}
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        <img
                          src={freelance.avatar}
                          alt={freelance.name}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-[#D69E25]/40 group-hover:scale-105 transition-transform duration-300"
                        />
                        {freelance.badge === 'gold' && (
                          <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#021231]" />
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-white text-base truncate">{freelance.name}</h3>
                        </div>

                        <p className="text-xs text-[#D69E25] font-semibold truncate">{freelance.title}</p>

                        <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{freelance.location}</span>
                          </span>
                          <span className="flex items-center gap-0.5 text-amber-400 font-bold shrink-0">
                            <Star className="w-3 h-3 fill-amber-400" />
                            {freelance.rating}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${badgeStyles.wrapper}`}>
                        {badgeStyles.icon}
                        <span>{badgeStyles.label}</span>
                      </span>
                      {(freelance.badge === 'green' || freelance.badge === 'gold') && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-400/30 text-[10px] font-bold">
                          <BadgeCheck className="w-3 h-3" />
                          KYC Vérifié
                        </span>
                      )}
                    </div>

                    {/* Bio & Skills */}
                    <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                      {freelance.bio}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {freelance.skills.map((skill: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[10px] font-medium hover:border-[#D69E25]/40 hover:text-[#D69E25] transition-colors"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Services Available */}
                    {freelance.services && freelance.services.length > 0 && (
                      <div className="pt-3 border-t border-white/10 space-y-2">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          Service Phare
                        </span>
                        {freelance.services.slice(0, 1).map((serv: FreelanceService) => (
                          <div
                            key={serv.id}
                            className="bg-white/[0.03] p-3 rounded-xl border border-white/10 flex items-center justify-between gap-2 hover:border-[#D69E25]/30 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-white line-clamp-1">{serv.title}</div>
                              <div className="text-[10px] text-slate-400">Délai : {serv.deliveryDays} jours</div>
                            </div>
                            <span className="font-black text-xs text-emerald-400 shrink-0">
                              {serv.startingPrice}$
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Card Footer */}
                  <div className="p-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <TrendingUp className="w-3.5 h-3.5 text-[#D69E25]" />
                      <strong className="text-white">{freelance.completedJobs}</strong>
                      missions réussies
                    </span>

                    <button
                      onClick={() => setSelectedFreelance(freelance)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] hover:brightness-110 text-[#021231] font-bold text-xs transition-all duration-300 active:scale-95 shadow-lg shadow-[#D69E25]/20"
                    >
                      Voir Profil
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