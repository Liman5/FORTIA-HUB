"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap,
  User,
  Star,
  Clock,
  ChevronRight,
  ChevronLeft,
  Users,
  MoreHorizontal,
  BadgeCheck,
  MapPin,
  LayoutTemplate,
  PlayCircle,
  Briefcase,
  Loader2,
  BookOpen,
  Download,
  ZoomIn,
  Gift,
  Compass,
  ShoppingBag,
  Store,
} from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { useCatalog, useMarketplace } from "@/lib/store/domains/contexts";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { COURSE_CATEGORY_FAMILIES, sortByPopularity } from "@/lib/data/courseCategories";
import { OptimizedImage } from "@/components/OptimizedImage";
import { IbxLightbox } from "@/components/ui/IbxLightbox";
import { buildProductCategories, type ProductCategoryOption } from "@/lib/data/productCategories";
import { formatFcfa, formatPricePair, resolveMoneyConfig, type MoneyConfig } from "@/lib/data/currency";
import { ContentCard } from "@/components/discovery/ContentCard";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { storeHref } from "@/lib/data/storeSlug";
import {
  buildMixedFeed,
  listFreeCourses,
  listFreeProducts,
  toCourseItem,
  toProductItem,
  type ExplorerItem,
} from "@/lib/data/explorer";

/* =====================================================================
   FORTIA HUB — Interface d'accueil (routes "/" et "/home")
   Habillage clair conforme à la maquette : en-tête navy + or, bannière
   en image pleine (sans texte superposé), catégories sur une seule ligne
   défilable, cartes blanches. Toutes les données viennent du store.
   ===================================================================== */

/** Taux de conversion historique — remplacé par `lib/data/currency.ts`. */

/** Construit l'URL de l'Académie filtrée sur une catégorie. */
export function buildAcademyCategoryUrl(slug: string): string {
  return `/academy?categorie=${encodeURIComponent(slug)}`;
}

/** Construit l'URL de la boutique filtrée sur un type de produit. */
export function buildShopTypeUrl(productType: string): string {
  return `/marketplace?type=${encodeURIComponent(productType)}`;
}


/** Tuiles « Ressources numériques » : uniquement des types réellement en vente. */
const RESOURCE_TILES: {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  /** Type réel de produit (colonne `type` de la table products). */
  productType: string;
}[] = [
  { key: "ebooks", label: "Ebooks & Guides", icon: BookOpen, color: "#10B981", productType: "ebook" },
  {
    key: "templates",
    label: "Templates Canva",
    icon: LayoutTemplate,
    color: "#2563EB",
    productType: "canva_template",
  },
  { key: "prompts", label: "Prompts IA", icon: PlayCircle, color: "#8B5CF6", productType: "ai_prompts" },
  {
    key: "business",
    label: "Business Plans",
    icon: Briefcase,
    color: "#F59E0B",
    productType: "business_plan",
  },
];

/** Types de produits qui ne doivent jamais apparaître dans la boutique digitale. */
const NON_DIGITAL_PRODUCT_TYPES = ["course", "service"];

/* ============================ BANNIÈRE ============================
   Bannière 100 % image : aucun texte, badge ni bouton superposé.
   Les visuels proviennent du module ADMIN « Bannières du Site »
   (image R2, animation, lien, durée d'affichage). Les images de
   démonstration ne servent que de repli si aucune bannière n'existe.
   ================================================================== */
