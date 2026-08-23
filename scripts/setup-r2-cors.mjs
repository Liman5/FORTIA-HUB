// ============================================================
// FORTIA HUB — Configuration CORS pour le bucket Cloudflare R2
// Description : Applique les CORS policies au bucket R2 (via
// l'API S3 compatible — PutBucketCorsCommand) pour permettre
// les uploads/lectures depuis le domaine FORTIA HUB.
//
// Exécution : node scripts/setup-r2-cors.mjs
// Prérequis : CLOUDFLARE_BUCKET_ACCESS_KEY et
//             CLOUDFLARE_BUCKET_SECRET_KEY définis dans .env.local
// ============================================================

import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3";

// Charger .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  config({ path: envPath });
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY = process.env.CLOUDFLARE_BUCKET_ACCESS_KEY;
const SECRET_KEY = process.env.CLOUDFLARE_BUCKET_SECRET_KEY;
const BUCKET_NAME = process.env.CLOUDFLARE_BUCKET_NAME || "fortia-hub-storage";
const ENDPOINT =
  process.env.CLOUDFLARE_BUCKET_ENDPOINT ||
  `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Domaines autorisés (origines)
const ALLOWED_ORIGINS = process.env.NEXT_PUBLIC_APP_URL
  ? [process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000", "http://localhost:3001"]
  : ["*"];

// Règles CORS à appliquer (format S3 / R2)
const CORS_RULES = [
  {
    AllowedOrigins: ALLOWED_ORIGINS,
    AllowedMethods: ["GET", "HEAD"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
    MaxAgeSeconds: 3600,
  },
  {
    AllowedOrigins: ALLOWED_ORIGINS,
    AllowedMethods: ["PUT", "POST", "DELETE"],
    AllowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Amz-Acl",
      "X-Amz-Date",
      "X-Amz-Content-Sha256",
      "X-Amz-Signature",
      "X-Amz-Credential",
      "X-Amz-Expires",
      "X-Amz-SignedHeaders",
      "X-Requested-With",
    ],
    ExposeHeaders: ["ETag", "Location"],
    MaxAgeSeconds: 3600,
  },
];

async function main() {
  if (!ACCOUNT_ID) {
    console.error("[CORS R2] Erreur : CLOUDFLARE_ACCOUNT_ID manquant dans .env.local");
    process.exit(1);
  }
  if (!ACCESS_KEY || !SECRET_KEY) {
    console.error(
      "[CORS R2] Erreur : CLOUDFLARE_BUCKET_ACCESS_KEY / CLOUDFLARE_BUCKET_SECRET_KEY manquants dans .env.local"
    );
    process.exit(1);
  }

  const r2Client = new S3Client({
    region: "auto",
    endpoint: ENDPOINT,
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_KEY,
    },
  });

  console.log(`[CORS R2] Configuration CORS du bucket "${BUCKET_NAME}"...`);
  console.log(`[CORS R2] Origines autorisées : ${ALLOWED_ORIGINS.join(", ")}`);
  console.log(`[CORS R2] Endpoint : ${ENDPOINT}`);

  // 1. Appliquer les règles CORS
  await r2Client.send(
    new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: CORS_RULES,
      },
    })
  );

  console.log("[CORS R2] ✅ CORS policies appliquées avec succès !");

  // 2. Vérifier en relisant la configuration
  const verify = await r2Client.send(
    new GetBucketCorsCommand({ Bucket: BUCKET_NAME })
  );

  console.log(
    "[CORS R2] ✅ Vérification — CORS actifs sur le bucket :",
    JSON.stringify(verify.CORSRules, null, 2)
  );
}

main().catch((err) => {
  console.error("[CORS R2] Erreur :", err.message || err);
  process.exit(1);
});