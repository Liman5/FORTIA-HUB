// ============================================================
// FORTIA HUB — Enregistrement du Service Worker + PWA
// ------------------------------------------------------------
// - Enregistre /sw.js
// - Mise à jour automatique : détecte une nouvelle version,
//   active le nouveau worker et recharge l'application.
// - Après installation de l'app : demande la permission des
//   notifications système et notifie le reste de l'app.
// ============================================================

let swRegistrationStarted = false;

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  if (swRegistrationStarted) return;
  swRegistrationStarted = true;

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
              // Nouvelle version disponible → bascule immédiate + rechargement.
              console.log("[PWA] Nouvelle version de FORTIA HUB disponible → mise à jour...");
              installingWorker.postMessage({ type: "SKIP_WAITING" });
              setTimeout(() => window.location.reload(), 300);
            } else {
              console.log("[PWA] Contenu mis en cache pour un usage hors-ligne.");
            }
          }
        };
      };

      // Événement de mise à jour activée (après skipWaiting + reload)
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        // On évite une boucle de rechargements : le reload est déjà déclenché
        // dans onstatechange, on loggue simplement l'activation.
        console.log("[PWA] Nouveau Service Worker actif.");
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

