// ============================================================
// FORTIA HUB — Limites et formats d'upload (source unique)
// ------------------------------------------------------------
// Ces règles sont partagées par l'interface (validation immédiate,
// affichage des limites) et par les routes serveur (contrôle final).
// Elles évitent les erreurs 413 (corps de requête trop volumineux)
// en orientant chaque fichier vers la bonne voie de téléversement.
// ============================================================

export const MB = 1024 * 1024;

/** Catégories de fichiers acceptées sur la plateforme. */
export type UploadKind = "image" | "kyc" | "document" | "archive" | "video";

export interface UploadLimit {
  /** Taille maximale en octets. */
  maxBytes: number;
  /** Libellé lisible (ex. « 10 Mo »). */
  label: string;
  /** Formats lisibles pour l'utilisateur. */
  formats: string;
  /** Attribut `accept` prêt pour un <input type="file">. */
  accept: string;
  /** Nom français de la catégorie. */
  name: string;
}

export const UPLOAD_LIMITS: Record<UploadKind, UploadLimit> = {
  image: {
    maxBytes: 10 * MB,
    label: "10 Mo",
    formats: "JPG, PNG, WEBP, AVIF, GIF",
    accept: "image/jpeg,image/png,image/webp,image/avif,image/gif",
    name: "image",
  },
  kyc: {
    maxBytes: 10 * MB,
    label: "10 Mo",
    formats: "PDF, JPG, PNG, WEBP",
    accept: "application/pdf,image/jpeg,image/png,image/webp",
    name: "document d'identité",
  },
  document: {
    maxBytes: 50 * MB,
    label: "50 Mo",
    formats: "PDF, DOC, DOCX, XLS, XLSX, PPTX, TXT, CSV",
    accept:
      "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv",
    name: "document",
  },
  archive: {
    maxBytes: 100 * MB,
    label: "100 Mo",
    formats: "ZIP, RAR, 7Z",
    accept:
      "application/zip,application/x-zip-compressed,application/x-rar-compressed,application/vnd.rar,application/x-7z-compressed",
    name: "archive",
  },
  video: {
    maxBytes: 500 * MB,
    label: "500 Mo",
    formats: "MP4, MOV, WEBM",
    accept: "video/mp4,video/quicktime,video/webm",
    name: "vidéo",
  },
};

/** Catégories acceptées par dossier R2 (= nom de bucket logique). */
export const BUCKET_KINDS: Record<string, UploadKind[]> = {
  "store-images": ["image"],
  "product-images": ["image"],
  "blog-images": ["image"],
  "site-media": ["image"],
  "kyc-documents": ["kyc"],
  "product-files": ["document", "archive", "video"],
  "course-media": ["video", "document", "archive"],
};

/** Extension → type MIME (indispensable pour les fichiers sans type détecté). */
const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  "3gp": "video/3gpp",
  ogg: "video/ogg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

/** Extension d'un nom de fichier (minuscule, sans point). */
export function fileExtension(fileName: string): string {
  return (fileName.split(".").pop() || "").toLowerCase();
}

/**
 * Type MIME à utiliser pour la présignature R2.
 * Le serveur compare ce type à sa liste blanche : il doit donc être exact.
 */
export function contentTypeFor(file: File): string {
  const declared = (file.type || "").toLowerCase();
  if (declared) return declared;
  return EXTENSION_MIME[fileExtension(file.name)] || "application/octet-stream";
}

/** Catégorie d'un fichier, ou `null` si le format n'est pas géré. */
export function detectUploadKind(file: File): UploadKind | null {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";

  const ext = fileExtension(file.name);
  const mime = EXTENSION_MIME[ext] || "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (["zip", "rar", "7z"].includes(ext)) return "archive";
  if (
    mime === "application/pdf" ||
    mime.startsWith("application/vnd.") ||
    mime === "application/msword" ||
    mime.startsWith("text/")
  ) {
    return "document";
  }
  return null;
}

/** Formate une taille en octets (« 1,4 Mo »). */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 Ko";
  const units = ["octets", "Ko", "Mo", "Go"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : 1).replace(".", ",")} ${units[index]}`;
}

export interface UploadCheck {
  ok: boolean;
  kind?: UploadKind;
  /** Taille maximale autorisée pour ce fichier dans ce dossier. */
  maxBytes?: number;
  /** Message prêt à afficher en cas de refus. */
  error?: string;
}

/**
 * Valide un fichier AVANT tout envoi réseau : format, catégorie autorisée
 * pour le dossier et taille maximale. Le message d'erreur indique toujours
 * la limite exacte, ce qui évite les 413 opaques.
 */
export function checkUploadFile(file: File, bucket?: string): UploadCheck {
  const kinds =
    (bucket && BUCKET_KINDS[bucket]) || (["image", "document", "archive", "video"] as UploadKind[]);
  const acceptedFormats = kinds.map((k) => UPLOAD_LIMITS[k].formats).join(" · ");

  if (!file || file.size <= 0) {
    return { ok: false, error: "Le fichier est vide : sélectionnez un fichier valide." };
  }

  const kind = detectUploadKind(file);
  if (!kind) {
    const ext = fileExtension(file.name) || "inconnu";
    return {
      ok: false,
      error: `Format « .${ext} » non pris en charge ici. Formats acceptés : ${acceptedFormats}.`,
    };
  }

  if (!kinds.includes(kind)) {
    return {
      ok: false,
      kind,
      error: `Un fichier ${UPLOAD_LIMITS[kind].name} n'est pas accepté dans cet espace. Formats acceptés : ${acceptedFormats}.`,
    };
  }

  const limit = UPLOAD_LIMITS[kind];
  if (file.size > limit.maxBytes) {
    return {
      ok: false,
      kind,
      maxBytes: limit.maxBytes,
      error: `« ${file.name} » pèse ${formatBytes(file.size)} : la limite est de ${limit.label} pour ${limit.name === "image" ? "une image" : `un ${limit.name}`}.`,
    };
  }

  return { ok: true, kind, maxBytes: limit.maxBytes };
}

/** Résumé lisible des limites d'un dossier (« JPG… · 10 Mo max »). */
export function uploadHintForBucket(bucket: string): string {
  const kinds = BUCKET_KINDS[bucket] || [];
  if (kinds.length === 0) return "";
  if (kinds.length === 1) {
    const limit = UPLOAD_LIMITS[kinds[0]];
    return `${limit.formats} · ${limit.label} max`;
  }
  return kinds.map((k) => `${UPLOAD_LIMITS[k].formats} (${UPLOAD_LIMITS[k].label})`).join(" · ");
}

/** Attribut `accept` pour un dossier donné. */
export function acceptForBucket(bucket: string): string {
  const kinds = BUCKET_KINDS[bucket] || [];
  if (kinds.length === 0) {
    return Array.from(
      new Set(Object.values(UPLOAD_LIMITS).flatMap((l) => l.accept.split(",")))
    ).join(",");
  }
  return Array.from(new Set(kinds.flatMap((k) => UPLOAD_LIMITS[k].accept.split(",")))).join(",");
}
