# ÉTAPE 1 — DASHBOARD ADMIN ET GESTION DES UTILISATEURS

## 1. Modularisation de `AdminDashboard`

Le shell historique est conservé (styles, navigation, onglets existants). Un onglet
`Utilisateurs` et ses composants ont été extraits :

```
components/admin/users/
  AdminUsersTab.tsx        liste, statistiques, filtres, pagination, actions
  AdminUserDetails.tsx     fiche détaillée (identité, rôles, KYC, commandes, audit)
  AdminDeletionRequests.tsx demandes de suppression et traitement
  UserBadges.tsx           badges statut / KYC / rôles + formatage des dates
components/admin/tabs/
  AdminSupportTab.tsx      onglet support post-achat extrait du dashboard
  AdminQuotesTab.tsx       onglet devis extrait du dashboard
lib/services/admin/platformUsers.ts   client HTTP typé
lib/modules/admin/
  platformUsers.ts         liste paginée, statistiques, détail
  platformUserStatus.ts    suspension, blocage, réactivation, audit
  platformDeletion.ts      demande, annulation, exécution différée, anonymisation
  http.ts                  erreurs normalisées
lib/server/platformAdmin.ts garde d'accès (général / superadmin)
```

## 2. Routes API

| Route | Rôle |
|---|---|
| `GET /api/admin/platform-users` | liste serveur (recherche, rôles, statut, KYC, dates, pagination) |
| `GET /api/admin/platform-users/[id]` | fiche détaillée + journal |
| `PATCH /api/admin/platform-users/[id]` | `suspend`, `block`, `reactivate` |
| `POST /api/admin/platform-users/[id]/deletion` | demande de suppression administrative |
| `DELETE /api/admin/platform-users/[id]/deletion` | annulation dans le délai |
| `GET/POST /api/admin/deletion-requests` | file des demandes |
| `POST /api/admin/deletion-requests/[id]` | `cancel` ou `process` (si éligible) |
| `GET/POST/DELETE /api/account/deletion` | parcours utilisateur (session imposée) |

## 3. Statuts et effets

`users.account_status` : `active`, `suspended`, `blocked`, `deletion_pending`,
`anonymized`. Les colonnes historiques `is_active`, `deletion_requested_at` et
`deletion_scheduled_for` restent synchronisées.

- suspension/blocage : `is_active=false`, sessions supprimées, caches auth purgés ;
- connexion refusée (403 `ACCOUNT_BLOCKED`) et API protégées refusées ;
- réactivation : statut actif, sessions non recréées (l'utilisateur se reconnecte) ;
- les données, commandes et historiques ne sont pas supprimés par ces actions.

## 4. Suppression différée

- rétention **minimale de 7 jours** (`DELETION_RETENTION_DAYS = 7`) ;
- date d'exécution en base (`pending_deletions.delete_at`), pas de timer mémoire ;
- une seule demande `pending` par utilisateur (idempotent) ;
- annulation possible pendant le délai, par l'utilisateur ou un admin ;
- exécution automatique par `processDueDeletions()` dans le cron de maintenance ;
- exécution manuelle refusée si la date n'est pas atteinte (409) ;
- traitement réclamé par `updateMany(status="processing")` : pas de double exécution.

### Données conservées / anonymisées

| Donnée | Traitement |
|---|---|
| Compte | anonymisé (`deleted+<id>@anonymized.invalid`, mot de passe invalidé) |
| Sessions, notifications, push | supprimées |
| KYC | identité et pièces effacées, dossier neutralisé |
| Profils freelance / entreprise | supprimés |
| Abonnements / entitlements | expirés / révoqués |
| Commandes, paiements, remboursements | **conservés** (obligations comptables) |
| Attestations | conservées |

Le déclencheur SQL historique `trg_process_deletions` supprimait la ligne `users`
dès que la date était atteinte, sans anonymisation ni conservation. Il a été retiré
par la migration `20261121091000_drop_legacy_deletion_trigger`.

## 5. Sécurité

- liste et actions réservées aux rôles `general` / `superadmin` ;
- un membre authentifié reçoit 403, un anonyme 401 ;
- impossible de suspendre/bloquer/supprimer son propre compte ;
- cible administrateur réservée au superadministrateur ;
- protection du dernier administrateur actif ;
- transitions conditionnelles (`updateMany`) contre les actions concurrentes ;
- journal `admin_audit_logs` : acteur, rôle, cible, motif, métadonnées ;
- aucune session, aucun token, aucun mot de passe dans les réponses.

## 6. Migration

`prisma/migrations/20261121090000_phase_admin_users/migration.sql` (appliquée) :
colonnes de statut, index, colonnes de suivi des demandes, table `admin_audit_logs`.

`prisma/migrations/20261121091000_drop_legacy_deletion_trigger/migration.sql`
(appliquée) : retrait du trigger de suppression immédiate.

## 8. Finalisation du dashboard

`components/AdminDashboard.tsx` est passé de **2 751 à 1 218 lignes**. Tous les onglets
fonctionnels sont désormais extraits :

| Onglet | Composant |
|---|---|
| Utilisateurs | `components/admin/users/AdminUsersTab.tsx` |
| CMS du site | `components/admin/content/AdminSiteContentTab.tsx` |
| Marketplace | `components/admin/marketplace/AdminMarketplaceTab.tsx` |
| Formations | `components/admin/courses/AdminCoursesTab.tsx` |
| Produits | `components/admin/products/AdminProductsTab.tsx` |
| KYC | `components/admin/kyc/AdminKycTab.tsx` + `KycViewer.tsx` |
| Frais | `components/admin/fees/AdminFeesTab.tsx` |
| Formateurs | `components/admin/instructors/AdminInstructorsTab.tsx` |
| Support | `components/admin/tabs/AdminSupportTab.tsx` |
| Devis | `components/admin/tabs/AdminQuotesTab.tsx` |

Le dashboard ne conserve plus que la navigation, l'onglet « Vue d'ensemble », les
modales de création/édition globales et le passage des props aux modules.

## 9. Restauration du statut après annulation d'une suppression

`PendingDeletion` conserve désormais un instantané du compte :

- `previous_status`
- `previous_is_active`
- `previous_suspended_until`

Lors d'une annulation :

- un compte `blocked` reste **bloqué** (`is_active=false`) ;
- un compte `suspended` retrouve sa date de fin de suspension ;
- un compte `active` redevient actif ;
- aucune réactivation automatique d'un compte de modération.

Migration : `20261121100000_phase_admin_deletion_snapshot` (appliquée).
Les demandes antérieures sont rétro-remplies depuis l'état réel du compte associé.

Test de régression : `test-admin-users` vérifie blocage → demande → annulation →
compte toujours bloqué et inactif.

## 10. Tests

`npm run test:admin-users` exécute 25 vérifications HTTP réelles : accès refusés,
recherche, pagination, fiche, suspension, session révoquée, blocage, réactivation,
restauration du statut bloqué après annulation, suppression différée ≥ 7 jours,
idempotence, refus avant échéance, annulation, parcours utilisateur, identité
imposée par la session, anonymisation, conservation de l'historique financier et
journal d'audit.


