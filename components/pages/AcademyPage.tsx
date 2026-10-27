"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useAppStore } from "@/lib/store/AppStore";
import { useCatalog, useCommerce, useUi } from "@/lib/store/domains/contexts";
import { CourseCatalog } from "@/components/CourseCatalog";
import type { CourseCatalogFilters } from "@/components/CourseCatalog";
import {
  Award,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  MonitorPlay,
  FileCheck2,
  BadgeCheck,
  TrendingUp,
  Layers,
  Loader2,
} from "lucide-react";

export function AcademyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
    const { setSelectedCourseForPlayer, searchQuery, setSearchQuery } = useUi();
  const { courses, trainingCenters, courseCategories, rateCourse, catalogTotal, catalogHasMore, loadMoreCourses } = useCatalog();
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
      title: "Certificats QR Code",
      description: "Attestation officielle vérifiable publiquement",
      color: "#D69E25",
    },
    {
      icon: MonitorPlay,
      title: "Vidéos Pratiques",
      description: "Fichiers sources inclus dans chaque formation",
      color: "#10B981",
    },
    {
      icon: BadgeCheck,
      title: "Formateurs Experts",
      description: "Rigoureusement sélectionnés et vérifiés",
      color: "#0EA5E9",
    },
    {
      icon: ShieldCheck,
      title: "Accès à Vie",
      description: "Revenez quand vous voulez, mises à jour incluses",
      color: "#F59E0B",
    },
  ];

  const handleOpenFirstCourse = () => {
    if (courses.length > 0) {
      setSelectedCourseForPlayer(courses[0]);
    }
  };

  if (!platformLoaded) {
    return (
      <div className="min-h-screen bg-[#021231] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#D69E25]" />
          <p className="text-xs text-slate-400">Chargement des formations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#021231] text-white selection:bg-[#D69E25]/30">
      {/* ==================== COURSE CATALOG ==================== */}
      <div id="academy-courses" className="pt-6">
        <CourseCatalog
          courses={courses}
          onSelectCourse={(course) =>
            router.push(`/course/${encodeURIComponent(String((course as { slug?: string }).slug || course.id))}`)
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

      {/* ==================== HIGHLIGHTS ==================== */}
      <section className="py-16 bg-[#021231] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-emerald-500/40 px-4 py-2 rounded-full text-xs font-bold text-emerald-400 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pourquoi Apprendre avec Nous ?</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Une Expérience <span className="animated-gradient-text inline-block">d'Apprentissage d'Élite</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="group relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center hover:border-white/20 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}30` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: item.color }} />
                  </div>
                  <h3 className="text-sm font-black text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== CERTIFICATION BANNER ==================== */}
      <section className="py-16 relative overflow-hidden bg-gradient-to-b from-[#021231] to-[#011D46]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(214,158,37,0.08)_0%,transparent_60%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#D69E25]/5 blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative bg-white/[0.04] backdrop-blur-xl border border-[#D69E25]/30 rounded-3xl p-8 sm:p-10 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent" />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5 text-left">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D69E25] to-[#AB6F10] flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(214,158,37,0.3)]"
                >
                  <Award className="w-8 h-8 text-[#021231]" />
                </motion.div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Certificat Officiel Authentifié
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed max-w-md">
                    Chaque formation validée génère un certificat numérique avec numéro unique
                    et QR Code vérifiable publiquement.
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-[11px] font-semibold text-slate-300">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      Reconnaissance professionnelle
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                      Progression suivie
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleOpenFirstCourse}
                className="group relative inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#D69E25] via-[#F6E05E] to-[#AB6F10] bg-[length:200%_auto] hover:bg-right text-[#021231] font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xl shadow-[#D69E25]/30 overflow-hidden shrink-0"
              >
                <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 group-hover:animate-shine transition-opacity" />
                Commencer une Formation
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}