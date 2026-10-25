-- ============================================================
-- FORTIA HUB — KYC : MASQUAGE VERROUILLÉ & SUPPRESSION DES PIÈCES
-- ------------------------------------------------------------
-- Objectif : un administrateur peut MASQUER les informations
-- sensibles d'un dossier KYC (identité, contact, pièce, société,
-- fichiers). Le déverrouillage exige un CODE SECRET À 6 CHIFFRES,
-- défini AVANT le masquage et PROPRE À CE DOSSIER (pas de code
-- global : chaque KYC a le sien).
--
-- Il peut également SUPPRIMER définitivement une pièce (image/PDF) :
-- le fichier est retiré du stockage R2 et la référence est effacée
-- en base ; le nom du champ supprimé reste journalisé (deleted_docs).
--
-- Exécution : idempotente (peut être relancée sans risque).
-- ============================================================

ALTER TABLE kyc_submissions
  ADD COLUMN IF NOT EXISTS hidden_fields      TEXT NOT NULL DEFAULT '';

ALTER TABLE kyc_submissions
  ADD COLUMN IF NOT EXISTS lock_code_hash     TEXT NOT NULL DEFAULT '';

ALTER TABLE kyc_submissions
  ADD COLUMN IF NOT EXISTS locked_at          TIMESTAMPTZ;

ALTER TABLE kyc_submissions
  ADD COLUMN IF NOT EXISTS lock_attempts      INTEGER NOT NULL DEFAULT 0;

ALTER TABLE kyc_submissions
  ADD COLUMN IF NOT EXISTS lock_blocked_until TIMESTAMPTZ;

ALTER TABLE kyc_submissions
  ADD COLUMN IF NOT EXISTS deleted_docs       TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS kyc_submissions_locked_at_idx
  ON kyc_submissions (locked_at);

-- Documentation des colonnes
COMMENT ON COLUMN kyc_submissions.hidden_fields IS
  'Groupes masqués, séparés par des virgules : identity,contact,document,company,files';
COMMENT ON COLUMN kyc_submissions.lock_code_hash IS
  'Hash bcrypt du code à 6 chiffres propre à ce dossier (jamais exposé au client)';
COMMENT ON COLUMN kyc_submissions.lock_attempts IS
  'Tentatives de déverrouillage échouées consécutives (anti force brute)';
COMMENT ON COLUMN kyc_submissions.lock_blocked_until IS
  'Fin du blocage temporaire après trop de tentatives';
COMMENT ON COLUMN kyc_submissions.deleted_docs IS
  'Colonnes de document supprimées par un administrateur (journal)';
