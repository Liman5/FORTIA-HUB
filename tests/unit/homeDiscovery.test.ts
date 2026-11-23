import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("les destinations de découverte existent", () => {
  const routes = [
    "app/academy/categories/page.tsx",
    "app/marketplace/categories/page.tsx",
    "app/marketplace/ressources/page.tsx",
    "app/centres/page.tsx",
    "app/centres/[id]/page.tsx",
    "app/freelances/page.tsx",
    "app/freelances/[id]/page.tsx",
    "app/product/[slug]/page.tsx",
  ];
  for (const route of routes) {
    assert.ok(fs.existsSync(path.join(root, route)), `route manquante: ${route}`);
  }
});

test("la Homepage distingue formations, produits et centres", () => {
  const source = read("components/pages/HomePage.tsx");
  assert.match(source, /Explorer les formations par catégorie/);
  assert.match(source, /Explorer les produits numériques par catégorie/);
  assert.match(source, /\/academy\/categories/);
  assert.match(source, /\/marketplace\/categories/);
  assert.match(source, /\/marketplace\/ressources/);
  assert.match(source, /\/centres/);
  assert.match(source, /\/freelances/);
});

test("les produits de la Homepage pointent vers leur fiche exacte", () => {
  const source = read("components/pages/HomePage.tsx");
  assert.match(source, /\/product\/\$\{encodeURIComponent/);
  assert.doesNotMatch(
    source,
    /onOpen=\{\(\) => router\.push\(buildShopTypeUrl/,
    "un produit ne doit plus ouvrir la boutique filtrée par type"
  );
});

test("aucun faux centre de démonstration n'est affiché", () => {
  const source = read("components/pages/HomePage.tsx");
  assert.doesNotMatch(source, /FALLBACK_CENTERS/);
  assert.doesNotMatch(source, /default-fortia-academy/);
});
