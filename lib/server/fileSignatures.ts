// ============================================================
// FORTIA HUB — SIGNATURES RÉELLES DES FICHIERS ("magic bytes")
// ------------------------------------------------------------
// Le type MIME envoyé par le navigateur est déclaratif : un fichier
// HTML/SVG/script peut être annoncé comme image/png. On vérifie donc
// les premiers octets du contenu avant tout stockage.
// ============================================================

export type DetectedFileKind =
  | "jpeg"
  | "png"
  | "webp"
  | "gif"
  | "avif"
  | "heic"
  | "pdf"
  | "zip"
  | "unknown";

/** Détecte la nature réelle d'un fichier à partir de ses premiers octets. */
export function detectFileKind(buffer: Buffer): DetectedFileKind {
  if (!buffer || buffer.length < 12) return "unknown";

  // JPEG : FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";

  // PNG : 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  const ascii = buffer.toString("latin1");

  // GIF : "GIF87a" / "GIF89a"
  if (ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a")) return "gif";

  // WebP : "RIFF" .... "WEBP"
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "webp";

  // PDF : "%PDF"
  if (ascii.startsWith("%PDF")) return "pdf";

  // ZIP (et formats OOXML : docx, xlsx, pptx, epub) : "PK\x03\x04"
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return "zip";
  }

  // Conteneurs ISO BMFF (AVIF / HEIC) : "....ftyp<marque>"
  if (ascii.slice(4, 8) === "ftyp") {
    const brand = ascii.slice(8, 12).toLowerCase();
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "avif";
    if (brand.startsWith("heic") || brand.startsWith("heix") || brand.startsWith("mif1")) {
      return "heic";
    }
  }

  return "unknown";
}

/** Natures acceptées pour un type MIME déclaré (image/PDF uniquement). */
function expectedKinds(contentType: string): DetectedFileKind[] | null {
  const type = String(contentType || "").toLowerCase();
  if (type === "application/pdf") return ["pdf"];
  if (type === "image/jpeg" || type === "image/jpg") return ["jpeg"];
  if (type === "image/png") return ["png"];
  if (type === "image/webp") return ["webp"];
  if (type === "image/gif") return ["gif"];
  if (type === "image/avif") return ["avif"];
  if (type === "image/heic" || type === "image/heif") return ["heic"];
  return null;
}

/**
 * Vérifie que le contenu réel correspond au type déclaré.
 * Renvoie `null` si tout est cohérent, sinon un message d'erreur.
 * Les types non couverts (vidéos, archives, texte) ne sont pas contrôlés ici.
 */
export function checkDeclaredType(contentType: string, buffer: Buffer): string | null {
  const kinds = expectedKinds(contentType);
  if (!kinds) return null;

  const detected = detectFileKind(buffer);
  if (detected === "unknown") {
    return "Le contenu du fichier ne correspond pas au format annoncé.";
  }
  if (!kinds.includes(detected)) {
    return "Le contenu du fichier ne correspond pas au format annoncé.";
  }
  return null;
}
