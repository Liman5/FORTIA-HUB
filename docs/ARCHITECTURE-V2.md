# FORTIA HUB — Architecture V2/V3 : API par domaine, cache granulaire, isolation

> Document de suivi des **Phases 1 → 5** du plan `RAPPORT-ARCHITECTURE-APPSTORE.md`, puis
> des chantiers **V3** : *des pages plutôt que des fenêtres* (§17), *façade de store réduite
> à 223 lignes* (§18), *cache & PWA* (§19), *bugs corrigés* (§20).
> Toutes les valeurs ci-dessous proviennent de **mesures réelles** exécutées sur le
> serveur local (`node scripts` de mesure + requêtes HTTP), pas d'estimations.

---

## 1. Nouvelle cartographie des fichiers

```
app/api/
  catalog/route.ts                 ← Académie : liste ALLÉGÉE + pagination + filtres
  catalog/course/[id]/route.ts     ← Détail complet d'UNE formation (chapitres, quiz)
  marketplace/route.ts             ← Boutiques (sans coordonnées de paiement) + produits
  services/route.ts                ← Offres, freelances, entreprises, blog
  site/route.ts                    ← Contenu éditorial, frais, statistiques, annonces
  platform/sync/route.ts           ← (héritage) agrégat public minimal
  platform/admin-sync/route.ts     ← 🔒 Données sensibles (session admin)
  admin/auth/route.ts              ← 🔒 Authentification administrateur (bcrypt ou SHA-256)
  storage/*                        ← 🔒 Stockage R2 (public/privé + droits en base)

lib/services/api/
  http.ts        ← socle commun : fetch + CACHE PAR DOMAINE (TTL) + repli hors ligne
  catalog.ts     ← fetchCatalog() / fetchCourseDetail() / fetchAllCourses()
  marketplace.ts ← fetchMarketplace()
  services.ts    ← fetchServices()
  site.ts        ← fetchSite() / fetchNotifications()

lib/server/
  requireAdmin.ts    ← authentification admin (jeton admin OU rôle `admin`)
  storageAccess.ts   ← règles de lecture/écriture du stockage, vérifiées en base
  json.ts            ← sérialisation JSON tolérante aux `BigInt` Prisma

components/ErrorBoundary.tsx  ← ACTIVÉ (variantes « page » et « section »)
```

## 2. Mesures réelles (serveur local, base de production actuelle)

### 2.1 Charge initiale de l'application

| Source | Poids mesuré |
|---|---:|
| **Avant** : `GET /api/platform/sync` (tout-en-un) | **17,56 Ko** |
| **Après** : `/api/catalog?limit=24` | 4,63 Ko |
| `/api/marketplace?limit=60` | 3,40 Ko |
| `/api/services` | 5,87 Ko |
| `/api/site` | 1,68 Ko |
| **Total après** (4 requêtes parallèles, chacune cachée) | **15,58 Ko** |

### 2.2 Effet de l'allègement de la liste (le gain décisif)

| Mesure | Valeur |
|---|---:|
| Coût d'une carte de formation (métadonnées) | **941 octets** |
| Champs lourds dans la liste (`chapters`, `quiz`, `learningOutcomes`) | **0** ✔ |
| Détail complet chargé **à la demande** (1 formation réelle) | **1,48 Ko** |
| Nombre de formations rapatriées au premier chargement | **24** (au lieu de toutes) |

**Projection à 500 formations** : charger tout le catalogue d'un coup coûterait
≈ **0,45 Mo rien que pour les cartes** (et davantage avec les chapitres/leçons, qui
étaient inclus auparavant). Avec la pagination serveur, le premier chargement reste
sur **une page de 24 ≈ 23 Ko**.

### 2.3 Cache granulaire (Phase 4)

| Type de donnée | Support | TTL |
|---|---|---|
| Catégories, taxonomies | `localStorage` | 24 h |
| Catalogue, boutique, services | `localStorage` | 5 min |
| Détail d'une formation | mémoire | 10 min |
| Notifications, commandes | **mémoire seule** (jamais sur disque) | 30 s |
| Contenu éditorial, frais, statistiques | `localStorage` | 6 h |

Un échec réseau sert automatiquement la dernière version connue (mode hors ligne),
et **un domaine en erreur ne bloque plus les autres**.

## 3. Isolation des pannes (l'objectif « ne plus tout perdre »)

`components/ErrorBoundary.tsx` existait mais **n'était utilisé nulle part** : la
moindre erreur d'affichage blanchissait la page entière.

| Zone protégée | Effet en cas d'erreur |
|---|---|
| `AppShell` → `<main>` (variante `page`) | L'en-tête, la navigation, la barre du bas et les modales **restent fonctionnels** ; un message + bouton « Réactualiser le composant » s'affichent |
| Accueil → sections (variante `section`) | Une section en échec affiche une **carte compacte** ; les autres sections restent visibles |

