-- ============================================================
-- FORTIA HUB — PHASE 2 : paiements, abonnements, entitlements
-- Migration additive uniquement (aucune suppression de données).
-- ============================================================

-- 1) Statuts supplémentaires
DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'Annule';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('pending','active','past_due','cancelled','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE entitlement_status AS ENUM ('active','suspended','revoked','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Webhooks : fournisseur en texte libre + idempotence
ALTER TABLE payment_webhooks ALTER COLUMN gateway_code TYPE TEXT USING gateway_code::text;
ALTER TABLE payment_webhooks ADD COLUMN IF NOT EXISTS event_id TEXT NOT NULL DEFAULT '';
ALTER TABLE payment_webhooks ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE payment_webhooks ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
UPDATE payment_webhooks SET event_id = id WHERE event_id = '';
CREATE UNIQUE INDEX IF NOT EXISTS payment_webhooks_gateway_code_event_id_key
  ON payment_webhooks (gateway_code, event_id);

-- 3) Transactions : provider, montants en unités mineures, confirmation
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT '';
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS amount_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS checkout_url TEXT NOT NULL DEFAULT '';
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS failure_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS event_id TEXT NOT NULL DEFAULT '';
ALTER TABLE payment_transactions ALTER COLUMN provider_ref DROP NOT NULL;
ALTER TABLE payment_transactions ALTER COLUMN provider_ref DROP DEFAULT;
ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_order_id_key;
UPDATE payment_transactions SET provider_ref = 'local-' || id WHERE provider_ref = '' OR provider_ref IS NULL;
UPDATE payment_transactions SET amount_minor = ROUND(amount_usd * 100)::int WHERE amount_minor = 0;
CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_provider_provider_ref_key
  ON payment_transactions (provider, provider_ref);

-- 4) Commandes : devise, montants, dates
ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS subtotal_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS total_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
UPDATE marketplace_orders
SET subtotal_minor = ROUND(amount_usd * 100)::int,
    total_minor = ROUND(amount_usd * 100)::int
WHERE total_minor = 0;
CREATE INDEX IF NOT EXISTS marketplace_orders_status_idx ON marketplace_orders (status);

-- 5) Nouvelles tables
CREATE TABLE IF NOT EXISTS marketplace_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  resource_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  unit_price_minor INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_minor INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketplace_order_items_order_id_idx ON marketplace_order_items (order_id);
CREATE INDEX IF NOT EXISTS marketplace_order_items_type_resource_idx ON marketplace_order_items (item_type, resource_id);

CREATE TABLE IF NOT EXISTS price_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  interval TEXT NOT NULL DEFAULT 'month',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  order_id UUID UNIQUE REFERENCES marketplace_orders(id) ON DELETE SET NULL,
  status subscription_status NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT '',
  provider_ref TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx ON subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS subscriptions_status_period_idx ON subscriptions (status, current_period_end);

CREATE TABLE IF NOT EXISTS entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  status entitlement_status NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT '',
  order_id UUID REFERENCES marketplace_orders(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  payment_id TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT entitlements_user_resource_key UNIQUE (user_id, resource_type, resource_id)
);
CREATE INDEX IF NOT EXISTS entitlements_user_status_idx ON entitlements (user_id, status);
CREATE INDEX IF NOT EXISTS entitlements_resource_idx ON entitlements (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS entitlements_expires_idx ON entitlements (expires_at);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT '',
  provider_ref TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS refunds_order_id_idx ON refunds (order_id);
CREATE INDEX IF NOT EXISTS refunds_payment_id_idx ON refunds (payment_id);

-- 6) Tarifs serveur (stockage et frais de centre) — valeurs actuelles de l'UI
INSERT INTO price_plans (code, label, amount_minor, currency, is_active, metadata) VALUES
  ('storage_10gb', '10 GB de stockage vidéo', 300, 'USD', true, '{"gb":10}'),
  ('storage_25gb', '25 GB de stockage vidéo', 600, 'USD', true, '{"gb":25}'),
  ('storage_50gb', '50 GB de stockage vidéo', 1000, 'USD', true, '{"gb":50}'),
  ('center_fee', 'Frais de création du centre de formation', 200, 'USD', true, '{}')
ON CONFLICT (code) DO NOTHING;

-- 7) Reprise des droits existants (aucune perte d'accès)
INSERT INTO entitlements (user_id, resource_type, resource_id, status, source, starts_at)
SELECT u.id, 'course', cid, 'active', 'migration', now()
FROM users u CROSS JOIN LATERAL unnest(u.enrolled_course_ids) AS cid
WHERE cid <> ''
ON CONFLICT (user_id, resource_type, resource_id) DO NOTHING;

INSERT INTO entitlements (user_id, resource_type, resource_id, status, source, starts_at)
SELECT u.id, 'product', pid, 'active', 'migration', now()
FROM users u CROSS JOIN LATERAL unnest(u.purchased_product_ids) AS pid
WHERE pid <> ''
ON CONFLICT (user_id, resource_type, resource_id) DO NOTHING;

INSERT INTO entitlements (user_id, resource_type, resource_id, status, source, starts_at)
SELECT e.user_id, 'course', e.course_id, 'active', 'migration', now()
FROM course_enrollments e
ON CONFLICT (user_id, resource_type, resource_id) DO NOTHING;

