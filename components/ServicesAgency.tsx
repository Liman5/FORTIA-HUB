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
  /** Galerie plein écran : images du service + index courant (null = fermée). */
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

  /** Animation d'entrée de la carte — réglée dans ADMIN → Services Agence. */
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

  return (
    <section className="py-6 sm:py-8 bg-[#021231] min-h-[400px] relative overflow-hidden" id="services-section">
      {/* Background decorations */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/20 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,37,0.04)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5 relative z-10">
        {/* Section Header — sans badge, sans espace vide */}
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
            Services Professionnels &{" "}
            <span className="animated-gradient-text inline-block">Conseil Entrepreneurial</span>
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            Profitez de l'expertise de notre équipe créative et stratégique pour concevoir vos logos, affiches, livres blancs, montages vidéo et piloter la croissance de votre entreprise.
          </p>
        </div>

        {/* Services Cards Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-4xl mx-auto">
          {activeServices.map((serv, index) => {
            const IconComp = getServiceIcon(serv.iconName);
            const accent = serv.accentColor || '#D69E25';
            const glowColor = getGlowColor(serv.borderStyle);
            const borderHover = getBorderClasses(serv.borderStyle);

            return (
              <motion.div
                key={serv.id}
                whileHover={{ y: -8, scale: 1.01 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                onClick={() => {
                  // Clic sur la carte → FICHE DÉTAILLÉE (plus de fenêtre de paiement :
                  // la commande se finalise dans le panier).
                  if (serv.id) window.location.href = `/service/${serv.id}`;
                }}
                className={`group relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl ${borderHover} ${getAnimationClasses(serv.cardAnimation)} cursor-pointer flex flex-col justify-between overflow-hidden transition-colors duration-500`}
                style={{
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
                      // Sans image : on laisse le clic remonter → fiche détaillée.
                      if (allImagesOf(serv).length === 0) return;
                      e.stopPropagation();
                      openGallery(serv);
                    }}
                    title={allImagesOf(serv).length > 1 ? "Voir les photos" : "Agrandir l'image"}
                    className={`relative w-24 xs:w-28 sm:w-32 lg:w-36 shrink-0 self-stretch overflow-hidden bg-[#021231] ${
                      allImagesOf(serv).length > 0 ? "cursor-zoom-in" : "cursor-pointer"
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
                className="flex items-center gap-1.5 rounded-full bg-[#D69E25] px-3 py-1.5 text-[11px] font-black text-[#021231] hover:bg-amber-400 transition"
                aria-label="Fermer la galerie"
              >
                <X className="w-3.5 h-3.5" />
                Fermer
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
              {/* Bouton de fermeture TOUJOURS visible, posé sur l'image */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGallery(null);
                }}
                className="absolute top-1 right-1 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#D69E25] text-[#021231] shadow-lg hover:bg-amber-400 transition"
                aria-label="Fermer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
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
