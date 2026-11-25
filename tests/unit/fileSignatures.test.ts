import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { checkDeclaredType, detectFileKind } from "../../lib/server/fileSignatures";

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(12)]);
const gif = Buffer.from("GIF89a" + "\0".repeat(10), "latin1");
const webp = Buffer.from("RIFF" + "\0\0\0\0" + "WEBP" + "\0\0\0\0", "latin1");
const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n", "latin1");
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', "latin1");
const html = Buffer.from("<!DOCTYPE html><html><body>x</body></html>", "latin1");

describe("Signatures réelles des fichiers téléversés", () => {
  it("détecte les formats image et PDF", () => {
    assert.equal(detectFileKind(png), "png");
    assert.equal(detectFileKind(jpeg), "jpeg");
    assert.equal(detectFileKind(gif), "gif");
    assert.equal(detectFileKind(webp), "webp");
    assert.equal(detectFileKind(pdf), "pdf");
  });

  it("accepte un contenu cohérent avec le type déclaré", () => {
    assert.equal(checkDeclaredType("image/png", png), null);
    assert.equal(checkDeclaredType("image/jpeg", jpeg), null);
    assert.equal(checkDeclaredType("image/gif", gif), null);
    assert.equal(checkDeclaredType("image/webp", webp), null);
    assert.equal(checkDeclaredType("application/pdf", pdf), null);
  });

  it("refuse un SVG ou du HTML annoncés comme image", () => {
    assert.ok(checkDeclaredType("image/png", svg));
    assert.ok(checkDeclaredType("image/jpeg", html));
  });

  it("refuse un PDF annoncé comme image et inversement", () => {
    assert.ok(checkDeclaredType("image/png", pdf));
    assert.ok(checkDeclaredType("application/pdf", png));
  });
});
