import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { isEmailVerificationRequired } from "../../lib/services/emailVerification";

const ROOT = process.cwd();
const initialMode = process.env.EMAIL_VERIFICATION_MODE;
const initialKey = process.env.RESEND_API_KEY;

function setEnv(mode: string | undefined, resendKey: string | undefined): void {
  if (mode === undefined) delete process.env.EMAIL_VERIFICATION_MODE;
  else process.env.EMAIL_VERIFICATION_MODE = mode;

  if (resendKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = resendKey;
}

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("Interrupteur temporaire de vérification d'e-mail", () => {
  afterEach(() => {
    setEnv(initialMode, initialKey);
  });

  it("mode 'off' SANS Resend → register passe sans jeton de vérification", () => {
    setEnv("off", undefined);
    assert.equal(isEmailVerificationRequired(), false);
  });

  it("mode 'off' SANS Resend (clé vide) → register passe sans jeton", () => {
    setEnv("off", "");
    assert.equal(isEmailVerificationRequired(), false);
  });

  it("mode 'off' AVEC RESEND_API_KEY → jeton exigé (la clé reprend le dessus)", () => {
    setEnv("off", "re_test_123");
    assert.equal(isEmailVerificationRequired(), true);
  });

  it("mode absent → jeton exigé (comportement par défaut)", () => {
    setEnv(undefined, undefined);
    assert.equal(isEmailVerificationRequired(), true);
  });

  it("mode vide, inconnu ou mal orthographié → jeton exigé (échec fermé)", () => {
    setEnv("", undefined);
    assert.equal(isEmailVerificationRequired(), true);
    setEnv("disabled", undefined);
    assert.equal(isEmailVerificationRequired(), true);
    setEnv("OFFF", undefined);
    assert.equal(isEmailVerificationRequired(), true);
  });

  it("mode 'required' explicite → jeton exigé", () => {
    setEnv("required", undefined);
    assert.equal(isEmailVerificationRequired(), true);
  });

  it("la route d'inscription applique bien cet interrupteur", () => {
    const source = readSource("app/api/auth/route.ts");
    assert.match(source, /isEmailVerificationRequired\(\)/);
    assert.match(source, /logger\.warn\("email_verification_disabled"/);
    // send-otp et verify-otp répondent sans générer de code quand c'est désactivé.
    const occurrences = source.match(/verificationDisabled: true/g) || [];
    assert.ok(occurrences.length >= 2, "send-otp et verify-otp doivent court-circuiter");
  });

  it("la route /api/auth/config n'expose que le drapeau public", () => {
    const source = readSource("app/api/auth/config/route.ts");
    assert.match(source, /emailVerificationRequired: isEmailVerificationRequired\(\)/);
    assert.equal(/platformConfig|secret|password/i.test(source), false);
  });
});
