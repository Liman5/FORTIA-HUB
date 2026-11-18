"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Camera,
  Pencil,
  TrendingUp,
  X,
  BadgeCheck,
  Copyright,
  ShieldCheck,
  FileCheck,
  FileText,
  AlertTriangle,
  Info,
} from "lucide-react";
import { TrainingCenter, Course, InstructorCommission, InstructorStoragePurchase } from "@/lib/types";
import { CategorySelect, buildCourseCategoryOptions } from "@/components/CategorySelect";
import { useCatalog } from "@/lib/store/domains/contexts";
import { uploadCourseVideoDirect, uploadFileToR2, deleteFileFromR2, resolveStorageUrl } from "@/lib/services/clientUpload";
import { hashSecret } from "@/lib/services/offlineVideo";
import { SuccessConfirmationModal } from "./SuccessConfirmationModal";
import { useAppStore } from "@/lib/store/AppStore";
import { apiWritePlatform } from "@/lib/services/platformWrite";
import { clearCache } from "@/lib/services/api/http";

interface InstructorDashboardProps {
  center: TrainingCenter | null;
  /** Identifiant du compte connecté : permet de retrouver ses formations même
   *  si aucun centre de formation n'a encore été enregistré. */
  userId?: string;
  courses: Course[];
  commissions: InstructorCommission[];
  storagePurchases: InstructorStoragePurchase[];
  isUserLoggedIn: boolean;
  userEmail?: string;
  /** Photo de profil du membre connecté (source UNIQUE du visuel du formateur). */
  userAvatar?: string;
  onCreateCenter: (data: { centerName: string; description: string }) => void;
  onAddCourse: (course: Course) => void;
  onUpdateCourse: (courseId: string, updates: Partial<Course>) => void;
  onSuspendCourse: (courseId: string) => void;
  onDeleteCourse: (courseId: string) => void;
  onBuyStorage: (center: TrainingCenter, amountGb: number, amountUsd: number) => void;
  onOpenAuthModal: () => void;
}

