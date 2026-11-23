# Étape UI/UX — Catalogues, galeries et données de démonstration

## 1. Design system (tokens)

`app/ibx-design-system.css` complète les tokens existants avec des primitives
réutilisables, toutes basées sur des variables sémantiques (clair **et** sombre) :

| Classe | Rôle |
|---|---|
| `ibx-page`, `ibx-container` | fond de page tokenisé, largeur de contenu maîtrisée |
| `ibx-card`, `ibx-card-flat`, `ibx-card-muted`, `ibx-interactive` | surfaces et survols sobres |
| `ibx-h1/h2/h3`, `ibx-body`, `ibx-small`, `ibx-tiny` | échelle typographique |
| `ibx-chip` (`data-active`), `ibx-select`, `ibx-toolbar`, `ibx-scroll-x` | filtres et barres d'outils |
| `ibx-media`, `ibx-media-zoom` | médias à ratio respecté + loupe |
| `ibx-price`, `ibx-price-old`, `ibx-empty` | prix et états vides |
| `ibx-lightbox*` | galerie plein écran |

### Scope `ibx-catalogue`

Les grilles historiques (formations, boutique) codaient des couleurs sombres.
Le scope `ibx-catalogue` les remappe sur les tokens **dans les deux thèmes** :

```css
html.light .ibx-catalogue [class*="bg-white/[0.04]"], html.dark … { background: var(--ibx-surface); }
```

Aucune fuite entre mode clair et mode sombre : la règle est explicite pour
`html.light` et `html.dark`, avec une spécificité supérieure aux anciens
overrides `!important` de `globals.css`.

## 2. Galerie d'images réutilisable

`components/ui/IbxLightbox.tsx`

- ouverture au clic sur la vignette / l'image principale ;
- fermeture : bouton, clic sur le fond, **Échap** ;
- navigation : **flèches gauche/droite**, boutons, compteur « 1 / 4 » ;
- focus placé sur le bouton de fermeture, défilement de page verrouillé ;
- respect de `prefers-reduced-motion`.

Utilisée par : fiche produit, cartes de la boutique, cartes de la Sélection
numérique de l'accueil.

## 3. Pages retravaillées

- **Accueil — Sélection numérique** : cartes homogènes (`ibx-card-flat`),
  images `object-cover` à hauteur fixe, badge, prix lisible, loupe. Le conflit
  clair/sombre venait des classes `bg-white` + `dark:` combinées aux overrides
  `!important` ; les tokens suppriment le problème.
- **Sélection / ressources** : tuiles tokenisées.
- **Bannières secondaires** : surface `ibx-card`.
- **`/academy`** : en-tête (titre, compteurs réels, accès catégories),
  catalogue existant conservé (recherche, filtres, tri, pagination serveur),
  avantages et bloc certification tokenisés.
- **`/marketplace`** : en-tête compact + onglets (Produits / Freelances /
  Entreprises) en `ibx-chip`, tri réel (récents, prix, ventes, notes),
  compteur de résultats, réinitialisation.
- **`/product/[slug]`** : refonte complète — galerie + miniatures + lightbox,
  prix, note réelle, caractéristiques, livrables protégés, description.

## 4. Données de démonstration (en base)

`npm run seed:demo` → `scripts/seed-demo.mjs`

| Type | Volume |
|---|---|
| Catégories de formations | 6 |
| Formations (+ leçons) | 10 (40 leçons) |
| Boutiques | 3 |
| Produits numériques | 14 |
| Centres de formation | 3 |
| Profils de freelances | 4 (non vérifiés) |
| Bannières | 3 |

Règles respectées :

- **idempotent** (upsert par `slug`/`code`/UUID déterministe) ;
- chaque ligne porte `is_demo = true` ;
- **aucune fausse note**, aucun faux nombre d'apprenants, **aucun KYC forcé** ;
- les profils de démonstration n'obtiennent ni `kyc_verified` ni
  `can_sell_services` : ils ne peuvent donc pas vendre ;
- images : CDN Unsplash (hôte déjà autorisé dans `next.config.mjs`), licence
  libre d'utilisation — remplaçables par des fichiers R2.

### Migration

`prisma/migrations/20261121110000_phase_ui_demo_flag` ajoute `is_demo` à
`users`, `course_categories`, `courses`, `training_centers`, `stores`,
`products`, `freelance_profiles`, `site_banners`. Appliquée et rejouable
(`npm run test:migrations`).

## 5. Suppression depuis l'Admin

- Module **« Données de démonstration »** dans la barre latérale admin.
- `GET /api/admin/demo-data` : compteurs réels.
- `DELETE /api/admin/demo-data` : purge transactionnelle, exige
  `{ confirm: "SUPPRIMER" }`.
- Réservé aux administrateurs généraux / superadministrateurs.
- Ordre de suppression : leçons → formations → produits → boutiques → centres
  → freelances → bannières → catégories.
- Les **comptes utilisateurs ne sont jamais supprimés** par la purge
  (commandes/paiements protégés) ; ils sont comptés et signalés.
- Action journalisée dans `admin_audit_logs`.

## 6. Vérifications

```
npm run typecheck             OK
npm run lint                  0 erreur
npm run build                 OK
npm test                      43/43
npm run test:demo             22/22
npm run test:security         44/44
npm run test:authz            50/50
npm run test:payments         63/63
npm run test:academy          25/25
npm run test:modules          21/21
npm run test:db               21/21
npm run test:migrations       10 migrations, 65 tables / 64 FK
npm run check:boundaries      0 cycle, 0 violation
```

Aucun navigateur automatisé (Playwright/Puppeteer) n'est installé : la
vérification visuelle réelle (clair/sombre, mobile/desktop) n'a pas pu être
effectuée. Les contrôles reposent sur le rendu HTTP, TypeScript, ESLint, le
build et les tests.
