// ============================================================
// FORTIA HUB — SOURCE UNIQUE DES CATÉGORIES DE FORMATION
// ------------------------------------------------------------
// Ce module est utilisé par :
//   • la page d'accueil  (rangée « Explorer par catégorie »)
//   • la page Académie   (filtres + vues du catalogue)
//
// Principe : chaque « famille » affichée possède un identifiant
// stable (slug) utilisé dans l'URL (?categorie=…), et déclare les
// codes réels de la table `course_categories` qu'elle regroupe.
// Le rattachement d'une formation se fait par identifiant/code en
// priorité (fiable), puis par mots-clés sur le libellé (repli).
// ============================================================

import {
  BrainCircuit,
  TrendingUp,
  Megaphone,
  Wallet,
  Palette,
  Globe,
  Users,
  Code2,
  Wrench,
  Bitcoin,
  Clapperboard,
  LayoutGrid,
  Gift,
} from "lucide-react";

/** Slug d'URL de la catégorie transversale « Gratuit ». */
export const FREE_COURSE_CATEGORY_SLUG = "gratuit";
/** Libellé affiché de la catégorie « Gratuit » (formations). */
export const FREE_COURSE_CATEGORY_LABEL = "Formations gratuites";

/** Une formation gratuite est publiée et vendue au prix de 0 (prix explicite). */
function isFreeCoursePrice(course: any): boolean {
  if (!course || course.isPublished === false) return false;
  const raw = course?.price;
  if (raw === null || raw === undefined || raw === "") return false;
  const price = Number(raw);
  return Number.isFinite(price) && price === 0;
}

export interface CourseCategoryFamily {
  /** Identifiant stable utilisé dans l'URL : /academy?categorie=<slug> */
  slug: string;
  /** Libellé affiché */
  label: string;
  /** Icône (lucide-react) */
  icon: React.ElementType;
  /** Fond pastel (rangée de l'accueil) */
  bg: string;
  /** Couleur de l'icône */
  color: string;
  /** Codes réels de la table course_categories couverts par cette famille */
  codes: string[];
  /** Mots-clés de repli (normalisés, sans accent) si le code est inconnu */
  keywords: string[];
}

/** Familles de catégories de formation (ordre d'affichage maîtrisé). */
export const COURSE_CATEGORY_FAMILIES: CourseCategoryFamily[] = [
  {
    slug: "ia-technologie",
    label: "IA & Technologie",
    icon: BrainCircuit,
    bg: "#DBEAFE",
    color: "#2563EB",
    codes: ["ai", "informatique"],
    keywords: ["intelligence artificielle", " ia ", "technolog", "informatique", "bureautique"],
  },
  {
    slug: "business",
    label: "Business & Entrepreneuriat",
    icon: TrendingUp,
    bg: "#FEF3C7",
    color: "#F59E0B",
    codes: ["entrepreneurship"],
    keywords: ["business", "entrepreneur", "gestion d'entreprise", "startup"],
  },
  {
    slug: "marketing-digital",
    label: "Marketing Digital",
    icon: Megaphone,
    bg: "#FFE4E6",
    color: "#F43F5E",
    codes: ["marketing"],
    keywords: ["marketing", "communication", "publicit", "reseaux sociaux", "community"],
  },
  {
    slug: "finance-comptabilite",
    label: "Finance & Comptabilité",
    icon: Wallet,
    bg: "#DCFCE7",
    color: "#10B981",
    codes: [],
    keywords: ["finance", "comptab", "comptabilit", "tresorerie", "fiscalit"],
  },
  {
    slug: "design-creation",
    label: "Design & Création",
    icon: Palette,
    bg: "#EDE9FE",
    color: "#8B5CF6",
    codes: ["canva", "infographie"],
    keywords: ["design", "graphi", "canva", "creation", "identite visuelle", "logo"],
  },
  {
    slug: "langues",
    label: "Langues",
    icon: Globe,
    bg: "#FFEDD5",
    color: "#F97316",
    codes: [],
    keywords: ["langue", "anglais", "francais", "espagnol", "arabe", "traduction"],
  },
  {
    slug: "developpement-personnel",
    label: "Développement Personnel",
    icon: Users,
    bg: "#E0F2FE",
    color: "#0EA5E9",
    codes: [],
    keywords: ["developpement personnel", "soft skill", "confiance en soi", "leadership", "productivit"],
  },
  {
    slug: "programmation",
    label: "Programmation",
    icon: Code2,
    bg: "#FEE2E2",
    color: "#EF4444",
    codes: ["dev_web", "dev_mobile"],
    keywords: ["programmation", "developpement web", "web", "mobile", "code", "javascript", "python"],
  },
  {
    slug: "metiers-artisanat",
    label: "Métiers & Artisanat",
    icon: Wrench,
    bg: "#CCFBF1",
    color: "#14B8A6",
    codes: ["secretariat"],
    keywords: ["metier", "artisanat", "secretariat", "couture", "patisserie", "coiffure"],
  },
  {
    slug: "crypto-blockchain",
    label: "Cryptomonnaies & Blockchain",
    icon: Bitcoin,
    bg: "#FEF9C3",
    color: "#CA8A04",
    codes: ["crypto", "blockchain"],
    keywords: ["crypto", "blockchain", "web3", "trading", "wallet", "nft"],
  },
  {
    slug: "video-montage",
    label: "Capture & Montage vidéo",
    icon: Clapperboard,
    bg: "#F3E8FF",
    color: "#A855F7",
    codes: ["capcut"],
    keywords: ["video", "montage", "capcut", "tournage", "motion"],
  },
];

