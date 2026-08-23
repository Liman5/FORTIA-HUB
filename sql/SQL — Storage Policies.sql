-- ============================================================
-- FORTIA HUB — SQL 15 : STORAGE POLICIES (SUPABASE)
-- Description : Buckets de stockage pour produits, cours, KYC, images
-- Ordre d'exécution : 15 (après SQL 14)
-- Prérequis : Supabase Storage
-- NOTE : Script IDEMPOTENT — ré-exécutable sans erreur grâce aux
--        DROP POLICY IF EXISTS avant chaque CREATE POLICY.
-- ============================================================

-- ============================================================
-- IMPORTANT : CRÉATION DES BUCKETS
-- ============================================================
-- Les buckets doivent être créés via l'interface Supabase Storage
-- (Dashboard > Storage > New bucket) OU via une connexion avec le
-- rôle `postgres` (SQL Editor avec le rôle postgres).
--
-- Buckets à créer :
--   product-files  (privé)  : Fichiers livrables produits
--   course-media   (privé)  : Vidéos/PDF de formations
--   kyc-documents  (privé)  : Documents KYC sensibles
--   store-images   (public) : Logos/bannières de boutiques
--   site-media     (public) : Médias du CMS (hero, audio, images)
--   blog-images    (public) : Images d'articles de blog
--
-- Si vous avez accès au rôle postgres, vous pouvez exécuter :
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES
--   ('product-files', 'product-files', FALSE),
--   ('course-media', 'course-media', FALSE),
--   ('kyc-documents', 'kyc-documents', FALSE),
--   ('store-images', 'store-images', TRUE),
--   ('site-media', 'site-media', TRUE),
--   ('blog-images', 'blog-images', TRUE)
-- ON CONFLICT (id) DO NOTHING;
-- ============================================================

-- ========== HELPER : Vérifier si l'utilisateur est admin ==========
-- (réutilise la fonction public.is_admin() créée dans SQL 12)

-- ========== HELPER : Vérifier le vendeur propriétaire du produit ==========
-- NOTE : La fonction est créée dans le schéma `public` (et non `storage`)
-- car le schéma `storage` est réservé à Supabase et interdit en écriture.
CREATE OR REPLACE FUNCTION public.is_product_vendor(file_path TEXT, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM products p
    JOIN stores s ON p.store_id = s.id
    WHERE s.vendor_id = user_uuid
      AND file_path LIKE p.id || '/%'
  );
$$;

-- ============================================================
-- CONVENTION DE NOMMAGE DES FICHIERS
-- ============================================================
-- Chaque fichier uploadé DOIT suivre la structure :
--   {ENTITY_ID}/{fichier}   (ex: '123e4567-e89b-12d3-a456-426614174000/mon-produit.pdf')
-- Le premier segment du chemin est utilisé par les policies pour
-- vérifier l'appartenance (produit, cours, boutique, soumission KYC).
-- ============================================================

-- ============================================================
-- BUCKET : PRODUCT-FILES (privé)
-- ============================================================

-- Lecture : uniquement l'acheteur (via commande) ou le vendeur propriétaire ou l'admin
DROP POLICY IF EXISTS "product-files read owner/vendor/admin" ON storage.objects;
CREATE POLICY "product-files read owner/vendor/admin"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-files'
  AND (
    public.is_admin()
    OR public.is_product_vendor(name, auth.uid())
    OR EXISTS (
      SELECT 1 FROM marketplace_orders o
      WHERE o.buyer_email = (SELECT email FROM users WHERE id = auth.uid())
        AND o.product_id = SPLIT_PART(name, '/', 1)::UUID
    )
  )
);

-- Upload : vendeur propriétaire ou admin
DROP POLICY IF EXISTS "product-files write vendor/admin" ON storage.objects;
CREATE POLICY "product-files write vendor/admin"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-files'
  AND (public.is_admin() OR public.is_product_vendor(name, auth.uid()))
);

