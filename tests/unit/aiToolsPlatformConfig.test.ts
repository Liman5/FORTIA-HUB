import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  PUBLIC_PLATFORM_CONFIG_KEYS,
  isSensitivePlatformConfigKey,
  pickPublicPlatformConfig,
} from "../../lib/server/publicPlatformConfig";

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("platform_config — aucune fuite vers l'assistant IA", () => {
  it("identifie les clés sensibles (secrets 2FA et codes OTP)", () => {
    assert.equal(isSensitivePlatformConfigKey("2fa:user:9d1c"), true);
    assert.equal(isSensitivePlatformConfigKey("OTP:email:test@fortia.local"), true);
    assert.equal(isSensitivePlatformConfigKey("  otp:email:x@y.z  "), true);
    assert.equal(isSensitivePlatformConfigKey("currency:display"), false);
    assert.equal(isSensitivePlatformConfigKey(""), true);
  });

  it("ne laisse jamais passer une clé 2fa: ou otp: dans la sélection publique", () => {
    const rows = [
      { key: "2fa:user:1", value: { enabled: true } },
      { key: "otp:email:a@b.c", value: { hash: "deadbeef", salt: "aa" } },
      { key: "currency:display", value: "FCFA" },
    ];
    const publicRows = pickPublicPlatformConfig(rows);

    for (const row of publicRows) {
      assert.equal(isSensitivePlatformConfigKey(row.key), false);
      assert.ok(!row.key.startsWith("2fa:"));
      assert.ok(!row.key.startsWith("otp:"));
    }
  });

  it("la liste blanche ne contient aucune clé sensible", () => {
    for (const key of PUBLIC_PLATFORM_CONFIG_KEYS) {
      assert.equal(isSensitivePlatformConfigKey(key), false, `clé sensible dans la liste blanche : ${key}`);
    }
  });

  it("get_platform_settings ne lit plus platform_config", () => {
    const source = readSource("lib/services/aiTools.ts");
    assert.equal(
      /platformConfig/.test(source),
      false,
      "lib/services/aiTools.ts ne doit plus référencer platformConfig (un findMany global exposait les secrets 2FA et les hash OTP)."
    );
    assert.equal(/platformConfigs/.test(source), false);
  });

  it("aucune route publique n'expose platform_config", () => {
    const publicRoutes = [
      "app/api/site/route.ts",
      "app/api/bootstrap/route.ts",
      "app/api/banners/route.ts",
    ];
    for (const route of publicRoutes) {
      const source = readSource(route);
      assert.equal(
        /prisma\.platformConfig/.test(source),
        false,
        `${route} ne doit pas lire platform_config.`
      );
    }
  });

  it("la synchronisation complète reste réservée aux administrateurs", () => {
    const source = readSource("app/api/platform/admin-sync/route.ts");
    assert.match(source, /prisma\.platformConfig\.findMany/);
    assert.match(source, /requireAdmin\(/, "admin-sync doit vérifier une session administrateur.");
  });
});
