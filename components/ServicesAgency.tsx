"use client";

import React, { useEffect, useState } from "react";
import { motion } from 'motion/react';
import { ServicePackage, ServiceQuoteRequest } from '../types';
import { apiWritePlatform } from '../lib/services/platformWrite';
import {
  Briefcase,
  Palette,
  Image,
  FileText,
  Video,
  Share2,
  UserCheck,
  Clock,
  Check,
  Calculator,
  CheckCircle2,
  ShoppingCart,
  X,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Images,
} from 'lucide-react';

interface ServicesAgencyProps {
  services: ServicePackage[];
  onSubmitQuote: (quote: ServiceQuoteRequest) => void;
}

export const ServicesAgency: React.FC<ServicesAgencyProps> = ({
  services = [],
  onSubmitQuote
}) => {
  const [selectedService, setSelectedService] = useState<ServicePackage | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [projectDetails, setProjectDetails] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  /** Galerie plein écran : images du service + index courant (null = fermée). */
  const [gallery, setGallery] = useState<{ images: string[]; index: number } | null>(null);

  /** Toutes les images d'un service (visuel principal + galerie, sans doublon). */
  const allImagesOf = (serv: ServicePackage): string[] => {
    const list = [serv.image, ...(Array.isArray(serv.images) ? serv.images : [])].filter(
      (url): url is string => typeof url === "string" && url.length > 0
    );
    return Array.from(new Set(list));
  };

  const openGallery = (serv: ServicePackage) => {
    const images = allImagesOf(serv);
    if (images.length === 0) return;
    setGallery({ images, index: 0 });
  };

  /**
   * Depuis la fiche détaillée (`/service/[id]`), l'utilisateur arrive avec
   * `?service=<id>` : on ouvre directement le formulaire de commande / devis.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("service");
    if (!id) return;
    const found = (services || []).find((s) => String(s.id) === id);
    if (!found) return;
    setSelectedService(found);
    setSelectedOptions([]);
    setSubmittedSuccess(false);
  }, [services]);


  // Map icon strings to Lucide icon components
  const getServiceIcon = (name: string) => {
    switch (name) {
      case 'Palette': return Palette;
      case 'Image': return Image;
      case 'FileText': return FileText;
      case 'Video': return Video;
      case 'Share2': return Share2;
      case 'UserCheck': return UserCheck;
      default: return Briefcase;
    }
  };

  const getBorderClasses = (s?: string) => {
    switch (s) {
      case "emerald": return "hover:border-emerald-500/50";
      case "blue": return "hover:border-blue-500/50";
      case "purple": return "hover:border-purple-500/50";
      case "rose": return "hover:border-rose-500/50";
      case "gradient": return "hover:border-transparent";
      case "double": return "hover:border-[#D69E25]/60";
      case "none": return "hover:border-white/30";
      default: return "hover:border-[#D69E25]/50";
    }
  };

  /** Animation d'entrée de la carte — réglée dans ADMIN → Services Agence.
   *  Classes CSS `svc-anim-*` (app/globals.css). Le survol est géré à part
   *  par `whileHover`, donc l'animation ne le bloque pas. */
  const getAnimationClasses = (a?: string) => {
    switch (a) {
      case "zoom-in": return "svc-anim-zoom-in";
      case "flip": return "svc-anim-flip";
      case "slide-in": return "svc-anim-slide-in";
      case "pulse": return "svc-anim-pulse";
      case "none": return "";
      default: return "svc-anim-fade-up";
    }
  };

  const getGlowColor = (s?: string) => {
    switch (s) {
      case "emerald": return "rgba(16,185,129,0.15)";
      case "blue": return "rgba(59,130,246,0.15)";
      case "purple": return "rgba(168,85,247,0.15)";
      case "rose": return "rgba(244,63,94,0.15)";
      default: return "rgba(214,158,37,0.15)";
    }
  };

  const activeServices = services.filter(s => s.isActive !== false);
  
  const basePrice = selectedService ? Number(selectedService.startingPrice) || 0 : 0;
  const optionsTotal = selectedService?.options
    ? selectedService.options
        .filter(opt => selectedOptions.includes(opt.name))
        .reduce((sum, opt) => sum + (Number(opt.price) || 0), 0)
    : 0;
  
  const totalEstimate = basePrice + optionsTotal;

  const handleToggleOption = (optName: string) => {
    if (selectedOptions.includes(optName)) {
      setSelectedOptions(selectedOptions.filter(o => o !== optName));
    } else {
      setSelectedOptions([...selectedOptions, optName]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !clientName || !clientEmail) return;

    apiWritePlatform("order-service", {
      clientName,
      clientEmail,
      clientPhone,
      serviceId: selectedService.id,
      serviceTitle: selectedService.title,
      estimatedPrice: totalEstimate,
      details: projectDetails,
      deadline: selectedService.estimatedDays,
    });

    const newQuote: ServiceQuoteRequest = {
      id: `DEV-${Math.floor(100000 + Math.random() * 900000)}`,
      clientName,
      clientEmail,
      clientPhone,
      serviceId: selectedService.id,
      serviceTitle: selectedService.title,
      estimatedPrice: totalEstimate,
      details: projectDetails,
      deadline: selectedService.estimatedDays,
      status: 'Reçu',
      date: new Date().toLocaleDateString('fr-FR')
    };
    onSubmitQuote(newQuote);

    setSubmittedSuccess(true);
  };

  const closeModal = () => {
    setSelectedService(null);
    setSelectedOptions([]);
    setSubmittedSuccess(false);
  };

  return (
    <section className="py-14 bg-[#021231] min-h-[600px] relative overflow-hidden" id="services-section">
      {/* Background decorations */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/20 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,37,0.04)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto space-y-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-[#D69E25]/40 px-4 py-2 rounded-full text-xs font-bold text-[#D69E25] mb-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Prestations Sur-Mesure & Agence</span>
          </motion.div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Services Professionnels &{" "}
            <span className="animated-gradient-text inline-block">Conseil Entrepreneurial</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Profitez de l'expertise de notre équipe créative et stratégique pour concevoir vos logos, affiches, livres blancs, montages vidéo et piloter la croissance de votre entreprise.
          </p>
        </motion.div>

        {/* Services Cards Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-4xl mx-auto">
          {activeServices.map((serv, index) => {
            const IconComp = getServiceIcon(serv.iconName);
            const isSelected = selectedService?.id === serv.id;
            const accent = serv.accentColor || '#D69E25';
            const glowColor = getGlowColor(serv.borderStyle);
            const borderHover = getBorderClasses(serv.borderStyle);

            return (
              <motion.div
                key={serv.id}
                whileHover={{ y: -8, scale: 1.01 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                onClick={() => {
                  setSelectedService(serv);
                  setSelectedOptions([]);
                  setSubmittedSuccess(false);
                }}
                className={`group relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl ${borderHover} ${getAnimationClasses(serv.cardAnimation)} cursor-pointer flex flex-col justify-between overflow-hidden transition-colors duration-500`}
                style={{
                  boxShadow: isSelected ? `0 0 40px ${glowColor}` : undefined,
                  animationDelay: `${index * 90}ms`,
                }}
              >
                {/* Top border gradient on hover */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white/5 blur-3xl group-hover:bg-[#D69E25]/10 transition-colors duration-500" />

                {/* ===== HAUT DE CARTE =====
                    MÊME disposition sur mobile et sur web : visuel À GAUCHE
                    (colonne pleine hauteur) + informations à droite. Sur mobile
                    tout est simplement plus compact (une carte par colonne). */}
                <div className="relative flex flex-row items-stretch">
                  {/* --- Visuel : clic = galerie (si plusieurs images) --- */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openGallery(serv);
                    }}
                    disabled={allImagesOf(serv).length === 0}
                    title={allImagesOf(serv).length > 1 ? "Voir les photos" : "Voir l'image"}
                    className={`relative w-24 xs:w-28 sm:w-32 lg:w-36 shrink-0 self-stretch overflow-hidden bg-[#021231] ${
                      allImagesOf(serv).length > 0 ? "cursor-zoom-in" : "cursor-default"
                    }`}
                  >
                    {serv.image ? (
                      <img
                        src={serv.image}
                        alt={serv.title}
                        style={{ objectPosition: serv.imagePosition || "50% 50%" }}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${accent}25, transparent 70%)`,
                        }}
                      >
                        <IconComp className="w-7 h-7" style={{ color: accent }} />
                      </div>
                    )}
                    {allImagesOf(serv).length > 1 && (
                      <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-black text-white">
                        <Images className="w-2.5 h-2.5" />
                        {allImagesOf(serv).length}
                      </span>
                    )}
                    {/* Filet doré de séparation visuel / informations */}
                    <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#D69E25]/40 to-transparent" />
                  </button>

                  {/* --- Colonne DROITE : informations du service --- */}
                  <div className="flex-1 min-w-0 p-3.5 sm:p-5 space-y-2 sm:space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
                        {serv.category}
                      </span>
                      {serv.badgeText && (
                        <span
                          className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border"
                          style={{
                            color: accent,
                            borderColor: `${accent}50`,
                            backgroundColor: `${accent}15`,
                          }}
                        >
                          {serv.featured ? "★ " : ""}{serv.badgeText}
                        </span>
                      )}
                      {serv.featured && !serv.badgeText && (
                        <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
                          ★ En avant
                        </span>
                      )}
                    </div>

                  <h3 className="font-extrabold text-white text-[13px] sm:text-base leading-snug group-hover:text-[#D69E25] transition-colors">
                    {serv.title}
                  </h3>

                  <p className="text-slate-400 text-[11px] sm:text-xs leading-relaxed line-clamp-2 sm:line-clamp-3">
                    {serv.description}
                  </p>

                  {/* Deliverables List */}
                  <div className="pt-1.5 sm:pt-2 space-y-1 sm:space-y-1.5 border-t border-white/10 text-xs">
                    {(serv.deliverables || []).slice(0, 3).map((del, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 mt-0.5" style={{ color: accent }} />
                        <span className="text-[10px] sm:text-[11px] leading-tight text-slate-300 line-clamp-1">{del}</span>
                      </div>
                    ))}
                  </div>
                  </div>
                </div>

                <div className="px-3.5 sm:px-6 pb-3.5 sm:pb-5 pt-2.5 sm:pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] sm:text-xs text-slate-500 block font-medium">À partir de</span>
                    <span className="text-base sm:text-xl font-black text-[#D69E25]">${Number(serv.startingPrice) || 0}</span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-slate-400">
                      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: accent }} />
                      {serv.estimatedDays}
                    </span>
                    <a
                      href={serv.id ? `/service/${serv.id}` : "/services"}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-full border border-[#D69E25]/40 px-2.5 py-1 text-[10px] font-black text-[#D69E25] hover:bg-[#D69E25] hover:text-[#021231] transition"
                      title="Voir la fiche complète"
                    >
                      Détails
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* MODALE CALCULATEUR & DEVIS */}
        {selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm" onClick={closeModal}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative bg-[#021231] text-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-[#D69E25]/40 shadow-2xl shadow-[#D69E25]/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent" />

              {/* En-tête modale */}
              <div className="sticky top-0 bg-[#021231]/95 backdrop-blur-xl z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D69E25]/30 p-6 pb-4">
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md shrink-0"
                    style={{ backgroundColor: `${selectedService.accentColor || '#D69E25'}20`, border: `1px solid ${selectedService.accentColor || '#D69E25'}40`, color: selectedService.accentColor || '#D69E25' }}
                  >
                    {(() => {
                      const IconComp = getServiceIcon(selectedService.iconName);
                      return <IconComp className="w-7 h-7" />;
                    })()}
                  </div>
                  <div>
                    <span className="bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-wider">
                      Calculateur & Devis Instantané
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white mt-1.5">
                      {selectedService.title}
                    </h3>
                    <p className="text-[11px] text-slate-400">{selectedService.estimatedDays} • {selectedService.category}</p>
                    {/* Description détaillée du service */}
                    {selectedService.description && (
                      <p className="text-[11px] sm:text-xs text-slate-300 mt-2 leading-relaxed max-w-lg">
                        {selectedService.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white/[0.04] px-4 py-2 rounded-xl border border-[#D69E25]/40 text-right">
                    <span className="text-[10px] text-slate-300 block uppercase">Estimation Totale :</span>
                    <span className="text-2xl font-black text-[#D69E25]">${totalEstimate}</span>
                    <span className="text-[10px] text-slate-400 block">≈ {Math.round(totalEstimate * 600).toLocaleString("fr-FR")} FCFA</span>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition"
                    title="Fermer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {submittedSuccess ? (
                  <div className="bg-white/[0.04] p-8 rounded-2xl border border-emerald-500/50 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-9 h-9 text-emerald-400" />
                    </div>
                    <h4 className="text-xl font-bold text-white">Demande de service envoyée avec succès !</h4>
                    <p className="text-xs text-slate-300 max-w-xl mx-auto">
                      <strong>Votre commande a été créée.</strong> Notre équipe a été notifiée et vous recevrez une confirmation par email
                      {clientPhone ? <span> et sur <strong>WhatsApp</strong> ({clientPhone})</span> : null}.
                      <br />
                      Votre service vous sera envoyé une fois la commande traitée.
                    </p>
                    <button
                      onClick={closeModal}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#D69E25]/20"
                    >
                      Fermer
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Options Selection Column */}
                    <div className="lg:col-span-6 space-y-5">
                      <h4 className="font-bold text-sm text-[#D69E25] flex items-center gap-2">
                        <Calculator className="w-4 h-4" />
                        <span>Inclus & Options Supplémentaires</span>
                      </h4>

                      <div className="space-y-2 bg-white/[0.04] p-4 rounded-xl border border-white/10">
                        <p className="text-xs font-semibold text-slate-200">Livrables inclus de base :</p>
                        {(selectedService?.deliverables || []).map((d, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>

                      {selectedService?.options && selectedService.options.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-300">Ajouter des options express :</p>
                          {selectedService.options.map((opt, i) => {
                            const isChecked = selectedOptions.includes(opt.name);
                            return (
                              <div
                                key={i}
                                onClick={() => handleToggleOption(opt.name)}
                                className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition-all duration-300 ${
                                  isChecked
                                    ? 'bg-[#D69E25]/15 border-[#D69E25] text-white font-bold shadow-lg shadow-[#D69E25]/10'
                                    : 'bg-white/[0.03] border-white/10 text-slate-300 hover:border-[#D69E25]/40'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                                    isChecked ? 'bg-[#D69E25] border-[#D69E25]' : 'border-slate-500'
                                  }`}>
                                    {isChecked && <Check className="w-3 h-3 text-[#021231]" />}
                                  </span>
                                  {opt.name}
                                </span>
                                <span className="text-[#D69E25] font-extrabold">+${Number(opt.price) || 0}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Client Contact Inputs Column */}
                    <div className="lg:col-span-6 space-y-4 bg-white/[0.03] p-6 rounded-2xl border border-white/10">
                      <h4 className="font-bold text-sm text-white">Vos Coordonnées & Cahier des Charges</h4>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">Nom complet *</label>
                        <input
                          type="text"
                          required
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Ex: Amadou Diallo"
                          className="w-full bg-white/5 border border-white/15 text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#D69E25]/60 focus:ring-1 focus:ring-[#D69E25]/30 transition placeholder-slate-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Adresse Email *</label>
                          <input
                            type="email"
                            required
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            placeholder="adresse.email@domaine.com"
                            className="w-full bg-white/5 border border-white/15 text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#D69E25]/60 focus:ring-1 focus:ring-[#D69E25]/30 transition placeholder-slate-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Téléphone / WhatsApp</label>
                          <input
                            type="tel"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                            placeholder="+221 77 000 00 00"
                            className="w-full bg-white/5 border border-white/15 text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#D69E25]/60 focus:ring-1 focus:ring-[#D69E25]/30 transition placeholder-slate-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">Détails du projet & attentes</label>
                        <textarea
                          rows={3}
                          value={projectDetails}
                          onChange={(e) => setProjectDetails(e.target.value)}
                          placeholder="Décrivez brièvement les couleurs souhaitées, le thème, le contexte de votre marque..."
                          className="w-full bg-white/5 border border-white/15 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-[#D69E25]/60 focus:ring-1 focus:ring-[#D69E25]/30 transition placeholder-slate-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="group relative w-full inline-flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#D69E25] via-[#F6E05E] to-[#AB6F10] bg-[length:200%_auto] hover:bg-right text-[#021231] font-black text-xs rounded-xl shadow-lg shadow-[#D69E25]/30 transition-all duration-300 active:scale-95 overflow-hidden"
                      >
                        <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 group-hover:animate-shine transition-opacity" />
                        <ShoppingCart className="w-4 h-4" />
                        <span>Commander ce Service (${totalEstimate})</span>
                      </button>

                      <p className="text-[10px] text-slate-500 text-center">
                        🔒 Vos informations sont sécurisées. Un ordre de service sera créé et notre équipe vous contactera.
                      </p>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* ===== GALERIE PLEIN ÉCRAN (consultation des photos du service) ===== */}
        {gallery && gallery.images.length > 0 && (
          <div
            className="fixed inset-0 z-[130] bg-black/90 backdrop-blur-sm flex flex-col"
            onClick={() => setGallery(null)}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] font-black text-white/80">
                Photo {gallery.index + 1} / {gallery.images.length}
              </span>
              <button
                onClick={() => setGallery(null)}
                className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="relative flex-1 flex items-center justify-center px-3 pb-3 min-h-0"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={gallery.images[gallery.index]}
                alt={`Photo ${gallery.index + 1}`}
                className="max-h-full max-w-full object-contain rounded-xl"
              />
              {gallery.images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setGallery((g) =>
                        g ? { ...g, index: (g.index - 1 + g.images.length) % g.images.length } : g
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-[#D69E25] hover:text-[#021231] transition"
                    aria-label="Photo précédente"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setGallery((g) => (g ? { ...g, index: (g.index + 1) % g.images.length } : g))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-[#D69E25] hover:text-[#021231] transition"
                    aria-label="Photo suivante"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {gallery.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-3 pb-4" onClick={(e) => e.stopPropagation()}>
                {gallery.images.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    onClick={() => setGallery((g) => (g ? { ...g, index: i } : g))}
                    className={`w-14 h-14 shrink-0 rounded-lg overflow-hidden border-2 transition ${
                      i === gallery.index ? "border-[#D69E25]" : "border-white/15 hover:border-white/40"
                    }`}
                  >
                    <img src={url} alt={`Miniature ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};