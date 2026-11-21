# AUDIT GLOBAL — Phases 2 à 6

## Phase 2 — Paiements, abonnements, droits

### Corrigé
- **Remboursement total** : révocation des droits par `paymentId` **et** par `orderId`
  (les droits migrés sans `paymentId` sont couverts). Ajout de
  `revokeEntitlementsByOrder()`.
- **Rachat après révocation** : testé de bout en bout ; l'upsert d'entitlement
  réactive le droit et une nouvelle commande est créée.
- **Frais d'ouverture du centre** : le plan `center_fee` est maintenant un article
  `feature` réellement payable :
  - vérification de propriété du centre avant création de commande ;
  - après webhook confirmé : `feePaid = true`, `status = active`, entitlement traçable ;
  - bouton « Payer les frais (2 $ US) » dans l'espace formateur ;
  - test d'intégration ajouté.
- **Paystack** et **Flutterwave** : adaptateurs REST complets ajoutés
  (`providers/paystack.ts`, `providers/flutterwave.ts`) :
  - initialisation de paiement, webhook signé, vérification montant/devise, remboursement ;
  - Flutterwave revérifie la transaction via l'API avant confirmation ;
  - variables `.env.example` / `env.ts` ajoutées ;
  - fournisseurs visibles dans `/api/payments/providers` et dans le checkout.
- **UI checkout** : méthodes Paystack/Flutterwave sélectionnables lorsqu'elles sont configurées.

### Reste ouvert (clés externes)
- Renseigner `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY`,
  `FLUTTERWAVE_WEBHOOK_SECRET` et déclarer les webhooks :
  `/api/payments/webhook/paystack`, `/api/payments/webhook/flutterwave`.
- Sans clés, ces fournisseurs restent `configured: false` et ne sont pas proposés.

## Phase 3 — Validations, erreurs, fondations

### Corrigé
- `/api/track` utilise désormais le **rate-limit persistant** (au lieu du compteur mémoire).
- Adaptateurs de paiement ajoutés sans exposer de secret.
- Tests unitaires des fournisseurs ajoutés.

### Vérifié
- `writeAuthorization`/Zod : autorisation avant validation métier.
- Erreurs normalisées, `requestId`, logs sans secret.
- `npm run typecheck`, lint, build.
- Certificats : progression et quiz vérifiés côté serveur (tests Academy).

### Reste ouvert
- Certaines actions administratives utilisent encore l'enveloppe Zod générique.
- `/api/ai-assistant` reste accessible aux visiteurs (session optionnelle) ; seule
  la clé Gemini limite l'usage. Une limite de débit dédiée est recommandée.

## Phase 4 — Base de données

### Vérifié
- `prisma migrate status` cohérent ; replay complet : **6 migrations**,
  64 tables / 64 FK.
- Transactions : créations de formation, paiements, remboursements, expirations,
  quotas et suppressions contrôlées.
- Archivage des formations/centres et conservation des attestations/historiques.
- Entitlements, progression, quiz, rate-limit et webhooks avec contraintes uniques.

### Reste ouvert
- Champs polymorphes sans FK (`entitlements.resourceId`, `storage_objects.entityId`,
  `kyc_submissions.applicantId`, `marketplace_order_items.resourceId`) : choix assumé.
- RLS Supabase et sauvegardes/PITR non vérifiables depuis le dépôt.
- Procédure d'anonymisation RGPD non automatisée.

## Phase 5 — `platform/write`

### Vérifié
- Route adaptateur de **79 lignes**, 0 `case` métier.
- **54 actions** réparties dans 12 handlers, dispatcher unique.
- 4 actions de paiement obsolètes → `410 ENDPOINT_MOVED`.
- Autorisation et validation exécutées avant dispatch ; aucun chemin parallèle.
- Tests : 54 actions ↔ 54 politiques, dispatch, compatibilité.

## Phase 6 — Architecture modulaire

### Corrigé
- `toPublicProducts()` centralise la vue publique marketplace/bootstrap.
- Services Academy, Marketplace, Services, KYC utilisés par les handlers.
- `write/helpers.ts` supprimé ; helpers éclatés (validation, R2, e-mail).
- Frontières vérifiées : **0 cycle, 0 violation** (`npm run check:boundaries`).

### Reste ouvert
- `kyc.ts` reste volumineux (verrouillage/déverrouillage/suppression de document/
  approbation complète) : extraction possible vers `lib/modules/kyc/service.ts`.
- Les handlers `profiles`, `vendors`, `centers`, `content`, `finance`, `learning`,
  `notifications` conservent des accès Prisma directs pour des requêtes isolées.

## Corrections transverses supplémentaires

- `register-course-media-storage` : un delta négatif ne permet plus de remettre le
  quota à zéro ; quota plafonné.
- `update-course` : `rating`, `reviewsCount`, `isFeatured` réservés aux admins.
- KYC : flags de vérification calculés depuis `kycStatus` (pas d'auto-validation).
- Retraits : solde contrôlé, FCFA serveur, double approbation bloquée.
- Candidatures vendeur : transitions atomiques.

## Tests exécutés

| Test | Résultat |
|---|---|
| `npm run test:payments` | **63 / 63** (frais de centre + rachat après remboursement inclus) |
| `npm run test:security` | **44 / 44** |
| `npm run test:authz` | **50 / 50** |
| `npm run test:academy` | **25 / 25** |
| `npm run test:modules` | **21 / 21** |
| `npm run test:db` | **21 / 21** |
| `npm run test:migrations` | **6 migrations**, 64 tables / 64 FK |
| `npm test` | **31 / 31** |
| `npm run typecheck` | OK |
| `npm run lint` | **0 erreur** |
| `npm run build` | OK |
| `npm run check:boundaries` | 0 cycle / 0 violation |

## Évaluation globale

L'architecture est cohérente et les contrôles critiques sont centralisés. Les
risques restants sont majoritairement **externes** (clés Paystack/Flutterwave,
RLS/sauvegardes Supabase) ou **d'ergonomie d'administration** (panneaux de
remboursement/plans non connectés), pas des contournements d'autorisation connus.
