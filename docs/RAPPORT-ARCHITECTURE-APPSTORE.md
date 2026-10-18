# FORTIA HUB — Rapport d'architecture : `AppStore` et scalabilité

> **Document de référence** — audit du magasin de données global (`lib/store/AppStore.tsx`),
> de l'API plateforme (`/api/platform/*`) et du plan de migration en 5 phases.
>
> Mesures effectuées directement sur le code et sur la base réelle (Supabase) le 11/11/2026.
> Aucune donnée n'a été modifiée pour produire ce rapport.

---

## 1. Résumé exécutif

### Verdict

| Question | Réponse honnête |
|---|---|
| Est-ce que ça fonctionne aujourd'hui ? | **Oui.** Payload mesuré : **35 Ko** pour 1 formation et 2 produits. Aucune lenteur perceptible. |
| Est-ce que c'est bien pour scaler ? | **Non.** 3 limites structurelles : un endpoint monolithique, un contexte React unique, une UI et des données mélangées. À 500 formations / 200 vendeurs, ça ne tiendra pas. |
| Est-ce qu'il faut tout réécrire ? | **Non.** La structure d'écriture (`apiWritePlatform` → `/api/platform/write` → Prisma) est **saine et bien conçue**. C'est le **circuit de lecture** qu'il faut découper. |
| Y a-t-il quelque chose d'urgent ? | **Oui, un problème de sécurité** : `GET /api/platform/sync` ne vérifie **aucun droit d'accès** et renvoie les emails/téléphones des acheteurs, les coordonnées de paiement des vendeurs, les dossiers KYC et les messages de support à **n'importe quel visiteur**. Voir § 5. |

### Les 3 actions prioritaires, dans cet ordre

1. **Sécuriser `/api/platform/sync`** (Phase 0) — arrêter l'exposition des données personnelles.
2. **Découper l'API de lecture par domaine + pagination** (Phase 1) — règle 80 % du problème de scalabilité.
3. **Découper le store en 5 sous-stores derrière une façade** (Phase 2) — sans toucher aux 19 fichiers consommateurs.

### Chiffres clés

| Indicateur | Valeur mesurée | Commentaire |
|---|---|---|
| `lib/store/AppStore.tsx` | **1 710 lignes** | 1 fichier, 1 contexte |
| Membres exposés par le contexte | **111** | dont **109 réellement consommés**, 2 morts |
| Actions (`useCallback`) | **55** | toutes dans le même fichier |
| États (`useState`) | **10** | granularité trop grossière |
| Fichiers consommateurs | **19** | 20 appels à `useAppStore()` |
| Endpoints d'écriture | **41 actions** dans 1 route (`write/route.ts`, 1 719 lignes) | à scinder par domaine aussi |
| Payload `GET /api/platform/sync` | **35,1 Ko** aujourd'hui | croissance linéaire non maîtrisée |
| Cache | 1 seul blob `localStorage` (`fortia_platform_cache_v1`), TTL **60 s** | tout-ou-rien |

---

## 2. Le flux de données actuel

```
                    ┌──────────────────────────────────────────────┐
   Supabase (Postgres)  ◄── Prisma ──►  Next.js API Routes         │
                    └──────────────────────────────────────────────┘
                                   ▲                ▲
              LECTURE              │                │           ÉCRITURE
   GET  /api/platform/sync ────────┘                └──── POST /api/platform/write
   (TOTALITÉ des tables, sans auth)                 (41 actions, tout le métier)
                                   │                │
                                   ▼                ▼
                    ┌──────────────────────────────────────────────┐
                    │  AppStore (React Context, 1 710 lignes)      │
                    │  • 10 useState  • 55 actions  • 111 membres  │
                    │  • cache localStorage unique (TTL 60 s)      │
                    └──────────────────────────────────────────────┘
                                   │
                    useAppStore()  ▼  (19 fichiers / 20 appels)
        AppShell(53) · AdminModernPage(49) · AdminPage(41) · InstructorPage(24)
        MarketplacePage(21) · MemberPage(21) · VendorPage(14) · HomePage(13) …
```

**Conséquence directe** : tout changement d'état (ouvrir le panier, une modale, marquer une
notification lue) **re-rend tous les composants abonnés** au contexte unique, sur toute la page.

