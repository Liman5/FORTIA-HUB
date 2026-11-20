# PHASE 2 — Paiements, abonnements et entitlements

## 1. Architecture

```
lib/modules/payments/
  money.ts          montants en unités mineures (entiers), devises XOF/XAF à 0 décimale
  types.ts          DTO + PaymentError + interface PaymentProvider
  pricing.ts        résolution des prix 100 % serveur
  orders.ts         commande, paiement d'une commande gratuite, octroi des droits
  payments.ts       tentative de paiement + sanitisation des réponses fournisseur
  providers/        index (registre), stripe.ts, sandbox.ts
  webhooks.ts       vérification, idempotence, transitions
  entitlements.ts   source de vérité des droits (+ cache d'affichage legacy)
  subscriptions.ts  activation, annulation, expiration, renouvellement manuel
  refunds.ts        remboursement total/partiel, révocation ciblée
  maintenance.ts    expiration (cron)
  http.ts           réponses HTTP sans détail interne
```

Routes (fines) :

| Route | Rôle |
|---|---|
| `POST /api/payments/checkout` | crée la commande (prix serveur), tente le paiement |
| `POST /api/payments/webhook/[provider]` | reçoit le corps **brut**, vérifie la signature |
| `GET /api/payments/status/[orderId]` | statut réel (acheteur ou admin) |
| `POST /api/payments/cancel` | annule une commande en attente |
| `GET /api/payments/providers` | moyens réellement configurés |
| `GET /api/payments/plans` | formules et tarifs publics |
| `GET /api/entitlements` | droits du membre / vérification ponctuelle |
| `GET,POST /api/subscriptions` | liste et annulation |
| `GET,POST /api/admin/refunds` | historique, remboursement (finance) |
| `GET,POST /api/admin/subscription-plans` | formules (contenu) |
| `POST /api/admin/payments/expire` | expiration immédiate (finance) |

