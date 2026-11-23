-- ============================================================
-- FORTIA HUB - Etape UI/UX : marqueur des donnees de demonstration
-- ------------------------------------------------------------
-- Chaque table pouvant accueillir un jeu de demonstration recoit un
-- booleen `is_demo`. Il permet :
--   · d'afficher les donnees de demo comme de vraies donnees (API/pages) ;
--   · de les compter et de les supprimer depuis l'Admin ;
--   · de ne JAMAIS toucher aux donnees reelles lors de la purge.
-- ============================================================

ALTER TABLE "users"               ADD COLUMN IF NOT EXISTS "is_demo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "course_categories"   ADD COLUMN IF NOT EXISTS "is_demo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "courses"             ADD COLUMN IF NOT EXISTS "is_demo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "training_centers"    ADD COLUMN IF NOT EXISTS "is_demo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "stores"              ADD COLUMN IF NOT EXISTS "is_demo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products"            ADD COLUMN IF NOT EXISTS "is_demo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "freelance_profiles"  ADD COLUMN IF NOT EXISTS "is_demo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "site_banners"        ADD COLUMN IF NOT EXISTS "is_demo" BOOLEAN NOT NULL DEFAULT false;
