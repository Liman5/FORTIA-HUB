// ============================================================
// FORTIA HUB — Maintenance de production
// ------------------------------------------------------------
// • Nettoyage des fichiers R2 « orphelins » : envoyés sur le stockage
//   mais jamais enregistrés en base (formulaire abandonné, erreur réseau…).
//   Règle : JAMAIS avant 24 h, et mode simulation par défaut.
// • Purge des compteurs de limitation de débit expirés
//   (`rate_limit_counters`) pour éviter une croissance illimitée.
// ============================================================

import { prisma } from "@/lib/prisma";
import { deleteFromR2 } from "@/lib/services/r2Storage";
import { markStorageObjectDeleted } from "@/lib/server/storageInventory";

/** Âge minimal avant toute suppression réelle (garde-fou absolu). */
export const MIN_AGE_HOURS = 24;

/** Nombre maximal de fichiers traités par exécution. */
const MAX_OBJECTS_PER_RUN = 500;

/** Identifiant SQL sûr (table/colonne issue de information_schema). */
const SAFE_IDENT = /^[a-z_][a-z0-9_]*$/;

/**
 * Normalise une référence de fichier en clé R2 :
 *   • « https://pub-xxx.r2.dev/store-images/a/b.png?x=1 » → « store-images/a/b.png »
 *   • « /site-media/x.jpg » → « site-media/x.jpg »
 *   • une clé déjà propre est renvoyée telle quelle.
 */
export function normalizeStorageKey(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    try {
      return decodeURIComponent(new URL(raw).pathname.replace(/^\/+/, "")).split("?")[0];
    } catch {
      return "";
    }
  }
  return raw.replace(/^\/+/, "").split("?")[0];
}

/**
 * Rassemble toutes les références de fichiers réellement présentes en base.
 *
 * Plutôt qu'une liste figée de colonnes (qui deviendrait obsolète), on
 * interroge `information_schema` pour trouver les colonnes susceptibles de
 * contenir un chemin de fichier. Toute erreur sur une table est ignorée :
 * le job ne doit jamais échouer à cause d'une colonne manquante.
 */
