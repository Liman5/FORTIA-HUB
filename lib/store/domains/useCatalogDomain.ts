"use client";

// ============================================================
// FORTIA HUB — DOMAINE « ACADÉMIE / CATALOGUE »
// ------------------------------------------------------------
// Extrait de `lib/store/AppStore.tsx` (Phase 2) : formations, catégories,
// centres de formation, commissions et achats de stockage des formateurs,
// chargement progressif du catalogue et progression pédagogique.
//
// Dépendances injectées : la session (`userProfile`, `setUserProfile`,
// `persistUserLearning`) et le rechargement global (`refreshPlatformData`).
// ============================================================

import { useCallback, useEffect, useState, useMemo } from "react";
import type {
  Course,
  CourseCategoryRecord,
  Certificate,
  TrainingCenter,
  InstructorCommission,
  InstructorStoragePurchase,
  UserProfile,
} from "@/lib/types";
import { fetchCatalog, fetchCourseDetail, fetchAllCourses, CATALOG_DEFAULT_LIMIT } from "@/lib/services/api/catalog";
import { apiWritePlatform } from "@/lib/services/platformWrite";
import { clearPlatformCache } from "@/lib/services/platformApi";


export interface CatalogDomainDeps {
  userProfile: UserProfile;
  /** Session active : le centre du formateur connecté en dépend. */
  isUserLoggedIn: boolean;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  persistUserLearning: (profile: UserProfile) => void;
  refreshPlatformData: () => Promise<void>;
}

