# FORTIA HUB — Phase 5 : décomposition de `/api/platform/write`

## Résultat

`app/api/platform/write/route.ts` est passé de **2 708 lignes** à **79 lignes**.
Il ne contient plus aucun `case` métier : c'est un adaptateur HTTP.

```
app/api/platform/write/route.ts
  ├─ lecture + validation de l'enveloppe (Zod)
  ├─ refus des 4 actions de paiement historiques (410)
  ├─ authorizeWriteAction (Phase 1A)
  ├─ validation du schéma de l'action
  ├─ invalidation du cache de réponse
  └─ dispatchWriteAction(...)

lib/modules/write/
  ├─ types.ts          contexte/handler typés
  ├─ helpers.ts        (supprimé en Phase 6 : helpers éclatés par domaine)
  ├─ dispatch.ts       liste ordonnée des handlers
  └─ handlers/
      ├─ kyc.ts          6 actions
      ├─ profiles.ts     3 actions
      ├─ vendors.ts      4 actions
      ├─ learning.ts     5 actions
      ├─ academy.ts      9 actions
      ├─ marketplace.ts  5 actions
      ├─ content.ts      6 actions
      ├─ services.ts     5 actions
      ├─ finance.ts      3 actions
      ├─ centers.ts      5 actions
      ├─ notifications.ts 2 actions
      └─ support.ts      1 action
```

## Répartition (54 actions)

| Domaine | Actions |
|---|---|
| `kyc` | submit-kyc, approve-kyc, kyc-set-lock, kyc-unlock, kyc-remove-doc, approve-kyc-full |
| `profiles` | update-profile, update-freelance-profile, update-enterprise-profile |
| `vendors` | submit-vendor-app, approve-vendor-app, reject-vendor-app, update-store |
| `learning` | sync-user-learning, issue-certificate, register-course-media-storage, rate-product, rate-course |
| `academy` | create-course, update-course, delete-course, suspend-course, submit-course-by-instructor, create/update/delete-course-category, set-course-featured |
| `marketplace` | create-product, update-product, moderate-content, restore-content, appeal-moderation |
| `content` | create/update/delete-banner, create/update/delete-blog-post |
| `services` | submit-quote, order-service, create/update/delete-service |
| `finance` | save-commission-rule, submit-payout, approve-payout |
| `centers` | create-training-center, update-training-center-config, admin-add-instructor, ban-training-center, delete-training-center |
| `notifications` | mark-notification-read, delete-notification |
| `support` | submit-support |

Les 4 actions de paiement simulées de la Phase 2 n'ont **plus de handler** :
`submit-order`, `register-free-purchase`, `register-instructor-purchase`,
`pay-training-center-fee`. La route renvoie toujours `410 ENDPOINT_MOVED`.

## Sécurité conservée

- La politique d'accès reste **exclusivement** dans `lib/server/writeAuthorization.ts`.
- L'autorisation est exécutée **avant** la validation métier (pas de fuite de schéma).
- Les handlers reçoivent `auth` (acteur résolu côté serveur) et ne lisent jamais
  un `userId` / `vendorId` / `instructorId` client comme preuve d'identité.
- Les contrôles de propriété (formation, produit, boutique, centre, notification,
  commande) restent dans les blocs déplacés, inchangés.
- Les schémas Zod de `lib/validation/write.ts` sont toujours appliqués par la route.
- Aucun nouveau chemin d'écriture parallèle n'a été créé.

## Compatibilité

Les clients continuent d'appeler :

```http
POST /api/platform/write
{ "action": "create-course", "data": { ... } }
```

Noms d'actions, payloads et formats de réponse sont identiques.
Aucun composant frontend n'a été modifié pour cette phase.

## Tests

- `npm test` : structure des 12 domaines, 54 actions uniques, absence des actions
  obsolètes, route sans `case`, dispatch d'une action inconnue → `null`.
- `npm run test:authz` : matrice 54 actions ↔ 54 politiques, 401/403/400/410,
  rate-limit, absence de fuite.
- `npm run test:payments`, `test:academy`, `test:db`, `test:migrations` :
  non-régression paiements, attestations et base de données.

## Reste à faire

- Les handlers `academy` et `kyc` restent volumineux (~600 lignes) : une extraction
  en services (`lib/modules/academy/services`, `lib/modules/kyc/services`) pourra
  être faite sans changer les contrats HTTP.
- La validation Zod reste partielle pour certaines actions administratives :
  elles utilisent l'enveloppe générique et les gardes de propriété.