export const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  center: providedCenter,
  userId,
  courses,
  commissions,
  storagePurchases,
  isUserLoggedIn,
  userEmail,
  userAvatar,
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
  const [categoryLabel, setCategoryLabel] = useState("Intelligence Artificielle");
  const { courseCategories } = useCatalog();
  const categoryOptions = React.useMemo(
    () => buildCourseCategoryOptions(courseCategories as any),
    [courseCategories]
  );
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
        type: "video" | "article" | "pdf";
        videoUrl: string;
        content?: string;
        videoProtected?: boolean;
        videoCodeHash?: string;
      }[];
    }[]
  >([]);
  const [chapterTitle, setChapterTitle] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDuration, setLessonDuration] = useState("15 min");
  const [lessonType, setLessonType] = useState<"video" | "article" | "pdf">("video");
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

  // PDF file upload (supports de cours PDF, chapitre par chapitre)
  const pdfFileRef = useRef<HTMLInputElement>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  /**
   * Type de leçon côté formulaire : « pdf » est mémorisé en base comme
   * « article » avec `content = "pdf"` (l'enum `lesson_type` ne connaît que
   * video / article / quiz). On reconstruit donc le type local à l'édition.
   */
  const toLocalLessonType = (lesson: any): "video" | "article" | "pdf" => {
    const raw = String(lesson?.type || "video");
    const content = String(lesson?.content || "").toLowerCase();
    const url = String(lesson?.videoUrl || "");
    if (raw === "pdf") return "pdf";
    if (raw === "article" && (content === "pdf" || /\.pdf(\?|#|$)/i.test(url))) return "pdf";
    if (raw === "quiz") return "article";
    return raw === "article" ? "article" : "video";
  };

  // ===== Gestion fichiers vidéo R2 : suppression / remplacement =====
  const extractR2Key = (url?: string): string | null => {
    if (!url) return null;
    const idx = url.indexOf("course-media/");
    return idx === -1 ? null : url.slice(idx);
  };
  const deleteVideoFromR2 = (url?: string) => {
    const key = extractR2Key(url);
    if (key) deleteFileFromR2(key).catch(() => {});
  };

  const askAndRemoveLesson = (ci: number, li: number) => {
    const lesson = chapters[ci]?.lessons[li];
    if (!lesson) return;
    if (!window.confirm(`Supprimer la leçon « ${lesson.title} » ?\nLe fichier (vidéo ou PDF) sera supprimé de Cloudflare et de la base.`)) return;
    // Libère l'espace du quota plateforme selon la taille réelle du fichier
    resolveStorageUrl(lesson.videoUrl)
      .then((url) => (url ? fetch(url, { method: "HEAD" }) : null))
      .then((r) => {
        if (!r) return;
        const len = r.headers.get("content-length");
        if (len) {
          const n = Number(len);
          setUsedBytes((b) => Math.max(0, b - n));
          apiWritePlatform("register-course-media-storage", { centerId: center?.id, deltaBytes: -n });
        }
      })
      .catch(() => {});
    deleteVideoFromR2(lesson.videoUrl);
    setChapters((prev) =>
      prev.map((ch, i) => (i === ci ? { ...ch, lessons: ch.lessons.filter((_, j) => j !== li) } : ch))
    );
  };

  const askDeleteCourse = (id: string, title?: string) => {
    if (!window.confirm(`Supprimer la formation « ${title || ""} » ?\nToutes ses vidéos seront supprimées de Cloudflare et de la base.`)) return;
    const c = courses.find((x) => x.id === id);
    (c?.chapters || []).forEach((ch) => (ch.lessons || []).forEach((l) => deleteVideoFromR2(l.videoUrl)));
    onDeleteCourse(id);
  };
  // Formations rattachées au compte connecté (même sans centre enregistré)
  const ownedCourses = (courses || []).filter((c) => !!userId && c.instructorId === userId);

  /**
   * Espace de travail : le centre enregistré du formateur, ou — s'il a déjà
   * publié des formations — un espace provisoire qui lui permet de les voir et
   * de les gérer. Aucun champ n'est inventé (valeurs vides / neutres).
   * ⚠️ Ce calcul doit précéder tout `useState`/`useEffect` qui lit `center`.
   */
  const center: TrainingCenter | null =
    providedCenter && providedCenter.id
      ? providedCenter
      : ownedCourses.length > 0
        ? {
            id: "",
            ownerId: userId || "",
            centerName: "Mon Espace Formateur",
            slug: "",
            description: "",
            logo: "",
            banner: "",
            status: "pending",
            isVerified: false,
            feePaid: false,
            feeAmountUsd: 0,
            storageQuotaGb: 4,
            storageUsedBytes: 0,
            createdAt: "",
          }
        : providedCenter;

  // Image de couverture : upload fichier (pas seulement URL)
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  // === Identité du centre : présentation (le visuel vient du profil membre) ===
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  // Règles de la plateforme (petit bouton d'information anti-abus)
  const [showRules, setShowRules] = useState(false);
  // Photo du centre : import R2 + aperçu immédiat (temps réel)
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const { setTrainingCenters, refreshPlatformData } = useAppStore();

  /** Applique la mise à jour du centre dans le store (affichage instantané). */
  const patchCenter = (updates: Partial<TrainingCenter>) => {
    if (!center?.id) return;
    setTrainingCenters((prev) =>
      prev.map((c) => (c.id === center.id ? { ...c, ...updates } : c))
    );
  };

  /** Import de la photo du centre dans Cloudflare R2 puis enregistrement. */
  const handleLogoUpload = async (file?: File) => {
    if (!file) return;
    if (!center?.id) {
      alert("Créez d'abord votre centre de formation.");
      return;
    }
    // Aperçu instantané (avant même la fin de l'upload)
    const localUrl = URL.createObjectURL(file);
    setLogoPreview(localUrl);
    setUploadingLogo(true);
    try {
      // Bucket public "store-images" (autorise aux formateurs connectés) :
      // plus besoin de session administrateur pour la photo du centre.
      const up = await uploadFileToR2(file, "store-images", center.id, true);
      if (!up.success || !up.url) {
        setLogoPreview("");
        alert(up.error || "Import de l'image impossible.");
        return;
      }
      const saved = await apiWritePlatform("update-training-center-config", {
        centerId: center.id,
        logo: up.url,
      });
      if ((saved as { success?: boolean })?.success) {
        patchCenter({ logo: up.url });
        clearCache(["marketplace", "catalog", "site"]);
        // Relecture serveur : la photo reste affichée après un rechargement.
        refreshPlatformData(true);
        setLogoPreview(up.url);
      } else {
        setLogoPreview("");
        alert((saved as { error?: string })?.error || "Enregistrement impossible.");
      }
    } finally {
      setUploadingLogo(false);
      if (logoFileRef.current) logoFileRef.current.value = "";
    }
  };

  /** Ouvre le formulaire « Créer une formation » et amène l'utilisateur dessus. */
  const goToCourseForm = () => {
    setActiveTab("add");
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        document.getElementById("course-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  };

  /** Enregistre l'identité du centre (nom, présentation) puis rafraîchit. */
  const saveCenterProfile = async () => {
    if (!center?.id) {
      alert("Créez d'abord votre centre de formation.");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await apiWritePlatform("update-training-center-config", {
        centerId: center.id,
        centerName: profileName.trim() || center.centerName,
        description: profileBio,
      });
      if ((res as { success?: boolean })?.success) {
        // Mise à jour IMMÉDIATE de l'affichage (plus de rechargement dépendant
        // du cache) : le nom et la présentation changent à l'écran sur-le-champ.
        patchCenter({
          centerName: profileName.trim() || center.centerName,
          description: profileBio,
        });
        clearCache(["marketplace", "catalog", "site"]);
        refreshPlatformData(true);
        setProfileSaved(true);
        window.setTimeout(() => {
          setProfileSaved(false);
          setIsProfileOpen(false);
        }, 1500);
      } else {
        alert((res as { error?: string })?.error || "Enregistrement impossible.");
      }
    } finally {
      setSavingProfile(false);
    }
  };
  // Quota de stockage réellement utilisé (quota plateforme du formateur)
  const [usedBytes, setUsedBytes] = useState<number>(() => Number(center?.storageUsedBytes || 0));
  useEffect(() => {
    setUsedBytes(Number(center?.storageUsedBytes || 0));
  }, [center?.id, center?.storageUsedBytes]);

  const myCourses = (courses || []).filter(
    (c) =>
      // Formation rattachée à MOI (cas d'un cours publié avant la création du
      // centre) : sans ce test, un formateur dont le centre n'est pas encore
      // enregistré ne voyait AUCUNE de ses formations.
      (!!userId && c.instructorId === userId) ||
      c.instructorId === center?.ownerId ||
      c.centerId === center?.id
  );
  const totalStudents = myCourses.reduce((s, c) => s + (c.studentsCount || 0), 0);
  const totalEarnings = (commissions || [])
    .filter((c) => c.instructorId === center?.ownerId)
    .reduce((s, c) => s + c.instructorEarningsUsd, 0);

  const quotaGb = center?.storageQuotaGb || 4;
  const quotaBytes = quotaGb * 1024 * 1024 * 1024;
  const usedGb = usedBytes / (1024 * 1024 * 1024);
  const usedPct = quotaBytes > 0 ? Math.min((usedBytes / quotaBytes) * 100, 100) : 0;

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

  // Sans centre ET sans formation : on propose la création du centre.
  if (!center) {
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

  /**
   * Gains des 7 derniers jours (barres) : calculé sur les commissions réelles
   * du formateur — aucune donnée inventée, zéro si rien n'a été vendu.
   */
  const weeklyEarnings = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - i));
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const amount = (commissions || [])
      .filter((c) => {
        const t = new Date(c.createdAt).getTime();
        return t >= day.getTime() && t < next.getTime();
      })
      .reduce((sum, c) => sum + (Number(c.instructorEarningsUsd) || 0), 0);
    return { day, amount };
  });
  const weeklyMax = Math.max(...weeklyEarnings.map((d) => d.amount), 1);
  const weeklyTotal = weeklyEarnings.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="bg-[#021231] text-white min-h-screen pb-16 space-y-8 fortia-flat">
      {/* ===== En-tête STUDIO : identité du centre + actions ===== */}
      <div className="instructor-header-banner bg-[#011D46] border-b border-[#D69E25]/30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-4">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/member";
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#021231] border border-[#D69E25]/40 text-[#D69E25] text-[11px] font-black rounded-xl hover:bg-[#032454] hover:border-[#D69E25]/70 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Mon espace membre</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            {/* Photo du centre : import R2, aperçu immédiat, image par défaut */}
            <div className="shrink-0 self-start">
              <button
                type="button"
                onClick={() => logoFileRef.current?.click()}
                disabled={uploadingLogo}
                title="Changer la photo de mon centre de formation"
                className="group relative h-20 w-20 overflow-hidden rounded-2xl border-2 border-[#D69E25] bg-[#021231] sm:h-24 sm:w-24"
              >
                <img
                  src={logoPreview || center.logo || "/pwa-192x192.png"}
                  alt={center.centerName}
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition group-hover:opacity-100">
                  {uploadingLogo ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </span>
              </button>
              <input
                ref={logoFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleLogoUpload(e.target.files?.[0])}
              />
              <p className="mt-1 text-center text-[10px] font-bold text-[#D69E25]">
                {center.logo || logoPreview ? "Changer" : "Ajouter une photo"}
              </p>
            </div>

            {/* Identité */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <h1
                className="text-lg sm:text-2xl font-black leading-tight break-words"
                style={{ color: "#FFFFFF", textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
              >
                {center.centerName}
              </h1>
              <p className="text-[11px] sm:text-xs break-all" style={{ color: "#B6C2D4" }}>
                {userEmail}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Centre actif
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#D69E25]/15 text-[#D69E25] border border-[#D69E25]/35 px-2 py-0.5 rounded-full">
                  <BookOpen className="w-3 h-3" /> {myCourses.length} formation{myCourses.length > 1 ? "s" : ""}
                </span>
                {/* Point d'information : icône vectorielle (lucide Info) */}
                <button
                  onClick={() => setShowRules(true)}
                  title="Règles de publication (important)"
                  aria-label="Règles de publication"
                  className="inline-flex items-center gap-1 rounded-full border border-[#D69E25]/60 bg-[#D69E25]/10 px-2 py-0.5 text-[10px] font-bold text-[#D69E25] hover:bg-[#D69E25] hover:text-[#021231] transition"
                >
                  <Info className="h-3 w-3" />
                  Règles
                </button>
              </div>
              {center.description ? (
                <p className="text-[11px] sm:text-xs line-clamp-2 max-w-xl" style={{ color: "#CBD5E1" }}>
                  {center.description}
                </p>
              ) : (
                <button
                  onClick={() => {
                    setProfileName(center.centerName);
                    setProfileBio(center.description || "");
                    setIsProfileOpen(true);
                  }}
                  className="text-[11px] font-bold text-[#D69E25] hover:underline inline-flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" /> Ajouter une présentation de mon centre
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={goToCourseForm}
                className="px-4 py-2.5 bg-[#D69E25] hover:bg-amber-400 text-[#021231] font-black text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Créer une formation</span>
              </button>
              <button
                onClick={() => {
                  setProfileName(center.centerName);
                  setProfileBio(center.description || "");
                  setIsProfileOpen(true);
                }}
                className="px-4 py-2.5 bg-[#021231] border border-[#D69E25]/40 text-[#D69E25] font-black text-xs rounded-xl hover:bg-[#032454] transition flex items-center justify-center gap-2"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Modifier ma présentation</span>
              </button>
            </div>
          </div>

          {/* Rappel : une photo de centre rassure les apprenants (disparaît dès
              qu'une photo est importée). */}
          {!center.logo && !logoPreview && (
            <div className="flex items-start gap-2 rounded-xl border border-[#D69E25]/40 bg-[#D69E25]/10 px-3 py-2">
              <Camera className="mt-0.5 h-4 w-4 shrink-0 text-[#D69E25]" />
              <p className="text-[11px] leading-tight" style={{ color: "#F3E3BF" }}>
                <strong>Ajoutez une photo à votre centre de formation :</strong> elle inspire confiance
                et met en valeur vos formations. Cliquez sur le logo pour importer votre image.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* ===== Indicateurs clés ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Formations", value: String(myCourses.length), icon: BookOpen, tint: "text-[#D69E25]", bg: "bg-[#D69E25]/12" },
            { label: "Étudiants", value: String(totalStudents), icon: Users, tint: "text-sky-300", bg: "bg-sky-500/12" },
            { label: "Revenus", value: `$${totalEarnings}`, icon: DollarSign, tint: "text-emerald-300", bg: "bg-emerald-500/12" },
            { label: "Stockage", value: `${usedGb.toFixed(1)} Go`, icon: HardDrive, tint: "text-violet-300", bg: "bg-violet-500/12", sub: `/ ${center.storageQuotaGb} Go` },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[#011D46] border border-slate-800 rounded-2xl p-3.5 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {kpi.label}
                </span>
                <span className={`w-7 h-7 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                  <kpi.icon className={`w-3.5 h-3.5 ${kpi.tint}`} />
                </span>
              </div>
              <p className="text-lg sm:text-2xl font-black tabular-nums truncate">{kpi.value}</p>
              {kpi.sub && <p className="text-[10px] text-slate-500 truncate">{kpi.sub}</p>}
            </div>
          ))}
        </div>

        {/* ===== Gains des 7 derniers jours ===== */}
        <div className="bg-[#011D46] border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xs sm:text-sm font-black flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#D69E25]" />
                Gains — 7 derniers jours
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Part formateur des ventes enregistrées (net de commission)
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg sm:text-xl font-black text-emerald-300 tabular-nums">${weeklyTotal.toFixed(2)}</p>
              <p className="text-[10px] text-slate-500">cette semaine</p>
            </div>
          </div>

          <div className="flex items-end justify-between gap-1.5 h-28">
            {weeklyEarnings.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[9px] font-bold text-slate-400 tabular-nums">
                  {d.amount > 0 ? `$${d.amount.toFixed(0)}` : ""}
                </span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-[#AB6F10] to-[#D69E25] transition-all"
                  style={{ height: `${Math.max((d.amount / weeklyMax) * 100, d.amount > 0 ? 6 : 2)}%`, minHeight: 3 }}
                  title={`${d.amount.toFixed(2)} $`}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-1.5 mt-1.5">
            {weeklyEarnings.map((d, i) => (
              <span key={i} className="flex-1 text-center text-[9px] font-bold uppercase text-slate-500">
                {d.day.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
              </span>
            ))}
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
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                {myCourses.map((c) => (
                  <div key={c.id} className="bg-[#011D46] border border-slate-800 rounded-3xl overflow-hidden">
                    {/* ===== Suspension : motif, fonds gelés, demande d'examen ===== */}
                    {c.moderationStatus === "suspended" && (
                      <div className="space-y-2 border-b border-red-500/40 bg-red-500/10 p-3">
                        <p className="flex items-center gap-1.5 text-[11px] font-black text-red-300">
                          <EyeOff className="w-3.5 h-3.5" /> Formation suspendue
                          {c.fundsFrozen ? " — fonds gelés" : ""}
                        </p>
                        <p className="text-[10px] leading-tight text-red-200/90">
                          Motif : {c.moderationReason || "Non-conformité aux règles de la plateforme."}
                        </p>
                        {c.appealStatus === "pending" ? (
                          <p className="text-[10px] font-bold text-amber-300">
                            Demande d'examen envoyée — en attente de l'administration.
                          </p>
                        ) : (
                          <button
                            onClick={async () => {
                              const message = window.prompt(
                                "Expliquez pourquoi votre formation respecte les règles (contenu authentique, droits d'auteur, pas de fausses promesses…).",
                                ""
                              );
                              if (message === null) return;
                              if (!message.trim()) {
                                alert("La demande doit contenir une explication.");
                                return;
                              }
                              const res = await apiWritePlatform("appeal-moderation", {
                                targetType: "course",
                                targetId: c.id,
                                message: message.trim(),
                              });
                              if (res.success) {
                                alert("Demande d'examen envoyée à l'administration.");
                                window.location.reload();
                              } else {
                                alert(res.error || "Envoi impossible.");
                              }
                            }}
                            className="w-full rounded-lg bg-[#D69E25] px-2 py-1.5 text-[10px] font-black text-[#021231] hover:bg-amber-400 transition"
                          >
                            Demander un examen
                          </button>
                        )}
                      </div>
                    )}
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
    setCategoryLabel(String(c.categoryLabel || c.category || "Intelligence Artificielle"));
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
                                  type: toLocalLessonType(l),
                                  videoUrl: l.videoUrl || "",
                                  content: l.content || "",
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
                        <button onClick={() => askDeleteCourse(c.id, c.title)} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg">
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
    setCategoryLabel(String(c.categoryLabel || c.category || "Intelligence Artificielle"));
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
                            type: toLocalLessonType(l),
                            videoUrl: l.videoUrl || "",
                            content: l.content || "",
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
                  <button onClick={() => askDeleteCourse(c.id, c.title)} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-[10px] font-bold">Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add course */}
        {activeTab === "add" && (
          <div
            id="course-form"
            className="bg-[#011D46] border border-[#D69E25]/40 rounded-3xl p-6 sm:p-8 space-y-5 max-w-2xl"
          >
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
                <CategorySelect
                  value={category}
                  labelValue={categoryLabel}
                  categories={categoryOptions}
                  onChange={(code, label) => {
                    setCategory(code);
                    setCategoryLabel(label);
                  }}
                  className="w-full bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white"
                  inputClassName="w-full mt-2 bg-[#021231] border border-slate-700 text-xs rounded-xl p-3 text-white"
                />
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
                <Video className="w-4 h-4" /> Chapitres & Leçons (Vidéos, PDF & Articles)
              </h4>
              <p className="text-[10px] text-slate-400">
                Chaque chapitre contient des leçons : vidéo, support PDF (cours en PDF, chapitre par chapitre) ou article.
                Les vidéos et les PDF apparaissent dans le lecteur de formation.
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
                        {l.type === "video" ? (
                          <Video className="w-3.5 h-3.5 text-[#D69E25]" />
                        ) : l.type === "pdf" ? (
                          <FileText className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                        )}
                        {l.title} • {l.duration}
                      </span>
                      {l.type === "video" && l.videoUrl ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/40 rounded-full px-2 py-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Vidéo enregistrée ✓
                        </span>
                      ) : l.type === "video" && !l.videoUrl ? (
                        <span className="shrink-0 text-[10px] font-bold text-red-400">Vidéo manquante ⚠</span>
                      ) : l.type === "pdf" && l.videoUrl ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/40 rounded-full px-2 py-0.5">
                          <CheckCircle2 className="w-3 h-3" /> PDF enregistré ✓
                        </span>
                      ) : l.type === "pdf" ? (
                        <span className="shrink-0 text-[10px] font-bold text-red-400">PDF manquant ⚠</span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-bold text-sky-400">Leçon Article</span>
                      )}
                      <button
                        type="button"
                        onClick={() => askAndRemoveLesson(ci, li)}
                        className="shrink-0 p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Supprimer cette leçon (DB + Cloudflare)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
                  <div className="flex flex-col gap-2.5 w-full">
                    <select
                      value={lessonType}
                      onChange={(e) => {
                        setLessonType(e.target.value as "video" | "article" | "pdf");
                        // Un fichier déjà choisi ne doit pas être réutilisé pour
                        // un autre type de leçon (vidéo ↔ PDF).
                        setLessonVideoUrl("");
                        setVideoUploadProgress("");
                        setVideoSecretCode("");
                      }}
                      className="bg-[#011D46] border border-slate-700 text-xs rounded-lg p-2.5 text-white"
                    >
                      <option value="video">Leçon Vidéo</option>
                      <option value="pdf">Leçon PDF (support de cours)</option>
                      <option value="article">Leçon Article</option>
                    </select>

                    {lessonType === "video" && (
                      <>
                        {usedPct >= 80 && (
                          <div
                            className={`rounded-lg border p-2.5 text-[11px] font-bold ${
                              usedPct >= 100
                                ? "bg-red-500/15 border-red-500/50 text-red-300"
                                : "bg-amber-500/10 border-amber-500/40 text-amber-300"
                            }`}
                          >
                            {usedPct >= 100
                              ? `🚫 Stockage plein (${quotaGb} Go) — supprimez des vidéos pour libérer de l'espace avant d'uploader.`
                              : `⚠️ Stockage utilisé : ${usedGb.toFixed(2)} / ${quotaGb} Go (${Math.round(usedPct)} %). Pensez à libérer de l'espace.`}
                          </div>
                        )}
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
                            // Remplacement d'une vidéo déjà insérée → suppression de l'ancienne sur Cloudflare
                            if (lessonVideoUrl) {
                              const ok = window.confirm(
                                "Remplacer la vidéo actuelle ?\nL'ancienne vidéo sera supprimée de Cloudflare pour libérer de l'espace."
                              );
                              if (!ok) {
                                if (videoFileRef.current) videoFileRef.current.value = "";
                                return;
                              }
                              deleteVideoFromR2(lessonVideoUrl);
                            }
                            if (usedBytes + file.size > quotaBytes) {
                              alert(
                                `Stockage du centre atteint (${quotaGb} Go utilisés) : supprimez d'abord des vidéos pour libérer de l'espace avant d'en uploader de nouvelles.`
                              );
                              if (videoFileRef.current) videoFileRef.current.value = "";
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
                                // Comptabilise le poids réel dans le quota du formateur
                                setUsedBytes((b) => b + file.size);
                                apiWritePlatform("register-course-media-storage", {
                                  centerId: center?.id,
                                  deltaBytes: file.size,
                                });
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
                          <div className="space-y-2 w-full max-w-full overflow-hidden">
                            <div className="w-full rounded-xl overflow-hidden border border-emerald-500/40 bg-black">
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
                                onClick={() => {
                                  const urlToRemove = lessonVideoUrl;
                                  setLessonVideoUrl("");
                                  setVideoUploadProgress("");
                                  if (urlToRemove) {
                                    if (!window.confirm("Retirer cette vidéo ?\nLe fichier sera supprimé de Cloudflare et l'espace libéré.")) {
                                      setLessonVideoUrl(urlToRemove);
                                      return;
                                    }
                                    fetch(urlToRemove, { method: "HEAD" })
                                      .then((r) => {
                                        const len = r.headers.get("content-length");
                                        if (len) {
                                          const n = Number(len);
                                          setUsedBytes((b) => Math.max(0, b - n));
                                          apiWritePlatform("register-course-media-storage", { centerId: center?.id, deltaBytes: -n });
                                        }
                                      })
                                      .catch(() => {});
                                    deleteVideoFromR2(urlToRemove);
                                  }
                                }}
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
                    {lessonType === "pdf" && (
                      <>
                        <input
                          ref={pdfFileRef}
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
                            if (!isPdf) {
                              alert("Veuillez choisir un fichier PDF (support de cours).");
                              if (pdfFileRef.current) pdfFileRef.current.value = "";
                              return;
                            }
                            if (lessonVideoUrl) {
                              const ok = window.confirm(
                                "Remplacer le support PDF actuel ?\nL'ancien fichier sera supprimé de Cloudflare pour libérer de l'espace."
                              );
                              if (!ok) {
                                if (pdfFileRef.current) pdfFileRef.current.value = "";
                                return;
                              }
                              deleteVideoFromR2(lessonVideoUrl);
                            }
                            if (usedBytes + file.size > quotaBytes) {
                              alert(
                                `Stockage du centre atteint (${quotaGb} Go utilisés) : supprimez d'abord des fichiers pour libérer de l'espace avant d'en uploader de nouveaux.`
                              );
                              if (pdfFileRef.current) pdfFileRef.current.value = "";
                              return;
                            }
                            setUploadingPdf(true);
                            try {
                              const result = await uploadFileToR2(
                                file,
                                "course-media",
                                center?.id || "instructor",
                                false
                              );
                              if (result.success) {
                                setLessonVideoUrl(result.url);
                                setUsedBytes((b) => b + file.size);
                                apiWritePlatform("register-course-media-storage", {
                                  centerId: center?.id,
                                  deltaBytes: file.size,
                                });
                              } else {
                                alert(result.error || "Erreur lors de l'upload du support PDF.");
                              }
                            } catch (err: any) {
                              alert(err?.message || "Erreur lors de l'upload du support PDF.");
                            } finally {
                              setUploadingPdf(false);
                              if (pdfFileRef.current) pdfFileRef.current.value = "";
                            }
                          }}
                        />
                        <div className="flex flex-1 flex-col sm:flex-row gap-2 w-full">
                          <input
                            type="text"
                            value={lessonVideoUrl}
                            onChange={(e) => setLessonVideoUrl(e.target.value)}
                            placeholder="URL du support PDF ou cliquez sur « Fichier PDF »"
                            className="flex-1 bg-[#011D46] border border-slate-700 text-xs rounded-lg p-2.5 text-white"
                          />
                          <button
                            type="button"
                            onClick={() => !uploadingPdf && pdfFileRef.current?.click()}
                            disabled={uploadingPdf}
                            className="px-3 py-2 bg-[#D69E25] text-[#021231] font-bold text-xs rounded-lg hover:bg-amber-400 transition flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                          >
                            {uploadingPdf ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Upload…</>
                            ) : lessonVideoUrl ? (
                              <><CheckCircle2 className="w-3.5 h-3.5" /> PDF prêt ✓</>
                            ) : (
                              <><UploadCloud className="w-3.5 h-3.5" /> Fichier PDF</>
                            )}
                          </button>
                        </div>
                        {lessonVideoUrl && (
                          <div className="flex items-center justify-between gap-2 w-full">
                            <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" /> Support PDF prêt — il s&apos;affichera dans le lecteur de la formation.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const urlToRemove = lessonVideoUrl;
                                if (!urlToRemove) return;
                                if (!window.confirm("Retirer ce support PDF ?\nLe fichier sera supprimé de Cloudflare et l'espace libéré.")) return;
                                setLessonVideoUrl("");
                                resolveStorageUrl(urlToRemove)
                                  .then((url) => (url ? fetch(url, { method: "HEAD" }) : null))
                                  .then((r) => {
                                    if (!r) return;
                                    const len = r.headers.get("content-length");
                                    if (len) {
                                      const n = Number(len);
                                      setUsedBytes((b) => Math.max(0, b - n));
                                      apiWritePlatform("register-course-media-storage", { centerId: center?.id, deltaBytes: -n });
                                    }
                                  })
                                  .catch(() => {});
                                deleteVideoFromR2(urlToRemove);
                              }}
                              className="text-[10px] text-slate-400 hover:text-red-400 font-bold transition"
                              title="Retirer ce support PDF"
                            >
                              ✕ Retirer
                            </button>
                          </div>
                        )}
                      </>
                    )}

                  </div>
                  {videoUploadProgress && (
                    <p className="text-[10px] text-[#D69E25] flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> {videoUploadProgress}
                    </p>
                  )}
                  {lessonType === "video" && lessonVideoUrl && (
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
                            content: lessonType === "pdf" ? "pdf" : "",
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
                // AJOUT AUTOMATIQUE : la leçon en cours est enregistrée sans obliger
                // à cliquer sur « + Ajouter la Leçon » (chapitre auto-créé si besoin).
                if (videoSecretCode.trim()) {
                  alert("Une leçon protégée par code secret doit être ajoutée via le bouton « + Ajouter la Leçon ».");
                  return;
                }
                let workingChapters = [...chapters];
                const pendingTitle = lessonTitle.trim();
                if (pendingTitle) {
                  if (workingChapters.length === 0) {
                    workingChapters = [{ title: chapterTitle.trim() || "Chapitre 1", lessons: [] }];
                    setChapters(workingChapters);
                  }
                  const ci =
                    activeChapterIdx !== null && workingChapters[activeChapterIdx]
                      ? activeChapterIdx
                      : workingChapters.length - 1;
                  const lastLesson = workingChapters[ci].lessons[workingChapters[ci].lessons.length - 1];
                  if (!lastLesson || lastLesson.title !== pendingTitle) {
                    workingChapters[ci] = {
                      ...workingChapters[ci],
                      lessons: [
                        ...workingChapters[ci].lessons,
                        {
                          id: `lesson-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                          title: lessonTitle,
                          duration: lessonDuration,
                          type: lessonType,
                          videoUrl: lessonVideoUrl,
                          content: lessonType === "pdf" ? "pdf" : "",
                          videoProtected: false,
                          videoCodeHash: "",
                        },
                      ],
                    };
                    setChapters(workingChapters);
                    setLessonTitle("");
                    setLessonDuration("15 min");
                    setLessonVideoUrl("");
                    setVideoSecretCode("");
                  }
                }
                const totalLessons = workingChapters.reduce((s, ch) => s + ch.lessons.length, 0);
                if (totalLessons === 0) {
                  alert("Ajoutez au moins une leçon (titre + vidéo ou PDF) en cliquant sur « + Ajouter la Leçon » avant de publier la formation.");
                  return;
                }

                if (editingCourseId) {
                  // MODE ÉDITION : mettre à jour la formation existante
                  onUpdateCourse(editingCourseId, {
                    title,
                    category: category as any,
                    categoryLabel: categoryLabel || category,
                    description,
                    fullDescription: description,
                    durationHours,
                    lessonsCount: totalLessons || lessonsCount,
                    price,
                    image,
                    level: level as any,
                    learningOutcomes: [],
                    chapters: workingChapters.map((ch, ci) => ({
                      id: `chapter-${Date.now()}-${ci}`,
                      title: ch.title,
                      lessons: ch.lessons.map((l, li) => ({
                        id: `lesson-${Date.now()}-${ci}-${li}`,
                        title: l.title,
                        duration: l.duration,
                        // L'enum SQL lesson_type ne connaît que video/article/quiz :
                        // une leçon PDF est stockée en « article » + content = "pdf".
                        type: l.type === "pdf" ? "article" : l.type,
                        videoUrl: l.videoUrl,
                        content: l.type === "pdf" ? "pdf" : l.content || "",
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
                    categoryLabel: categoryLabel || category,
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
                    chapters: workingChapters.map((ch, ci) => ({
                      id: `chapter-${Date.now()}-${ci}`,
                      title: ch.title,
                      lessons: ch.lessons.map((l, li) => ({
                        id: `lesson-${Date.now()}-${ci}-${li}`,
                        title: l.title,
                        duration: l.duration,
                        // L'enum SQL lesson_type ne connaît que video/article/quiz :
                        // une leçon PDF est stockée en « article » + content = "pdf".
                        type: l.type === "pdf" ? "article" : l.type,
                        videoUrl: l.videoUrl,
                        content: l.type === "pdf" ? "pdf" : l.content || "",
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

        {/* ===== Règles de publication (anti-abus) ===== */}
        {showRules && (
          <div className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3">
            <div className="w-full max-w-md bg-[#021231] border border-[#D69E25]/40 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[#011D46] border-b border-[#D69E25]/25">
                <h3 className="text-sm font-black" style={{ color: "#F8FAFC" }}>
                  Règles de publication — à respecter
                </h3>
                <button
                  onClick={() => setShowRules(false)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-2.5 text-[11px] leading-relaxed text-slate-300">
                {[
                  {
                    icon: BadgeCheck,
                    title: "Contenu authentique",
                    text: "Votre formation doit être créée par vous, sans copie d'une autre formation.",
                  },
                  {
                    icon: Copyright,
                    title: "Droits d'auteur",
                    text: "Images, vidéos, musiques et documents doivent être libres de droits ou autorisés.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Aucune fausse promesse",
                    text: "Pas de gains garantis, de fausses certifications ni d'usurpation d'identité.",
                  },
                  {
                    icon: FileCheck,
                    title: "Livrables réels",
                    text: "Les fichiers annoncés doivent exister et correspondre à la description.",
                  },
                ].map((rule) => (
                  <div key={rule.title} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#D69E25]/15 text-[#D69E25]">
                      <rule.icon className="h-3.5 w-3.5" />
                    </span>
                    <p>
                      <strong className="text-white">{rule.title}</strong> — {rule.text}
                    </p>
                  </div>
                ))}
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-200">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>
                    En cas de non-respect : <strong>suspension immédiate</strong>,{" "}
                    <strong>fonds gelés</strong>, motif affiché sur votre espace et possibilité de{" "}
                    <strong>demander un examen</strong> à l'administration.
                  </p>
                </div>
              </div>
              <div className="px-4 pb-4">
                <button
                  onClick={() => setShowRules(false)}
                  className="w-full py-2.5 rounded-xl bg-[#D69E25] text-[#021231] text-xs font-black hover:bg-amber-400 transition"
                >
                  J'ai compris
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== Modale : identité du centre (nom + présentation) ===== */}
        {isProfileOpen && (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3">
            <div className="w-full max-w-md bg-[#021231] border border-[#D69E25]/40 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[#011D46] border-b border-[#D69E25]/25">
                <h3 className="text-sm font-black flex items-center gap-2" style={{ color: "#F8FAFC" }}>
                  <Pencil className="w-4 h-4 text-[#D69E25]" />
                  Présentation de mon centre
                </h3>
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Nom du centre</label>
                  <input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    maxLength={80}
                    className="w-full px-3 py-2.5 bg-[#011D46] border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-[#D69E25] focus:outline-none"
                    placeholder="Ex. IBXPRESS Academy"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Présentation <span className="text-slate-500 font-normal">({profileBio.length}/400)</span>
                  </label>
                  <textarea
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value.slice(0, 400))}
                    rows={4}
                    className="w-full px-3 py-2.5 bg-[#011D46] border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-[#D69E25] focus:outline-none resize-none"
                    placeholder="Ce que vous enseignez, votre expérience, à qui s'adressent vos formations…"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  La photo de profil se change en cliquant sur le logo, en haut de la page.
                </p>
              </div>

              <div className="px-4 pb-4">
                {profileSaved ? (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-3 py-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <p className="text-[11px] font-bold text-emerald-200">
                      Modifications enregistrées — actualisation de la page…
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsProfileOpen(false)}
                      className="flex-1 py-2.5 rounded-xl bg-[#011D46] border border-slate-700 text-slate-300 text-xs font-black hover:bg-[#032454] transition"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={saveCenterProfile}
                      disabled={savingProfile}
                      className="flex-1 py-2.5 rounded-xl bg-[#D69E25] text-[#021231] text-xs font-black hover:bg-amber-400 transition flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Enregistrer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};