---

## 3. Cartographie des fichiers concernés

### 3.1 Cœur du store

| Fichier | Lignes | Rôle | État |
|---|---:|---|---|
| `lib/store/AppStore.tsx` | **1 710** | Contexte global : données + écritures + session + UI | À découper (Phase 2) |
| `lib/store/ThemeProvider.tsx` | 58 | Thème clair/sombre | ✅ Assaini (lecture `localStorage` après montage) |
| `lib/services/platformApi.ts` | 142 | Fetch + cache « stale-while-revalidate » | À découper par domaine (Phase 1) |
| `lib/services/platformWrite.ts` | 105 | Client d'écriture + types des 41 actions | À découper par domaine (Phase 1) |
| `lib/data/courseCategories.ts` | ~350 | Source unique des catégories + filtres + vues | ✅ Créé, testé |

### 3.2 API

| Fichier | Lignes | Rôle | État |
|---|---:|---|---|
| `app/api/platform/sync/route.ts` | **504** | `GET` renvoie **toutes** les tables — **sans contrôle d'accès** | 🔴 Phase 0 + 1 |
| `app/api/platform/write/route.ts` | **1 719** | 41 actions d'écriture Prisma (aucune vérification de rôle) | 🟠 Phase 1 (scinder) |
| `app/api/me/route.ts` | 64 | Données **personnelles isolées** de l'utilisateur connecté | ✅ Bon modèle à généraliser |
| `app/api/auth/route.ts` (+ `session`, `forgot-password`, `reset-password`) | 692 | Authentification, OTP, session | ✅ Référence (cookies serveur) |
| `app/api/admin/auth/route.ts` | 144 | Authentification administrateur | ✅ À réutiliser en Phase 0 |
| `app/api/storage/*` (4 routes) | — | Upload / presign / URL signée / delete (Cloudflare R2) | ✅ Hors périmètre |

### 3.3 Layout et pages (consommateurs du store)

| Fichier | Lignes | Champs consommés | Rôle |
|---|---:|---:|---|
| `components/layout/AppShell.tsx` | 431 | **53** | Layout + toutes les modales globales |
| `components/admin/AdminModernPage.tsx` | 309 | **49** | Espace d'administration |
| `components/pages/AdminPage.tsx` | 117 | **41** | Route `/admin` |
| `components/pages/InstructorPage.tsx` | 127 | **24** | Espace formateur |
| `components/pages/MarketplacePage.tsx` | 234 | **21** | Boutique (produits / freelance / entreprises) |
| `components/pages/MemberPage.tsx` | 186 | **21** | Espace membre |
| `components/MemberDashboard.tsx` | **1 442** | — | Tableau de bord membre (données par props) |
| `components/AdminDashboard.tsx` | **2 313** | — | Tableau de bord admin historique (par props) |
| `components/pages/VendorPage.tsx` | 127 | 14 | Espace vendeur |
| `components/pages/HomePage.tsx` | **1 001** | 13 | Accueil |
| `components/CourseCatalog.tsx` | 610 | — | Catalogue Académie (par props) |
| `components/DigitalShop.tsx` | 462 | — | Boutique digitale (par props) |
| 9 autres fichiers | — | 1 → 9 | Notifications, blog, services, login, register… |

> **Bonne nouvelle structurelle** : les gros composants (`AdminDashboard`, `MemberDashboard`,
> `CourseCatalog`, `DigitalShop`) reçoivent déjà leurs données **par props**, pas par le store.
> Seules 19 « portes d'entrée » (pages + AppShell) touchent le contexte → la façade de
> migration n'a que **19 fichiers** à laisser intacts, ce qui rend la Phase 2 sûre.

---

## 4. Mesures réelles (base de production)

### 4.1 Poids de `GET /api/platform/sync` — total **35,1 Ko** aujourd'hui

