import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCategoryCode,
  normalizeCourseLevel,
  slugifyCourseTitle,
} from "../../lib/modules/academy/courseIdentity";

test("slug de formation : accents, espaces et caractères spéciaux normalisés", () => {
  assert.equal(slugifyCourseTitle("Sérigraphie Professionnelle"), "serigraphie-professionnelle");
  assert.equal(slugifyCourseTitle("  Cours / PDF & Vidéo  "), "cours-pdf-video");
  assert.ok(slugifyCourseTitle("x".repeat(120)).length <= 80);
});

test("niveau de formation : valeurs de l'enum SQL uniquement", () => {
  assert.equal(normalizeCourseLevel("Débutant"), "Debutant");
  assert.equal(normalizeCourseLevel("tous niveaux"), "Tous_niveaux");
  assert.equal(normalizeCourseLevel("Intermediaire"), "Intermediaire");
  assert.equal(normalizeCourseLevel("valeur libre"), "Tous_niveaux");
  assert.equal(normalizeCourseLevel(undefined), "Tous_niveaux");
});

test("code de catégorie : stable et sans accent", () => {
  assert.equal(normalizeCategoryCode("Intelligence Artificielle"), "intelligence-artificielle");
  assert.equal(normalizeCategoryCode("Crypto & Blockchain"), "crypto-blockchain");
  assert.equal(normalizeCategoryCode(""), "categorie");
});
