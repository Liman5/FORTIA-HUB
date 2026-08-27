"use client";

import { useSyncExternalStore } from "react";

// ============================================================
// FORTIA HUB — Store d'installation PWA (partagé)
// ------------------------------------------------------------
// Petite couche d'état partagée qui expose l'événement
// `beforeinstallprompt` et l'état d'installation à tous les
// composants (bannière, sidebar, paramètres) afin qu'ils
// proposent « Télécharger l'app » uniquement si l'app n'est
// PAS déjà installée.
// ============================================================

interface BeforeInstallPromptEventLike extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface PwaState {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isIOS: boolean;
}

type Listener = () => void;

let deferredPrompt: BeforeInstallPromptEventLike | null = null;
let isInstalled = false;
let isStandalone = false;
let isIOS = false;

const listeners = new Set<Listener>();

/**
 * Snapshot RÉFÉRENTIELLEMENT STABLE : indispensable pour useSyncExternalStore.
 * Si aucun état n'a changé, on renvoie le même objet (sinon React re-render en
 * boucle → « Maximum update depth exceeded »).
 */
let currentState: PwaState = {
  canInstall: false,
  isInstalled: false,
  isStandalone: false,
  isIOS: false,
};

function emit() {
  const next: PwaState = {
    canInstall: !!deferredPrompt,
    isInstalled: isInstalled || isStandalone,
    isStandalone,
    isIOS,
  };
  const changed =
    next.canInstall !== currentState.canInstall ||
    next.isInstalled !== currentState.isInstalled ||
    next.isStandalone !== currentState.isStandalone ||
    next.isIOS !== currentState.isIOS;
  if (!changed) return;
  currentState = next;
  listeners.forEach((l) => {
    try {
      l();
    } catch {}
  });
}

export function getPwaState(): PwaState {
  return currentState;
}

export function subscribePwa(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Détecte et capture l'événement d'installation (idempotent). */
let initialized = false;
export function initPwaStore() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  // Mode déjà installé (standalone)
  isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://");

  // Détection iOS (installation via Safari → bouton Partager)
  const ua = window.navigator.userAgent.toLowerCase();
  isIOS = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;

  // Capture de l'invite d'installation
  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEventLike;
    emit();
  };

  const handleAppInstalled = () => {
    isInstalled = true;
    deferredPrompt = null;
    emit();
  };

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);

  // État initial déjà calculé (standalone/iOS) sans attendre un événement
  emit();
}

// ============================================================
// Initialisation IMMÉDIATE au chargement du module (côté client).
// L'événement `beforeinstallprompt` peut se déclencher très tôt,
// avant le premier useEffect de React : l'écouter dès maintenant
// garantit que `promptInstall()` fonctionne au premier clic.
// ============================================================
if (typeof window !== "undefined") {
  initPwaStore();
}

/**
 * Attend (brièvement) que l'événement `beforeinstallprompt` soit émis.
 * Utile au tout premier chargement : le service worker doit être actif pour
 * que l'événement arrive, ce qui peut prendre 1 à 2 secondes.
 */
function waitForPrompt(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (deferredPrompt) {
      resolve(true);
      return;
    }
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timer);
      resolve(ok);
    };
    const onPrompt = () => finish(true);
    const onInstalled = () => finish(false);
    const timer = setTimeout(() => finish(false), timeoutMs);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
  });
}

/** Lance l'invite d'installation native (ou renvoie false si impossible). */
export async function promptInstall(): Promise<boolean> {
  // Si l'invite n'est pas encore capturée, on attend qu'elle arrive
  // (service worker pas encore actif au tout premier chargement).
  if (!deferredPrompt) {
    const ok = await waitForPrompt(4000);
    if (!ok || !deferredPrompt) return false;
  }

  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      isInstalled = true;
    }
    deferredPrompt = null;
    emit();
    return choice.outcome === "accepted";
  } catch (err) {
    console.warn("[PWA] Erreur lors de l'installation:", err);
    return false;
  }
}

/** Hook React pour lire l'état PWA partagé. */
export function usePwaInstall(): PwaState {
  return useSyncExternalStore(subscribePwa, getPwaState, getPwaState);
}

