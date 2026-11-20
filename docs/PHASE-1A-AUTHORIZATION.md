# PHASE 1A — Autorisation des écritures (`/api/platform/write`)

> Politique **explicite** par action, refus par défaut, contrôles de propriété
> vérifiés en base. Implémentation : `lib/server/writeAuthorization.ts`.

## Principes

- Action inconnue → **400** (`UNKNOWN_ACTION`), jamais exécutée.
- Anonyme sur une action privée → **401**.
- Membre authentifié sans droit → **403**.
- Superviseur admin → **403** sur **toute** écriture.
- Admin sans le domaine requis (finance / KYC) → **403**.
- Identité (`userId`, `instructorId`, `vendorId`, `ownerId`) : **jamais** prise
  dans le payload pour un membre — elle vient de la session.
- Erreurs Prisma : journalisées côté serveur, **jamais** renvoyées au client.

## Répartition des 58 actions

| Catégorie | Actions |
|---|---|
| **Publiques** (validées + limitées en débit) | `submit-quote`, `submit-vendor-app`, `submit-support`, `order-service`, `submit-order` |
| **Membre (self)** | `submit-kyc`, `update-profile`, `update-freelance-profile`, `update-enterprise-profile`, `sync-user-learning`, `issue-certificate`, `register-course-media-storage`, `register-free-purchase`, `mark-notification-read`, `delete-notification`, `rate-product`, `rate-course`, `create-training-center`, `update-training-center-config`, `pay-training-center-fee`, `register-instructor-purchase`, `submit-payout` |
| **Propriétaire de contenu** | `update-course`, `suspend-course`, `delete-course`, `submit-course-by-instructor`, `create-product`, `update-product`, `update-store`, `appeal-moderation` |
| **Admin — contenu** | `create-course`, `create-course-category`, `update-course-category`, `delete-course-category`, `set-course-featured`, `create-banner`, `update-banner`, `delete-banner`, `create-blog-post`, `update-blog-post`, `delete-blog-post`, `moderate-content`, `restore-content`, `create-service`, `update-service`, `delete-service`, `approve-vendor-app`, `reject-vendor-app`, `admin-add-instructor`, `ban-training-center`, `delete-training-center` |
| **Admin — finance** | `save-commission-rule`, `approve-payout` |
| **Admin — KYC** | `approve-kyc`, `kyc-set-lock`, `kyc-unlock`, `kyc-remove-doc`, `approve-kyc-full` |

## Contrôles de propriété (vérifiés en base)

| Ressource | Règle |
|---|---|
| Formation | `instructorId` **ou** centre possédé, sinon admin |
| Produit | `vendorId` **ou** boutique (`vendorId`/`ownerEmail`), sinon admin |
| Boutique | `vendorId` **ou** `ownerEmail`, sinon admin |
| Centre de formation | `ownerId`, sinon admin |
| Notification | destinataire ou annonce globale |
| Commande | `buyerUserId` ou `buyerEmail` de l'appelant |
| Contenu modéré (appel) | propriétaire du cours/produit, sinon admin |

## Paiements (volontairement bloqués)

- `submit-order` recalculé **côté serveur** à partir des prix en base.
- Statut enregistré : `En_attente_API` (jamais « Paye » depuis le client).
- **Aucun droit d'accès** n'est accordé (`enrolledCourseIds` / `purchasedProductIds`).
- `register-free-purchase` n'accepte que les commandes à **0 $** dont le produit est gratuit.
- `sync-user-learning` **ignore** les inscriptions envoyées par le navigateur et
  n'accepte que les attestations réellement délivrées par le serveur.

## Tests

```powershell
npm run test:authz      # 48 contrôles (matrice + HTTP anonyme + anti-fuite)

## Mise à jour — Phase 2 (paiements)

Cette matrice reste valable pour **54 actions**. Quatre actions ont été
**retirées** car elles accordaient un paiement ou un accès à partir de données
client :

- `submit-order`
- `register-free-purchase`
- `register-instructor-purchase`
- `pay-training-center-fee`

Elles répondent désormais **410 `ENDPOINT_MOVED`** (vérifié avant toute
authentification) et sont remplacées par `POST /api/payments/checkout`.
Voir `docs/PHASE-2-PAYMENTS.md`.

```

Tests authentifiés optionnels via cookies : voir l'en-tête de
`scripts/test-write-authorization.mjs`.

## Reste à faire (hors Phase 1A)

- Intégration d'une passerelle de paiement + webhook signé + table d'entitlements.
- `register-instructor-purchase` et `pay-training-center-fee` restent des achats
  **simulés** (aucune vérification de paiement).
- Attestations : la complétion du cours n'est pas encore vérifiée (seule
  l'inscription/gratuité l'est).
- Rate-limit des actions publiques en mémoire (par instance) : passer au
  compteur persistant (`rateLimitPersistent`) si déploiement multi-instances.
