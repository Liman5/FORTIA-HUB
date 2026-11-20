// ============================================================
// FORTIA HUB — HANDLERS D'ÉCRITURE (Phase 5)
// Généré depuis l'ancien switch ; l'autorisation et la validation
// restent centralisées dans /api/platform/write.
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { WriteError, assertCenterAccess, assertCourseAccess, requireActorUser } from "@/lib/server/writeAuthorization";

import { normalizeCourseLevel, uniqueCourseSlug, UUID_PATTERN, uuidOrNull } from "../helpers";
import type { WriteHandlerContext } from "../types";

export async function handleAcademyAction(
  action: string,
  context: WriteHandlerContext
): Promise<Response | null> {
  const { auth, data } = context;
  switch (action) {
    case "create-course": {
        const category = data.category
          ? await prisma.courseCategory.findUnique({ where: { code: data.category } })
          : null;

        const createdCourse = await prisma.course.create({
          data: {
            title: data.title || "Cours sans titre",
            slug: data.slug || "cours-" + Date.now(),
            categoryId: category?.id,
            categoryLabel: data.categoryLabel || data.category || "",
            description: data.description || "",
            fullDescription: data.fullDescription || "",
            level: data.level || "Tous_niveaux",
            durationHours: data.durationHours || 0,
            lessonsCount: data.lessonsCount || 0,
            price: data.price || 0,
            rating: 5.0,
            reviewsCount: 0,
            studentsCount: 0,
            image: data.image || "",
            badge: data.badge || "",
            instructorName: data.instructorName || "",
            instructorRole: data.instructorRole || "",
            instructorAvatar: data.instructorAvatar || "",
            learningOutcomes: data.learningOutcomes || [],
            isPublished: data.isPublished ?? true,
            isFeatured: data.isFeatured ?? false,
          } as any,
        });

        if (Array.isArray(data.chapters)) {
          for (const [ci, chapter] of data.chapters.entries()) {
            const createdChapter = await prisma.courseChapter.create({
              data: {
                courseId: createdCourse.id,
                title: chapter.title || "Chapitre " + (ci + 1),
                displayOrder: ci,
              },
            });
            if (Array.isArray(chapter.lessons)) {
              for (const [li, lesson] of chapter.lessons.entries()) {
                await prisma.courseLesson.create({
                  data: {
                    chapterId: createdChapter.id,
                    title: lesson.title || "Lecon " + (li + 1),
                    duration: lesson.duration || "15 min",
                    type: lesson.type || "video",
                    displayOrder: li,
                  } as any,
                });
              }
            }
          }
        }

        return NextResponse.json({ success: true, id: createdCourse.id });
      }

    case "update-course": {
        // Propriétaire de la formation ou administrateur uniquement.
        await assertCourseAccess(auth, data.id);
        let resolvedCategoryId = data.categoryId ?? undefined;
        if (!resolvedCategoryId && data.category) {
          const category = await prisma.courseCategory.findUnique({
            where: { code: String(data.category) },
          });
          resolvedCategoryId = category?.id ?? undefined;
        }

        const updated = await prisma.course.update({
          where: { id: data.id },
          data: {
            title: data.title ?? undefined,
            slug: data.slug ?? undefined,
            categoryId: resolvedCategoryId,
            categoryLabel: data.categoryLabel ?? undefined,
            description: data.description ?? undefined,
            fullDescription: data.fullDescription ?? undefined,
            level: data.level ?? undefined,
            durationHours: data.durationHours ?? undefined,
            lessonsCount: data.lessonsCount ?? undefined,
            price: data.price ?? undefined,
            image: data.image ?? undefined,
            badge: data.badge ?? undefined,
            instructorName: data.instructorName ?? undefined,
            instructorRole: data.instructorRole ?? undefined,
            instructorAvatar: data.instructorAvatar ?? undefined,
            learningOutcomes: data.learningOutcomes ?? undefined,
            rating: data.rating ?? undefined,
            reviewsCount: data.reviewsCount ?? undefined,
            isPublished: data.isPublished ?? undefined,
            isFeatured: data.isFeatured ?? undefined,
          } as any,
        });

        if (Array.isArray(data.chapters)) {
          await prisma.courseChapter.deleteMany({ where: { courseId: data.id } });
          for (const [ci, chapter] of data.chapters.entries()) {
            const createdChapter = await prisma.courseChapter.create({
              data: {
                courseId: data.id,
                title: chapter.title || "Chapitre " + (ci + 1),
                displayOrder: ci,
              },
            });
            if (Array.isArray(chapter.lessons)) {
              for (const [li, lesson] of chapter.lessons.entries()) {
                await prisma.courseLesson.create({
                  data: {
                    chapterId: createdChapter.id,
                    title: lesson.title || "Lecon " + (li + 1),
                    duration: lesson.duration || "15 min",
                    type: lesson.type || "video",
                    videoUrl: lesson.videoUrl || "",
                    content: lesson.content || "",
                    videoProtected: !!(lesson as any).videoProtected,
                    videoCodeHash: String((lesson as any).videoCodeHash || ""),
                    displayOrder: li,
                  } as any,
                });
              }
            }
          }
        }

        if (Array.isArray(data.quiz)) {
          await prisma.courseQuiz.deleteMany({ where: { courseId: data.id } });
          for (const [qi, quiz] of data.quiz.entries()) {
            const createdQuiz = await prisma.courseQuiz.create({
              data: {
                courseId: data.id,
                question: quiz.question || "",
                explanation: quiz.explanation || "",
                displayOrder: qi,
              },
            });
            if (Array.isArray(quiz.options)) {
              for (const [oi, option] of quiz.options.entries()) {
                await prisma.quizOption.create({
                  data: {
                    quizId: createdQuiz.id,
                    optionText: option,
                    isCorrect: oi === (quiz.correctAnswer ?? 0),
                    displayOrder: oi,
                  },
                });
              }
            }
          }
        }

        return NextResponse.json({ success: true, id: updated.id });
      }

    case "create-course-category": {
        const rawCode = String(data.code || data.label || "categorie");
        const code =
          rawCode
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "categorie-" + Date.now().toString(36);

        const existingCategory = await prisma.courseCategory.findUnique({ where: { code } });
        if (existingCategory) {
          return NextResponse.json(
            { error: "Une catégorie avec ce code existe déjà." },
            { status: 409 }
          );
        }

        const lastCategory = await prisma.courseCategory.findFirst({
          orderBy: { displayOrder: "desc" },
        });

        const createdCategory = await prisma.courseCategory.create({
          data: {
            code,
            label: String(data.label || rawCode),
            description: String(data.description || ""),
            iconName: String(data.iconName || ""),
            displayOrder: Number(data.displayOrder ?? (lastCategory?.displayOrder || 0) + 1),
            isActive: data.isActive ?? true,
          } as any,
        });

        return NextResponse.json({ success: true, id: createdCategory.id, code });
      }

    case "update-course-category": {
        if (!data.id) {
          return NextResponse.json({ error: "id requis" }, { status: 400 });
        }

        const updatedCategory = await prisma.courseCategory.update({
          where: { id: data.id },
          data: {
            label: data.label ?? undefined,
            description: data.description ?? undefined,
            iconName: data.iconName ?? undefined,
            displayOrder: data.displayOrder ?? undefined,
            isActive: data.isActive ?? undefined,
          } as any,
        });

        // Cohérence d'affichage : les formations rattachées suivent le libellé
        if (data.label) {
          await prisma.course.updateMany({
            where: { categoryId: updatedCategory.id },
            data: { categoryLabel: updatedCategory.label } as any,
          });
        }

        return NextResponse.json({ success: true, id: updatedCategory.id });
      }

    case "delete-course-category": {
        if (!data.id) {
          return NextResponse.json({ error: "id requis" }, { status: 400 });
        }

        const attachedCourses = await prisma.course.count({ where: { categoryId: data.id } });
        if (attachedCourses > 0) {
          return NextResponse.json(
            {
              error: `Suppression refusée : ${attachedCourses} formation(s) utilisent encore cette catégorie.`,
            },
            { status: 409 }
          );
        }

        await prisma.courseCategory.delete({ where: { id: data.id } });
        return NextResponse.json({ success: true });
      }

    case "set-course-featured": {
        if (!data.courseId) {
          return NextResponse.json({ error: "courseId requis" }, { status: 400 });
        }

        const updatedFeatured = await prisma.course.update({
          where: { id: data.courseId },
          data: { isFeatured: !!data.isFeatured } as any,
        });

        return NextResponse.json({
          success: true,
          id: updatedFeatured.id,
          isFeatured: updatedFeatured.isFeatured,
        });
      }

    case "submit-course-by-instructor": {
        // Catégorie : le client envoie un CODE (« crypto », « ai »…) ou un ID.
        const categoryRef = String(data.category || data.categoryId || "").trim();
        const category = categoryRef
          ? await prisma.courseCategory
              .findUnique({
                where: UUID_PATTERN.test(categoryRef)
                  ? { id: categoryRef }
                  : { code: categoryRef },
              })
              .catch(() => null)
          : null;

        // Identité du formateur issue de la SESSION (un admin peut cibler).
        // Le centerId est validé ET vérifié (propriétaire) avant écriture.
        const instructorId = auth.isAdmin
          ? uuidOrNull(data.instructorId)
          : requireActorUser(auth).id;
        const centerId = uuidOrNull(data.centerId);
        if (!instructorId) {
          throw new WriteError(
            401,
            "Session formateur introuvable ou expirée : reconnectez-vous puis republiez la formation."
          );
        }
        if (centerId) {
          await assertCenterAccess(auth, centerId);
        }

        const title = String(data.title || "").trim() || "Cours sans titre";
        const slug = await uniqueCourseSlug(String(data.slug || title));

        let course: { id: string } | null = null;
        try {
          course = await prisma.course.create({
            data: {
              title,
              slug,
              instructorId,
              centerId: centerId || undefined,
              categoryId: category?.id || undefined,
              categoryLabel: data.categoryLabel || data.category || "",
              description: data.description || "",
              fullDescription: data.fullDescription || "",
              level: normalizeCourseLevel(data.level),
              durationHours: data.durationHours || 0,
              lessonsCount: data.lessonsCount || 0,
              price: data.price || 0,
              image: data.image || "",
              badge: data.badge || "",
              instructorName: data.instructorName || "",
              instructorRole: data.instructorRole || "",
              instructorAvatar: data.instructorAvatar || "",
              learningOutcomes: data.learningOutcomes || [],
              isPublished: data.isPublished ?? false,
            } as any,
          });

        if (Array.isArray(data.chapters)) {
          for (const [ci, chapter] of data.chapters.entries()) {
            const createdChapter = await prisma.courseChapter.create({
              data: {
                courseId: course.id,
                title: chapter.title || "Chapitre " + (ci + 1),
                displayOrder: ci,
              },
            });
            if (Array.isArray(chapter.lessons)) {
              for (const [li, lesson] of chapter.lessons.entries()) {
                await prisma.courseLesson.create({
                  data: {
                    chapterId: createdChapter.id,
                    title: lesson.title || "Lecon " + (li + 1),
                    duration: lesson.duration || "15 min",
                    type: lesson.type || "video",
                    videoUrl: lesson.videoUrl || "",
                    content: lesson.content || "",
                    videoProtected: !!(lesson as any).videoProtected,
                    videoCodeHash: String((lesson as any).videoCodeHash || ""),
                    displayOrder: li,
                  } as any,
                });
              }
            }
          }
        }

        if (Array.isArray(data.quiz)) {
          for (const [qi, quiz] of data.quiz.entries()) {
            const createdQuiz = await prisma.courseQuiz.create({
              data: {
                courseId: course.id,
                question: quiz.question || "",
                explanation: quiz.explanation || "",
                displayOrder: qi,
              },
            });
            if (Array.isArray(quiz.options)) {
              for (const [oi, option] of quiz.options.entries()) {
                await prisma.quizOption.create({
                  data: {
                    quizId: createdQuiz.id,
                    optionText: option,
                    isCorrect: oi === (quiz.correctAnswer ?? 0),
                    displayOrder: oi,
                  },
                });
              }
            }
          }
        }

        } catch (error) {
          // Aucune formation « fantôme » : si un chapitre, une leçon ou le quiz
          // échoue, la formation déjà créée est annulée et l'erreur réelle est
          // remontée au client (qui l'affiche désormais).
          if (course?.id) {
            await prisma.course.delete({ where: { id: course.id } }).catch(() => {});
          }
          throw error;
        }

        return NextResponse.json({ success: true, id: course.id });
      }

    case "suspend-course": {
        // Propriétaire de la formation ou administrateur uniquement.
        await assertCourseAccess(auth, data.id);
        const updated = await prisma.course.update({
          where: { id: data.id },
          data: { isPublished: false } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

    case "delete-course": {
        // Propriétaire (formateur / centre) ou administrateur uniquement.
        await assertCourseAccess(auth, data.id);
        const course = await prisma.course.findUnique({
          where: { id: data.id },
          include: {
            chapters: { include: { lessons: true } },
            quizzes: { include: { options: true } },
            reviews: true,
            certificates: true,
          },
        });
        if (!course) {
          return NextResponse.json({ error: "Formation introuvable." }, { status: 404 });
        }

        await prisma.$transaction(async (tx) => {
          // Snapshot complet avant suppression (contenu, avis, attestations).
          const payload = JSON.parse(JSON.stringify(course)) as never;
          await tx.dataArchive.upsert({
            where: {
              tableName_recordId_reason: {
                tableName: "courses",
                recordId: course.id,
                reason: "course_deleted",
              },
            },
            create: {
              tableName: "courses",
              recordId: course.id,
              reason: "course_deleted",
              payload,
            },
            update: { payload, archivedAt: new Date() },
          });

          // Les droits d'accès au contenu supprimé sont révoqués.
          await tx.entitlement.updateMany({
            where: {
              resourceType: "course",
              resourceId: course.id,
              status: { in: ["active", "suspended"] },
            },
            data: { status: "revoked", revokedAt: new Date() },
          });

          // Les attestations sont conservées (certificates.course_id → NULL),
          // les commandes/lignes financières ne sont jamais supprimées.
          await tx.course.delete({ where: { id: course.id } });
        });

        return NextResponse.json({ success: true, archived: true });
      }
  }
  return null;
}
