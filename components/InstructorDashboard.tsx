"use client";

import React, { useState, useRef } from "react";
import {
  GraduationCap,
  Plus,
  Video,
  HardDrive,
  DollarSign,
  Users,
  Trash2,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  BookOpen,
  Download,
  UploadCloud,
} from "lucide-react";
import { TrainingCenter, Course, InstructorCommission, InstructorStoragePurchase } from "@/lib/types";
import { uploadCourseVideoDirect, uploadFileToR2 } from "@/lib/services/clientUpload";
import { hashSecret } from "@/lib/services/offlineVideo";
import { SuccessConfirmationModal } from "./SuccessConfirmationModal";

interface InstructorDashboardProps {
  center: TrainingCenter | null;
  courses: Course[];
  commissions: InstructorCommission[];
  storagePurchases: InstructorStoragePurchase[];
  isUserLoggedIn: boolean;
  userEmail?: string;
  onCreateCenter: (data: { centerName: string; description: string }) => void;
  onAddCourse: (course: Course) => void;
  onUpdateCourse: (courseId: string, updates: Partial<Course>) => void;
  onSuspendCourse: (courseId: string) => void;
  onDeleteCourse: (courseId: string) => void;
  onBuyStorage: (center: TrainingCenter, amountGb: number, amountUsd: number) => void;
  onOpenAuthModal: () => void;
}

