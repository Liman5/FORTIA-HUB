import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMixedFeed,
  isFreeCourse,
  isFreePrice,
  isFreeProduct,
  listFreeCourses,
  listFreeProducts,
  toCourseItem,
  toProductItem,
} from "../../lib/data/explorer";
import { buildCategoryOptions, filterCoursesByCategoryParam } from "../../lib/data/courseCategories";
import { buildProductCategories, matchesProductCategory } from "../../lib/data/productCategories";

const course = (overrides: Record<string, unknown> = {}) => ({
  id: "c1",
  slug: "cours-1",
  title: "Cours",
  price: 0,
  isPublished: true,
  categoryLabel: "Business",
  ...overrides,
});

const product = (overrides: Record<string, unknown> = {}) => ({
  id: "p1",
  slug: "produit-1",
  title: "Produit",
  type: "ebook",
  typeLabel: "eBook PDF",
  price: 0,
  isPublished: true,
  ...overrides,
});

test("gratuit : un prix explicite à 0 seulement (prix absent exclu)", () => {
  assert.equal(isFreePrice(0), true);
  assert.equal(isFreePrice("0.00"), true);
  assert.equal(isFreePrice(12), false);
  assert.equal(isFreePrice(undefined), false);
  assert.equal(isFreePrice(null), false);

  assert.equal(isFreeCourse(course()), true);
  assert.equal(isFreeCourse(course({ price: 20 })), false);
  assert.equal(isFreeCourse(course({ isPublished: false })), false);
  assert.equal(isFreeCourse(course({ price: undefined })), false);

  assert.equal(isFreeProduct(product()), true);
  assert.equal(isFreeProduct(product({ price: 9 })), false);
  // Une formation ou une prestation n'est jamais un produit gratuit.
  assert.equal(isFreeProduct(product({ type: "course" })), false);
  assert.equal(isFreeProduct(product({ type: "service" })), false);
});

test("les listes gratuites ne gardent que les contenus publiés à 0", () => {
  const courses = [
    course({ id: "c1", price: 0 }),
    course({ id: "c2", price: 40 }),
    course({ id: "c3", price: 0, isPublished: false }),
  ];
  const products = [
    product({ id: "p1", price: 0 }),
    product({ id: "p2", price: 15 }),
    product({ id: "p3", price: 0, type: "service" }),
  ];
  assert.deepEqual(
    listFreeCourses(courses).map((item) => item.id),
    ["c1"]
  );
  assert.deepEqual(
    listFreeProducts(products).map((item) => item.id),
    ["p1"]
  );
});

test("catégorie « gratuit » : filtres formations et produits", () => {
  const courses = [course({ id: "c1", price: 0 }), course({ id: "c2", price: 30 })];
  assert.deepEqual(
    filterCoursesByCategoryParam(courses, "gratuit").map((item) => item.id),
    ["c1"]
  );

  const options = buildCategoryOptions(courses, [], null);
  const freeOption = options.find((option) => option.id === "gratuit");
  assert.ok(freeOption);
  assert.equal(freeOption?.count, 1);

  const products = [product({ id: "p1", price: 0 }), product({ id: "p2", price: 22 })];
  const productCategories = buildProductCategories(products);
  assert.equal(productCategories[0]?.slug, "gratuit");
  assert.equal(productCategories[0]?.count, 1);
  assert.equal(matchesProductCategory(products[0], "gratuit"), true);
  assert.equal(matchesProductCategory(products[1], "gratuit"), false);
});

test("la catégorie gratuite n'apparaît pas sans contenu gratuit", () => {
  const options = buildCategoryOptions([course({ price: 25 })], [], null);
  assert.equal(options.some((option) => option.id === "gratuit"), false);

  const categories = buildProductCategories([product({ price: 25 })]);
  assert.equal(categories.some((item) => item.slug === "gratuit"), false);
});

test("le flux mixte alterne formations et produits et respecte la limite", () => {
  const courses = [course({ id: "c1", rating: 4.8 }), course({ id: "c2", price: 20, rating: 4.5 })];
  const products = [
    product({ id: "p1", rating: 4.9 }),
    product({ id: "p2", price: 11, rating: 4.2 }),
  ];

  const feed = buildMixedFeed(courses, products, 3);
  assert.equal(feed.length, 3);
  assert.equal(feed[0]?.kind, "course");
  assert.equal(feed[1]?.kind, "product");
  assert.equal(feed[2]?.kind, "course");
});

test("les cartes d'exploration pointent vers la fiche et la catégorie", () => {
  const courseItem = toCourseItem(course({ slug: "mon-cours", categoryLabel: "Design & Création" }));
  assert.equal(courseItem.href, "/course/mon-cours");
  assert.equal(courseItem.categoryHref, "/academy?categorie=design-creation");
  assert.equal(courseItem.isFree, true);

  const productItem = toProductItem(product({ slug: "mon-produit", typeLabel: "Business & Entrepreneuriat" }));
  assert.equal(productItem.href, "/product/mon-produit");
  assert.equal(productItem.categoryHref, "/marketplace?categorie=business-entrepreneuriat");
  assert.equal(productItem.isFree, true);
});