| Table renvoyée | Poids | Nature | Devrait être… |
|---|---:|---|---|
| `marketplaceOrders` | 5,9 Ko | 🔴 **Admin** (nom / email / téléphone acheteurs) | Admin + vendeur concerné |
| `postPurchaseSupport` | 5,4 Ko | 🔴 **Admin** (messages clients) | Admin uniquement |
| `servicePackages` | 3,1 Ko | Public | Public + cache |
| `instructorStoragePurchases` | 3,0 Ko | 🔴 **Admin / formateur** | Rôle concerné |
| `products` | 2,5 Ko | Public | Public **paginé** |
| `courses` | 2,4 Ko | Public | Public **paginé, sans chapitres** |
| `courseCategories` | 2,4 Ko | Public | Public + cache long |
| `freelances` | 2,1 Ko | Public | Public **paginé** |
| `siteContent` | 1,3 Ko | Public | Public |
| `trainingCenters` | 1,2 Ko | Public | Public |
| `platformConfig` | 1,1 Ko | 🔴 **Admin** | Admin uniquement |
| `stores` | 0,9 Ko | Public ⚠️ mais contient `payoutInfo.accountNumber` | Public **sans** les coordonnées de paiement |

**Extrapolation** (chapitres + leçons + quiz actuellement inclus dans chaque cours) :

| Volume de contenu | Payload estimé | Effet client |
|---|---:|---|
| Aujourd'hui (1 formation) | 35 Ko | négligeable |
| 100 formations | ~0,5 – 1,5 Mo | ~50-150 ms d'analyse JSON |
| 500 formations | ~2,5 – 7 Mo | ~300-800 ms + risque de **quota `localStorage` dépassé** (≈ 5 Mo) |

### 4.2 Les 20 champs les plus consommés (sur 111)

`marketplaceProducts` (10 fichiers) · `setOpenAuthModal` (10) · `setAuthMode` (10) ·
`stores` (9) · `isUserLoggedIn` (9) · `courses` (8) · `platformLoaded` (7) ·
`trainingCenters` (6) · `loginUser` (5) · `isAdmin` (5) · `feeConfig` (5) ·
`siteContent` (5) · `marketplaceOrders` (5) · `userProfile` (5) · `setSearchQuery` (5) ·
`updateProduct` (4) · `deleteProduct` (4) · `setSelectedCourseForPlayer` (4) ·
`setKycModalOpen` (4) · `setPaymentItems` (4)

### 4.3 Code mort identifié

Sur 111 membres, **2 ne sont jamais consommés** : `setActiveVendorStore`, `closeStore`
→ supprimables sans risque lors de la Phase 2.

---

## 5. 🔴 Sécurité : surface réellement exposée

`GET /api/platform/sync` **n'appelle aucune vérification** (ni cookie de session, ni rôle).
Seule la route `POST` du même fichier contrôle un en-tête `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
(ligne 219-222) — le `GET` est totalement ouvert.

**Test à faire vous-même** (sans être connecté, dans un navigateur privé) :
ouvrir `https://votre-domaine/api/platform/sync` → vous recevrez un JSON contenant :

| Champ exposé | Table | Nature |
|---|---|---|
| `buyerName`, `buyerEmail`, `buyerPhone` | `marketplaceOrders` | Identité + contact des **acheteurs** |
| `lastName`, `firstName`, `phoneContact`, `email`, `notes` | `postPurchaseSupport` | Messages et contacts **clients** |
| `accountNumber`, `providerName` | `stores[].payoutInfo` | **Wave / Orange Money / IBAN / wallet USDT** des vendeurs |
| `accountDetails` | `payoutRequests` | Coordonnées de **retrait** des vendeurs |
| documents et pièces d'identité | `kycSubmissions` | Dossiers **KYC** |
| candidatures complètes | `vendorApplications` | Données des **candidats vendeurs** |
| commissions, achats de stockage | `instructorCommissions`, `instructorStoragePurchases` | Données financières **formateurs** |
| configuration interne | `platformConfig` | Réglages plateforme |

### Correctif minimum (Phase 0, sans rien casser)

1. Créer un helper serveur `lib/server/requireSession.ts` qui lit le cookie de session
   (même mécanique que `app/api/admin/auth/route.ts` et `app/api/me/route.ts`).
