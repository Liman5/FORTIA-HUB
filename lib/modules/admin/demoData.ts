// ============================================================
// FORTIA HUB — GESTION DES DONNÉES DE DÉMONSTRATION
// ------------------------------------------------------------
// Le seed (`npm run seed:demo`) marque chaque ligne créée avec
// `is_demo = true`. Ce module :
//   · compte ces lignes par type ;
//   · les supprime en une transaction, dans l'ordre des dépendances.
//
// Garanties :
//   · seules les lignes `is_demo = true` sont touchées (jamais les
//     données réelles) ;
//   · les comptes utilisateurs ne sont JAMAIS supprimés ici (un compte
//     peut porter des commandes/paiements protégés) ;
//   · l'opération est journalisée dans `admin_audit_logs`.
// ============================================================

import { prisma } from "@/lib/prisma";
import type { AdminContext } from "@/lib/server/requireAdmin";

/** Mot exact exigé par le serveur avant toute suppression. */
export { DEMO_CONFIRMATION_WORD, isValidDemoConfirmation } from "./demoConfirmation";

export interface DemoDataCounts {
  categories: number;
  courses: number;
  lessons: number;
  stores: number;
  products: number;
  centers: number;
  freelances: number;
  banners: number;
  /** Comptes marqués démo (jamais supprimés automatiquement). */
  users: number;
}

export interface DemoPurgeResult {
  deleted: {
    categories: number;
    courses: number;
    lessons: number;
    stores: number;
    products: number;
    centers: number;
    freelances: number;
    banners: number;
  };
  usersPreserved: number;
}

/** Comptage réel, en base. */
export async function countDemoData(): Promise<DemoDataCounts> {
  const [categories, courses, lessons, stores, products, centers, freelances, banners, users] =
    await Promise.all([
      prisma.courseCategory.count({ where: { isDemo: true } }),
      prisma.course.count({ where: { isDemo: true } }),
      prisma.courseLesson.count({ where: { chapter: { course: { isDemo: true } } } }),
      prisma.store.count({ where: { isDemo: true } }),
      prisma.product.count({ where: { isDemo: true } }),
      prisma.trainingCenter.count({ where: { isDemo: true } }),
      prisma.freelanceProfile.count({ where: { isDemo: true } }),
      prisma.siteBanner.count({ where: { isDemo: true } }),
      prisma.user.count({ where: { isDemo: true } }),
    ]);

  return { categories, courses, lessons, stores, products, centers, freelances, banners, users };
}

/**
 * Supprime toutes les données de démonstration.
 * Ordre : enfants → parents, afin de respecter les clés étrangères.
 */
export async function purgeDemoData(actor?: AdminContext | null): Promise<DemoPurgeResult> {
  const before = await countDemoData();

  const deleted = await prisma.$transaction(
    async (tx) => {
      // 1. Contenu pédagogique (leçons puis chapitres) des formations démo.
      const lessons = await tx.courseLesson.deleteMany({
        where: { chapter: { course: { isDemo: true } } },
      });

      // 2. Formations démo (avis/inscriptions liés suivent les règles Phase 4).
      const courses = await tx.course.deleteMany({ where: { isDemo: true } });

      // 3. Produits démo (fichiers livrables en cascade).
      const products = await tx.product.deleteMany({ where: { isDemo: true } });

      // 4. Boutiques démo (les produits ont déjà été retirés).
      const stores = await tx.store.deleteMany({ where: { isDemo: true } });

      // 5. Centres de formation démo.
      const centers = await tx.trainingCenter.deleteMany({ where: { isDemo: true } });

      // 6. Profils de freelances démo (services/portfolio en cascade).
      const freelances = await tx.freelanceProfile.deleteMany({ where: { isDemo: true } });

      // 7. Bannières démo.
      const banners = await tx.siteBanner.deleteMany({ where: { isDemo: true } });

      // 8. Catégories démo (plus aucune formation ne les référence).
      const categories = await tx.courseCategory.deleteMany({ where: { isDemo: true } });

      return {
        categories: categories.count,
        courses: courses.count,
        lessons: lessons.count,
        stores: stores.count,
        products: products.count,
        centers: centers.count,
        freelances: freelances.count,
        banners: banners.count,
      };
    },
    { timeout: 60_000 }
  );

  const metadata: Record<string, Record<string, number>> = {
    before: { ...before },
    deleted: { ...deleted },
  };

  await prisma.adminAuditLog
    .create({
      data: {
        actorId: actor?.id || "",
        actorEmail: actor?.email || "",
        actorRole: actor?.role || "",
        action: "purge_demo_data",
        targetEmail: "",
        reason: "Suppression des données de démonstration (seed)",
        metadata,
      },
    })
    .catch(() => null);

  return { deleted, usersPreserved: before.users };
}