export const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  center,
  courses,
  commissions,
  storagePurchases,
  isUserLoggedIn,
  userEmail,
  onCreateCenter,
  onAddCourse,
  onUpdateCourse,
  onSuspendCourse,
  onDeleteCourse,
  onBuyStorage,
  onOpenAuthModal,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "lectures" | "add" | "storage">("overview");
  const [showCourseSuccess, setShowCourseSuccess] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [centerName, setCenterName] = useState("");
  const [centerDesc, setCenterDesc] = useState("");

  // New course form
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("ai");
  const [price, setPrice] = useState(25);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [durationHours, setDurationHours] = useState(1);
  const [lessonsCount, setLessonsCount] = useState(1);
  const [level, setLevel] = useState("Debutant");

  // Chapters & lessons builder
  const [chapters, setChapters] = useState<
    {
      title: string;
      lessons: {
        id?: string;
        title: string;
        duration: string;
        type: "video" | "article";
        videoUrl: string;
        videoProtected?: boolean;
        videoCodeHash?: string;
      }[];
    }[]
  >([]);
  const [chapterTitle, setChapterTitle] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDuration, setLessonDuration] = useState("15 min");
  const [lessonType, setLessonType] = useState<"video" | "article">("video");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [activeChapterIdx, setActiveChapterIdx] = useState<number | null>(null);

  // Quiz builder
  const [quizQuestions, setQuizQuestions] = useState<
    { question: string; options: string[]; correctAnswer: number; explanation: string }[]
  >([]);
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizOptions, setQuizOptions] = useState<string[]>(["", "", "", ""]);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizExplanation, setQuizExplanation] = useState("");

  // Video file upload
  const videoFileRef = useRef<HTMLInputElement>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState("");
  const [videoSecretCode, setVideoSecretCode] = useState("");
  // Image de couverture : upload fichier (pas seulement URL)
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const myCourses = (courses || []).filter((c) => c.instructorId === center?.ownerId || c.centerId === center?.id);
  const totalStudents = myCourses.reduce((s, c) => s + (c.studentsCount || 0), 0);
  const totalEarnings = (commissions || [])
    .filter((c) => c.instructorId === center?.ownerId)
    .reduce((s, c) => s + c.instructorEarningsUsd, 0);

  const usedGb = center ? center.storageUsedBytes / (1024 * 1024 * 1024) : 0;
  const usedPct = center && center.storageQuotaGb > 0 ? Math.min((usedGb / center.storageQuotaGb) * 100, 100) : 0;

  if (!isUserLoggedIn) {
    return (
      <div className="py-16 px-4 max-w-2xl mx-auto text-center space-y-6">
        <div className="p-8 sm:p-10 bg-[#011D46]/90 border-2 border-[#D69E25]/40 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center mx-auto shadow-inner">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Espace Formateur Réservé aux Membres</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium max-w-lg mx-auto">
            Connectez-vous à votre compte pour ouvrir votre Centre de Formation, publier vos
            formations et suivre vos revenus.
          </p>
          <button
            onClick={onOpenAuthModal}
            className="px-6 py-3 bg-[#D69E25] text-[#021231] font-black rounded-xl text-xs shadow-lg hover:bg-amber-400 transition cursor-pointer"
          >
            Se Connecter / S'inscrire
          </button>
        </div>
      </div>
    );
  }

  if (!center || !center.id) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-8">
        {/* Bouton retour */}
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/member";
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#011D46] border border-[#D69E25]/40 text-[#D69E25] text-xs font-black rounded-xl hover:bg-[#032454] hover:border-[#D69E25]/70 transition shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Retour à mon Espace Membre</span>
        </button>

        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-[#011D46] border border-[#D69E25]/50 px-4 py-1.5 rounded-full text-xs font-bold text-[#D69E25] shadow-lg">
            <GraduationCap className="w-4 h-4" />
            <span>Devenir Formateur FORTIA HUB</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Ouvrez votre <span className="text-[#D69E25]">Centre de Formation</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto font-medium">
            Créez votre centre de formation en payant <strong className="text-[#D69E25]">2 $ US</strong>.
            Obtenez <strong className="text-[#D69E25]">4 GB de stockage vidéo</strong> offert pour vos cours.
          </p>
        </div>

        <div className="bg-[#011D46] border border-[#D69E25]/40 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
          <div>
            <label className="text-xs text-slate-300 block mb-1 font-bold">Nom de votre Centre de Formation *</label>
            <input
              type="text"
              value={centerName}
              onChange={(e) => setCenterName(e.target.value)}
              placeholder="Ex: Académie Digital Pro"
              className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
            />
          </div>
          <div>
            <label className="text-xs text-slate-300 block mb-1 font-bold">Description du centre (bio)</label>
            <textarea
              rows={3}
              value={centerDesc}
              onChange={(e) => setCenterDesc(e.target.value)}
              placeholder="Présentez votre centre et vos formations..."
              className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="bg-[#021231] border border-slate-700 rounded-xl p-3">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Frais d'ouverture</span>
              <span className="text-xl font-black text-[#D69E25]">2 $ US</span>
            </div>
            <div className="bg-[#021231] border border-slate-700 rounded-xl p-3">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Stockage vidéo inclus</span>
              <span className="text-xl font-black text-emerald-400">4 GB</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (!centerName.trim()) {
                alert("Veuillez indiquer le nom de votre centre.");
                return;
              }
              onCreateCenter({ centerName, description: centerDesc });
            }}
            className="w-full py-3.5 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition shadow-lg flex items-center justify-center gap-2"
          >
            Ouvrir mon Centre (2 $ US) — Démarrer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#021231] text-white min-h-screen pb-16 space-y-8">
      {/* Header */}
      <div className="bg-[#011D46] border-b border-[#D69E25]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
          {/* Bouton retour */}
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/member";
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#021231] border border-[#D69E25]/40 text-[#D69E25] text-xs font-black rounded-xl hover:bg-[#032454] hover:border-[#D69E25]/70 transition shadow"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Retour à mon Espace Membre</span>
          </button>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#D69E25]/20 border-2 border-[#D69E25] flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-[#D69E25]" />
              </div>
              <div>
                <h1 className="text-2xl font-black">{center.centerName}</h1>
                <p className="text-xs text-slate-300">{userEmail}</p>
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Centre actif
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("add")}
              className="px-5 py-2.5 bg-[#D69E25] hover:bg-amber-400 text-[#021231] font-black text-xs rounded-xl transition shadow flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une Formation</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-[#011D46] border border-slate-800 p-5 rounded-3xl">
            <span className="text-[11px] text-slate-400 font-semibold block">Mes Formations</span>
            <span className="text-2xl font-black">{myCourses.length}</span>
          </div>
          <div className="bg-[#011D46] border border-slate-800 p-5 rounded-3xl">
            <span className="text-[11px] text-slate-400 font-semibold block">Étudiants</span>
            <span className="text-2xl font-black">{totalStudents}</span>
          </div>
          <div className="bg-[#011D46] border border-slate-800 p-5 rounded-3xl">
            <span className="text-[11px] text-slate-400 font-semibold block">Revenus</span>
            <span className="text-2xl font-black text-emerald-400">${totalEarnings}</span>
          </div>
          <div className="bg-[#011D46] border border-slate-800 p-5 rounded-3xl">
            <span className="text-[11px] text-slate-400 font-semibold block">Stockage</span>
            <span className="text-2xl font-black">{usedGb.toFixed(2)} <span className="text-xs text-slate-400">/ {center.storageQuotaGb} GB</span></span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
          <button onClick={() => setActiveTab("overview")} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === "overview" ? "bg-[#D69E25] text-[#021231]" : "text-slate-300 hover:bg-slate-800"}`}>
            Résumé
          </button>
          <button onClick={() => setActiveTab("lectures")} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === "lectures" ? "bg-[#D69E25] text-[#021231]" : "text-slate-300 hover:bg-slate-800"}`}>
            Mes Formations ({myCourses.length})
          </button>
          <button onClick={() => setActiveTab("storage")} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === "storage" ? "bg-[#D69E25] text-[#021231]" : "text-slate-300 hover:bg-slate-800"}`}>
            Stockage & Vidéos
          </button>
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="bg-[#011D46] border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#D69E25]" /> Stockage Vidéo (4 GB inclus)
              </h3>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div className="bg-[#D69E25] h-2.5 rounded-full" style={{ width: `${usedPct}%` }} />
              </div>
              <p className="text-xs text-slate-300">
                {usedGb.toFixed(2)} GB utilisés sur {center.storageQuotaGb} GB
                {usedPct >= 90 ? " — Vous avez atteint la limite, ajoutez de l'espace." : " — Vidéos de vos formations hébergées sur Cloudflare R2."}
              </p>
              {usedPct >= 90 && (
                <button
                  onClick={() => setActiveTab("storage")}
                  className="px-4 py-2 bg-[#D69E25] text-[#021231] font-bold text-xs rounded-xl hover:bg-amber-400 transition"
                >
                  Acheter plus d'espace
                </button>
              )}
            </div>

            {myCourses.length === 0 ? (
              <div className="bg-[#011D46] border border-slate-800 rounded-3xl p-12 text-center space-y-4">
                <BookOpen className="w-12 h-12 text-slate-500 mx-auto" />
                <h3 className="text-lg font-bold">Aucune formation publiée</h3>
                <p className="text-xs text-slate-400">Ajoutez votre première formation pour commencer à vendre.</p>
                <button onClick={() => setActiveTab("add")} className="px-6 py-3 bg-[#D69E25] text-[#021231] font-bold text-xs rounded-xl hover:bg-amber-400 transition">
                  Ajouter une Formation
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myCourses.map((c) => (
                  <div key={c.id} className="bg-[#011D46] border border-slate-800 rounded-3xl overflow-hidden">
                    {c.image ? (
                      <img src={c.image} alt={c.title} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 bg-slate-800 flex items-center justify-center">
                        <Video className="w-8 h-8 text-slate-600" />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <span className="text-[10px] text-[#D69E25] font-bold uppercase">{c.categoryLabel}</span>
                      <h4 className="font-bold text-sm line-clamp-2">{c.title}</h4>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-[#D69E25]">${c.price}</span>
                        <span className="text-slate-400">{c.studentsCount} étudiants</span>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => {
                            setEditingCourseId(c.id);
                            setEditingCourse(c);
                            setTitle(c.title);
                            setCategory(String(c.category || (c as any).categoryId || "ai"));
                            setPrice(c.price || 25);
                            setDescription(c.description || "");
                            setImage(c.image || "");
                            setDurationHours(c.durationHours || 1);
                            setLessonsCount(c.lessonsCount || 1);
                            setLevel(
                              String(c.level || (c as any).level || "Debutant")
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "")
                                .replace(/\s+/g, "_")
                                .replace(/[^a-zA-Z0-9_]/g, "")
                            );
                            setChapters(
                              (c.chapters || []).map((ch: any) => ({
                                title: ch.title,
                                lessons: (ch.lessons || []).map((l: any) => ({
                                  title: l.title,
                                  duration: l.duration || "15 min",
                                  type: l.type === "quiz" ? ("article" as const) : ((l.type || "video") as "video" | "article"),
                                  videoUrl: l.videoUrl || "",
                                  videoProtected: (l as any).videoProtected,
                                  videoCodeHash: (l as any).videoCodeHash || "",
                                })),
                              }))
                            );
                            setQuizQuestions(c.quiz || []);
                            setActiveTab("add");
                          }}
                          className="px-2 py-1.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg text-[10px] font-bold"
                        >
                          Modifier
                        </button>
                        <button onClick={() => onSuspendCourse(c.id)} className="flex-1 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1">
                          <EyeOff className="w-3 h-3" /> Suspendre
                        </button>
                        <button onClick={() => onDeleteCourse(c.id)} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lectures list */}
        {activeTab === "lectures" && (
          <div className="space-y-3">
            {myCourses.map((c) => (
              <div key={c.id} className="bg-[#011D46] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-[#D69E25]" />
                  <div>
                    <p className="font-bold text-sm">{c.title}</p>
                    <p className="text-[10px] text-slate-400">{c.lessonsCount} leçons • {c.durationHours}h • ${c.price}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingCourseId(c.id);
                      setEditingCourse(c);
                      setTitle(c.title);
                      setCategory(String(c.category || (c as any).categoryId || "ai"));
                      setPrice(c.price || 25);
                      setDescription(c.description || "");
                      setImage(c.image || "");
                      setDurationHours(c.durationHours || 1);
                      setLessonsCount(c.lessonsCount || 1);
                      setLevel(
                        String(c.level || (c as any).level || "Debutant")
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/\s+/g, "_")
                          .replace(/[^a-zA-Z0-9_]/g, "")
                      );
                      setChapters(
                        (c.chapters || []).map((ch: any) => ({
                          title: ch.title,
                          lessons: (ch.lessons || []).map((l: any) => ({
                            title: l.title,
                            duration: l.duration || "15 min",
                            type: l.type === "quiz" ? ("article" as const) : ((l.type || "video") as "video" | "article"),
                            videoUrl: l.videoUrl || "",
                                  videoProtected: (l as any).videoProtected,
                                  videoCodeHash: (l as any).videoCodeHash || "",
                          })),
                        }))
                      );
                      setQuizQuestions(c.quiz || []);
                      setActiveTab("add");
                    }}
                    className="px-3 py-1.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg text-[10px] font-bold"
                  >
                    Modifier
                  </button>
                  <button onClick={() => onSuspendCourse(c.id)} className="px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-lg text-[10px] font-bold">Suspendre</button>
                  <button onClick={() => onDeleteCourse(c.id)} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-[10px] font-bold">Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add course */}
        {activeTab === "add" && (
          <div className="bg-[#011D46] border border-[#D69E25]/40 rounded-3xl p-6 sm:p-8 space-y-5 max-w-2xl">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#D69E25]" /> Publier une nouvelle Formation
            </h3>
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-bold">Titre de la formation *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Masterclass IA 2026" className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Catégorie</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white">
                  <option value="ai">Intelligence Artificielle</option>
                  <option value="crypto">Cryptomonnaie</option>
                  <option value="canva">Canva</option>
                  <option value="marketing">Marketing Digital</option>
                  <option value="dev_web">Développement Web</option>
                  <option value="entrepreneurship">Entrepreneuriat</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Prix ($ US) *</label>
                <input type="number" min="1" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Durée (heures)</label>
                <input type="number" min="1" value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Nombre de leçons</label>
                <input type="number" min="1" value={lessonsCount} onChange={(e) => setLessonsCount(Number(e.target.value))} className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Niveau</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white">
                <option value="Debutant">Débutant</option>
                <option value="Intermediaire">Intermédiaire</option>
                <option value="Avance">Avancé</option>
                <option value="Expert">Expert</option>
                <option value="Tous_niveaux">Tous niveaux</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Description</label>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez votre formation..." className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-300 block font-bold">Image de couverture</label>
              {image && (
                <div className="relative w-full sm:w-64 rounded-xl overflow-hidden border border-slate-700">
                  <img src={image} alt="Aperçu couverture" className="w-full h-32 object-cover" />
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  ref={coverFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type?.startsWith("image/")) {
                      alert("Veuillez choisir une image (JPG, PNG, WebP…).");
                      return;
                    }
                    setUploadingCover(true);
                    try {
                      const result = await uploadFileToR2(file, "store-images", center?.id || "instructor", true);
                      if (result.success) {
                        setImage(result.url);
                      } else {
                        alert(result.error || "Erreur lors de l'upload de l'image.");
                      }
                    } finally {
                      setUploadingCover(false);
                      if (coverFileRef.current) coverFileRef.current.value = "";
                    }
                  }}
                />
                <input
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="URL externe ou cliquez sur Parcourir…"
                  className="flex-1 bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white"
                />
                <button
                  type="button"
                  onClick={() => !uploadingCover && coverFileRef.current?.click()}
                  disabled={uploadingCover}
                  className="shrink-0 px-4 py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <UploadCloud className="w-4 h-4" />
                  {uploadingCover ? "Upload…" : "📁 Parcourir"}
                </button>
              </div>
            </div>

            {/* ===== ÉDITEUR CHAPITRES & LEÇONS (vidéos) ===== */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <h4 className="font-bold text-sm text-[#D69E25] flex items-center gap-2">
                <Video className="w-4 h-4" /> Chapitres & Leçons (Cours & Vidéos)
              </h4>
              <p className="text-[10px] text-slate-400">
                Chaque chapitre contient des leçons (vidéo ou article). Les vidéos apparaissent dans le lecteur de formation.
              </p>

              {chapters.map((ch, ci) => (
                <div key={ci} className="bg-[#021231] border border-slate-700 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Chapitre {ci + 1} : {ch.title}</span>
                    <button onClick={() => setChapters(chapters.filter((_, i) => i !== ci))} className="text-red-400 text-[10px]">Supprimer</button>
                  </div>
                  {ch.lessons.map((l, li) => (
                    <div key={li} className="flex items-center justify-between text-[11px] text-slate-300 bg-[#011D46] rounded-lg p-2">
                      <span className="flex items-center gap-1.5">
                        {l.type === "video" ? <Video className="w-3.5 h-3.5 text-[#D69E25]" /> : <BookOpen className="w-3.5 h-3.5 text-sky-400" />}
                        {l.title} • {l.duration}
                      </span>
                      {l.type === "video" && l.videoUrl ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/40 rounded-full px-2 py-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Vidéo enregistrée ✓
                        </span>
                      ) : l.type === "video" && !l.videoUrl ? (
                        <span className="shrink-0 text-[10px] font-bold text-red-400">Vidéo manquante ⚠</span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-bold text-sky-400">Leçon Article</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {chapters.length === 0 && (
                <p className="text-[11px] text-slate-500 italic">Aucun chapitre ajouté. Ajoutez vos chapitres avec leurs leçons vidéo ci-dessous.</p>
              )}

              {/* Chapitre en cours de création */}
              <div className="bg-[#021231] border border-slate-700 rounded-xl p-3.5 space-y-2.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    placeholder="Titre du chapitre (Ex: Introduction)"
                    className="flex-1 bg-[#011D46] border border-slate-700 text-xs rounded-lg p-2.5 text-white"
                  />
                  <button
                    onClick={() => {
                      if (!chapterTitle.trim()) { alert("Indiquez un titre de chapitre."); return; }
                      setChapters([...chapters, { title: chapterTitle, lessons: [] }]);
                      setActiveChapterIdx(chapters.length);
                      setChapterTitle("");
                    }}
                    className="px-4 py-2 bg-[#D69E25] text-[#021231] font-bold text-xs rounded-lg"
                  >
                    + Chapitre
                  </button>
                </div>
              </div>

              {/* Ajout leçon au chapitre sélectionné */}
              {activeChapterIdx !== null && chapters[activeChapterIdx] && (
                <div className="bg-[#021231] border border-[#D69E25]/40 rounded-xl p-3.5 space-y-2.5">
                  <p className="text-[10px] font-bold text-[#D69E25]">
                    Ajouter une leçon au chapitre : {chapters[activeChapterIdx].title}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      placeholder="Titre de la leçon"
                      className="bg-[#011D46] border border-slate-700 text-xs rounded-lg p-2.5 text-white"
                    />
                    <input
                      type="text"
                      value={lessonDuration}
                      onChange={(e) => setLessonDuration(e.target.value)}
                      placeholder="Durée (Ex: 15 min)"
                      className="bg-[#011D46] border border-slate-700 text-xs rounded-lg p-2.5 text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={lessonType}
                      onChange={(e) => setLessonType(e.target.value as "video" | "article")}
                      className="bg-[#011D46] border border-slate-700 text-xs rounded-lg p-2.5 text-white"
                    >
                      <option value="video">Leçon Vidéo</option>
                      <option value="article">Leçon Article</option>
                    </select>

                    {lessonType === "video" && (
                      <>
                        <input
                          ref={videoFileRef}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (!file.type?.startsWith("video/")) {
                              setVideoUploadProgress("");
                              alert("Veuillez choisir un fichier vidéo (MP4, MOV, WebM, MKV…).");
                              return;
                            }
                            setUploadingVideo(true);
                            setVideoUploadProgress("Préparation de l'upload de la vidéo…");
                            try {
                              const result = await uploadCourseVideoDirect(
                                file,
                                center?.id || "instructor",
                                (pct) => {
                                  setVideoUploadProgress(`Upload vidéo : ${pct}%`);
                                }
                              );
                              if (result.success) {
                                setLessonVideoUrl(result.url);
                                setVideoUploadProgress("");
                              } else {
                                setVideoUploadProgress("");
                                alert(result.error || "Erreur lors de l'upload de la vidéo.");
                              }
                            } catch (err: any) {
                              setVideoUploadProgress("");
                              alert(err?.message || "Erreur lors de l'upload de la vidéo.");
                            } finally {
                              setUploadingVideo(false);
                              if (videoFileRef.current) videoFileRef.current.value = "";
                            }
                          }}
                        />
                        <div className="flex flex-1 flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={lessonVideoUrl}
                            onChange={(e) => setLessonVideoUrl(e.target.value)}
                            placeholder="URL vidéo (MP4, R2...) ou cliquez pour choisir un fichier"
                            className="flex-1 bg-[#011D46] border border-slate-700 text-xs rounded-lg p-2.5 text-white"
                          />
                          <button
                            type="button"
                            onClick={() => !uploadingVideo && videoFileRef.current?.click()}
                            disabled={uploadingVideo}
                            className="px-3 py-2 bg-[#D69E25] text-[#021231] font-bold text-xs rounded-lg hover:bg-amber-400 transition flex items-center gap-1.5 shrink-0"
                          >
                            {uploadingVideo ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Upload…</>
                            ) : lessonVideoUrl ? (
                              <><CheckCircle2 className="w-3.5 h-3.5" /> Vidéo uploadée ✓</>
                            ) : (
                              <><UploadCloud className="w-3.5 h-3.5" /> Fichier</>
                            )}
                          </button>
                        </div>

                        {lessonVideoUrl && !uploadingVideo && (
                          <div className="space-y-2">
                            <div className="rounded-xl overflow-hidden border border-emerald-500/40 bg-black">
                              <video
                                key={lessonVideoUrl}
                                src={lessonVideoUrl}
                                controls
                                playsInline
                                preload="metadata"
                                className="w-full max-h-60 bg-black object-contain"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Vidéo prête — elle s&apos;affichera dans le lecteur de la formation.
                              </p>
                              <button
                                type="button"
                                onClick={() => { setLessonVideoUrl(""); setVideoUploadProgress(""); }}
                                className="text-[10px] text-slate-400 hover:text-red-400 font-bold transition"
                                title="Retirer cette vidéo"
                              >
                                ✕ Retirer
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {lessonType === "article" && (
                      <input
                        type="text"
                        value={lessonVideoUrl}
                        onChange={(e) => setLessonVideoUrl(e.target.value)}
                        placeholder="Contenu / URL article"
                        className="flex-1 bg-[#011D46] border border-slate-700 text-xs rounded-lg p-2.5 text-white"
                      />
                    )}
                  </div>
                  {videoUploadProgress && (
                    <p className="text-[10px] text-[#D69E25] flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> {videoUploadProgress}
                    </p>
                  )}
                  {lessonVideoUrl && (
                    <div className="space-y-1.5">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={videoSecretCode}
                          onChange={(e) => setVideoSecretCode(e.target.value)}
                          placeholder="🔒 Code secret (facultatif) — protège la copie hors-ligne"
                          className="flex-1 bg-[#011D46] border border-amber-500/40 text-xs rounded-lg p-2.5 text-white placeholder:text-slate-500"
                        />
                        {videoSecretCode.trim() && (
                          <button
                            type="button"
                            onClick={() => setVideoSecretCode("")}
                            className="px-3 py-2 bg-slate-800 text-slate-300 hover:text-red-400 text-[10px] font-bold rounded-lg"
                          >
                            ✕ Retirer le code
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {videoSecretCode.trim().length >= 4
                          ? "✅ La copie hors-ligne sera chiffrée. Communiquez ce code aux apprenants (description / commentaire) — sans lui, la vidéo restera illisible hors connexion."
                          : "Si vous saisissez un code (4 caractères min.), la copie hors-ligne sera chiffrée AES et ne pourra être lue qu'avec ce code."}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={async () => {
                      if (!lessonTitle.trim()) { alert("Indiquez un titre de leçon."); return; }
                      let videoProtected = false;
                      let videoCodeHash = "";
                      const code = videoSecretCode.trim();
                      if (lessonType === "video" && code) {
                        if (code.length < 4) { alert("Le code secret doit contenir au moins 4 caractères."); return; }
                        videoProtected = true;
                        videoCodeHash = await hashSecret(code);
                      }
                      const updated = [...chapters];
                      updated[activeChapterIdx] = {
                        ...updated[activeChapterIdx],
                        lessons: [
                          ...updated[activeChapterIdx].lessons,
                          {
                            id: `lesson-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                            title: lessonTitle,
                            duration: lessonDuration,
                            type: lessonType,
                            videoUrl: lessonVideoUrl,
                            videoProtected,
                            videoCodeHash,
                          },
                        ],
                      };
                      setChapters(updated);
                      setLessonTitle(""); setLessonDuration("15 min"); setLessonVideoUrl(""); setVideoSecretCode("");
                    }}
                    className="px-4 py-2 bg-sky-600 text-white font-bold text-xs rounded-lg"
                  >
                    + Ajouter la Leçon
                  </button>
                </div>
              )}
            </div>

            {/* ===== ÉDITEUR QUIZ D'ÉVALUATION ===== */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <h4 className="font-bold text-sm text-[#D69E25] flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Quiz d'Évaluation
              </h4>
              <p className="text-[10px] text-slate-400">
                Ajoutez les questions du quiz final de la formation (avec options et bonne réponse).
              </p>

              {quizQuestions.map((q, qi) => (
                <div key={qi} className="bg-[#021231] border border-slate-700 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Q{qi + 1} : {q.question}</span>
                    <button onClick={() => setQuizQuestions(quizQuestions.filter((_, i) => i !== qi))} className="text-red-400 text-[10px]">Supprimer</button>
                  </div>
                  <div className="mt-2 space-y-1">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className={`text-[11px] p-1.5 rounded ${oi === q.correctAnswer ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400"}`}>
                        {oi === q.correctAnswer ? "✓ " : "• "}{opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {quizQuestions.length === 0 && (
                <p className="text-[11px] text-slate-500 italic">Aucune question de quiz ajoutée.</p>
              )}

              <div className="bg-[#021231] border border-[#D69E25]/40 rounded-xl p-3.5 space-y-2.5">
                <input
                  type="text"
                  value={quizQuestion}
                  onChange={(e) => setQuizQuestion(e.target.value)}
                  placeholder="Question (Ex: Qu'est-ce que la blockchain ?)"
                  className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-lg p-2.5 text-white"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {quizOptions.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="quizCorrect"
                        checked={quizCorrect === oi}
                        onChange={() => setQuizCorrect(oi)}
                        className="w-3.5 h-3.5"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...quizOptions];
                          next[oi] = e.target.value;
                          setQuizOptions(next);
                        }}
                        placeholder={`Option ${oi + 1}${quizCorrect === oi ? " (bonne réponse)" : ""}`}
                        className="flex-1 bg-[#011D46] border border-slate-700 text-xs rounded-lg p-2 text-white"
                      />
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  value={quizExplanation}
                  onChange={(e) => setQuizExplanation(e.target.value)}
                  placeholder="Explication de la bonne réponse (optionnel)"
                  className="w-full bg-[#011D46] border border-slate-700 text-xs rounded-lg p-2.5 text-white"
                />
                <button
                  onClick={() => {
                    if (!quizQuestion.trim() || quizOptions.some((o) => !o.trim())) { alert("Remplissez la question et les 4 options."); return; }
                    setQuizQuestions([...quizQuestions, { question: quizQuestion, options: [...quizOptions], correctAnswer: quizCorrect, explanation: quizExplanation }]);
                    setQuizQuestion(""); setQuizOptions(["", "", "", ""]); setQuizCorrect(0); setQuizExplanation("");
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg"
                >
                  + Ajouter la Question
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                if (!title.trim()) { alert("Veuillez indiquer un titre."); return; }
                const totalLessons = chapters.reduce((s, ch) => s + ch.lessons.length, 0);
                if (totalLessons === 0) {
                  alert("Ajoutez au moins une leçon (titre + vidéo) en cliquant sur « + Ajouter la Leçon » avant de publier la formation.");
                  return;
                }
                if (lessonTitle.trim() && activeChapterIdx !== null && chapters[activeChapterIdx]) {
                  alert("Vous avez une leçon en cours de saisie : cliquez sur « + Ajouter la Leçon » pour l'enregistrer dans le chapitre avant de publier.");
                  return;
                }

                if (editingCourseId) {
                  // MODE ÉDITION : mettre à jour la formation existante
                  onUpdateCourse(editingCourseId, {
                    title,
                    category: category as any,
                    categoryLabel: category,
                    description,
                    fullDescription: description,
                    durationHours,
                    lessonsCount: totalLessons || lessonsCount,
                    price,
                    image,
                    level: level as any,
                    learningOutcomes: [],
                    chapters: chapters.map((ch, ci) => ({
                      id: `chapter-${Date.now()}-${ci}`,
                      title: ch.title,
                      lessons: ch.lessons.map((l, li) => ({
                        id: `lesson-${Date.now()}-${ci}-${li}`,
                        title: l.title,
                        duration: l.duration,
                        type: l.type,
                        videoUrl: l.videoUrl,
                        videoProtected: (l as any).videoProtected,
                        videoCodeHash: (l as any).videoCodeHash || "",
                      })),
                    })),
                    quiz: quizQuestions.map((q, qi) => ({
                      id: `quiz-${Date.now()}-${qi}`,
                      question: q.question,
                      options: q.options,
                      correctAnswer: q.correctAnswer,
                      explanation: q.explanation,
                    })),
                  } as any);
                } else {
                  // MODE CRÉATION
                  onAddCourse({
                    id: `course-${Date.now()}`,
                    title,
                    slug: title.toLowerCase().replace(/\s+/g, "-"),
                    instructorId: center.ownerId,
                    centerId: center.id,
                    category: category as any,
                    categoryLabel: category,
                    description,
                    fullDescription: description,
                    level: level as any,
                    durationHours,
                    lessonsCount: totalLessons || lessonsCount,
                    price,
                    rating: 5.0,
                    reviewsCount: 0,
                    studentsCount: 0,
                    image,
                    instructor: { name: userEmail || "Formateur", role: "Formateur", avatar: "" },
                    learningOutcomes: [],
                    chapters: chapters.map((ch, ci) => ({
                      id: `chapter-${Date.now()}-${ci}`,
                      title: ch.title,
                      lessons: ch.lessons.map((l, li) => ({
                        id: `lesson-${Date.now()}-${ci}-${li}`,
                        title: l.title,
                        duration: l.duration,
                        type: l.type,
                        videoUrl: l.videoUrl,
                        videoProtected: (l as any).videoProtected,
                        videoCodeHash: (l as any).videoCodeHash || "",
                      })),
                    })),
                    quiz: quizQuestions.map((q, qi) => ({
                      id: `quiz-${Date.now()}-${qi}`,
                      question: q.question,
                      options: q.options,
                      correctAnswer: q.correctAnswer,
                      explanation: q.explanation,
                    })),
                  });
                }
                setEditingCourseId(null); setEditingCourse(null);
                setTitle(""); setDescription(""); setImage("");
                setChapters([]); setQuizQuestions([]); setActiveChapterIdx(null);
                setShowCourseSuccess(true);
              }}
              className="w-full py-3.5 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition shadow-lg flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {editingCourseId ? "Enregistrer les Modifications" : "Publier la Formation (avec cours & quiz)"}
            </button>
          </div>
        )}

        {/* Storage */}
        {activeTab === "storage" && (
          <div className="space-y-6">
            <div className="bg-[#011D46] border border-slate-800 rounded-3xl p-6 space-y-4 max-w-2xl">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#D69E25]" /> Quota de Stockage Vidéo
              </h3>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div className="bg-[#D69E25] h-3 rounded-full" style={{ width: `${usedPct}%` }} />
              </div>
              <p className="text-xs text-slate-300">{usedGb.toFixed(2)} GB / {center.storageQuotaGb} GB utilisés — {usedPct.toFixed(0)}%</p>
            </div>

            <div className="bg-[#011D46] border border-slate-800 rounded-3xl p-6 space-y-4 max-w-2xl">
              <h3 className="font-bold text-sm">Acheter de l'espace supplémentaire</h3>
              <p className="text-xs text-slate-400">Augmentez votre quota au-delà des 4 GB offerts. Tarifs configurables par l'admin.</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { gb: 10, usd: 3 },
                  { gb: 25, usd: 6 },
                  { gb: 50, usd: 10 },
                ].map((p) => (
                  <button
                    key={p.gb}
                    onClick={() => onBuyStorage(center, p.gb, p.usd)}
                    className="p-4 border border-slate-700 rounded-2xl text-center hover:border-[#D69E25] transition bg-[#021231]"
                  >
                    <span className="block text-xl font-black text-[#D69E25]">{p.gb} GB</span>
                    <span className="block text-[10px] text-slate-300">${p.usd} US</span>
                  </button>
                ))}
              </div>
            </div>

            {storagePurchases.length > 0 && (
              <div className="bg-[#011D46] border border-slate-800 rounded-3xl p-6 space-y-2 max-w-2xl">
                <h4 className="font-bold text-sm">Historique d'achat d'espace</h4>
                {storagePurchases.filter((p) => p.instructorId === center.ownerId).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="text-slate-300">{p.amountGb} GB</span>
                    <span className="text-[#D69E25] font-bold">${p.amountUsd}</span>
                    <span className="text-emerald-400">{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Popup de confirmation d'enregistrement de la formation */}
        <SuccessConfirmationModal
          isOpen={showCourseSuccess}
          onClose={() => setShowCourseSuccess(false)}
          title="Formation publiée !"
          message="Votre formation a été enregistrée et publiée avec succès. Elle est maintenant visible dans votre catalogue et sur la plateforme."
        />
      </div>
    </div>
  );
};