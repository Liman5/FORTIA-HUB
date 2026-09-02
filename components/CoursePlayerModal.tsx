"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Course, Lesson, Certificate } from '../types';
import { generatePDFCertificate, triggerCelebrationConfetti } from '../utils/pdfGenerator';
import {
  saveLessonOffline,
  loadOfflineVideoUrl,
  isLessonOffline,
  deleteLessonOffline,
} from '../lib/services/offlineVideo';
import { 
  X, 
  CheckCircle, 
  PlayCircle, 
  FileText, 
  HelpCircle, 
  Award, 
  Download, 
  Lock,
  ChevronRight,
  UserCheck
} from 'lucide-react';

interface CoursePlayerModalProps {
  course: Course;
  onClose: () => void;
  studentName: string;
  onRateCourse?: (courseId: string, rating: number) => void;
  /** Accès accordé (formation achetée / inscrit) — sinon le paywall s'affiche. */
  hasAccess?: boolean;
  isLoggedIn?: boolean;
  onBuyCourse?: () => void;
  onRequireLogin?: () => void;
  /** % de progression déjà enregistré (compte membre). */
  initialProgress?: number;
  /** Appelé à chaque changement de progression (persistance compte). */
  onProgressChanged?: (percent: number) => void;
  /** Appelé quand l'apprenant débloque et enregistre son attestation. */
  onCertificateEarned?: (certificate: Certificate) => void;
  /** ID du compte membre (nécessaire pour stocker la copie hors-ligne chiffrée). */
  userAccountId?: string;
}

// Convertit les URLs YouTube (regarder / partager / embed) en URL de lecteur embed.
function toYoutubeEmbedUrl(raw?: string): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  if (t.includes("youtube.com/embed/")) return t;
  const match = t.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return null;
}

// Identifiant stable d'attestation (numéro unique, non aléatoire à chaque rendu)
function stableHash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}

function certificateCategoryCode(course: Course): string {
  const raw = String(course.category || (course as any).categoryLabel || "FORT");
  const clean = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  return clean.slice(0, 4) || "FORT";
}

