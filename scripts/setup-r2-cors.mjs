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
const ENDPOINT =
  process.env.CLOUDFLARE_BUCKET_ENDPOINT ||
  `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

/**
 * ⚠️ DEUX buckets : le PUBLIC (images) et le PRIVÉ (vidéos de formation, PDF,
 * livrables, KYC). Les vidéos de formation vont dans le bucket PRIVÉ : sans
 * règle CORS PUT sur CE bucket, l'upload échoue côté navigateur (le formateur
 * croit alors que le fichier « s'est arrêté en cours de route »).
 */
const BUCKETS = [
  {
    label: "PUBLIC (images)",
    name: process.env.CLOUDFLARE_BUCKET_NAME || "fortia-hub-storage",
    accessKey: process.env.CLOUDFLARE_BUCKET_ACCESS_KEY || "",
    secretKey: process.env.CLOUDFLARE_BUCKET_SECRET_KEY || "",
  },
  {
    label: "PRIVÉ (vidéos / PDF / KYC)",
    name: process.env.CLOUDFLARE_PRIVATE_BUCKET_NAME || "",
    accessKey:
      process.env.CLOUDFLARE_PRIVATE_BUCKET_ACCESS_KEY ||
      process.env.CLOUDFLARE_BUCKET_ACCESS_KEY ||
      "",
    secretKey:
      process.env.CLOUDFLARE_PRIVATE_BUCKET_SECRET_KEY ||
      process.env.CLOUDFLARE_BUCKET_SECRET_KEY ||
      "",
  },
].filter((b) => !!b.name && !!b.accessKey && !!b.secretKey);

/**
 * Origines autorisées.
 * `*` couvre les URL de prévisualisation Vercel et les domaines personnalisés.
 * Les fichiers privés restent protégés : une origine CORS `*` ne permet PAS de
 * lire un objet sans URL signée valide.
 */
const ALLOWED_ORIGINS = Array.from(
  new Set(
    [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.NEXT_PUBLIC_SITE_URL,
      "https://fortia-hub.com",
      "https://www.fortia-hub.com",
      "http://localhost:3000",
      "http://localhost:3001",
      "*",
    ].filter(Boolean)
  )
);

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
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag", "Location"],
    MaxAgeSeconds: 3600,
  },
];

async function preflight(bucket, origin = "http://localhost:3000") {
  const url = `${ENDPOINT}/${bucket}/course-media/diag/test.mp4`;
  try {
    const res = await fetch(url, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "content-type",
      },
    });
    const acao = res.headers.get("access-control-allow-origin");
    const methods = res.headers.get("access-control-allow-methods");
    console.log(
      `   preflight ${bucket} (${origin}) → ${res.status} | ACAO=${acao || "-"} | ${methods || "-"}`
    );
  } catch (err) {
    console.log(`   preflight ${bucket} → erreur ${err.message}`);
  }
}

async function main() {
  if (!ACCOUNT_ID) {
    console.error("[CORS R2] CLOUDFLARE_ACCOUNT_ID manquant dans .env.local");
    process.exit(1);
  }
  if (BUCKETS.length === 0) {
    console.error("[CORS R2] Aucun bucket configuré (clés R2 manquantes).");
    process.exit(1);
  }

  for (const bucket of BUCKETS) {
    const client = new S3Client({
      region: "auto",
      endpoint: ENDPOINT,
      credentials: {
        accessKeyId: bucket.accessKey,
        secretAccessKey: bucket.secretKey,
      },
    });

    console.log(`\n[CORS R2] ${bucket.label} → bucket "${bucket.name}"`);
    console.log(`[CORS R2] Origines : ${ALLOWED_ORIGINS.join(", ")}`);

    try {
      await client.send(
        new PutBucketCorsCommand({
          Bucket: bucket.name,
          CORSConfiguration: { CORSRules: CORS_RULES },
        })
      );
      const verify = await client.send(
        new GetBucketCorsCommand({ Bucket: bucket.name })
      );
      console.log("[CORS R2] ✅ Règles appliquées :", JSON.stringify(verify.CORSRules));
      await preflight(bucket.name);
    } catch (err) {
      console.error(
        `[CORS R2] ❌ Échec sur "${bucket.name}" : ${err.name} — ${err.message}\n` +
          "   → Le jeton R2 n'a pas le droit de modifier les CORS. Ajoutez la règle\n" +
          "     manuellement dans Cloudflare : R2 > bucket > Settings > CORS Policy,\n" +
          "     avec Allowed origins « * », methods GET, HEAD, PUT, POST, DELETE."
      );
    }
  }
}

main().catch((err) => {
  console.error("[CORS R2] Erreur :", err.message || err);
  process.exit(1);
});
