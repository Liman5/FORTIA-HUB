import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/requireAdmin";

// ============================================================
// Données mockées supprimées : le projet n'utilise plus de
// données fictives. Le seed "UNIQUEMENT SI VIDE" du POST
// ci-dessous est désormais inopérant (tableaux vides).
// Les tables Supabase sont alimentées uniquement par les vrais
// flux (création de cours, produits, boutiques par les acteurs).
// ============================================================
const INITIAL_COURSES: any[] = [];
const INITIAL_STORES: any[] = [];
const INITIAL_MARKETPLACE_PRODUCTS: any[] = [];

/**
 * GET /api/platform/sync
 * Récupère toutes les données de la plateforme depuis Supabase (via Prisma).
 * Utilisé par le frontend pour initialiser le store avec les données réelles.
 * Mode : LECTURE SEULE — ne modifie jamais la base.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req).catch(() => null);
  if (!admin) {
    return NextResponse.json(
      { error: "Accès réservé à l'administration." },
      { status: 401 }
    );
  }

  const warnings: string[] = [];

  // Helper tolérant : si une table échoue (colonne manquante, enum, réseau),
  // on renvoie [] pour CETTE section au lieu de faire planter la réponse entière.
  // → /api/platform/sync ne renvoie plus jamais un 500 global.
  async function safeFind<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
    try {
      return await fn();
    } catch (e: any) {
      warnings.push(`[${label}] ${e?.message || "Erreur de lecture"}`);
      return [];
    }
  }

  async function safeFindFirst<T>(label: string, fn: () => Promise<T | null>): Promise<T | null> {
    try {
      return await fn();
    } catch (e: any) {
      warnings.push(`[${label}] ${e?.message || "Erreur de lecture"}`);
      return null;
    }
  }

  // ========== FORMATIONS & ACADÉMIE (multi-formateurs) ==========
  const trainingCenters = await safeFind("training_centers", () =>
    prisma.trainingCenter.findMany({ orderBy: { createdAt: "desc" } })
  );
  // ⚠️ Commissions et achats de stockage des formateurs = données financières :
  // servies uniquement par /api/platform/admin-sync (admins).
  const courses = await safeFind("courses", () =>
    prisma.course.findMany({
      include: {
        category: true,
        chapters: {
          orderBy: { displayOrder: "asc" },
          include: { lessons: { orderBy: { displayOrder: "asc" } } },
        },
        quizzes: {
          orderBy: { displayOrder: "asc" },
          include: { options: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  );
  const courseCategories = await safeFind("course_categories", () =>
    prisma.courseCategory.findMany({ orderBy: { displayOrder: "asc" } })
  );

  // ========== MARKETPLACE (boutiques, produits) ==========
  // ⚠️ Les commandes, demandes de retrait et candidatures vendeurs ne sont
  // PLUS renvoyées ici : elles contiennent des données personnelles et sont
  // servies uniquement par /api/platform/admin-sync (réservé aux admins).
  const stores = await safeFind("stores", () =>
    prisma.store.findMany({ orderBy: { createdAt: "desc" } })
  );
  const products = await safeFind("products", () =>
    prisma.product.findMany({ orderBy: { createdAt: "desc" } })
  );

  // ========== FREELANCE & ENTREPRISES ==========
  const freelances = await safeFind("freelance_profiles", () =>
    prisma.freelanceProfile.findMany({ include: { services: true, portfolio: true } })
  );
  const enterprises = await safeFind("enterprise_profiles", () =>
    prisma.enterpriseProfile.findMany({ include: { team: true, portfolio: true, services: true } })
  );

  // ========== BLOG ==========
  const blogPosts = await safeFind("blog_posts", () =>
    prisma.blogPost.findMany({ include: { blogCategory: true }, orderBy: { date: "desc" } })
  );
  const blogCategories = await safeFind("blog_categories", () =>
    prisma.blogCategory.findMany()
  );

  // ========== SERVICES ==========
  const servicePackages = await safeFind("service_packages", () =>
    prisma.servicePackage.findMany({ include: { options: true } })
  );
  // ⚠️ Les demandes de devis (`service_quotes`), le support post-achat et les
  // dossiers KYC contiennent des données personnelles : ils ne sont plus servis
  // ici mais par /api/platform/admin-sync.

  // ========== NOTIFICATIONS & CONTENU ==========
  const notifications = await safeFind("notifications", () =>
    prisma.notification.findMany({ orderBy: { createdAt: "desc" } })
  );
  const siteContent = await safeFind("site_content", () => prisma.siteContent.findMany());

  // ========== CONFIG PUBLIQUE ==========
  const feeConfig = await safeFindFirst("registration_fee_config", () =>
    prisma.registrationFeeConfig.findFirst()
  );
  const platformStats = await safeFindFirst("platform_stats", () => prisma.platformStats.findFirst());

  // --- Retrait des coordonnées de paiement des boutiques (données privées) ---
  const publicStores = (stores || []).map((store: any) => {
    if (!store || typeof store !== "object") return store;
    const { payoutInfo, ...rest } = store;
    return {
      ...rest,
      // On conserve uniquement le mode de retrait, jamais le numéro de compte
      payoutMethod: payoutInfo?.method || "",
    };
  });

  // --- Réponses de quiz : `isCorrect` réservé au propriétaire / admin ---
  const publicCourses = (courses || []).map((course: any) => {
    const canEdit = true;
    return {
      ...course,
      quizzes: (course.quizzes || []).map((quiz: any) => ({
        ...quiz,
        options: (quiz.options || []).map((option: any) => {
          const { isCorrect, ...safeOption } = option;
          return canEdit ? { ...safeOption, isCorrect } : safeOption;
        }),
      })),
    };
  });

  const body = JSON.stringify(
    {
      success: true,
      warnings,
      data: {
        courses: publicCourses,
        courseCategories,
        trainingCenters,
        stores: publicStores,
        products,
        freelances,
        enterprises,
        blogPosts,
        blogCategories,
        servicePackages,
        notifications,
        siteContent,
        feeConfig,
        platformStats,
      },
    },
    (_key, value) => (typeof value === "bigint" ? Number(value.toString()) : value)
  );

  return new NextResponse(body, {
    headers: { "Content-Type": "application/json" },
  });
}

// ============================================================
// HELPERS DE PROTECTION & NORMALISATION
// ============================================================

/**
 * Convertit une date string mock ('2026-01-15') en objet Date JS.
 * Retourne undefined si invalide (Prisma ignorera le champ).
 */