export const CoursePlayerModal: React.FC<CoursePlayerModalProps> = ({
  course,
  onClose,
  studentName,
  onRateCourse,
  hasAccess = true,
  isLoggedIn = true,
  onBuyCourse,
  onRequireLogin,
  initialProgress = 0,
  onProgressChanged,
  onCertificateEarned,
  userAccountId
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'quiz' | 'certificate'>('content');
  const chapters = course.chapters || [];
  // Tous les ids de leçons (pour la progression persistée du compte)
  const allLessonIds = chapters.reduce<string[]>((acc, ch) => {
    (ch.lessons || []).forEach((l) => { if (l.id) acc.push(l.id); });
    return acc;
  }, []);
  const initialLesson: Lesson = chapters[0]?.lessons?.[0] || {
    id: 'default',
    title: 'Introduction au Cours',
    duration: '05:00',
    type: 'video',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    content: 'Bienvenue dans cette formation.'
  };

  const [currentLesson, setCurrentLesson] = useState<Lesson>(initialLesson);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() => {
    if (initialProgress >= 100) return allLessonIds;
    if (initialProgress > 0 && allLessonIds.length > 0) {
      const approx = Math.max(1, Math.round((allLessonIds.length * initialProgress) / 100));
      return allLessonIds.slice(0, approx);
    }
    return [];
  });
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [certificateGranted, setCertificateGranted] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const skipProgressSync = useRef(true);

  // ===== Copie hors-ligne (chiffrée AES en local) =====
  const [offlineReady, setOfflineReady] = useState(false);
  const [offlineBusy, setOfflineBusy] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [offlineCode, setOfflineCode] = useState("");
  const [localVideoUrl, setLocalVideoUrl] = useState<{ url: string; revoke: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (localVideoUrl) {
      localVideoUrl.revoke();
      setLocalVideoUrl(null);
    }
    if (!userAccountId || !currentLesson?.id) {
      setOfflineReady(false);
      return;
    }
    setOfflineError(null);
    setOfflineReady(false);
    isLessonOffline(userAccountId, course.id, currentLesson.id).then((ok) => {
      if (!cancelled) setOfflineReady(ok);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAccountId, course.id, currentLesson?.id]);

  const downloadForOffline = async () => {
    if (!userAccountId || !currentLesson?.id) return;
    setOfflineBusy(true);
    setOfflineError(null);
    try {
      await saveLessonOffline({
        userId: userAccountId,
        courseId: course.id,
        lessonId: currentLesson.id,
        videoUrl: currentLesson.videoUrl || "",
        videoProtected: !!currentLesson.videoProtected,
        videoCodeHash: currentLesson.videoCodeHash,
        code: currentLesson.videoProtected ? offlineCode.trim() : undefined,
      });
      setOfflineReady(true);
    } catch (err: any) {
      setOfflineError(err?.message || "Erreur lors du téléchargement hors-ligne.");
    } finally {
      setOfflineBusy(false);
    }
  };

  const playLocalCopy = async () => {
    if (!userAccountId || !currentLesson?.id) return;
    setOfflineError(null);
    try {
      const loaded = await loadOfflineVideoUrl(
        userAccountId,
        course.id,
        currentLesson.id,
        currentLesson.videoProtected ? offlineCode.trim() : undefined
      );
      if (loaded) {
        if (localVideoUrl) localVideoUrl.revoke();
        setLocalVideoUrl(loaded);
      } else {
        setOfflineError("Copie hors-ligne introuvable : téléchargez-la d'abord.");
      }
    } catch (err: any) {
      setOfflineError(err?.message || "Impossible de lire la copie hors-ligne.");
    }
  };

  const removeLocalCopy = async () => {
    if (!userAccountId || !currentLesson?.id) return;
    if (localVideoUrl) {
      localVideoUrl.revoke();
      setLocalVideoUrl(null);
    }
    await deleteLessonOffline(userAccountId, course.id, currentLesson.id).catch(() => {});
    setOfflineReady(false);
    setOfflineCode("");
  };

  const totalLessonsCount = chapters.reduce((acc, ch) => acc + (ch.lessons ? ch.lessons.length : 0), 0);
  const progressPercent = totalLessonsCount > 0 ? Math.round((completedLessonIds.length / totalLessonsCount) * 100) : 0;

  const isCourseCompleted = progressPercent === 100;

  // Synchronise chaque changement de progression vers le compte membre (persistance)
  useEffect(() => {
    if (skipProgressSync.current) {
      skipProgressSync.current = false;
      return;
    }
    const pct =
      totalLessonsCount > 0
        ? Math.round((completedLessonIds.length / totalLessonsCount) * 100)
        : course.quiz && course.quiz.length > 0
        ? quizSubmitted
          ? 100
          : 0
        : 100;
    if (onProgressChanged) onProgressChanged(pct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedLessonIds.length, quizSubmitted]);

  const quizComplete = !course.quiz || course.quiz.length === 0 || quizSubmitted;
  // L'attestation n'est déblocable qu'à 100 % ET quiz validé (s'il existe)
  const certificateUnlocked = isCourseCompleted && quizComplete;

  // Lecteur : détecte si la leçon courante est une vidéo YouTube ou un fichier vidéo direct (MP4/WebM/R2…)
  const currentYoutubeEmbed = currentLesson?.videoUrl ? toYoutubeEmbedUrl(currentLesson.videoUrl) : null;
  const currentIsVideoFile =
    !!currentLesson?.videoUrl && currentLesson?.type === "video" && !currentYoutubeEmbed;

  const toggleLessonComplete = (lessonId: string) => {
    if (completedLessonIds.includes(lessonId)) {
      setCompletedLessonIds(completedLessonIds.filter(id => id !== lessonId));
    } else {
      setCompletedLessonIds([...completedLessonIds, lessonId]);
    }
  };

  const markAllComplete = () => {
    const allIds = chapters.flatMap(ch => (ch.lessons || []).map(l => l.id));
    setCompletedLessonIds(allIds);
    triggerCelebrationConfetti();
  };

  // Attestation à numéro UNIQUE & stable (cours + apprenant) — affichée ensuite
  // dans l'onglet « Attestations » de la page membre avec son QR Code.
  const todayKey = new Date().toISOString().split("T")[0];
  const certId = `FORTIA-${new Date().getFullYear()}-${certificateCategoryCode(course)}-${stableHash(
    `${course.id}|${studentName || "apprenant"}|${todayKey}`
  )}`;
  const currentCertificate: Certificate = {
    id: certId,
    studentName: studentName || "Apprenant FORTIA",
    courseTitle: course.title,
    category: course.categoryLabel,
    courseId: course.id,
    issueDate: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    grade: "Mention Excellent (98%)",
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      `FORTIA-HUB-CERT:${certId}`
    )}`,
    verified: true,
  } as Certificate & { courseId?: string };

  const handleDownloadCertificate = () => {
    triggerCelebrationConfetti();
    generatePDFCertificate(currentCertificate);
  };

  const handleGrantCertificate = () => {
    if (!certificateUnlocked || !rulesAccepted || certificateGranted) return;
    setCertificateGranted(true);
    triggerCelebrationConfetti();
    if (onCertificateEarned) onCertificateEarned(currentCertificate as Certificate);
  };

  // ===== Aperçu gratuit (sans achat) =====
  // Le modal s'ouvre et affiche la formation (contenu, programme, prix) MAIS
  // aucune action n'est possible : vidéos / quiz / attestation verrouillés
  // tant que la formation n'est pas achetée.
  if (!hasAccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 overflow-y-auto">
        <div className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[92vh] overflow-hidden">
          {/* En-tête */}
          <div className="bg-[#021231] text-white p-4 sm:p-5 flex items-center justify-between border-b border-[#D69E25]/40 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="bg-[#D69E25] text-[#021231] text-[10px] font-black px-2.5 py-1 rounded-full shrink-0">Aperçu</span>
              <div className="min-w-0">
                <p className="font-black text-sm truncate">{course.title}</p>
                <p className="text-[10px] text-slate-300">{course.categoryLabel || "Formation FORTIA HUB"}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-slate-200 transition shrink-0"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {course.image && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200">
                <img src={course.image} alt={course.title} className="w-full h-40 sm:h-52 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <p className="absolute bottom-3 left-4 right-4 text-white text-xs font-bold drop-shadow">
                  👁 Vous consultez l&apos;aperçu — les vidéos et le quiz restent verrouillés tant que la formation n&apos;est pas achetée.
                </p>
              </div>
            )}

            {/* CTA achat */}
            <div className="rounded-2xl border-2 border-[#D69E25] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-50">
              <div className="text-center sm:text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#AB6F10]">Accès complet à vie</p>
                <p className="text-3xl font-black text-[#021231]">
                  {course.price || 0} <span className="text-sm font-bold text-slate-500">$ US</span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {isLoggedIn ? (
                  <button
                    type="button"
                    onClick={() => { if (onBuyCourse) onBuyCourse(); }}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-[#D69E25] via-[#F6E05E] to-[#AB6F10] bg-[length:200%_auto] hover:bg-right text-[#021231] font-black text-xs shadow-lg shadow-[#D69E25]/30 transition"
                  >
                    Acheter la formation
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { if (onRequireLogin) onRequireLogin(); }}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#021231] text-[#D69E25] font-black text-xs border border-[#D69E25]/50 transition"
                  >
                    Se connecter pour acheter
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs transition"
                >
                  Fermer
                </button>
              </div>
            </div>

            {/* Programme (lecture seule) */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50">
              <p className="font-black text-xs text-[#021231] uppercase tracking-wider">Programme de la formation</p>
              {course.chapters.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Contenu en préparation…</p>
              ) : (
                course.chapters.map((ch, ci) => (
                  <div key={ch.id || ci} className="space-y-1">
                    <p className="text-xs font-extrabold text-slate-700">{ch.title}</p>
                    <div className="space-y-1">
                      {(ch.lessons || []).map((l) => (
                        <div key={l.id || l.title} className="flex items-center justify-between text-[11px] text-slate-500 bg-white border border-slate-100 rounded-lg px-3 py-1.5">
                          <span className="flex items-center gap-1.5 truncate">
                            <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate">{l.title}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">{l.duration}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="text-[11px] text-slate-500 text-center font-medium">
              🎓 Vidéos HD • Quiz d&apos;évaluation • Certificat officiel avec QR Code unique
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 overflow-y-auto">
      <div className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[92vh]">
        
        {/* Top Header Bar */}
        <div className="bg-[#021231] text-white p-4 sm:p-5 flex items-center justify-between border-b border-[#D69E25]/40">
          <div className="flex items-center gap-3">
            <span className="bg-[#D69E25] text-[#021231] text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
              {course.categoryLabel}
            </span>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-white line-clamp-1">{course.title}</h2>
              <p className="text-xs text-slate-300">Instructeur: {course.instructor?.name || (course as any).instructorName || "Formateur FORTIA HUB"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Completion Progress Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-[#011D46] px-3 py-1.5 rounded-lg border border-[#D69E25]/30 text-xs">
              <span className="text-slate-300">Progression :</span>
              <strong className="text-[#D69E25]">{progressPercent}%</strong>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ===== PAYWALL : l'accès aux vidéos / quiz exige l'achat de la formation ===== */}
        {!hasAccess && (
          <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-slate-50 p-4 sm:p-6">
            <div className="max-w-md w-full mx-auto text-center space-y-5">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 border-2 border-[#D69E25] flex items-center justify-center">
                <Lock className="w-9 h-9 text-[#AB6F10]" />
              </div>

              <div className="space-y-1.5">
                <span className="inline-block text-[10px] font-black uppercase tracking-widest text-[#D69E25] bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                  Formation Payante
                </span>
                <h3 className="text-2xl font-black text-[#021231] leading-tight">{course.title}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Achetez cette formation pour débloquer les <strong>vidéos HD</strong>, le <strong>quiz d&apos;évaluation</strong> et votre <strong>certificat officiel</strong>.
                </p>
                {isLoggedIn && (
                  <p className="text-[10px] font-semibold text-slate-500 inline-flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#D69E25]" />
                    Connecté : <strong>{studentName}</strong>
                  </p>
                )}
              </div>

              <div className="bg-[#021231] text-white rounded-2xl border border-[#D69E25] px-4 py-5 shadow-xl">
                <p className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Accès complet à vie</p>
                <p className="text-4xl font-black text-[#D69E25] mt-1">
                  ${course.price || 0}
                  <span className="text-sm font-bold text-slate-300"> US</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-1.5">Wave · Orange Money · Mobile Money · Crypto · Carte</p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (isLoggedIn) {
                      if (onBuyCourse) onBuyCourse();
                    } else if (onRequireLogin) {
                      onRequireLogin();
                    }
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D69E25] via-[#F6E05E] to-[#AB6F10] bg-[length:200%_auto] hover:bg-right text-[#021231] font-black text-xs uppercase tracking-wider shadow-lg shadow-[#D69E25]/30 transition-all hover:scale-[1.01] active:scale-[0.98]"
                >
                  {isLoggedIn ? `Acheter cette formation — ${course.price || 0} $US` : "Se connecter pour acheter"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-700 font-bold text-xs transition"
                >
                  Fermer l&apos;aperçu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Selection Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'content'
                ? 'border-[#021231] text-[#021231]'
                : 'border-transparent text-slate-600 hover:text-[#021231]'
            }`}
          >
            <PlayCircle className="w-4 h-4 text-[#D69E25]" />
            <span>Cours & Leçons</span>
          </button>

          {course.quiz && course.quiz.length > 0 && (
            <button
              onClick={() => setActiveTab('quiz')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'quiz'
                  ? 'border-[#021231] text-[#021231]'
                  : 'border-transparent text-slate-600 hover:text-[#021231]'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-[#D69E25]" />
              <span>Quiz d'Évaluation</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('certificate')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'certificate'
                ? 'border-[#021231] text-[#021231]'
                : 'border-transparent text-slate-600 hover:text-[#021231]'
            }`}
          >
            <Award className="w-4 h-4 text-emerald-600" />
            <span>Certificat Officiel {isCourseCompleted && '🏆'}</span>
          </button>

          {/* Quick Mark All Button for Demo */}
          {!isCourseCompleted && (
            <button
              type="button"
              onClick={markAllComplete}
              className="hidden"
              aria-hidden="true"
            >
              ⚡ Simuler fin de formation
            </button>
          )}
        </div>

        {/* Main Classroom Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          
          {/* TAB 1: CONTENT PLAYER */}
          {activeTab === 'content' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Lesson Viewer */}
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-black rounded-xl overflow-hidden aspect-video relative shadow-lg border border-[#D69E25]/30">
                  {/* Leçon article / sans vidéo : affiche la couverture de la formation */}
                  {!currentIsVideoFile && !currentYoutubeEmbed ? (
                    <>
                      <img
                        src={course.image}
                        alt={currentLesson?.title}
                        className="w-full h-full object-cover opacity-40"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-gradient-to-t from-black/80 via-black/30 to-black/60">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#D69E25] text-[#021231] flex items-center justify-center shadow-2xl">
                          {currentLesson?.type === "article" ? (
                            <FileText className="w-7 h-7 sm:w-8 sm:h-8" />
                          ) : (
                            <PlayCircle className="w-9 h-9 sm:w-10 sm:h-10" />
                          )}
                        </div>
                        <span className="text-white font-extrabold text-sm sm:text-base max-w-md">
                          {currentLesson?.title || "Session de formation FORTIA HUB"}
                        </span>
                        <span className="text-xs text-[#D69E25] font-semibold bg-black/60 px-3 py-1 rounded-full border border-[#D69E25]/40">
                          {currentLesson?.type === "article"
                            ? "Leçon Article"
                            : `Vidéo HD • ${currentLesson?.duration || "20 min"}`}
                        </span>
                      </div>
                    </>
                  ) : currentYoutubeEmbed ? (
                    <iframe
                      className="absolute inset-0 w-full h-full border-0"
                      src={currentYoutubeEmbed}
                      title={currentLesson?.title || "Vidéo de formation FORTIA HUB"}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      key={currentLesson?.id}
                      className="absolute inset-0 w-full h-full object-contain bg-black"
                      src={localVideoUrl ? localVideoUrl.url : currentLesson?.videoUrl}
                      poster={course.image}
                      controls
                      controlsList="nodownload"
                      playsInline
                      preload="metadata"
                      onEnded={() => {
                        if (currentLesson?.id && !completedLessonIds.includes(currentLesson.id)) {
                          toggleLessonComplete(currentLesson.id);
                        }
                      }}
                    >
                      Votre navigateur ne supporte pas la lecture vidéo HTML5.
                    </video>
                  )}
                </div>

                {/* ===== Vidéo hors-ligne (copie locale chiffrée AES) ===== */}
                {hasAccess && currentIsVideoFile && userAccountId && currentLesson?.id && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    {currentLesson.videoProtected && (
                      <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                        <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          🔒 Cette vidéo est <strong>cryptée par le formateur</strong> — accessible hors connexion sur FORTIA HUB
                          après saisie du code secret fourni par le formateur (description / commentaire de la leçon).
                        </span>
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between">
                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        {offlineReady ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            Disponible hors-ligne (fichier chiffré localement)
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 text-[#AB6F10]" />
                            Regarder plus tard sans connexion
                          </>
                        )}
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        {!offlineReady ? (
                          <button
                            type="button"
                            onClick={downloadForOffline}
                            disabled={offlineBusy || (currentLesson.videoProtected ? offlineCode.trim().length < 4 : false)}
                            className="px-3.5 py-2 bg-[#021231] text-[#D69E25] font-black text-[11px] rounded-lg border border-[#D69E25]/50 transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-[#011D46]"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {offlineBusy ? "Téléchargement..." : "Télécharger hors-ligne"}
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={playLocalCopy}
                              disabled={offlineBusy || (currentLesson.videoProtected ? offlineCode.trim().length < 4 : false)}
                              className="px-3.5 py-2 bg-emerald-600 text-white font-black text-[11px] rounded-lg transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-emerald-500"
                            >
                              ▶ Lire ma copie hors-ligne
                            </button>
                            <button
                              type="button"
                              onClick={removeLocalCopy}
                              className="px-3 py-2 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 font-bold text-[11px] rounded-lg transition"
                            >
                              Supprimer
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {currentLesson.videoProtected && (
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <input
                          type="text"
                          value={offlineCode}
                          onChange={(e) => setOfflineCode(e.target.value)}
                          placeholder="Code secret de déchiffrement fourni par le formateur"
                          className="flex-1 w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#D69E25]"
                        />
                        {offlineReady && (
                          <button
                            type="button"
                            onClick={playLocalCopy}
                            className="w-full sm:w-auto px-3.5 py-2 bg-[#D69E25] text-[#021231] font-black text-[11px] rounded-lg"
                          >
                            Débloquer la lecture
                          </button>
                        )}
                      </div>
                    )}

                    {offlineError && (
                      <p className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                        {offlineError}
                      </p>
                    )}
                  </div>
                )}

                {/* Lesson Description & Actions */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-base text-[#021231]">{currentLesson?.title}</h3>
                    <button
                      onClick={() => toggleLessonComplete(currentLesson?.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        completedLessonIds.includes(currentLesson?.id)
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{completedLessonIds.includes(currentLesson?.id) ? 'Terminée' : 'Marquer terminée'}</span>
                    </button>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed">
                    Dans cette leçon dispensée par <strong>{course.instructor?.name || (course as any).instructorName || "Formateur FORTIA HUB"}</strong>, vous découvrirez les notions clés, les cas pratiques d'application et la méthodologie de travail recommandée par FORTIA HUB.
                  </p>

                  {/* ⭐ Notation en étoiles */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-slate-600 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#D69E25] shrink-0" />
                      Noter cette formation :
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const filled = star <= Math.round(course.rating || 0);
                        return (
                          <button
                            key={star}
                            onClick={() => onRateCourse?.(course.id, star)}
                            title={`Noter ${star} étoile${star > 1 ? "s" : ""}`}
                            className="text-lg leading-none transition hover:scale-125 cursor-pointer"
                          >
                            <span className={filled ? "text-amber-500" : "text-slate-300"}>★</span>
                          </button>
                        );
                      })}
                      <span className="ml-1 text-[11px] text-slate-500 font-semibold">
                        ({course.rating} • {course.reviewsCount || 0})
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <Award className="w-4 h-4 text-[#D69E25] shrink-0 mt-0.5" />
                    <span>
                      Astuce Pédagogique : Prenez des notes synthétiques et complétez les exercices pour valider le quiz final et débloquer votre Certificat Officiel.
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Syllabus Sidebar */}
              <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                  Programme du Cours ({totalLessonsCount} leçons)
                </h4>

                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                  {course.chapters.map((chapter, idx) => (
                    <div key={chapter.id} className="space-y-2">
                      <p className="text-xs font-extrabold text-[#021231]">
                        {chapter.title}
                      </p>
                      <div className="space-y-1">
                        {chapter.lessons.map((lesson) => {
                          const isCurrent = currentLesson?.id === lesson.id;
                          const isDone = completedLessonIds.includes(lesson.id);
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => setCurrentLesson(lesson)}
                              className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                                isCurrent
                                  ? 'bg-[#021231] text-[#D69E25] font-bold'
                                  : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                {isDone ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <PlayCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className="truncate">{lesson.title}</span>
                              </div>
                              <span className="text-[10px] opacity-70 shrink-0 ml-1">{lesson.duration}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: QUIZ EVALUATION */}
          {activeTab === 'quiz' && course.quiz && (
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-[#021231]">Évaluation Connaissances & Acquis</h3>
                <p className="text-xs text-slate-500">Répondez correctement aux questions pour valider votre mention.</p>
              </div>

              <div className="space-y-4">
                {course.quiz.map((q, qi) => {
                  const isCurrent = qi === currentQuizIndex;
                  const isPast = qi < currentQuizIndex;
                  if (isCurrent || quizSubmitted || isPast) {
                    return (
                      <div key={q.id} className="space-y-3">
                        {isPast && quizSubmitted && (
                          <p className="text-[10px] text-slate-400 font-bold">Question {qi + 1} — corrigée</p>
                        )}
                        <div className={`p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 ${!isCurrent && quizSubmitted ? "opacity-90" : ""}`}>
                          <p className="font-bold text-xs text-[#021231]">
                            {qi + 1}. {q.question}
                          </p>
                          <div className="space-y-2">
                            {q.options.map((opt, oIdx) => {
                              const isSelected = quizAnswers[q.id] === oIdx;
                              const isCorrect = q.correctAnswer === oIdx;
                              let optClass = 'bg-white border-slate-200 text-slate-700 hover:border-slate-400';
                              if (quizSubmitted) {
                                if (isCorrect) optClass = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                                else if (isSelected && !isCorrect) optClass = 'bg-rose-50 border-rose-400 text-rose-900';
                              } else if (isSelected) {
                                optClass = 'bg-[#021231] text-[#D69E25] font-bold border-[#D69E25]';
                              }
                              return (
                                <button
                                  key={oIdx}
                                  onClick={() => !quizSubmitted && setQuizAnswers({ ...quizAnswers, [q.id]: oIdx })}
                                  className={`w-full text-left p-3 rounded-lg border text-xs transition ${optClass}`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                          {quizSubmitted && (
                            <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded border border-slate-200 italic">
                              💡 <strong>Explication :</strong> {q.explanation || "Aucune explication fournie."}
                            </p>
                          )}
                        </div>
                        {/* Autres questions : aperçu flouté / verrouillé */}
                        {isCurrent && qi + 1 < (course.quiz || []).length && (
                          <div className="relative blur-[6px] select-none pointer-events-none opacity-60 p-4 bg-slate-100 rounded-xl border border-dashed border-slate-300">
                            <p className="font-bold text-xs text-slate-400">
                              Question {qi + 2} — Répondez d'abord à la question {qi + 1}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">{(course.quiz || [])[qi + 1].question}</p>
                          </div>
                        )}
                      </div>
                    );
                  }
                  // Questions suivantes verrouillées (non visibles)
                  return (
                    <div key={q.id} className="hidden" aria-hidden="true" />
                  );
                })}
              </div>

              {!quizSubmitted ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentQuizIndex((i) => Math.max(0, i - 1))}
                      disabled={currentQuizIndex === 0}
                      className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-slate-200"
                    >
                      ← Précédente
                    </button>
                    <span className="text-[11px] font-black text-slate-500">
                      Question {currentQuizIndex + 1} / {course.quiz.length}
                    </span>
                    {currentQuizIndex < course.quiz.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentQuizIndex((i) => i + 1)}
                        disabled={quizAnswers[course.quiz[currentQuizIndex].id] === undefined}
                        className="px-4 py-2.5 bg-[#021231] text-[#D69E25] font-extrabold text-xs rounded-lg shadow transition disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-[#011D46]"
                      >
                        Question suivante →
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!course.quiz.every((q) => quizAnswers[q.id] !== undefined)}
                        onClick={() => {
                          setQuizSubmitted(true);
                          markAllComplete();
                        }}
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-black text-xs rounded-lg shadow transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Valider mes réponses ✓
                      </button>
                    )}
                  </div>
                  {currentQuizIndex < course.quiz.length - 1 &&
                    quizAnswers[course.quiz[currentQuizIndex].id] === undefined && (
                      <p className="text-center text-[11px] font-semibold text-amber-600">
                        Choisissez une réponse pour débloquer la question suivante (les autres questions restent floutées).
                      </p>
                    )}
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <p className="font-bold text-emerald-800 text-sm">🎉 Bravo ! Votre Quiz est validé avec succès !</p>
                  <button
                    onClick={() => setActiveTab('certificate')}
                    className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition"
                  >
                    Obtenir mon Attestation Officielle
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CERTIFICATE GENERATOR — déblocage après 100 %, quiz validé ET règlement accepté */}
          {activeTab === 'certificate' && (
            <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-[#D69E25]/40 shadow-xl space-y-5 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-[#D69E25] flex items-center justify-center mx-auto border-2 border-[#D69E25]">
                <Award className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-[#021231]">
                  Attestation d&apos;Accomplissement Officielle
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Délivrée par <strong>FORTIA HUB</strong> au titulaire ci-dessous avec numéro unique et QR Code d&apos;authentification.
                </p>
              </div>

              {/* Étapes de déblocage */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
                {[
                  { label: "Formation terminée", detail: `${progressPercent}%`, ok: isCourseCompleted },
                  { label: course.quiz && course.quiz.length > 0 ? "Quiz validé" : "Contenu validé", detail: quizComplete ? "Fait ✓" : "En cours", ok: quizComplete },
                  { label: "Règlement accepté", detail: rulesAccepted ? "Accepté ✓" : "À accepter", ok: rulesAccepted },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs font-bold ${
                      s.ok ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    {s.ok ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="leading-tight">{s.label}</p>
                      <p className="text-[10px] opacity-70">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Règlement de délivrance — obligatoire avant toute délivrance */}
              <div
                className={`rounded-2xl border p-4 space-y-3 text-left transition ${
                  rulesAccepted ? "bg-emerald-50 border-emerald-300" : "bg-amber-50 border-amber-200"
                }`}
              >
                <p className="text-xs font-black text-[#021231] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#AB6F10]" /> Règlement de certification FORTIA HUB
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
                  <li className="flex items-start gap-1.5"><span className="text-[#D69E25] mt-0.5">●</span> J&apos;atteste avoir réalisé personnellement l&apos;intégralité de cette formation sur FORTIA HUB.</li>
                  <li className="flex items-start gap-1.5"><span className="text-[#D69E25] mt-0.5">●</span> Je m&apos;engage à ne pas revendiquer ni partager ce certificat de manière frauduleuse.</li>
                  <li className="flex items-start gap-1.5"><span className="text-[#D69E25] mt-0.5">●</span> Je respecte les droits d&apos;auteur des formateurs (pas de redistribution des vidéos/cours).</li>
                  <li className="flex items-start gap-1.5"><span className="text-[#D69E25] mt-0.5">●</span> Toute fraude entraîne la révocation de l&apos;attestation et du compte.</li>
                </ul>
                <label
                  className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition ${
                    rulesAccepted ? "border-emerald-400 bg-white" : "border-[#D69E25]/50 bg-white"
                  } ${!isCourseCompleted || !quizComplete ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={rulesAccepted}
                    disabled={!isCourseCompleted || !quizComplete}
                    onChange={(e) => setRulesAccepted(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-emerald-600"
                  />
                  <span className="text-[11px] font-bold text-slate-700">
                    J&apos;accepte le règlement ci-dessus et je demande la délivrance officielle de mon attestation.
                    {(!isCourseCompleted || !quizComplete) && (
                      <span className="block text-[10px] font-semibold text-amber-600 mt-1">
                        🔒 Disponible une fois la formation terminée à 100 % {course.quiz && course.quiz.length > 0 ? "et le quiz validé" : ""}.
                      </span>
                    )}
                  </span>
                </label>
              </div>

              {/* Certificate Preview Card */}
              <div className="bg-[#021231] text-white p-5 rounded-xl border-2 border-[#D69E25] shadow-2xl relative space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-[#D69E25]/30 pb-3">
                  <span className="font-black text-[11px] text-[#D69E25] tracking-widest uppercase">
                    FORTIA HUB • ATTESTATION
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-300 font-mono truncate">
                    N° {currentCertificate.id}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="flex-1 space-y-1 py-1 text-center sm:text-left">
                    <p className="text-[11px] text-slate-300">Décerné à :</p>
                    <p className="text-lg sm:text-xl font-black text-white tracking-wide uppercase">{currentCertificate.studentName}</p>
                    <p className="text-xs text-[#D69E25] font-semibold pt-1">
                      « {currentCertificate.courseTitle} »
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-0.5 pt-2 border-t border-[#D69E25]/30 text-[10px] text-slate-300">
                      <span>Délivré le : {currentCertificate.issueDate}</span>
                      <span className="text-emerald-400 font-bold">✓ Authenticité Vérifiée</span>
                    </div>
                  </div>
                  <div className="shrink-0 bg-white rounded-lg p-1.5 shadow-md">
                    <img
                      src={currentCertificate.qrCodeUrl}
                      alt={`QR Code attestation ${currentCertificate.id}`}
                      className="w-20 h-20 object-contain"
                      loading="lazy"
                    />
                    <p className="text-[7px] text-slate-500 text-center font-bold mt-0.5">QR UNIQUE</p>
                  </div>
                </div>
              </div>

              {certificateGranted && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Attestation enregistrée dans votre compte — onglet « Attestations » de votre Espace Membre.
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleDownloadCertificate}
                  disabled={!isCourseCompleted || !quizComplete || !rulesAccepted}
                  className="w-full sm:w-auto px-6 py-3 bg-[#021231] text-[#D69E25] font-black text-xs rounded-xl border border-[#D69E25]/50 shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-[#011D46]"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger le PDF</span>
                </button>
                <button
                  onClick={handleGrantCertificate}
                  disabled={!isCourseCompleted || !quizComplete || !rulesAccepted || certificateGranted}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#D69E25] via-[#F6E05E] to-[#AB6F10] bg-[length:200%_auto] hover:bg-right text-[#021231] font-black text-xs rounded-xl shadow-lg shadow-[#D69E25]/30 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{certificateGranted ? "Attestation délivrée ✓" : "Délivrer mon Attestation"}</span>
                </button>
              </div>
              {(!isCourseCompleted || !quizComplete) && (
                <p className="text-[11px] font-semibold text-amber-600">
                  ⏳ Terminez les {totalLessonsCount} leçons {course.quiz && course.quiz.length > 0 ? "et validez le quiz " : ""}pour débloquer votre attestation.
                </p>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
