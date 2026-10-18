# FORTIA HUB — Mise en place du stockage PRIVÉ (Cloudflare R2)

> **À faire une seule fois, côté Cloudflare.** Sans cette étape, les documents KYC,
> les livrables produits et les vidéos de formation restent stockés dans le bucket
> **public** : le code les protège (URL signées + contrôle des droits), mais un objet
> présent dans un bucket exposé reste accessible par son URL directe.
>
> Durée estimée : **15 minutes**.

---

## 1. Pourquoi deux buckets ?

| Contenu | Exemples | Bucket | Accès |
|---|---|---|---|
| **Images publiques** | logo/bannière de boutique, image produit, image d'article, visuel du site | `CLOUDFLARE_BUCKET_NAME` (public) | URL permanente, visible par tous |
| **Documents privés** | pièce d'identité KYC, selfie, justificatif société | `CLOUDFLARE_PRIVATE_BUCKET_NAME` (privé) | **URL signée temporaire** uniquement, après vérification des droits |
| **Livrables produits** | PDF, ZIP, modèles achetés | idem privé | Acheteur réel / vendeur / admin |
| **Vidéos de formation** | MP4 des leçons, supports PDF | idem privé | Apprenant inscrit / formateur / admin |

Le code répartit déjà automatiquement chaque fichier dans le bon bucket, **d'après le
premier segment de la clé** (`kyc-documents/…`, `product-files/…`, `course-media/…` → privé ;
`store-images/…`, `product-images/…`, `blog-images/…`, `site-media/…` → public).

---

## 2. Étape 1 — Créer le bucket privé

