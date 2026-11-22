import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), "utf8");

test("la navigation admin expose réellement le module Utilisateurs", () => {
  const sidebar = read("components/admin/AdminSidebar.tsx");
  assert.match(sidebar, /key:\s*"users"/);
  assert.match(sidebar, /allowUsers/);
});

test("le dashboard admin moderne mappe users vers l'onglet users", () => {
  const page = read("components/admin/AdminModernPage.tsx");
  assert.match(page, /users:\s*"users"/);
  assert.match(page, /allowUsers=\{canManageUsers\}/);
});

test("AdminDashboard rend AdminUsersTab pour l'onglet users", () => {
  const dashboard = read("components/AdminDashboard.tsx");
  assert.match(dashboard, /activeTab === 'users'/);
  assert.match(dashboard, /<AdminUsersTab\s*\/>/);
});
