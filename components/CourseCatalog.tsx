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
  Search,
  Star,
  RotateCcw,
  X,
  ChevronDown,
  GraduationCap,
  SlidersHorizontal,
} from "lucide-react";
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
    <section className="py-8 bg-[#021231] min-h-[600px] relative overflow-x-clip" id="courses-section">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/20 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,37,0.03)_0%,transparent_50%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5 relative z-10">

        {/* ===================== EN-TÊTE DU CATALOGUE ===================== */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#D69E25] shrink-0" />
                <span className="truncate">{title}</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-1">
                Formations certifiantes — filtrez par catégorie, niveau et prix.
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-bold text-[#D69E25] bg-[#D69E25]/10 border border-[#D69E25]/30 px-3 py-1.5 rounded-full">
              {/* Nombre TOTAL côté serveur lorsque aucun filtre local n'est actif,
                  sinon le nombre de résultats réellement filtrés. */}
              {isFiltering
                ? `${filteredCourses.length} résultat${filteredCourses.length > 1 ? "s" : ""}`
                : `${catalogTotal ?? filteredCourses.length} formation${
                    (catalogTotal ?? filteredCourses.length) > 1 ? "s" : ""
                  }`}
            </span>
          </div>

          {/* Recherche + accès aux filtres */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex items-center flex-1 min-w-[190px] bg-white/5 border border-white/15 rounded-xl overflow-hidden focus-within:border-[#D69E25]/60 transition-all">
              <Search className="absolute left-3 w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Rechercher une formation..."
                className="w-full bg-transparent text-sm text-white placeholder-slate-400 pl-9 pr-8 py-2.5 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange?.("")}
                  className="absolute right-2 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
                  title="Effacer la recherche"
                  aria-label="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowMoreFilters((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition ${
                showMoreFilters || selectedLevel !== "all" || selectedPrice !== "all"
                  ? "bg-[#D69E25]/15 border-[#D69E25]/50 text-[#D69E25]"
                  : "bg-white/5 border-white/15 text-slate-300 hover:text-white hover:bg-white/10"
              }`}
              aria-expanded={showMoreFilters}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtres
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${showMoreFilters ? "rotate-180" : ""}`}
              />
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/5 border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Réinitialiser
              </button>
            )}
          </div>

          {/* Filtres secondaires : niveau + prix */}
          {showMoreFilters && (
            <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
              <label className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                Niveau
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="bg-[#021231] border border-white/15 rounded-lg text-xs font-semibold text-white px-2.5 py-1.5 focus:outline-none focus:border-[#D69E25]/60"
                >
                  <option value="all">Tous les niveaux</option>
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                Prix
                <select
                  value={selectedPrice}
                  onChange={(e) => setSelectedPrice(e.target.value)}
                  className="bg-[#021231] border border-white/15 rounded-lg text-xs font-semibold text-white px-2.5 py-1.5 focus:outline-none focus:border-[#D69E25]/60"
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
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-px-4">
          {categoryOptions.map((cat) => {
            const isActive = selectedCategory === cat.id;
            const CatIcon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap snap-start shrink-0 transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] shadow-lg shadow-[#D69E25]/20"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                {CatIcon && <CatIcon className="w-3.5 h-3.5" />}
                <span>{cat.label}</span>
                {cat.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                      isActive ? "bg-[#021231]/20 text-[#021231]" : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ===================== VUES / TRIS ===================== */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            Trier par
          </span>
          {views.map((view) => {
            const isActive = selectedView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => handleSelectView(view.id)}
                aria-pressed={isActive}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
                  isActive
                    ? "bg-[#D69E25]/15 border-[#D69E25]/50 text-[#D69E25]"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {view.label}
              </button>
            );
          })}
        </div>

        {/* ===================== RÉSULTATS ===================== */}
        {filteredCourses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
              <Search className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Aucune formation disponible dans cette catégorie pour le moment.
            </h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              Choisissez une autre catégorie ou parcourez l&apos;ensemble du catalogue.
            </p>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#D69E25]/20"
            >
              Explorer toutes les formations
            </button>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
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
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => {
                    if (visibleCount < filteredCourses.length) {
                      setVisibleCount((count) => count + PAGE_SIZE);
                      return;
                    }
                    // Liste locale épuisée : on va chercher la page suivante
                    // côté serveur (le catalogue n'est jamais chargé d'un coup).
                    onLoadMoreCourses?.();
                  }}
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/15 text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition"
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
  const instructorName =
    course?.instructor?.name || course?.instructorName || "Formateur FORTIA HUB";
  const avatarSrc = course?.instructor?.avatar || course?.instructorAvatar || "";
  const initial = instructorName.trim().charAt(0).toUpperCase() || "F";
  const reviewsCount = Number(course?.reviewsCount) || 0;
  const rating = Number(course?.rating) || 0;
  const price = Number(course?.price) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: Math.min(index, 6) * 0.06, ease: "easeOut" }}
      whileHover={{ y: -6 }}
      className="group relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl shadow-xl hover:border-[#D69E25]/40 transition-all duration-500 flex flex-col overflow-hidden"
    >
      {/* Couverture */}
      <div className="relative h-32 sm:h-40 overflow-hidden bg-[#021231]">
        {course?.image ? (
          <OptimizedImage
            src={course.image}
            alt={course.title}
            fallbackCategory={course.categoryLabel}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0B1B36]">
            <GraduationCap className="w-7 h-7 text-[#D69E25]/60" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#021231] via-[#021231]/30 to-transparent pointer-events-none" />

        {course?.categoryLabel && (
          <span className="absolute top-2 left-2 bg-[#021231]/85 backdrop-blur-md text-[#D69E25] border border-[#D69E25]/40 text-[8px] sm:text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide whitespace-nowrap max-w-[70%] truncate">
            {course.categoryLabel}
          </span>
        )}

        {course?.badge && (
          <span className="absolute top-2 right-2 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-md shadow-md max-w-[45%] truncate">
            {course.badge}
          </span>
        )}

        {course?.level && (
          <span className="absolute bottom-2 left-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-lg">
            {course.level}
          </span>
        )}

        <button
          onClick={() => onSelect(course)}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition duration-300 bg-[#021231]/50"
          title="Voir la formation"
          aria-label={`Voir la formation ${course?.title || ""}`}
        >
          <span className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D69E25] to-[#AB6F10] text-[#021231] flex items-center justify-center shadow-2xl">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </span>
        </button>
      </div>

      {/* Contenu */}
      <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-2">
          <h3
            onClick={() => onSelect(course)}
            className="font-extrabold text-white text-sm sm:text-base group-hover:text-[#D69E25] transition-colors line-clamp-2 cursor-pointer leading-snug"
          >
            {course?.title}
          </h3>

          {course?.description && (
            <p className="text-slate-400 text-[11px] sm:text-xs line-clamp-2 leading-relaxed">
              {course.description}
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-white/10 space-y-2.5">
          {/* Formateur */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={instructorName}
                className="w-7 h-7 rounded-full object-cover border border-[#D69E25]/50"
                loading="lazy"
              />
            ) : (
              <span className="w-7 h-7 rounded-full bg-[#D69E25]/15 text-[#D69E25] border border-[#D69E25]/40 flex items-center justify-center text-[10px] font-black shrink-0">
                {initial}
              </span>
            )}
            <span className="font-semibold text-slate-300 text-[11px] truncate">
              {instructorName}
            </span>
          </div>

          {/* Note (si avis réels) + statistiques disponibles */}
          <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px]">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = reviewsCount > 0 && star <= Math.round(rating);
                return (
                  <button
                    key={star}
                    onClick={() => onRate?.(course.id, star)}
                    title={`Noter ${star} étoile${star > 1 ? "s" : ""}`}
                    aria-label={`Noter ${star} étoile${star > 1 ? "s" : ""}`}
                    className="transition hover:scale-125"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        filled ? "text-[#D69E25] fill-[#D69E25]" : "text-slate-600"
                      }`}
                    />
                  </button>
                );
              })}
              {reviewsCount > 0 ? (
                <span className="text-slate-400 font-medium ml-1">
                  {rating.toFixed(1)} <span className="text-slate-500">({reviewsCount})</span>
                </span>
              ) : (
                <span className="text-slate-500 font-medium ml-1">Nouveau</span>
              )}
            </div>
            <div className="flex items-center gap-2.5 text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#D69E25]" />
                {Number(course?.durationHours) || 0}h
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-[#D69E25]" />
                {Number(course?.studentsCount) || 0}
              </span>
            </div>
          </div>

          {/* Prix + actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div>
              <span className="block text-lg font-black text-white leading-none">${price}</span>
              <span className="block text-[9px] sm:text-[10px] text-slate-500 font-medium mt-1">
                ≈ {(price * 600).toLocaleString("fr-FR")} FCFA
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
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
                className="shop-cart-btn p-2 rounded-xl border border-[#D69E25]/70"
                title="Ajouter au panier"
                aria-label={`Ajouter ${course?.title || "la formation"} au panier`}
              >
                <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => onSelect(course)}
                className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-extrabold text-[10px] sm:text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#D69E25]/20 flex items-center gap-1"
              >
                <Play className="w-3 h-3 fill-current" />
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


