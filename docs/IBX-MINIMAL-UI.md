# IBX MINIMAL — DESIGN SYSTEM + PROFIL MEMBRE

## Design system

- `app/ibx-design-system.css`, importé par `app/globals.css`.
- Tokens sémantiques CSS compatibles `html.light` / `html.dark` :
  `--ibx-bg`, `--ibx-surface`, `--ibx-surface-muted`, `--ibx-fg`,
  `--ibx-fg-muted`, `--ibx-border`, `--ibx-accent`, `--ibx-success`,
  `--ibx-warning`, `--ibx-danger`, `--ibx-info`, `--ibx-focus`,
  rayons et ombres.
- Classes utilitaires : `ibx-surface`, `ibx-surface-muted`, `ibx-divider`,
  `ibx-label`, `ibx-input`, `ibx-btn-*`, `ibx-badge-*`, `ibx-switch`,
  `ibx-tab`, `ibx-error`, `ibx-success-text`.
- Primitives React réutilisables : `components/ui/Ibx.tsx`
  (`IbxButton`, `IbxInput`, `IbxTextarea`, `IbxBadge`, `IbxSurface`,
  `IbxDivider`, `IbxSwitch`).

Palette claire : fond `#F5F6F8`, surfaces blanches, texte `#222B38`,
accent doré `#D5A02B`, vert `#218653`.
Palette sombre : fond `#171B22`, surface `#222832`, surface secondaire
`#2A313C`, texte `#F1F3F6`, accent doré ajusté.

Le design system est prêt à être utilisé progressivement par les autres
espaces ; cette étape ne refait pas les autres dashboards.

## Profil membre

`components/member/ProfileHeader.tsx` et
`components/member/ProfilePersonalCard.tsx` ont été reconstruits :

- en-tête compact sans grand bandeau coloré ;
- avatar, nom, e-mail, téléphone ;
- badge vert uniquement pour une qualification réelle (`badgeType`) ;
- badge KYC séparé et sémantiquement distinct ;
- bouton principal « Modifier mon profil » ;
- informations personnelles en lignes séparées, pas en petites cartes ;
- édition nom/téléphone via `update-profile` ;
- upload photo conservé ;
- complétion calculée depuis les champs réels et informations manquantes ;
- surfaces et contrôles basés sur les tokens IBX en clair et sombre.

La page Profil utilise `ibx-profile-page` pour basculer sur une surface
claire en mode clair et sombre en mode nuit. Les anciennes cartes
Notifications / 2FA / Suppression sont harmonisées par les tokens sans
modification de leur logique.

## Vérification

Aucun outil de navigateur (Playwright/Puppeteer) n'est installé dans le
projet. La vérification visuelle automatisée n'a donc pas été exécutée ;
la validation repose sur TypeScript, ESLint, le build et les tests HTTP.
