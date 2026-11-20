// ============================================================
// FORTIA HUB — MODÉRATION DE CONTENU (marketplace / académie)
// ------------------------------------------------------------
// Les règles de statut sont identiques pour un produit et une
// formation : un seul service évite deux implémentations divergentes.
// ============================================================

import { prisma } from "@/lib/prisma";

export type ModerationTarget = "product" | "course";

const DEFAULT_REASON = "Contenu non conforme aux règles de la plateforme.";

function updateTarget(
  target: ModerationTarget,
  targetId: string,
  data: Record<string, unknown>
) {
  return target === "product"
    ? prisma.product.update({ where: { id: targetId }, data: data as never })
    : prisma.course.update({ where: { id: targetId }, data: data as never });
}

export async function moderateContent(
  target: ModerationTarget,
  targetId: string,
  reason?: unknown
): Promise<void> {
  await updateTarget(target, targetId, {
    moderationStatus: "suspended",
    moderationReason: String(reason || DEFAULT_REASON).slice(0, 600),
    moderationAt: new Date(),
    fundsFrozen: true,
    appealStatus: "",
    appealMessage: "",
    isPublished: false,
  });
}

export async function restoreContent(
  target: ModerationTarget,
  targetId: string
): Promise<void> {
  await updateTarget(target, targetId, {
    moderationStatus: "ok",
    moderationReason: "",
    moderationAt: null,
    fundsFrozen: false,
    appealStatus: "reviewed",
    isPublished: true,
  });
}

export async function submitModerationAppeal(
  target: ModerationTarget,
  targetId: string,
  message: string
): Promise<void> {
  await updateTarget(target, targetId, {
    appealStatus: "pending",
    appealMessage: message.slice(0, 800),
  });
}
