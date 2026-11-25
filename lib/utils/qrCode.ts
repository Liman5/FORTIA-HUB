// ============================================================
// FORTIA HUB — GÉNÉRATEUR DE QR CODE (100 % local, sans dépendance)
// ------------------------------------------------------------
// Mode octet (UTF-8), niveau de correction d'erreurs « M »,
// versions 1 à 10 (jusqu'à 213 octets utiles — largement assez
// pour une URL de boutique ou un lien de partage).
//
// Aucun appel réseau, aucune librairie externe : le motif est
// calculé côté client et rendu en SVG vectoriel (imprimable).
// ============================================================

interface QrVersionSpec {
  version: number;
  totalCodewords: number;
  ecPerBlock: number;
  /** Blocs de données : { nombre de blocs, codewords utiles par bloc } */
  groups: Array<{ blocks: number; dataCodewords: number }>;
  /** Coordonnées des motifs d'alignement (vide pour la version 1). */
  alignment: number[];
}

const VERSION_SPECS: QrVersionSpec[] = [
  { version: 1, totalCodewords: 26, ecPerBlock: 10, groups: [{ blocks: 1, dataCodewords: 16 }], alignment: [] },
  { version: 2, totalCodewords: 44, ecPerBlock: 16, groups: [{ blocks: 1, dataCodewords: 28 }], alignment: [6, 18] },
  { version: 3, totalCodewords: 70, ecPerBlock: 26, groups: [{ blocks: 1, dataCodewords: 44 }], alignment: [6, 22] },
  { version: 4, totalCodewords: 100, ecPerBlock: 18, groups: [{ blocks: 2, dataCodewords: 32 }], alignment: [6, 26] },
  { version: 5, totalCodewords: 134, ecPerBlock: 24, groups: [{ blocks: 2, dataCodewords: 43 }], alignment: [6, 30] },
  { version: 6, totalCodewords: 172, ecPerBlock: 16, groups: [{ blocks: 4, dataCodewords: 27 }], alignment: [6, 34] },
  { version: 7, totalCodewords: 196, ecPerBlock: 18, groups: [{ blocks: 4, dataCodewords: 31 }], alignment: [6, 22, 38] },
  {
    version: 8,
    totalCodewords: 242,
    ecPerBlock: 22,
    groups: [
      { blocks: 2, dataCodewords: 38 },
      { blocks: 2, dataCodewords: 39 },
    ],
    alignment: [6, 24, 42],
  },
  {
    version: 9,
    totalCodewords: 292,
    ecPerBlock: 22,
    groups: [
      { blocks: 3, dataCodewords: 36 },
      { blocks: 2, dataCodewords: 37 },
    ],
    alignment: [6, 26, 46],
  },
  {
    version: 10,
    totalCodewords: 346,
    ecPerBlock: 26,
    groups: [
      { blocks: 4, dataCodewords: 43 },
      { blocks: 1, dataCodewords: 44 },
    ],
    alignment: [6, 28, 50],
  },
];

/** Niveau « M » = 00 dans les 2 bits de format du QR code. */
const EC_LEVEL_BITS = 0b00;

// ------------------------------------------------------------
// Corps de Galois GF(256) — primitive 0x11D
// ------------------------------------------------------------
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let value = 1;
  for (let index = 0; index < 255; index += 1) {
    GF_EXP[index] = value;
    GF_LOG[value] = index;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let index = 255; index < 512; index += 1) GF_EXP[index] = GF_EXP[index - 255];
})();

function gfMultiply(left: number, right: number): number {
  if (left === 0 || right === 0) return 0;
  return GF_EXP[GF_LOG[left] + GF_LOG[right]];
}

const generatorCache = new Map<number, number[]>();

/** Polynôme générateur de Reed-Solomon (coefficients du degré le plus haut au plus bas). */
function reedSolomonGenerator(degree: number): number[] {
  const cached = generatorCache.get(degree);
  if (cached) return cached;

  let poly = [1];
  for (let index = 0; index < degree; index += 1) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let term = 0; term < poly.length; term += 1) {
      next[term] ^= poly[term];
      next[term + 1] ^= gfMultiply(poly[term], GF_EXP[index]);
    }
    poly = next;
  }

  generatorCache.set(degree, poly);
  return poly;
}

/** Codewords de correction d'erreurs d'un bloc de données. */
function reedSolomonRemainder(data: number[], ecLength: number): number[] {
  const generator = reedSolomonGenerator(ecLength);
  const remainder = new Array<number>(ecLength).fill(0);

  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    for (let index = 0; index < ecLength; index += 1) {
      remainder[index] ^= gfMultiply(generator[index + 1], factor);
    }
  }

  return remainder;
}


