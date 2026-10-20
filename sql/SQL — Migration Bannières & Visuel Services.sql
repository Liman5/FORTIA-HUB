-- ============================================================
-- FORTIA HUB — MIGRATION : BANNIÈRES DU SITE + VISUEL DES SERVICES
-- ------------------------------------------------------------
-- À exécuter UNE fois sur une base existante (Supabase → SQL Editor).
-- Entièrement idempotent : peut être rejoué sans erreur ni doublon.
--   1. Table `site_banners`  → module INDÉPENDANT « Bannières du Site »
--      (image R2, animation, bouton + lien interne/externe, durée)
--   2. Colonne `service_packages.image` → visuel des cartes de services
-- ============================================================

-- ========== 1. VISUEL DES CARTES DE SERVICES ==========
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS image TEXT NOT NULL DEFAULT '';
-- Point focal du recadrage (ex. « 50% 50% », « 50% 20% ») : il est appliqué
-- en `object-position` sur la carte, en mobile comme en web.
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS image_position TEXT NOT NULL DEFAULT '50% 50%';

-- ========== 2. RECADRAGE DES BANNIÈRES DU SITE ==========
-- Point focal appliqué en `object-position` sur le bandeau (web et mobile).
ALTER TABLE site_banners ADD COLUMN IF NOT EXISTS image_position TEXT NOT NULL DEFAULT '50% 50%';

-- ========== 2. BANNIÈRES DU SITE ==========
CREATE TABLE IF NOT EXISTS site_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  animation TEXT NOT NULL DEFAULT 'fade',
  interval_ms INTEGER NOT NULL DEFAULT 5000,
  button_label TEXT NOT NULL DEFAULT '',
  button_link TEXT NOT NULL DEFAULT '',
  link_target TEXT NOT NULL DEFAULT 'internal',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE site_banners ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE site_banners ADD COLUMN IF NOT EXISTS subtitle TEXT NOT NULL DEFAULT '';
ALTER TABLE site_banners ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE site_banners ADD COLUMN IF NOT EXISTS animation TEXT NOT NULL DEFAULT 'fade';
ALTER TABLE site_banners ADD COLUMN IF NOT EXISTS interval_ms INTEGER NOT NULL DEFAULT 5000;
ALTER TABLE site_banners ADD COLUMN IF NOT EXISTS button_label TEXT NOT NULL DEFAULT '';
ALTER TABLE site_banners ADD COLUMN IF NOT EXISTS button_link TEXT NOT NULL DEFAULT '';
ALTER TABLE site_banners ADD COLUMN IF NOT EXISTS link_target TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE site_banners ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE site_banners ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE site_banners ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE site_banners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'site_banners_animation_check') THEN
    ALTER TABLE site_banners ADD CONSTRAINT site_banners_animation_check
      CHECK (animation IN ('none', 'fade', 'slide', 'zoom', 'flip'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'site_banners_link_target_check') THEN
    ALTER TABLE site_banners ADD CONSTRAINT site_banners_link_target_check
      CHECK (link_target IN ('internal', 'external'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'site_banners_interval_check') THEN
    ALTER TABLE site_banners ADD CONSTRAINT site_banners_interval_check
      CHECK (interval_ms BETWEEN 2000 AND 60000);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_site_banners_active ON site_banners(is_active);
CREATE INDEX IF NOT EXISTS idx_site_banners_display_order ON site_banners(display_order);

CREATE OR REPLACE FUNCTION update_site_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_site_banners_updated_at ON site_banners;
CREATE TRIGGER trg_site_banners_updated_at
BEFORE UPDATE ON site_banners
FOR EACH ROW
EXECUTE FUNCTION update_site_banners_updated_at();

ALTER TABLE site_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_banners_lecture_publique" ON site_banners;
CREATE POLICY "site_banners_lecture_publique" ON site_banners
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "site_banners_ecriture_service" ON site_banners;
CREATE POLICY "site_banners_ecriture_service" ON site_banners
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
