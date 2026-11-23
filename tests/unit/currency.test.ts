import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CFA_RATE,
  formatFcfa,
  formatPricePair,
  resolveMoneyConfig,
  usdToFcfa,
} from "../../lib/data/currency";

/** Normalise les espaces insécables produits par toLocaleString("fr-FR"). */
const norm = (value: string) => value.replace(/[\s\u00a0\u202f]/g, " ");

test("le FCFA est la monnaie principale affichée", () => {
  assert.equal(norm(formatFcfa(25)), "15 000 FCFA");
  assert.equal(norm(formatFcfa(49.9, 600)), "29 940 FCFA");
  assert.equal(formatFcfa(0), "Gratuit");
});

test("le taux configuré pilote l'affichage, jamais les montants en base", () => {
  assert.equal(usdToFcfa(10), 6000);
  assert.equal(usdToFcfa(10, 655), 6550);
});

test("configuration par défaut : FCFA seul, USD désactivé", () => {
  assert.equal(DEFAULT_CFA_RATE, 600);
  const config = resolveMoneyConfig(undefined);
  assert.deepEqual(config, { rate: 600, showSecondaryUsd: false });
});

test("un taux invalide retombe sur la valeur par défaut", () => {
  assert.equal(resolveMoneyConfig({ fcfaRate: 0 }).rate, 600);
  assert.equal(resolveMoneyConfig({ fcfaRate: -5 }).rate, 600);
  assert.equal(resolveMoneyConfig({ fcfaRate: "abc" as unknown as number }).rate, 600);
});

test("l'équivalent USD n'apparaît que s'il est activé", () => {
  const disabled = formatPricePair(25, { rate: 600, showSecondaryUsd: false });
  assert.equal(norm(disabled.primary), "15 000 FCFA");
  assert.equal(disabled.secondary, undefined);

  const enabled = formatPricePair(25, { rate: 600, showSecondaryUsd: true });
  assert.equal(norm(enabled.primary), "15 000 FCFA");
  assert.equal(norm(enabled.secondary || ""), "≈ 25,00 USD");
});

test("aucun équivalent USD sur un produit gratuit", () => {
  const pair = formatPricePair(0, { rate: 600, showSecondaryUsd: true });
  assert.equal(pair.primary, "Gratuit");
  assert.equal(pair.secondary, undefined);
});
