-- ============================================================
-- FORTIA HUB - Etape UI/UX : affichage des prix en FCFA
-- ------------------------------------------------------------
-- Les montants enregistres restent en USD (aucune conversion de
-- transaction n'est modifiee). Ces deux colonnes pilotent UNIQUEMENT
-- l'affichage :
--   · fcfa_rate         : nombre de FCFA pour 1 USD (taux configure) ;
--   · show_usd_secondary: afficher « ≈ x USD » sous le prix FCFA.
-- Valeur par defaut : 600 FCFA / USD, equivalent USD desactive.
-- ============================================================

ALTER TABLE "site_content" ADD COLUMN IF NOT EXISTS "fcfa_rate" INTEGER NOT NULL DEFAULT 600;
ALTER TABLE "site_content" ADD COLUMN IF NOT EXISTS "show_usd_secondary" BOOLEAN NOT NULL DEFAULT false;
