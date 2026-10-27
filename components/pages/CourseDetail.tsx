"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  Play,
  ShoppingCart,
  Star,
  UserCheck,
} from "lucide-react";
import { useAuth, useCommerce, useUi } from "@/lib/store/domains/contexts";
import type { Course } from "@/lib/types";

const FCFA_RATE = 600;

export interface CourseDetailData {
  id: string;
  slug: string;
  title: string;
  categoryLabel: string;
  description: string;
  fullDescription: string;
  level: string;
  durationHours: number;
  lessonsCount: number;
  price: number;
  rating: number;
  reviewsCount: number;
  studentsCount: number;
  image: string;
  badge: string;
  instructorName: string;
  instructorRole: string;
  instructorAvatar: string;
  outcomes: string[];
  chapters: { id: string; title: string; lessons: { id: string; title: string; duration: string; type: string }[] }[];
}

/**
 * Fiche formation (page dédiée /course/[slug]).
 * • Toutes les informations + prix en USD **et en FCFA**.
 * • Paywall : sans achat, le programme reste visible mais verrouillé.
 * • Après paiement, l'accès est reconnu (enrolled_course_ids côté serveur).
 */
export function CourseDetail({
  course,
  hasAccess,
  isLoggedIn,
}: {
  course: CourseDetailData;
  hasAccess: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const { addToCart } = useCommerce();
  const { setSelectedCourseForPlayer } = useUi();
  const { isUserLoggedIn } = useAuth();

  const price = Number(course.price) || 0;
  const isFree = price === 0;
  const fcfa = Math.round(price * FCFA_RATE);
  const lessonsCount =
    course.lessonsCount || course.chapters.reduce((total, chapter) => total + chapter.lessons.length, 0);

  /** Ouvre le lecteur : les chapitres et vidéos sont chargés par le lecteur. */
  const openPlayer = () => {
    const playerCourse = {
      id: course.id,
      title: course.title,
      slug: course.slug,
      categoryLabel: course.categoryLabel,
      description: course.description,
      price,
      image: course.image,
      level: course.level,
      durationHours: course.durationHours,
      lessonsCount,
      rating: course.rating,
      reviewsCount: course.reviewsCount,
      studentsCount: course.studentsCount,
      chapters: [],
      quiz: [],
      instructor: {
        name: course.instructorName,
        role: course.instructorRole,
        avatar: course.instructorAvatar,
      },
    } as unknown as Course;
    setSelectedCourseForPlayer(playerCourse);
  };

  const buy = () => {
    if (!isUserLoggedIn && !isLoggedIn) {
      router.push("/login");
      return;
    }
    addToCart({
      id: course.id,
      type: "course",
      title: course.title,
      price,
      image: course.image,
      categoryLabel: course.categoryLabel,
    });
    router.push("/cart?payer=1");
  };

  return (
    <div className="min-h-screen bg-[#021231] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-7">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-[#D69E25] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative rounded-3xl overflow-hidden border border-[#D69E25]/30 bg-[#011D46] aspect-video product-visual">
              {course.image ? (
                <img src={course.image} alt={course.title} className="w-full h-full object-contain p-2" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  Aperçu non disponible
                </div>
              )}
              <span className="absolute top-3 left-3 rounded-full bg-[#D69E25] text-[#021231] text-[10px] font-black px-3 py-1 uppercase tracking-wide">
                {course.categoryLabel}
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-black leading-tight">{course.title}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#D69E25]" />
                  {course.instructorName}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#D69E25]" />
                  {course.durationHours}h
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#D69E25]" />
                  {lessonsCount} leçons
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  {course.reviewsCount > 0 ? `${course.rating.toFixed(1)} (${course.reviewsCount} avis)` : "Nouveau"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#D69E25]" />
                  {course.level}
                </span>
              </div>
              {course.description && (
                <p className="text-sm text-slate-300 leading-relaxed">{course.description}</p>
              )}
              {course.fullDescription && (
                <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">
                  {course.fullDescription}
                </p>
              )}
            </div>

            {course.outcomes.length > 0 && (
              <div className="rounded-2xl border border-slate-700 bg-[#011D46] p-4 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wide text-[#D69E25]">
                  Ce que vous allez apprendre
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {course.outcomes.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Programme : visible, mais verrouillé sans achat */}
            <div className="rounded-2xl border border-slate-700 bg-[#011D46] overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-700">
                <p className="text-xs font-black uppercase tracking-wide text-white">Programme de la formation</p>
                <span className="text-[10px] font-bold text-slate-400">
                  {course.chapters.length} chapitre(s) · {lessonsCount} leçon(s)
                </span>
              </div>
              {course.chapters.length === 0 ? (
                <p className="px-4 py-6 text-xs italic text-slate-400">
                  Le programme détaillé sera publié très prochainement.
                </p>
              ) : (
                <div className="divide-y divide-slate-700/60">
                  {course.chapters.map((chapter) => (
                    <div key={chapter.id} className="px-4 py-3 space-y-1.5">
                      <p className="text-xs font-extrabold text-white">{chapter.title}</p>
                      {chapter.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-[#021231]/60 px-3 py-1.5 text-[11px] text-slate-300"
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            {hasAccess ? (
                              <Play className="w-3 h-3 text-emerald-400 shrink-0" />
                            ) : (
                              <Lock className="w-3 h-3 text-[#D69E25] shrink-0" />
                            )}
                            <span className="truncate">{lesson.title}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 shrink-0">{lesson.duration}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 rounded-3xl border border-[#D69E25]/40 bg-[#011D46] p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {hasAccess ? "Vous avez accès à cette formation" : "Tarif de la formation"}
                </p>
                <p className="text-3xl font-black text-[#D69E25] leading-none mt-1">
                  {isFree ? "Gratuit" : `${fcfa.toLocaleString("fr-FR")} FCFA`}
                </p>
                {!isFree && (
                  <p className="text-xs text-slate-400 font-semibold mt-1">soit {price.toFixed(2)} $ USD</p>
                )}
              </div>

              {hasAccess ? (
                <button
                  onClick={openPlayer}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-xs font-black uppercase tracking-wide text-white flex items-center justify-center gap-2 transition"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Continuer la formation
                </button>
              ) : (
                <button
                  onClick={buy}
                  className="w-full rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] hover:brightness-110 px-4 py-3 text-xs font-black uppercase tracking-wide text-[#021231] flex items-center justify-center gap-2 transition"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {isFree ? "Commencer gratuitement" : "Acheter cette formation"}
                </button>
              )}

              <ul className="space-y-1.5 text-[11px] text-slate-300">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Accès immédiat après paiement
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Suivi de progression enregistré
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Attestation officielle avec QR code
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Wave · Orange Money · Carte · PayPal
                </li>
              </ul>

              <p className="text-[10px] text-slate-500 leading-relaxed">
                {hasAccess
                  ? "Votre achat est reconnu : la formation est disponible dans Ma Bibliothèque."
                  : "Le paiement se finalise dans votre panier. Dès validation, la formation est débloquée automatiquement."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
