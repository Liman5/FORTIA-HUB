"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap,
  User,
  Star,
  Clock,
  Heart,
  ChevronRight,
  ChevronLeft,
  Users,
  MoreHorizontal,
  LayoutTemplate,
  PlayCircle,
  Briefcase,
  Loader2,
  BookOpen,
  Download,
} from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { useCatalog, useMarketplace, useUi } from "@/lib/store/domains/contexts";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { COURSE_CATEGORY_FAMILIES, sortByPopularity } from "@/lib/data/courseCategories";
import { OptimizedImage } from "@/components/OptimizedImage";

/* =====================================================================
   FORTIA HUB — Interface d'accueil (routes "/" et "/home")
   Habillage clair conforme à la maquette : en-tête navy + or, bannière
   en image pleine (sans texte superposé), catégories sur une seule ligne
   défilable, cartes blanches. Toutes les données viennent du store.
   ===================================================================== */

/** Taux de conversion USD → FCFA utilisé dans toute la plateforme. */
const FCFA_RATE = 600;

/** Formate un montant en dollars vers un montant FCFA lisible. */
export function formatUsdToFcfa(usd: number): string {
  const value = Math.round((Number(usd) || 0) * FCFA_RATE);
  return value.toLocaleString("fr-FR");
}

/* Les catégories proviennent de la source unique partagée avec l'Académie
   (lib/data/courseCategories.ts) : un seul système pour toute la plateforme. */

/** Construit l'URL de l'Académie filtrée sur une catégorie. */
export function buildAcademyCategoryUrl(slug: string): string {
  return `/academy?categorie=${encodeURIComponent(slug)}`;
}

/** Construit l'URL de la boutique filtrée sur un type de produit. */
export function buildShopTypeUrl(productType: string): string {
  return `/marketplace?type=${encodeURIComponent(productType)}`;
}


