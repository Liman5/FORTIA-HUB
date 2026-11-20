# 🔒 CORS Policies — Cloudflare R2 (FORTIA HUB)

Ce document explique comment configurer les **CORS policies** du bucket R2
`fortia-hub-storage` pour permettre les uploads et lectures depuis l'application.

---

## ⚠️ Pourquoi les CORS sont nécessaires

Le navigateur bloque les requêtes cross-origin par défaut. Sans CORS configurés
sur le bucket R2, les uploads d'images/livrables depuis l'interface FORTIA HUB
échoueront avec des erreurs du type :

```
Access to fetch at 'https://...r2.cloudflarestorage.com' from origin
'https://fortia-hub.com' has been blocked by CORS policy
```

---

## ✅ Méthode 1 : Configuration via le Dashboard Cloudflare (RECOMMANDÉE)

1. Connectez-vous sur **https://dash.cloudflare.com**
2. Allez dans **R2** (icône 💧 en haut à droite)
3. Cliquez sur le bucket **`fortia-hub-storage`**
4. Onglet **Settings** → section **CORS Policy**
5. Cliquez sur **Add** et ajoutez les **2 règles suivantes** :

### Règle 1 — Lecture publique (GET / HEAD)
| Champ | Valeur |
|---|---|
| Allowed origins | `*` (ou votre domaine : `https://fortia-hub.com`, `http://localhost:3000`) |
| Allowed methods | `GET`, `HEAD` |
| Allowed headers | `*` |
| Expose headers | `ETag`, `Content-Length`, `Content-Type` |
| Max age | `3600` |

### Règle 2 — Uploads / Suppression (PUT, POST, DELETE)
| Champ | Valeur |
|---|---|
| Allowed origins | `*` (ou votre domaine : `https://fortia-hub.com`, `http://localhost:3000`) |
| Allowed methods | `PUT`, `POST`, `DELETE` |
| Allowed headers | `Content-Type`, `Authorization`, `X-Amz-Acl`, `X-Amz-Date`, `X-Amz-Content-Sha256`, `X-Amz-Signature`, `X-Amz-Credential`, `X-Amz-Expires`, `X-Amz-SignedHeaders`, `X-Requested-With` |
| Expose headers | `ETag`, `Location` |
| Max age | `3600` |

6. Cliquez sur **Save**

---

## 🛠️ Méthode 2 : via l'API Cloudflare (Token avec permission "Edit R2")

Le token API doit avoir la permission **R2 → Edit**.

```bash
curl -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/2077d7397173362bc01b49d49de0c2c7/r2/buckets/fortia-hub-storage/cors" \
  -H "Authorization: Bearer VOTRE_TOKEN_API_CLOUDFLARE" \
  -H "Content-Type: application/json" \
  -d '{
    "cors": [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
        "MaxAgeSeconds": 3600
      },
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["PUT", "POST", "DELETE"],
        "AllowedHeaders": [
          "Content-Type",
          "Authorization",
          "X-Amz-Acl",
          "X-Amz-Date",
          "X-Amz-Content-Sha256",
          "X-Amz-Signature",
          "X-Amz-Credential",
          "X-Amz-Expires",
          "X-Amz-SignedHeaders",
          "X-Requested-With"
        ],
        "ExposeHeaders": ["ETag", "Location"],
        "MaxAgeSeconds": 3600
      }
    ]
  }'
```

> ⚠️ Le token `CLOUDFLARE_API_TOKEN` actuel (`cfat_...`) ne possède pas la
> permission "Edit R2 Bucket" — il a renvoyé `Authentication error`.
> Les clés R2 S3 (Access/Secret) ne permettent pas non plus `PutBucketCors`
> (`Access Denied`).

---

## 🔍 Vérification de la configuration CORS

Une fois les CORS configurés, vérifiez la présence de l'en-tête dans la réponse :

```bash
curl -I -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: PUT" \
  "https://pub-82bdba5e95cc4625abb92ef38fc07f49.r2.dev/product-files/test"
```

Réponse attendue :
```
HTTP/2 200
access-control-allow-origin: *
access-control-allow-methods: PUT,POST,DELETE
access-control-allow-headers: Content-Type,Authorization,...
```

---

## 📁 Fichiers liés au stockage R2

| Fichier | Rôle |
|---|---|
| `lib/services/r2Storage.ts` | Service backend S3 (upload, delete, URL signées) |
| `lib/services/clientUpload.ts` | Utilitaires client (upload depuis le navigateur) |
| `app/api/storage/upload/route.ts` | Route API d'upload |
| `app/api/storage/delete/route.ts` | Route API de suppression |
| `app/api/storage/signed-url/route.ts` | Route API URL signée |
| `scripts/setup-r2-cors.mjs` | Script de configuration CORS (automatique) |
| `.env.local` | Credentials R2 (`CLOUDFLARE_BUCKET_*`) |

---

## 🔑 Variables d'environnement nécessaires

```env
CLOUDFLARE_ACCOUNT_ID=<votre_account_id>
CLOUDFLARE_BUCKET_NAME=fortia-hub-storage
CLOUDFLARE_BUCKET_ENDPOINT=https://<votre_account_id>.r2.cloudflarestorage.com
CLOUDFLARE_BUCKET_ACCESS_KEY=<votre_access_key>
CLOUDFLARE_BUCKET_SECRET_KEY=<votre_secret_key>
CLOUDFLARE_BUCKET_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxxxxxx.r2.dev

# Bucket PRIVÉ : vidéos de formation, supports PDF, livrables produits, KYC
CLOUDFLARE_PRIVATE_BUCKET_NAME=fortia-hub-private
CLOUDFLARE_PRIVATE_BUCKET_ACCESS_KEY=<votre_access_key_prive>
CLOUDFLARE_PRIVATE_BUCKET_SECRET_KEY=<votre_secret_key_prive>
```

---

## 🚨 Cas « l'upload vidéo s'arrête en cours de route »

Les vidéos et les PDF de formation sont envoyés **directement du navigateur vers
le bucket PRIVÉ** (`fortia-hub-private`) via une URL PUT présignée. Cette voie
exige une règle CORS **sur le bucket privé** :

| Champ | Valeur obligatoire |
|---|---|
| Allowed origins | `*` (couvre le domaine de production et les aperçus Vercel) |
| Allowed methods | `GET`, `HEAD`, `PUT`, `POST`, `DELETE` |
| Allowed headers | `*` |
| Expose headers | `ETag`, `Location` |

Diagnostic rapide (sans authentification) — un `403` signifie que l'origine est
refusée, donc que l'upload depuis le site échouera :

```powershell
node scripts/check-r2-cors.mjs
node scripts/setup-r2-cors.mjs   # applique les règles aux 2 buckets (jeton avec droits CORS requis)
```

> ⚠️ Le jeton R2 doit disposer des droits de modification des CORS. Sinon,
> ajoutez la règle manuellement : **Cloudflare > R2 > fortia-hub-private >
> Settings > CORS Policy**.