## 4. Garde-fous vérifiés après ces changements

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | **0 erreur** ✔ |
| `npx next build --turbopack` | **Compiled successfully** ✔ |
| `/`, `/academy`, `/marketplace`, `/admin`, `/instructor`, `/vendor` | **200** ✔ |
| `/member` (visiteur anonyme) | 307 → page de connexion (comportement attendu) ✔ |
| `/api/catalog?limit=24` | 200 · `courses=1 total=1 hasMore=false` ✔ |
| `/api/catalog/course/[id]` | 200 · `chapters=1 quiz=1` ✔ |
| `/api/marketplace`, `/api/services`, `/api/site` | **200** ✔ |
| `/api/platform/admin-sync` sans jeton | **401** ✔ |

## 5. Phase 2 — découpage du store : TERMINÉ

**Méthode** : `AppStoreProvider` reste le **seul point d'entrée public** et expose
toujours **exactement les mêmes membres** ; les 19 fichiers consommateurs n'ont pas
changé d'une ligne. En interne, chaque domaine est fourni par un **module dédié**
(`lib/store/domains/`), appelé par la façade qui lui injecte explicitement ses
dépendances — aucune dépendance cachée.

| Domaine | Fichier | Lignes | Membres |
|---|---|---:|---:|
| Session, compte, KYC, admin | `lib/store/domains/useAuthDomain.ts` | 240 | 22 |
| Académie / catalogue | `lib/store/domains/useCatalogDomain.ts` | 559 | 35 |
| Boutique, services, social | `lib/store/domains/useMarketplaceDomain.ts` | 428 | 50 |
| Panier & paiement | `lib/store/domains/useCommerceDomain.ts` | 150 | 12 |
| Interface (notifications, recherche, lecteur, modales) | `lib/store/domains/useUiDomain.ts` | 77 | 20 |
| **Total isolé** | | **1 454** | **139** |

`lib/store/AppStore.tsx` : **1 896 → 1 041 lignes**. Ce qui reste dans la façade est
volontairement le « transverse » : l'interface des 111 membres, le chargement global
(`refreshPlatformData`), le chargement administrateur (`loadAdminData`, qui écrit dans
plusieurs domaines) et l'assemblage de la valeur exposée.

**Ordre de composition** (imposé par les dépendances, documenté dans le code) :

```
Ui  →  Auth (reçoit les setters d'interface)
    →  Marketplace (reçoit userProfile)
    →  Catalog (reçoit userProfile, setUserProfile, persistUserLearning, refreshPlatformData)
    →  Commerce (reçoit isUserLoggedIn, userProfile, setUserProfile, setMarketplaceOrders)
```

**Procédure d'extraction (reproductible, aucun risque de recopie)** :
1. un script localise chaque déclaration et calcule la **fin exacte** de l'instruction
   (comptage de parenthèses/accolades, chaînes ignorées) ;
2. il **déplace le texte tel quel** vers le module et **détecte automatiquement** les
   références aux autres domaines ;
3. il réécrit la façade (suppression des lignes + appel du domaine + déstructuration)
   en **abandonnant** si une borne ne correspond pas au texte attendu ;
4. `npx tsc --noEmit` doit renvoyer **0 erreur** avant de passer au domaine suivant.

**Gain d'isolation** : un correctif de paiement vit désormais dans un fichier de
150 lignes qui ne touche ni la session, ni le catalogue, ni la boutique. Une erreur
d'exécution reste par ailleurs contenue par les `ErrorBoundary` (variantes *page* et
*section*, section 3).

## 6. Phase 3 — sélecteurs par domaine (infrastructure livrée)

`lib/store/domains/contexts.tsx` expose **5 contextes séparés** + leurs sélecteurs :

| Sélecteur | Domaine | Contenu |
|---|---|---|
| `useUi()` | Interface | notifications, recherche, lecteur, modales |
| `useAuth()` | Session | profil, KYC, admin, frais |
| `useMarketplace()` | Boutique | produits, boutiques, services, blog |
| `useCatalog()` | Académie | formations, catégories, centres, formateurs |
| `useCommerce()` | Panier | panier, paiement |

- Chaque valeur de domaine est **mémoïsée champ par champ** dans la façade : son
  identité ne change que si l'un de ses champs change (setters et actions sont stables).
  Conséquence : un composant abonné à `useCommerce()` **n'est plus re-rendu** quand le
  catalogue ou la session changent.
- Les types sont dérivés du module (`ReturnType<typeof useDomain>`), donc **impossible de
  désynchroniser le type et l'implémentation**.
- `useAppStore()` reste **inchangé et pleinement fonctionnel** : la migration des
  composants est progressive, sans rupture.
