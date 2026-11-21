import test from "node:test";
import assert from "node:assert/strict";
import { getPaymentProvider, listPaymentProviders } from "../../lib/modules/payments/providers";

test("les fournisseurs de paiement sont enregistrés", () => {
  const codes = listPaymentProviders().map((provider) => provider.code);
  for (const expected of ["stripe", "paystack", "flutterwave", "sandbox"]) {
    assert.ok(codes.includes(expected), `${expected} absent`);
  }
});

test("un fournisseur inconnu n'est jamais retourné", () => {
  assert.equal(getPaymentProvider("wave-inconnu"), null);
});
