import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dispatchWriteAction } from "../../lib/modules/write/dispatch";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const HANDLERS_DIR = path.join(ROOT, "lib/modules/write/handlers");
const ROUTE_SRC = fs.readFileSync(
  path.join(ROOT, "app/api/platform/write/route.ts"),
  "utf8"
);

const DEPRECATED = [
  "submit-order",
  "register-free-purchase",
  "register-instructor-purchase",
  "pay-training-center-fee",
];

function actionsByDomain(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const file of fs.readdirSync(HANDLERS_DIR).filter((name) => name.endsWith(".ts"))) {
    const source = fs.readFileSync(path.join(HANDLERS_DIR, file), "utf8");
    result[file] = [...source.matchAll(/case "([a-z0-9-]+)":/g)].map((match) => match[1]);
  }
  return result;
}

test("les 54 actions actives sont réparties sans doublon", () => {
  const byDomain = actionsByDomain();
  const all = Object.values(byDomain).flat();
  assert.equal(all.length, 54, `actions trouvées : ${all.length}`);
  assert.equal(new Set(all).size, 54, "une action est présente dans deux domaines");
  for (const deprecated of DEPRECATED) {
    assert.equal(all.includes(deprecated), false, `${deprecated} ne doit plus avoir de handler`);
  }
});

test("chaque domaine possède une responsabilité identifiable", () => {
  const byDomain = actionsByDomain();
  const expected: Record<string, number> = {
    "academy.ts": 9,
    "centers.ts": 5,
    "content.ts": 6,
    "finance.ts": 3,
    "kyc.ts": 6,
    "learning.ts": 5,
    "marketplace.ts": 5,
    "notifications.ts": 2,
    "profiles.ts": 3,
    "services.ts": 5,
    "support.ts": 1,
    "vendors.ts": 4,
  };
  assert.deepEqual(
    Object.fromEntries(Object.entries(byDomain).map(([file, actions]) => [file, actions.length])),
    expected
  );
});

test("la route centrale ne contient plus de logique métier", () => {
  assert.equal(/case "[a-z0-9-]+":/.test(ROUTE_SRC), false);
  assert.ok(ROUTE_SRC.length < 10000, `route trop volumineuse : ${ROUTE_SRC.length}`);
  for (const deprecated of DEPRECATED) {
    assert.ok(ROUTE_SRC.includes(`"${deprecated}"`), `${deprecated} doit rester neutralisée`);
  }
});

test("le dispatch ignore une action inconnue sans écrire en base", async () => {
  const response = await dispatchWriteAction("action-inexistante", {
    req: {} as never,
    auth: {} as never,
    data: {},
  });
  assert.equal(response, null);
});

test("le dispatch route les actions publiques vers leur domaine", async () => {
  const context = { req: {} as never, auth: {} as never, data: {} };
  const support = await dispatchWriteAction("submit-support", context);
  assert.equal(support?.status, 400);
  const quote = await dispatchWriteAction("submit-quote", context);
  assert.equal(quote?.status, 400);
  const vendor = await dispatchWriteAction("submit-vendor-app", context);
  assert.equal(vendor?.status, 400);
});