/** Centres de formation affichés tant qu'aucun centre n'est enregistré. */
const FALLBACK_CENTERS = [
  {
    id: "default-fortia-academy",
    centerName: "Fortia Academy",
    banner: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80",
    learnersLabel: "+2 500 apprenants",
  },
  {
    id: "default-digital-skills",
    centerName: "Digital Skills Center",
    banner: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
    learnersLabel: "+1 800 apprenants",
  },
  {
    id: "default-african-learning",
    centerName: "African Learning Hub",
    banner: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
    learnersLabel: "+1 200 apprenants",
  },
];

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
  const { siteBanners } = useAppStore();
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
  useEffect(() => {
    if (slides.length <= 1) return;
    const slide = slides[index] || slides[0];
    const timer = setTimeout(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, slide.interval);
    return () => clearTimeout(timer);
  }, [index, slides]);

  const slide = slides[index] || slides[0];

  // Aucune bannière publiée : squelette neutre aux mêmes dimensions
  // (aucune image factice, aucun saut de mise en page, aucun flash).
  if (!slide) {
    return (
      <section className="relative" aria-hidden="true">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1B36] via-[#011D46] to-[#021231] border border-[#D69E25]/20 h-40 sm:h-64 lg:h-80 flex items-center justify-center">
          <span className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <span className="w-4 h-4 rounded-full border-2 border-[#D69E25]/60 border-t-transparent animate-spin" />
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
        className={`relative overflow-hidden rounded-3xl bg-[#0B1B36] shadow-lg ${
          slide?.link ? "cursor-pointer" : ""
        }`}
        style={{ perspective: 1200 }}
        onClick={openSlide}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={slide.id}
            src={slide.image}
            alt={slide.alt}
            {...variantsFor(slide.animation)}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="w-full h-40 sm:h-64 lg:h-80 object-cover block"
            draggable={false}
          />
        </AnimatePresence>
      </div>

      {/* Puces de navigation placées SOUS l'image, jamais dessus */}
      <div className="flex items-center justify-center gap-1.5 pt-3">
        {slides.map((item, i) => (
          <button
            key={item.id}
            onClick={() => setIndex(i)}
            aria-label={`Diapositive ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-5 bg-[#D69E25]" : "w-1.5 bg-slate-300 hover:bg-slate-400"
            }`}
          />
        ))}
      </div>
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
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">{title}</h2>
      {actionLabel && (
        <button
          onClick={onAction}
          className="flex items-center gap-0.5 text-[11px] font-black text-[#D69E25] hover:text-[#AB6F10] transition shrink-0"
        >
          {actionLabel}
          <ChevronRight className="w-3.5 h-3.5" />
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
  isFavorite,
  onToggleFavorite,
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
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className="snap-start shrink-0 w-[228px] sm:w-[248px] text-left rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:border-[#D69E25] hover:shadow-md transition cursor-pointer"
    >
      <div className="relative h-32 bg-slate-100">
        <Thumb src={course.image} alt={course.title} className="w-full h-full" />
        <span className="absolute top-2 left-2 bg-[#D69E25] text-white text-[9px] font-black px-2 py-0.5 rounded-full max-w-[70%] truncate">
          {course.badge || course.categoryLabel || "Certifiant"}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur border border-slate-200 flex items-center justify-center hover:bg-white transition"
          title="Ajouter aux favoris"
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? "text-red-500 fill-red-500" : "text-slate-500"}`} />
        </button>
      </div>

      <div className="p-3 space-y-2">
        <h3 className="text-xs font-black text-slate-900 leading-snug line-clamp-2 min-h-[32px]">
          {course.title}
        </h3>

        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center bg-slate-100">
            {course.instructor?.avatar ? (
              <Thumb
                src={course.instructor.avatar}
                alt={course.instructor?.name || "Formateur"}
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <User className="w-3 h-3 text-slate-400" />
            )}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold truncate">
            {course.instructor?.name || "FORTIA HUB"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-0.5 text-[#B8860B] font-black">
            <Star className="w-3 h-3 fill-[#D69E25] text-[#D69E25]" />
            {Number(course.rating || 0).toFixed(1)}
          </span>
          <span className="text-slate-400">({course.reviewsCount || 0})</span>
          <span className="flex items-center gap-0.5 text-slate-500 ml-auto font-semibold">
            <Clock className="w-3 h-3" />
            {course.durationHours || 0}h
          </span>
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
          <span className="text-[13px] font-black text-[#B8860B]">
            {formatUsdToFcfa(course.price)} FCFA
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase">{course.level}</span>
        </div>
      </div>
    </div>
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
      className="snap-start shrink-0 w-[210px] text-left rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:border-[#D69E25] hover:shadow-md transition cursor-pointer"
    >
      <Thumb src={center.banner} alt={center.centerName} className="w-full h-24" />
      <div className="p-3 space-y-1">
        <h3 className="text-xs font-black text-slate-900 line-clamp-1">{center.centerName}</h3>
        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
          <Users className="w-3 h-3 text-[#D69E25]" />
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
}) {
  const price = Number(product.price) || 0;
  const reviewsCount = Number(product.reviewsCount) || 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="snap-start shrink-0 w-[190px] sm:w-[210px] text-left rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:border-[#D69E25] hover:shadow-md transition cursor-pointer"
    >
      <div className="relative h-28 bg-slate-100">
        <Thumb src={product.image} alt={product.title} className="w-full h-full" />
        {product.typeLabel && (
          <span className="absolute top-2 left-2 bg-white/90 backdrop-blur text-[#0B1B36] border border-slate-200 text-[9px] font-black px-2 py-0.5 rounded-full max-w-[80%] truncate">
            {product.typeLabel}
          </span>
        )}
        <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-[#D69E25] text-white flex items-center justify-center shadow">
          <Download className="w-3.5 h-3.5" />
        </span>
      </div>
      <div className="p-3 space-y-2">
        <h3 className="text-xs font-black text-slate-900 leading-snug line-clamp-2 min-h-[32px]">
          {product.title}
        </h3>
        <div className="flex items-center justify-between gap-2 text-[10px]">
          <span className="truncate text-slate-500 font-semibold">
            {product.storeName || "FORTIA HUB"}
          </span>
          {reviewsCount > 0 && (
            <span className="flex items-center gap-0.5 text-[#B8860B] font-black shrink-0">
              <Star className="w-3 h-3 fill-[#D69E25] text-[#D69E25]" />
              {Number(product.rating || 0).toFixed(1)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
          <span className="text-[13px] font-black text-[#B8860B]">
            {formatUsdToFcfa(price)} FCFA
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase">Téléchargeable</span>
        </div>
      </div>
    </button>
  );
}

/* =========================== RESSOURCES =========================== */
function ResourcesGrid({
  tiles,
  onOpen,
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
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <button
            key={tile.key}
            type="button"
            onClick={() => onOpen(tile.productType)}
            className="rounded-2xl bg-white border border-slate-200 shadow-sm p-3 text-left hover:border-[#D69E25] hover:shadow-md transition flex flex-col gap-2 cursor-pointer"
          >
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${tile.color}22` }}
            >
              <Icon className="w-5 h-5" style={{ color: tile.color }} />
            </span>
            <span className="block">
              <span className="block text-[11px] font-black text-slate-900 leading-tight">
                {tile.label}
              </span>
              <span className="block text-[10px] font-bold text-[#B8860B] mt-0.5">
                {tile.minPriceUsd > 0
                  ? `Dès ${formatUsdToFcfa(tile.minPriceUsd)} FCFA`
                  : "Gratuit"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ==================================================================
   PAGE D'ACCUEIL FORTIA HUB (routes "/" et "/home")
   ================================================================== */
export function HomePage() {
  const router = useRouter();
  const { setSelectedCourseForPlayer } = useUi();
  const { marketplaceProducts } = useMarketplace();
  const { courses, trainingCenters } = useCatalog();
  const { platformLoaded } = useAppStore();

  const [favorites, setFavorites] = useState<string[]>([]);

  /* Formations populaires : tri sur données réelles (note puis apprenants). */
  const popularCourses = useMemo(() => sortByPopularity(courses || []).slice(0, 15), [courses]);

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
          banner: center.banner || center.logo || FALLBACK_CENTERS[0].banner,
          learnersLabel:
            learners > 0 ? `+${learners.toLocaleString("fr-FR")} apprenants` : "Centre certifié",
          isReal: true,
        };
      });
    }
    return FALLBACK_CENTERS.map((center) => ({ ...center, isReal: false }));
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

  const toggleFavorite = (id: string) =>
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));

  const isLoading = !platformLoaded;

  return (
    <div className="min-h-screen bg-[#F4F6FA] text-slate-900 font-sans antialiased">
      {/* L'en-tête (recherche, notifications, panier, menu), la navigation
          basse et les fenêtres modales sont fournis par <AppShell> :
          strictement identiques sur toutes les pages. */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-8">
        {/* Isolation : si une section échoue, le reste de l'accueil et la
            navigation demeurent pleinement utilisables. */}
        <ErrorBoundary variant="section" label="accueil">

        {/* Bannière : image pleine, aucun texte superposé */}
        <HeroBanner />

        {/* Catégories : une seule ligne → Académie filtrée sur la catégorie */}
        <section>
          <SectionHeader
            title="Explorer par catégorie"
            actionLabel="Tout voir"
            onAction={() => router.push("/academy")}
          />
          <CategoryRow
            onSelect={(slug) => router.push(buildAcademyCategoryUrl(slug))}
            onSeeMore={() => router.push("/academy")}
          />
        </section>

        {/* Formations populaires : une seule rangée, flèches sur grand écran */}
        <section>
          <SectionHeader
            title="Formations populaires"
            actionLabel="Voir tout"
            onAction={() => router.push("/academy?vue=populaires")}
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
                  onOpen={() => setSelectedCourseForPlayer(course)}
                  isFavorite={favorites.includes(course.id)}
                  onToggleFavorite={() => toggleFavorite(course.id)}
                />
              ))}
            </CarouselRow>
          )}
        </section>

        {/* Boutique de produits digitaux : séparée des formations */}
        {!isLoading && shopProducts.length > 0 && (
          <section>
            <SectionHeader
              title="Boutique de produits digitaux"
              actionLabel="Voir la boutique"
              onAction={() => router.push("/marketplace")}
            />
            <CarouselRow ariaLabel="les produits digitaux" className="pb-2">
              {shopProducts.map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpen={() => router.push(buildShopTypeUrl(String(product.type || "")))}
                />
              ))}
            </CarouselRow>
          </section>
        )}

        {/* Centres de formation : lien vers le catalogue filtré sur le centre */}
        <section>
          <SectionHeader
            title="Nos centres de formation"
            actionLabel="Voir tout"
            onAction={() => router.push("/academy")}
          />
          <CarouselRow ariaLabel="les centres de formation" className="pb-2">
            {centers.map((center) => (
              <CenterCard
                key={center.id}
                center={center}
                onOpen={() =>
                  router.push(
                    center.isReal ? `/academy?centre=${encodeURIComponent(center.id)}` : "/academy"
                  )
                }
              />
            ))}
          </CarouselRow>
        </section>

        {/* Ressources numériques : liens vers la boutique filtrée par type */}
        {resourceTiles.length > 0 && (
          <section className="pb-4">
            <SectionHeader
              title="Ressources numériques"
              actionLabel="Boutique"
              onAction={() => router.push("/marketplace")}
            />
            <ResourcesGrid
              tiles={resourceTiles}
              onOpen={(productType) => router.push(buildShopTypeUrl(productType))}
            />
          </section>
        )}
        </ErrorBoundary>
      </div>
    </div>
  );
}

