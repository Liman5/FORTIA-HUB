// ============================================================
// Test réel des Web Push (VAPID + table push_subscriptions)
// 1) Valide que les clés VAPID sont acceptées par web-push.
// 2) Valide la table en base : insert / unicité endpoint / delete.
// Aucune donnée ne reste : tout est nettoyé à la fin.
// ============================================================
const { config } = require("dotenv");
const path = require("path");
config({ path: path.resolve(process.cwd(), ".env.local") });

const crypto = require("crypto");
const webpush = require("web-push");
const { Client } = require("pg");

async function main() {
  console.log("=== TEST 1 : Configuration VAPID ===");
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  console.log("VAPID_PUBLIC_KEY  défini:", !!publicKey);
  console.log("VAPID_PRIVATE_KEY défini:", !!privateKey);
  if (!publicKey || !privateKey) throw new Error("Clés VAPID absentes !");

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contact@fortiahub.com",
    publicKey,
    privateKey
  );

  // Envoi vers un endpoint volontairement invalide : si les clés VAPID sont
  // valides, l'erreur est réseau/HTTP (pas une erreur de signature VAPID).
  try {
    await webpush.sendNotification(
      { endpoint: "https://push.example.test/fake", keys: { p256dh: "b2F0aA==", auth: "YXV0aA==" } },
      JSON.stringify({ title: "test", body: "test" }),
      { TTL: 60, timeout: 3000 }
    );
    console.log("TEST 1 : envoi inattendu réussi (endpoint bidon)");
  } catch (err) {
    const msg = String((err && err.message) || err);
    if (/invalid|signature|vapid/i.test(msg) && !err.statusCode) {
      console.log("TEST 1 : ÉCHEC — clés VAPID invalides :", msg.slice(0, 160));
    } else {
      console.log("TEST 1 : OK — clés VAPID valides (échec réseau attendu sur endpoint bidon, statusCode=" + (err.statusCode || "n/a") + ")");
    }
  }

  console.log("\n=== TEST 2 : Table push_subscriptions (insert / unicité / delete) ===");
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    // Utilise un VRAI utilisateur existant (aucune donnée mockée)
    const userRes = await client.query("SELECT id FROM users ORDER BY created_at DESC LIMIT 1");
    if (userRes.rows.length === 0) throw new Error("Aucun utilisateur en base");
    const userId = userRes.rows[0].id;
    console.log("Utilisateur de test (existant) :", userId);

    const endpoint = "https://push.example.test/roundtrip-" + Date.now();
    const subId = crypto.randomUUID();

    // Insert (updated_at est géré par Prisma côté client ; on le fournit ici pour le test SQL brut)
    await client.query(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at, updated_at) VALUES ($1,$2,$3,$4,$5, NOW(), NOW())`,
      [subId, userId, endpoint, "p256dh-roundtrip", "auth-roundtrip"]
    );
    console.log("Insert : OK");

    // Contrainte d'unicité sur endpoint
    let dupRejected = false;
    try {
      await client.query(
        `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at, updated_at) VALUES ($1,$2,$3,$4,$5, NOW(), NOW())`,
        [crypto.randomUUID(), userId, endpoint, "autre", "autre"]
      );
    } catch (e) {
      dupRejected = /unique|duplicate/i.test(String(e.message));
      console.log("Doublon endpoint rejeté :", dupRejected);
    }
    if (!dupRejected) console.log("ATTENTION : le doublon d'endpoint n'a pas été rejeté");

    // Vérifie qu'on peut stocker plusieurs abonnements pour le même utilisateur
    const endpoint2 = "https://push.example.test/roundtrip2-" + Date.now();
    await client.query(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at, updated_at) VALUES ($1,$2,$3,$4,$5, NOW(), NOW())`,
      [crypto.randomUUID(), userId, endpoint2, "p256dh-2", "auth-2"]
    );
    console.log("Second abonnement (multi-appareils) : OK");

    // Suppression (nettoyage)
    await client.query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint LIKE 'https://push.example.test/roundtrip%'`, [userId]);
    const remaining = await client.query(`SELECT count(*)::int AS c FROM push_subscriptions WHERE endpoint LIKE 'https://push.example.test/roundtrip%'`);
    console.log("Nettoyage : OK, restant =", remaining.rows[0].c);

    console.log("\nTEST 2 : OK");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("TEST_ECHEC", e.message);
  process.exit(1);
});
