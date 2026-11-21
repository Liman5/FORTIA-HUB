# FORTIA HUB — Audit de maturité architecturale (axes 1 à 5)

## Axe 1 — Isolation frontend

### Constats
- Composants encore volumineux : `AdminDashboard` (~2 750 l.), `InstructorDashboard`
  (~1 955 l.), `CoursePlayerModal` (~1 264 l.), `MemberDashboard` (~1 213 l.),
  `VendorDashboard` (~1 130 l.).
- Plusieurs composants appelaient directement `/api/payments/*` et
  `/api/storage/signed-url` (CheckoutStep, InstructorPage, ProductDetail).
- Les composants d'administration importaient `lib/server/adminRoles`.

### Corrigé
- Nouveau **client frontend typé** `lib/services/paymentsClient.ts` :
  `fetchPaymentProviders`, `pickPreferredProvider`, `createCheckout`,
  `fetchPaymentStatus`, `requestSignedDownloadUrl`.
- `CheckoutStep`, `InstructorPage` (stockage + frais de centre) et `ProductDetail`
  utilisent ce client : plus de contrats JSON dupliqués dans l'UI.
- `lib/shared/adminRoles.ts` créé : les composants admin importent les règles pures
  sans passer par la couche serveur. `lib/server/adminRoles.ts` réexporte pour
  compatibilité.
- Règle de frontière automatisée : un composant ne peut plus importer
  `@/lib/modules/*`, `@/lib/prisma` ou `@/lib/server/*`.

### Restant
- Découpage interne des dashboards monolithiques à poursuivre (extraction de
  sous-composants par onglet), sans changer le design.

## Axe 2 — Contrats entre modules

### Constats
- Certains contrats de réponse API étaient reconstruits à la main dans plusieurs
  composants.
- Les rôles admin étaient partagés via un module serveur.

### Corrigé
- Contrat de paiement explicite (`CheckoutRequest`, `CheckoutResponse`,
  `PaymentProvidersResponse`, `SignedUrlResult`).
- Règles admin pures déplacées dans `lib/shared`.
- Le client de paiement normalise les erreurs : jamais de faux succès.

### Restant
- Les réponses de `platform/write` restent partiellement typées par action
  (enveloppe Zod générique).
- Certaines routes de lecture (`catalog`, `marketplace`) ne partagent pas encore
  un DTO commun côté frontend.

## Axe 3 — Tests de régression

### Ajouté
- `tests/unit/paymentsClient.test.ts` : préférence de fournisseur, succès,
  erreur serveur, absence d’URL signée.
- `tests/unit/paymentProviders.test.ts` : fournisseurs enregistrés et inconnu refusé.
- Tests existants conservés : sécurité HTTP, paiements, Academy, modules, DB,
  migrations.

### Restant
- Pas de tests de composants React (aucune bibliothèque de rendu installée).
- Les parcours UI (checkout, dashboards) restent couverts indirectement par leurs
  contrats de service, pas par un test de rendu.

## Axe 4 — Dépendances et couplage

### Corrigé
- `check-module-boundaries.mjs` renforcé : composants → `lib/modules`, `lib/prisma`,
  `lib/server` interdits.
- `adminRoles` éclaté : plus de dépendance frontend → serveur.
- Vérification : **0 cycle, 0 violation**.

### Constats restants
- `platform/write` reste un point d’entrée central par conception (façade HTTP),
  mais ne contient plus de logique métier.
- `KYC` conserve plusieurs responsabilités dans un handler volumineux.
- Accès Prisma directs dans quelques handlers pour des requêtes isolées.

## Axe 5 — Facilité de modification

### Améliorations
- Modifier un paiement frontend se fait désormais dans
  `lib/services/paymentsClient.ts` + le composant concerné, sans dupliquer
  les appels `fetch`.
- Modifier une règle de rôle admin se fait dans `lib/shared/adminRoles.ts`.
- Les handlers Academy/Marketplace/Services/KYC s’appuient sur leurs services.

### Zones à risque
- `AdminDashboard` et `InstructorDashboard` : une modification d’onglet peut
  toucher un fichier de ~2 000 lignes.
- `CoursePlayerModal` : lecture, hors-ligne, quiz et certificat dans un même fichier.
- `CheckoutStep` reste un composant de ~600 lignes (paiement + affichage + états).

## Vérifications

- `npm test` : **35 / 35**
- `npm run test:security` : **44 / 44**
- `npm run test:authz` : **50 / 50**
- `npm run test:payments` : **63 / 63**
- `npm run test:academy` : **25 / 25**
- `npm run test:modules` : **21 / 21**
- `npm run test:db` : **21 / 21**
- `npm run test:migrations` : 6 migrations, 64 tables / 64 FK
- `npm run check:boundaries` : 0 cycle / 0 violation
- `npm run typecheck`, `npm run lint` (0 erreur), `npm run build` : OK

## Évaluation

La séparation backend est mature et testée. La prochaine amélioration à fort
impact est le **découpage interne des tableaux de bord** (onglets en composants
dédiés) et l’extraction complète du handler KYC. Les contrats frontend critiques
(paiements, téléchargements) sont maintenant centralisés et testables.
