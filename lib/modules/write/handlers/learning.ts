// ============================================================
// FORTIA HUB — HANDLERS D'ÉCRITURE (Phase 5)
// Généré depuis l'ancien switch ; l'autorisation et la validation
// restent centralisées dans /api/platform/write.
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { assertCenterAccess, requireActorUser, resolveTargetUserId } from "@/lib/server/writeAuthorization";

import { issueCourseCertificate } from "@/lib/modules/academy/certificates";
import { computeCourseProgress } from "@/lib/modules/academy/progress";

import { UUID_PATTERN, uuidOrNull } from "@/lib/validation/common";
import type { WriteHandlerContext } from "../types";

export async function handleLearningAction(
  action: string,
  context: WriteHandlerContext
): Promise<Response | null> {
  const { auth, data } = context;
  switch (action) {
    case "sync-user-learning": {
        // Un membre ne synchronise QUE son compte ; un admin peut cibler un id.
        const userId = resolveTargetUserId(auth, data.userId);

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
        }

        // ⚠️ SÉCURITÉ : les inscriptions ne sont JAMAIS acceptées depuis le
        // navigateur (elles proviennent du paiement vérifié ou d'un admin).
        const legacyEnrolled = Array.isArray(user.enrolledCourseIds) ? [...user.enrolledCourseIds] : [];
        const entitled = await prisma.entitlement.findMany({
          where: { userId, resourceType: "course", status: "active" },
          select: { resourceId: true },
        });
        const enrolled = Array.from(
          new Set([...legacyEnrolled, ...entitled.map((row) => row.resourceId)])
        ).filter(Boolean);

        // Phase 3 : la progression est CALCULÉE À PARTIR DES LEÇONS TERMINÉES
        // côté serveur. `data.courseProgress` n'est plus accepté.
        let progress: Record<string, number> = {};
        try {
          const parsed = JSON.parse(String(user.courseProgress || "{}"));
          if (parsed && typeof parsed === "object") progress = { ...parsed };
        } catch {
          progress = {};
        }
        for (const courseId of enrolled) {
          const computed = await computeCourseProgress(userId, courseId).catch(() => null);
          if (computed) progress[courseId] = computed.progressPercent;
        }

        let certificates: any[] = [];
        try {
          const parsed = JSON.parse(String(user.earnedCertificates || "[]"));
          if (Array.isArray(parsed)) certificates = [...parsed];
        } catch {}
        if (Array.isArray(data.earnedCertificates)) {
          for (const cert of data.earnedCertificates) {
            const certId = String(cert?.id || "").trim();
            if (!certId || certificates.some((c: any) => c.id === certId)) continue;
            // Attestation acceptée uniquement si le SERVEUR l'a réellement délivrée.
            const official = await prisma.certificate.findFirst({
              where: { certificateNumber: certId, userId },
              select: { certificateNumber: true },
            });
            if (!official) continue;
            certificates.push(cert);
          }
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            enrolledCourseIds: enrolled,
            courseProgress: progress as any,
            earnedCertificates: certificates as any,
          } as any,
        });

        return NextResponse.json({ success: true, enrolledCount: enrolled.length, certificateCount: certificates.length });
      }

    case "issue-certificate": {
        // Phase 3 : délivrance vérifiée côté serveur (progression + quiz réels).
        const userId = resolveTargetUserId(auth, data.userId);
        const courseId = uuidOrNull(String(data.courseId || ""));
        if (!courseId) {
          return NextResponse.json(
            { success: false, error: "courseId requis pour délivrer une attestation." },
            { status: 400 }
          );
        }

        const certificate = await issueCourseCertificate({
          userId,
          courseId,
          actorId: auth.actorId,
          isAdmin: auth.isAdmin,
          force: auth.isAdmin && data.force === true,
        });

        const account = await prisma.user.findUnique({
          where: { id: userId },
          select: { earnedCertificates: true },
        });
        const existing = Array.isArray(account?.earnedCertificates)
          ? (account?.earnedCertificates as Array<{ id?: string }>)
          : [];
        if (!existing.some((entry) => entry?.id === certificate.id)) {
          await prisma.user.update({
            where: { id: userId },
            data: { earnedCertificates: [certificate, ...existing] as never },
          });
        }

        return NextResponse.json({ success: true, certificate });
      }

    case "register-course-media-storage": {
    const { centerId, deltaBytes } = data;
        if (!centerId) {
      return NextResponse.json({ error: "centerId requis" }, { status: 400 });
    }
    // Seul le propriétaire du centre (ou un admin) peut ajuster son quota.
    await assertCenterAccess(auth, centerId);
    const centerDoc = await prisma.trainingCenter.findUnique({ where: { id: centerId } });
    if (!centerDoc) {
      return NextResponse.json({ error: "Centre introuvable" }, { status: 404 });
    }
    const current =
      typeof centerDoc.storageUsedBytes === "bigint"
        ? centerDoc.storageUsedBytes
        : BigInt(Number(centerDoc.storageUsedBytes || 0));
    const rawDelta = BigInt(Math.round(Number(deltaBytes) || 0));
    // Un propriétaire ne peut pas « libérer » son quota en envoyant un delta négatif.
    const requestedDelta = auth.isAdmin ? rawDelta : rawDelta > BigInt(0) ? rawDelta : BigInt(0);
    const quotaBytes = BigInt(centerDoc.storageQuotaGb || 0) * BigInt(1024) * BigInt(1024) * BigInt(1024);
    const rawNext = current + requestedDelta;
    const next =
      rawNext < BigInt(0)
        ? BigInt(0)
        : quotaBytes > BigInt(0) && rawNext > quotaBytes
          ? quotaBytes
          : rawNext;

    const updated = await prisma.trainingCenter.update({
      where: { id: centerId },
      data: { storageUsedBytes: next } as any,
    });

    return NextResponse.json({
      success: true,
      storageUsedBytes: Number(next),
      storageQuotaGb: updated.storageQuotaGb,
    });
  }

    case "rate-product": {
        const productId = String(data.productId || "");
        if (!UUID_PATTERN.test(productId)) {
          return NextResponse.json({ error: "Produit invalide." }, { status: 400 });
        }
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
          return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
        }

        // Identité issue de la session : impossible de noter au nom d'un autre.
        const reviewer = requireActorUser(auth);
        const userId = reviewer.id;

        const clampedRating = Math.max(1, Math.min(5, Math.round(Number(data.rating))));
        if (!Number.isFinite(clampedRating)) {
          return NextResponse.json({ error: "Note invalide (1 à 5)." }, { status: 400 });
        }

        const existing = await prisma.productReview.findFirst({
          where: { productId, userId },
        });
        if (existing) {
          return NextResponse.json({
            success: true,
            alreadyRated: true,
            rating: Number(product.rating) || 0,
            reviewsCount: product.reviewsCount || 0,
            message: "Vous avez déjà noté ce produit.",
          });
        }

        await prisma.productReview.create({
          data: { productId, userId, rating: clampedRating },
        });

        const agg = await prisma.productReview.aggregate({
          _avg: { rating: true },
          _count: { id: true },
          where: { productId },
        });
        const newRating = Number((agg._avg.rating || 0).toFixed(1));
        const newCount = agg._count.id;

        await prisma.product.update({
          where: { id: productId },
          data: { rating: newRating, reviewsCount: newCount },
        });

        return NextResponse.json({
          success: true,
          alreadyRated: false,
          rating: newRating,
          reviewsCount: newCount,
          message: "Merci, votre note a été enregistrée.",
        });
      }

    case "rate-course": {
        // Identité issue de la session : impossible de noter au nom d'un autre.
        const reviewer = requireActorUser(auth);
        const userId = reviewer.id;
        const { courseId, rating } = data;
        if (!courseId || !rating) {
          return NextResponse.json(
            { success: false, error: "courseId et rating requis." },
            { status: 400 }
          );
        }

        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) {
          return NextResponse.json({ error: "Formation introuvable" }, { status: 404 });
        }

        const clampedRating = Math.max(1, Math.min(5, Math.round(Number(rating))));

        const existingReview = await prisma.courseReview.findUnique({
          where: {
            courseId_userId: { courseId, userId },
          },
        });

        if (existingReview) {
          return NextResponse.json(
            {
              success: true,
              alreadyRated: true,
              message: "Vous avez déjà noté cette formation.",
            },
            { status: 200 }
          );
        }

        await prisma.courseReview.create({
          data: {
            courseId,
            userId,
            rating: clampedRating,
          },
        });

        const agg = await prisma.courseReview.aggregate({
          _avg: { rating: true },
          _count: { id: true },
          where: { courseId },
        });

        const newRating = Number((agg._avg.rating || 0).toFixed(1));
        const newCount = agg._count.id;

        await prisma.course.update({
          where: { id: courseId },
          data: {
            rating: newRating,
            reviewsCount: newCount,
          },
        });

        return NextResponse.json({
          success: true,
          alreadyRated: false,
          rating: newRating,
          reviewsCount: newCount,
        });
      }
  }
  return null;
}