/** Nombre total de codewords utiles (données) pour une version. */
function dataCodewordCount(spec: QrVersionSpec): number {
  return spec.groups.reduce((total, group) => total + group.blocks * group.dataCodewords, 0);
}

/** Version minimale capable de contenir `byteLength` octets (niveau M). */
function selectVersion(byteLength: number): QrVersionSpec {
  for (const spec of VERSION_SPECS) {
    const countBits = spec.version < 10 ? 8 : 16;
    const capacityBits = dataCodewordCount(spec) * 8;
    if (4 + countBits + byteLength * 8 <= capacityBits) return spec;
  }
  throw new Error("QR : contenu trop long (URL de boutique trop verbeuse).");
}

/** Construit la séquence de codewords finale (données entrelacées + correction d'erreurs). */
function buildCodewords(bytes: Uint8Array, spec: QrVersionSpec): number[] {
  const countBits = spec.version < 10 ? 8 : 16;
  const totalDataCodewords = dataCodewordCount(spec);
  const bits: number[] = [];

  const pushBits = (value: number, length: number) => {
    for (let index = length - 1; index >= 0; index -= 1) bits.push((value >> index) & 1);
  };

  pushBits(0b0100, 4); // mode octet
  pushBits(bytes.length, countBits);
  for (const byte of bytes) pushBits(byte, 8);

  const capacityBits = totalDataCodewords * 8;
  const terminator = Math.min(4, capacityBits - bits.length);
  for (let index = 0; index < terminator; index += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataCodewords: number[] = [];
  for (let index = 0; index < bits.length; index += 8) {
    let byte = 0;
    for (let offset = 0; offset < 8; offset += 1) byte = (byte << 1) | bits[index + offset];
    dataCodewords.push(byte);
  }

  const padBytes = [0xec, 0x11];
  let padIndex = 0;
  while (dataCodewords.length < totalDataCodewords) {
    dataCodewords.push(padBytes[padIndex % 2]);
    padIndex += 1;
  }

  // Découpage en blocs selon la structure de la version.
  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let cursor = 0;
  for (const group of spec.groups) {
    for (let block = 0; block < group.blocks; block += 1) {
      const slice = dataCodewords.slice(cursor, cursor + group.dataCodewords);
      cursor += group.dataCodewords;
      dataBlocks.push(slice);
      ecBlocks.push(reedSolomonRemainder(slice, spec.ecPerBlock));
    }
  }

  // Entrelacement : tous les i-èmes codewords de données, puis les i-èmes de correction.
  const result: number[] = [];
  const longestData = Math.max(...dataBlocks.map((block) => block.length));
  for (let index = 0; index < longestData; index += 1) {
    for (const block of dataBlocks) {
      if (index < block.length) result.push(block[index]);
    }
  }
  for (let index = 0; index < spec.ecPerBlock; index += 1) {
    for (const block of ecBlocks) result.push(block[index]);
  }

  return result;
}

// ------------------------------------------------------------
// Construction de la matrice
// ------------------------------------------------------------
interface QrMatrix {
  size: number;
  modules: boolean[][];
  reserved: boolean[][];
}

function createMatrix(version: number): QrMatrix {
  const size = 17 + version * 4;
  return {
    size,
    modules: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
    reserved: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
  };
}

function setModule(matrix: QrMatrix, row: number, column: number, dark: boolean): void {
  if (row < 0 || column < 0 || row >= matrix.size || column >= matrix.size) return;
  matrix.modules[row][column] = dark;
  matrix.reserved[row][column] = true;
}

function drawFinder(matrix: QrMatrix, top: number, left: number): void {
  for (let row = -1; row <= 7; row += 1) {
    for (let column = -1; column <= 7; column += 1) {
      const insideRow = row >= 0 && row <= 6;
      const insideColumn = column >= 0 && column <= 6;
      const onBorder = row === 0 || row === 6 || column === 0 || column === 6;
      const inCenter = row >= 2 && row <= 4 && column >= 2 && column <= 4;
      setModule(matrix, top + row, left + column, insideRow && insideColumn && (onBorder || inCenter));
    }
  }
}

function drawAlignment(matrix: QrMatrix, centerRow: number, centerColumn: number): void {
  for (let row = -2; row <= 2; row += 1) {
    for (let column = -2; column <= 2; column += 1) {
      const distance = Math.max(Math.abs(row), Math.abs(column));
      setModule(matrix, centerRow + row, centerColumn + column, distance !== 1);
    }
  }
}

function drawFunctionPatterns(matrix: QrMatrix, spec: QrVersionSpec): void {
  const { size } = matrix;

  drawFinder(matrix, 0, 0);
  drawFinder(matrix, 0, size - 7);
  drawFinder(matrix, size - 7, 0);

  // Motifs de synchronisation (ligne / colonne 6)
  for (let index = 8; index < size - 8; index += 1) {
    const dark = index % 2 === 0;
    setModule(matrix, 6, index, dark);
    setModule(matrix, index, 6, dark);
  }

  // Motifs d'alignement (sauf ceux qui chevauchent un motif de repérage)
  for (const centerRow of spec.alignment) {
    for (const centerColumn of spec.alignment) {
      const overlapsFinder =
        (centerRow <= 8 && centerColumn <= 8) ||
        (centerRow <= 8 && centerColumn >= size - 9) ||
        (centerRow >= size - 9 && centerColumn <= 8);
      if (!overlapsFinder) drawAlignment(matrix, centerRow, centerColumn);
    }
  }

  // Module toujours sombre
  setModule(matrix, size - 8, 8, true);

  // Zones réservées au format (15 bits × 2 copies)
  for (let index = 0; index <= 8; index += 1) {
    if (!matrix.reserved[8][index]) setModule(matrix, 8, index, false);
    if (!matrix.reserved[index][8]) setModule(matrix, index, 8, false);
  }
  for (let index = 0; index < 8; index += 1) {
    setModule(matrix, 8, size - 1 - index, false);
    setModule(matrix, size - 1 - index, 8, false);
  }

  // Zones réservées à l'information de version (versions ≥ 7)
  if (spec.version >= 7) {
    for (let index = 0; index < 6; index += 1) {
      for (let offset = 0; offset < 3; offset += 1) {
        setModule(matrix, index, size - 11 + offset, false);
        setModule(matrix, size - 11 + offset, index, false);
      }
    }
  }
}



/** Place les bits de données en zigzag (de bas en haut par paires de colonnes). */
function placeData(matrix: QrMatrix, bits: number[]): boolean[][] {
  const { size } = matrix;
  const isData = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  let bitIndex = 0;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // la colonne 6 est réservée à la synchronisation
    for (let step = 0; step < size; step += 1) {
      for (let offset = 0; offset < 2; offset += 1) {
        const column = right - offset;
        const row = upward ? size - 1 - step : step;
        if (matrix.reserved[row][column]) continue;
        const bit = bitIndex < bits.length && bits[bitIndex] === 1;
        bitIndex += 1;
        matrix.modules[row][column] = bit;
        isData[row][column] = true;
      }
    }
    upward = !upward;
  }

  return isData;
}

