/**
 * FORTIA HUB — TEST DE FUMÉE (à exécuter après CHAQUE modification)
 * ----------------------------------------------------------------
 * Vérifie en une commande que l'application est toujours debout :
 *   1. les pages publiques répondent
 *   2. les endpoints par domaine répondent et renvoient les bons champs
 *   3. les données sensibles ne sont PAS exposées publiquement
 *   4. les accès protégés refusent bien les visiteurs anonymes
 *
 * Usage :
 *   npm run dev            (dans un premier terminal)
 *   node scripts/smoke-test.mjs
 *
 * Sortie : une ligne par contrôle (OK / FAIL) + code de sortie 1 si échec,
 * ce qui permet de l'utiliser dans une chaîne d'intégration continue.
 */
const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000";

let failures = 0;
const results = [];

function check(label, ok, detail = "") {
  if (!ok) failures++;
  results.push(`${ok ? "OK  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
}

async function get(path, options = {}) {
  try {
    const res = await fetch(BASE + path, { redirect: "manual", ...options });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, ko: +(text.length / 1024).toFixed(2), json, text };
  } catch (error) {
    return { status: 0, ko: 0, json: null, text: "", error: error.message };
  }
}

/* ---------- 1. Pages publiques ---------- */
for (const path of ["/", "/academy", "/marketplace", "/admin", "/instructor", "/vendor"]) {
  const r = await get(path);
  check(`page ${path}`, r.status === 200, `HTTP ${r.status}`);
}

/* ---------- 2. Endpoints par domaine ---------- */
const catalog = await get("/api/catalog?limit=24");
check("/api/catalog", catalog.status === 200 && !!catalog.json?.data);
check("catalogue : pagination exposée", typeof catalog.json?.data?.total === "number");
check(
  "catalogue : liste allégée (chapitres exclus)",
  (catalog.json?.data?.courses || []).every((c) => Array.isArray(c.chapters) && c.chapters.length === 0)
);

const firstCourse = catalog.json?.data?.courses?.[0];
if (firstCourse?.id) {
  const detail = await get(`/api/catalog/course/${encodeURIComponent(firstCourse.id)}`);
  check("/api/catalog/course/[id]", detail.status === 200);
  check("détail : chapitres présents", Array.isArray(detail.json?.data?.chapters));
}

for (const path of ["/api/marketplace", "/api/services", "/api/site"]) {
  const r = await get(path);
  check(path, r.status === 200 && !!r.json?.data);
}

/* ---------- 2bis. Fiche produit /product/[slug] ---------- */
const market = await get("/api/marketplace");
const firstProduct = (market.json?.data?.products || [])[0];
if (firstProduct?.slug) {
  const page = await get(`/product/${encodeURIComponent(firstProduct.slug)}`);
  check("/product/[slug] (produit réel)", page.status === 200, `HTTP ${page.status}`);
  check(
    "fiche produit : bouton d'achat présent",
    page.text.includes("Ajouter au panier") || page.text.includes("Acheter maintenant")
  );
  check("fiche produit : bloc des livrables présent", page.text.includes("Fichiers livrables"));
} else {
  check("produit de test disponible", false, "aucun produit publié en base");
}
const missingProduct = await get("/product/slug-inexistant-xyz");
check("/product/[slug] inexistant → 404", missingProduct.status === 404, `HTTP ${missingProduct.status}`);

/* ---------- 3. Aucune donnée sensible publiquement ---------- */
const sync = await get("/api/platform/sync");
check("/api/platform/sync", sync.status === 200);
for (const field of [
  "marketplaceOrders",
  "payoutRequests",
  "kycSubmissions",
  "postPurchaseSupport",
  "vendorApplications",
  "serviceQuotes",
  "instructorCommissions",
  "platformConfig",
]) {
  check(`sync : '${field}' absent`, !(field in (sync.json?.data || {})));
}
check("sync : aucun numéro de compte de vendeur", !sync.text.includes("accountNumber"));
check("sync : aucune coordonnée de retrait", !sync.text.includes("payoutInfo"));

/* ---------- 4. Accès protégés ---------- */
const adminSync = await get("/api/platform/admin-sync");
check("admin-sync refuse l'anonyme", adminSync.status === 401, `HTTP ${adminSync.status}`);

const signedUrl = await get("/api/storage/signed-url", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key: "kyc-documents/test/identite.jpg" }),
});
check("stockage privé refuse l'anonyme", signedUrl.status === 401, `HTTP ${signedUrl.status}`);

const presign = await get("/api/storage/presign-upload", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    folder: "course-media",
    fileName: "x.mp4",
    contentType: "video/mp4",
    entityId: "e2e",
    size: 1024,
  }),
});
check("téléversement refuse l'anonyme", presign.status === 401, `HTTP ${presign.status}`);

/* ---------- Rapport ---------- */
console.log(results.join("\n"));
console.log(
  failures === 0
    ? `\n>>> ${results.length} contrôles : TOUT EST OK`
    : `\n>>> ${failures} CONTRÔLE(S) EN ÉCHEC sur ${results.length}`
);
process.exit(failures === 0 ? 0 : 1);
