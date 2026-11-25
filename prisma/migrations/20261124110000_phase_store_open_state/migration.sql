-- Boutique ouverte / en pause (les achats sont bloqués quand la boutique est en pause)
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "is_open" BOOLEAN NOT NULL DEFAULT true;
