// ============================================================
// FORTIA HUB — Informations de version & journal des correctifs
// À incrémenter à chaque déploiement important.
// ============================================================

export const APP_VERSION = "2.1.0";

export interface ReleaseNote {
  version: string;
  date: string;
  items: string[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "2.1.0",
    date: "Aujourd'hui",
    items: [
      "Mise à jour PWA forcée et automatique (plus de version périmée après déploiement)",
      "Reconnexion résiliente (réessais automatiques)",
      "Notifications ciblées (vente → vendeur + admin uniquement)",
      "2FA Google Authenticator + secret chiffré",
      "Données personnelles isolées par utilisateur (/api/me)",
      "Upload vidéo fiabilisé + enregistrement des formations",
    ],
  },
];
