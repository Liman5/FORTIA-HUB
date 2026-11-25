-- Galerie d'images supplémentaires pour les produits numériques.
-- Idempotent : la colonne peut déjà avoir été créée manuellement.

ALTER TABLE "public"."products"
    ADD COLUMN IF NOT EXISTS "images" JSONB NOT NULL DEFAULT '[]'::jsonb;
