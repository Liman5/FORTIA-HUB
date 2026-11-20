// ============================================================
// FORTIA HUB — CATÉGORIES DE FORMATION (service métier)
// ============================================================

import { prisma } from "@/lib/prisma";
import { normalizeCategoryCode } from "./courseIdentity";

export type CategoryWriteData = Record<string, any>;

export interface CategoryMutationResult {
  ok: boolean;
  id?: string;
  code?: string;
  status?: number;
  error?: string;
}

export async function createCourseCategory(
  data: CategoryWriteData
): Promise<CategoryMutationResult> {
  const rawLabel = String(data.code || data.label || "categorie");
  const code = normalizeCategoryCode(rawLabel);

  const existing = await prisma.courseCategory.findUnique({ where: { code } });
  if (existing) {
    return {
      ok: false,
      status: 409,
      error: "Une catégorie avec ce code existe déjà.",
    };
  }

  const lastCategory = await prisma.courseCategory.findFirst({
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });

  const created = await prisma.courseCategory.create({
    data: {
      code,
      label: String(data.label || rawLabel),
      description: String(data.description || ""),
      iconName: String(data.iconName || ""),
      displayOrder: Number(data.displayOrder ?? (lastCategory?.displayOrder || 0) + 1),
      isActive: data.isActive ?? true,
    } as never,
  });

  return { ok: true, id: created.id, code };
}

export async function updateCourseCategory(
  data: CategoryWriteData
): Promise<CategoryMutationResult> {
  if (!data.id) return { ok: false, status: 400, error: "id requis" };

  const updated = await prisma.courseCategory.update({
    where: { id: data.id },
    data: {
      label: data.label ?? undefined,
      description: data.description ?? undefined,
      iconName: data.iconName ?? undefined,
      displayOrder: data.displayOrder ?? undefined,
      isActive: data.isActive ?? undefined,
    } as never,
  });

  // Cohérence d'affichage : les formations rattachées suivent le libellé.
  if (data.label) {
    await prisma.course.updateMany({
      where: { categoryId: updated.id },
      data: { categoryLabel: updated.label } as never,
    });
  }

  return { ok: true, id: updated.id };
}

export async function deleteCourseCategory(id: unknown): Promise<CategoryMutationResult> {
  if (!id) return { ok: false, status: 400, error: "id requis" };

  const attachedCourses = await prisma.course.count({
    where: { categoryId: String(id) },
  });
  if (attachedCourses > 0) {
    return {
      ok: false,
      status: 409,
      error: `Suppression refusée : ${attachedCourses} formation(s) utilisent encore cette catégorie.`,
    };
  }

  await prisma.courseCategory.delete({ where: { id: String(id) } });
  return { ok: true };
}