2. Dans `sync/route.ts` : **séparer** les collections publiques des collections sensibles.
3. Créer `app/api/platform/admin-sync/route.ts` : **refuse 401/403** sans session valide
   **et** rôle administrateur ; c'est lui qui renvoie `marketplaceOrders`, `payoutRequests`,
   `kycSubmissions`, `postPurchaseSupport`, `vendorApplications`, `instructorCommissions`,
   `instructorStoragePurchases`, `platformConfig`.
4. Retirer `payoutInfo.accountNumber` de la charge publique des `stores` (le conserver
   uniquement dans la réponse admin et pour le vendeur propriétaire).
5. Côté client : `AppStore` n'appelle `/api/platform/admin-sync` **que** lorsque l'espace
   admin est ouvert (ou après authentification admin réussie).

**Critères d'acceptation Phase 0**
- Un visiteur non connecté sur `/api/platform/sync` ne reçoit **plus** aucune donnée personnelle.
- L'espace admin affiche toujours les mêmes données (test bout-en-bout sur `/admin`).
- Aucune régression sur les pages publiques (accueil, académie, marketplace).

---

## 6. Les 6 problèmes structurels (et leur impact mesuré)

| # | Problème | Preuve / mesure | Impact quand ça grossit |
|---|---|---|---|
| 1 | **Charge monolithique** : tout pour tout le monde en 1 requête | 35 Ko aujourd'hui ; les 2 plus gros postes sont des données d'admin | Chaque client paie le coût des données admin |
| 2 | **Données imbriquées** : `courses` inclut `chapters.lessons` + `quizzes.options` | `sync/route.ts` lignes 55-70 | Croissance en O(nb de leçons) pour afficher une simple carte |
| 3 | **Contexte React unique** (111 membres) | 19 fichiers abonnés, 10 `useState` | Toute mutation re-rend la page entière → saccades |
| 4 | **Cache tout-ou-rien** | 1 clé `localStorage`, TTL 60 s uniforme | Quota dépassé (≈5 Mo), fraîcheur inadaptée par type de donnée |
| 5 | **Aucune pagination côté API** | Le client coupe l'affichage à 12, mais l'API charge tout | 500 formations = plusieurs Mo au premier chargement |
| 6 | **UI et données mélangées** | panier, modales, recherche dans le même store que Supabase | Tests difficiles, couplage fort, refactor risqué |

**À l'inverse, ce qui est déjà bien fait et à préserver :**
- Le pipeline d'écriture est **centralisé et validé côté serveur** (`/api/platform/write`).
- Les données personnelles ont déjà un endpoint dédié isolé (`/api/me`) → **bon modèle à généraliser**.
- Les gros composants reçoivent leurs données **par props** → migration par façade possible.
- Le cache « stale-while-revalidate » existe déjà (il faut juste le rendre granulaire).

---

## 7. Plan de migration en 5 phases

**Règle d'or** : aucune phase ne dépend de la suivante pour être livrable ; l'application
reste fonctionnelle après **chaque** étape. Aucune réécriture « big-bang ».

### Phase 0 — Sécuriser la lecture *(priorité absolue — ½ journée)*

| Action | Fichier | Détail technique |
|---|---|---|
| Créer le helper de session serveur | `lib/server/requireSession.ts` **(nouveau)** | Lit le cookie de session (même logique que `app/api/me/route.ts`), retourne `{ user, role }` ou `null` |
| Créer l'endpoint admin | `app/api/platform/admin-sync/route.ts` **(nouveau)** | `401` sans session, `403` si `role !== 'admin'` ; renvoie les 8 collections sensibles |
| Épurer la charge publique | `app/api/platform/sync/route.ts` *(modifier)* | Retirer les 8 collections sensibles + `payoutInfo.accountNumber` |
| Chargement à la demande | `lib/store/AppStore.tsx` *(modifier)* | Nouvelle fonction `loadAdminData()` appelée à l'ouverture de `/admin` uniquement |
| Vérifier les rôles sur l'écriture | `app/api/platform/write/route.ts` *(modifier)* | Aujourd'hui `isAdmin` vaut `true` par défaut côté client : les actions d'admin doivent être validées **serveur** (au minimum `approve-kyc`, `approve-payout`, `admin-add-instructor`, `create-course-category`, `set-course-featured`) |

