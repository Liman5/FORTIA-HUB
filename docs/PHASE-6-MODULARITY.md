# FORTIA HUB — Phase 6 : modularisation métier

## Architecture avant / après

**Avant** : `lib/modules/` contenait `academy` (progression, attestations), `payments` et `write`.
Les handlers `write` portaient toute la logique métier ; les helpers de slug, d'e-mail,
de stockage et de résolution de boutique vivaient dans `lib/modules/write/helpers.ts`.

**Après** :

```
lib/modules/
  academy/
    courseIdentity.ts   slug + niveau + code catégorie (règles pures)
    courses.ts          création, mise à jour, archivage d'une formation
    categories.ts       CRUD des catégories
    progress.ts         progression réelle (Phase 3)
    certificates.ts     attestations vérifiées (Phase 3)
  marketplace/
    products.ts         création / mise à jour produit
    moderation.ts       suspension, restauration, appel (produit ou cours)
    stores.ts           résolution de la boutique d'un vendeur
  services/
    catalog.ts          packages + options
    quotes.ts           devis et commandes de service
    emails.ts           e-mail de confirmation (via lib/server/email)
  kyc/
    submissions.ts      dépôt et approbation d'un dossier
  payments/             inchangé (Phase 2)
  write/
    dispatch.ts         routage HTTP → handler
    handlers/           adaptateurs courts par domaine
```

`lib/modules/write/helpers.ts` a été **supprimé** : plus aucun helper générique n'est
caché dans le module d'écriture.

## Services réellement extraits

| Service | Ancien emplacement | Nouveau |
|---|---|---|
| Slug / niveau / code catégorie | `write/helpers.ts` | `academy/courseIdentity.ts` |
| Création formation (admin) | handler academy | `academy/courses.ts` |
| Publication formateur + chapitres + quiz | handler academy (~150 l.) | `academy/courses.ts` |
| Mise à jour formation + contenu | handler academy (~100 l.) | `academy/courses.ts` |
| Archivage / suppression formation | handler academy (~50 l.) | `academy/courses.ts` |
| Catégories de formation | handler academy (~100 l.) | `academy/categories.ts` |
| Création / mise à jour produit | handler marketplace (~80 l.) | `marketplace/products.ts` |
| Modération produit/cours | handler marketplace (~60 l.) | `marketplace/moderation.ts` |
| Boutique du vendeur | handler marketplace | `marketplace/stores.ts` |
| Catalogue de prestations | handler services (~90 l.) | `services/catalog.ts` |
| Devis + commande de service | handler services (~180 l.) | `services/quotes.ts` |
| E-mail de commande service | handler services (~50 l.) | `services/emails.ts` |
| Dépôt / approbation KYC | handler kyc (~60 l.) | `kyc/submissions.ts` |

## Handlers allégés

| Handler | Avant | Après |
|---|---:|---:|
| `academy.ts` | 424 l. | 115 l. |
| `marketplace.ts` | 153 l. | 93 l. |
| `services.ts` | 248 l. | 90 l. |
| `kyc.ts` | 444 l. | 407 l. |

Les handlers restants sont des adaptateurs : ils conservent l'autorisation,
l'identité de session, la validation d'entrée et la forme des réponses.

## Accès Prisma

- Les requêtes réutilisables de formation, catégorie, produit, boutique, prestation,
  devis et KYC sont centralisées dans leur module.
- Les transactions Phase 4 sont préservées et **étendues** à la création/mise à jour
  d'une formation (formation + chapitres + leçons + quiz atomiques).
- Les handlers `profiles`, `vendors`, `centers`, `content`, `finance`, `learning`,
  `notifications` et `support` conservent leurs accès Prisma directs : requêtes
  isolées, aucune duplication réelle constatée à ce stade.

## Règles de dépendance

Contrôlées automatiquement par `npm run check:boundaries` :

1. Aucun cycle d'import dans `lib/modules`.
2. Un module n'importe jamais `app/` ni `components/`.
3. Un composant frontend n'importe jamais `lib/modules/*`.
4. Une route API n'importe pas directement `lib/modules/write/handlers`.
5. Aucun module hors `write` n'importe `lib/modules/write`.

Résultat actuel : **0 cycle, 0 violation**.

## Sécurité conservée

- `writeAuthorization.ts` inchangé dans ses règles.
- Identité issue de la session uniquement.
- Propriété vérifiée avant tout appel de service (formation, produit, centre, contenu).
- Transactions financières et droits d'accès intacts (module `payments` non modifié).
- Formats de réponse HTTP inchangés.

## Validations alignées

Les schémas `kyc-set-lock`, `kyc-unlock` et `kyc-remove-doc` exigent désormais
`kycId` (la clé réellement lue par le handler) et `approve-kyc-full` accepte
`id` **ou** `email`. Deux tests unitaires couvrent ces contrats.

## Tests

- `npm run check:boundaries` : frontières et cycles.
- `npm test` : identité de formation, validation, erreurs, rate-limit, structure write.
- `npm run test:modules` : cycle de vie réel formation + produit via les services.
- `npm run test:authz`, `test:payments`, `test:academy`, `test:db`, `test:migrations`.
- `npm run typecheck`, `npm run lint`, `npm run build`.

## Reste à faire

- `kyc.ts` reste volumineux (verrouillage/déverrouillage/suppression de document).
- Extraire les handlers `profiles`, `vendors`, `centers`, `content`, `finance`,
  `learning`, `notifications` lorsqu'une deuxième utilisation justifiera un service.
- Les `as any` historiques subsistent (avertissements ESLint, aucune erreur).
