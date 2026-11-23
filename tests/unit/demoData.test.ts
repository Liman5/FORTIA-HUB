import test from "node:test";
import assert from "node:assert/strict";

import {
  DEMO_CONFIRMATION_WORD,
  isValidDemoConfirmation,
} from "../../lib/modules/admin/demoConfirmation";

test("la confirmation de purge exige le mot exact", () => {
  assert.equal(DEMO_CONFIRMATION_WORD, "SUPPRIMER");
  assert.equal(isValidDemoConfirmation("SUPPRIMER"), true);
  assert.equal(isValidDemoConfirmation(" supprimer "), true);
  assert.equal(isValidDemoConfirmation("OUI"), false);
  assert.equal(isValidDemoConfirmation(""), false);
  assert.equal(isValidDemoConfirmation(undefined), false);
  assert.equal(isValidDemoConfirmation(true), false);
  assert.equal(isValidDemoConfirmation("SUPPRIMER TOUT"), false);
});
