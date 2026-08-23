-- ============================================================
-- FORTIA HUB — SQL 9 : TABLES PAIEMENTS & TRANSACTIONS
-- Description : Gateways configurables par l'Admin, transactions, webhooks,
--               frais d'inscription, configuration globale de la plateforme
-- Ordre d'exécution : 9 (après SQL 8)
-- ============================================================

-- ========== PAYMENT_GATEWAYS (MODULABLE / ADMIN) ==========
-- Table centrale : chaque moyen de paiement (Wave, OM, MTN, Stripe, PayPal, Crypto)
-- est une LIGNE stockée en base. L'Admin peut l'activer/désactiver, configurer
-- les clés API, les frais, la priorité d'affichage, sans modifier le code.
CREATE TABLE payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code payment_gateway_code NOT NULL UNIQUE,   -- 'wave', 'orange_money', ...
  name TEXT NOT NULL,                            -- 'Wave Sénégal', 'Orange Money API'
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  -- Configuration technique des clés API (jamais exposée publiquement)
  config JSONB NOT NULL DEFAULT '{}',
  -- Structure de frais appliquée (percentage | fixed | mixed)
  fee_structure gateway_fee_struct NOT NULL DEFAULT 'percentage',
  fee_value NUMERIC(6,2) NOT NULL DEFAULT 0,     -- ex: 1.5 (% ou montant fixe)
  fee_currency TEXT NOT NULL DEFAULT 'USD',
  min_amount_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_amount_usd NUMERIC(10,2),
  supported_countries TEXT[] NOT NULL DEFAULT '{}',
  bank_account_name TEXT NOT NULL DEFAULT '',    -- Compte récepteur FORTIA (OM/Wave/Crypto)
  bank_account_number TEXT NOT NULL DEFAULT '',
  bank_provider_name TEXT NOT NULL DEFAULT '',
  is_test_mode BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== PAYMENT_TRANSACTIONS ==========
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES marketplace_orders(id) ON DELETE SET NULL,
  gateway_id UUID REFERENCES payment_gateways(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_fcfa NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  transaction_ref TEXT NOT NULL UNIQUE,
  provider_ref TEXT NOT NULL DEFAULT '',
  status payment_status NOT NULL DEFAULT 'En_attente',
  gateway_response JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== PAYMENT_WEBHOOKS ==========
CREATE TABLE payment_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_code payment_gateway_code NOT NULL,
  event_type TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processing_error TEXT NOT NULL DEFAULT ''
);

-- ========== REGISTRATION_FEE_CONFIG ==========
CREATE TABLE registration_fee_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelance_fee_usd NUMERIC(10,2) NOT NULL DEFAULT 15,
  freelance_fee_fcfa NUMERIC(10,2) NOT NULL DEFAULT 10000,
  enterprise_fee_usd NUMERIC(10,2) NOT NULL DEFAULT 50,
  enterprise_fee_fcfa NUMERIC(10,2) NOT NULL DEFAULT 30000,
  buyer_fee_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  fee_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== PLATFORM_CONFIG (GLOBALE) ==========
CREATE TABLE platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Données de configuration par défaut
INSERT INTO platform_config (key, value, description) VALUES
  ('currency_rates', '{"usd_to_fcfa": 600}', 'Taux de change fixe USD → FCFA utilisé partout'),
  ('platform_settings', '{"name": "FORTIA HUB", "slogan": "LEARN. BUILD. SUCCEED.", "support_email": "contact@fortia-hub.com", "support_phone": "+228 90 88 99 00"}', 'Configuration globale de la plateforme'),
  ('platform_commission', '{"default_percentage": 10}', 'Commission par défaut prélevée sur chaque vente marketplace');