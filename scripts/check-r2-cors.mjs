// ============================================================
// FORTIA HUB — Vérification CORS du bucket Cloudflare R2
// Description : Envoie une requête OPTIONS (preflight) vers le
// bucket R2 pour vérifier que les CORS policies sont actives.
//
// Exécution : node scripts/check-r2-cors.mjs
// ============================================================

import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

// Charger .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  config({ path: envPath });
}

const BUCKET_PUBLIC_URL =
  process.env.CLOUDFLARE_BUCKET_PUBLIC_URL || "https://pub-82bdba5e95cc4625abb92ef38fc07f49.r2.dev";
const TEST_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const TEST_KEY = "test-cors-check.txt";

async function checkCors(method = "GET", headers = {}) {
  const url = `${BUCKET_PUBLIC_URL}/${TEST_KEY}`;

  console.log(`\n[Vérification CORS] ${method} → ${url}`);
  console.log(`[Origine simulée] ${TEST_ORIGIN}`);

  const res = await fetch(url, {
    method: "OPTIONS",
    headers: {
      Origin: TEST_ORIGIN,
      "Access-Control-Request-Method": method,
      ...headers,
    },
  });

  const corsHeaders = {
    "access-control-allow-origin": res.headers.get("access-control-allow-origin"),
    "access-control-allow-methods": res.headers.get("access-control-allow-methods"),
    "access-control-allow-headers": res.headers.get("access-control-allow-headers"),
    "access-control-expose-headers": res.headers.get("access-control-expose-headers"),
    "access-control-max-age": res.headers.get("access-control-max-age"),
  };

  console.log(`[Statut HTTP] ${res.status} ${res.statusText}`);
  console.log("[En-têtes CORS reçus]");
  for (const [key, value] of Object.entries(corsHeaders)) {
    console.log(`  ${key}: ${value || "(absent)"}`);
  }

  return {
    status: res.status,
    ok: res.status === 200 || res.status === 204,
    corsHeaders,
  };
}

async function main() {
  console.log("========================================");
  console.log("VÉRIFICATION CORS — Cloudflare R2");
  console.log(`Bucket public : ${BUCKET_PUBLIC_URL}`);
  console.log("========================================");

  // 1. Vérifier GET (lecture publique)
  const getResult = await checkCors("GET");

  // 2. Vérifier PUT (upload)
  const putResult = await checkCors("PUT", {
    "Access-Control-Request-Headers": "content-type,authorization",
  });

  // 3. Vérifier DELETE (suppression)
  const deleteResult = await checkCors("DELETE");

  // Résumé
  console.log("\n========================================");
  console.log("RÉSUMÉ DE LA VÉRIFICATION");
  console.log("========================================");

  const allowOriginGet = getResult.corsHeaders["access-control-allow-origin"];
  const allowOriginPut = putResult.corsHeaders["access-control-allow-origin"];

  const getOk = getResult.ok && allowOriginGet;
  const putOk = putResult.ok && allowOriginPut && putResult.corsHeaders["access-control-allow-methods"]?.includes("PUT");
  const deleteOk = deleteResult.ok && allowOriginPut && deleteResult.corsHeaders["access-control-allow-methods"]?.includes("DELETE");

  console.log(`GET (lecture)   : ${getOk ? "✅ OK" : "❌ NON CONFIGURÉ"}`);
  console.log(`PUT (upload)    : ${putOk ? "✅ OK" : "❌ NON CONFIGURÉ"}`);
  console.log(`DELETE (suppr.) : ${deleteOk ? "✅ OK" : "❌ NON CONFIGURÉ"}`);

  if (getOk && putOk && deleteOk) {
    console.log("\n🎉 Les CORS policies sont correctement configurées !");
  } else {
    console.log("\n⚠️ Les CORS policies ne sont PAS complètes.");
    console.log("➡️  Suivez le guide : docs/CLOUDFLARE_R2_CORS.md");
  }
}

main().catch((err) => {
  console.error("[Check CORS] Erreur :", err.message || err);
  process.exit(1);
});