-- Modification : vendeur propriétaire ou admin
DROP POLICY IF EXISTS "product-files update vendor/admin" ON storage.objects;
CREATE POLICY "product-files update vendor/admin"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-files'
  AND (public.is_admin() OR public.is_product_vendor(name, auth.uid()))
)
WITH CHECK (
  bucket_id = 'product-files'
  AND (public.is_admin() OR public.is_product_vendor(name, auth.uid()))
);

-- Suppression : vendeur propriétaire ou admin
DROP POLICY IF EXISTS "product-files delete vendor/admin" ON storage.objects;
CREATE POLICY "product-files delete vendor/admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-files'
  AND (public.is_admin() OR public.is_product_vendor(name, auth.uid()))
);

-- ============================================================
-- BUCKET : COURSE-MEDIA (privé)
-- ============================================================
DROP POLICY IF EXISTS "course-media read enrolled" ON storage.objects;
CREATE POLICY "course-media read enrolled"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'course-media'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM course_enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = auth.uid()
        AND SPLIT_PART(name, '/', 1) = c.id::TEXT
    )
  )
);

DROP POLICY IF EXISTS "course-media write admin" ON storage.objects;
CREATE POLICY "course-media write admin"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'course-media' AND public.is_admin());

DROP POLICY IF EXISTS "course-media update admin" ON storage.objects;
CREATE POLICY "course-media update admin"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'course-media' AND public.is_admin())
WITH CHECK (bucket_id = 'course-media' AND public.is_admin());

DROP POLICY IF EXISTS "course-media delete admin" ON storage.objects;
CREATE POLICY "course-media delete admin"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'course-media' AND public.is_admin());

-- ============================================================
-- BUCKET : KYC-DOCUMENTS (privé, strict)
-- ============================================================
DROP POLICY IF EXISTS "kyc-documents read owner/admin" ON storage.objects;
CREATE POLICY "kyc-documents read owner/admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM kyc_submissions k
      WHERE k.applicant_id = auth.uid()
        AND SPLIT_PART(name, '/', 1) = k.id::TEXT
    )
  )
);

DROP POLICY IF EXISTS "kyc-documents write owner" ON storage.objects;
CREATE POLICY "kyc-documents write owner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND EXISTS (
    SELECT 1 FROM kyc_submissions k
    WHERE k.applicant_id = auth.uid()
      AND SPLIT_PART(name, '/', 1) = k.id::TEXT
  )
);

DROP POLICY IF EXISTS "kyc-documents update owner" ON storage.objects;
CREATE POLICY "kyc-documents update owner"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND EXISTS (
    SELECT 1 FROM kyc_submissions k
    WHERE k.applicant_id = auth.uid()
      AND SPLIT_PART(name, '/', 1) = k.id::TEXT
  )
)
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND EXISTS (
    SELECT 1 FROM kyc_submissions k
    WHERE k.applicant_id = auth.uid()
      AND SPLIT_PART(name, '/', 1) = k.id::TEXT
  )
);

DROP POLICY IF EXISTS "kyc-documents delete admin" ON storage.objects;
CREATE POLICY "kyc-documents delete admin"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'kyc-documents' AND public.is_admin());

-- ============================================================
-- BUCKET : STORE-IMAGES (public)
-- ============================================================
DROP POLICY IF EXISTS "store-images public read" ON storage.objects;
CREATE POLICY "store-images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-images');

DROP POLICY IF EXISTS "store-images write vendor/admin" ON storage.objects;
CREATE POLICY "store-images write vendor/admin"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'store-images'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM stores s
      WHERE s.vendor_id = auth.uid()
        AND SPLIT_PART(name, '/', 1) = s.id::TEXT
    )
  )
);

