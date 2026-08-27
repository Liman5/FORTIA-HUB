"use client";

// ============================================================
// FORTIA HUB — Notifications système de l'application
// ------------------------------------------------------------
// - Gère la permission des notifications du système (API Web
//   Notification), utilisable une fois l'app installée.
// - Affiche les notifications comme une vraie app avec une
//   sonnerie personnalisée (notification-sound.wav).
// - Préférences persistées localement : notifications ON/OFF
//   et son ON/OFF (paramètres membre).
// ============================================================

export interface NotifSettings {
  enabled: boolean;
  sound: boolean;
}

const SETTINGS_KEY = "fortia_notif_settings";

export function getNotifSettings(): NotifSettings {
  if (typeof window === "undefined") {
    return { enabled: true, sound: true };
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: parsed.enabled !== false,
        sound: parsed.sound !== false,
      };
    }
  } catch (e) {}
  return { enabled: true, sound: true };
}

export function saveNotifSettings(settings: NotifSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {}
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/** Demande la permission de recevoir des notifications système. */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const s = getNotifSettings();
      saveNotifSettings({ ...s, enabled: true });
    }
    return permission;
  } catch (e) {
    return "denied";
  }
}

/** Joue la sonnerie personnalisée (si activée dans les paramètres). */
export function playNotificationSound() {
  if (typeof window === "undefined") return;
  const settings = getNotifSettings();
  if (!settings.sound) return;

  try {
    const audio = new Audio("/notification-sound.wav");
    audio.volume = 0.7;
    audio.play().catch(() => {});
  } catch (e) {
    // Son indisponible → silencieux
  }
}

/**
 * Affiche une notification système (comme une vraie app).
 * Utilise le Service Worker si disponible (requis pour PWA installée),
 * sinon l'API Notification classique. Joue la sonnerie personnalisée.
 */
export async function showSystemNotification(opts: {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  silent?: boolean;
  data?: Record<string, unknown>;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  const settings = getNotifSettings();
  if (!settings.enabled) return;
  if (Notification.permission !== "granted") return;

  const icon = opts.icon || "/pwa-192x192.png";
  const tag = opts.tag || `fortia-${Date.now()}`;

  const fire = (registration: ServiceWorkerRegistration | null) => {
    if (registration && "showNotification" in registration) {
      registration.showNotification(opts.title, {
        body: opts.body || "",
        icon,
        badge: "/pwa-96x96.png",
        tag,
        renotify: true,
        silent: opts.silent ?? !settings.sound,
        data: opts.data || {},
      } as NotificationOptions);
    } else {
      new Notification(opts.title, {
        body: opts.body || "",
        icon,
        tag,
        data: opts.data || {},
      });
    }
  };

  if (!opts.silent) {
    playNotificationSound();
  }

  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.getRegistration();
      fire(registration || null);
    } else {
      fire(null);
    }
  } catch (e) {
    fire(null);
  }
}

/** Ouvre l'URL cible quand l'utilisateur clique sur une notification (service worker). */
export function getNotificationTargetUrl(data: Record<string, unknown> | undefined): string {
  const link = data && typeof data.linkTab === "string" ? data.linkTab : "";
  switch (link) {
    case "academy":
      return "/academy";
    case "marketplace":
      return "/marketplace";
    case "services":
      return "/services";
    case "member":
    case "notifications":
      return "/member";
    default:
      return "/";
  }
}

// ============================================================
// Abonnement Web Push (VAPID)
// ============================================================

/** Vérifie que le navigateur supporte le Push API + un Service Worker. */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Récupère la clé publique VAPID depuis le serveur (jamais la clé privée). */
export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push", { cache: "no-store" });
    const data = await res.json();
    return data?.publicKey || null;
  } catch (e) {
    console.warn("[PUSH] Récupération de la clé publique VAPID impossible:", e);
    return null;
  }
}

function pushSubscriptionToJson(subscription: PushSubscription) {
  const json = subscription.toJSON() as any;
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: json.keys?.p256dh || "",
      auth: json.keys?.auth || "",
    },
  };
}

/**
 * Crée (ou réutilise) le PushSubscription et l'enregistre sur le serveur,
 * associé au compte connecté via le cookie JWT (identité côté serveur).
 * Retourne true si le serveur a bien enregistré l'abonnement.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    if (Notification.permission !== "granted") return false;

    const publicKey = await getVapidPublicKey();
    if (!publicKey) return false;

    const registration = await navigator.serviceWorker.ready;

    // Réutilise un abonnement existant s'il est encore valide
    let subscription: PushSubscription | null = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const json = pushSubscriptionToJson(subscription);
    const res = await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: json }),
    });

    if (res.ok) {
      const s = getNotifSettings();
      saveNotifSettings({ ...s, enabled: true });
      return true;
    }
    return false;
  } catch (e) {
    console.warn("[PUSH] Abonnement Web Push impossible:", e);
    return false;
  }
}

/**
 * Désinscrit l'appareil : résilie le PushSubscription côté navigateur
 * ET supprime l'enregistrement côté serveur (DELETE /api/push).
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      // Résiliation côté navigateur (best-effort)
      try {
        await subscription.unsubscribe();
      } catch (e) {}
      // Suppression côté serveur
      try {
        await fetch(`/api/push?endpoint=${encodeURIComponent(endpoint)}`, {
          method: "DELETE",
        });
      } catch (e) {}
    }
    return true;
  } catch (e) {
    console.warn("[PUSH] Désinscription Web Push impossible:", e);
    return false;
  }
}

/** Convertit une clé publique base64url en Uint8Array (requis par le Push API). */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