/** Icône de la puce « Toutes les formations ». */
export const ALL_CATEGORY_ICON = LayoutGrid;

/** Normalise un texte : minuscules + suppression des accents. */
export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Extrait les informations de catégorie d'une formation.
 * `course.category` peut être :
 *   • une chaîne (code) pour les données locales/mock ;
 *   • un objet relation { id, code, label } pour les données Supabase.
 */
export function getCourseCategoryInfo(course: any): {
  id: string;
  code: string;
  label: string;
} {
  const rel = course?.category;
  if (rel && typeof rel === "object") {
    return {
      id: String(rel.id || course?.categoryId || ""),
      code: normalizeText(rel.code || ""),
      label: String(rel.label || course?.categoryLabel || ""),
    };
  }
  return {
    id: String(course?.categoryId || ""),
    code: normalizeText(rel || ""),
    label: String(course?.categoryLabel || ""),
  };
}

/** Vérifie si une formation appartient à une famille de catégories. */
export function courseMatchesFamily(course: any, family: CourseCategoryFamily): boolean {
  if (!course) return false;
  const info = getCourseCategoryInfo(course);

  // 1) Correspondance fiable par code de catégorie
  if (info.code && family.codes.includes(info.code)) return true;

  // 2) Repli sur les mots-clés du libellé réel de la catégorie
  const haystack = normalizeText(`${info.label} ${info.code} ${course.title || ""}`);
  if (!haystack) return false;
  return family.keywords.some((keyword) => haystack.includes(normalizeText(keyword)));
}

/** Retrouve une famille par son slug (identifiant d'URL). */
export function getFamilyBySlug(slug: string | null | undefined): CourseCategoryFamily | null {
  if (!slug) return null;
  const target = normalizeText(slug);
  return (
    COURSE_CATEGORY_FAMILIES.find(
      (family) => family.slug === slug || normalizeText(family.slug) === target
    ) || null
  );
}

/** Filtre une sélection de formations par identifiant de catégorie d'URL. */
export function filterCoursesByCategoryParam(courses: any[], categoryParam: string | null | undefined) {
  const list = courses || [];
  if (!categoryParam || categoryParam === "all") return list;

  // Catégorie transversale « Gratuit » : accès libre, aucune catégorie en base.
  if (normalizeText(categoryParam) === FREE_COURSE_CATEGORY_SLUG) {
    return list.filter(isFreeCoursePrice);
  }

  const family = getFamilyBySlug(categoryParam);
  if (family) return list.filter((course) => courseMatchesFamily(course, family));

  // Code réel de la table course_categories (catégorie non regroupée)
  const code = normalizeText(categoryParam);
  return list.filter((course) => {
    const info = getCourseCategoryInfo(course);
    return info.code === code || (info.id && info.id === categoryParam);
  });
}

/** Libellé lisible pour un identifiant de catégorie d'URL. */
export function getCategoryLabel(
  categoryParam: string | null | undefined,
  dbCategories: { id?: string; code?: string; label?: string }[] = []
): string {
  if (!categoryParam || categoryParam === "all") return "Toutes les formations";
  if (normalizeText(categoryParam) === FREE_COURSE_CATEGORY_SLUG) {
    return FREE_COURSE_CATEGORY_LABEL;
  }
  const family = getFamilyBySlug(categoryParam);
  if (family) return family.label;
  const found = (dbCategories || []).find(
    (c) => String(c?.code || "") === categoryParam || String(c?.id || "") === categoryParam
  );
  return found?.label || "Toutes les formations";
}

/** Transforme un libellé en identifiant URL stable (sans accents). */
export function slugifyCategory(value: unknown): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Construit la liste des puces de catégories du catalogue :
 *  • « Toutes les formations » ;
 *  • les familles qui contiennent au moins une formation (+ celle sélectionnée) ;
 *  • les catégories réelles de la base qui ne correspondent à AUCUNE famille
 *    (évite les doublons du type « Finance » / « Finance & Comptabilité »).
 */