export async function collectReferencedKeys(): Promise<{
  keys: Set<string>;
  scannedColumns: number;
}> {
  const keys = new Set<string>();

  let columns: Array<{ table_name: string; column_name: string; data_type: string }> = [];
  try {
    columns = await prisma.$queryRawUnsafe(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name NOT LIKE '\\_prisma%'
        AND table_name NOT IN ('storage_objects', 'rate_limit_counters')
        AND data_type IN ('text', 'character varying', 'ARRAY')
        AND column_name ~ '(image|logo|banner|file|url|avatar|document|cover|photo|video|pdf|attachment|thumbnail|media|deliverable)'
      ORDER BY table_name, column_name
      LIMIT 120
    `);
  } catch {
    return { keys, scannedColumns: 0 };
  }

  for (const column of columns) {
    const table = column.table_name;
    const field = column.column_name;
    if (!SAFE_IDENT.test(table) || !SAFE_IDENT.test(field)) continue;

    const isArray = column.data_type === "ARRAY";
    const query = isArray
      ? `SELECT DISTINCT unnest("${field}")::text AS v FROM "${table}" WHERE "${field}" IS NOT NULL LIMIT 50000`
      : `SELECT DISTINCT "${field}"::text AS v FROM "${table}" WHERE "${field}" IS NOT NULL LIMIT 50000`;

    try {
      const rows = (await prisma.$queryRawUnsafe(query)) as Array<{ v: string | null }>;
      for (const row of rows) {
        const key = normalizeStorageKey(String(row?.v || ""));
        if (key) keys.add(key);
      }
    } catch {
      // Table/colonne absente ou type inattendu : on continue.
    }
  }

  return { keys, scannedColumns: columns.length };
}

export interface StorageCleanupReport {
  dryRun: boolean;
  minAgeHours: number;
  scannedObjects: number;
  referencedKeys: number;
  scannedColumns: number;
  orphanCount: number;
  deletedCount: number;
  errorCount: number;
  samples: Array<{ key: string; sizeMb: number; ageHours: number }>;
  durationMs: number;
}

/** Ramène la durée demandée dans une plage sûre (jamais < 24 h). */
export function clampMinAgeHours(value: number | undefined): number {
  const parsed = Number(value);
  const hours = Number.isFinite(parsed) && parsed > 0 ? parsed : MIN_AGE_HOURS;
  return Math.min(Math.max(hours, MIN_AGE_HOURS), 24 * 90);
}

/**
 * Détecte (et supprime si `dryRun === false`) les fichiers R2 sans référence
 * en base, plus anciens que `minAgeHours`.
 */
export async function cleanupStorage(options: {
  dryRun: boolean;
  minAgeHours: number;
}): Promise<StorageCleanupReport> {
  const startedAt = Date.now();
  const dryRun = options.dryRun !== false;
  const minAgeHours = clampMinAgeHours(options.minAgeHours);
  const cutoff = new Date(Date.now() - minAgeHours * 60 * 60 * 1000);

  // 1. Inventaire des fichiers envoyés (jamais mentionnés en base = candidat).
  let candidates: Array<{ key: string; size: number; createdAt: Date }> = [];
  try {
    candidates = await prisma.storageObject.findMany({
      where: { status: { not: "deleted" }, createdAt: { lt: cutoff } },
      orderBy: { createdAt: "asc" },
      take: MAX_OBJECTS_PER_RUN,
      select: { key: true, size: true, createdAt: true },
    });
  } catch {
    return {
      dryRun,
      minAgeHours,
      scannedObjects: 0,
      referencedKeys: 0,
      scannedColumns: 0,
      orphanCount: 0,
      deletedCount: 0,
      errorCount: 0,
      samples: [],
      durationMs: Date.now() - startedAt,
    };
  }

  if (candidates.length === 0) {
    return {
      dryRun,
      minAgeHours,
      scannedObjects: 0,
      referencedKeys: 0,
      scannedColumns: 0,
      orphanCount: 0,
      deletedCount: 0,
      errorCount: 0,
      samples: [],
      durationMs: Date.now() - startedAt,
    };
  }

  // 2. Références réellement utilisées par l'application.
  const { keys: referenced, scannedColumns } = await collectReferencedKeys();

  // 3. Orphelins = ni dans la base, ni trop récents.
  const orphans = candidates.filter((item) => !referenced.has(normalizeStorageKey(item.key)));

  let deletedCount = 0;
  let errorCount = 0;

  if (!dryRun) {
    for (const orphan of orphans) {
      try {
        await deleteFromR2(orphan.key);
        await markStorageObjectDeleted(orphan.key);
        deletedCount += 1;
      } catch {
        errorCount += 1;
      }
    }
  }

  return {
    dryRun,
    minAgeHours,
    scannedObjects: candidates.length,
    referencedKeys: referenced.size,
    scannedColumns,
    orphanCount: orphans.length,
    deletedCount,
    errorCount,
    samples: orphans.slice(0, 20).map((item) => ({
      key: item.key,
      sizeMb: Math.round((item.size / (1024 * 1024)) * 10) / 10,
      ageHours: Math.floor((Date.now() - item.createdAt.getTime()) / (60 * 60 * 1000)),
    })),
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Purge les compteurs de limitation de débit expirés depuis plus de
 * `minAgeHours` heures. Retourne le nombre de lignes supprimées.
 */
export async function purgeRateLimitCounters(minAgeHours = MIN_AGE_HOURS): Promise<number> {
  const hours = clampMinAgeHours(minAgeHours);
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  try {
    const result = await prisma.rateLimitCounter.deleteMany({
      where: { resetAt: { lt: cutoff } },
    });
    return result.count;
  } catch {
    return 0;
  }
}