# PHASE 3 — Fondations techniques et qualité du code

## 1. Architecture technique ajoutée

```
lib/server/errors.ts      AppError, toErrorResponse, withApiRoute, requestId
lib/server/logger.ts      journalisation JSON structurée + masquage des secrets
lib/server/env.ts         validation Zod des variables d'environnement
lib/server/rateLimits.ts  table centrale des limites + enforceRateLimit
lib/validation/           schémas Zod partagés (common, auth, payments, academy, write)
lib/modules/academy/      progression serveur + attestations vérifiées
tests/unit/               tests unitaires (money, validation, erreurs, rate-limit)
scripts/test-academy-certificates.mjs  test d'intégration des attestations
instrumentation.ts        validation de l'environnement au démarrage
eslint.config.mjs         lint flat config (0 erreur exigée)
```

## 2. Validation centralisée (Zod)

Schémas créés et **branchés** :

| Domaine | Schéma | Routes |
|---|---|---|
| Auth | `authActionSchema`, `forgotPasswordSchema`, `resetPasswordSchema` | `/api/auth`, `/api/auth/forgot-password`, `/api/auth/reset-password` |
| Paiements | `checkoutSchema`, `cancelOrderSchema`, `refundSchema`, `subscriptionCancelSchema`, `subscriptionPlanSchema`, `entitlementQuerySchema` | checkout, cancel, admin/refunds, admin/subscription-plans, subscriptions, entitlements |
| Académie | `lessonProgressSchema`, `quizAttemptSchema`, `certificateIssueSchema`, `courseIdQuerySchema` | `/api/academy/*` |
| Écritures | `writeEnvelopeSchema` + `writeActionSchemas[action]` | `/api/platform/write` (validation **après** autorisation) |

Principes appliqués :
- champs obligatoires/facultatifs, formats (UUID, e-mail), limites de taille,
  quantités et montants ;
- les champs inconnus (ex. `price` envoyé par le client) sont **ignorés** ;
- un anonyme reçoit **401/403 avant** tout détail de validation ;
- les schémas ne remplacent jamais les contrôles d'accès ou de propriété.

## 3. Gestion centralisée des erreurs

- `AppError(status, code, message)` + helpers (`unauthorizedError`,
  `forbiddenError`, `validationError`, …).
- `toErrorResponse()` : format unique
  `{ success:false, error, code, details?, requestId }`.
- Erreurs Prisma mappées (`P2002 → 409`, `P2025 → 404`, base indisponible → 503)
  **sans** message SQL.
- `PaymentError` (module paiements) reconnue et exposée de façon contrôlée.
- `withApiRoute()` ajoute un `requestId`, journalise et capture les erreurs.
- `logger` JSON : masque `password`, `secret`, `token`, `api_key`, `Bearer …`.
- Les `catch` silencieux de la route historique ont été remplacés par une
  réponse typée (plus de succès implicite).

## 4. Typage TypeScript

- `next.config.mjs` : `ignoreBuildErrors` **false** — le build vérifie les types.
- Nouveaux modules entièrement typés (aucun `any` dans `validation/`, `errors.ts`,
  `logger.ts`, `env.ts`, `rateLimits.ts`, `modules/academy/*`).
- `tsc --noEmit` passe sur tout le dépôt.
- La route historique `/api/platform/write` conserve un alias local explicite
  (`LegacyWriteData`) documenté : son découpage est prévu en phase ultérieure.
- `QuizQuestion.correctAnswer` devient optionnel : il n'est plus exposé
  publiquement (uniquement au formateur propriétaire / admin).
- Les options de quiz exposent désormais `optionIds` (nécessaires au score
  serveur) sans révéler les bonnes réponses.

## 5. Rate-limit persistant

- `rateLimitPersistent` (table `rate_limit_counters`) est désormais utilisé par :
  actions publiques de `/api/platform/write`, `/api/auth`, mot de passe,
  checkout, annulation, remboursements, abonnements, administration sensible,
  progression académie et attestations.
- Règles centralisées dans `RATE_LIMITS` (login 10/min, inscription 5/10 min,
  reset 5/15 min, checkout 20/min, remboursement 10/min, KYC 5/10 min,
  attestation 10/min, etc.).
- Repli mémoire documenté si la base est indisponible (fail-safe : la
  protection ne disparaît jamais).
- Les webhooks ne sont **pas** limités en débit : leur idempotence
  (`payment_webhooks`) et leurs nouvelles tentatives légitimes restent garanties.

## 6. Attestations vérifiées côté serveur

