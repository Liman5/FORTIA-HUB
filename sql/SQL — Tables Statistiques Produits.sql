-- ============================================================
-- FORTIA HUB — STATISTIQUES PRODUITS (vues, clics, ajouts au panier)
-- ------------------------------------------------------------
-- Une ligne par événement, écrite par le navigateur via /api/track.
-- Le vendeur voit les compteurs agrégés dans son espace (bloc Statistiques).
-- Script idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS product_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NULL,
  store_id    UUID NULL,
  event_type  TEXT NOT NULL CHECK (event_type IN ('view','click','add_to_cart')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_events_product ON product_events (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_store   ON product_events (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_type    ON product_events (event_type, created_at DESC);

-- Lecture/écriture réservées au service (aucune policy publique).
ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;