**Risque principal** : l'espace admin dépend aujourd'hui de `/sync` → il faut le test bout-en-bout
`/admin` (stats, formations, marketplace, KYC) avant de valider.
**Rollback** : réactiver les collections dans `/sync` (1 ligne chacune).

### Phase 1 — Découper l'API de lecture par domaine *(1 à 2 jours)*

| Nouvelle route | Remplace | Contenu | Pagination |
|---|---|---|---|
| `app/api/catalog/route.ts` | le bloc « académie » de `/sync` | `categories`, `courses` (métadonnées seules) | `?page&limit&category&view&q` |
| `app/api/catalog/course/[slug]/route.ts` | — | Détail complet d'**une** formation (chapitres, leçons, quiz) | — |
| `app/api/marketplace/route.ts` | le bloc « marketplace » | `stores` (sans `accountNumber`), `products` | `?page&limit&type&storeId&q` |
| `app/api/services/route.ts` | `servicePackages`, `freelances`, `enterprises`, `blogPosts` | Pages Services / Freelances / Entreprises / Blog | `?page&limit` |
| `app/api/site/route.ts` | `siteContent`, `feeConfig`, `platformStats` | Contenu éditorial | cache long |

**Points techniques décisifs**
1. **`select` Prisma explicite** : ne jamais renvoyer `chapters`, `quizzes`, `learningOutcomes`
   dans une liste. Chargez-les uniquement sur `/api/catalog/course/[slug]`.
2. **`skip` / `take`** partout (12 ou 24 par page) + `total` pour afficher « X résultats ».
3. `platformApi.ts` devient `lib/services/api/catalog.ts`, `.../marketplace.ts`, etc.,
   chacun avec **son propre cache** (`fortia_cache_catalog`, `fortia_cache_marketplace`…)
   et **son propre TTL** : catégories 24 h, catalogue 5 min, boutique 5 min, commandes 30 s.
4. Conserver la compatibilité : `AppStore` peut continuer d'agréger les 4 endpoints dans
   un objet de même forme → **aucune page à modifier** en Phase 1.

**Critères d'acceptation Phase 1**
- Payload du premier chargement de l'accueil **< 60 Ko** avec 500 formations en base.
- Le catalogue Académie charge 12 formations par page + un total.
- Aucune régression : accueil, académie, marketplace, membre, admin.

### Phase 2 — Découper le store en 5 sous-stores *(2 à 3 jours)*

**Méthode « façade »** : `AppStoreProvider` reste le **seul point d'entrée public** et
expose **exactement les mêmes 111 membres** qu'aujourd'hui. Les 19 fichiers consommateurs
ne changent **pas une ligne**. En interne, il compose 5 providers spécialisés.

| Nouveau fichier | Domaine | Champs concernés (extraits) |
|---|---|---|
| `lib/store/AuthProvider.tsx` | Session, compte, KYC, admin | `isUserLoggedIn`, `userProfile`, `sessionChecking`, `loginUser`, `logoutUser`, `authMode`/`setAuthMode`, `openAuthModal`/`setOpenAuthModal`, `isAdmin`/`setAdmin`, `kycSubmissions`, `submitKyc`, `approveKyc`, `isKycModalOpen`, `feeConfig` |
| `lib/store/CatalogProvider.tsx` | Académie | `courses` + CRUD, `courseCategories` + CRUD catégories, `toggleCourseFeatured`, `trainingCenters`, `instructor*`, `rateCourse`, `recordCourseProgress`, `ensureCourseEnrollment`, `grantCertificate` |
| `lib/store/MarketplaceProvider.tsx` | Boutique, services, social | `marketplaceProducts` + CRUD, `stores` + CRUD, `selectedStore`, `vendorApplications`, `marketplaceOrders`, `payoutRequests`, `marketplaceConfig`, `postPurchaseSubmissions`, `services`, `serviceQuotes`, `freelances`, `enterprises`, `blogPosts`, `siteContent` |
| `lib/store/CommerceProvider.tsx` | Panier et paiement | `cartItems`, `addToCart`, `removeFromCart`, `clearCart`, `isCartOpen`/`setCartOpen`, `paymentItems`/`setPaymentItems`, `isPaymentGatewayOpen`/`setPaymentGatewayOpen`, `handlePaymentSuccess` |
| `lib/store/UiProvider.tsx` | Interface | `notifications`, `myNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead`, `deleteNotification`, `clearNotifications`, `searchQuery`/`setSearchQuery`, `selectedCourseForPlayer`/`setSelectedCourseForPlayer`, modales restantes |

