import test from "node:test";
import assert from "node:assert/strict";
import {
  AppError,
  toErrorResponse,
  validationError,
} from "../../lib/server/errors";

const context = { requestId: "req-test-1", route: "/api/test" };

async function bodyOf(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

test("AppError expose statut, code, message et requestId", async () => {
  const response = toErrorResponse(new AppError(403, "FORBIDDEN", "Interdit."), context);
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("x-request-id"), "req-test-1");
  const body = await bodyOf(response);
  assert.equal(body.error, "Interdit.");
  assert.equal(body.code, "FORBIDDEN");
  assert.equal(body.requestId, "req-test-1");
});

test("erreur de validation : détails de champs, sans valeur envoyée", async () => {
  const response = toErrorResponse(
    validationError([{ path: "email", message: "Adresse e-mail invalide." }]),
    context
  );
  const body = await bodyOf(response);
  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.deepEqual(body.details, [{ path: "email", message: "Adresse e-mail invalide." }]);
});

test("erreur interne : aucun détail technique renvoyé", async () => {
  const response = toErrorResponse(
    new Error("SELECT * FROM users WHERE password_hash='secret'"),
    context
  );
  const body = await bodyOf(response);
  assert.equal(response.status, 500);
  assert.equal(body.error, "Erreur interne. Veuillez réessayer.");
  assert.equal(JSON.stringify(body).includes("SELECT"), false);
  assert.equal(JSON.stringify(body).includes("secret"), false);
});

test("erreur Prisma connue : 404 sans détail SQL", async () => {
  const prismaError = Object.assign(new Error("Record not found"), { code: "P2025" });
  const response = toErrorResponse(prismaError, context);
  assert.equal(response.status, 404);
  assert.equal((await bodyOf(response)).code, "NOT_FOUND");
});
