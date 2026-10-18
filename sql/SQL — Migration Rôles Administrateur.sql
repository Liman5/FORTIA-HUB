-- ============================================================
-- FORTIA HUB — MIGRATION : RÔLES ADMINISTRATEUR ÉTENDUS
-- ------------------------------------------------------------
-- Ajoute `superadmin` et `super_admin` au type énuméré `user_role`
-- utilisé par `users.account_type`.
--
-- Pourquoi : Prisma ne connaissait que buyer/freelance/enterprise/admin.
-- Un compte dont `account_type = 'superadmin'` provoquait une ERREUR DE
-- LECTURE (valeur inconnue de l'enum) → connexion impossible, et le
-- contrôle d'accès admin refusait l'utilisateur.
--
-- Idempotent : peut être rejoué sans erreur.
-- ============================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Vérification (informatif) : valeurs du type après migration.
SELECT enumlabel AS role_disponible
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;
