-- ============================================================
-- FORTIA HUB — SQL 10 : TABLES BANNIÈRES DU SITE
-- Description : bandeau animé en haut du site (image R2, animation,
--               bouton/lien interne ou externe, durée d'affichage)
-- Ordre d'execution : 10 (apres SQL 9)
-- Idempotent : peut etre rejoue sans erreur ni doublon.
-- ============================================================

-- ========== SITE_BANNERS ==========
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

-- Colonnes ajoutees si la table existait deja sans elles (script idempotent)
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

-- Contraintes de coherence (valeurs acceptees par l'interface d'administration)
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

-- ========== INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_site_banners_active ON site_banners(is_active);
CREATE INDEX IF NOT EXISTS idx_site_banners_display_order ON site_banners(display_order);

-- ========== TRIGGER : mise a jour automatique updated_at ==========
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

-- ========== RLS : lecture publique des bannières actives, ecriture admin ==========
ALTER TABLE site_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_banners_lecture_publique" ON site_banners;
CREATE POLICY "site_banners_lecture_publique" ON site_banners
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "site_banners_ecriture_service" ON site_banners;
CREATE POLICY "site_banners_ecriture_service" ON site_banners
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ========== SEED (optionnel) : laisser vide par defaut ==========
-- Aucune bannière de demonstration : les visuels sont importes depuis
-- l'administration (module « Bannières du Site ») vers Cloudflare R2.
