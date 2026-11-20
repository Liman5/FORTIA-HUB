// ============================================================
// FORTIA HUB — Contrôle d'accès aux fichiers Cloudflare R2
// ------------------------------------------------------------
// Deux catégories de dossiers :
//   • PUBLICS  : images visibles par tous (vitrines, blogs, site)
//   • PRIVÉS   : documents KYC, livrables produits, vidéos de
//                formation → accessibles UNIQUEMENT aux ayants droit
//                (propriétaire, acheteur, formateur, administrateur)
//                et uniquement via des URL signées à durée limitée.
//
// Toute autorisation s'appuie sur la BASE DE DONNÉES (jamais sur un
// indicateur envoyé par le navigateur).
// ============================================================
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/services/authSession";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { hasEntitlement } from "@/lib/modules/payments/entitlements";

/** Dossiers dont les fichiers sont librement lisibles (images publiques). */
export const PUBLIC_FOLDERS = ["store-images", "blog-images", "site-media", "product-images"] as const;

/** Dossiers privés : lecture et écriture contrôlées. */
export const PRIVATE_FOLDERS = ["kyc-documents", "product-files", "course-media", "certificates"] as const;

export type StorageFolder = (typeof PUBLIC_FOLDERS)[number] | (typeof PRIVATE_FOLDERS)[number];

/** Identité de l'appelant, construite à partir de la session serveur. */
export interface StorageActor {
  userId: string;
  email: string;
  name: string;
  accountType: string;
  /** IDs de formations réellement suivies (`users.enrolled_course_ids`). */
  enrolledCourseIds: string[];
  /** IDs de produits réellement achetés (`users.purchased_product_ids`). */
  purchasedProductIds: string[];
  isAdmin: boolean;
}

export interface ParsedKey {
  folder: string;
  entityId: string;
  fileName: string;
  isPublic: boolean;
}

/**
 * Un identifiant d'entité est-il un UUID ?
 * Le navigateur envoie parfois un identifiant temporaire (« new-1792… »)
 * quand la ressource n'existe pas encore en base. Toute requête Prisma avec
 * une telle valeur ferait échouer PostgreSQL :
 *   « invalid input syntax for type uuid »
 * On ne tente donc la lecture que pour de vrais UUID.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value: string): boolean {
  return UUID_PATTERN.test(String(value || ""));
}

/** Valide et découpe une clé R2 de la forme `dossier/entite/fichier`. */
export function parseStorageKey(key: string): ParsedKey | null {
  if (!key || key.includes("..") || key.startsWith("/")) return null;
  const parts = key.split("/").filter(Boolean);
  if (parts.length < 3) return null;
  const [folder, entityId] = parts;
  return {
    folder,
    entityId,
    fileName: parts.slice(2).join("/"),
    isPublic: (PUBLIC_FOLDERS as readonly string[]).includes(folder),
  };
}

/** Un appelant non authentifié ne peut lire QUE les dossiers publics. */
export function canReadWithoutSession(key: string): boolean {
  const parsed = parseStorageKey(key);
  return !!parsed?.isPublic;
}

/**
 * Construit l'identité de l'appelant à partir de la session serveur.
 * Retourne `null` si aucun utilisateur (ni administrateur) n'est authentifié.
 */
export async function getStorageActor(req: NextRequest): Promise<StorageActor | null> {
  const user = await getCurrentUser(req);
  const admin = await requireAdmin(req);

  if (!user && !admin) return null;

  return {
    userId: user?.id || "",
    email: user?.email || admin?.email || "",
    name: user?.name || admin?.name || "",
    accountType: user?.accountType || (admin ? "admin" : ""),
    enrolledCourseIds: user?.enrolledCourseIds || [],
    purchasedProductIds: user?.purchasedProductIds || [],
    isAdmin: !!admin,
  };
}

/**
 * Lecture d'un fichier PRIVÉ : l'appelant doit être propriétaire, acheteur,
 * formateur ou administrateur — vérifié en base de données.
 */
