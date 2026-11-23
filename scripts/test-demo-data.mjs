// ============================================================
// FORTIA HUB — TESTS DES DONNEES DE DEMONSTRATION
// ------------------------------------------------------------
// Verifie :
//   1. l'acces admin (401 anonyme) sur /api/admin/demo-data ;
//   2. la coherence reelle en base (compteurs is_demo) ;
//   3. la presence des contenus de demonstration dans les API
//      publiques normales (bootstrap, marketplace).
//
// Prerequis : serveur `next start -p 3100` et seed execute
// (`npm run seed:demo`).
// ============================================================

import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const BASE = process.env.TEST_BASE_URL || "http://localhost:3100";
let passed = 0;
let failed = 0;

function check(label, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`OK   ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/* --------------------------- 1. Authentification -------------------------- */
const getAnon = await fetch(`${BASE}/api/admin/demo-data`);
check("GET anonyme refusé (401)", getAnon.status === 401, `status=${getAnon.status}`);

const delAnon = await fetch(`${BASE}/api/admin/demo-data`, {
  method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ confirm: "SUPPRIMER" }),
});
check("DELETE anonyme refusé (401)", delAnon.status === 401, `status=${delAnon.status}`);

const badToken = await fetch(`${BASE}/api/admin/demo-data`, {
  headers: { Authorization: "Bearer jeton-invalide" },
});
check(
  "Jeton invalide refusé (401/403)",
  badToken.status === 401 || badToken.status === 403,
  `status=${badToken.status}`
);

const noConfirm = await fetch(`${BASE}/api/admin/demo-data`, {
  method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});
check(
  "Suppression sans confirmation refusée",
  noConfirm.status === 401 || noConfirm.status === 400,
  `status=${noConfirm.status}`
);

/* ---------------------------- 2. Coherence en base ------------------------ */
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const counts = await client.query(`
  select
    (select count(*)::int from course_categories where is_demo) as categories,
    (select count(*)::int from courses where is_demo) as courses,
    (select count(*)::int from course_lessons l
       join course_chapters c on c.id = l.chapter_id
       join courses co on co.id = c.course_id
      where co.is_demo) as lessons,
    (select count(*)::int from stores where is_demo) as stores,
    (select count(*)::int from products where is_demo) as products,
    (select count(*)::int from training_centers where is_demo) as centers,
    (select count(*)::int from freelance_profiles where is_demo) as freelances,
    (select count(*)::int from site_banners where is_demo) as banners
`);
const db = counts.rows[0];

check("10 formations de démonstration", db.courses === 10, `courses=${db.courses}`);
check("40 leçons de démonstration", db.lessons === 40, `lessons=${db.lessons}`);
check("14 produits de démonstration", db.products === 14, `products=${db.products}`);
check("3 boutiques de démonstration", db.stores === 3, `stores=${db.stores}`);
check("3 centres de démonstration", db.centers === 3, `centers=${db.centers}`);
check("4 profils de démonstration", db.freelances === 4, `freelances=${db.freelances}`);
check("3 bannières de démonstration", db.banners === 3, `banners=${db.banners}`);
check("6 catégories de démonstration", db.categories === 6, `categories=${db.categories}`);

// Aucune fausse vérification KYC sur les profils de démonstration.
const kyc = await client.query(
  "select count(*)::int as n from freelance_profiles where is_demo and (kyc_verified or can_sell_services)"
);
check("Aucun profil démo faussement vérifié", kyc.rows[0].n === 0, `n=${kyc.rows[0].n}`);

// Aucune fausse note ni faux nombre d'apprenants.
const fake = await client.query(`
  select count(*)::int as n from courses
   where is_demo and (rating > 0 or reviews_count > 0 or students_count > 0)
`);
check(
  "Aucune fausse note/apprenant sur les formations démo",
  fake.rows[0].n === 0,
  `n=${fake.rows[0].n}`
);

// Les contenus démo sont publiés (donc visibles par les pages normales).
const published = await client.query(
  "select count(*)::int as n from products where is_demo and is_published and is_approved"
);
check("Produits démo publiés et approuvés", published.rows[0].n === 14, `n=${published.rows[0].n}`);

// Chaque produit démo pointe vers une boutique de démonstration.
const linked = await client.query(`
  select count(*)::int as n
    from products p join stores s on s.id = p.store_id
   where p.is_demo and s.is_demo
`);
check(
  "Produits démo rattachés à une boutique démo",
  linked.rows[0].n === 14,
  `n=${linked.rows[0].n}`
);

await client.end();


/* ------------------- 3. Visibilite via les API publiques ------------------ */
const bootstrap = await fetch(`${BASE}/api/bootstrap`);
const bootstrapBody = await bootstrap.text();
check("GET /api/bootstrap accessible", bootstrap.status === 200, `status=${bootstrap.status}`);
check(
  "Les formations démo apparaissent dans l'API",
  bootstrapBody.includes("demo-lancer-son-business-en-ligne"),
  "formation absente de /api/bootstrap"
);
check(
  "Les produits démo apparaissent dans l'API",
  bootstrapBody.includes("demo-guide-freelancing"),
  "produit absent de /api/bootstrap"
);

const marketplace = await fetch(`${BASE}/api/marketplace`);
const marketplaceBody = await marketplace.text();
check("GET /api/marketplace accessible", marketplace.status === 200, `status=${marketplace.status}`);
check(
  "Pas de fuite de notes internes de modération",
  !marketplaceBody.includes("moderationReason"),
  "moderationReason exposé"
);
check(
  "Pas de chemin de stockage privé exposé",
  !marketplaceBody.includes("product-files/"),
  "clé R2 privée exposée"
);

/* -------------------------------- Resultat ------------------------------- */
console.log("");
console.log(`RESULTAT : ${passed} reussis / ${failed} echoue(s)`);
if (failed > 0) process.exitCode = 1;

