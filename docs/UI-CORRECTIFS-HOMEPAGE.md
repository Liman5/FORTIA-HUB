# Étape UI/UX — Correctifs homepage, bannière, textures, catégories et monnaie

## 1. Carrousel de la bannière principale — corrigé

**Cause exacte** : dans `HeroBanner`, la liste des bannières actives finissait par
`.slice(0, 1)` — une seule bannière était conservée, donc aucune rotation, même
avec plusieurs bannières actives en base.

Corrections :

- suppression du `slice(0, 1)` : **toutes les bannières actives** sont utilisées,
  triées par `displayOrder` ;
- défilement automatique conservé, avec la durée d'affichage propre à chaque
  bannière (`intervalMs`) ;
- **flèches** précédent / suivant sur desktop (visibles au survol et au focus
  clavier) ;
- **balayage tactile** (swipe) sur mobile ;
- puces de navigation conservées (`aria-current`) ;
- `prefers-reduced-motion` respecté : plus de rotation automatique ;
- si la plateforme est chargée et qu'aucune bannière n'existe : la section
  disparaît (plus de squelette « chargement » infini, aucune image factice).

## 2. Textures et profondeur des cartes

Le minimalisme ne signifie pas platitude. Ajouts mesurés, via tokens :

| Élément | Traitement |
|---|---|
| Carte formation | dégradé doré très doux en diagonale + ombre légère au survol |
| Carte produit (accueil) | halo d'information discret (bleu) en coin |
| Tuiles de ressources | lavis de la couleur de l'icône (12 %) |
| Catégories de produits | filet doré linéaire (7 %) |
| Sélection numérique | bandeau d'en-tête teinté |

Aucune bordure épaisse, aucune ombre lourde, aucune couleur saturée.

## 3. Images

- conteneurs homogènes (`ibx-media`, `object-fit: cover`) : plus d'étirement ;
- carte produit d'accueil : hauteur d'image portée de 112 → 128 px ;
- carte boutique : hauteur 144 → 176 px sur desktop ;
- mini-cartes de la Sélection numérique : 96 → 112 px ;
- clic sur l'image → `IbxLightbox` (composant unique, pas de seconde
  implémentation) ; clic sur le titre / « Voir » → fiche produit.

## 4. Catégories de produits élargies

**Constat** : les catégories de produits étaient déduites de l'enum technique
`product_type` (ebook, canva_template…). Les domaines proposés aux vendeurs
(IA, Business, Marketing, Design…) n'apparaissaient donc jamais, alors que le
formulaire vendeur les propose déjà.

Corrections :

- nouveau module `lib/data/productCategories.ts` : les catégories sont
  construites **à partir des données réelles** (`typeLabel` = domaine choisi
  par le vendeur), avec comptage réel des produits publiés ;
- `matchesProductCategory()` filtre sur le domaine **ou** sur le type technique ;
- homepage : section « Explorer les produits numériques par catégorie »
  reconstruite sur ces catégories, lien `?categorie=<slug>` ;
- marketplace : nouveau paramètre d'URL `categorie`, filtre réel dans
  `DigitalShop`, puce « Catégorie : … » retirable, compteur de résultats ;
- `/marketplace/categories` : domaines réels + catégories de référence ;
- ressources : restent classées par **format** (`?type=`), ce qui est cohérent.

Séparation maintenue : `course` et `service` sont exclus des produits, et les
formations ne sont jamais listées comme produits.

## 5. Monnaie — FCFA principal, USD facultatif

- `lib/data/currency.ts` : `formatFcfa`, `formatPricePair`, `resolveMoneyConfig`.
- **FCFA toujours principal** ; un seul prix affiché par défaut.
- Équivalent USD **désactivé par défaut**, affiché en texte discret
  (« ≈ 25,00 USD ») uniquement si l'admin l'active.
- Aucun taux inventé : sans taux configuré, `600` (valeur historique) est
  utilisé ; un taux invalide retombe sur cette valeur.
- **Aucune valeur en base n'est convertie** : seuls l'affichage et la mise en
  forme changent. Paiements, entitlements et passerelles ne sont pas touchés.

### Configuration persistante

- colonnes `site_content.fcfa_rate` (défaut 600) et
  `site_content.show_usd_secondary` (défaut false) ;
- action d'écriture `save-currency-config` (validation Zod, réservée au domaine
  admin `content`) ;
- interface : carte « Affichage des prix » dans Admin → Contenu du site (CMS),
  avec aperçu réel et enregistrement indépendant.

## 6. Ressources numériques défilantes

La grille fixe devient un **carrousel horizontal** (`CarouselRow` existant) :
défilement fluide, flèches sur desktop, balayage sur mobile, aucun défilement
automatique, icônes harmonisées (24 px dans un conteneur de 36 px).

## 7. Lisibilité du mode clair

La section des catégories produits utilisait `bg-white` + `dark:*` + `text-slate-*`
sans tokens → texte hérité du thème sombre en mode clair. Elle repose désormais
entièrement sur `ibx-card-flat` / `ibx-h3` / `ibx-tiny` / `var(--ibx-*)`.
Idem pour les cartes formation, centre, produit, ressources et l'en-tête de
section (`SectionHeader`).

## 8. Responsive

- bannière : hauteurs 160 / 256 / 320 px, swipe mobile, flèches masquées sur
  mobile (les puces restent) ;
- catégories de produits : 1 → 2 → 3 colonnes ;
- ressources : cartes 150 → 168 px, défilement horizontal ;
- cartes produits/formations : largeurs fixes avec `snap-start` (pas de
  débordement, pas d'écrasement) ;
- prix : bloc `min-w-0` pour éviter tout débordement avec l'équivalent USD.

## 9. Vérifications

```
npm run typecheck        OK
npm run lint             0 erreur (627 avertissements historiques)
npm run build            OK
npm test                 52/52
npm run test:authz       50/50  (55 politiques)
npm run test:security    44/44
npm run test:demo        22/22
```

Contrôles HTTP réels : `/`, `/marketplace?categorie=intelligence-artificielle`,
`/marketplace/categories`, `/product/demo-guide-freelancing` → **200** ;
`/api/site` expose `fcfaRate` et `showUsdSecondary` ; `save-currency-config`
anonyme → **401**.

**Vérification visuelle : non effectuée** — aucun navigateur automatisé
(Playwright/Puppeteer/Cypress) n'est installé. Les contrôles portent sur le
rendu HTML, TypeScript, ESLint, le build, les tests et les API.
