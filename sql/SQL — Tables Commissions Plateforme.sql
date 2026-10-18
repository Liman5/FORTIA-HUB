-- ============================================================
-- FORTIA HUB — TAUX DE COMMISSION DE LA PLATEFORME
-- ------------------------------------------------------------
-- Un taux par « portée » (scope) de vente :
--   general          → taux par défaut, utilisé si aucun taux spécifique
--   digital_product  → produits numériques de la boutique
--   course           → formations (Académie)
--   service          → prestations de l'agence
--   storage          → stockage vidéo des centres de formation
--
-- mode :
--   percent → pourcentage du montant de la vente (ex. 10 %)
--   fixed   → montant FIXE en dollars, prélevé par vente (ex. 1,50 $)
--
-- Script idempotent : peut être relancé sans erreur.
-- ============================================================

CREATE TABLE IF NOT EXISTS commission_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope       TEXT NOT NULL UNIQUE
              CHECK (scope IN ('general','digital_product','course','service','storage')),
  mode        TEXT NOT NULL DEFAULT 'percent' CHECK (mode IN ('percent','fixed')),
  value       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  label       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Taux général par défaut (10 %), créé seulement s'il n'existe pas
INSERT INTO commission_rules (scope, mode, value, is_active, label)
SELECT 'general', 'percent', 10, TRUE, 'Taux général plateforme'
WHERE NOT EXISTS (SELECT 1 FROM commission_rules WHERE scope = 'general');

-- Taux spécifiques : créés DÉSACTIVÉS (aucune surprise sur les ventes existantes)
INSERT INTO commission_rules (scope, mode, value, is_active, label)
SELECT v.scope, 'percent', 10, FALSE, v.label
FROM (VALUES
  ('digital_product', 'Produits numériques'),
  ('course',          'Formations'),
  ('service',         'Prestations de services'),
  ('storage',         'Stockage vidéo (formateurs)')
) AS v(scope, label)
WHERE NOT EXISTS (SELECT 1 FROM commission_rules c WHERE c.scope = v.scope);

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION set_updated_at_commission_rules() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_commission_rules_updated ON commission_rules;
CREATE TRIGGER trg_commission_rules_updated
BEFORE UPDATE ON commission_rules
FOR EACH ROW EXECUTE FUNCTION set_updated_at_commission_rules();

-- Lecture : règles actives consultables (affichage du détail pendant le paiement).
-- Écriture : réservée au service (aucune policy d'écriture publique).
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commission_rules_public_read ON commission_rules;
CREATE POLICY commission_rules_public_read ON commission_rules
  FOR SELECT USING (is_active = TRUE);
