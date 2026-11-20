// ============================================================
// FORTIA HUB — Tests de la Phase 1A (autorisation des écritures)
// ------------------------------------------------------------
// 1. Vérifications STATIQUES : chaque action de /api/platform/write doit
//    posséder une politique explicite (et inversement).
// 2. Tests HTTP ANONYMES (exécutés sans cookie) : actions privées → 401,
//    actions publiques → 400 (validation), aucune fuite d'erreur interne.
// 3. Tests AUTHENTIFIÉS optionnels (cookies via variables d'environnement).
//
// Exécution :
//   node scripts/test-write-authorization.mjs
//   BASE_URL=http://localhost:3100 node scripts/test-write-authorization.mjs
//
// Tests authentifiés (optionnels) :
//   TEST_MEMBER_COOKIE="fh_session=..."
//   TEST_MEMBER_ID="<uuid du membre>"
//   TEST_OTHER_MEMBER_ID="<uuid d'un autre membre>"
//   TEST_OTHER_COURSE_ID="<uuid d'une formation d'un autre formateur>"
//   TEST_SUPERVISOR_COOKIE="..."   (admin superviseur, lecture seule)
//   TEST_KYC_ADMIN_COOKIE="..."    (admin KYC, sans droits finance)
//   TEST_ADMIN_COOKIE="..."        (admin général)
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = process.env.BASE_URL || "http://localhost:3100";
const PUBLIC_ACTIONS = ["submit-quote", "submit-vendor-app", "submit-support", "order-service", "submit-order"];
const PROTECTED_ACTIONS = [
  "update-profile",
  "approve-payout",
  "delete-course",
  "update-store",
  "submit-course-by-instructor",
  "update-product",
  "approve-kyc",
  "delete-training-center",
  "ban-training-center",
  "sync-user-learning",
  "mark-notification-read",
  "create-product",
  "register-free-purchase",
  "create-course",
  "create-banner",
  "save-commission-rule",
  "register-instructor-purchase",
  "submit-payout",
  "issue-certificate",
  "submit-kyc",
  "rate-course",
  "moderate-content",
  "update-training-center-config",
  "create-service",
];

let passed = 0;
let failed = 0;
const failures = [];

function ok(label) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}
function ko(label, detail) {
  failed += 1;
  failures.push(`${label} — ${detail}`);
  console.log(`  ✗ ${label} — ${detail}`);
}
function check(condition, label, detail = "") {
  if (condition) ok(label);
  else ko(label, detail || "condition fausse");
}

// ============ 1. VÉRIFICATIONS STATIQUES ============
console.log("\n=== 1. Matrice d'autorisation (statique) ===");

const routeSrc = fs.readFileSync(path.join(ROOT, "app/api/platform/write/route.ts"), "utf8");
const authSrc = fs.readFileSync(path.join(ROOT, "lib/server/writeAuthorization.ts"), "utf8");