function HeroBanner() {
  const router = useRouter();
  const { siteBanners, platformLoaded } = useAppStore();
  const [index, setIndex] = useState(0);

  /** Bannières actives gérées depuis l'administration (triées par ordre). */
  const slides = useMemo(() => {
    const managed = (siteBanners || [])
      .filter((banner) => banner && banner.isActive !== false && banner.imageUrl)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map((banner) => ({
        id: banner.id,
        image: banner.imageUrl,
        alt: banner.title || "Bannière",
        link: banner.buttonLink || "",
        external: banner.linkTarget === "external",
        animation: banner.animation || "fade",
        interval: Math.min(60000, Math.max(2000, Number(banner.intervalMs) || 6000)),
        position: banner.imagePosition || "50% 50%",
      }));

    if (managed.length > 0) return managed;

    // Aucune bannière publiée : AUCUN visuel de démonstration (plus de fausse
    // bannière ni de « flash » d'ancienne interface au rechargement).
    return [] as typeof managed;
  }, [siteBanners]);

  /** Variantes d'animation de la bannière — réglées dans ADMIN → Bannières. */
  const variantsFor = (animation?: string) => {
    switch (animation) {
      case "slide":
        return {
          initial: { opacity: 0, x: 90 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -90 },
        };
      case "zoom":
        return {
          initial: { opacity: 0, scale: 1.14 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.94 },
        };
      case "flip":
        return {
          initial: { opacity: 0, rotateY: 85 },
          animate: { opacity: 1, rotateY: 0 },
          exit: { opacity: 0, rotateY: -85 },
        };
      case "none":
        return {
          initial: { opacity: 1 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
    }
  };


  // Recadre l'index si la liste change (bannière supprimée/désactivée)
  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  // Défilement automatique : chaque bannière impose SA durée d'affichage.
  // Désactivé si l'utilisateur préfère une interface sans animation.
  useEffect(() => {
    if (slides.length <= 1) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const slide = slides[index] || slides[0];
    const timer = setTimeout(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, slide.interval);
    return () => clearTimeout(timer);
  }, [index, slides]);

  /** Navigation manuelle (flèches, puces, balayage tactile). */
  const goTo = React.useCallback(
    (next: number) => {
      if (slides.length === 0) return;
      setIndex(((next % slides.length) + slides.length) % slides.length);
    },
    [slides.length]
  );

  const touchStartX = React.useRef<number | null>(null);
  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null || slides.length <= 1) return;
    const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    setIndex((current) => (current + (delta < 0 ? 1 : -1) + slides.length) % slides.length);
  };

  const slide = slides[index] || slides[0];

  // Aucune bannière publiée et plateforme chargée : on n'affiche RIEN
  // (aucun visuel factice, aucun squelette infini).
  if (!slide) {
    if (platformLoaded) return null;
    return (
      <section className="relative" aria-hidden="true">
        <div
          className="ibx-card-muted flex aspect-[2.3/1] items-center justify-center sm:aspect-[3/1] lg:aspect-[4/1]"
          role="presentation"
        >
          <span className="ibx-small inline-flex items-center gap-2">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: "var(--ibx-border-strong)", borderTopColor: "transparent" }}
            />
            Chargement de la bannière…
          </span>
        </div>
      </section>
    );
  }

  const openSlide = () => {
    if (!slide?.link) return;
    if (slide.external) window.open(slide.link, "_blank", "noopener,noreferrer");
    else router.push(slide.link);
  };

  return (
    <section className="relative">
      <div
        className={`ibx-media group relative aspect-[2.3/1] overflow-hidden rounded-[var(--ibx-radius-lg)] border border-[var(--ibx-border)] sm:aspect-[3/1] lg:aspect-[4/1] ${
          slide?.link ? "cursor-pointer" : ""
        }`}
        style={{
          perspective: 1200,
          backgroundColor: "var(--ibx-surface-muted)",
          boxShadow: "var(--ibx-shadow-md)",
        }}
        onClick={openSlide}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={slide.id}
            src={slide.image}
            alt={slide.alt}
            {...variantsFor(slide.animation)}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="block h-full w-full object-cover"
            style={{ objectPosition: slide.position }}
            draggable={false}
          />
        </AnimatePresence>

        {/* Flèches : discrètes, visibles au survol / focus clavier */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goTo(index - 1);
              }}
              aria-label="Bannière précédente"
              className="absolute left-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white opacity-0 transition hover:bg-black/55 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white group-hover:opacity-100 lg:flex"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goTo(index + 1);
              }}
              aria-label="Bannière suivante"
              className="absolute right-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white opacity-0 transition hover:bg-black/55 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white group-hover:opacity-100 lg:flex"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* Puces de navigation placées SOUS l'image, jamais dessus */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-3">
          {slides.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Afficher la bannière ${i + 1} sur ${slides.length}`}
              aria-current={i === index}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? 20 : 6,
                backgroundColor: i === index ? "var(--ibx-accent)" : "var(--ibx-border-strong)",
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ================ CARROUSEL HORIZONTAL RÉUTILISABLE ================
   Une seule ligne, défilement fluide, flèches discrètes sur grand
   écran (masquées lorsque le contenu tient dans la largeur disponible).
   ================================================================== */
function CarouselRow({
  children,
  ariaLabel,
  className = "",
}: {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    updateScrollState();
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, children]);

  const scrollByAmount = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  };

  const arrowClass =
    "hidden lg:flex absolute top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-md items-center justify-center text-slate-600 hover:bg-[#D69E25] hover:border-[#D69E25] hover:text-white transition";

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount(-1)}
          className={`${arrowClass} -left-4`}
          aria-label={`Faire défiler ${ariaLabel} vers la gauche`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount(1)}
          className={`${arrowClass} -right-4`}
          aria-label={`Faire défiler ${ariaLabel} vers la droite`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      <div
        ref={scrollerRef}
        className={`flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

/* =========================== CATÉGORIES ===========================
   Une SEULE ligne, alimentée par la source unique des catégories
   partagée avec la page Académie.
   ================================================================== */
function CategoryRow({
  onSelect,
  onSeeMore,
}: {
  onSelect: (slug: string) => void;
  onSeeMore: () => void;
}) {
  return (
    <CarouselRow ariaLabel="les catégories">
      {COURSE_CATEGORY_FAMILIES.map((category) => {
        const Icon = category.icon;
        return (
          <button
            key={category.slug}
            type="button"
            onClick={() => onSelect(category.slug)}
            className="snap-start shrink-0 w-[74px] lg:w-[86px] flex flex-col items-center gap-2 cursor-pointer group"
            title={category.label}
          >
            <span
              className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center transition group-hover:scale-105"
              style={{ backgroundColor: category.bg }}
            >
              <Icon className="w-6 h-6" style={{ color: category.color }} />
            </span>
            <span className="text-[10px] lg:text-[11px] leading-tight text-center text-slate-700 font-bold line-clamp-2">
              {category.label}
            </span>
          </button>
        );
      })}

      {/* Tuile « Voir plus » → catalogue complet de l'Académie */}
      <button
        type="button"
        onClick={onSeeMore}
        className="snap-start shrink-0 w-[74px] lg:w-[86px] flex flex-col items-center gap-2 cursor-pointer group"
        title="Voir tout le catalogue"
      >
        <span className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center bg-[#D69E25] transition group-hover:brightness-110">
          <MoreHorizontal className="w-6 h-6 text-white" />
        </span>
        <span className="text-[10px] lg:text-[11px] leading-tight text-center text-slate-700 font-bold">
          Voir plus
        </span>
      </button>
    </CarouselRow>
  );
}

/* ======================== TITRE DE SECTION ======================== */
function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="ibx-h2">{title}</h2>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="flex shrink-0 items-center gap-0.5 text-[11px] font-black transition"
          style={{ color: "var(--ibx-accent-strong)" }}
        >
          {actionLabel}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/* ========================= VIGNETTE IMAGE =========================
   Évite tout attribut src vide (source de l'erreur console) : sans
   image disponible, on affiche un aplat de secours.
   ================================================================= */
function Thumb({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-[#0B1B36] ${className}`}>
        <GraduationCap className="w-6 h-6 text-[#D69E25]/70" />
      </div>
    );
  }
  return <OptimizedImage src={src} alt={alt} className={className} />;
}

/* ========================= CARTE FORMATION ========================= */
function CourseCard({
  course,
  onOpen,
  onPrefetch,
  money,
}: {
  course: {
    id: string;
    title: string;
    badge?: string;
    categoryLabel?: string;
    level?: string;
    durationHours?: number;
    price: number;
    rating?: number;
    reviewsCount?: number;
    image?: string;
    instructor?: { name?: string; avatar?: string };
  };
  onOpen: () => void;
  /** Précharge la fiche au survol : navigation quasi instantanée. */
  onPrefetch?: () => void;
  money: MoneyConfig;
}) {
  const price = formatPricePair(Number(course.price) || 0, money);

  return (
    <article
      onClick={onOpen}
      onMouseEnter={onPrefetch}
      onTouchStart={onPrefetch}
      className="ibx-card-flat ibx-interactive group relative w-[196px] shrink-0 snap-start cursor-pointer overflow-hidden text-left sm:w-[214px]"
    >
      {/* Texture douce : léger dégradé doré en haut, sans surcharger la carte */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(158deg, color-mix(in srgb, var(--ibx-accent) 9%, transparent) 0%, transparent 46%)",
        }}
      />

      <div className="ibx-media relative h-28">
        <Thumb src={course.image} alt={course.title} className="h-full w-full" />
        <span
          className="absolute left-1.5 top-1.5 max-w-[70%] truncate rounded-full px-1.5 py-0.5 text-[8px] font-bold"
          style={{ backgroundColor: "var(--ibx-accent)", color: "#1c1405" }}
        >
          {course.badge || course.categoryLabel || "Certifiant"}
        </span>
        {/* Favori réel : enregistré en base et visible dans /favorites */}
        <FavoriteButton resourceType="course" resourceId={course.id} variant="overlay" />
      </div>

      <div className="relative flex flex-col gap-1.5 p-2.5">
        <h3 className="ibx-h3 line-clamp-2 min-h-[32px] !text-[12.5px] leading-[1.3]">
          {course.title}
        </h3>

        <div className="flex items-center gap-1">
          <span
            className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full border"
            style={{ borderColor: "var(--ibx-border)", backgroundColor: "var(--ibx-surface-muted)" }}
          >
            {course.instructor?.avatar ? (
              <Thumb
                src={course.instructor.avatar}
                alt={course.instructor?.name || "Formateur"}
                className="h-4 w-4 rounded-full"
              />
            ) : (
              <User className="h-2.5 w-2.5" style={{ color: "var(--ibx-fg-subtle)" }} />
            )}
          </span>
          <span className="ibx-tiny truncate !text-[10px]">{course.instructor?.name || "FORTIA HUB"}</span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px]">
          {(Number(course.reviewsCount) || 0) > 0 ? (
            <>
              <span className="flex items-center gap-0.5 font-bold" style={{ color: "var(--ibx-accent-strong)" }}>
                <Star className="h-2.5 w-2.5" style={{ fill: "var(--ibx-accent)", color: "var(--ibx-accent)" }} />
                {Number(course.rating || 0).toFixed(1)}
              </span>
              <span className="ibx-tiny !text-[9px]">({course.reviewsCount})</span>
            </>
          ) : (
            <span className="ibx-tiny !text-[9px]">Nouveau</span>
          )}
          <span className="ibx-tiny ml-auto inline-flex items-center gap-0.5 !text-[9px] font-semibold">
            <Clock className="h-2.5 w-2.5" />
            {course.durationHours || 0}h
          </span>
        </div>

        <div
          className="mt-auto flex items-end justify-between gap-1.5 border-t pt-1.5"
          style={{ borderColor: "var(--ibx-border)" }}
        >
          <span className="min-w-0">
            <span className="ibx-price block !text-[12.5px]">{price.primary}</span>
            {price.secondary && <span className="ibx-tiny block !text-[9px]">{price.secondary}</span>}
          </span>
          {course.level && (
            <span
              className="shrink-0 rounded border px-1 py-px text-[8.5px] font-semibold"
              style={{ borderColor: "var(--ibx-border)", color: "var(--ibx-fg-muted)" }}
            >
              {course.level}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/* =========================== CARTE CENTRE =========================== */
function CenterCard({
  center,
  onOpen,
}: {
  center: { id: string; centerName: string; banner: string; learnersLabel: string };
  onOpen: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className="ibx-card-flat ibx-interactive w-[178px] shrink-0 snap-start cursor-pointer overflow-hidden text-left"
    >
      <div className="ibx-media relative h-20">
        <Thumb src={center.banner} alt={center.centerName} className="h-full w-full" />
      </div>
      <div className="space-y-0.5 p-2.5">
        <h3 className="ibx-h3 line-clamp-1 !text-[12px]">{center.centerName}</h3>
        <span className="flex items-center gap-1 text-[9px] font-semibold" style={{ color: "var(--ibx-fg-muted)" }}>
          <Users className="h-2.5 w-2.5" style={{ color: "var(--ibx-accent-strong)" }} />
          {center.learnersLabel}
        </span>
      </div>
    </div>
  );
}

/* ==================== CARTE PRODUIT DIGITAL ====================
   Cartes dédiées aux produits téléchargeables (jamais des formations).
   ============================================================== */
function ProductCard({
  product,
  onOpen,
  onPrefetch,
  money,
}: {
  product: {
    id: string;
    title: string;
    typeLabel?: string;
    price: number;
    image?: string;
    storeName?: string;
    rating?: number;
    reviewsCount?: number;
  };
  onOpen: () => void;
  /** Précharge la fiche au survol : navigation quasi instantanée. */
  onPrefetch?: () => void;
  money: MoneyConfig;
}) {
  const price = Number(product.price) || 0;
  const reviewsCount = Number(product.reviewsCount) || 0;
  const [zoomOpen, setZoomOpen] = useState(false);
  const pricePair = formatPricePair(price, money);
  return (
    <article
      onMouseEnter={onPrefetch}
      onTouchStart={onPrefetch}
      className="ibx-card-flat ibx-interactive relative flex w-[168px] shrink-0 snap-start flex-col overflow-hidden sm:w-[188px]"
    >
      {/* Texture : voile doré très léger, distinct de la carte formation */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--ibx-info) 10%, transparent) 0%, transparent 60%)",
        }}
      />
      {/* Visuel : le clic agrandit l'image (distinct du clic qui ouvre la fiche) */}
      <div className="ibx-media relative h-28">
        {product.image ? (
          <>
            <img
              src={product.image}
              alt={product.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              className="ibx-media-zoom"
              style={{ opacity: 1 }}
              aria-label={`Agrandir l'image de ${product.title}`}
              title="Agrandir l'image"
            >
              <ZoomIn className="h-3 w-3" aria-hidden="true" />
            </button>
          </>
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Download
              className="h-5 w-5"
              aria-hidden="true"
              style={{ color: "var(--ibx-fg-subtle)" }}
            />
          </span>
        )}
        {product.typeLabel && (
          <span className="absolute left-1.5 top-1.5 max-w-[80%] truncate rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ backgroundColor: "var(--ibx-accent)", color: "#1c1405" }}>
            {product.typeLabel}
          </span>
        )}
        <FavoriteButton
          resourceType="product"
          resourceId={product.id}
          variant="overlay"
          className="!left-1.5 !right-auto !top-auto !bottom-1.5"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <button type="button" onClick={onOpen} className="text-left">
          <h3 className="ibx-h3 line-clamp-2 min-h-[32px] !text-[12px] leading-[1.3]">{product.title}</h3>
        </button>
        <div className="flex items-center justify-between gap-1.5">
          <span className="ibx-tiny truncate !text-[9px]">{product.storeName || "FORTIA HUB"}</span>
          {reviewsCount > 0 && (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-[9px]" style={{ color: "var(--ibx-fg-muted)" }}>
              <Star
                className="h-2.5 w-2.5"
                aria-hidden="true"
                style={{ color: "var(--ibx-accent)", fill: "var(--ibx-accent)" }}
              />
              {Number(product.rating || 0).toFixed(1)}
            </span>
          )}
        </div>
        <div
          className="mt-auto flex items-center justify-between gap-1.5 border-t pt-1.5"
          style={{ borderColor: "var(--ibx-border)" }}
        >
          <span className="min-w-0">
            <span className="ibx-price block !text-[12px]">{pricePair.primary}</span>
            {pricePair.secondary && <span className="ibx-tiny block !text-[9px]">{pricePair.secondary}</span>}
          </span>
          <button type="button" onClick={onOpen} className="ibx-btn ibx-btn-ghost !px-1.5 !py-0.5 !text-[9px]">
            Voir
          </button>
        </div>
      </div>

      <IbxLightbox
        images={product.image ? [{ src: product.image, alt: product.title }] : []}
        index={0}
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        label={`Aperçu de ${product.title}`}
      />
    </article>
  );
}


/* =========================== RESSOURCES =========================== */
function ResourcesGrid({
  tiles,
  onOpen,
  money,
}: {
  tiles: {
    key: string;
    label: string;
    icon: React.ElementType;
    color: string;
    productType: string;
    minPriceUsd: number;
  }[];
  onOpen: (productType: string) => void;
  money: MoneyConfig;
}) {
  /* Défilement horizontal : réutilise CarouselRow (flèches desktop,
     balayage tactile mobile, aucune automatisation). */
  return (
    <CarouselRow ariaLabel="les ressources numériques" className="gap-2.5 pb-1">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <button
            key={tile.key}
            type="button"
            onClick={() => onOpen(tile.productType)}
            className="ibx-card-flat ibx-interactive relative flex w-[132px] shrink-0 snap-start cursor-pointer flex-col gap-1.5 overflow-hidden p-2.5 text-left sm:w-[150px]"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(150deg, color-mix(in srgb, ${tile.color} 12%, transparent) 0%, transparent 55%)`,
              }}
            />
            <span
              className="relative flex h-8 w-8 items-center justify-center rounded-[var(--ibx-radius-sm)]"
              style={{
                backgroundColor: `color-mix(in srgb, ${tile.color} 16%, var(--ibx-surface))`,
                color: tile.color,
              }}
              aria-hidden="true"
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="relative block">
              <span className="ibx-h3 block !text-[11.5px] leading-[1.25]">{tile.label}</span>
              <span className="ibx-tiny mt-0.5 block !text-[9px]">
                {tile.minPriceUsd > 0 ? `Dès ${formatFcfa(tile.minPriceUsd, money.rate)}` : "Gratuit"}
              </span>
            </span>
          </button>
        );
      })}
    </CarouselRow>
  );
}

/* ==================================================================
   PAGE D'ACCUEIL FORTIA HUB (routes "/" et "/home")
   ================================================================== */
/** Mini-catalogue promotionnel : produits réels, liens directs vers leur fiche. */
function ProductShowcaseBanner({ products, money }: { products: any[]; money: MoneyConfig }) {
  const router = useRouter();
  if (products.length < 2) return null;
  return (
    <section className="ibx-card relative overflow-hidden">
      {/* Texture d'en-tête : filet doré + halo très doux (aucune surcharge) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, color-mix(in srgb, var(--ibx-accent) 10%, transparent) 0%, transparent 38%)",
        }}
      />
      <div
        className="relative flex items-center justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: "var(--ibx-border)" }}
      >
        <div>
          <p className="ibx-h3 !text-[12.5px]">Sélection numérique</p>
          <p className="ibx-tiny mt-0.5 !text-[9.5px]">
            Des ressources prêtes à télécharger, choisies dans la boutique.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/marketplace")}
          className="ibx-btn ibx-btn-outline shrink-0"
        >
          Voir la boutique
        </button>
      </div>
      <div className="relative flex snap-x gap-2.5 overflow-x-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.slice(0, 5).map((product: any) => (
          <button
            key={product.id}
            type="button"
            onClick={() =>
              router.push(`/product/${encodeURIComponent(String(product.slug || product.id))}`)
            }
            className="ibx-card-flat ibx-interactive group w-[148px] shrink-0 snap-start overflow-hidden text-left"
          >
            <span className="ibx-media block h-24 w-full">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <Download
                    className="h-5 w-5"
                    aria-hidden="true"
                    style={{ color: "var(--ibx-fg-subtle)" }}
                  />
                </span>
              )}
            </span>
            <span className="block p-2">
              <span className="ibx-h3 line-clamp-1 !text-[11.5px] leading-[1.3]">{product.title}</span>
              <span className="mt-0.5 block text-[9px] font-semibold" style={{ color: "var(--ibx-accent-strong)" }}>
                {formatPricePair(Number(product.price) || 0, money).primary}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Bannière éditoriale secondaire (ordre Admin : displayOrder). */
function PromoBannerSlot({ offset }: { offset: number }) {
  const router = useRouter();
  const { siteBanners } = useAppStore();
  const banner = useMemo(() => {
    return (siteBanners || [])
      .filter((item) => item && item.isActive !== false && item.imageUrl)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))[offset];
  }, [siteBanners, offset]);

  if (!banner) return null;

  const open = () => {
    if (!banner.buttonLink) return;
    if (banner.linkTarget === "external") window.open(banner.buttonLink, "_blank", "noopener,noreferrer");
    else router.push(banner.buttonLink);
  };

  return (
    <section className="ibx-card overflow-hidden">
      <button type="button" onClick={open} className="group relative block w-full text-left">
        <img src={banner.imageUrl} alt={banner.title || "Bannière"} className="h-40 w-full object-cover sm:h-56" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-7">
          <p className="text-sm font-black text-white sm:text-lg">{banner.title}</p>
          {banner.subtitle && <p className="mt-1 max-w-xl text-[11px] text-white/80 sm:text-xs">{banner.subtitle}</p>}
          {banner.buttonLabel && (
            <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-slate-900">
              {banner.buttonLabel} <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </button>
    </section>
  );
}

/** Bandeau de catégories de produits : trois visibles à la fois sur mobile,
 *  défilement automatique toutes les 3,2 s (mise en pause au survol et au
 *  toucher). À partir de 768 px, les catégories passent en grille alignée. */
function ProductCategoryRail({
  categories,
  onSelect,
}: {
  categories: ProductCategoryOption[];
  onSelect: (slug: string) => void;
}) {
  const railRef = React.useRef<HTMLDivElement>(null);
  const pausedRef = React.useRef(false);

  useEffect(() => {
    if (categories.length <= 3) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      const el = railRef.current;
      if (!el || pausedRef.current) return;
      // Rotation uniquement sur mobile : le desktop affiche la grille.
      if (!window.matchMedia("(max-width: 767px)").matches) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + el.clientWidth, behavior: "smooth" });
    }, 3200);

    return () => window.clearInterval(timer);
  }, [categories.length]);

  return (
    <div
      ref={railRef}
      role="group"
      aria-label="Catégories de produits numériques"
      className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:gap-3 md:overflow-visible md:pb-0"
      onPointerEnter={() => {
        pausedRef.current = true;
      }}
      onPointerLeave={() => {
        pausedRef.current = false;
      }}
      onTouchStart={() => {
        pausedRef.current = true;
      }}
      onFocusCapture={() => {
        pausedRef.current = true;
      }}
      onBlurCapture={() => {
        pausedRef.current = false;
      }}
    >
      {categories.map((category) => (
        <button
          key={category.slug}
          type="button"
          onClick={() => onSelect(category.slug)}
          className="ibx-card-flat ibx-interactive group relative flex w-[calc((100%_-_1rem)/3)] shrink-0 snap-start items-center justify-between gap-1 overflow-hidden p-2.5 text-left md:w-auto md:gap-3 md:px-3.5 md:py-3"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(120deg, color-mix(in srgb, var(--ibx-accent) 7%, transparent) 0%, transparent 55%)",
            }}
          />
          <span className="relative min-w-0">
            <span className="ibx-h3 line-clamp-2 !text-[10.5px] leading-[1.25] md:!text-[12.5px]">
              {category.label}
            </span>
            <span className="ibx-tiny mt-0.5 block !text-[8.5px] md:!text-[9.5px]">
              {category.count} produit{category.count > 1 ? "s" : ""}
            </span>
          </span>
          <ChevronRight
            className="relative hidden h-3.5 w-3.5 shrink-0 transition group-hover:translate-x-0.5 md:block"
            style={{ color: "var(--ibx-accent-strong)" }}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
}

/** Accès rapide : quatre raccourcis visuels vers les univers de la plateforme. */
const QUICK_LINKS = [
  { href: "/gratuit", label: "Gratuit", description: "Accès libre", icon: Gift, tone: "success" },
  { href: "/academy", label: "Formations", description: "Se certifier", icon: GraduationCap, tone: "accent" },
  { href: "/marketplace", label: "Produits", description: "Télécharger", icon: ShoppingBag, tone: "info" },
  { href: "/decouvrir", label: "À découvrir", description: "Explorer", icon: Compass, tone: "accent" },
] as const;

const QUICK_TONES: Record<string, { bg: string; fg: string }> = {
  success: { bg: "var(--ibx-success-soft)", fg: "var(--ibx-success)" },
  accent: { bg: "var(--ibx-accent-soft)", fg: "var(--ibx-accent-strong)" },
  info: { bg: "var(--ibx-info-soft)", fg: "var(--ibx-info)" },
};

function QuickAccessRow() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {QUICK_LINKS.map((link) => {
        const Icon = link.icon;
        const tone = QUICK_TONES[link.tone];
        return (
          <Link
            key={link.href}
            href={link.href}
            prefetch
            className="ibx-card-flat ibx-interactive flex items-center gap-2.5 p-2.5"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--ibx-radius-sm)]"
              style={{ backgroundColor: tone.bg, color: tone.fg }}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="ibx-h3 block truncate !text-[12px]">{link.label}</span>
              <span className="ibx-tiny block truncate !text-[9px]">{link.description}</span>
            </span>
            <ChevronRight
              className="ml-auto h-3.5 w-3.5 shrink-0"
              style={{ color: "var(--ibx-fg-subtle)" }}
              aria-hidden="true"
            />
          </Link>
        );
      })}
    </div>
  );
}

/* ======================= CARTE BOUTIQUE ======================= */
/** Boutique d'un créateur : bannière, logo, nom, ventes et description. */
function StoreCard({ store }: { store: any }) {
  const sales = Number(store?.salesCount) || 0;
  return (
    <Link
      href={storeHref(store)}
      prefetch
      className="ibx-card-flat ibx-interactive group flex w-[228px] shrink-0 snap-start flex-col overflow-hidden"
    >
      <span className="ibx-media block h-20 shrink-0">
        {store?.banner ? (
          <img
            src={store.banner}
            alt={store.name || "Boutique"}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : null}
      </span>

      <span className="flex items-end gap-2 px-3 pt-1">
        <span
          className="flex h-11 w-11 shrink-0 -translate-y-3 items-center justify-center overflow-hidden rounded-[var(--ibx-radius-sm)] border"
          style={{ borderColor: "var(--ibx-border)", backgroundColor: "var(--ibx-surface)" }}
          aria-hidden="true"
        >
          {store?.logo ? (
            <img src={store.logo} alt="" className="h-full w-full object-cover" />
          ) : (
            <Store className="h-4 w-4" style={{ color: "var(--ibx-accent-strong)" }} />
          )}
        </span>
        <span className="min-w-0 pb-0.5">
          <span className="ibx-h3 line-clamp-1 !text-[12px]">{store?.name || "Boutique"}</span>
          <span className="ibx-tiny block !text-[9px]">
            {sales} vente{sales > 1 ? "s" : ""}
          </span>
        </span>
      </span>

      <span className="block px-3 pb-2.5 pt-1">
        <span className="ibx-tiny line-clamp-2 h-[26px] !text-[9.5px] leading-[1.35]">
          {store?.description || "Ressources numériques de ce créateur."}
        </span>
      </span>
    </Link>
  );
}

export function HomePage() {
  const router = useRouter();
  const { marketplaceProducts, freelances, stores } = useMarketplace();
  const { courses, trainingCenters } = useCatalog();
  const { platformLoaded, siteContent } = useAppStore();
  /* Affichage des prix : FCFA principal, équivalent USD facultatif
     (réglé dans Admin → Contenu du site). Aucune valeur n'est convertie
     en base : uniquement du formatage. */
  const money = useMemo(() => resolveMoneyConfig(siteContent), [siteContent]);

  /* Formations populaires : tri sur données réelles (note puis apprenants). */
  const popularCourses = useMemo(() => sortByPopularity(courses || []).slice(0, 15), [courses]);

  /* Contenus gratuits : deux univers séparés (formations / produits). */
  const freeCourses = useMemo(() => listFreeCourses(courses).map(toCourseItem), [courses]);
  const freeProducts = useMemo(
    () => listFreeProducts(marketplaceProducts).map(toProductItem),
    [marketplaceProducts]
  );

  /* Boutiques réellement ouvertes (actives) : rail « créateurs ». */
  const activeStores = useMemo(
    () => (stores || []).filter((store: any) => store && store.status === "active"),
    [stores]
  );

  /* Flux « à découvrir » : 25 contenus mixtes (formations + produits). */
  const mixedFeed: ExplorerItem[] = useMemo(
    () => buildMixedFeed(courses, marketplaceProducts, 25),
    [courses, marketplaceProducts]
  );

  /* Produits digitaux publiés — jamais de formations ni de services ici. */
  const shopProducts = useMemo(
    () =>
      (marketplaceProducts || [])
        .filter(
          (product: any) =>
            product?.isPublished !== false &&
            !NON_DIGITAL_PRODUCT_TYPES.includes(String(product?.type || ""))
        )
        .slice(0, 10),
    [marketplaceProducts]
  );

  /* Centres de formation réels, sinon visuels de secours. */
  const centers = useMemo(() => {
    if ((trainingCenters || []).length > 0) {
      return trainingCenters.slice(0, 8).map((center) => {
        const learners = (courses || [])
          .filter((c) => c.centerId === center.id)
          .reduce((sum, c) => sum + (c.studentsCount || 0), 0);
        return {
          id: center.id,
          centerName: center.centerName,
          banner: center.banner || center.logo || "",
          learnersLabel:
            learners > 0 ? `+${learners.toLocaleString("fr-FR")} apprenants` : "Centre certifié",
          isReal: true,
        };
      });
    }
    return [];
  }, [trainingCenters, courses]);

  /* Ressources numériques : uniquement les types réellement en vente.
     Aucun prix par défaut inventé : les tuiles sans produit sont masquées. */
  const resourceTiles = useMemo(() => {
    const products = (marketplaceProducts || []).filter((p: any) => p?.isPublished !== false);
    return RESOURCE_TILES.map((tile) => {
      const matching = products.filter((p: any) => String(p?.type || "") === tile.productType);
      const prices = matching
        .map((p: any) => Number(p.price) || 0)
        .filter((price) => price > 0);
      return {
        key: tile.key,
        label: tile.label,
        icon: tile.icon,
        color: tile.color,
        productType: tile.productType,
        minPriceUsd: prices.length > 0 ? Math.min(...prices) : 0,
        count: matching.length,
      };
    }).filter((tile) => tile.count > 0);
  }, [marketplaceProducts]);

  /* Catégories de PRODUITS : construites à partir des domaines réellement
     choisis par les vendeurs (`typeLabel`), et non du seul enum technique.
     Les univers restent séparés : jamais de formation ni de service ici. */
  const productCategories: ProductCategoryOption[] = useMemo(
    () => buildProductCategories(marketplaceProducts || []),
    [marketplaceProducts]
  );

  /* Freelances réellement vérifiés / autorisés à vendre. */
  const freelanceProfiles = useMemo(
    () =>
      (freelances || [])
        .filter((profile: any) => profile?.kycVerified || profile?.canSellServices)
        .slice(0, 8),
    [freelances]
  );

  const isLoading = !platformLoaded;

  return (
    <div className="home-page min-h-screen bg-[#F4F6FA] text-slate-900 dark:bg-[#021231] dark:text-white font-sans antialiased">
      {/* L'en-tête (recherche, notifications, panier, menu), la navigation
          basse et les fenêtres modales sont fournis par <AppShell> :
          strictement identiques sur toutes les pages. */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-8">
        {/* Isolation : si une section échoue, le reste de l'accueil et la
            navigation demeurent pleinement utilisables. */}
        <ErrorBoundary variant="section" label="accueil">

        {/* Bannière : image pleine, aucun texte superposé */}
        <HeroBanner />

        {/* Accès rapide aux quatre univers */}
        <QuickAccessRow />

        {/* Catégories de FORMATION : ne jamais confondre avec la boutique */}
        <section>
          <SectionHeader
            title="Explorer les formations par catégorie"
            actionLabel="Toutes les catégories"
            onAction={() => router.push("/academy/categories")}
          />
          <CategoryRow
            onSelect={(slug) => router.push(buildAcademyCategoryUrl(slug))}
            onSeeMore={() => router.push("/academy/categories")}
          />
        </section>

        <PromoBannerSlot offset={1} />

        {/* Formations populaires : une seule rangée, flèches sur grand écran */}
        <section>
          <SectionHeader
            title="Formations populaires"
            actionLabel="Voir toutes les formations"
            onAction={() => router.push("/academy")}
          />
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#D69E25]" />
            </div>
          ) : popularCourses.length === 0 ? (
            <p className="text-xs text-slate-500 font-semibold py-6 text-center">
              Aucune formation publiée pour le moment.
            </p>
          ) : (
            <CarouselRow ariaLabel="les formations populaires" className="pb-2">
              {popularCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onOpen={() =>
                    router.push(`/course/${encodeURIComponent(String((course as { slug?: string }).slug || course.id))}`)
                  }
                  onPrefetch={() =>
                    router.prefetch(`/course/${encodeURIComponent(String((course as { slug?: string }).slug || course.id))}`)
                  }
                  money={money}
                />
              ))}
            </CarouselRow>
          )}
        </section>

        {/* Espace gratuit : formations et produits sans paiement */}
        {!isLoading && (freeCourses.length > 0 || freeProducts.length > 0) && (
          <section className="ibx-card p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="ibx-h2 flex items-center gap-2">
                  <Gift className="h-4 w-4 shrink-0" style={{ color: "var(--ibx-success)" }} aria-hidden="true" />
                  Espace gratuit
                </h2>
                <p className="ibx-small mt-0.5">
                  Formations et ressources accessibles sans aucun paiement.
                </p>
              </div>
              <Link
                href="/gratuit"
                prefetch
                className="ibx-btn ibx-btn-ghost shrink-0 !px-2 !py-1 !text-[10px]"
              >
                Tout l&apos;espace gratuit
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>

            <div className="space-y-4">
              {freeCourses.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="ibx-label">Formations gratuites</p>
                    <Link
                      href="/gratuit/formations"
                      prefetch
                      className="ibx-btn ibx-btn-ghost !px-1.5 !py-0.5 !text-[9.5px]"
                    >
                      Voir tout
                    </Link>
                  </div>
                  <CarouselRow ariaLabel="les formations gratuites" className="pb-1">
                    {freeCourses.slice(0, 10).map((item) => (
                      <div key={item.key} className="w-[196px] shrink-0 snap-start">
                        <ContentCard item={item} money={money} />
                      </div>
                    ))}
                  </CarouselRow>
                </div>
              )}

              {freeProducts.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="ibx-label">Produits numériques gratuits</p>
                    <Link
                      href="/gratuit/produits"
                      prefetch
                      className="ibx-btn ibx-btn-ghost !px-1.5 !py-0.5 !text-[9.5px]"
                    >
                      Voir tout
                    </Link>
                  </div>
                  <CarouselRow ariaLabel="les produits numériques gratuits" className="pb-1">
                    {freeProducts.slice(0, 10).map((item) => (
                      <div key={item.key} className="w-[196px] shrink-0 snap-start">
                        <ContentCard item={item} money={money} />
                      </div>
                    ))}
                  </CarouselRow>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Produits numériques : séparés des formations */}
        {!isLoading && shopProducts.length > 0 && (
          <section>
            <SectionHeader
              title="Produits numériques"
              actionLabel="Tout voir"
              onAction={() => router.push("/marketplace")}
            />
            <CarouselRow ariaLabel="les produits digitaux" className="pb-2">
              {shopProducts.map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpen={() =>
                    router.push(`/product/${encodeURIComponent(String((product as { slug?: string }).slug || product.id))}`)
                  }
                  onPrefetch={() =>
                    router.prefetch(`/product/${encodeURIComponent(String((product as { slug?: string }).slug || product.id))}`)
                  }
                  money={money}
                />
              ))}
            </CarouselRow>
          </section>
        )}

        {!isLoading && <ProductShowcaseBanner products={shopProducts} money={money} />}

        {/* Boutiques des créateurs : rail horizontal de vendeurs actifs */}
        {!isLoading && activeStores.length > 0 && (
          <section>
            <SectionHeader
              title="Boutiques des créateurs"
              actionLabel="Toutes les boutiques"
              onAction={() => router.push("/marketplace")}
            />
            <p className="ibx-small -mt-2 mb-3">
              Les vendeurs et créateurs qui publient leurs ressources sur la plateforme.
            </p>
            <CarouselRow ariaLabel="les boutiques des créateurs" className="pb-2">
              {activeStores.slice(0, 12).map((store: any) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </CarouselRow>
          </section>
        )}

        {/* Autres formations & produits : flux mixte de découverte */}
        {!isLoading && mixedFeed.length > 0 && (
          <section>
            <SectionHeader
              title="Autres formations & produits"
              actionLabel="Tout découvrir"
              onAction={() => router.push("/decouvrir")}
            />
            <p className="ibx-small -mt-2 mb-3">
              {mixedFeed.length} contenus à explorer, toutes catégories confondues.
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {mixedFeed.map((item) => (
                <ContentCard key={item.key} item={item} money={money} />
              ))}
            </div>
          </section>
        )}

        {/* Catégories de PRODUITS : univers distinct de l'académie */}
        {!isLoading && productCategories.length > 0 && (
          <section>
            <SectionHeader
              title="Explorer les produits numériques par catégorie"
              actionLabel="Toutes les catégories"
              onAction={() => router.push("/marketplace/categories")}
            />
            <ProductCategoryRail
              categories={productCategories.slice(0, 9)}
              onSelect={(slug) =>
                router.push(`/marketplace?categorie=${encodeURIComponent(slug)}`)
              }
            />
          </section>
        )}

        <PromoBannerSlot offset={2} />

        {/* Centres de formation : répertoire dédié */}
        {centers.length > 0 && (
          <section>
          <SectionHeader
            title="Nos centres de formation"
            actionLabel="Voir tous les centres"
            onAction={() => router.push("/centres")}
          />
          <CarouselRow ariaLabel="les centres de formation" className="pb-2">
            {centers.map((center) => (
              <CenterCard
                key={center.id}
                center={center}
                onOpen={() =>
                  router.push(
                    center.isReal ? `/centres/${encodeURIComponent(center.id)}` : "/centres"
                  )
                }
              />
            ))}
          </CarouselRow>
        </section>
        )}

        {/* Freelances vérifiés : univers distinct, données réelles uniquement */}
        {!isLoading && freelanceProfiles.length > 0 && (
          <section>
            <SectionHeader
              title="Freelances et experts vérifiés"
              actionLabel="Découvrir tous les freelances"
              onAction={() => router.push("/freelances")}
            />
            <CarouselRow ariaLabel="les freelances vérifiés" className="pb-2">
              {freelanceProfiles.map((profile: any) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => router.push(`/freelances/${encodeURIComponent(profile.id)}`)}
                  className="ibx-card-flat ibx-interactive w-[190px] shrink-0 snap-start p-3 text-left"
                >
                  <div className="flex items-start gap-2">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold"
                        style={{ backgroundColor: "var(--ibx-surface-muted)", color: "var(--ibx-fg-muted)" }}
                      >
                        {(profile.name || "F").slice(0, 1)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <span className="flex items-center gap-1">
                        <span className="ibx-h3 truncate !text-[11.5px]">{profile.name}</span>
                        {profile.kycVerified && (
                          <BadgeCheck className="h-3 w-3 shrink-0" style={{ color: "var(--ibx-success)" }} />
                        )}
                      </span>
                      <span className="ibx-tiny mt-0.5 block truncate !text-[9px]">
                        {profile.title || profile.category}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2.5 text-[9px]" style={{ color: "var(--ibx-fg-muted)" }}>
                    {profile.rating > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5" /> {profile.rating}
                      </span>
                    )}
                    {profile.location && (
                      <span className="flex items-center gap-0.5 truncate">
                        <MapPin className="h-2.5 w-2.5 shrink-0" /> {profile.location}
                      </span>
                    )}
                  </div>
                  {profile.skills?.length > 0 && (
                    <p className="mt-1.5 line-clamp-1 text-[9px]" style={{ color: "var(--ibx-fg-subtle)" }}>
                      {profile.skills.slice(0, 3).join(" · ")}
                    </p>
                  )}
                </button>
              ))}
            </CarouselRow>
          </section>
        )}

        {/* Ressources numériques : liens vers la boutique filtrée par type */}
        {resourceTiles.length > 0 && (
          <section className="pb-4">
            <SectionHeader
              title="Ressources numériques"
              actionLabel="Explorer toutes les ressources"
              onAction={() => router.push("/marketplace/ressources")}
            />
            <ResourcesGrid
              tiles={resourceTiles}
              onOpen={(productType) => router.push(`/marketplace/ressources?type=${encodeURIComponent(productType)}`)}
              money={money}
            />
          </section>
        )}
        </ErrorBoundary>
      </div>
    </div>
  );
}

