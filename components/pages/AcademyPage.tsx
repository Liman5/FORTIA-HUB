"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store/AppStore";
import { useCatalog, useCommerce, useUi } from "@/lib/store/domains/contexts";
import { CourseCatalog } from "@/components/CourseCatalog";
import type { CourseCatalogFilters } from "@/components/CourseCatalog";
import { buildCategoryOptions } from "@/lib/data/courseCategories";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  MonitorPlay,
  FileCheck2,
  BadgeCheck,
  Layers,
  Loader2,
  LayoutGrid,
  Award,
} from "lucide-react";

/**
 * Page Académie.
 *
 * Objectif UI : rendre immédiatement lisibles « où je suis », « ce que je peux
 * apprendre », « comment filtrer » et « comment ouvrir une formation ».
 * Le catalogue (recherche, filtres, tri, chargement progressif) reste assuré
 * par `CourseCatalog` : aucune logique métier n'est dupliquée ici.
 *
 * Thème : les surfaces de cette page utilisent les tokens IBX (clair/sombre).
 * Le scope `ibx-catalogue` harmonise en plus les grilles historiques.
 */
export function AcademyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSelectedCourseForPlayer, searchQuery, setSearchQuery } = useUi();
  const {
    courses,
    trainingCenters,
    courseCategories,
    rateCourse,
    catalogTotal,
    catalogHasMore,
    loadMoreCourses,
  } = useCatalog();
  const { addToCart } = useCommerce();
  const { platformLoaded } = useAppStore();

  /* Filtres issus de l'URL : liens directs + boutons Retour/Avancer */
  const categoryParam = searchParams?.get("categorie") || null;
  const viewParam = searchParams?.get("vue") || null;
  const centerParam = searchParams?.get("centre") || null;
  const centerName = centerParam
    ? (trainingCenters || []).find((center) => center.id === centerParam)?.centerName || null
    : null;

  /** Synchronise l'URL (sans empiler l'historique) lorsqu'un filtre change. */
  const handleFiltersChange = (next: CourseCatalogFilters) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    (["categorie", "vue", "centre"] as const).forEach((key) => {
      const value = next[key];
      if (value === undefined) return;
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    const query = params.toString();
    router.replace(query ? `/academy?${query}` : "/academy", { scroll: false });
  };

  const highlights = [
    {
      icon: FileCheck2,
      title: "Certificats vérifiables",
      description: "Attestation officielle avec numéro unique et QR code.",
    },
    {
      icon: MonitorPlay,
      title: "Vidéos et supports PDF",
      description: "Chaque chapitre est consultable en vidéo ou en PDF.",
    },
    {
      icon: BadgeCheck,
      title: "Formateurs identifiés",
      description: "Contenus publiés par des formateurs et des centres vérifiés.",
    },
    {
      icon: ShieldCheck,
      title: "Accès conservé",
      description: "Revenez quand vous voulez, mises à jour incluses.",
    },
  ];

  const handleOpenFirstCourse = () => {
    if (courses.length > 0) {
      setSelectedCourseForPlayer(courses[0]);
    }
  };

  if (!platformLoaded) {
    return (
      <div className="ibx-page flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin" style={{ color: "var(--ibx-accent)" }} />
          <p className="ibx-small">Chargement des formations…</p>
        </div>
      </div>
    );
  }

  const totalLabel = catalogTotal ?? (courses || []).length;
  const categoryCount = (courseCategories || []).length;
  const centersCount = (trainingCenters || []).length;

  /** Catégories réellement disponibles (familles + catégories en base). */
  const quickCategories = useMemo(
    () =>
      buildCategoryOptions(courses || [], courseCategories || [], categoryParam)
        .filter((category) => category.id !== "all" && category.count > 0)
        .slice(0, 10),
    [courses, courseCategories, categoryParam]
  );

  return (
    <div className="ibx-page ibx-catalogue">
      {/* ---------------------------- EN-TÊTE ---------------------------- */}
      <header className="border-b" style={{ borderColor: "var(--ibx-border)" }}>
        <div className="ibx-container py-5 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="ibx-label">Académie certifiante</p>
              <h1 className="ibx-h1">Apprenez des compétences concrètes</h1>
              <p className="ibx-body max-w-2xl">
                Formations en vidéo et en PDF, du niveau débutant à expert. Filtrez par catégorie,
                niveau et prix, puis ouvrez la formation qui vous correspond.
              </p>
              <div className="ibx-toolbar pt-1">
                <span className="ibx-badge">
                  {totalLabel} formation{totalLabel > 1 ? "s" : ""}
                </span>
                {categoryCount > 0 && (
                  <span className="ibx-badge">
                    {categoryCount} catégorie{categoryCount > 1 ? "s" : ""}
                  </span>
                )}
                {centersCount > 0 && (
                  <span className="ibx-badge">
                    {centersCount} centre{centersCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/academy/categories")}
                className="ibx-btn ibx-btn-outline"
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                Toutes les catégories
              </button>
              <button
                type="button"
                onClick={handleOpenFirstCourse}
                disabled={(courses || []).length === 0}
                className="ibx-btn ibx-btn-primary"
              >
                Commencer une formation
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Accès rapide aux catégories réelles (compteurs réels) */}
          {quickCategories.length > 0 && (
            <div
              className="ibx-scroll-x mt-4 border-t pt-3"
              style={{ borderColor: "var(--ibx-border)" }}
              role="group"
              aria-label="Catégories de formations"
            >
              <button
                type="button"
                className="ibx-chip"
                data-active={!categoryParam ? "true" : "false"}
                onClick={() => handleFiltersChange({ categorie: null, centre: null })}
              >
                Toutes
              </button>
              {quickCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className="ibx-chip"
                  data-active={categoryParam === category.id ? "true" : "false"}
                  onClick={() => handleFiltersChange({ categorie: category.id, centre: null })}
                >
                  {category.label}
                  <span className="ibx-tiny">{category.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* --------------------------- CATALOGUE --------------------------- */}
      <div id="academy-courses">
        <CourseCatalog
          courses={courses}
          onSelectCourse={(course) =>
            router.push(
              `/course/${encodeURIComponent(String((course as { slug?: string }).slug || course.id))}`
            )
          }
          onAddToCart={addToCart}
          onRateCourse={(courseId, rating) => rateCourse(courseId, rating)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          dbCategories={courseCategories}
          categoryParam={categoryParam}
          viewParam={viewParam}
          centerParam={centerParam}
          centerName={centerName}
          onFiltersChange={handleFiltersChange}
          catalogTotal={catalogTotal}
          hasMoreCourses={catalogHasMore}
          onLoadMoreCourses={loadMoreCourses}
        />
      </div>


      {/* --------------------------- AVANTAGES --------------------------- */}
      <section className="ibx-container py-8 sm:py-10">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" aria-hidden="true" style={{ color: "var(--ibx-accent-strong)" }} />
          <h2 className="ibx-h2">Pourquoi apprendre ici</h2>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="ibx-card-flat ibx-interactive p-3.5">
                <span
                  className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-[var(--ibx-radius-sm)]"
                  style={{ backgroundColor: "var(--ibx-surface-muted)", color: "var(--ibx-accent-strong)" }}
                  aria-hidden="true"
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <h3 className="ibx-h3 !text-[12px]">{item.title}</h3>
                <p className="ibx-small mt-1 !text-[10.5px]">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------- CERTIFICATION ------------------------- */}
      <section className="ibx-container pb-10">
        <div className="ibx-card p-4 sm:p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--ibx-radius-md)]"
                style={{ backgroundColor: "var(--ibx-accent-soft)", color: "var(--ibx-accent-strong)" }}
                aria-hidden="true"
              >
                <Award className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="ibx-h2">Certificat officiel authentifié</h2>
                <p className="ibx-body mt-1 max-w-xl">
                  Chaque formation terminée génère un certificat numérique avec un numéro unique et
                  un QR code vérifiable publiquement. L&apos;émission est contrôlée côté serveur.
                </p>
                <div className="ibx-toolbar mt-2">
                  <span className="ibx-badge">
                    <Layers className="h-3 w-3" aria-hidden="true" />
                    Progression suivie
                  </span>
                  <span className="ibx-badge">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    Vérification serveur
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenFirstCourse}
              disabled={(courses || []).length === 0}
              className="ibx-btn ibx-btn-primary shrink-0"
            >
              Commencer maintenant
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

