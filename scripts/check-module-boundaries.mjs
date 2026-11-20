// ============================================================
// FORTIA HUB — VÉRIFICATION DES FRONTIÈRES DE MODULES (Phase 6)
// ------------------------------------------------------------
// Contrôles statiques, sans base de données :
//   1. aucun cycle d'import dans lib/modules ;
//   2. un module n'importe jamais app/ ni components/ ;
//   3. les composants frontend n'importent jamais un module serveur ;
//   4. les routes API n'importent pas les handlers write (dispatch only) ;
//   5. payments/academy n'importent pas le module write.
// Exécution : node scripts/check-module-boundaries.mjs
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULES = path.join(ROOT, "lib/modules");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") ? [full] : [];
  });
}

function resolveImport(fromFile, specifier) {
  let base;
  if (specifier.startsWith("@/")) base = path.join(ROOT, specifier.slice(2));
  else if (specifier.startsWith(".")) base = path.resolve(path.dirname(fromFile), specifier);
  else return null;

  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function importsOf(file) {
  const source = fs.readFileSync(file, "utf8");
  const specs = [...source.matchAll(/(?:from\s+|import\s*\()\s*["']([^"']+)["']/g)].map(
    (match) => match[1]
  );
  return specs
    .map((specifier) => ({ specifier, resolved: resolveImport(file, specifier) }))
    .filter((entry) => entry.resolved);
}

const moduleFiles = walk(MODULES);
const graph = new Map(moduleFiles.map((file) => [file, importsOf(file)]));
const violations = [];

// 1. Cycles (DFS)
const VISITING = 1;
const DONE = 2;
const state = new Map();
const stack = [];

function visit(file) {
  if (state.get(file) === DONE) return;
  if (state.get(file) === VISITING) {
    const start = stack.indexOf(file);
    violations.push({
      rule: "cycle",
      detail: [...stack.slice(start), file].map((entry) => path.relative(ROOT, entry)).join(" → "),
    });
    return;
  }
  state.set(file, VISITING);
  stack.push(file);
  for (const edge of graph.get(file) || []) visit(edge.resolved);
  stack.pop();
  state.set(file, DONE);
}
moduleFiles.forEach(visit);

// 2/5. Dépendances interdites depuis un module
for (const [file, edges] of graph) {
  const relative = path.relative(ROOT, file).replace(/\\/g, "/");
  const inWrite = relative.startsWith("lib/modules/write/");
  for (const edge of edges) {
    const target = path.relative(ROOT, edge.resolved).replace(/\\/g, "/");
    if (target.startsWith("app/") || target.startsWith("components/")) {
      violations.push({ rule: "module-frontend", detail: `${relative} → ${target}` });
    }
    if (!inWrite && target.startsWith("lib/modules/write/")) {
      violations.push({ rule: "module-write", detail: `${relative} → ${target}` });
    }
  }
}

// 3. Composants frontend → modules serveur
for (const file of walk(path.join(ROOT, "components"))) {
  if (!file.endsWith(".tsx")) continue;
  for (const edge of importsOf(file)) {
    if (edge.specifier.startsWith("@/lib/modules/")) {
      violations.push({
        rule: "frontend-server-module",
        detail: `${path.relative(ROOT, file)} → ${edge.specifier}`,
      });
    }
  }
}

// 4. Routes API → handlers write directs
for (const file of walk(path.join(ROOT, "app/api"))) {
  if (!file.endsWith("route.ts")) continue;
  for (const edge of importsOf(file)) {
    if (edge.specifier.includes("lib/modules/write/handlers")) {
      violations.push({
        rule: "route-direct-handler",
        detail: `${path.relative(ROOT, file)} → ${edge.specifier}`,
      });
    }
  }
}

if (violations.length > 0) {
  console.error(`FRONTIÈRES : ${violations.length} violation(s)`);
  for (const violation of violations) {
    console.error(`  ✗ [${violation.rule}] ${violation.detail}`);
  }
  process.exit(1);
}

console.log(`FRONTIÈRES OK — ${moduleFiles.length} fichiers de modules, 0 cycle, 0 violation.`);
