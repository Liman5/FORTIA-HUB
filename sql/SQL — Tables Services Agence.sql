-- ============================================================
-- FORTIA HUB — SQL 7 : TABLES SERVICES AGENCE
-- Description : Packs de services, options, demandes de devis
-- Ordre d'execution : 7 (apres SQL 6)
-- ============================================================

-- ========== SERVICE_PACKAGES ==========
CREATE TABLE IF NOT EXISTS service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  starting_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_days TEXT NOT NULL DEFAULT '3 a 5 jours',
  icon_name TEXT NOT NULL DEFAULT 'Palette',
  deliverables TEXT[] NOT NULL DEFAULT '{}',
  image TEXT NOT NULL DEFAULT '',
  image_position TEXT NOT NULL DEFAULT '50% 50%',
  border_style TEXT NOT NULL DEFAULT 'gold',
  card_animation TEXT NOT NULL DEFAULT 'fade-up',
  accent_color TEXT NOT NULL DEFAULT '#D69E25',
  badge_text TEXT NOT NULL DEFAULT '',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colonnes ajoutees si la table existait deja sans elles (script idempotent)
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS image TEXT NOT NULL DEFAULT '';
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS image_position TEXT NOT NULL DEFAULT '50% 50%';
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS border_style TEXT NOT NULL DEFAULT 'gold';
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS card_animation TEXT NOT NULL DEFAULT 'fade-up';
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#D69E25';
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS badge_text TEXT NOT NULL DEFAULT '';
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ========== SERVICE_OPTIONS ==========
CREATE TABLE IF NOT EXISTS service_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- ========== SERVICE_QUOTES ==========
CREATE TABLE IF NOT EXISTS service_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT NOT NULL DEFAULT '',
  service_id UUID REFERENCES service_packages(id) ON DELETE SET NULL,
  service_title TEXT NOT NULL,
  estimated_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  details TEXT NOT NULL DEFAULT '',
  deadline TEXT NOT NULL DEFAULT '',
  status quote_status NOT NULL DEFAULT 'Recu',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_service_packages_active ON service_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_service_packages_category ON service_packages(category);
CREATE INDEX IF NOT EXISTS idx_service_packages_featured ON service_packages(featured);
CREATE INDEX IF NOT EXISTS idx_service_options_service_id ON service_options(service_id);
CREATE INDEX IF NOT EXISTS idx_service_quotes_service_id ON service_quotes(service_id);
CREATE INDEX IF NOT EXISTS idx_service_quotes_status ON service_quotes(status);

-- ========== TRIGGER : mise a jour automatique updated_at ==========
CREATE OR REPLACE FUNCTION update_service_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_packages_updated_at ON service_packages;
CREATE TRIGGER trg_service_packages_updated_at
BEFORE UPDATE ON service_packages
FOR EACH ROW
EXECUTE FUNCTION update_service_packages_updated_at();

-- ========== SEED : Services d'exemple ==========
-- Seed uniquement si la table est vide (les IDs sont generes par la base).
-- Protege contre les doublons lors des re-executions.
INSERT INTO service_packages (title, category, description, starting_price, estimated_days, icon_name, deliverables, border_style, card_animation, accent_color, badge_text, featured, is_active, display_order)
SELECT * FROM (VALUES
  ('Conception de Logo & Identite Visuelle', 'Design & Graphisme', 'Creation d un logo professionnel unique avec charte graphique complete et fichiers sources vectoriels.', 120, '3 a 5 jours', 'Palette', ARRAY['Logo vectoriel haute resolution','Charte graphique complete (couleurs + typographies)','Fichiers sources modifiables (AI, PNG, SVG)','Revisions illimitees jusqu a satisfaction'], 'gold', 'fade-up', '#D69E25', 'Best-Seller', TRUE, TRUE, 1),
  ('Conception d Affiches & Visuels Publicitaires', 'Design & Graphisme', 'Creation visuelle percutante pour vos evenements, lancements de produits, campagnes d affichage et publicites sur reseaux.', 60, '2 jours', 'Image', ARRAY['Affiche haute resolution prete pour l impression (CMJN 300 DPI)','Adaptations aux formats digitaux (Instagram, Facebook, WhatsApp)','Fichiers sources modifiables','Revisions illimitees jusqu a satisfaction'], 'emerald', 'zoom-in', '#10B981', '', FALSE, TRUE, 2),
  ('Redaction & Design de White Papers', 'Redaction & Strategie', 'Elaboration de livres blancs institutionnels, presentations de projets blockchain/IA ou dossiers d investissement d elite.', 200, '5 a 7 jours', 'FileText', ARRAY['Redaction technique et redactionnelle haut niveau','Mise en page graphique soignee aux couleurs de votre marque','Schemas, infographies et tableaux statistiques integres','Export PDF interactif de haute qualite'], 'purple', 'flip', '#8B5CF6', 'Premium', TRUE, TRUE, 3),
  ('Montage Video & Motion Design', 'Photo & Video', 'Montage professionnel de vos videos avec effets, transitions, sous-titres animes et sound design percutant.', 150, '4 a 6 jours', 'Video', ARRAY['Montage complet avec transitions et effets','Sous-titres animes','Sound design et mixage audio','Format adapte (Reels, YouTube, TV)'], 'rose', 'slide-in', '#F43F5E', 'Tendance', FALSE, TRUE, 4),
  ('Strategie Marketing Digital 360', 'Marketing Digital', 'Elaboration d une strategie marketing complete : reseaux sociaux, campagnes publicitaires, SEO et tunnel de vente.', 250, '7 jours', 'Share2', ARRAY['Audit complet de votre presence digitale','Plan d action marketing personnalise','Calendrier editorial 30 jours','Recommandations SEO & publicitaires'], 'blue', 'pulse', '#3B82F6', 'Conseil Expert', FALSE, TRUE, 5)
) AS v(title, category, description, starting_price, estimated_days, icon_name, deliverables, border_style, card_animation, accent_color, badge_text, featured, is_active, display_order)
WHERE NOT EXISTS (SELECT 1 FROM service_packages);
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';