DROP POLICY IF EXISTS "store-images update vendor/admin" ON storage.objects;
CREATE POLICY "store-images update vendor/admin"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'store-images'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM stores s
      WHERE s.vendor_id = auth.uid()
        AND SPLIT_PART(name, '/', 1) = s.id::TEXT
    )
  )
)
WITH CHECK (
  bucket_id = 'store-images'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM stores s
      WHERE s.vendor_id = auth.uid()
        AND SPLIT_PART(name, '/', 1) = s.id::TEXT
    )
  )
);

DROP POLICY IF EXISTS "store-images delete vendor/admin" ON storage.objects;
CREATE POLICY "store-images delete vendor/admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'store-images'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM stores s
      WHERE s.vendor_id = auth.uid()
        AND SPLIT_PART(name, '/', 1) = s.id::TEXT
    )
  )
);

-- ============================================================
-- BUCKET : SITE-MEDIA (public, admin uniquement en écriture)
-- ============================================================
DROP POLICY IF EXISTS "site-media public read" ON storage.objects;
CREATE POLICY "site-media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-media');

DROP POLICY IF EXISTS "site-media write admin" ON storage.objects;
CREATE POLICY "site-media write admin"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'site-media' AND public.is_admin());

DROP POLICY IF EXISTS "site-media update admin" ON storage.objects;
CREATE POLICY "site-media update admin"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'site-media' AND public.is_admin())
WITH CHECK (bucket_id = 'site-media' AND public.is_admin());

DROP POLICY IF EXISTS "site-media delete admin" ON storage.objects;
CREATE POLICY "site-media delete admin"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'site-media' AND public.is_admin());

-- ============================================================
-- BUCKET : BLOG-IMAGES (public, admin uniquement en écriture)
-- ============================================================
DROP POLICY IF EXISTS "blog-images public read" ON storage.objects;
CREATE POLICY "blog-images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "blog-images write admin" ON storage.objects;
CREATE POLICY "blog-images write admin"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'blog-images' AND public.is_admin());

DROP POLICY IF EXISTS "blog-images update admin" ON storage.objects;
CREATE POLICY "blog-images update admin"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'blog-images' AND public.is_admin())
WITH CHECK (bucket_id = 'blog-images' AND public.is_admin());

DROP POLICY IF EXISTS "blog-images delete admin" ON storage.objects;
CREATE POLICY "blog-images delete admin"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'blog-images' AND public.is_admin());

-- ============================================================
-- NOTE : SUPABASE STORAGE vs CLOUDFLARE R2
-- ============================================================
-- Les policies ci-dessus sont destinées à Supabase Storage et
-- nécessitent le schéma `storage` réservé (exécution avec le rôle
-- `postgres`).
--
-- ⚡ FORTIA HUB utilise désormais CLOUDFLARE R2 (compatible S3)
-- comme service de stockage principal. Les fichiers sont stockés
-- dans le bucket `fortia-hub-storage` via :
--
--   lib/services/r2Storage.ts        (service backend S3)
--   lib/services/clientUpload.ts     (utilitaires client)
--   app/api/storage/upload/route.ts  (POST /api/storage/upload)
--   app/api/storage/delete/route.ts  (POST /api/storage/delete)
--   app/api/storage/signed-url/route.ts (POST /api/storage/signed-url)
--
-- Structure des clés R2 : {bucket}/{entityId}/{fileName}
--   product-files/{productId}/...   (privé — livrables produits)
--   course-media/{courseId}/...     (privé — vidéos/PDF formations)
--   kyc-documents/{submissionId}/... (privé — documents KYC)
--   store-images/{storeId}/...      (public — logos/bannières)
--   site-media/{...}/...            (public — médias CMS)
--   blog-images/{postId}/...        (public — images articles)
--
-- Les fichiers privés sont accessibles via des URL signées R2
-- générées par /api/storage/signed-url (expiration 1h par défaut).
-- Les fichiers publics sont servis via CLOUDFLARE_BUCKET_PUBLIC_URL.
