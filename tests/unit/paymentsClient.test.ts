import test from "node:test";
import assert from "node:assert/strict";
import {
  createCheckout,
  pickPreferredProvider,
  requestSignedDownloadUrl,
} from "../../lib/services/paymentsClient";

test("préférence de fournisseur : Stripe, puis Paystack, puis Flutterwave, puis sandbox", () => {
  assert.equal(pickPreferredProvider(["sandbox", "flutterwave", "paystack"]), "paystack");
  assert.equal(pickPreferredProvider(["sandbox", "flutterwave"]), "flutterwave");
  assert.equal(pickPreferredProvider(["sandbox"]), "sandbox");
  assert.equal(pickPreferredProvider([]), undefined);
});

test("checkout : succès normalisé en contrat typé", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        orderId: "11111111-1111-4111-8111-111111111111",
        status: "pending",
        totalMinor: 1250,
        currency: "USD",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  try {
    const result = await createCheckout({ items: [{ type: "product", id: "x" }] });
    assert.equal(result.success, true);
    assert.equal(result.status, "pending");
    assert.equal(result.totalMinor, 1250);
  } finally {
    globalThis.fetch = original;
  }
});

test("checkout : erreur serveur conservée, jamais de faux succès", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ success: false, error: "Refusé" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  try {
    const result = await createCheckout({ items: [{ type: "course", id: "x" }] });
    assert.equal(result.success, false);
    assert.equal(result.error, "Refusé");
  } finally {
    globalThis.fetch = original;
  }
});

test("URL signée : une réponse sans url est un échec explicite", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "Droit requis" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  try {
    const result = await requestSignedDownloadUrl("course-media/x.mp4");
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  } finally {
    globalThis.fetch = original;
  }
});