- **Premier composant migré** : `components/SearchResultsModal.tsx` (4 sélecteurs au lieu
  des 111 membres du store).

### Migration effectuée (automatisée, vérifiée par TypeScript)

| Résultat | Détail |
|---|---|
| **16 composants migrés** | `HomePage`, `AcademyPage`, `MarketplacePage`, `MemberPage`, `InstructorPage`, `VendorPage`, `VendorStorePage`, `NotificationsPage`, `ServicesPage`, `EnterprisesPage`, `BlogPage`, `AdminPage`, `ShowcasePage`, `LandingPage`, `login`, `register` |
| **2 composants volontairement laissés sur `useAppStore()`** | `AppShell` (racine de composition : il câble les modales de **tous** les domaines et doit donc réagir à tout) et `AdminModernPage` (n'utilise que les chargements transverses `loadAdminData` / `loadAllCourses`) |
| Champs transverses | `platformLoaded`, `refreshPlatformData`, `catalogTotal`, `catalogHasMore`, `loadMoreCourses`, `loadAllCourses`, `ensureCoursesByIds` **restent** dans `useAppStore()` (ils n'appartiennent à aucun domaine) |

La migration a été faite par **script** (lecture de la déstructuration, répartition des
champs par domaine, réécriture ciblée) : les erreurs éventuelles sont remontées par
`tsc`, jamais silencieuses.

## 7. Fiche produit `/product/[slug]` (étape Marketplace)

| Élément | Détail |
|---|---|
| `app/product/[slug]/page.tsx` | Page **rendue côté serveur** (lecture Prisma directe) : partageable, référençable, `generateMetadata` pour le titre/description. Retourne **404** si le produit n'existe pas ou n'est pas publié |
| `components/pages/ProductDetail.tsx` | Partie interactive : ajout au panier (`useCommerce`), achat immédiat, et **téléchargement des livrables** |
| Téléchargement protégé | Chaque clic demande une **URL signée** à `/api/storage/signed-url` : le serveur vérifie que l'utilisateur a réellement acheté le produit (401 si non connecté, 403 si non acheté). Les fichiers restent dans le bucket privé |
| Accès depuis la boutique | Bouton 👁 « Voir la fiche produit » sur chaque carte de `DigitalShop` → `/product/{slug}` |
| Note | La note n'est affichée que si `reviewsCount > 0` (aucune note inventée). Le prix est converti en FCFA à la volée |

Robustesse ajoutée : les slugs réels contiennent `&`, `:` et des accents — la page teste
la forme encodée **et** décodée, et n'interroge la colonne `id` (UUID) que si la valeur y
ressemble (sinon PostgreSQL rejette la comparaison et la requête échoue).

## 8. Fichiers privés : clé stockée, URL signée à la lecture (correction importante)

Le passage au bucket privé a rendu visible une régression : le serveur ne renvoie
**plus d'URL publique** pour un fichier privé, or les vidéos de formation étaient
enregistrées à partir de cette URL → `videoUrl` devenait **vide**.

| Correctif | Fichier | Détail |
|---|---|---|
| La **clé** est conservée | `lib/services/clientUpload.ts` | `uploadCourseVideoDirect` renvoie `publicUrl || key` et envoie désormais `folder: "course-media"` explicitement |
| Résolution à la lecture | `lib/services/clientUpload.ts` | Nouveau `resolveStorageUrl(value)` : demande une **URL signée** au serveur (401/403 si non autorisé) |
| Clé extraite d'une URL | `lib/services/clientUpload.ts` | Nouveau `storageUrlToKey(value)` : accepte une clé **ou** une URL publique/signée (compatibilité des anciennes valeurs en base) |
| Suppression normalisée | `lib/services/clientUpload.ts` | `deleteFileFromR2` extrait la clé avant appel → les anciennes vidéos restent supprimables |
| Lecteur de cours | `components/CoursePlayerModal.tsx` | `signedVideoUrl` : la clé est résolue avant lecture ; le téléchargement hors-ligne utilise cette URL |
| Espace formateur | `components/InstructorDashboard.tsx` | Vérification `HEAD` et libération du quota basées sur l'URL signée |

## 9. Boutique ↔ fiche produit : cohérence des produits non publiés

`GET /api/marketplace` ne filtrait pas les brouillons : les produits non publiés
apparaissaient dans la vitrine alors que leur fiche renvoyait 404.

| Règle appliquée | Comportement |
|---|---|
| Visiteur **anonyme** | Ne voit que les produits **publiés** (endpoint + fiche) |
| Utilisateur **connecté** | Continue de voir l'ensemble (vendeur : ses brouillons dans son espace) |
| Fiche d'un produit **non publié** | Accessible uniquement à son **vendeur** et à l'**administration**, sinon 404 |

## 10. Chaîne des livrables — validée de bout en bout (11/11)

Test automatisé avec **fixture temporaire** (créée puis supprimée — `0` ligne en base,
`0` objet dans R2 à la fin) :

| Contrôle | Résultat |
|---|---|
| Autorisation de téléversement (`product-files`) | **200** ✔ |
| Aucune URL publique renvoyée pour un livrable | `""` ✔ |
| Écriture réelle du fichier dans R2 | **200** ✔ |
| Référence créée en base | ✔ |
| Fiche produit accessible et listant le livrable | **200** ✔ |
| Livrable **verrouillé** pour un visiteur | ✔ |
| Téléchargement anonyme | **401** ✔ |
| URL signée accordée à un administrateur | **200** ✔ |
| Contenu réellement téléchargé | ✔ |

## 11. Hors-ligne (IndexedDB) : désormais complet

Le service `lib/services/offlineVideo.ts` (222 lignes) était déjà complet
(chiffrement **AES-GCM**, stockage IndexedDB, `saveLessonOffline`,
`loadOfflineVideoUrl`, `isLessonOffline`, `deleteLessonOffline`) : il ne fonctionnait
plus faute d'URL signée (section 9).

Ajout : **« Télécharger tout le cours »** dans le lecteur — file d'attente séquentielle
qui résout chaque vidéo en URL signée, ignore les leçons déjà stockées, ne bloque pas
sur une leçon en échec et affiche la progression (`Cours : 3/12…`).

## 12. Test de fumée — `npm run smoke`

`scripts/smoke-test.mjs` vérifie **28 contrôles** en une commande (serveur de dev lancé) :

- pages publiques `/`, `/academy`, `/marketplace`, `/admin`, `/instructor`, `/vendor` → 200 ;
- endpoints par domaine (`/api/catalog`, détail d'une formation, `/api/marketplace`,
  `/api/services`, `/api/site`) ;
- pagination exposée et **liste allégée** (aucun chapitre dans les listes) ;
- **aucune donnée sensible** dans `/api/platform/sync` (8 collections + coordonnées de
  retrait + numéros de compte) ;
- accès protégés refusés à l'anonyme : `admin-sync`, URL signée d'un fichier KYC,
  téléversement → **401**.

À lancer **après chaque modification** : `npm run smoke`. Code de sortie 1 en cas
d'échec (utilisable en intégration continue).

## 13. Notes fictives & migration des vidéos (items 1 → 3)

### 13.1 Note par défaut : plus aucune note inventée

Le schéma imposait `rating = 5.0` par défaut : tout contenu sans avis affichait
« 5,0 » (et l'accueil affichait `{prod.rating || 5.0}` dans la boutique).

| Action | Détail |
|---|---|
| Schéma | `rating` passe de `@default(5.0)` à **`@default(0)`** sur **5 modèles** : `courses`, `products` (×2), `stores`, `freelance_profiles` |
| Base de données | `ALTER TABLE … ALTER COLUMN rating SET DEFAULT 0` appliqué + **2 produits** corrigés (`5.0` → `0` car `reviews_count = 0`) |
| Affichage | `components/DigitalShop.tsx` : la note n'apparaît que si `reviewsCount > 0`, sinon **« Nouveau »** (l'API affichait auparavant un faux 5,0) |

### 13.2 Sécurité de l'upload : le DOSSIER est la seule source de vérité

`/api/storage/upload` déduisait le caractère public de la réponse du **drapeau envoyé
par le navigateur**. Un client pouvait donc recevoir une URL « publique » pour un objet
privé (l'objet restait protégé, mais l'URL était trompeuse). Désormais :

```
isPublic = isPublicFolder(dossier)   // le drapeau client est ignoré
```

Corollaire : les images (`store-images`, `product-images`, `blog-images`, `site-media`)
reçoivent toujours une URL permanente, les dossiers privés jamais.

### 13.3 Migration des vidéos publiques → bucket privé (fait)

Script exécuté une fois, **idempotent**, avec vérification avant toute suppression :

| Résultat | Détail |
|---|---|
| **1 vidéo migrée** | 23 Mo : copie `public → privé`, taille vérifiée, `videoUrl` réécrite en **clé**, original public supprimé |
| **3 références mortes** | Les objets référencés n'existent plus dans **aucun** des deux buckets (données préexistantes) : laissées telles quelles, aucune action destructive |
| Vérification | Clé stockée ✔ · ancienne URL publique **404** ✔ · URL signée refusée à l'anonyme **401** ✔ · accordée à l'admin **200** (signature AWS V4) ✔ · vidéo présente et non vide (23 Mo) ✔ |

### 13.4 Fichiers orphelins restant dans le bucket public (à votre main)

Aucune référence en base — vous avez indiqué vous en charger :

- 2 vidéos : `1788382428412-1001242963.mp4`, `1788712314568-1001283278.mp4`
- 2 PDF : `product-files/new-…/Attestation_FORTIA_FORTIA-2026-CRYP-9482.pdf`

### 13.5 Détail des composants vendeur (vérifiés)

`ProductDeliverableUploader` → dossier `product-files` **privé** ✔ ·
`ProductImageUploader` → `store-images`/`product-images` **public** ✔ ·
`StoreImageUploader` → `store-images` **public** ✔.
Le seul élément manquant pour vos 2 produits est donc **le téléversement effectif des
fichiers** par le vendeur (la chaîne technique est validée de bout en bout, §10).

## 14. En-tête applicatif unique, accueil et Espace Formateur branchés sur `AppShell`

| Élément | Avant | Après |
|---|---|---|
| Routes `/` et `/home` | `HomePage` rendue **hors** `AppShell` : ni en-tête, ni logo, ni navigation basse (l'ancien en-tête de l'accueil était du code mort, jamais monté) | Rendues dans `<AppShell>`, comme toutes les autres pages : **en-tête unique** (icône officielle `/pwa-192x192.png`, « FORTIA **HUB** », tagline « — LEARN. BUILD. SUCCEED. — »), recherche, panier, notifications, menu, **barre de navigation basse** et modales globales |
| Route `/instructor` | Dernière page métier **hors** `AppShell` : aucun en-tête, aucun logo, aucune navigation | Branchée sur `<AppShell>` |
| `HomeBottomNav` | Stub de navigation locale **invalide** (`return ( {/* … */} )` → `TS2786`) : plus aucune navigation ne s'affichait | Supprimé — la navigation basse est fournie **une seule fois** par `AppShell` |
| Chrome dupliqué de l'accueil | `Sidebar` + `UserAuthModal` + état `isSidebarOpen`, en-tête et barre de recherche locaux, tagline « APPRENDRE · CRÉER · RÉUSSIR » (code mort) | Supprimés : tout provient de `AppShell`, en une seule instance |
| `InstructorDashboard` | `center` (dérivé de `providedCenter`/`userId`) était lu **avant sa déclaration** par `useState`/`useEffect` (`TS2448`/`TS2454`) | Bloc `ownedCourses`/`center` déplacé **avant** les hooks qui le lisent ; `as any` retirés (typé `TrainingCenter` ou `null`) |

**Garde-fous vérifiés après ces changements**

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | **0 erreur** ✔ |
| `npx next build --turbopack` | **Compiled successfully** (12,8 s) ✔ |
| `npm run smoke` | **32 contrôles : TOUT EST OK** ✔ |
| En-tête + logo dans le HTML servi | `/`, `/home`, `/academy`, `/marketplace`, `/vendor`, `/instructor`, `/admin` → **1 bloc logo + tagline** ✔ |
| Erreurs d'hydratation / console serveur | **aucune nouvelle** ✔ |

## 15. Connexion & inscription : des PAGES, plus aucune fenêtre superposée

Le même formulaire existait **deux fois** : dans les pages `/login` et `/register`
(intégrales, avec 2FA et OTP) **et** dans une fenêtre surgissante `UserAuthModal`
ouverte par 8 pages. La fenêtre a été supprimée au profit des pages.

| Élément | Avant | Après |
|---|---|---|
| Boutons « Se connecter / S'inscrire » | ouvraient `UserAuthModal` (état du store + 8 pages) | **navigation** vers `/login` et `/register` (`router.push`) |
| `components/UserAuthModal.tsx` | 2ᵉ implémentation du formulaire (orpheline après migration) | **fichier supprimé** |
| État du store | `openAuthModal`, `setOpenAuthModal`, `authMode`, `setAuthMode` (contrat, domaine « interface », `useAuthDomain`, `AppStore`) | **entièrement retirés** — aucun code orphelin |
| Props mortes | `onOpenAuthModal` déclaré mais jamais utilisé dans `Navbar` et `PlatformShowcaseView` | **retirées** (interface + passage d'appel) |
| Pages converties à la navigation | — | `AppShell`, `EnterprisesPage`, `InstructorPage`, `LandingPage`, `MarketplacePage`, `MemberPage`, `NotificationsPage`, `ShowcasePage`, `VendorPage` |

**Bénéfices** : une seule implémentation du formulaire ; URL propre et partageable
(`/login?next=/member`) ; le bouton « Retour » du navigateur fonctionne ; plus de
chargement inutile de la fenêtre sur toutes les pages.

## 16. Logo de l'en-tête : l'icône seule, sans fond

| Élément | Avant | Après |
|---|---|---|
| Textes du logo dans l'app header | « FORTIA HUB » + « — LEARN. BUILD. SUCCEED. — » | **supprimés** (`variant="compact"`) — seul le logo reste |
| Fond du logo | mode clair : pavé bleu `#011d46` + ombre (`app/globals.css`) | **supprimé** : `background transparent` + `box-shadow: none` dans les deux thèmes |
| Icône affichée | `pwa-192x192.png` (29,9 Ko) | `pwa-96x96.png` (**8,7 Ko**, −71 %) |

Le mot-symbole complet reste disponible là où il est légitime (nav de la landing,
en-tête admin, écran de chargement) via `<Logo variant="light" />` : un seul
paramètre suffit à le rétablir dans l'en-tête si besoin.

## 17. Panier & paiement : des étapes de page, plus aucune fenêtre superposée

Le panier, le paiement et l'authentification étaient présentés en **fenêtres
superposées**. Ce sont désormais des **pages** (ou des étapes de page) : URL propre,
bouton « Retour » du navigateur fonctionnel, lien partageable — et surtout **le code
correspondant n'est plus chargé sur toutes les pages**.

| Élément | Avant | Après |
|---|---|---|
| Panier | fenêtre `CheckoutModal` (**580 lignes**) ouverte par le bouton panier | **page `/cart`** (`app/cart/page.tsx` 14 l. + `components/pages/CartPage.tsx` 352 l.) |
| Paiement | fenêtre `PaymentGatewayModal` (**420 lignes**) montée dans `AppShell` → chargée sur **toutes** les pages | **étape 2 de `/cart`** via `components/CheckoutStep.tsx` (**401 lignes, réutilisable**) |
| Connexion / inscription | fenêtre `UserAuthModal` (**794 lignes**) + état `openAuthModal`/`authMode` du store | **pages `/login` et `/register`** (déjà complètes : OTP, 2FA) |
| Achat direct (marketplace, fiche produit, boutique vendeur) | ouvrait la fenêtre de paiement | **ajout au panier puis `/cart?payer=1`** — un seul chemin d'achat |
| Espace formateur (achat de stockage vidéo) | ouvrait la fenêtre de paiement | `CheckoutStep` **à la place du tableau de bord** ; le stockage est activé après paiement |

**Tunnel du panier** : `1 · Panier` → `2 · Paiement` → `3 · Accès immédiat`. L'indicateur
d'étapes est piloté par l'état réel du tunnel (il n'est plus décoratif), et
« Passer au paiement » puis « Retour au panier » naviguent dans ce tunnel.

**Bilan de code** : les trois fenêtres supprimées totalisaient **1 794 lignes**
(`CheckoutModal` 580 + `PaymentGatewayModal` 420 + `UserAuthModal` 794) ; elles sont
remplacées par **767 lignes** de pages, dont un `CheckoutStep` autonome — une future route
`/checkout` n'aurait qu'à le rendre.

**Fenêtres restantes (assumées, isolées à leur page)** : KYC, candidature vendeur, accès
administrateur (2FA), lecteur de cours — basculables en pages/étapes avec la même méthode.

## 18. Store V3 : une façade de 223 lignes, six domaines autonomes

`lib/store/AppStore.tsx` est passé de **953 à 223 lignes (−77 %)** : il n'instancie plus
que les domaines, assemble la valeur exposée et fournit les contextes.

| Fichier | Lignes | Rôle |
|---|---:|---|
| `lib/store/AppStore.tsx` | **223** | façade : instanciation des domaines + assemblage + contextes |
| `lib/store/storeTypes.ts` | 186 | contrat public de `useAppStore()` |
| `domains/useUiDomain.ts` | 95 | notifications, lecteur de cours, recherche, modales d'interface |
| `domains/useAuthDomain.ts` | 290 | session (miroir local + vérification serveur), profil, KYC, admin |
| `domains/useCommerceDomain.ts` | 181 | panier (persisté) + validation de paiement |
| `domains/useMarketplaceDomain.ts` | 421 | boutique, produits, commandes, retraits, support, social |
| `domains/useCatalogDomain.ts` | 550 | académie : catalogue, catégories, centres, commissions, progression |
| `domains/usePlatformDomain.ts` | **230** *(nouveau)* | chargement public, collections admin, purge de démarrage |
| `domains/contexts.tsx` | 63 | un contexte + un sélecteur par domaine |

Ce qui a été **sorti de la façade** vers les domaines :

| Logique | Destination |
|---|---|
| Chargement des données publiques (`refreshPlatformData`), purge des données de démonstration, collections admin (`loadAdminData`) | `usePlatformDomain` |
| Synchronisation de session JWT + données personnelles (`/api/me`) | `useAuthDomain` |
| Détail complet d'une formation allégée (catalogue → lecteur) | `useUiDomain` |
| Centre de formation du formateur connecté | `useCatalogDomain` |

**Assemblage sans recopie** : la valeur exposée est l'**étalement des domaines**
(`...ui`, `...auth`, `...commerce`, `...marketplace`, `...catalog`) complété par 7 champs
transverses — la liste de ~180 champs n'existe plus. Chaque domaine retourne un **objet
mémoïsé** (dépendances = ses états + ses dépendances injectées) : les re-rendus restent
ciblés par domaine, sans aucune mémoïsation dans la façade.

**Dépendance circulaire évitée** : le catalogue a besoin de `refreshPlatformData`, qui
appartient au domaine « plateforme » instancié après lui → indirection stable
(`refreshPlatformRef` + `refreshPlatform()`), branchée dans un `useEffect`.

**Nettoyage** : 99 noms de déstructuration devenus inutiles, tous les commentaires
orphelins, et 2 fichiers aux fins de ligne mixtes assainis.

## 19. Cache & PWA : plus jamais de version périmée

Le service worker servait les fichiers statiques en « stale-while-revalidate » : en
développement, il continuait à servir d'**anciens chunks JavaScript** — les modifications
du code ne s'affichaient plus, **même après un rechargement**.

| Problème | Correctif |
|---|---|
| Interface figée sur une ancienne version en développement | `app/registerServiceWorker.ts` : en dev, **aucun** service worker — désinscription des workers existants, purge des caches de l'application, **une seule** recharge (garde `sessionStorage`, aucune boucle possible) |
| Le navigateur pouvait conserver un ancien worker | `next.config.mjs` : `Cache-Control: no-cache, no-store, must-revalidate` sur `/sw.js`, `no-cache` sur `/manifest.json` |
| Anciens caches persistants chez les clients installés | `public/sw.js` : version **v3 → v4** (purge des anciens caches à l'activation) et retrait de `/official-logo.png` (**1 Mo**) du pré-cache d'installation |
| Favicon lourd (1 Mo chargé pour l'onglet) | `public/favicon.svg` pointe vers `pwa-128x128.png` (**13,5 Ko**, −98,7 %) |
| Logo d'en-tête lourd | `pwa-192x192.png` (29,9 Ko) → **`pwa-96x96.png`** (8,7 Ko, −71 %), affiché à 28/32/44 px (3× de densité) |
| Raccourcis PWA inopérants | `manifest.json` : `/?tab=…` (paramètre ignoré par l'app) → **vraies routes** `/academy`, `/marketplace`, `/services`, `/member` |

**Mesure avant/après sur des profils navigateur réels** : avant correctif, le profil
contenait **1 enregistrement de service worker + 44 fichiers** dans `CacheStorage`
(`fortia-hub-cache-v3`) ; après correctif, en développement : **0 worker et 0 cache
applicatif**.

## 20. Bugs corrigés (symptôme → cause réelle → correctif)

| Symptôme | Cause réelle | Correctif |
|---|---|---|
| « page not found » en cliquant sur le panier | le bouton pointait vers `/cart`, route **inexistante** (le panier n'était qu'une fenêtre) | page `/cart` créée ; le bouton y navigue ; les raccourcis PWA pointent vers de vraies routes |
| Les modifications du code n'apparaissaient pas | service worker servant d'anciens fichiers en développement | service worker désactivé en dev + purge des caches (§19) |
| Panier perdu au rechargement | sauvegarde déclenchée par une `ref` : en mode strict (dev) les effets passent deux fois → le panier restauré était écrasé par une liste vide | verrou par **état** (`cartHydrated`), sauvegarde après restauration uniquement |
| Page panier illisible en mode clair | carte en **dégradé** : les règles du thème clair ne convertissent pas ce fond alors que le texte passait en sombre | retour au vocabulaire de classes géré par le thème (`bg-[#011D46]`, `text-white`, `text-slate-*`) |
| `Hydration failed` sur `/cart?payer=1` | `useSearchParams()` lu pendant le rendu d'une page pré-rendue | lecture de l'URL **après montage** (`window.location.search`), `Suspense` inutile retiré |
| Vert « pas vert » / boutons inertes sur le panier | `emerald-300` illisible sur fond clair ; pastilles de paiement stylées comme des boutons sans action | vert `emerald-500` ; pastilles converties en **texte** avec mention explicite |
| Espace formateur : `TS2448` / `TS2454` | `center` (dérivé du centre ou du compte) lu **avant sa déclaration** par `useState`/`useEffect` | calcul déplacé avant les hooks ; `as any` retirés |
| Accueil affiché sans en-tête ni navigation | `/`, `/home` et `/instructor` rendues **hors `AppShell`** | branchées sur `AppShell` (en-tête, barre basse, modales globales) |

## 21. Garde-fous vérifiés (mesures)

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | **0 erreur** |
| `npx next build --turbopack` | **Compiled successfully** (10,5 s → 15,3 s selon l'état du cache) |
| `npm run smoke` | **32 contrôles : TOUT EST OK** |
| Pages servies | `/` · `/cart` · `/cart?payer=1` · `/academy` · `/marketplace` · `/vendor` · `/member` · `/notifications` · `/showcase` · `/instructor` · `/admin` → **200** |
| Erreurs d'hydratation | **0 nouvelle** (comptage du log `next-development.log` : 12 avant = 12 après le correctif) |
| Code orphelin | **aucune référence** restante à `UserAuthModal`, `CheckoutModal`, `PaymentGatewayModal`, `isCartOpen`, `openAuthModal`, `authMode` |
| Service worker en développement | **0 worker, 0 cache applicatif** (profils navigateur vérifiés) |
| Fichiers temporaires / de test | **aucun** (scripts et captures supprimés après usage) |

## 22. Durcissement avant production (stockage, débit, formulaires)

### 22.1 Job de maintenance `/api/cron/maintenance`

| Élément | Détail |
|---|---|
| Déclenchement | **Vercel Cron** quotidien (`vercel.json`, 03:00 UTC) ou appel manuel |
| Sécurité | `Authorization: Bearer <CRON_SECRET>` (ou `x-cron-secret`) ; sans secret configuré → **503** |
| Mode | **Simulation par défaut** ; suppression uniquement avec `?apply=1` |
| Âge minimal | **24 h** imposées (`minAgeHours` borné entre 24 h et 90 jours) |
| Stockage | `storage_objects` (inventaire écrit à chaque présignature) comparé à **toutes les références en base**, colonnes découvertes via `information_schema` → aucun fichier référencé n'est supprimé |
| Débit | purge des `rate_limit_counters` expirés depuis plus de 24 h |

```bash
# Simulation (aucune suppression)
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://fortia-hub.com/api/cron/maintenance

# Application réelle
curl -H "Authorization: Bearer $CRON_SECRET" \
     "https://fortia-hub.com/api/cron/maintenance?apply=1"
```

Mesures locales : sans secret **401**, avec secret **200**, simulation `orphanCount: 1` détecté sans suppression (`deletedCount: 0`), **45 colonnes** de référence analysées.

### 22.2 Limitation de débit partagée

`rateLimitPersistent()` écrit dans `rate_limit_counters` (une ligne par IP + action), avec repli automatique sur le compteur mémoire si la base est indisponible. Corrige une faiblesse du serverless : chaque instance avait jusqu'ici son propre compteur.

### 22.3 Formulaires

- **KYC** : textes simplifiés (tutoiement des étapes : « Vous êtes… », « Vos informations personnelles », « Vos papiers et vos photos »), et **appareil photo autorisé** (`capture="environment"` pour les documents, `capture="user"` pour la photo de soi).
- **Pays** : référentiel unique `lib/data/countries.ts` (**198 pays**, noms FR + indicatif) utilisé par `CountrySelect` (KYC, profil prestataire).
- **Défilement horizontal** : les modales ne créent plus de barre horizontale (`.fixed.inset-0 > div { overflow-x: hidden }`).

## 23. Reste à faire (prochaines étapes)

| Étape | Contenu |
|---|---|
| ~~**Résidu de façade**~~ | **FAIT (§18)** : `AppStore.tsx` = **223 lignes** (objectif < 250 atteint) ; valeur composée par **étalement des domaines**, chaque domaine retournant un objet mémoïsé |
| ~~**Modales volumineuses**~~ | **FAIT (§17)** : panier, paiement et authentification sont des **pages** ; `CheckoutModal`, `PaymentGatewayModal` et `UserAuthModal` **supprimés** (−1 794 lignes) |
| **Filtres serveur du catalogue** | Passer catégorie/niveau/prix/tri du `CourseCatalog` en requêtes serveur (`codes`, `view`, `q` sont **déjà acceptés** par `/api/catalog`) |
| **Fenêtres restantes** | Décider *page* ou *fenêtre* pour KYC, candidature vendeur, accès administrateur (2FA) et lecteur de cours — même méthode qu'au §17 |
| **Références mortes de leçons** | 3 leçons pointent vers des vidéos inexistantes : les vider ou re-téléverser les vidéos |
| **Fichiers produits** | Téléverser les livrables des 2 produits depuis l'espace vendeur |
| **Domaine public R2** | Attacher un domaine personnalisé au bucket public puis désactiver le sous-domaine `r2.dev` (réduit la surface publique) |
| **Fins de ligne** | Les fichiers historiques mélangent LF et CRLF (git normalise à la copie de travail) : figer un `.gitattributes` si vous voulez une règle unique |

