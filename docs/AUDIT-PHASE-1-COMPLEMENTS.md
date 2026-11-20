# AUDIT — Compléments Phase 1 (sécurité et autorisations)

## Failles confirmées et corrigées

| # | Faille | Correction |
|---|---|---|
| 1 | `/api/catalog/course/[id]` renvoyait `videoUrl`, `content` et `videoCodeHash` des leçons à **tout visiteur**, y compris pour une formation payante. | Contenu servi uniquement au propriétaire, à un admin, à une formation gratuite publiée ou à un titulaire d'entitlement/inscription. Formation non publiée → 404 hors propriétaire/admin. |
| 2 | `/product/[slug]` sérialisait `files[].fileUrl` (livrables payants) pour tous les visiteurs. | Fichiers inclus uniquement si accès réel (entitlement, achat, gratuité, propriétaire, admin). |
| 3 | `/api/marketplace` et `/api/bootstrap` renvoyaient `downloadUrl` et des notes de modération internes aux visiteurs. | `toPublicProducts()` retire `downloadUrl`, `moderationReason`, `moderationAt`, `fundsFrozen`, `appealMessage` sauf propriétaire/admin. |
| 4 | `/api/platform/sync` (héritée) exposait publiquement boutiques, produits, URL de livrables et notifications. | GET réservé aux administrateurs (401 sinon). |
| 5 | `update-freelance-profile` / `update-enterprise-profile` forçaient `kycVerified`, `canSellServices`, `verifiedDocuments` à `true` : un membre s'auto-vérifiait KYC. | Flags calculés depuis `users.kycStatus === "approuve"` à la création **et** à la mise à jour. |
| 6 | `submit-payout` acceptait un montant supérieur au solde et un `amountFcfa` client. | Solde = chiffre d'affaires − retraits en attente ; montant refusé au-delà (409) ; FCFA recalculé serveur. |
| 7 | `approve-payout` pouvait être approuvé plusieurs fois (double déduction du chiffre d'affaires). | Statut `En_attente` obligatoire + transition atomique `updateMany` dans une transaction. |
| 8 | `approve-vendor-app` / `reject-vendor-app` pouvaient être rejoués (boutiques dupliquées). | Statut `En_attente` obligatoire ; 409 sinon. |
| 9 | `ADMIN_EMAILS` : une adresse allowlistée non encore inscrite pouvait être créée via l'inscription publique, donnant le rôle superadmin. | L'inscription refuse désormais une adresse de la liste `ADMIN_EMAILS` ou présente dans `admin_users`. |
| 10 | Actions authentifiées sensibles sans limite de débit (`submit-kyc`, `submit-payout`, `issue-certificate`, contenus, etc.). | Limites persistantes par utilisateur/admin dans `writeAuthorization` (KYC 5/10 min, retraits 10/min, contenus 30/min, etc.). |
| 11 | `update-course` laissait le propriétaire modifier `rating`, `reviewsCount` et `isFeatured` (fausse réputation / mise en avant). | Ces champs sont désormais réservés aux administrateurs ; le propriétaire ne peut modifier que le contenu et la publication. |
| 12 | `register-course-media-storage` acceptait un `deltaBytes` négatif du propriétaire : le quota pouvait être remis à zéro. | Delta négatif ignoré pour un non-admin ; quota plafonné à la capacité réelle. |

## Points déjà correctement sécurisés (vérifiés)

- Politique explicite des 54 actions, refus par défaut, superviseur en lecture seule.
- Propriété vérifiée en base pour formations, produits, boutiques, centres, notifications.
- Identité issue de la session (jamais `userId`/`vendorId`/`instructorId` client).
- Domaines admin séparés : finance, KYC, contenu (les rôles non globaux sont limités).
- Entitlements et contrôle d'accès des fichiers privés.
- Idempotence des webhooks de paiement intacte.
- Checkout : montants calculés serveur, statut décidé par webhook.

## Tests HTTP authentifiés ajoutés

`scripts/test-security-authz.mjs` — **44 vérifications** sur la chaîne HTTP complète :

- profils : soi-même / autrui / superviseur ;
- formations, produits, boutiques, centres : autre membre → 403, propriétaire → 200 ;
- KYC : flags non auto-attribués, admin finance refusé, admin KYC autorisé ;
- finance : retrait d'autrui refusé, solde insuffisant, FCFA recalculé, double approbation 409, séparation finance/KYC ;
- contenus : KYC sans droit contenu, admin contenu autorisé ;
- notifications : destinataire uniquement ;
- candidature vendeur : double approbation 409 ;
- inscription d'un e-mail admin refusée ;
- fuites : `downloadUrl` absent marketplace/bootstrap, `videoUrl` masquée sans droit et servie avec entitlement, `platform/sync` 401, fichiers absents de la page produit publique.

## Risques acceptés / restants

- **Rate-limit** : repli mémoire si PostgreSQL est indisponible. En multi-instance pendant une panne DB, la limite devient locale. Risque documenté ; aucune dépendance Redis ajoutée.
- **`ADMIN_EMAILS`** : une adresse déjà enregistrée avant ce correctif et présente dans la liste conserve ses droits. Audit manuel de la table `admin_users`/`ADMIN_EMAILS` recommandé.
- **`platform/sync`** : route héritée réservée admin ; si un client externe l'utilisait, il doit migrer vers `/api/bootstrap` ou `/api/marketplace`.
- **`update-freelance-profile`** : un admin peut cibler un autre utilisateur ; les flags KYC restent calculés depuis la cible.
- **`create-training-center`** : reste ouvert à tout membre (parcours d'inscription formateur) ; la publication de formations sans centre n'a pas été modifiée.
- `update-course` reste autorisé au propriétaire même si son KYC est non approuvé (règle métier existante).

## Vérifications

- `npm run test:security` : 44/44
- `npm run test:authz` : 50/50
- `npm run test:payments` : 59/59
- `npm run test:academy` : 25/25
- `npm run test:modules` : 21/21
- `npm run test:db` : 21/21
- `npm run test:migrations` : 6 migrations, 64 tables / 64 FK
- `npm test` : 29/29
- `npm run typecheck`, `npm run lint` (0 erreur), `npm run build` : OK
