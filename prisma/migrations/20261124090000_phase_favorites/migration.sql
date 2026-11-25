-- Favoris des membres (formations et produits numériques).
-- Idempotent : la table peut déjà avoir été créée manuellement.

CREATE TABLE IF NOT EXISTS "public"."favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "favorites_user_id_resource_type_resource_id_key"
    ON "public"."favorites"("user_id", "resource_type", "resource_id");

CREATE INDEX IF NOT EXISTS "favorites_user_id_idx"
    ON "public"."favorites"("user_id");
