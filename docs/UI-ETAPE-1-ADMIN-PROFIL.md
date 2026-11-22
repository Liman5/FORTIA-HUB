# UI/UX ÉTAPE 1 — ADMIN UTILISATEURS ET PROFIL MEMBRE

## A. Section Admin Utilisateurs

### Cause réelle de l'indisponibilité

L'onglet existait dans `AdminDashboard`, mais le dashboard réellement utilisé sur `/admin`
est `AdminModernPage` avec sa propre barre latérale (`AdminSidebar`). Cette navigation
ne déclarait pas le module `users` et le mapping `AdminModuleKey -> onglet AdminDashboard`
ne contenait pas `users`. Le composant et les API existaient donc sans point d'entrée
dans l'interface réelle.

### Corrections

- `AdminModuleKey` inclut `"users"`.
- `AdminSidebar` affiche « Utilisateurs » avec l'icône `Users`.
- `AdminModernPage` mappe `users -> users`, ajoute le titre du module et monte
  `AdminDashboard` avec `initialTab="users"`.
- `allowUsers` masque le module aux rôles qui ne peuvent pas gérer les comptes
  (`financier`, `kyc`, `superviseur`) ; le serveur continue de refuser toute
  tentative directe.
- Les API `/api/admin/platform-users/*` restent inchangées et protégées par
  `requirePlatformAdmin` (rôles `general` / `superadmin`).

La section centralisée reste celle déjà développée : liste paginée serveur, recherche,
filtres rôle/statut/KYC/suppression/dates, tri, fiche détaillée, suspension,
blocage, réactivation, demandes de suppression et journal d'audit.

## B. Profil Membre

### Composants créés

- `components/member/ProfileHeader.tsx`
- `components/member/ProfilePersonalCard.tsx`

### Design

Le profil utilise désormais une surface claire et sobre :

- en-tête blanc avec bandeau bleu nuit discret ;
- avatar arrondi, nom, e-mail, téléphone ;
- badge vert uniquement si la qualification réelle (`badgeType`) est `green`/`gold` ;
- badge KYC bleu distinct, jamais confondu avec la qualification ;
- bouton « Modifier mon profil » ;
- statistiques réelles (formations, certificats, achats) ;
- carte d'informations personnelles blanche, grille responsive ;
- édition du nom et du téléphone avec validation, état d'enregistrement,
  confirmation et gestion d'erreur ;
- upload d'avatar conservé ;
- complétion calculée uniquement depuis les champs réellement renseignés.

Les cartes « Notifications », « Sécurité 2FA » et « Zone de danger » ont été
éclaircies (surfaces blanches, bordures neutres) sans modification de leur logique.

### Fonctionnalités préservées

- `apiWritePlatform("update-profile")` pour la sauvegarde réelle ;
- `onUpdateProfile` pour la mise à jour immédiate du store ;
- upload d'avatar et gestion des erreurs ;
- notifications, 2FA, suppression différée de compte ;
- badges et statuts fournis par le backend.

## C. Tests

- `npm run test:admin-users` : **26 / 26** — inclut la mise à jour réelle du profil
  via `update-profile` et la restauration du statut bloqué après annulation.
- `npm run test:security` : **44 / 44**.
- TypeScript, ESLint, build et frontières de modules validés.
