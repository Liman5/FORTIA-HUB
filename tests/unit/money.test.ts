import test from "node:test";
import assert from "node:assert/strict";
import {
  formatMoney,
  fromMinorUnits,
  normalizeCurrency,
  sameAmount,
  toMinorUnits,
} from "../../lib/modules/payments/money";

test("USD : conversion en unités mineures sans flottant", () => {
  assert.equal(toMinorUnits(12.5, "USD"), 1250);
  assert.equal(toMinorUnits("0.1", "USD") + toMinorUnits("0.2", "USD"), 30);
  assert.equal(fromMinorUnits(1250, "USD"), 12.5);
});

test("XOF : devise sans subdivision (exposant 0)", () => {
  assert.equal(toMinorUnits(5000, "XOF"), 5000);
  assert.equal(fromMinorUnits(5000, "XOF"), 5000);
});

test("Devise inconnue ramenée à USD", () => {
  assert.equal(normalizeCurrency("xyz"), "USD");
  assert.equal(normalizeCurrency("xof"), "XOF");
});

test("sameAmount compare devise + unités mineures", () => {
  assert.equal(sameAmount(1250, "USD", 1250, "usd"), true);
  assert.equal(sameAmount(1250, "USD", 1251, "USD"), false);
  assert.equal(sameAmount(1000, "USD", 1000, "EUR"), false);
});

test("formatMoney reste lisible", () => {
  assert.match(formatMoney(1250, "USD"), /12,50/);
});
