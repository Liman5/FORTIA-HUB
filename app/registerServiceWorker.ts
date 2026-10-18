// ============================================================
// FORTIA HUB — Enregistrement du Service Worker + PWA
// ------------------------------------------------------------
// - Enregistre /sw.js
// - Mise à jour automatique : détecte une nouvelle version,
//   active le nouveau worker et recharge l'application.
// - Après installation de l'app : demande la permission des
//   notifications système et notifie le reste de l'app.
// - ⚠️ EN DÉVELOPPEMENT : le service worker est DÉSACTIVÉ et les
//   caches existants sont purgés (voir §1 ci-dessous).
// ============================================================

let swRegistrationStarted = false;

/**
 * §1. DÉVELOPPEMENT UNIQUEMENT — « kill switch » anti-cache.
 *
 * Pourquoi : le service worker sert les fichiers statiques en
 * « stale-while-revalidate ». En développement, il continuait donc de servir
 * d'ANCIENS chunks JavaScript : les modifications du code ne s'affichaient plus
 * dans le navigateur, même après un rechargement de la page.
 *
 * On désinscrit donc tout worker et on purge les caches de l'application, puis
 * on recharge la page UNE seule fois (garde `sessionStorage` : aucune boucle
 * de rechargement possible).
 */
async function purgeServiceWorkersAndCaches(): Promise<void> {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.includes("fortia")).map((key) => caches.delete(key))
      );
    }

    // Au moins un worker était enregistré : on repart d'un état propre.
    const alreadyPurged = sessionStorage.getItem("fortia_sw_purged") === "1";
    if (registrations.length > 0 && !alreadyPurged) {
      sessionStorage.setItem("fortia_sw_purged", "1");
      window.location.reload();
    }
  } catch (error) {
    console.warn("[PWA] Purge des caches impossible :", error);
  }
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  if (swRegistrationStarted) return;
  swRegistrationStarted = true;

  // §1. Développement : aucun cache, jamais de version périmée.
  if (process.env.NODE_ENV !== "production") {
    void purgeServiceWorkersAndCaches();
    return;
  }

  // Enregistrement immédiat (ne pas attendre "load" : l'événement peut être
  // déjà passé lors de certaines navigations, ce qui bloquerait l'installation PWA).
  navigator.serviceWorker
    .register("/sw.js")
    .then((registration) => {
      console.log(
        "[PWA] Service Worker enregistré avec succès (scope: " + registration.scope + ")"
      );

      // Mise à jour automatique : quand une nouvelle version du worker
      // est détectée, on la force et on recharge l'app pour appliquer les
      // nouveaux builds sans action manuelle.
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              // Nouvelle version disponible → bascule immédiate (le rechargement
              // est déclenché par "controllerchange" ci-dessous).
              console.log("[PWA] Nouvelle version de FORTIA HUB disponible → mise à jour...");
              installingWorker.postMessage({ type: "SKIP_WAITING" });
            } else {
              console.log("[PWA] Contenu mis en cache pour un usage hors-ligne.");
            }
          }
        };
      };

      // Rechargement fiable quand le nouveau worker prend le contrôle
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        console.log("[PWA] Nouvelle version activée → rechargement de l'application.");
        window.location.reload();
      });

      // Vérification périodique des mises à jour (utile quand l'app reste ouverte)
      const checkForUpdates = () => {
        registration.update().catch(() => {});
      };
      setInterval(checkForUpdates, 15 * 60 * 1000); // toutes les 15 minutes
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdates();
      });
    })
    .catch((error) => {
      console.warn("[PWA] Échec de l'enregistrement du Service Worker:", error);
    });

  // Après installation de l'application → demander la permission des notifications
  window.addEventListener("appinstalled", () => {
    console.log("[PWA] FORTIA HUB installé !");
    setTimeout(() => {
      if ("Notification" in window) {
        Notification.requestPermission()
          .then((permission) => {
            console.log("[PWA] Permission notifications système:", permission);
          })
          .catch(() => {});
      }
    }, 1500);
  });
}