const routeActions = new Set([...routeSrc.matchAll(/case "([a-z0-9-]+)":/g)].map((m) => m[1]));
const policyActions = new Set(
  [...authSrc.matchAll(/^\s{2}"([a-z0-9-]+)":\s*\{\s*actor:/gm)].map((m) => m[1])
);

check(routeActions.size === 58, "58 actions dans la route", `trouvées: ${routeActions.size}`);
check(policyActions.size === 58, "58 politiques déclarées", `trouvées: ${policyActions.size}`);

const missing = [...routeActions].filter((a) => !policyActions.has(a));
const extra = [...policyActions].filter((a) => !routeActions.has(a));
check(missing.length === 0, "Aucune action sans politique", `manquantes: ${missing.join(", ")}`);
check(extra.length === 0, "Aucune politique orpheline", `orphelines: ${extra.join(", ")}`);

const policyLines = authSrc
  .split("\n")
  .filter((line) => /^\s{2}"[a-z0-9-]+":\s*\{\s*actor:/.test(line));

let badActor = [];
let adminNoDomain = [];
let publicNoLimit = [];
for (const line of policyLines) {
  const action = line.match(/"([a-z0-9-]+)"/)?.[1] || "?";
  const actor = line.match(/actor:\s*"([a-z]+)"/)?.[1] || "";
  if (!["public", "user", "admin"].includes(actor)) badActor.push(action);
  if (actor === "admin" && !line.includes("adminDomain")) adminNoDomain.push(action);
  if (actor === "public" && !line.includes("limit:") && !line.includes("limit :")) {
    // "submit-order" and others must have a limit.
    if (!/limit\s*:/.test(line)) publicNoLimit.push(action);
  }
}
check(badActor.length === 0, "Tous les acteurs sont valides", badActor.join(", "));
check(adminNoDomain.length === 0, "Toutes les actions admin ont un domaine", adminNoDomain.join(", "));
check(publicNoLimit.length === 0, "Toutes les actions publiques sont limitées", publicNoLimit.join(", "));

// ============ 2. TESTS HTTP ANONYMES ============
console.log("\n=== 2. Tests HTTP anonymes ===");

async function post(action, data, headers = {}) {
  try {
    const res = await fetch(`${BASE_URL}/api/platform/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ action, data }),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, text, json };
  } catch (error) {
    return { status: 0, text: String(error?.message || error), json: null };
  }
}

function noLeak(text) {
  return !/prisma|invalid input|P20\d\d|node_modules|at Object\./i.test(text);
}

const health = await fetch(`${BASE_URL}/api/version`).catch(() => null);
if (!health || !health.ok) {
  console.log(`  ⚠️ Serveur indisponible sur ${BASE_URL} : tests HTTP ignorés.`);
  console.log("     Démarrez : npm run build ; npx next start -p 3100");
} else {
  const unknown = await post("action-inconnue-test", {});
  check(unknown.status === 400, "Action inconnue → 400", `status=${unknown.status}`);
  check(
    unknown.json?.code === "UNKNOWN_ACTION",
    "Action inconnue → code UNKNOWN_ACTION",
    JSON.stringify(unknown.json)
  );

  for (const action of PROTECTED_ACTIONS) {
    const res = await post(action, { id: "00000000-0000-0000-0000-000000000000" });
    check(
      res.status === 401,
      `${action} anonyme → 401`,
      `status=${res.status} body=${res.text.slice(0, 120)}`
    );
  }

  for (const action of ["update-profile", "approve-payout", "delete-course"]) {
    const res = await post(action, { id: "00000000-0000-0000-0000-000000000000" });
    check(noLeak(res.text), `${action} : aucune fuite technique`, res.text.slice(0, 160));
  }

  const publicCases = [
    ["submit-quote", {}],
    ["submit-vendor-app", {}],
    ["submit-support", {}],
    ["order-service", {}],
    ["submit-order", {}],
  ];
  for (const [action, payload] of publicCases) {
    const res = await post(action, payload);
    check(res.status === 400, `${action} payload invalide → 400`, `status=${res.status}`);
    check(res.status !== 401, `${action} reste public (pas 401)`, `status=${res.status}`);
  }

  const orderMissing = await post("submit-order", {
    buyerEmail: "test@example.com",
    buyerName: "Test",
    courseIds: ["00000000-0000-0000-0000-000000000000"],
  });
  check(
    orderMissing.status === 404,
    "submit-order formation inexistante → 404 (aucune écriture)",
    `status=${orderMissing.status}`
  );

  let throttled = false;
  for (let i = 0; i < 22; i += 1) {
    const res = await post("submit-quote", {});
    if (res.status === 429) {
      throttled = true;
      break;
    }
  }
  check(throttled, "Limitation de débit des actions publiques (429)", "aucun 429 après 22 requêtes");
}

// ============ 3. TESTS AUTHENTIFIÉS (optionnels) ============
console.log("\n=== 3. Tests authentifiés (optionnels) ===");
const memberCookie = process.env.TEST_MEMBER_COOKIE || "";
const supervisorCookie = process.env.TEST_SUPERVISOR_COOKIE || "";
const kycAdminCookie = process.env.TEST_KYC_ADMIN_COOKIE || "";
const adminCookie = process.env.TEST_ADMIN_COOKIE || "";
const memberId = process.env.TEST_MEMBER_ID || "";
const otherMemberId = process.env.TEST_OTHER_MEMBER_ID || "";
const otherCourseId = process.env.TEST_OTHER_COURSE_ID || "";

if (!memberCookie && !supervisorCookie && !kycAdminCookie && !adminCookie) {
  console.log(
    "  ⏭  Ignorés : aucun cookie fourni. Variables : TEST_MEMBER_COOKIE, TEST_MEMBER_ID,\n" +
      "     TEST_OTHER_MEMBER_ID, TEST_OTHER_COURSE_ID, TEST_SUPERVISOR_COOKIE,\n" +
      "     TEST_KYC_ADMIN_COOKIE, TEST_ADMIN_COOKIE."
  );
} else {
  if (memberCookie) {
    const asMember = (action, data) => post(action, data, { Cookie: memberCookie });

    if (otherMemberId) {
      const res = await asMember("update-profile", { id: otherMemberId, name: "Intrusion" });
      check(res.status === 403, "Membre → profil d'un autre membre refusé (403)", `status=${res.status}`);
    } else {
      console.log("  ⏭  TEST_OTHER_MEMBER_ID manquant : test « profil d'autrui » ignoré.");
    }

    const payout = await asMember("approve-payout", {
      id: "00000000-0000-0000-0000-000000000000",
    });
    check(payout.status === 403, "Membre → approbation de retrait refusée (403)", `status=${payout.status}`);

    if (otherCourseId) {
      const course = await asMember("update-course", { id: otherCourseId, title: "Intrusion" });
      check(
        [403, 404].includes(course.status),
        "Formateur → formation d'autrui refusée (403/404)",
        `status=${course.status}`
      );
    } else {
      console.log("  ⏭  TEST_OTHER_COURSE_ID manquant : test « formation d'autrui » ignoré.");
    }

    // Mise à jour SANS champ : acceptée, aucune donnée modifiée.
    const self = await asMember("update-profile", memberId ? { id: memberId } : {});
    check(self.status === 200, "Membre → sa propre fiche acceptée (200)", `status=${self.status}`);
  }

  if (supervisorCookie) {
    const res = await post("create-banner", { title: "Test" }, { Cookie: supervisorCookie });
    check(res.status === 403, "Superviseur → écriture refusée (403)", `status=${res.status}`);
  }

  if (kycAdminCookie) {
    const res = await post(
      "approve-payout",
      { id: "00000000-0000-0000-0000-000000000000" },
      { Cookie: kycAdminCookie }
    );
    check(res.status === 403, "Admin KYC → approbation de retrait refusée (403)", `status=${res.status}`);
  }

  if (adminCookie) {
    // Action finance autorisée : la validation métier (101 %) répond 400,
    // ce qui prouve que l'autorisation est passée.
    const res = await post(
      "save-commission-rule",
      { scope: "general", mode: "percent", value: 101 },
      { Cookie: adminCookie }
    );
    check(res.status === 400, "Admin général → action finance autorisée (400 métier)", `status=${res.status}`);
  }
}

// ============ RÉSULTAT ============
console.log(`\n=== RÉSULTAT : ${passed} réussis, ${failed} échoués ===`);
if (failed > 0) {
  console.log("Échecs :");
  for (const failure of failures) console.log(` - ${failure}`);
  process.exitCode = 1;
}