1. Ouvrir **Cloudflare Dashboard → R2 → Create bucket**
2. Nom : **`fortia-hub-private`** (ou tout autre nom, à reporter dans la variable d'environnement)
3. Emplacement : celui de votre choix (idéalement le même que le bucket public)
4. **NE PAS** activer :
   - ❌ `Public access` / `R2.dev subdomain`
   - ❌ `Connect Domain` (aucun domaine public personnalisé)
   - ❌ aucune règle de cache public

> Résultat attendu : un bucket accessible **uniquement** via l'API S3 signée
> (notre serveur). Aucune URL publique n'existe pour ce bucket.

---

## 3. Étape 2 — Autoriser la clé d'API existante

1. **R2 → Manage R2 API Tokens** → ouvrir le token déjà utilisé par l'application
   (celui dont les valeurs sont dans `CLOUDFLARE_BUCKET_ACCESS_KEY` / `CLOUDFLARE_BUCKET_SECRET_KEY`)
2. Dans **Bucket scopes**, vérifier que **les deux buckets** sont autorisés :
   - `fortia-hub-storage` (public, existant)
   - `fortia-hub-private` (nouveau)
3. Permission : **Object Read & Write**
4. Enregistrer

> Si la clé n'autorise qu'un seul bucket, les téléversements privés échoueront avec
> une erreur `AccessDenied`.

---

## 4. Étape 3 — Renseigner les variables d'environnement

Dans `.env.local` (et dans **Vercel → Settings → Environment Variables** pour la production) :

```env
# Bucket PUBLIC (images) — déjà configuré
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_BUCKET_ACCESS_KEY=...
CLOUDFLARE_BUCKET_SECRET_KEY=...
CLOUDFLARE_BUCKET_NAME=fortia-hub-storage
CLOUDFLARE_BUCKET_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
CLOUDFLARE_BUCKET_PUBLIC_URL=https://storage.fortia-hub.com

# ➕ NOUVEAU : bucket PRIVÉ (KYC, livrables, vidéos)
CLOUDFLARE_PRIVATE_BUCKET_NAME=fortia-hub-private
```

Ensuite : **redémarrer le serveur** (`npm run dev`) et **redéployer** sur Vercel.

⚠️ Si `CLOUDFLARE_PRIVATE_BUCKET_NAME` est absente, l'application affiche au démarrage :

```
[R2] ⚠️ CLOUDFLARE_PRIVATE_BUCKET_NAME n'est pas défini : les documents KYC,
livrables produits et vidéos de formation restent dans le bucket public.
```

---

## 5. Étape 4 — Vérifier que c'est bien sécurisé

### 5.1 Le bucket privé ne doit répondre à aucune URL publique

```bash
# Doit renvoyer une erreur (403/404) — jamais le fichier
curl -I https://storage.fortia-hub.com/kyc-documents/test/photo.jpg
```

Si votre domaine public (`storage.fortia-hub.com`) pointe vers **le bucket privé**, retirez
immédiatement ce domaine dans **R2 → bucket privé → Settings → Public access**.

### 5.2 Vérifier dans quel bucket se trouve chaque fichier

Ouvrir **R2 → fortia-hub-private** dans le dashboard Cloudflare :

- Attendu : `kyc-documents/…`, `product-files/…`, `course-media/…`
- Le bucket **public** doit ne contenir que des images (`store-images/`, `product-images/`,
  `blog-images/`, `site-media/`)

### 5.3 Contrôles automatiques déjà implémentés et testés (8/8)

| Contrôle | Résultat |
|---|---|
| URL signée sur `kyc-documents/…` sans session | **401** |
| URL signée sur `product-files/…` sans session | **401** |
| URL signée sur `course-media/…` sans session | **401** |
| URL signée sur `store-images/…` (image publique) | autorisée |
| Téléversement (`presign-upload`, `upload`) sans session | **401** |
| Suppression (`delete`) sans session | **401** |
| Clé avec traversée de chemin (`../`) | **400** |

---

## 6. Migration des fichiers déjà téléversés

Les documents KYC, livrables et vidéos déposés **avant** cette mise en place sont dans le
bucket public. Deux options :

1. **Re-téléversement** (recommandé, simple) : le déposant renvoie ses fichiers via
   l'interface → ils partiront automatiquement dans le bucket privé.
2. **Copie S3** (si vous avez beaucoup de fichiers) : copier les préfixes
   `kyc-documents/`, `product-files/`, `course-media/` du bucket public vers le privé.

```bash
# Exemple avec rclone (à adapter à vos noms de buckets)
rclone copy r2:fortia-hub-storage/kyc-documents r2:fortia-hub-private/kyc-documents
rclone copy r2:fortia-hub-storage/product-files r2:fortia-hub-private/product-files
rclone copy r2:fortia-hub-storage/course-media  r2:fortia-hub-private/course-media

# Puis supprimer les originaux publics (APRÈS vérification)
rclone delete r2:fortia-hub-storage/kyc-documents
```

> ⚠️ Ne supprimez les originaux qu'après avoir vérifié que la copie est complète :
> une suppression R2 est irréversible.

---

## 7. Récapitulatif des règles appliquées par le code

| Dossier | Bucket | Lecture autorisée à | Écriture autorisée à |
|---|---|---|---|
| `store-images/…` | public | tous | vendeur de la boutique, admin |
| `product-images/…` | public | tous | vendeur du produit, admin |
| `blog-images/…`, `site-media/…` | public | tous | admin |
| `kyc-documents/…` | **privé** | déposant du dossier, admin | déposant, admin |
| `product-files/…` | **privé** | acheteur réel, vendeur du produit, produit gratuit, admin | vendeur, admin |
| `course-media/…` | **privé** | apprenant inscrit, formateur du cours, cours gratuit, admin | formateur/centre, admin |
| `certificates/…` | **privé** | titulaire de l'attestation, admin | admin |

Toute vérification est faite **côté serveur, sur la base de données**
(`lib/server/storageAccess.ts`) : ni le navigateur, ni un paramètre d'URL ne peuvent
accorder un droit d'accès.

---

## 8. Fichiers concernés dans le code

| Fichier | Rôle |
|---|---|
| `lib/services/r2Storage.ts` | Résolution du bucket (public/privé) d'après la clé, URL signées, refus d'URL publique pour un objet privé |
| `lib/server/storageAccess.ts` | Règles de lecture/écriture par dossier, vérifiées en base |
| `lib/server/requireAdmin.ts` | Authentification administrateur (token admin ou rôle `admin`) |
| `app/api/storage/signed-url/route.ts` | Accès en lecture (401/403 si non autorisé) |
| `app/api/storage/presign-upload/route.ts` | Autorisation de téléversement (dossier + droits + MIME + taille) |
| `app/api/storage/upload/route.ts` | Téléversement direct (session obligatoire) |
| `app/api/storage/delete/route.ts` | Suppression (session + droits obligatoires) |
