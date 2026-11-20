# PHASE 4 — Base de données, intégrité et migrations

## 1. État initial constaté

| Élément | Valeur |
|---|---|
| Tables publiques | 64 |
| Clés étrangères en base | **15** |
| `_prisma_migrations` | **absente** |
| Chapitres orphelins | 5 |
| Leçons orphelines | 5 (+3 via chapitres orphelins) |
| Quiz orphelins | 2 |
| Options de quiz orphelines | 15 (+8 via quiz orphelins) |
| Avis de cours orphelins | 3 |
| `service_options` orphelins | 2 |
| Commandes liées à un produit supprimé | 9 |
| Sessions (total / expirées / orphelines) | 41 / 32 / 9 + 1 admin |
| Doublons e-mail / attestations / abonnements / droits | 0 |
| Types incohérents | `admin_users.id` text vs `sessions.admin_user_id` uuid ; `instructor_commissions.order_id` text vs commandes uuid ; `entitlements.payment_id` text vs paiements uuid |

`public.sessions.user_id` était **déjà UUID** (la confusion venait de `auth.sessions`,
table Supabase). Les 41 lignes ont été nettoyées : il reste 8 sessions valides.

## 2. Relations et clés étrangères ajoutées

**64 clés étrangères** au total (contre 15). Notamment :

- `courses.center_id → training_centers` SET NULL
- `courses.category_id → course_categories` SET NULL
- `course_chapters.course_id → courses` CASCADE
- `course_lessons.chapter_id → course_chapters` CASCADE
- `course_quizzes.course_id`, `quiz_options.quiz_id` CASCADE
- `course_enrollments`, `course_reviews`, `certificates` (SET NULL pour les attestations)
- `products.store_id` / `products.vendor_id` SET NULL
- `stores.vendor_id` SET NULL, `store_payout_info.store_id` CASCADE
- `payout_requests.store_id` SET NULL
- `marketplace_orders.store_id` / `product_id` SET NULL
- `marketplace_order_items.order_id` **RESTRICT**
- `payment_transactions.order_id` **RESTRICT**, `user_id` SET NULL
- `refunds.order_id` / `payment_id` **RESTRICT**
- `subscriptions.user_id` CASCADE, `plan_id` RESTRICT, `order_id` SET NULL
- `entitlements.user_id` CASCADE, `order_id`/`subscription_id`/`payment_id` SET NULL
- `course_lesson_progress` (user/course/lesson) CASCADE
- `course_quiz_attempts` (user/course) CASCADE
- `sessions.user_id` / `admin_user_id` CASCADE
- notifications, candidatures vendeur, profils freelance/entreprise, services, blog,
  commissions et achats de stockage des formateurs.

## 3. Politique de suppression et conservation

| Donnée | Suppression |
|---|---|
| Formation | contenu (chapitres/leçons/quiz) CASCADE ; attestations SET NULL ; droits révoqués ; **snapshot JSON dans `data_archive`** |
| Produit / boutique / centre | conservés autant que possible ; propriétaire SET NULL ; historiques financiers conservés |
| Commande | **interdite** tant qu'il existe des lignes, paiements ou remboursements (RESTRICT) |
| Paiement / remboursement | conservés ; remboursement lié en RESTRICT |
| Attestation | conservée ; cours détaché (SET NULL) |
| Sessions | supprimables (jetons éphémères, jamais archivés) |
| Droits d'accès | révoqués, jamais supprimés lors d'un remboursement |
| Abonnement | supprimé avec l'utilisateur (CASCADE) ; plan protégé (RESTRICT) |

Les suppressions de formation et de centre passent par une transaction :
archivage, révocation des droits, détachement, suppression. Les commandes et
paiements ne sont jamais supprimés par ces opérations.

## 4. Types et identifiants

- `admin_users.id` : text → **uuid** (2 valeurs vérifiées UUID).
- `instructor_commissions.order_id` : text → **uuid** (0 ligne).
- `entitlements.payment_id` : text → **uuid** (15 valeurs valides).
- `sessions.user_id` / `admin_user_id` confirmés UUID + FK.
- `users.email` normalisé en minuscules (0 divergence).
- Les colonnes polymorphes (`resource_id`, `payment_id` métier, `entity_id`)
  restent textuelles par conception et sont documentées.