Pages : `/payments/return` (statut, **n'accorde rien**) et `/payments/cancel`.

## 2. Base de données

Migration : `prisma/migrations/20261120090000_phase2_payments/migration.sql`
(appliquée avec `npx prisma db execute --file …`).

Tables ajoutées : `marketplace_order_items`, `price_plans`,
`subscription_plans`, `subscriptions`, `entitlements`, `refunds`.
Colonnes ajoutées : `marketplace_orders.currency/subtotal_minor/total_minor/paid_at/cancelled_at`,
`payment_transactions.provider/amount_minor/checkout_url/confirmed_at/failure_reason/event_id`,
`payment_webhooks.event_id/processed_at/attempts` (fournisseur en texte).

Contraintes : `payment_webhooks(gateway_code,event_id)` **unique**,
`payment_transactions(provider,provider_ref)` **unique**,
`entitlements(user_id,resource_type,resource_id)` **unique**.

Reprise des données : `entitlements` alimentés depuis
`users.enrolled_course_ids`, `users.purchased_product_ids` et
`course_enrollments` (**15 droits migrés** lors de l'application).

Tarifs serveur créés : `storage_10gb` = 3 $, `storage_25gb` = 6 $,
`storage_50gb` = 10 $, `center_fee` = 2 $ (mêmes montants que l'ancienne UI).

## 3. Fournisseurs de paiement — état réel

| Fournisseur | État | Ce qu'il faut |
|---|---|---|
| **Stripe** (`stripe`) | **Intégré** (Checkout Session + webhook `Stripe-Signature` + Refund API), **non configuré** faute de clés | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Sandbox** (`sandbox`) | Intégré pour les **tests** : webhook HMAC, aucun débit, **désactivé par défaut** | `PAYMENTS_SANDBOX_ENABLED=true`, `SANDBOX_WEBHOOK_SECRET` (jamais en production) |
| Wave / Orange Money / PayPal / USDT | **Non intégrés** : l'UI les affiche « Bientôt disponible » et le serveur refuse (aucun faux succès) | Contrat/API du fournisseur |

Variables à ajouter en production :
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`NEXT_PUBLIC_APP_URL=https://fortiahub.com`.
Webhook Stripe à déclarer : `https://<domaine>/api/payments/webhook/stripe`
(événements `checkout.session.completed`, `checkout.session.expired`).

Le fournisseur sandbox refuse de démarrer en production sauf
`PAYMENTS_SANDBOX_ALLOW_PROD=true` (à ne **jamais** définir sur Vercel).

## 4. Cycle de paiement

1. Le client envoie **uniquement** `{ type, id | planCode, quantity }`.
2. `pricing.ts` relit le prix en base (formation, produit, formule, tarif).
3. La commande est créée avec le montant serveur (`En_attente_API`).
4. Si le total est **0** : paiement `free` + droits immédiats.
5. Sinon : tentative `En_attente`, redirection Stripe (ou attente sandbox).
6. Le webhook signé vérifie **signature, référence, montant, devise**.
7. Le paiement passe `Valide`, la commande `Paye`, les droits sont accordés.
8. Le retour navigateur n'accorde **jamais** d'accès.

Statuts : commande `En_attente_API → Paye | Echoue | Annule`, `Paye → Rembourse`.
Paiement : `En_attente → Valide | Echoue`, `Valide → Rembourse`.
Toute transition impossible renvoie `409` (aucune écriture).

Idempotence : échec de webhook enregistré (`payment_webhooks.processing_error`),
rejeu contrôlé (`attempts`), `updateMany` conditionnel sur le statut, contrainte
unique sur l'événement. Un webhook rejoué renvoie `duplicate: true`.

## 5. Entitlements (source de vérité)

`hasEntitlement(userId, resourceType, resourceId)` vérifie `status = active`,
`startsAt <= now` et l'absence d'expiration dépassée.
`grantEntitlement` est idempotent, `revokeEntitlement` retire aussi le cache
d'affichage (`users.enrolled_course_ids` / `purchased_product_ids`).

Types gérés : `course`, `product`, `subscription`, `storage`, `service`, `feature`.

`lib/server/storageAccess.ts` utilise **uniquement** `hasEntitlement` pour les
fichiers privés (médias de formation, livrables produits), en plus des règles
propriétaire/gratuit/admin. Les anciens tableaux ne servent plus de preuve
d'accès — ils sont seulement un cache d'affichage.

## 6. Abonnements

`Subscription` : `pending → active → cancelled → expired`.
- activation à la confirmation du paiement (`currentPeriodEnd = +1 mois/1 an`) ;
- annulation : `cancelAtPeriodEnd = true`, l'accès reste actif jusqu'à l'échéance ;
- expiration : `expireSubscriptions()` (cron `/api/cron/maintenance` ou admin)
  passe `expired` et révoque l'entitlement ;
- renouvellement **manuel** : nouvelle commande (aucun prélèvement automatique
  n'est configuré chez un fournisseur).

## 7. Remboursements

`POST /api/admin/refunds` (admin finance, superviseur refusé) :
- remboursement total → paiement `Rembourse`, commande `Rembourse`, droits liés
  **à ce paiement** révoqués ;
- remboursement partiel → historique conservé, commande toujours `Paye`, droits
  maintenus (règle métier explicite) ;
- aucun historique financier n'est supprimé ; `refunds` conserve montant,
  devise, motif, auteur, référence fournisseur.

## 8. Anciennes fonctionnalités simulées

| Ancien parcours | État |
|---|---|
| `submit-order` | **410 `ENDPOINT_MOVED`** |
| `register-free-purchase` | **410** (remplacé par le checkout à 0 $) |
| `register-instructor-purchase` | **410** (stockage via checkout) |
| `pay-training-center-fee` | **410** (frais via checkout) |
| `CheckoutStep` (simulation 1,8 s) | remplacé par `/api/payments/checkout` |
| Création de centre « active + payée » locale | supprimée : centre `pending` |

Aucun de ces parcours ne peut plus accorder un accès : le code des `case` reste
inatteignable et sera supprimé lors du découpage de la route (Phase 3).

## 9. Sécurité

- Aucun montant client utilisé (`price`, `amountUsd`, `total` ignorés) ;
- checkout réservé aux membres authentifiés (401 sinon) ;
- statut d'une commande limité à son acheteur (403 sinon) ;
- stockage limité au centre possédé (403 sinon) ;
- webhook non signé → 400 avant toute écriture ;
- montant/devise incorrects → 409, paiement laissé en attente ;
- erreurs internes jamais renvoyées (message générique + log serveur) ;
- réponses fournisseur nettoyées (`sanitizeGatewayPayload`) ;
- aucun secret dans le navigateur.

## 10. Tests exécutés

`node scripts/test-payments-phase2.mjs` (serveur `next start -p 3100`) :
**57 réussis / 0 échoué**, dont :
signature invalide, montant incorrect, webhook valide, doublon, concurrence,
gratuité, produit, abonnement (activation/annulation/expiration), stockage
(+10 GB, centre d'autrui refusé), remboursement partiel/total, statut d'autrui,
auto-attribution refusée, 4 actions historiques en 410, prix client ignoré.

`node scripts/test-write-authorization.mjs` : **48 réussis / 0 échoué**
(54 politiques, 4 actions neutralisées).

`tsc --noEmit` et `npm run build` : OK.

## 11. Configuration externe encore nécessaire

1. Appliquer la migration sur la base de production (déjà appliquée sur la base
   courante) : `npx prisma db execute --file prisma/migrations/20261120090000_phase2_payments/migration.sql`.
2. Renseigner `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` sur Vercel.
3. Déclarer le webhook Stripe `…/api/payments/webhook/stripe`.
4. Définir `NEXT_PUBLIC_APP_URL` sur le domaine public.
5. Ne pas définir `PAYMENTS_SANDBOX_*` en production.

## 12. Reste à faire avant la phase suivante

- Passerelles Wave / Orange Money / PayPal / USDT (contrats et webhooks).
- Renouvellement automatique (si un fournisseur le permet).
- Interface admin de remboursements et de formules (API prête, UI à brancher).
- Attestations : vérifier 100 % de progression et non seulement l'accès.
- Découpage de `/api/platform/write` (les `case` historiques à supprimer).
- Rate-limit persistant pour les routes de paiement.