function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Normalise les valeurs d'enums mock vers les enums Prisma :
 * - 'Payé'      → 'Paye'
 * - 'En attente' → 'En_attente'
 * - 'En cours'  → 'En_cours'
 * Les espaces → underscores, les accents supprimés.
 */
function normalizeEnumValue(value: string | undefined | null, fallback: string): string {
  if (!value) return fallback;
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // supprime les accents
    .replace(/\s+/g, "_")            // espaces → underscores
    .replace(/[^a-zA-Z0-9_]/g, "");  // nettoie
}

// ============================================================
// POST /api/platform/sync — SEED CONTRÔLÉ "UNIQUEMENT SI VIDE"
// ============================================================
// Règles strictes :
//   1. Mode seed uniquement si vide : si une table contient déjà des
//      enregistrements, elle est IGNORÉE (aucune écriture).
//   2. Aucune donnée existante n'est écrasée : création uniquement,
//      jamais d'update/upsert qui modifie.
//   3. Les compteurs (salesCount, reviewsCount, studentsCount,
//      totalRevenueUsd, rating, createdAt) des données réelles ne sont
//      jamais touchés car aucune ligne existante n'est modifiée.
//   4. Dry-run : body { dryRun: true } → rapport détaillé sans écrire.
//   5. Aucune suppression n'est jamais effectuée.
// ============================================================
export async function POST(req: NextRequest) {
  // ====== AUTORISATION ======
  const authHeader = req.headers.get("authorization") || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // ====== MODE DRY-RUN ======
  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = body?.dryRun === true;
  } catch {
    // corps vide ou illisible → dryRun = false
  }

  const results = {
    dryRun,
    mode: "seedOnlyIfEmpty",
    message: dryRun
      ? "Mode DRY-RUN : aucune écriture effectuée. Rapport de simulation ci-dessous."
      : "Mode SEED UNIQUEMENT SI VIDE : les tables non vides sont ignorées.",
    created: {} as Record<string, number>,
    skipped: {} as Record<string, string>,
    errors: [] as string[],
  };

  try {
    // ============================================================
    // 1. CATÉGORIES DE COURS — seed si table vide uniquement
    // ============================================================
    const categoriesFromMock = Array.from(
      new Map(
        INITIAL_COURSES.map((c) => [
          c.category,
          { code: c.category, label: c.categoryLabel || c.category },
        ])
      ).values()
    );

    const categoriesCount = await prisma.courseCategory.count();
    if (categoriesCount === 0) {
      if (dryRun) {
        results.created.categories = categoriesFromMock.length;
      } else {
        for (const cat of categoriesFromMock) {
          await prisma.courseCategory.create({
            data: { code: cat.code, label: cat.label },
          });
        }
        results.created.categories = categoriesFromMock.length;
      }
    } else {
      results.skipped.categories = `${categoriesCount} enregistrement(s) déjà présent(s) — ignoré (protection anti-écrasement)`;
    }

    // ============================================================
    // 2. FORMATIONS (cours + chapitres + leçons + quiz)
    //    Seed si la table courses est vide uniquement
    // ============================================================
    const coursesCount = await prisma.course.count();
    if (coursesCount === 0) {
      if (dryRun) {
        results.created.courses = INITIAL_COURSES.length;
      } else {
        let seededCourses = 0;
        for (const course of INITIAL_COURSES) {
          // Catégorie (créée ci-dessus si vide, sinon existante)
          const category = await prisma.courseCategory.findUnique({
            where: { code: course.category },
          });

          const createdCourse = await prisma.course.create({
            data: {
              title: course.title,
              slug: course.slug,
              categoryId: category?.id,
              categoryLabel: course.categoryLabel,
              description: course.description,
              fullDescription: course.fullDescription,
              level: course.level as any,
              durationHours: course.durationHours,
              lessonsCount: course.lessonsCount,
              price: course.price,
              rating: course.rating,
              reviewsCount: course.reviewsCount,
              studentsCount: course.studentsCount,
              image: course.image,
              badge: course.badge,
              instructorName: course.instructor?.name || "",
              instructorRole: course.instructor?.role || "",
              instructorAvatar: course.instructor?.avatar || "",
              learningOutcomes: course.learningOutcomes || [],
              isPublished: true,
            },
          });

          // Chapitres & leçons (IDs générés par Prisma — UUID)
          if (course.chapters?.length) {
            for (const [ci, chapter] of course.chapters.entries()) {
              const createdChapter = await prisma.courseChapter.create({
                data: {
                  courseId: createdCourse.id,
                  title: chapter.title,
                  displayOrder: ci,
                },
              });

              for (const [li, lesson] of (chapter.lessons || []).entries()) {
                await prisma.courseLesson.create({
                  data: {
                    chapterId: createdChapter.id,
                    title: lesson.title,
                    duration: lesson.duration,
                    type: lesson.type as any,
                    displayOrder: li,
                  },
                });
              }
            }
          }

          // Quiz & options
          if (course.quiz?.length) {
            for (const [qi, quiz] of course.quiz.entries()) {
              const createdQuiz = await prisma.courseQuiz.create({
                data: {
                  courseId: createdCourse.id,
                  question: quiz.question,
                  explanation: quiz.explanation || "",
                  displayOrder: qi,
                },
              });

              for (const [oi, option] of (quiz.options || []).entries()) {
                await prisma.quizOption.create({
                  data: {
                    quizId: createdQuiz.id,
                    optionText: option,
                    isCorrect: oi === quiz.correctAnswer,
                    displayOrder: oi,
                  },
                });
              }
            }
          }

          seededCourses++;
        }
        results.created.courses = seededCourses;
      }
    } else {
      results.skipped.courses = `${coursesCount} enregistrement(s) déjà présent(s) — ignoré (protection anti-écrasement)`;
    }

    // ============================================================
    // 3. BOUTIQUES — seed si table stores vide uniquement
    // ============================================================
    const storesCount = await prisma.store.count();
    if (storesCount === 0) {
      if (dryRun) {
        results.created.stores = INITIAL_STORES.length;
      } else {
        let seededStores = 0;
        for (const store of INITIAL_STORES) {
          const createdStore = await prisma.store.create({
            data: {
              vendorId: store.vendorId || undefined,
              ownerName: store.ownerName,
              ownerEmail: store.ownerEmail,
              ownerPhone: store.ownerPhone,
              name: store.name,
              slug: store.slug,
              logo: store.logo,
              banner: store.banner,
              description: store.description,
              categories: store.categories || [],
              status: normalizeEnumValue(store.status, "active") as any,
              isVerified: store.isVerified ?? false,
              salesCount: 0, // jamais la valeur mock — compteur réel à 0 au seed
              totalRevenueUsd: 0, // jamais la valeur mock
              createdAt: toDate(store.createdAt),
            },
          });

          // Infos de paiement du vendeur
          if (store.payoutInfo) {
            await prisma.storePayoutInfo.create({
              data: {
                storeId: createdStore.id,
                method: store.payoutInfo.method,
                accountName: store.payoutInfo.accountName,
                accountNumber: store.payoutInfo.accountNumber,
                providerName: store.payoutInfo.providerName || "",
              },
            });
          }

          seededStores++;
        }
        results.created.stores = seededStores;
      }
    } else {
      results.skipped.stores = `${storesCount} enregistrement(s) déjà présent(s) — ignoré (protection anti-écrasement)`;
    }

    // ============================================================
    // 4. PRODUITS — seed si table products vide uniquement
    //    (les boutiques sont recherchées par slug ; storeId = null
    //     si introuvable, jamais d'écrasement)
    // ============================================================
    const productsCount = await prisma.product.count();
    if (productsCount === 0 && INITIAL_MARKETPLACE_PRODUCTS?.length) {
      if (dryRun) {
        results.created.products = INITIAL_MARKETPLACE_PRODUCTS.length;
      } else {
        let seededProducts = 0;
        for (const product of INITIAL_MARKETPLACE_PRODUCTS) {
          const store = product.storeName
            ? await prisma.store.findFirst({ where: { name: product.storeName } })
            : await prisma.store.findUnique({ where: { slug: "fortia-digital-official" } });

          await prisma.product.create({
            data: {
              storeId: store?.id,
              vendorId: product.vendorId || undefined,
              storeName: product.storeName || store?.name || "FORTIA Digital Official Store",
              storeLogo: product.storeLogo || store?.logo || "",
              title: product.title,
              slug: product.slug,
              type: normalizeEnumValue(product.type, "ebook") as any,
              typeLabel: product.typeLabel || product.type,
              description: product.description,
              fullDescription: product.fullDescription || "",
              price: product.price,
              originalPrice: product.originalPrice,
              fileFormat: product.fileFormat || "PDF",
              fileSize: product.fileSize || "10 MB",
              image: product.image,
              bannerImage: product.bannerImage || "",
        images: Array.isArray(product.images) ? product.images : [],
              features: product.features || [],
              downloadUrl: product.downloadUrl || "#",
              isPublished: product.isPublished ?? true,
              isApproved: product.isApproved ?? true,
              isPopular: product.isPopular ?? false,
              rating: 5.0, // jamais la valeur mock — baseline au seed
              reviewsCount: 0, // jamais la valeur mock
              salesCount: 0, // jamais la valeur mock
              createdAt: toDate(product.createdAt),
            },
          });

          seededProducts++;
        }
        results.created.products = seededProducts;
      }
    } else if (productsCount > 0) {
      results.skipped.products = `${productsCount} enregistrement(s) déjà présent(s) — ignoré (protection anti-écrasement)`;
    }

    // ============================================================
    // 5. RÉPONSE
    // ============================================================
    const totalCreated = Object.values(results.created).reduce((a, b) => a + b, 0);
    const totalSkipped = Object.keys(results.skipped).length;

    return NextResponse.json({
      success: true,
      ...results,
      summary: {
        totalCreated,
        totalSkippedTables: totalSkipped,
        note: dryRun
          ? "Aucune écriture effectuée (dry-run)."
          : "Seed terminé. Les tables non vides n'ont pas été modifiées.",
        protection: "Aucune suppression, aucun écrasement, aucun update de données existantes.",
      },
    });
  } catch (error: any) {
    console.error("Erreur de synchronisation:", error);
    results.errors.push(error?.message || "Erreur inconnue");
    return NextResponse.json(
      { success: false, ...results, error: results.errors.join("; ") },
      { status: 500 }
    );
  }
}