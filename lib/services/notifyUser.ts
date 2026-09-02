// ============================================================
// FORTIA HUB — Notifications utilisateur (en base + Web Push)
// ------------------------------------------------------------
// Helper unique : crée la notification en base puis envoie le
// Web Push à tous les appareils de l'utilisateur (best-effort).
// ============================================================
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "./webPush";

/** Mappe un onglet interne (linkTab) vers une URL de l'application. */
export function notifTargetUrl(linkTab?: string): string {
  switch (linkTab) {
    case "academy":
      return "/academy";
    case "marketplace":
    case "vendor":
      return "/marketplace";
    case "services":
      return "/services";
    case "instructor":
      return "/instructor";
    case "member":
    case "notifications":
      return "/member";
    default:
      return "/";
  }
}

export interface NotifyUserData {
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  linkTab?: string;
}

/**
 * Crée la notification pour l'utilisateur ET envoie le Web Push.
 * Ne lève jamais : toute erreur est loggée et le flux continue.
 */
export async function notifyUser(userId: string, data: NotifyUserData): Promise<string | null> {
  let notifId: string | null = null;

  // 1. Notification en base
  try {
    const n = await prisma.notification.create({
      data: {
        userId,
        title: data.title,
        message: data.message,
        type: (data.type || "info") as any,
        linkTab: data.linkTab || "",
        isGlobal: false,
        isRead: false,
      } as any,
    });
    notifId = n.id;
  } catch (e: any) {
    console.warn("[NOTIFY] Création de la notification en base impossible:", e?.message);
  }

  // 2. Web Push vers tous les appareils de l'utilisateur (best-effort)
  try {
    await sendPushToUser(userId, {
      title: data.title,
      body: data.message,
      url: notifTargetUrl(data.linkTab),
      tag: notifId || undefined,
    });
  } catch (e: any) {
    console.warn("[NOTIFY] Envoi Web Push impossible:", e?.message);
  }

  return notifId;
}

/**
 * Notification GLOBALE (diffusée à tous) : annonces, blogs, publicités…
 * Crée une ligne `isGlobal: true` vue par tous les utilisateurs.
 * Ne lève jamais : toute erreur est loggée et le flux continue.
 */
export async function broadcastNotification(data: NotifyUserData): Promise<string | null> {
  try {
    const n = await prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: (data.type || "info") as any,
        linkTab: data.linkTab || "",
        isGlobal: true,
        isRead: false,
      } as any,
    });
    return n.id;
  } catch (e: any) {
    console.warn("[NOTIFY] Création de la notification globale impossible:", e?.message);
    return null;
  }
}
