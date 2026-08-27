// ============================================================
// FORTIA HUB — Service Web Push (VAPID)
// ------------------------------------------------------------
// - Configure web-push avec les clés VAPID (lecture des variables
//   d'environnement UNE SEULE FOIS, jamais de nouvelles clés).
// - La clé PRIVÉE reste exclusivement côté serveur.
// - `sendPushToUser` envoie une notification à tous les appareils
//   d'un utilisateur à partir de ses abonnements en base.
//   Les abonnements devenus invalides (404/410) sont supprimés
//   proprement de la base.
// ============================================================
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function configure() {
  if (configured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contact@fortiahub.com";

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquants dans l'environnement. " +
        "Générez-les une fois avec : node -e \"console.log(JSON.stringify(require('web-push').generateVAPIDKeys()))\""
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

/** Clé publique VAPID — seule valeur exposée au navigateur (abonnement push). */
export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || "";
}

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  icon?: string;
  tag?: string;
}

function buildPushSubscription(row: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): webpush.PushSubscription {
  return {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  };
}

/**
 * Envoie une notification push à tous les appareils d'un utilisateur.
 * Retourne le nombre d'envois réussis / échoués.
 * Les abonnements invalides (404 Gone / 410 Not Found) sont supprimés de la base.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  try {
    configure();
  } catch (e) {
    console.warn("[WEBPUSH] Configuration VAPID impossible:", (e as any)?.message);
    return { sent: 0, failed: 0 };
  }

  let subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[] = [];
  try {
    subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  } catch (e) {
    console.warn("[WEBPUSH] Lecture des abonnements impossible:", (e as any)?.message);
    return { sent: 0, failed: 0 };
  }

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body || "",
    url: payload.url || "",
    icon: payload.icon || "/pwa-192x192.png",
    tag: payload.tag || undefined,
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(buildPushSubscription(sub), body, {
          TTL: 60 * 60 * 24, // 24h
          urgency: "high",
        });
        sent++;
      } catch (err: any) {
        failed++;
        // Abonnement obsolète ou révoqué par le navigateur → nettoyage
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          try {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
            console.warn("[WEBPUSH] Abonnement invalide supprimé:", sub.endpoint.slice(0, 60));
          } catch (e) {}
        } else {
          console.warn("[WEBPUSH] Envoi échoué (status", err?.statusCode + "):", (err as any)?.message);
        }
      }
    })
  );

  return { sent, failed };
}
