// ============================================================
// FORTIA HUB — MISE À JOUR AUTOMATIQUE DE L'APPLICATION
// ------------------------------------------------------------
// Problème résolu : une application installée (PWA) continuait à servir
// l'ancien HTML / les anciens chunks après un déploiement — l'utilisateur
// devait désinstaller puis réinstaller pour voir les corrections.
//
// Principe (fiable, indépendant du service worker) :
//   1. chaque build possède un identifiant (`NEXT_PUBLIC_BUILD_ID`) ;
//   2. le client interroge `/api/version` (jamais caché) au démarrage,
//      au retour dans l'app et toutes les 60 s ;
//   3. si l'identifiant diffère → purge des caches, désinscription des
//      service workers, puis rechargement forcé (URL unique).
// ============================================================

/** Identifiant du build chargé dans ce navigateur. */
export const CLIENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

let applying = false;

/** Le serveur sert-il une version différente de celle affichée ? */
export async function checkForUpdate(): Promise<boolean> {
  try {
    const res = await fetch(`/api/version?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return false;
    const json = await res.json().catch(() => null);
    const serverBuild = String(json?.buildId || "");
    if (!serverBuild) return false;
    return serverBuild !== CLIENT_BUILD_ID;
  } catch {
    return false;
  }
}

/**
 * Applique la mise à jour : purge complète des caches de l'application,
 * désinscription des service workers (ils servaient l'ancienne version),
 * puis rechargement réseau forcé.
 */
export async function applyUpdate(): Promise<void> {
  if (applying || typeof window === "undefined") return;
  applying = true;

  try {
    // 1) Purge de tous les caches de l'application
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    // 2) Désinscription des service workers (l'ancien servait d'anciens chunks)
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    // 3) Stockage local des données de domaine : on garde le panier et la
    //    session, mais on jette les caches de données (ils changent de forme
    //    d'une version à l'autre).
    try {
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith("fortia_cache_")) localStorage.removeItem(key);
      }
    } catch {
      /* stockage indisponible : sans conséquence */
    }
  } catch {
    /* on recharge quand même */
  }

  // 4) Rechargement forcé : URL unique + navigation « dure » (pas le routeur Next)
  const url = new URL(window.location.href);
  url.searchParams.set("v", String(Date.now()));
  window.location.replace(url.toString());
}