export async function canReadPrivateKey(actor: StorageActor, parsed: ParsedKey): Promise<boolean> {
  if (actor.isAdmin) return true;

  switch (parsed.folder) {
    // Documents d'identité : uniquement le déposant du dossier KYC
    case "kyc-documents": {
      const submission = await prisma.kycSubmission.findUnique({
        where: { id: parsed.entityId },
        select: { applicantId: true, email: true },
      });
      if (!submission) return false;
      if (submission.applicantId && submission.applicantId === actor.userId) return true;
      return (
        !!submission.email &&
        submission.email.toLowerCase() === String(actor.email || "").toLowerCase()
      );
    }

    // Livrables produits : acheteur réel (ENTITLEMENT), vendeur, ou produit gratuit
    case "product-files": {
      if (!isUuid(parsed.entityId)) return false;
      if (await hasEntitlement(actor.userId, "product", parsed.entityId)) return true;
      const product = await prisma.product.findUnique({
        where: { id: parsed.entityId },
        select: { vendorId: true, price: true, isPublished: true },
      });
      if (!product) return false;
      if (product.vendorId && product.vendorId === actor.userId) return true;
      return Number(product.price) === 0 && product.isPublished === true;
    }

    // Médias de formation : apprenant avec ENTITLEMENT, formateur, ou gratuit
    case "course-media": {
      if (!isUuid(parsed.entityId)) return false;
      if (await hasEntitlement(actor.userId, "course", parsed.entityId)) return true;
      const course = await prisma.course.findUnique({
        where: { id: parsed.entityId },
        select: { instructorId: true, price: true, isPublished: true },
      });
      if (!course) return false;
      if (course.instructorId && course.instructorId === actor.userId) return true;
      return Number(course.price) === 0 && course.isPublished === true;
    }

    // Attestations : le titulaire de l'attestation
    case "certificates": {
      if (!isUuid(parsed.entityId)) return false;
      const certificate = await prisma.certificate.findUnique({
        where: { id: parsed.entityId },
        select: { userId: true, studentName: true },
      });
      if (!certificate) return false;
      if (certificate.userId && certificate.userId === actor.userId) return true;
      return (
        !!certificate.studentName &&
        certificate.studentName.toLowerCase() === String(actor.name || "").toLowerCase()
      );
    }

    default:
      return false;
  }
}

/**
 * Écriture (upload / suppression) : seuls le propriétaire légitime de la
 * ressource ou un administrateur peuvent écrire dans le stockage.
 */
export async function canWriteKey(actor: StorageActor, parsed: ParsedKey): Promise<boolean> {
  if (actor.isAdmin) return true;

  switch (parsed.folder) {
    case "product-images":
    case "store-images": {
      // Boutique pas encore enregistrée (id « new-… ») : l'utilisateur connecté
      // est autorisé à déposer ses images, comme pour une création en cours.
      if (!isUuid(parsed.entityId)) return !!actor.userId;

      const store = await prisma.store.findUnique({
        where: { id: parsed.entityId },
        select: { vendorId: true, ownerEmail: true },
      });
      if (!store) return !!actor.userId; // boutique en cours de création
      if (store.vendorId && store.vendorId === actor.userId) return true;
      return store.ownerEmail?.toLowerCase() === String(actor.email || "").toLowerCase();
    }

    case "product-files": {
      if (!isUuid(parsed.entityId)) return !!actor.userId;

      const product = await prisma.product.findUnique({
        where: { id: parsed.entityId },
        select: { vendorId: true, storeId: true },
      });
      if (!product) return !!actor.userId; // produit en cours de création
      if (product.vendorId && product.vendorId === actor.userId) return true;
      if (product.storeId && isUuid(product.storeId)) {
        const store = await prisma.store.findUnique({
          where: { id: product.storeId },
          select: { vendorId: true, ownerEmail: true },
        });
        if (store?.vendorId && store.vendorId === actor.userId) return true;
        if (store?.ownerEmail?.toLowerCase() === String(actor.email || "").toLowerCase()) return true;
      }
      return false;
    }

    case "course-media": {
      if (!isUuid(parsed.entityId)) return !!actor.userId;

      const course = await prisma.course.findUnique({
        where: { id: parsed.entityId },
        select: { instructorId: true, centerId: true },
      });
      if (!course) return !!actor.userId; // formation en cours de création
      if (course.instructorId && course.instructorId === actor.userId) return true;
      if (course.centerId && isUuid(course.centerId)) {
        const center = await prisma.trainingCenter.findUnique({
          where: { id: course.centerId },
          select: { ownerId: true },
        });
        if (center?.ownerId && center.ownerId === actor.userId) return true;
      }
      return false;
    }

    case "kyc-documents": {
      if (!isUuid(parsed.entityId)) return !!actor.userId;

      const submission = await prisma.kycSubmission.findUnique({
        where: { id: parsed.entityId },
        select: { applicantId: true, email: true },
      });
      if (!submission) return !!actor.userId; // dossier en cours de constitution
      if (submission.applicantId && submission.applicantId === actor.userId) return true;
      return (
        !!submission.email &&
        submission.email.toLowerCase() === String(actor.email || "").toLowerCase()
      );
    }

    // Images éditoriales : administrateurs uniquement
    case "blog-images":
    case "site-media":
    default:
      return false;
  }
}


