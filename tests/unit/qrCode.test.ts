import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { encodeQrCode, formatBits, qrCodeToSvg, versionBits } from "../../lib/utils/qrCode";

const format = (text: string) =>
  encodeQrCode(text).modules.map((row) => row.map((cell) => (cell ? "1" : "0")).join("")).join("\n");

describe("QR code local (mode octet, niveau M)", () => {
  it("choisit la version minimale attendue pour la capacité M", () => {
    const cases: Array<[number, number]> = [
      [10, 21], // version 1 (14 octets utiles)
      [20, 25], // version 2 (26 octets)
      [40, 29], // version 3 (42 octets)
      [60, 33], // version 4 (62 octets)
    ];
    for (const [length, size] of cases) {
      const result = encodeQrCode("a".repeat(length));
      assert.equal(result.size, size, `${length} octets → ${size} modules`);
    }
  });

  it("dessine les trois motifs de repérage et la synchronisation", () => {
    const { size, modules } = encodeQrCode("https://fortia-hub.com/vendorstore/ibxpress");

    const finder = (top: number, left: number) => {
      for (let row = 0; row < 7; row += 1) {
        for (let column = 0; column < 7; column += 1) {
          const onBorder = row === 0 || row === 6 || column === 0 || column === 6;
          const inCenter = row >= 2 && row <= 4 && column >= 2 && column <= 4;
          assert.equal(modules[top + row][left + column], onBorder || inCenter);
        }
      }
    };

    finder(0, 0);
    finder(0, size - 7);
    finder(size - 7, 0);

    for (let index = 8; index < size - 8; index += 1) {
      assert.equal(modules[6][index], index % 2 === 0, "synchronisation horizontale");
      assert.equal(modules[index][6], index % 2 === 0, "synchronisation verticale");
    }
  });

  it("écrit un module toujours sombre et des bits de format valides", () => {
    const result = encodeQrCode("https://fortia-hub.com/vendorstore/ibxpress");
    const { size, modules } = result;

    assert.equal(modules[size - 8][8], true, "module sombre");

    // Reconstitue les 15 bits de format depuis le bras vertical (copie 1).
    let bits = 0;
    for (let index = 0; index <= 14; index += 1) {
      const dark =
        index < 6 ? modules[index][8] : index < 8 ? modules[index + 1][8] : modules[size - 15 + index][8];
      if (dark) bits |= 1 << index;
    }

    // Niveau M (bits 00) : le mot de format doit figurer dans la table normalisée.
    const expected = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0];
    assert.ok(expected.includes(bits), `mot de format inattendu : 0x${bits.toString(16)}`);
    assert.equal(bits, formatBits(expected.indexOf(bits)));
  });

  it("fournit les tables de format et de version de la norme", () => {
    const formats = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0];
    formats.forEach((expected, mask) => assert.equal(formatBits(mask), expected));
    assert.equal(versionBits(7), 0x07c94);
    assert.equal(versionBits(10), 0x0a4d3);
  });

  it("produit un motif déterministe et un SVG exploitable", () => {
    const first = format("https://fortia-hub.com/vendorstore/ibxpress");
    const second = format("https://fortia-hub.com/vendorstore/ibxpress");
    assert.equal(first, second, "le motif doit être reproductible");

    const svg = qrCodeToSvg(encodeQrCode("https://fortia-hub.com/vendorstore/ibxpress"), {
      moduleSize: 8,
      margin: 4,
    });
    assert.match(svg, /^<svg /);
    assert.match(svg, /<path d="M/);
    assert.match(svg, /shape-rendering="crispEdges"/);
  });

  it("refuse un contenu plus long que la version 10 (niveau M)", () => {
    assert.throws(() => encodeQrCode("z".repeat(230)), /trop long/);
  });
});