const MASK_PATTERNS: Array<(row: number, column: number) => boolean> = [
  (row, column) => (row + column) % 2 === 0,
  (row) => row % 2 === 0,
  (_row, column) => column % 3 === 0,
  (row, column) => (row + column) % 3 === 0,
  (row, column) => (Math.floor(row / 2) + Math.floor(column / 3)) % 2 === 0,
  (row, column) => ((row * column) % 2) + ((row * column) % 3) === 0,
  (row, column) => (((row * column) % 2) + ((row * column) % 3)) % 2 === 0,
  (row, column) => (((row + column) % 2) + ((row * column) % 3)) % 2 === 0,
];

/** Bits de format (niveau M + masque) protégés par un code BCH(15,5). Exporté pour les vérifications. */
export function formatBits(mask: number): number {
  const data = (EC_LEVEL_BITS << 3) | mask;
  let remainder = data << 10;
  for (let index = 4; index >= 0; index -= 1) {
    if ((remainder >> (index + 10)) & 1) remainder ^= 0x537 << index;
  }
  return ((data << 10) | remainder) ^ 0x5412;
}

/** Bits d'information de version (BCH(18,6)), pour les versions ≥ 7. Exporté pour les vérifications. */
export function versionBits(version: number): number {
  let remainder = version << 12;
  for (let index = 5; index >= 0; index -= 1) {
    if ((remainder >> (index + 12)) & 1) remainder ^= 0x1f25 << index;
  }
  return (version << 12) | remainder;
}

function writeFormatBits(modules: boolean[][], size: number, mask: number): void {
  const bits = formatBits(mask);

  // Copie 1 — bras vertical (colonne 8) : bits 0..14
  for (let index = 0; index <= 14; index += 1) {
    const dark = ((bits >> index) & 1) === 1;
    if (index < 6) modules[index][8] = dark;
    else if (index < 8) modules[index + 1][8] = dark;
    else modules[size - 15 + index][8] = dark;
  }

  // Copie 2 — bras horizontal (ligne 8) : bits 0..14 (transposée)
  for (let index = 0; index <= 14; index += 1) {
    const dark = ((bits >> index) & 1) === 1;
    if (index < 8) modules[8][size - 1 - index] = dark;
    else if (index < 9) modules[8][7] = dark;
    else modules[8][15 - index - 1] = dark;
  }

  // Module toujours sombre
  modules[size - 8][8] = true;
}