export function buildCategoryOptions(
  courses: any[],
  dbCategories: { id?: string; code?: string; label?: string }[] = [],
  selectedId?: string | null
): { id: string; label: string; icon?: React.ElementType; count: number }[] {
  const list = courses || [];
  const options: { id: string; label: string; icon?: React.ElementType; count: number }[] = [
    { id: "all", label: "Toutes les formations", icon: ALL_CATEGORY_ICON, count: list.length },
  ];

  // Catégorie transversale « Gratuit » : accès libre, proposée en premier dès
  // qu'au moins une formation est gratuite (ou si elle est sélectionnée).
  const freeCount = list.filter(isFreeCoursePrice).length;
  if (freeCount > 0 || selectedId === FREE_COURSE_CATEGORY_SLUG) {
    options.push({
      id: FREE_COURSE_CATEGORY_SLUG,
      label: FREE_COURSE_CATEGORY_LABEL,
      icon: Gift,
      count: freeCount,
    });
  }

  const coveredCodes = new Set(COURSE_CATEGORY_FAMILIES.flatMap((family) => family.codes));

  COURSE_CATEGORY_FAMILIES.forEach((family) => {
    const count = list.filter((course) => courseMatchesFamily(course, family)).length;
    if (count > 0 || selectedId === family.slug) {
      options.push({ id: family.slug, label: family.label, icon: family.icon, count });
    }
  });

  // Catégories de la base ne correspondant à aucune famille
  (dbCategories || [])
    .filter((cat) => {
      const code = normalizeText(cat?.code || "");
      const label = normalizeText(cat?.label || "");
      if (!code && !label) return false;
      if (code && coveredCodes.has(code)) return false;
      // Doublon d'une famille (même slug, même mots-clés) → on ne l'ajoute pas
      if (getFamilyBySlug(slugifyCategory(code || label))) return false;
      return !COURSE_CATEGORY_FAMILIES.some((family) =>
        family.keywords.some((keyword) => {
          const k = normalizeText(keyword).trim();
          return !!k && (label.includes(k) || code.includes(k));
        })
      );
    })
    .forEach((cat) => {
      const code = normalizeText(cat.code);
      const count = list.filter((course) => getCourseCategoryInfo(course).code === code).length;
      if (count > 0 || selectedId === cat.code) {
        options.push({ id: String(cat.code), label: cat.label || String(cat.code), count });
      }
    });

  return options;
}

// ============================================================
// VUES / TRIS DU CATALOGUE
// ============================================================

export type CourseViewId = "all" | "populaires" | "mieux-notees" | "nouveautes" | "mises-en-avant";

export interface CourseView {
  id: CourseViewId;
  label: string;
}

/** Vues disponibles (toutes adossées à des données réellement présentes). */
export const COURSE_VIEWS: CourseView[] = [
  { id: "all", label: "Toutes" },
  { id: "populaires", label: "Populaires" },
  { id: "mieux-notees", label: "Mieux notées" },
  { id: "nouveautes", label: "Nouveautés" },
  { id: "mises-en-avant", label: "Mises en avant" },
];

/** La vue « Mises en avant » n'est proposée que si des formations sont marquées comme telles. */
export function hasFeaturedCourses(courses: any[]): boolean {
  return (courses || []).some((course) => course?.isFeatured === true);
}

/**
 * Applique la vue (tri/filtre) à une liste de formations.
 * Aucun score n'est inventé : chaque tri s'appuie sur un champ réel.
 */
export function applyCourseView(courses: any[], view: string): any[] {
  const list = [...(courses || [])];
  const dateOf = (course: any) => new Date(course?.createdAt || 0).getTime();

  switch (view) {
    case "populaires":
      return list.sort(
        (a, b) => (Number(b?.studentsCount) || 0) - (Number(a?.studentsCount) || 0)
      );
    case "mieux-notees":
      return list
        .filter((course) => (Number(course?.reviewsCount) || 0) > 0)
        .sort((a, b) => (Number(b?.rating) || 0) - (Number(a?.rating) || 0));
    case "nouveautes":
      return list.sort((a, b) => dateOf(b) - dateOf(a));
    case "mises-en-avant":
      return list
        .filter((course) => course?.isFeatured === true)
        .sort((a, b) => (Number(b?.studentsCount) || 0) - (Number(a?.studentsCount) || 0));
    default:
      return list;
  }
}

/** Trie par popularité (note d'abord, puis nombre d'apprenants réels). */
export function sortByPopularity(courses: any[]): any[] {
  return [...(courses || [])].sort(
    (a, b) =>
      (Number(b?.rating) || 0) - (Number(a?.rating) || 0) ||
      (Number(b?.studentsCount) || 0) - (Number(a?.studentsCount) || 0)
  );
}


