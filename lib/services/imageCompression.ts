// ============================================================
// FORTIA HUB — Compression d'image avant téléversement
// ------------------------------------------------------------
// Les photos prises avec un téléphone pèsent souvent 4 à 8 Mo. Elles
// dépassent alors la limite de la voie d'upload classique et échouent
// quand le dépôt direct vers R2 est bloqué (CORS du bucket privé).
// On les redimensionne donc dans le navigateur avant l'envoi :
//   • 1600 px max pour les documents d'identité (lisibles, ~300 Ko)
//   • 1920 px max pour les images de vitrine / produits
// Aucune perte visible à l'écran, téléversement beaucoup plus rapide.
// ============================================================

export interface CompressionOptions {
  /** Côté le plus long après redimensionnement (px). */
  maxDimension?: number;
  /** Qualité JPEG (0 à 1). */
  quality?: number;
  /** En dessous de cette taille, le fichier est envoyé tel quel. */
  skipUnderBytes?: number;
}

/**
 * Compresse une image si nécessaire et renvoie un `File` prêt à l'envoi.
 * Retourne le fichier d'origine si :
 *   • ce n'est pas une image (PDF…), un GIF animé ou un SVG ;
 *   • le fichier est déjà léger ;
 *   • le navigateur ne sait pas traiter l'image (repli sûr).
 */
export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxDimension = 1920,
    quality = 0.85,
    skipUnderBytes = 1_200_000,
  } = options;

  if (typeof document === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (file.size <= skipUnderBytes) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const longestSide = Math.max(bitmap.width, bitmap.height) || 1;
    const scale = Math.min(1, maxDimension / longestSide);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    // Format non décodable par le navigateur (HEIC ancien…) : envoi tel quel.
    return file;
  }
}