**À supprimer au passage** (code mort mesuré) : `setActiveVendorStore`, `closeStore`.

**Gain** : un changement dans le panier ne re-rend plus que les composants abonnés au panier.

**Critères d'acceptation Phase 2**
- `lib/store/AppStore.tsx` passe de **1 710** à **< 250 lignes** (façade + composition).
- `npx tsc --noEmit` → 0 erreur ; aucune page modifiée.
- Parcours testés : connexion, ajout au panier, paiement, notation, admin, formateur.

### Phase 3 — Réactivité fine *(1 à 2 jours)*

| Action | Détail |
|---|---|
| Sélecteurs par champ | Remplacer `useAppStore()` (objet complet) par `useCatalogCourses()`, `useAuthUser()`, `useCartCount()`… construits sur `useSyncExternalStore` (React 19, **aucune dépendance à ajouter**) |
| Migration progressive | Un composant à la fois ; l'ancien `useAppStore()` continue de fonctionner en parallèle |
| Mesure | React DevTools Profiler avant/après sur `/admin` (page la plus lourde : 49 champs) |

> Alternative plus rapide si vous acceptez une dépendance : `Zustand` (~1 Ko) donnerait les
> Phases 2 et 3 en beaucoup moins de code. Ma recommandation : **rester sans dépendance
> nouvelle** tant que la Phase 2 suffit.

### Phase 4 — Cache granulaire *(1 jour)*

| Type de donnée | Support | TTL |
|---|---|---|
| Catégories, contenu éditorial | `localStorage` | 24 h |
| Catalogue, boutique | `localStorage` | 5 min |
| Commandes, notifications | mémoire seule | 30 s |
| Chapitres, leçons, vidéos lourdes | **IndexedDB** | hors ligne (déjà amorcé par `lib/services/offlineVideo.ts`) |

Bénéfice : démarrage instantané, plus de risque de quota `localStorage`, fraîcheur adaptée
à chaque type de donnée.

### Phase 5 — Observabilité *(½ journée)*

1. Script de charge **local** : générer 5 000 formations + 200 boutiques dans une base de test,
   puis mesurer payload, temps de réponse et mémoire.
2. Consigner les métriques « avant / après » dans ce document.
3. Alerte simple : log serveur si une requête `/api/*` dépasse 500 ms.

---

## 8. Découpage cible : mapping des 111 membres

| Domaine | Nb de membres | Fournisseur cible |
|---|---:|---|
| Données Académie (formations, catégories, centres, formateurs) | ~24 | `CatalogProvider` |
| Boutique / marketplace / services / social | ~30 | `MarketplaceProvider` |
| Session, compte, KYC, administration | ~26 | `AuthProvider` |
| Interface (modales, notifications, recherche, lecteur) | ~13 | `UiProvider` |
| Panier et paiement | ~9 | `CommerceProvider` |
| Frais, statistiques, contenu éditorial (partagés) | ~7 | réexportés par la façade |
| **Code mort** | **2** | supprimés |

---

## 9. Garde-fous — checklist de non-régression par phase

À exécuter **avant** de valider chaque phase :

- [ ] `npx tsc --noEmit` → 0 erreur
- [ ] `npx next build --turbopack` → succès
- [ ] `/`, `/academy`, `/academy?categorie=…`, `/marketplace`, `/member`, `/admin`, `/vendor`, `/instructor` → **200**
- [ ] Connexion / déconnexion (la session reste valide après rechargement)
- [ ] Ajout au panier → paiement → commande visible en base
- [ ] Notation d'une formation persistée (`rating` + `reviewsCount` recalculés)
- [ ] Création, mise à jour **et** suppression d'une catégorie (refus 409 si utilisée)
- [ ] Mise en avant d'une formation → vue « Mises en avant » du catalogue
- [ ] Aucun message en console navigateur (hydratation, `src=""`, chunk)

