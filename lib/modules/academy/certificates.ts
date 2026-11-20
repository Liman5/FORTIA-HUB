// ============================================================
// FORTIA HUB — ATTESTATIONS VÉRIFIÉES CÔTÉ SERVEUR (Phase 3)
// ------------------------------------------------------------
// Une attestation n'est délivrée que si TOUTES les preuves serveur
// sont réunies : accès réel, toutes les leçons terminées, quiz réussi
// lorsque la formation en comporte. Aucune valeur client n'est utilisée.
// ============================================================

import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/server/errors";
import { logger } from "@/lib/server/logger";
import {
  assertCourseAccess,
  computeCourseProgress,
  type CourseProgressSummary,
} from "./progress";

export interface CertificateEligibility {
  eligible: boolean;
  reasons: string[];
  progress: CourseProgressSummary;
  courseTitle: string;
  category: string;
}

export interface CertificateDTO {
  id: string;
  certificateNumber: string;
  userId: string;
  courseId: string;
  studentName: string;
  courseTitle: string;
  category: string;
  issueDate: string;
  grade: string;
  qrCodeUrl: string;
  verified: boolean;
}

export interface IssueCertificateInput {
  userId: string;
  courseId: string;
  actorId: string;
  isAdmin: boolean;
  /** Réservé aux admins : délivrance exceptionnelle, journalisée. */
  force?: boolean;
}

function categoryCode(label: string): string {
  const code = String(label || "FORT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4);
  return code || "FORT";
}

function gradeFor(quizPercent: number | null): string {
  if (quizPercent === null) return "Attestation de réussite";
  if (quizPercent >= 90) return "Mention Excellent";
  if (quizPercent >= 80) return "Mention Très bien";
  return "Mention Bien";
}

function toDto(row: {
  certificateNumber: string;
  userId: string | null;
  courseId: string | null;
  studentName: string;
  courseTitle: string;
  category: string;
  issueDate: string;
  grade: string;
  qrCodeUrl: string;
  verified: boolean;
}): CertificateDTO {
  return {
    id: row.certificateNumber,
    certificateNumber: row.certificateNumber,
    userId: row.userId || "",
    courseId: row.courseId || "",
    studentName: row.studentName,
    courseTitle: row.courseTitle,
    category: row.category,
    issueDate: row.issueDate,
    grade: row.grade,
    qrCodeUrl: row.qrCodeUrl,
    verified: row.verified,
  };
}

/** Évalue l'éligibilité sans rien écrire. */
export async function evaluateCertificateEligibility(
  userId: string,
  courseId: string
): Promise<CertificateEligibility> {
  const access = await assertCourseAccess(userId, courseId);
  const progress = await computeCourseProgress(userId, courseId);
  const reasons: string[] = [];

  if (progress.totalLessons === 0) {
    reasons.push("Cette formation ne contient aucune leçon vérifiable.");
  } else if (progress.completedLessons < progress.totalLessons) {
    reasons.push(`Leçons terminées : ${progress.completedLessons}/${progress.totalLessons}.`);
  }

  if (progress.totalQuizzes > 0) {
    const passedAll =
      progress.bestQuiz?.passed === true && progress.bestQuiz.total >= progress.totalQuizzes;
    if (!passedAll) {
      reasons.push(
        `Quiz non validé (seuil 70 %, score requis sur ${progress.totalQuizzes} question(s)).`
      );
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    progress,
    courseTitle: access.course.title,
    category: access.course.categoryLabel,
  };
}

/** Délivre (ou retourne) l'attestation officielle d'une formation. */
export async function issueCourseCertificate(
  input: IssueCertificateInput
): Promise<CertificateDTO> {
  const existing = await prisma.certificate.findFirst({
    where: { userId: input.userId, courseId: input.courseId },
  });
  if (existing) return toDto(existing);

  const eligibility = await evaluateCertificateEligibility(input.userId, input.courseId);

  if (!eligibility.eligible) {
    if (!(input.isAdmin && input.force)) {
      throw new AppError(
        409,
        "CERTIFICATE_NOT_ELIGIBLE",
        "Attestation non débloquée : les conditions de réussite ne sont pas remplies.",
        {
          details: eligibility.reasons.map((reason) => ({
            path: "eligibility",
            message: reason,
          })),
        }
      );
    }
    logger.warn("certificate_forced_by_admin", {
      actorId: input.actorId,
      userId: input.userId,
      courseId: input.courseId,
      reasons: eligibility.reasons,
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { name: true },
  });
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "Utilisateur introuvable.");
  }

  const today = new Date();
  const cat = categoryCode(eligibility.category);
  const issueDate = today.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const grade = gradeFor(
    eligibility.progress.totalQuizzes > 0
      ? eligibility.progress.bestQuiz?.percent ?? 0
      : null
  );

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let random = "";
    for (let index = 0; index < 8; index += 1) {
      random += chars[Math.floor(Math.random() * chars.length)];
    }
    const certificateNumber = `FORTIA-${today.getFullYear()}-${cat}-${random}`;
    try {
      const row = await prisma.certificate.create({
        data: {
          certificateNumber,
          userId: input.userId,
          courseId: input.courseId,
          studentName: user.name,
          courseTitle: eligibility.courseTitle,
          category: eligibility.category,
          issueDate,
          grade,
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
            `FORTIA-HUB-CERT:${certificateNumber}`
          )}`,
          verified: true,
        },
      });
      logger.info("certificate_issued", {
        actorId: input.actorId,
        userId: input.userId,
        courseId: input.courseId,
        certificateNumber,
        forced: !eligibility.eligible,
      });
      return toDto(row);
    } catch (error) {
      if (String((error as { code?: string })?.code || "") !== "P2002") throw error;
    }
  }

  throw new AppError(
    500,
    "CERTIFICATE_NUMBER_COLLISION",
    "Impossible de générer un numéro unique."
  );
}