Nouveaux modèles (migration `20261120120000_phase3_academy_progress`) :
- `course_lesson_progress` : une ligne par leçon terminée (preuve serveur) ;
- `course_quiz_attempts` : score calculé par le serveur, `passed`, réponses.

Règles de délivrance (`lib/modules/academy/certificates.ts`) :
1. accès réel (entitlement, inscription ou formation gratuite publiée) ;
2. au moins une leçon et **toutes** les leçons terminées ;
3. si la formation comporte des quiz : au moins une tentative avec **≥ 70 %**
   et couvrant toutes les questions ;
4. idempotence : une seule attestation par (utilisateur, formation) ;
5. un admin peut forcer explicitement (`force`) — action **journalisée**.

Le navigateur ne peut plus :
- envoyer `courseProgress: 100` (ignoré, recalculé depuis les leçons) ;
- déclarer un score de quiz (le serveur recalcule depuis les réponses) ;
- obtenir une attestation de secours locale (le fallback client a été supprimé).

## 7. Tests

| Suite | Commande | Résultat |
|---|---|---|
| Unitaires (money, Zod, erreurs, rate-limit) | `npm test` | **19/19** |
| Autorisations écritures | `npm run test:authz` | **48/48** |
| Paiements / entitlements / remboursements | `npm run test:payments` | **59/59** |
| Attestations serveur | `npm run test:academy` | **20/20** |
| Intégration complète | `npm run test:integration` | 3 scripts, 127 contrôles |

`npm run typecheck` OK · `npm run lint` : **0 erreur** (599 avertissements
historiques) · `npm run build` OK (types vérifiés).

## 8. Configuration du projet

- `package.json` : `typecheck`, `lint`, `test`, `test:authz`, `test:payments`,
  `test:academy`, `test:integration`, `verify`.
- `eslint.config.mjs` : flat config, ignore `.next`, `node_modules`, `scripts`,
  `sql`, migrations ; règles historiques en avertissement (aucune nouvelle
  erreur bloquante).
- `instrumentation.ts` : `validateEnv()` au démarrage ; en production, une
  variable indispensable manquante provoque une erreur explicite.
- `lib/server/env.ts` : `DATABASE_URL`, `JWT_SECRET ≥ 32` obligatoires ;
  R2/Stripe/Resend/CRON/Gemini facultatifs ; aucune valeur journalisée.
- `.env.example` complété (Stripe, sandbox, URL publique).

## 9. Fichiers

**Créés** : `lib/server/{errors,logger,env,rateLimits}.ts`,
`lib/validation/{common,auth,payments,academy,write,index}.ts`,
`lib/modules/academy/{progress,certificates}.ts`,
`app/api/academy/{lessons/progress,quizzes/attempt,certificates/eligibility,certificates/issue}/route.ts`,
`prisma/migrations/20261120120000_phase3_academy_progress/migration.sql`,
`tests/unit/*.test.ts`, `scripts/test-academy-certificates.mjs`,
`instrumentation.ts`, `eslint.config.mjs`, `docs/PHASE-3-FOUNDATIONS.md`.

**Modifiés** : `prisma/schema.prisma`, `next.config.mjs`, `package.json`,
`.env.example`, `app/api/auth/{route,forgot-password,reset-password}.ts`,
`app/api/payments/{checkout,cancel}/route.ts`, `app/api/subscriptions/route.ts`,
`app/api/entitlements/route.ts`, `app/api/admin/{refunds,subscription-plans,payments/expire}/route.ts`,
`app/api/platform/write/route.ts`, `app/api/platform/sync/route.ts`,
`app/api/catalog/course/[id]/route.ts`, `components/CoursePlayerModal.tsx`,
`components/InstructorDashboard.tsx`, `lib/store/domains/{useCatalogDomain,usePlatformDomain}.ts`,
`lib/types.ts`, `lib/modules/payments/http.ts`, `lib/server/writeAuthorization.ts`.

## 10. Problèmes restants

- La route `/api/platform/write` reste un monolithe (58 `case` historiques) :
  validation Zod par action déjà branchée, découpage prévu en Phase 4.
- 599 avertissements ESLint historiques (`any`, variables inutilisées, hooks) :
  visibles, non bloquants ; à traiter au fil des modules.
- `platform/sync` reste une route publique héritée (les bonnes réponses de quiz
  sont désormais masquées aux non-propriétaires).
- Attestations antérieures conservées ; aucune réévaluation rétroactive.
- Renouvellement automatique d'abonnement et nouvelles passerelles : hors phase.

