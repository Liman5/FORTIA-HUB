"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Course, CartItem } from "@/lib/types";
import { OptimizedImage } from "./OptimizedImage";
import {
  Clock,
  Users,
  ShoppingCart,
  Play,
  Star,
  RotateCcw,
  X,
  ChevronDown,
  GraduationCap,
  SlidersHorizontal,
} from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { formatPricePair, resolveMoneyConfig } from "@/lib/data/currency";
import {
  COURSE_VIEWS,
  applyCourseView,
  buildCategoryOptions,
  filterCoursesByCategoryParam,
  getCategoryLabel,
  hasFeaturedCourses,
} from "@/lib/data/courseCategories";

export interface CourseCatalogFilters {
  categorie?: string | null;
  vue?: string | null;
  centre?: string | null;
}

interface CourseCatalogProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onAddToCart: (item: CartItem) => void;
  onRateCourse?: (courseId: string, rating: number) => void;
  searchQuery: string;
  /** Remonte la saisie au parent (mécanisme de recherche global existant). */
  onSearchChange?: (query: string) => void;
  /** Catégories réelles de la base (table `course_categories`). */
  dbCategories?: { id?: string; code?: string; label?: string }[];
  /** Filtres issus de l'URL : /academy?categorie=…&vue=…&centre=… */
  categoryParam?: string | null;
  viewParam?: string | null;
  centerParam?: string | null;
  centerName?: string | null;
  /** Nombre total de formations côté serveur (compteur de résultats). */
  catalogTotal?: number;
  /** Reste-t-il des formations à charger côté serveur ? */
  hasMoreCourses?: boolean;
  /** Charge la page suivante du catalogue (pagination serveur). */
  onLoadMoreCourses?: () => void;
  /** Synchronise l'URL lorsque l'utilisateur change un filtre. */
  onFiltersChange?: (next: CourseCatalogFilters) => void;
}

/** Nombre de formations affichées avant le bouton « Afficher plus ». */
const PAGE_SIZE = 12;

const LEVELS = ["Débutant", "Intermédiaire", "Avancé", "Expert", "Tous niveaux"];

const PRICE_RANGES: { id: string; label: string; test: (price: number) => boolean }[] = [
  { id: "all", label: "Tous les prix", test: () => true },
  { id: "free", label: "Gratuit", test: (price) => price === 0 },
  { id: "low", label: "Moins de 50 $", test: (price) => price > 0 && price < 50 },
  { id: "mid", label: "50 $ – 100 $", test: (price) => price >= 50 && price <= 100 },
  { id: "high", label: "Plus de 100 $", test: (price) => price > 100 },
];

/**
 * Catalogue des formations : recherche, filtres (catégorie, niveau, prix),
 * vues/tris, compteur de résultats, chargement progressif et état vide.
 * Toutes les données proviennent du store (aucune statistique inventée).
 */
