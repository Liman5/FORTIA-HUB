import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProductCategories,
  matchesProductCategory,
} from "../../lib/data/productCategories";

const product = (overrides: Record<string, unknown>) => ({
  isPublished: true,
  type: "ebook",
  typeLabel: "eBook PDF",
  ...overrides,
});

test("les catégories de produits viennent des domaines réellement choisis", () => {
  const categories = buildProductCategories([
    product({ typeLabel: "Intelligence Artificielle" }),
    product({ typeLabel: "Intelligence Artificielle", type: "ai_prompts" }),
    product({ typeLabel: "Business & Entrepreneuriat", type: "business_plan" }),
  ]);

  assert.equal(categories.length, 2);
  const ai = categories.find((item) => item.label === "Intelligence Artificielle");
  assert.ok(ai);
  assert.equal(ai?.count, 2);
  assert.equal(ai?.slug, "intelligence-artificielle");
});

test("un produit non publié ou non téléchargeable est ignoré", () => {
  const categories = buildProductCategories([
    product({ typeLabel: "Design", isPublished: false }),
    product({ typeLabel: "Formation vidéo", type: "course" }),
    product({ typeLabel: "Prestation", type: "service" }),
  ]);
  assert.equal(categories.length, 0);
});

test("le filtre de catégorie reconnaît le libellé et le type technique", () => {
  const item = product({ typeLabel: "Marketing Digital", type: "whitepaper" });
  assert.equal(matchesProductCategory(item, "marketing-digital"), true);
  assert.equal(matchesProductCategory(item, "whitepaper"), true);
  assert.equal(matchesProductCategory(item, "finance"), false);
  assert.equal(matchesProductCategory(item, ""), true);
});
