-- ============================================================
-- FORTIA HUB — SQL 10 : TABLES NOTIFICATIONS & CONTENU
-- Description : Notifications, contenu du site (CMS), statistiques agrégées
-- Ordre d'exécution : 10 (après SQL 9)
-- ============================================================

-- ========== NOTIFICATIONS ==========
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = notification globale
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  type notification_type NOT NULL DEFAULT 'info',
  link_tab TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_global BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE si visible par tous
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== SITE_CONTENT (CMS) ==========
-- Une seule ligne de configuration miroir du SiteContent frontend
CREATE TABLE site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_badge_text TEXT NOT NULL DEFAULT 'Plateforme Web Premium de Formation & Services Numériques',
  hero_title_text TEXT NOT NULL DEFAULT 'Excellence, Réussite & Prestige :',
  hero_title_gradient TEXT NOT NULL DEFAULT 'Maîtrisez les Métiers du Futur',
  hero_subtitle TEXT NOT NULL DEFAULT '',
  hero_image_url TEXT NOT NULL DEFAULT '',
  hero_video_url TEXT NOT NULL DEFAULT '',
  hero_audio_url TEXT NOT NULL DEFAULT '',
  hero_primary_cta TEXT NOT NULL DEFAULT 'Explorer les Formations',
  hero_secondary_cta TEXT NOT NULL DEFAULT 'Explorer la Boutique & Produits',
  top_announcement_banner TEXT NOT NULL DEFAULT '',
  stat_students TEXT NOT NULL DEFAULT '15k+',
  stat_success_rate TEXT NOT NULL DEFAULT '98%',
  stat_modules TEXT NOT NULL DEFAULT '45+',
  footer_about_text TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT 'contact@fortia-hub.com',
  contact_phone TEXT NOT NULL DEFAULT '+228 90 88 99 00',
  support_hours TEXT NOT NULL DEFAULT '7J/7 • 08h00 - 22h00 GMT',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insérer la ligne unique par défaut
INSERT INTO site_content (hero_badge_text, hero_title_text, hero_title_gradient, hero_subtitle, hero_image_url, hero_video_url, hero_audio_url, hero_primary_cta, hero_secondary_cta, top_announcement_banner, stat_students, stat_success_rate, stat_modules, footer_about_text, contact_email, contact_phone, support_hours)
VALUES (
  'Plateforme Web Premium de Formation & Services Numériques',
  'Excellence, Réussite & Prestige :',
  'Maîtrisez les Métiers du Futur',
  'Bienvenue sur FORTIA HUB. Obtenez des compétences certifiées à fort impact : Cryptomonnaie, Intelligence Artificielle, Canva, CapCut, Marketing Digital & Entrepreneuriat. Accédez également à notre boutique de ressources numériques et commandez vos prestations de services sur-mesure.',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  '',
  'Explorer les Formations',
  'Explorer la Boutique & Produits',
  '',
  '15k+',
  '98%',
  '45+',
  'FORTIA HUB est l''écosystème web de référence dédié à la formation certifiante, la vente de produits digitaux et la mise en relation avec des experts qualifiés.',
  'contact@fortia-hub.com',
  '+228 90 88 99 00',
  '7J/7 • 08h00 - 22h00 GMT'
);

-- ========== PLATFORM_STATS (AGRÉGÉES) ==========
CREATE TABLE platform_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_users INTEGER NOT NULL DEFAULT 0,
  total_admins INTEGER NOT NULL DEFAULT 0,
  total_courses INTEGER NOT NULL DEFAULT 0,
  total_products INTEGER NOT NULL DEFAULT 0,
  total_stores INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_commissions_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_payouts_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_certificates INTEGER NOT NULL DEFAULT 0,
  total_kyc_pending INTEGER NOT NULL DEFAULT 0,
  total_vendor_applications_pending INTEGER NOT NULL DEFAULT 0,
  total_support_submissions INTEGER NOT NULL DEFAULT 0,
  total_service_quotes INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insérer la ligne unique par défaut
INSERT INTO platform_stats (id) VALUES (gen_random_uuid());