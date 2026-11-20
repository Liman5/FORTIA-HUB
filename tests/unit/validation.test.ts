import test from "node:test";
import assert from "node:assert/strict";
import { checkoutSchema, refundSchema, subscriptionPlanSchema } from "../../lib/validation/payments";
import { lessonProgressSchema, quizAttemptSchema } from "../../lib/validation/academy";
import { writeActionSchemas } from "../../lib/validation/write";
import { parseOrThrow } from "../../lib/validation/common";
import { AppError } from "../../lib/server/errors";

const COURSE_ID = "11111111-1111-4111-8111-111111111111";

test("checkout : accepte un article formation valide", () => {
  const parsed = checkoutSchema.parse({
    items: [{ type: "course", id: COURSE_ID }],
    provider: "sandbox",
  });
  assert.equal(parsed.items.length, 1);
});

test("checkout : rejette un identifiant non UUID", () => {
  const result = checkoutSchema.safeParse({ items: [{ type: "course", id: "abc" }] });
  assert.equal(result.success, false);
});

test("checkout : exige planCode et centerId pour le stockage", () => {
  const result = checkoutSchema.safeParse({ items: [{ type: "storage" }] });
  assert.equal(result.success, false);
  if (!result.success) {
    const paths = result.error.issues.map((issue) => issue.path.join("."));
    assert.ok(paths.includes("items.0.planCode"));
    assert.ok(paths.includes("items.0.centerId"));
  }
});

test("checkout : ignore un prix envoyé par le client (champ inconnu)", () => {
  const parsed = checkoutSchema.parse({
    items: [{ type: "course", id: COURSE_ID, price: 0.01, amountUsd: 0.01 } as never],
  });
  assert.deepEqual(parsed.items[0], { type: "course", id: COURSE_ID });
});

test("refund : motif obligatoire et montant entier", () => {
  assert.equal(
    refundSchema.safeParse({ orderId: COURSE_ID, reason: "ok", amountMinor: 12.5 }).success,
    false
  );
  assert.equal(refundSchema.safeParse({ orderId: COURSE_ID }).success, false);
});

test("plan d'abonnement : code normalisé et montant positif", () => {
  const parsed = subscriptionPlanSchema.parse({
    code: "PRO-ANNUEL",
    name: "Pro annuel",
    amountMinor: 9900,
    interval: "year",
  });
  assert.equal(parsed.code, "pro-annuel");
  assert.equal(parsed.amountMinor, 9900);
});

test("academy : progression et quiz validés", () => {
  assert.equal(
    lessonProgressSchema.safeParse({ courseId: COURSE_ID, lessonId: COURSE_ID }).success,
    true
  );
  assert.equal(
    quizAttemptSchema.safeParse({ courseId: COURSE_ID, answers: [] }).success,
    false
  );
});

test("parseOrThrow produit une AppError de validation avec les chemins", () => {
  assert.throws(
    () => parseOrThrow(checkoutSchema, { items: [] }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);

      assert.equal(error.status, 400);
      assert.equal(error.code, "VALIDATION_ERROR");
      assert.ok(Array.isArray(error.details) && error.details.length > 0);
      return true;
    }
  );
});

test("kyc-set-lock exige kycId (et non un id générique)", () => {
  const schema = writeActionSchemas["kyc-set-lock"];
  assert.equal(schema.safeParse({ id: COURSE_ID }).success, false);
  assert.equal(schema.safeParse({ kycId: COURSE_ID }).success, true);
});

test("approve-kyc-full accepte un id OU un email", () => {
  const schema = writeActionSchemas["approve-kyc-full"];
  assert.equal(schema.safeParse({ id: COURSE_ID }).success, true);
  assert.equal(schema.safeParse({ email: "membre@example.com" }).success, true);
  assert.equal(schema.safeParse({}).success, false);
});