## 5. Unicités et index

Unicités métier ajoutées :
- `users_email_lower_key` (e-mail insensible à la casse) ;
- `certificates_user_course_key` (une attestation par apprenant/formation, partielle) ;
- `product_reviews_user_product_key` (un avis par utilisateur/produit, partielle) ;
- existantes conservées : entitlements, progression leçon, webhooks, références de paiement.

Index ajoutés sur les clés étrangères et recherches réelles : sessions admin,
centres/instructeurs des cours, vendeur des produits, quiz/options, avis, fichiers,
paiements utilisateur, plan d'abonnement, entitlements (order/subscription/payment),
produits des commandes, progression, commissions, stockages, services, blog,
freelance/entreprise.

## 6. Transactions métier

- **Confirmation de paiement** : statut commande + compteurs produits/boutiques +
  entitlements + abonnement dans une **seule transaction**. Un paiement confirmé
  ne peut plus exister sans droits.
- **Remboursement total** : remboursement + paiement + commande + révocation des
  droits dans une transaction.
- **Expiration d'abonnement** : statut + révocation dans une transaction.
- **Progression leçon** : upsert + recalcul + inscription + cache dans une transaction.
- **Attestations** : unicité en base + gestion de course concurrente (P2002).
- **Suppressions formation/centre** : archivage + révocation + suppression atomiques.
- Le trigger historique `trg_order_paid_after_update` a été retiré : il doublait
  les compteurs avec `markOrderPaid` (gestion multi-articles côté application).

## 7. Stratégie de migrations

Historique créé avec **6 migrations** :

| Migration | Rôle |
|---|---|
| `00000000000000_baseline` | snapshot complet de la base réelle (64 tables, index, FK) |
| `00000000000001_baseline_triggers` | 11 fonctions + 34 triggers historiques |
| `20261120090000_phase2_payments` | paiements/entitlements (déjà appliquée, marquée appliquée) |
| `20261120120000_phase3_academy_progress` | progression/quiz (idem) |
| `20261120150000_phase4_integrity` | assainissement, FK, index, types, politique de suppression |
| `20261120160000_phase4_order_trigger` | retrait du trigger de double comptage des ventes |

**Base existante** : baseline vérifiée puis `prisma migrate resolve --applied`
pour les 5 migrations ; `prisma migrate status` → *Database schema is up to date*.

**Base neuve** : `prisma migrate deploy` applique baseline, triggers, puis les
phases 2/3/4 (toutes idempotentes). Un test `test-migrations-replay.mjs` rejoue
l'intégralité dans un schéma jetable et obtient **64 tables / 64 FK**, puis
`ROLLBACK` (aucune donnée réelle touchée).

Les politiques **RLS Supabase (93)** ne sont pas gérées par Prisma : elles
restent administrées par Supabase et ne sont pas incluses dans la baseline.

## 8. Tests exécutés

| Test | Résultat |
|---|---|
| `npm run test:migrations` (replay base neuve) | 6 migrations, 64 tables, 64 FK |
| `npm run test:db` (intégrité) | **21/21** |
| `npm run test:authz` | 48/48 |
| `npm run test:payments` | 59/59 |
| `npm run test:academy` | **25/25** (inclut suppression formation archivée) |
| `npm test` | 19/19 |
| `npm run typecheck` | OK |
| `npm run lint` | 0 erreur |
| `npm run build` | OK |

## 9. Reste à traiter

- RLS Supabase non versionnée (spécifique à la plateforme) ;
- quelques relations polymorphes sans FK (`kyc_submissions.applicant_id`,
  `product_events`, `storage_objects.entity_id`, `marketplace_order_items.resource_id`) ;
- suppression physique des commandes interdite par conception : prévoir une
  anonymisation RGPD documentée si nécessaire ;
- sauvegardes/PITR Supabase à vérifier et documenter ;
- 599 avertissements ESLint historiques hors périmètre base de données.

