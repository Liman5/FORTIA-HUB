-- ============================================================
-- FORTIA HUB — Maintenance : inventaire R2 & compteurs de débit
-- ------------------------------------------------------------
-- 1) `storage_objects` : inventaire des fichiers envoyés sur Cloudflare R2.
--    Permet de détecter les fichiers « orphelins » (envoyés mais jamais
--    enregistrés en base) puis de les supprimer après 24 h minimum.
-- 2) `rate_limit_counters` : compteurs de limitation de débit partagés
--    entre toutes les instances (protection anti-force brute fiable en
--    serverless). Les lignes expirées sont purgées périodiquement.
--
-- Script idempotent : peut être relancé sans risque.
-- ============================================================

-- ---------- 1. Inventaire du stockage ----------
CREATE TABLE IF NOT EXISTS storage_objects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT NOT NULL UNIQUE,          -- clé R2 (dossier/entité/fichier)
  folder        TEXT NOT NULL DEFAULT '',      -- 1er segment de la clé
  entity_id     TEXT NOT NULL DEFAULT '',
  size          INTEGER NOT NULL DEFAULT 0,    -- octets
  content_type  TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | deleted
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS storage_objects_created_at_idx ON storage_objects (created_at);
CREATE INDEX IF NOT EXISTS storage_objects_status_idx ON storage_objects (status);
CREATE INDEX IF NOT EXISTS storage_objects_folder_idx ON storage_objects (folder);

-- ---------- 2. Compteurs de limitation de débit ----------
CREATE TABLE IF NOT EXISTS rate_limit_counters (
  key         TEXT PRIMARY KEY,               -- ex. « login:1.2.3.4 »
  count       INTEGER NOT NULL DEFAULT 0,
  reset_at    TIMESTAMPTZ NOT NULL,           -- fin de la fenêtre
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_counters_reset_at_idx ON rate_limit_counters (reset_at);

-- ---------- 3. Verrouillage (aucun accès public) ----------
ALTER TABLE storage_objects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_counters  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_objects_service_only ON storage_objects;
CREATE POLICY storage_objects_service_only ON storage_objects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS rate_limit_counters_service_only ON rate_limit_counters;
CREATE POLICY rate_limit_counters_service_only ON rate_limit_counters
  FOR ALL TO service_role USING (true) WITH CHECK (true);