export function useCatalogDomain({
  userProfile,
  isUserLoggedIn,
  setUserProfile,
  persistUserLearning,
  refreshPlatformData,
}: CatalogDomainDeps) {

  const [courses, setCourses] = useState<Course[]>([]);

  const [catalogTotal, setCatalogTotal] = useState(0);

  const [catalogHasMore, setCatalogHasMore] = useState(false);

  const loadMoreCourses = useCallback(async () => {
    if (!catalogHasMore) return;
    const nextPage = Math.floor(courses.length / CATALOG_DEFAULT_LIMIT) + 1;
    const result = await fetchCatalog({ page: nextPage, limit: CATALOG_DEFAULT_LIMIT }, true);
    if (!result) return;

    setCourses((prev) => {
      const known = new Set(prev.map((c) => c.id));
      const additions = (result.courses as Course[]).filter((c) => !known.has(c.id));
      return additions.length > 0 ? [...prev, ...additions] : prev;
    });
    setCatalogTotal(result.total);
    setCatalogHasMore(result.hasMore);
  }, [catalogHasMore, courses.length]);

  const loadAllCourses = useCallback(async () => {
    const result = await fetchAllCourses(true);
    if (!result) return;
    setCourses(result.courses as Course[]);
    setCatalogTotal(result.total);
    setCatalogHasMore(false);
  }, []);

  const ensureCoursesByIds = useCallback(async (ids: string[]) => {
    if (!ids?.length) return;
    const missing = ids.filter((id) => id && !courses.some((c) => c.id === id)).slice(0, 12);
    if (missing.length === 0) return;

    const details = await Promise.all(missing.map((id) => fetchCourseDetail(id, true)));
    const found = details.filter(Boolean) as Course[];
    if (found.length === 0) return;

    setCourses((prev) => {
      const known = new Set(prev.map((c) => c.id));
      return [...prev, ...found.filter((c) => !known.has(c.id))];
    });
  }, [courses]);

  const [trainingCenters, setTrainingCenters] = useState<TrainingCenter[]>([]);

  const [courseCategories, setCourseCategories] = useState<CourseCategoryRecord[]>([]);
  const [instructorCommissions, setInstructorCommissions] = useState<InstructorCommission[]>([]);
  const [instructorStoragePurchases, setInstructorStoragePurchases] = useState<InstructorStoragePurchase[]>([]);
  const [instructorCenter, setInstructorCenter] = useState<TrainingCenter | null>(null);

  const createTrainingCenter = useCallback(
    (data: { centerName: string; description: string }) => {
      const ownerId = userProfile?.id;
      const tempCenter: TrainingCenter = {
        id: `center-${Date.now()}`,
        ownerId,
        centerName: data.centerName,
        slug: data.centerName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: data.description,
        logo: "",
        banner: "",
        status: "pending",
        isVerified: false,
        feePaid: false,
        feeAmountUsd: 2,
        storageQuotaGb: 4,
        storageUsedBytes: 0,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setTrainingCenters((prev) => [tempCenter, ...prev]);
      setInstructorCenter(tempCenter);

      apiWritePlatform("create-training-center", { ownerId, ...data }).then((res) => {
        if (res.success && res.id) {
          const realCenter: TrainingCenter = {
            ...tempCenter,
            id: res.id,
            status: "active",
            feePaid: true,
          };
          setTrainingCenters((prev) => prev.map((c) => (c.id === tempCenter.id ? realCenter : c)));
          setInstructorCenter(realCenter);
          apiWritePlatform("pay-training-center-fee", { centerId: res.id });
          alert("🎉 Votre centre de formation a été créé et est actif !");
        } else {
          alert(
            "⚠️ Le centre a été créé localement mais n'a pas été enregistré en base (serveur inaccessible). " +
            "Réessayez ou contactez l'admin."
          );
        }
      });
    },
    [userProfile]
  );

  const updateInstructorCourse = useCallback(
    (courseId: string, updates: Partial<Course>) => {
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, ...updates } : c))
      );
      apiWritePlatform("update-course", {
        id: courseId,
        title: updates.title,
        slug: updates.slug,
        category: updates.category,
        categoryLabel: updates.categoryLabel,
        description: updates.description,
        fullDescription: updates.fullDescription,
        level: updates.level,
        durationHours: updates.durationHours,
        lessonsCount: updates.lessonsCount,
        price: updates.price,
        image: updates.image,
        badge: updates.badge,
        instructorName: updates.instructor?.name,
        instructorRole: updates.instructor?.role,
        instructorAvatar: updates.instructor?.avatar,
        learningOutcomes: updates.learningOutcomes,
        isPublished: (updates as any).isPublished,
        chapters: (updates as any).chapters || [],
        quiz: (updates as any).quiz || [],
      });
      alert("✅ Formation mise à jour avec succès !");
      clearPlatformCache();
      refreshPlatformData();
    },
    []
  );

  const rateCourse = useCallback(
    (courseId: string, rating: number) => {
      const userId = userProfile?.id;
      if (!userId) {
        alert("Connectez-vous pour noter une formation.");
        return;
      }
      const clamped = Math.max(1, Math.min(5, Math.round(rating)));

      apiWritePlatform("rate-course", {
        courseId,
        userId,
        rating: clamped,
      }).then((res: any) => {
        if (res?.alreadyRated) {
          alert("⭐ Vous avez déjà noté cette formation. Un seul vote est autorisé par personne.");
          return;
        }
        if (res?.success && typeof res.rating === "number") {
          setCourses((prev) =>
            prev.map((c) =>
              c.id === courseId
                ? { ...c, rating: res.rating, reviewsCount: res.reviewsCount }
                : c
            )
          );
        }
      });
    },
    [userProfile?.id]
  );

  const addInstructorCourse = useCallback(
    (course: Course) => {
      const tempId = String(course.id || `course-${Date.now()}`);
      setCourses((prev) => [{ ...(course as any), id: tempId } as Course, ...prev]);
      apiWritePlatform("submit-course-by-instructor", {
        title: course.title,
        slug: course.slug || `cours-${Date.now()}`,
        instructorId: userProfile?.id,
        centerId: instructorCenter?.id,
        categoryId: course.category as string,
        categoryLabel: course.categoryLabel || course.category,
        description: course.description,
        fullDescription: course.fullDescription,
        level: course.level,
        durationHours: course.durationHours,
        lessonsCount: course.lessonsCount,
        price: course.price,
        image: course.image,
        instructorName: course.instructor?.name,
        instructorRole: course.instructor?.role,
        instructorAvatar: course.instructor?.avatar,
        learningOutcomes: course.learningOutcomes,
        chapters: course.chapters || [],
        quiz: course.quiz || [],
        isPublished: true,
      }).then((res) => {
        if (res.success && res.id) {
          setCourses((prev) =>
            prev.map((c) => (c.id === tempId ? { ...c, id: res.id as string } : c))
          );
          clearPlatformCache();
          refreshPlatformData();
        }
      });
    },
    [userProfile, instructorCenter]
  );

  const addCourseCategory = useCallback(
    (payload: { label: string; code?: string; description?: string; iconName?: string }) => {
      const label = String(payload.label || "").trim();
      if (!label) {
        alert("Le nom de la catégorie est obligatoire.");
        return;
      }

      const tempId = `cat-${Date.now()}`;
      setCourseCategories((prev) => [
        ...prev,
        {
          id: tempId,
          code:
            payload.code ||
            label
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, ""),
          label,
          description: payload.description || "",
          iconName: payload.iconName || "",
          displayOrder: prev.length + 1,
          isActive: true,
        },
      ]);

      apiWritePlatform("create-course-category", {
        label,
        code: payload.code || "",
        description: payload.description || "",
        iconName: payload.iconName || "",
      }).then((res) => {
        if (res.success && res.id) {
          setCourseCategories((prev) =>
            prev.map((c) => (c.id === tempId ? { ...c, id: res.id as string } : c))
          );
        } else {
          alert(res.error || "Catégorie créée localement mais non enregistrée en base.");
        }
      });
    },
    []
  );

  const updateCourseCategory = useCallback((category: CourseCategoryRecord) => {
    setCourseCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)));
    // Le libellé affiché sur les formations suit la catégorie (cohérence immédiate)
    setCourses((prev) =>
      prev.map((course) =>
        (course as any).categoryId === category.id || (course as any).category?.id === category.id
          ? ({ ...course, categoryLabel: category.label } as Course)
          : course
      )
    );
    apiWritePlatform("update-course-category", {
      id: category.id,
      label: category.label,
      description: category.description || "",
      iconName: category.iconName || "",
      displayOrder: category.displayOrder ?? 0,
      isActive: category.isActive ?? true,
    });
  }, []);

  const toggleCourseFeatured = useCallback((courseId: string, isFeatured: boolean) => {
    setCourses((prev) =>
      prev.map((course) => (course.id === courseId ? ({ ...course, isFeatured } as Course) : course))
    );
    apiWritePlatform("set-course-featured", { courseId, isFeatured });
  }, []);

  const deleteCourseCategory = useCallback(async (id: string): Promise<boolean> => {
    const res = await apiWritePlatform("delete-course-category", { id });
    if (!res.success) {
      alert(res.error || "Suppression impossible : cette catégorie est peut-être encore utilisée.");
      return false;
    }
    setCourseCategories((prev) => prev.filter((c) => c.id !== id));
    return true;
  }, []);

  const suspendInstructorCourse = useCallback((courseId: string) => {
    setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, isPublished: false } : c)));
    apiWritePlatform("suspend-course", { id: courseId });
  }, []);

  const deleteInstructorCourse = useCallback((courseId: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    apiWritePlatform("delete-course", { id: courseId });
  }, []);

  const buyInstructorStorage = useCallback(
    (center: TrainingCenter, amountGb: number, amountUsd: number) => {
      const updated = { ...center, storageQuotaGb: center.storageQuotaGb + amountGb };
      setInstructorCenter(updated);
      setTrainingCenters((prev) => prev.map((c) => (c.id === center.id ? updated : c)));
      apiWritePlatform("register-instructor-purchase", {
        instructorId: userProfile?.id,
        centerId: center.id,
        amountGb,
        amountUsd,
      });
    },
    [userProfile]
  );

  const adminAddInstructor = useCallback(
    (data: { email: string; centerName: string; description?: string; storageQuotaGb?: number }) => {
      const tempCenter: TrainingCenter = {
        id: `center-${Date.now()}`,
        centerName: data.centerName,
        slug: data.centerName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: data.description || "",
        logo: "",
        banner: "",
        status: "active",
        isVerified: true,
        feePaid: true,
        feeAmountUsd: 2,
        storageQuotaGb: data.storageQuotaGb || 4,
        storageUsedBytes: 0,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setTrainingCenters((prev) => [tempCenter, ...prev]);
      apiWritePlatform("admin-add-instructor", data).then((res) => {
        if (res.success && res.id) {
          const realCenter: TrainingCenter = { ...tempCenter, id: res.id };
          setTrainingCenters((prev) => prev.map((c) => (c.id === tempCenter.id ? realCenter : c)));
        }
      });
    },
    []
  );

  const addCourse = useCallback(
    (course: Course) => {
      setCourses((prev) => [course, ...prev]);
      apiWritePlatform("create-course", {
        title: course.title,
        slug: course.slug || `cours-${Date.now()}`,
        category: course.category,
        categoryLabel: course.categoryLabel || course.category,
        description: course.description,
        fullDescription: course.fullDescription,
        level: course.level,
        durationHours: course.durationHours,
        lessonsCount: course.lessonsCount,
        price: course.price,
        image: course.image,
        badge: course.badge,
        instructorName: course.instructor?.name || "",
        instructorRole: course.instructor?.role || "",
        instructorAvatar: course.instructor?.avatar || "",
        learningOutcomes: course.learningOutcomes || [],
        isPublished: (course as any).isPublished ?? true,
      });
    },
    [setCourses]
  );
  const updateCourse = useCallback(
    (course: Course) => {
      setCourses((prev) => prev.map((c) => (c.id === course.id ? course : c)));
      apiWritePlatform("update-course", {
        id: course.id,
        title: course.title,
        description: course.description,
        fullDescription: course.fullDescription,
        level: course.level,
        durationHours: course.durationHours,
        price: course.price,
        image: course.image,
        badge: course.badge,
        instructorName: course.instructor?.name || "",
        instructorRole: course.instructor?.role || "",
        instructorAvatar: course.instructor?.avatar || "",
        learningOutcomes: course.learningOutcomes || [],
        isPublished: (course as any).isPublished ?? true,
      });
    },
    [setCourses]
  );
  const deleteCourse = useCallback(
    (id: string) => setCourses((prev) => prev.filter((c) => c.id !== id)),
    [setCourses]
  );

  const recordCourseProgress = useCallback(
    (courseId: string, percent: number) => {
      if (!courseId || !userProfile) return;
      const safePct = Math.max(0, Math.min(100, Math.round(percent || 0)));
      const updated: UserProfile = {
        ...userProfile,
        courseProgress: {
          ...(userProfile.courseProgress || {}),
          [courseId]: safePct,
        },
      };
      persistUserLearning(updated);
    },
    [userProfile, persistUserLearning]
  );

  const grantCertificate = useCallback(
    (certificate: Certificate) => {
      if (!certificate?.courseTitle || !userProfile) return;
      // Candidat local (utilisé uniquement si le serveur est indisponible)
      const candidate: Certificate = {
        ...certificate,
        courseId: certificate.courseId || undefined,
        userId: userProfile.id,
      };

      const applyCertificate = (finalCert: Certificate) => {
        const existing = userProfile.earnedCertificates || [];
        if (existing.some((c) => c.id === finalCert.id)) return;
        const updated: UserProfile = {
          ...userProfile,
          earnedCertificates: [...existing, finalCert],
        };
        setUserProfile(updated);
        try {
          localStorage.setItem("fortia_user_profile", JSON.stringify(updated));
        } catch (e) {}
        if (userProfile.id) {
          apiWritePlatform("sync-user-learning", {
            userId: userProfile.id,
            courseProgress: updated.courseProgress || {},
            enrolledCourseIds: updated.enrolledCourseIds || [],
            earnedCertificates: updated.earnedCertificates || [],
          });
        }
      };

      if (userProfile.id) {
        // Voie officielle : le serveur génère un numéro UNIQUE enregistré en base
        apiWritePlatform("issue-certificate", {
          userId: userProfile.id,
          courseId: certificate.courseId || undefined,
          courseTitle: certificate.courseTitle,
          studentName: certificate.studentName,
          category: certificate.category || "",
          grade: certificate.grade || "",
        }).then((res) => {
          if (res.success && res.certificate) {
            applyCertificate(res.certificate as unknown as Certificate);
          } else {
            applyCertificate(candidate);
          }
        });
      } else {
        applyCertificate(candidate);
      }
    },
    [userProfile]
  );

  const ensureCourseEnrollment = useCallback(
    (courseId: string) => {
      if (!courseId || !userProfile) return;
      const enrolled = userProfile.enrolledCourseIds || [];
      if (enrolled.includes(courseId)) return;
      const updated: UserProfile = {
        ...userProfile,
        enrolledCourseIds: [...enrolled, courseId],
        courseProgress: {
          ...(userProfile.courseProgress || {}),
          [courseId]: userProfile.courseProgress?.[courseId] ?? 0,
        },
      };
      persistUserLearning(updated);
    },
    [userProfile, persistUserLearning]
  );

  // --- Centre de formation du formateur connecté (synchronisé avec le profil) ---
  useEffect(() => {
    if (!isUserLoggedIn || !userProfile?.id) {
      setInstructorCenter(null);
      return;
    }
    const found = trainingCenters.find((c) => c.ownerId === userProfile.id) || null;
    setInstructorCenter(found);
  }, [isUserLoggedIn, userProfile?.id, trainingCenters]);

  // Objet mémoïsé : son identité ne change que lorsqu'un état du domaine change
  // (les actions sont stables) — d'où des re-rendus strictement ciblés.
  return useMemo(
    () => ({
    setInstructorCenter,
    setInstructorStoragePurchases,
    setInstructorCommissions,
    setCourseCategories,
    setCourses,
    courses,
    addCourse,
    updateCourse,
    deleteCourse,
    courseCategories,
    addCourseCategory,
    updateCourseCategory,
    deleteCourseCategory,
    toggleCourseFeatured,
    trainingCenters,
    setTrainingCenters,
    instructorCommissions,
    instructorStoragePurchases,
    instructorCenter,
    createTrainingCenter,
    addInstructorCourse,
    updateInstructorCourse,
    suspendInstructorCourse,
    deleteInstructorCourse,
    rateCourse,
    recordCourseProgress,
    ensureCourseEnrollment,
    grantCertificate,
    buyInstructorStorage,
    adminAddInstructor,
    catalogTotal,
    setCatalogTotal,
    catalogHasMore,
    setCatalogHasMore,
    loadMoreCourses,
    loadAllCourses,
    ensureCoursesByIds,    }),
    [
      userProfile,
      isUserLoggedIn,
      setUserProfile,
      persistUserLearning,
      refreshPlatformData,
      courses,
      catalogTotal,
      catalogHasMore,
      trainingCenters,
      courseCategories,
      instructorCommissions,
      instructorStoragePurchases,
      instructorCenter,
    ]
  );
}
