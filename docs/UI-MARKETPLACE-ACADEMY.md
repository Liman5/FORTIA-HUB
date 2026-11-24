# Étape UI/UX — Refinement Marketplace et Académie

## 1. Marketplace — causes réelles et corrections

| Problème constaté | Cause dans le code | Correction |
|---|---|---|
| Header mal structuré, indicateurs collés | les 3 sections étaient de simples `ibx-chip` sans compteur ni séparation | en-tête compact + 3 **cartes-indicateurs** distinctes (icône, libellé, compteur réel), séparées par la grille |
| Deux barres de recherche | l'input `#shop-search` partageait le même état que la barre globale, elle-même visible dès `lg` | recherche **contextuelle uniquement < `lg`** ; sur desktop, l'en-tête global reste la seule saisie et le filtre actif devient une puce retirable |
| Bande de boutiques trop grande | `animate-marquee` + `[...stores, ...stores, ...stores]` (triple duplication), cartes `min-w-[190px]` avec texte long | **carrousel compact** (168 px, logo 32 px, nom tronqué, ventes réelles), pas de duplication, défilement horizontal natif + « Toutes les boutiques » |
| Catégories insuffisantes | filtres basés sur l'enum `product_type` | **chips de domaines réels** (`buildProductCategories`), compteur par domaine, « Tous » pour revenir |
| Outils dispersés | recherche en haut, filtres au milieu, tri en bas | **une seule barre d'outils** en 3 lignes : recherche / domaines / (format, boutique, tri, réinitialiser) |
| Cartes plates et incohérentes | classes sombres codées en dur, image 128 px | cartes `ibx-card-flat` + texture, image 144→176 px, prix FCFA principal, hover sobre |
| Image produit non cliquable | le bouton de zoom héritait d'un `opacity: 0` et passait sous l'overlay | bouton `.ibx-media-zoom` forcé visible, `z-index: 20`, `stopPropagation` ; galerie `bannerImage` + `image` dans `IbxLightbox` |
| Prix inversés | `$` affiché en premier, FCFA en mention | `formatPricePair` : **FCFA principal**, USD secondaire seulement si activé |

Boutique et tri restent pilotés par l'URL (`?type=`, `?categorie=`).

## 2. Académie — corrections

- en-tête conservé mais **barre de catégories réelles** ajoutée (familles + catégories en base, compteurs réels, « Toutes ») ;
- recherche du catalogue **masquée sur desktop** (barre globale) et remplacée par une puce de filtre ; conservée < `lg` ;
- boutons « Filtres » / « Réinitialiser » et badge de compteur alignés sur le design system ;
- section catalogue : plus de fond codé en dur, `ibx-container`, aligné sur l'en-tête ;
- **cart → FCFA principal** (`formatPricePair`) puis USD facultatif ;
- image de carte 160 → 176 px, badges catégorie/niveau tokenisés (lisibles en clair comme en sombre), texture dorée discrète.

## 3. Monnaie

Aucune valeur modifiée en base. `resolveMoneyConfig` lit `site_content.fcfa_rate`
et `show_usd_secondary` (Admin → Contenu du site). Sans activation, **un seul prix
FCFA** est affiché.

## 4. Vérifications

```
npm run typecheck        OK
npm run lint             0 erreur (626 avertissements historiques)
npm run build            OK
npm test                 52/52
npm run test:authz       50/50
npm run test:security    44/44
npm run test:demo        22/22
```

Contrôles HTTP réels : `/marketplace`, `/marketplace?categorie=intelligence-artificielle`,
`/academy`, `/product/demo-guide-freelancing` → **200**. Le HTML de la fiche produit
rend `7 200 FCFA` en prix principal (original barré `10 800 FCFA`), aucun `$`.

**Vérification visuelle : non effectuée** — aucun navigateur automatisé n'est installé.

## 5. Limites connues

- Les cartes de produits sont rendues côté client (données du store) : leur rendu
  n'est donc pas présent dans le HTML initial.
- L'ancien aperçu modal du produit a été remplacé par la navigation directe vers
  `/product/[slug]` (le titre est désormais un lien réel) ; « Ajouter au panier »
  et « Acheter » restent sur la carte.