function writeVersionInfo(modules: boolean[][], size: number, version: number): void {
  if (version < 7) return;
  const bits = versionBits(version);
  for (let index = 0; index < 18; index += 1) {
    const dark = ((bits >> index) & 1) === 1;
    const row = Math.floor(index / 3);
    const column = size - 11 + (index % 3);
    modules[row][column] = dark;
    modules[column][row] = dark;
  }
}


// ------------------------------------------------------------
// Évaluation des masques (règles de pénalité de la norme)
// ------------------------------------------------------------
function penaltyScore(modules: boolean[][]): number {
  const size = modules.length;
  let score = 0;

  const linePenalty = (values: boolean[]): number => {
    let total = 0;
    let run = 1;
    for (let index = 1; index < values.length; index += 1) {
      if (values[index] === values[index - 1]) {
        run += 1;
      } else {
        if (run >= 5) total += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) total += 3 + (run - 5);

    const text = values.map((value) => (value ? "1" : "0")).join("");
    const finderA = text.split("10111010000").length - 1;
    const finderB = text.split("00001011101").length - 1;
    total += (finderA + finderB) * 40;
    return total;
  };

  for (let row = 0; row < size; row += 1) score += linePenalty(modules[row]);
  for (let column = 0; column < size; column += 1) {
    score += linePenalty(modules.map((row) => row[column]));
  }

  for (let row = 0; row < size - 1; row += 1) {
    for (let column = 0; column < size - 1; column += 1) {
      const value = modules[row][column];
      if (
        modules[row][column + 1] === value &&
        modules[row + 1][column] === value &&
        modules[row + 1][column + 1] === value
      ) {
        score += 3;
      }
    }
  }

  let darkCount = 0;
  for (const row of modules) for (const value of row) if (value) darkCount += 1;
  const ratio = (darkCount * 100) / (size * size);
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10;

  return score;
}

export interface QrCodeResult {
  size: number;
  version: number;
  modules: boolean[][];
}

/**
 * Encode un texte en QR code (mode octet, niveau M) et renvoie la matrice.
 * Entièrement local : aucune requête réseau.
 */
export function encodeQrCode(
  text: string,
  options: { minVersion?: number; mask?: number } = {}
): QrCodeResult {
  const bytes = new TextEncoder().encode(text || " ");
  let spec = selectVersion(bytes.length);
  const minVersion = Math.max(1, Math.min(options.minVersion || 1, 10));
  if (spec.version < minVersion) spec = VERSION_SPECS[minVersion - 1];

  const codewords = buildCodewords(bytes, spec);
  const bits: number[] = [];
  for (const codeword of codewords) {
    for (let offset = 7; offset >= 0; offset -= 1) bits.push((codeword >> offset) & 1);
  }

  const base = createMatrix(spec.version);
  drawFunctionPatterns(base, spec);
  const isData = placeData(base, bits);

  let best: { modules: boolean[][]; score: number } | null = null;

  const forcedMask =
    typeof options.mask === "number" && options.mask >= 0 && options.mask <= 7 ? options.mask : null;

  for (let mask = 0; mask < 8; mask += 1) {
    if (forcedMask !== null && mask !== forcedMask) continue;
    const candidate = base.modules.map((row) => row.slice());
    const maskFn = MASK_PATTERNS[mask];
    for (let row = 0; row < base.size; row += 1) {
      for (let column = 0; column < base.size; column += 1) {
        if (isData[row][column] && maskFn(row, column)) {
          candidate[row][column] = !candidate[row][column];
        }
      }
    }
    writeFormatBits(candidate, base.size, mask);
    writeVersionInfo(candidate, base.size, spec.version);

    const score = penaltyScore(candidate);
    if (!best || score < best.score) best = { modules: candidate, score };
  }

  return { size: base.size, version: spec.version, modules: best!.modules };
}

/** Rend la matrice en SVG vectoriel (imprimable, net à toutes les tailles). */
export function qrCodeToSvg(
  result: QrCodeResult,
  options: { moduleSize?: number; margin?: number; dark?: string; light?: string } = {}
): string {
  const moduleSize = options.moduleSize ?? 8;
  const margin = options.margin ?? 4;
  const dark = options.dark ?? "#021231";
  const light = options.light ?? "#ffffff";
  const dimension = (result.size + margin * 2) * moduleSize;

  let path = "";
  for (let row = 0; row < result.size; row += 1) {
    for (let column = 0; column < result.size; column += 1) {
      if (!result.modules[row][column]) continue;
      const x = (column + margin) * moduleSize;
      const y = (row + margin) * moduleSize;
      path += `M${x} ${y}h${moduleSize}v${moduleSize}h-${moduleSize}z`;
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" width="${dimension}" height="${dimension}" shape-rendering="crispEdges">` +
    `<rect width="100%" height="100%" fill="${light}"/>` +
    `<path d="${path}" fill="${dark}"/>` +
    `</svg>`
  );
}