export const CourseCatalog: React.FC<CourseCatalogProps> = ({
  courses,
  onSelectCourse,
  onAddToCart,
  onRateCourse,
  searchQuery,
  onSearchChange,
  dbCategories = [],
  categoryParam = null,
  viewParam = null,
  centerParam = null,
  centerName = null,
  onFiltersChange,
  catalogTotal,
  hasMoreCourses = false,
  onLoadMoreCourses,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam || "all");
  const [selectedView, setSelectedView] = useState<string>(viewParam || "all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedPrice, setSelectedPrice] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  /** Un filtre est-il actif ? (sert à choisir entre total serveur et résultats locaux) */
  const isFiltering =
    selectedCategory !== "all" ||
    selectedLevel !== "all" ||
    selectedPrice !== "all" ||
    (searchQuery || "").trim().length > 0 ||
    !!categoryParam ||
    !!centerParam;

  /* Synchronisation avec l'URL : liens directs + boutons Retour/Avancer */
  useEffect(() => {
    setSelectedCategory(categoryParam || "all");
  }, [categoryParam]);

  useEffect(() => {
    setSelectedView(viewParam || "all");
  }, [viewParam]);

  /* Réinitialise l'affichage progressif à chaque changement de filtre */
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategory, selectedView, selectedLevel, selectedPrice, searchQuery, centerParam]);

  const categoryOptions = useMemo(
    () => buildCategoryOptions(courses || [], dbCategories, selectedCategory),
    [courses, dbCategories, selectedCategory]
  );

  const views = useMemo(
    () =>
      COURSE_VIEWS.filter(
        (view) => view.id !== "mises-en-avant" || hasFeaturedCourses(courses || [])
      ),
    [courses]
  );

  const filteredCourses = useMemo(() => {
    const q = (searchQuery || "").toLowerCase().trim();

    let list = filterCoursesByCategoryParam(
      courses || [],
      selectedCategory === "all" ? null : selectedCategory
    );

    // Filtre par centre de formation (lien « Nos centres » de l'accueil)
    if (centerParam) {
      list = list.filter((course: any) => String(course?.centerId || "") === centerParam);
    }

    list = list.filter((course: any) => {
      const levelOk = selectedLevel === "all" || course?.level === selectedLevel;
      const range = PRICE_RANGES.find((r) => r.id === selectedPrice) || PRICE_RANGES[0];
      const priceOk = range.test(Number(course?.price) || 0);
      const searchOk =
        !q ||
        String(course?.title || "").toLowerCase().includes(q) ||
        String(course?.description || "").toLowerCase().includes(q) ||
        String(course?.categoryLabel || "").toLowerCase().includes(q);
      return levelOk && priceOk && searchOk;
    });

    return applyCourseView(list, selectedView);
  }, [courses, selectedCategory, selectedView, selectedLevel, selectedPrice, searchQuery, centerParam]);

  const visibleCourses = filteredCourses.slice(0, visibleCount);

  const title = centerParam
    ? `Formations – ${centerName || "Centre de formation"}`
    : selectedCategory === "all"
    ? "Toutes les formations"
    : `Formations en ${getCategoryLabel(selectedCategory, dbCategories).toLowerCase()}`;

  const hasActiveFilters =
    selectedCategory !== "all" ||
    selectedView !== "all" ||
    selectedLevel !== "all" ||
    selectedPrice !== "all" ||
    !!centerParam ||
    !!searchQuery;

  const handleSelectCategory = (id: string) => {
    setSelectedCategory(id);
    onFiltersChange?.({ categorie: id === "all" ? null : id });
  };

  const handleSelectView = (id: string) => {
    setSelectedView(id);
    onFiltersChange?.({ vue: id === "all" ? null : id });
  };

  const handleReset = () => {
    setSelectedCategory("all");
    setSelectedView("all");
    setSelectedLevel("all");
    setSelectedPrice("all");
    onSearchChange?.("");
    onFiltersChange?.({ categorie: null, vue: null, centre: null });
  };

  return (
    <section className="relative min-h-[600px] overflow-x-clip py-5" id="courses-section">
      <div className="ibx-container relative z-10 space-y-4">

        {/* ===================== EN-TÊTE DU CATALOGUE ===================== */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <h2 className="ibx-h2 flex items-center gap-2">
                <GraduationCap
                  className="h-4 w-4 shrink-0"
                  style={{ color: "var(--ibx-accent-strong)" }}
                  aria-hidden="true"
                />
                <span className="truncate">{title}</span>
              </h2>
              <p className="ibx-small mt-0.5">
                Formations certifiantes — filtrez par catégorie, niveau et prix.
              </p>
            </div>
            <span className="ibx-badge shrink-0">
              {/* Nombre TOTAL côté serveur lorsque aucun filtre local n'est actif,
                  sinon le nombre de résultats réellement filtrés. */}
              {isFiltering
                ? `${filteredCourses.length} résultat${filteredCourses.length > 1 ? "s" : ""}`
                : `${catalogTotal ?? filteredCourses.length} formation${
                    (catalogTotal ?? filteredCourses.length) > 1 ? "s" : ""
                  }`}
            </span>
          </div>

          {/* Recherche globale : puce retirable + filtres avancés */}
          <div className="flex flex-wrap items-center gap-2">
            {searchQuery && (
              <button
                type="button"
                className="ibx-chip"
                data-active="true"
                onClick={() => onSearchChange?.("")}
                aria-label={`Retirer la recherche ${searchQuery}`}
              >
                « {searchQuery} »
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowMoreFilters((v) => !v)}
              className={`ibx-btn ${
                showMoreFilters || selectedLevel !== "all" || selectedPrice !== "all"
                  ? "ibx-btn-primary"
                  : "ibx-btn-outline"
              }`}
              aria-expanded={showMoreFilters}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Filtres
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showMoreFilters ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {hasActiveFilters && (
              <button type="button" onClick={handleReset} className="ibx-btn ibx-btn-ghost">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Réinitialiser
              </button>
            )}
          </div>

          {/* Filtres secondaires : niveau + prix */}
          {showMoreFilters && (
            <div className="ibx-card-muted flex flex-wrap gap-2 p-2.5">
              <label className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: "var(--ibx-fg-muted)" }}>
                Niveau
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="ibx-select"
                >
                  <option value="all">Tous les niveaux</option>
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: "var(--ibx-fg-muted)" }}>
                Prix
                <select
                  value={selectedPrice}
                  onChange={(e) => setSelectedPrice(e.target.value)}
                  className="ibx-select"
                >
                  {PRICE_RANGES.map((range) => (
                    <option key={range.id} value={range.id}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        {/* ========== CATÉGORIES (une seule ligne, défilement fluide) ========== */}
        <div className="ibx-scroll-x snap-x" role="group" aria-label="Catégories de formations">
          {categoryOptions.map((cat) => {
            const isActive = selectedCategory === cat.id;
            const CatIcon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat.id)}
                aria-pressed={isActive}
                className="ibx-chip snap-start"
                data-active={isActive ? "true" : "false"}
              >
                {CatIcon && <CatIcon className="h-3 w-3" aria-hidden="true" />}
                <span>{cat.label}</span>
                {cat.count > 0 && (
                  <span className="text-[9px] font-bold opacity-70">{cat.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ===================== VUES / TRIS ===================== */}
        <div className="ibx-scroll-x" role="group" aria-label="Trier les formations">
          <span className="ibx-label shrink-0">Trier</span>
          {views.map((view) => {
            const isActive = selectedView === view.id;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => handleSelectView(view.id)}
                aria-pressed={isActive}
                className="ibx-chip"
                data-active={isActive ? "true" : "false"}
              >
                {view.label}
              </button>
            );
          })}
        </div>

        {/* ===================== RÉSULTATS ===================== */}
        {filteredCourses.length === 0 ? (
          <div className="ibx-empty">
            <p className="ibx-h3">
              Aucune formation disponible dans cette catégorie pour le moment.
            </p>
            <p className="ibx-small mx-auto mt-1 max-w-md">
              Choisissez une autre catégorie ou parcourez l&apos;ensemble du catalogue.
            </p>
            <button type="button" onClick={handleReset} className="ibx-btn ibx-btn-primary mt-3">
              Explorer toutes les formations
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:gap-4 xl:grid-cols-4">
              {visibleCourses.map((course, index) => (
                <CourseCardItem
                  key={course.id}
                  course={course}
                  index={index}
                  onSelect={onSelectCourse}
                  onAddToCart={onAddToCart}
                  onRate={onRateCourse}
                />
              ))}
            </div>

            {/* Chargement progressif : liste locale d'abord, puis pages serveur */}
            {(visibleCount < filteredCourses.length || hasMoreCourses) && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (visibleCount < filteredCourses.length) {
                      setVisibleCount((count) => count + PAGE_SIZE);
                      return;
                    }
                    // Liste locale épuisée : on va chercher la page suivante
                    // côté serveur (le catalogue n'est jamais chargé d'un coup).
                    onLoadMoreCourses?.();
                  }}
                  className="ibx-btn ibx-btn-outline"
                >
                  {visibleCount < filteredCourses.length ? (
                    <>
                      Afficher plus ({filteredCourses.length - visibleCount} formation
                      {filteredCourses.length - visibleCount > 1 ? "s" : ""} restante
                      {filteredCourses.length - visibleCount > 1 ? "s" : ""})
                    </>
                  ) : (
                    <>Charger les formations suivantes</>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

/* =====================================================================
   CARTE DE FORMATION
   Réutilise uniquement les informations réellement disponibles (image,
   titre, formateur, niveau, durée, apprenants, prix). La note chiffrée
   n'est affichée que si des avis existent réellement ; les étoiles
   restent cliquables pour permettre la notation existante.
   ===================================================================== */
function CourseCardItem({
  course,
  index,
  onSelect,
  onAddToCart,
  onRate,
}: {
  course: any;
  index: number;
  onSelect: (course: Course) => void;
  onAddToCart: (item: CartItem) => void;
  onRate?: (courseId: string, rating: number) => void;
}) {
  const { siteContent } = useAppStore();
  const money = resolveMoneyConfig(siteContent);
  const price = Number(course?.price) || 0;
  const pricePair = formatPricePair(price, money);
  const instructorName =
    course?.instructor?.name || course?.instructorName || "Formateur FORTIA HUB";
  const avatarSrc = course?.instructor?.avatar || course?.instructorAvatar || "";
  const initial = instructorName.trim().charAt(0).toUpperCase() || "F";
  const reviewsCount = Number(course?.reviewsCount) || 0;
  const rating = Number(course?.rating) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.35, delay: Math.min(index, 6) * 0.04, ease: "easeOut" }}
      className="ibx-card-flat ibx-interactive group relative flex flex-col overflow-hidden"
    >
      {/* Texture douce : léger dégradé doré, cohérent avec les autres cartes */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(158deg, color-mix(in srgb, var(--ibx-accent) 9%, transparent) 0%, transparent 46%)",
        }}
      />

      {/* Couverture */}
      <div className="ibx-media relative h-32 sm:h-36">
        {course?.image ? (
          <OptimizedImage
            src={course.image}
            alt={course.title}
            fallbackCategory={course.categoryLabel}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <GraduationCap
              className="h-6 w-6"
              style={{ color: "var(--ibx-fg-subtle)" }}
            />
          </div>
        )}

        {course?.categoryLabel && (
          <span
            className="absolute left-1.5 top-1.5 max-w-[70%] truncate rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide"
            style={{ backgroundColor: "var(--ibx-accent)", color: "#1c1405" }}
          >
            {course.categoryLabel}
          </span>
        )}

        {course?.badge && (
          <span
            className="absolute right-1.5 top-1.5 max-w-[45%] truncate rounded px-1.5 py-0.5 text-[8px] font-bold"
            style={{ backgroundColor: "var(--ibx-surface)", color: "var(--ibx-accent-strong)", border: "1px solid var(--ibx-border)" }}
          >
            {course.badge}
          </span>
        )}

        {course?.level && (
          <span
            className="absolute bottom-1.5 left-1.5 rounded px-1 py-px text-[8px] font-semibold"
            style={{
              backgroundColor: "color-mix(in srgb, var(--ibx-surface) 90%, transparent)",
              color: "var(--ibx-fg-muted)",
              border: "1px solid var(--ibx-border)",
            }}
          >
            {course.level}
          </span>
        )}

        <button
          type="button"
          onClick={() => onSelect(course)}
          className="absolute inset-0 flex items-center justify-center bg-[#021231]/40 opacity-0 transition duration-300 focus:opacity-100 group-hover:opacity-100"
          title="Voir la formation"
          aria-label={`Voir la formation ${course?.title || ""}`}
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--ibx-accent)", color: "#1c1405" }}
          >
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          </span>
        </button>
      </div>

      {/* Contenu */}
      <div className="flex flex-1 flex-col gap-2 p-2.5 sm:p-3">
        <div className="space-y-1">
          <h3
            onClick={() => onSelect(course)}
            className="ibx-h3 line-clamp-2 cursor-pointer !text-[12.5px] leading-[1.3] sm:!text-[13px] transition-colors group-hover:!text-[var(--ibx-accent-strong)]"
          >
            {course?.title}
          </h3>

          {course?.description && (
            <p className="ibx-tiny line-clamp-2 !text-[9.5px]">
              {course.description}
            </p>
          )}
        </div>

        <div
          className="mt-auto space-y-1.5 border-t pt-2"
          style={{ borderColor: "var(--ibx-border)" }}
        >
          {/* Formateur */}
          <div className="flex items-center gap-1.5">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={instructorName}
                className="h-5 w-5 rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                style={{ backgroundColor: "var(--ibx-surface-muted)", color: "var(--ibx-fg-muted)" }}
              >
                {initial}
              </span>
            )}
            <span className="ibx-tiny truncate !text-[9.5px] font-semibold">
              {instructorName}
            </span>
          </div>

          {/* Note (si avis réels) + statistiques disponibles */}
          <div className="flex items-center justify-between gap-1.5 text-[9px]">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = reviewsCount > 0 && star <= Math.round(rating);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => onRate?.(course.id, star)}
                    title={`Noter ${star} étoile${star > 1 ? "s" : ""}`}
                    aria-label={`Noter ${star} étoile${star > 1 ? "s" : ""}`}
                    className="transition hover:scale-110"
                  >
                    <Star
                      className="h-2.5 w-2.5"
                      style={
                        filled
                          ? { color: "var(--ibx-accent)", fill: "var(--ibx-accent)" }
                          : { color: "var(--ibx-fg-subtle)" }
                      }
                    />
                  </button>
                );
              })}
              {reviewsCount > 0 ? (
                <span className="ml-1 font-semibold" style={{ color: "var(--ibx-fg-muted)" }}>
                  {rating.toFixed(1)}{" "}
                  <span style={{ color: "var(--ibx-fg-subtle)" }}>({reviewsCount})</span>
                </span>
              ) : (
                <span className="ml-1 font-semibold" style={{ color: "var(--ibx-fg-subtle)" }}>
                  Nouveau
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2" style={{ color: "var(--ibx-fg-muted)" }}>
              <span className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" style={{ color: "var(--ibx-accent-strong)" }} aria-hidden="true" />
                {Number(course?.durationHours) || 0}h
              </span>
              <span className="flex items-center gap-0.5">
                <Users className="h-2.5 w-2.5" style={{ color: "var(--ibx-accent-strong)" }} aria-hidden="true" />
                {Number(course?.studentsCount) || 0}
              </span>
            </div>
          </div>

          {/* Prix + actions — FCFA principal, USD secondaire facultatif */}
          <div className="flex items-end justify-between gap-1.5 pt-0.5">
            <div className="min-w-0">
              <span className="ibx-price block !text-[12.5px] sm:!text-[13px]">{pricePair.primary}</span>
              {pricePair.secondary && (
                <span className="ibx-tiny mt-0.5 block !text-[9px]">{pricePair.secondary}</span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  onAddToCart({
                    id: course.id,
                    type: "course",
                    title: course.title,
                    price,
                    image: course.image,
                    categoryLabel: course.categoryLabel,
                  })
                }
                className="ibx-btn ibx-btn-outline !px-1.5 !py-1"
                title="Ajouter au panier"
                aria-label={`Ajouter ${course?.title || "la formation"} au panier`}
              >
                <ShoppingCart className="h-3 w-3" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onSelect(course)}
                className="ibx-btn ibx-btn-primary !px-1.5 !py-1 !text-[9.5px]"
              >
                <Play className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
                <span className="hidden sm:inline">Suivre</span>
                <span className="sm:hidden">Voir</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


