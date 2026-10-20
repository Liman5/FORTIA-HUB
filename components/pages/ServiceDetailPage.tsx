"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock,
  Images,
  Mail,
  MessageCircle,
  ShoppingCart,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { ServicePackage } from "@/lib/types";

/**
 * FICHE DÉTAILLÉE D'UN SERVICE
 * -------------------------------------------------------------------
 * Toutes les informations du service, sa galerie d'images consultable,
 * puis la commande (paiement) ou le contact. Aucune donnée inventée.
 */
export function ServiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { services, addToCart } = useAppStore();
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);

  const service = useMemo<ServicePackage | null>(() => {
    const id = String(params?.id || "");
    if (!id) return null;
    return (services || []).find((s) => String(s.id) === id) || null;
  }, [services, params?.id]);

  const images = useMemo(() => {
    if (!service) return [] as string[];
    const list = [service.image, ...(Array.isArray(service.images) ? service.images : [])].filter(
      (url): url is string => typeof url === "string" && url.length > 0
    );
    return Array.from(new Set(list));
  }, [service]);

  useEffect(() => {
    setActive(0);
  }, [service?.id]);

  const accent = service?.accentColor || "#D69E25";

  if (!service) {
    return (
      <div className="bg-[#021231] text-white min-h-screen px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <Sparkles className="w-10 h-10 text-[#D69E25] mx-auto" />
          <h1 className="text-xl font-black">Service introuvable</h1>
          <p className="text-sm text-slate-400">
            Ce service n'est plus disponible ou son adresse a changé.
          </p>
          <a
            href="/services"
            className="inline-flex items-center gap-2 rounded-xl bg-[#D69E25] px-4 py-2.5 text-xs font-black text-[#021231] hover:bg-amber-400 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Voir tous les services
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#021231] text-white min-h-screen pb-24 fortia-flat">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5">
        <a
          href="/services"
          className="inline-flex items-center gap-2 rounded-xl border border-[#D69E25]/40 bg-[#011D46] px-3 py-1.5 text-[11px] font-black text-[#D69E25] hover:bg-[#032454] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Tous les services
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ==== GALERIE ==== */}
          <div className="space-y-2">
            <div
              className="relative rounded-2xl overflow-hidden border border-slate-700 bg-[#011D46] aspect-[4/3]"
              onClick={() => images.length > 0 && setZoom(true)}
            >
              {images.length > 0 ? (
                <img
                  src={images[active]}
                  alt={service.title}
                  className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                  style={{ objectPosition: service.imagePosition || "50% 50%" }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                  <Images className="w-8 h-8" />
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActive((i) => (i - 1 + images.length) % images.length);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-[#D69E25] hover:text-[#021231] transition"
                    aria-label="Photo précédente"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActive((i) => (i + 1) % images.length);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-[#D69E25] hover:text-[#021231] transition"
                    aria-label="Photo suivante"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-black">
                    {active + 1} / {images.length}
                  </span>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    onClick={() => setActive(i)}
                    className={`w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition ${
                      i === active ? "border-[#D69E25]" : "border-white/15 hover:border-white/40"
                    }`}
                  >
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ==== INFORMATIONS ==== */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                {service.category}
              </span>
              {service.badgeText && (
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
                  style={{ color: accent, borderColor: `${accent}50`, backgroundColor: `${accent}15` }}
                >
                  {service.featured ? "★ " : ""}
                  {service.badgeText}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black leading-tight">{service.title}</h1>
            <p className="text-sm text-slate-300 leading-relaxed">{service.description}</p>

            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-700 bg-[#011D46] px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">À partir de</p>
                <p className="text-xl font-black text-[#D69E25]">
                  ${Number(service.startingPrice) || 0}
                </p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Délai</p>
                <p className="flex items-center gap-1 text-sm font-bold">
                  <Clock className="w-3.5 h-3.5" style={{ color: accent }} />
                  {service.estimatedDays || "À définir"}
                </p>
              </div>
            </div>

            {(service.deliverables || []).length > 0 && (
              <div className="rounded-2xl border border-slate-700 bg-[#011D46] p-4 space-y-2">
                <h2 className="text-xs font-black uppercase tracking-wide text-slate-300">
                  Ce qui est livré
                </h2>
                {(service.deliverables || []).map((del, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: accent }} />
                    <span className="text-[11px] leading-tight text-slate-300">{del}</span>
                  </div>
                ))}
              </div>
            )}

            {(service.options || []).length > 0 && (
              <div className="rounded-2xl border border-slate-700 bg-[#011D46] p-4 space-y-2">
                <h2 className="text-xs font-black uppercase tracking-wide text-slate-300">
                  Options disponibles
                </h2>
                {(service.options || []).map((opt, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-300">{opt.name}</span>
                    <span className="font-black text-[#D69E25]">+${Number(opt.price) || 0}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Commander : le service est AJOUTÉ AU PANIER (commande de service),
                le paiement se finalise dans /cart — plus de fenêtre ici. */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  addToCart({
                    id: service.id,
                    type: "service",
                    title: service.title,
                    price: Number(service.startingPrice) || 0,
                    image: service.image || "",
                    categoryLabel: service.category,
                  });
                  window.location.href = "/cart?payer=1";
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#D69E25] px-4 py-3 text-xs font-black text-[#021231] hover:bg-amber-400 transition"
              >
                <ShoppingCart className="w-4 h-4" /> Commander ce service
              </button>
              <a
                href={`mailto:support@fortiahub.com?subject=${encodeURIComponent(
                  `Demande d'information : ${service.title}`
                )}`}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#D69E25]/40 bg-[#011D46] px-4 py-3 text-xs font-black text-[#D69E25] hover:bg-[#032454] transition"
              >
                <Mail className="w-4 h-4" /> Contacter l'équipe
              </a>
            </div>
            <p className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <MessageCircle className="w-3 h-3" />
              Le service est ajouté à votre panier : le paiement et le suivi de la commande se font
              depuis le panier.
            </p>
          </div>
        </div>
      </div>

      {/* ==== ZOOM PLEIN ÉCRAN ==== */}
      {zoom && images.length > 0 && (
        <div
          className="fixed inset-0 z-[130] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setZoom(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
          <img
            src={images[active]}
            alt={service.title}
            className="max-h-full max-w-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
