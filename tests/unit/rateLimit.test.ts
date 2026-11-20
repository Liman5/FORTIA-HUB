import test from "node:test";
import assert from "node:assert/strict";
import { rateLimit } from "../../lib/server/rateLimit";
import { RATE_LIMITS } from "../../lib/server/rateLimits";

test("compteur mémoire : autorise puis bloque dans la fenêtre", () => {
  const key = `unit:${Math.random()}`;
  assert.equal(rateLimit(key, 2, 60_000), null);
  assert.equal(rateLimit(key, 2, 60_000), null);
  const wait = rateLimit(key, 2, 60_000);
  assert.ok(typeof wait === "number" && wait > 0);
});

test("les règles centralisées couvrent les opérations sensibles", () => {
  for (const scope of [
    "authLogin",
    "authRegister",
    "authPasswordReset",
    "checkout",
    "refund",
    "kyc",
    "certificate",
    "adminSensitive",
  ] as const) {
    assert.ok(RATE_LIMITS[scope].limit > 0);
    assert.ok(RATE_LIMITS[scope].windowMs >= 60_000);
  }
});
