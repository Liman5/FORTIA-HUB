"use client";

import React from "react";
import { motion } from "motion/react";
import { useAppStore } from "@/lib/store/AppStore";
import { CourseCatalog } from "@/components/CourseCatalog";
import {
  GraduationCap,
  Award,
  Users,
  BookOpen,
  ArrowRight,
  Sparkles,
  Search,
  Star,
  ShieldCheck,
  MonitorPlay,
  FileCheck2,
  BadgeCheck,
  TrendingUp,
  Layers,
  Loader2,
} from "lucide-react";

export function AcademyPage() {
  const { courses, addToCart, setSelectedCourseForPlayer, rateCourse, platformLoaded, searchQuery, setSearchQuery } = useAppStore();

  const totalStudents = courses.reduce((sum, c) => sum + (c.studentsCount || 0), 0);
  const totalLessons = courses.reduce((sum, c) => sum + (c.lessonsCount || 0), 0);
  const avgRating = courses.length > 0
    ? (courses.reduce((sum, c) => sum + (c.rating || 0), 0) / courses.length).toFixed(1)
    : "5.0";

  // Cartes de statistiques masquées (Formations Certifiantes, Étudiants, Leçons, Note)
  const stats: { icon: React.ElementType; value: string; label: string; color: string }[] = [];

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
      {/* ==================== HERO SECTION ==================== */}
      <section className="relative overflow-hidden pt-10 pb-6">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,37,0.1)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(14,165,233,0.06)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-15" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/40 to-transparent" />

        {/* Floating shapes */}
        <motion.div
          className="absolute top-16 right-8 w-20 h-20 rounded-2xl border border-[#D69E25]/20 bg-[#D69E25]/5 rotate-12 pointer-events-none"
          animate={{ y: [0, -15, 0], rotate: [12, 24, 12] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-12 left-8 w-14 h-14 rounded-full border border-emerald-400/20 bg-emerald-400/5 pointer-events-none"
          animate={{ y: [0, 12, 0], x: [0, -8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center space-y-4">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-[#D69E25]/40 px-5 py-2 rounded-full text-xs font-bold text-[#D69E25] shadow-[0_0_20px_rgba(214,158,37,0.15)]"
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-[#D69E25]"
              />
              <GraduationCap className="w-4 h-4" />
              <span>Académie Certifiante FORTIA HUB</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]"
            >
              Catalogue des{" "}
              <span className="animated-gradient-text inline-block">
                Formations
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto font-medium leading-relaxed"
            >
              Des formations pratiques et certifiantes pour maîtriser les métiers du futur.
              Certificats officiels avec QR Code de vérification unique.
            </motion.p>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
              className="max-w-xl mx-auto"
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-[#D69E25]/20 blur-xl rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl overflow-hidden focus-within:border-[#D69E25]/60 focus-within:shadow-[0_0_30px_rgba(214,158,37,0.15)] transition-all duration-300">
                  <Search className="w-5 h-5 text-slate-400 ml-4 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher une formation (IA, Crypto, Canva...)"
                    className="w-full bg-transparent text-sm text-white placeholder-slate-500 px-3 py-4 focus:outline-none"
                  />
                  <button
                    onClick={() => {}}
                    className="mr-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-bold text-xs hover:brightness-110 active:scale-95 transition-all shrink-0"
                  >
                    Rechercher
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Stats Strip - Cartes de statistiques supprimées */}
        </div>
      </section>

      {/* ==================== COURSE CATALOG ==================== */}
      <div id="academy-courses">
        <CourseCatalog
          courses={courses}
          onSelectCourse={(course) => setSelectedCourseForPlayer(course)}
          onAddToCart={addToCart}
          onRateCourse={(courseId, rating) => rateCourse(courseId, rating)}
          searchQuery={searchQuery}
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