### Ce qu'il ne faut **pas** toucher
`app/api/platform/write/route.ts` (structure d'écriture), `app/api/auth/*`, `app/api/me/*`,
`app/api/storage/*`, `lib/services/r2Storage.ts`, les règles de paiement, le schéma Prisma
(aucune migration destructive).

---

## 10. Annexes

### 10.1 Inventaire des 41 actions d'écriture (`/api/platform/write`)

- **Devis / support** : `submit-quote`, `submit-support`, `mark-notification-read`
- **KYC** : `submit-kyc`, `approve-kyc`, `approve-kyc-full`
- **Profils** : `update-profile`, `update-freelance-profile`, `update-enterprise-profile`
- **Vendeurs / boutiques** : `submit-vendor-app`, `approve-vendor-app`, `reject-vendor-app`, `update-store`
- **Formations** : `create-course`, `update-course`, `rate-course`, `suspend-course`, `delete-course`,
  `submit-course-by-instructor`, `sync-user-learning`, `issue-certificate`, `register-course-media-storage`
- **Catégories (ajouté récemment)** : `create-course-category`, `update-course-category`,
  `delete-course-category`, `set-course-featured`
- **Produits** : `create-product`, `update-product`, `register-free-purchase`
- **Services** : `create-service`, `update-service`, `delete-service`, `order-service`
- **Marketplace** : `submit-order`, `submit-payout`, `approve-payout`
- **Centres / formateurs** : `create-training-center`, `update-training-center-config`,
  `pay-training-center-fee`, `admin-add-instructor`, `register-instructor-purchase`

> **Recommandation Phase 1** : scinder cette route en `write/catalog`, `write/marketplace`,
> `write/account`, `write/admin` — 1 719 lignes dans un seul fichier devient difficile à maintenir.

### 10.2 Ordre de travail conseillé

| Semaine | Objectif |
|---|---|
| 1 | Phase 0 (sécurité) puis Phase 1 (catalogue + boutique) |
| 2 | Phase 2 (découpage du store par façade) |
| 3 | Phase 3 (sélecteurs) + Phase 4 (cache granulaire) |
| 4 | Phase 5 (mesures) + prochaine étape Marketplace (`/product/[slug]`, fichiers produits) |

---

*Rapport établi à partir de mesures réelles sur le code et sur la base de données.
Les estimations de temps sont indicatives et supposent une seule personne sur le sujet.*

---

## 11. Métriques « avant / après » (Phase 5 — mesurées le 11/10/2026)

> Détail complet, nouvelle cartographie des fichiers et périmètre restant :
> voir **`docs/ARCHITECTURE-V2.md`**.

### Charge initiale de l'application

| Source | Poids |
|---|---:|
| Avant : `GET /api/platform/sync` (monolithique) | **17,56 Ko** |
| Après : `/api/catalog?limit=24` + `/api/marketplace` + `/api/services` + `/api/site` | **15,58 Ko** |

### Allègement de la liste des formations

| Mesure | Valeur |
|---|---:|
| Coût d'une carte (métadonnées seules) | **941 o** |
| `chapters` / `quiz` / `learningOutcomes` dans la liste | **0** (chargés à la demande) |
| Détail complet d'une formation | **1,48 Ko** |
| Formations chargées au premier affichage | **24** (page serveur) |
| Projection : tout charger avec 500 formations | **≈ 0,45 Mo** (ce que la pagination évite) |

### Sécurité (Phase 0)

| Contrôle | Résultat |
|---|---|
| Collections sensibles dans la charge publique | **0** (9 collections déplacées vers `admin-sync`) |
| `payoutInfo.accountNumber` exposé publiquement | **non** |
| `/api/platform/admin-sync` sans jeton admin | **401** |
| URL signée sur un fichier KYC / livrable / vidéo sans session | **401** |
| Téléversement ou suppression sans session ni droits | **401** |
| Ancien mot de passe admin codé en dur (`FORTIA2026`) | **401** (refusé) |

### Isolation des pannes

`ErrorBoundary` (jusqu'ici jamais utilisé) est désormais actif en deux variantes :
**page** (l'en-tête et la navigation survivent) et **section** (seule la section fautive
est remplacée). Objectif atteint : *une modification ultérieure ne peut plus plonger
toute la page en panne*.

---

