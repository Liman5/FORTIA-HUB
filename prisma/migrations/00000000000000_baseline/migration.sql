-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."applicant_type" AS ENUM ('freelance', 'enterprise');

-- CreateEnum
CREATE TYPE "public"."approval_status" AS ENUM ('En_attente', 'Approuve', 'Rejete');

-- CreateEnum
CREATE TYPE "public"."badge_type" AS ENUM ('green', 'gold', 'none');

-- CreateEnum
CREATE TYPE "public"."course_level" AS ENUM ('Debutant', 'Intermediaire', 'Avance', 'Expert', 'Tous_niveaux');

-- CreateEnum
CREATE TYPE "public"."entitlement_status" AS ENUM ('active', 'suspended', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "public"."gateway_fee_struct" AS ENUM ('percentage', 'fixed', 'mixed');

-- CreateEnum
CREATE TYPE "public"."kyc_status" AS ENUM ('non_soumis', 'en_attente', 'approuve', 'rejete');

-- CreateEnum
CREATE TYPE "public"."lesson_type" AS ENUM ('video', 'article', 'quiz');

-- CreateEnum
CREATE TYPE "public"."notification_type" AS ENUM ('info', 'success', 'warning');

-- CreateEnum
CREATE TYPE "public"."order_status" AS ENUM ('Paye', 'En_attente_API', 'Echoue', 'Rembourse', 'Annule');

-- CreateEnum
CREATE TYPE "public"."payment_gateway_code" AS ENUM ('wave', 'orange_money', 'mtn_money', 'card_stripe', 'paypal', 'crypto_usdt_trc20');

-- CreateEnum
CREATE TYPE "public"."payment_status" AS ENUM ('Valide', 'En_attente', 'Echoue', 'Rembourse');

-- CreateEnum
CREATE TYPE "public"."payout_status" AS ENUM ('En_attente', 'Paye', 'Rejete');

-- CreateEnum
CREATE TYPE "public"."product_type" AS ENUM ('ebook', 'canva_template', 'ai_prompts', 'whitepaper', 'business_plan', 'contract', 'pitch_deck', 'premium_pack', 'course', 'service', 'software', 'template');

-- CreateEnum
CREATE TYPE "public"."quote_status" AS ENUM ('Recu', 'En_cours_analyse', 'Devis_valide', 'En_realisation');

-- CreateEnum
CREATE TYPE "public"."store_status" AS ENUM ('active', 'pending', 'suspended');

-- CreateEnum
CREATE TYPE "public"."subscription_status" AS ENUM ('pending', 'active', 'past_due', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "public"."support_status" AS ENUM ('Transmis_Enregistre', 'En_cours', 'Resolu');

-- CreateEnum
CREATE TYPE "public"."user_role" AS ENUM ('buyer', 'freelance', 'enterprise', 'admin', 'superadmin', 'super_admin');

-- CreateTable
CREATE TABLE "public"."admin_activity_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "entity_title" TEXT,
    "details" JSONB DEFAULT '{}',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admin_daily_stats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stat_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "total_revenue_usd" DECIMAL(12,2) DEFAULT 0,
    "platform_commissions_usd" DECIMAL(12,2) DEFAULT 0,
    "vendor_earnings_usd" DECIMAL(12,2) DEFAULT 0,
    "orders_count" INTEGER DEFAULT 0,
    "successful_orders_count" INTEGER DEFAULT 0,
    "active_courses_count" INTEGER DEFAULT 0,
    "active_products_count" INTEGER DEFAULT 0,
    "active_services_count" INTEGER DEFAULT 0,
    "active_stores_count" INTEGER DEFAULT 0,
    "active_instructors_count" INTEGER DEFAULT 0,
    "new_users_count" INTEGER DEFAULT 0,
    "total_users_count" INTEGER DEFAULT 0,
    "kyc_submissions_count" INTEGER DEFAULT 0,
    "kyc_approved_count" INTEGER DEFAULT 0,
    "support_tickets_count" INTEGER DEFAULT 0,
    "support_resolved_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admin_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'super_admin',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blog_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "author_name" TEXT NOT NULL DEFAULT '',
    "author_avatar" TEXT NOT NULL DEFAULT '',
    "author_role" TEXT NOT NULL DEFAULT '',
    "category_id" TEXT,
    "category" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL DEFAULT '',
    "read_time" TEXT NOT NULL DEFAULT '5 min',
    "image" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "accent_color" TEXT NOT NULL DEFAULT '#D69E25',
    "cover_style" TEXT NOT NULL DEFAULT 'image',

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."certificates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "certificate_number" TEXT NOT NULL,
    "user_id" UUID,
    "course_id" UUID,
    "student_name" TEXT NOT NULL,
    "course_title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "issue_date" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "qr_code_url" TEXT NOT NULL DEFAULT '',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."commission_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scope" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'percent',
    "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon_name" TEXT NOT NULL DEFAULT '',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_chapters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_lesson_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "completed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_lessons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chapter_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "duration" TEXT NOT NULL DEFAULT '15 min',
    "type" "public"."lesson_type" NOT NULL DEFAULT 'video',
    "video_url" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "video_protected" BOOLEAN NOT NULL DEFAULT false,
    "video_code_hash" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "course_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_quiz_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_quizzes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "explanation" TEXT NOT NULL DEFAULT '',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "comment" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."courses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category_id" UUID,
    "category_label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "full_description" TEXT NOT NULL DEFAULT '',
    "level" "public"."course_level" NOT NULL DEFAULT 'Tous_niveaux',
    "duration_hours" INTEGER NOT NULL DEFAULT 0,
    "lessons_count" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviews_count" INTEGER NOT NULL DEFAULT 0,
    "students_count" INTEGER NOT NULL DEFAULT 0,
    "image" TEXT NOT NULL DEFAULT '',
    "badge" TEXT NOT NULL DEFAULT '',
    "instructor_name" TEXT NOT NULL DEFAULT '',
    "instructor_role" TEXT NOT NULL DEFAULT '',
    "instructor_avatar" TEXT NOT NULL DEFAULT '',
    "learning_outcomes" JSONB NOT NULL DEFAULT '[]',
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "instructor_id" UUID,
    "center_id" UUID,
    "moderation_status" TEXT NOT NULL DEFAULT 'ok',
    "moderation_reason" TEXT NOT NULL DEFAULT '',
    "moderation_at" TIMESTAMP(6),
    "funds_frozen" BOOLEAN NOT NULL DEFAULT false,
    "appeal_status" TEXT NOT NULL DEFAULT '',
    "appeal_message" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."data_archive" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "payload" JSONB NOT NULL,
    "archived_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_archive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."enterprise_portfolio" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enterprise_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "link" TEXT NOT NULL DEFAULT '',
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "enterprise_portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."enterprise_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "company_name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "logo" TEXT NOT NULL DEFAULT '',
    "badge" "public"."badge_type" NOT NULL DEFAULT 'none',
    "badge_label" TEXT NOT NULL DEFAULT 'Badge Doré (Société Certifiée)',
    "sector" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "verified_documents" BOOLEAN NOT NULL DEFAULT false,
    "registration_fee_paid" BOOLEAN NOT NULL DEFAULT false,
    "can_receive_payments" BOOLEAN NOT NULL DEFAULT false,
    "can_sell_services" BOOLEAN NOT NULL DEFAULT false,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."enterprise_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enterprise_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "starting_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "enterprise_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."enterprise_team" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enterprise_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "avatar" TEXT NOT NULL DEFAULT '',
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "enterprise_team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."entitlements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "status" "public"."entitlement_status" NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL DEFAULT '',
    "order_id" UUID,
    "subscription_id" UUID,
    "payment_id" UUID,
    "starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."freelance_portfolio" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "freelance_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT NOT NULL DEFAULT '',
    "link" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "freelance_portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."freelance_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "avatar" TEXT NOT NULL DEFAULT '',
    "badge" "public"."badge_type" NOT NULL DEFAULT 'none',
    "badge_label" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 5.0,
    "completed_jobs" INTEGER NOT NULL DEFAULT 0,
    "hourly_rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kyc_verified" BOOLEAN NOT NULL DEFAULT false,
    "registration_fee_paid" BOOLEAN NOT NULL DEFAULT false,
    "can_receive_payments" BOOLEAN NOT NULL DEFAULT false,
    "can_sell_services" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT NOT NULL DEFAULT '',
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "freelance_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."freelance_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "freelance_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "starting_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "delivery_days" INTEGER NOT NULL DEFAULT 3,
    "image" TEXT NOT NULL DEFAULT '',
    "orders_completed" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 5.0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "freelance_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."instructor_commissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "instructor_id" UUID NOT NULL,
    "center_id" UUID,
    "order_id" UUID,
    "course_id" UUID,
    "course_title" TEXT NOT NULL DEFAULT '',
    "amount_paid_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "platform_fee_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "instructor_earnings_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'En_attente',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instructor_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."instructor_storage_purchases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "instructor_id" UUID NOT NULL,
    "center_id" UUID,
    "amount_gb" INTEGER NOT NULL,
    "amount_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Paye',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instructor_storage_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."kyc_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicant_type" "public"."applicant_type" NOT NULL,
    "applicant_id" UUID,
    "applicant_name" TEXT NOT NULL,
    "first_name" TEXT NOT NULL DEFAULT '',
    "last_name" TEXT NOT NULL DEFAULT '',
    "rep_role" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "document_type" TEXT NOT NULL,
    "document_number" TEXT NOT NULL,
    "id_expiration_date" TEXT NOT NULL DEFAULT '',
    "id_recto_url" TEXT NOT NULL DEFAULT '',
    "id_verso_url" TEXT NOT NULL DEFAULT '',
    "selfie_url" TEXT NOT NULL DEFAULT '',
    "company_name" TEXT NOT NULL DEFAULT '',
    "legal_form" TEXT NOT NULL DEFAULT '',
    "rccm_number" TEXT NOT NULL DEFAULT '',
    "company_doc_url" TEXT NOT NULL DEFAULT '',
    "document_file_url" TEXT NOT NULL DEFAULT '',
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."approval_status" NOT NULL DEFAULT 'En_attente',
    "admin_notes" TEXT NOT NULL DEFAULT '',
    "rejection_reason" TEXT NOT NULL DEFAULT '',
    "hidden_fields" TEXT NOT NULL DEFAULT '',
    "lock_code_hash" TEXT NOT NULL DEFAULT '',
    "locked_at" TIMESTAMPTZ(6),
    "lock_attempts" INTEGER NOT NULL DEFAULT 0,
    "lock_blocked_until" TIMESTAMPTZ(6),
    "deleted_docs" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "kyc_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."marketplace_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "item_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "unit_price_minor" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total_minor" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."marketplace_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_number" TEXT NOT NULL,
    "buyer_name" TEXT NOT NULL,
    "buyer_email" TEXT NOT NULL,
    "buyer_phone" TEXT NOT NULL DEFAULT '',
    "store_id" UUID,
    "store_name" TEXT NOT NULL,
    "product_id" UUID,
    "product_title" TEXT NOT NULL,
    "amount_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "platform_commission_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vendor_earnings_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payment_gateway" TEXT NOT NULL DEFAULT 'Wave API',
    "transaction_ref" TEXT NOT NULL DEFAULT '',
    "status" "public"."order_status" NOT NULL DEFAULT 'En_attente_API',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buyer_user_id" UUID,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotal_minor" INTEGER NOT NULL DEFAULT 0,
    "total_minor" INTEGER NOT NULL DEFAULT 0,
    "paid_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),

    CONSTRAINT "marketplace_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "type" "public"."notification_type" NOT NULL DEFAULT 'info',
    "link_tab" TEXT NOT NULL DEFAULT '',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."otp_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "otp_code" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_gateways" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" "public"."payment_gateway_code" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "fee_structure" "public"."gateway_fee_struct" NOT NULL DEFAULT 'percentage',
    "fee_value" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "fee_currency" TEXT NOT NULL DEFAULT 'USD',
    "min_amount_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "max_amount_usd" DECIMAL(10,2),
    "supported_countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bank_account_name" TEXT NOT NULL DEFAULT '',
    "bank_account_number" TEXT NOT NULL DEFAULT '',
    "bank_provider_name" TEXT NOT NULL DEFAULT '',
    "is_test_mode" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_gateways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID,
    "gateway_id" UUID,
    "user_id" UUID,
    "amount_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amount_fcfa" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "transaction_ref" TEXT NOT NULL,
    "provider_ref" TEXT,
    "status" "public"."payment_status" NOT NULL DEFAULT 'En_attente',
    "gateway_response" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL DEFAULT '',
    "amount_minor" INTEGER NOT NULL DEFAULT 0,
    "checkout_url" TEXT NOT NULL DEFAULT '',
    "confirmed_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT NOT NULL DEFAULT '',
    "event_id" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_webhooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gateway_code" TEXT NOT NULL,
    "event_type" TEXT NOT NULL DEFAULT '',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processing_error" TEXT NOT NULL DEFAULT '',
    "event_id" TEXT NOT NULL DEFAULT '',
    "processed_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "payment_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payout_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID,
    "store_name" TEXT NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "amount_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amount_fcfa" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "payout_method" TEXT NOT NULL DEFAULT '',
    "account_details" TEXT NOT NULL DEFAULT '',
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."payout_status" NOT NULL DEFAULT 'En_attente',
    "transaction_hash_or_ref" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pending_deletions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delete_at" TIMESTAMPTZ(6) NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_deletions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "description" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_stats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "total_users" INTEGER NOT NULL DEFAULT 0,
    "total_admins" INTEGER NOT NULL DEFAULT 0,
    "total_courses" INTEGER NOT NULL DEFAULT 0,
    "total_products" INTEGER NOT NULL DEFAULT 0,
    "total_stores" INTEGER NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_revenue_usd" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_commissions_usd" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_payouts_usd" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_certificates" INTEGER NOT NULL DEFAULT 0,
    "total_kyc_pending" INTEGER NOT NULL DEFAULT 0,
    "total_vendor_applications_pending" INTEGER NOT NULL DEFAULT 0,
    "total_support_submissions" INTEGER NOT NULL DEFAULT 0,
    "total_service_quotes" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."post_purchase_support" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_number" TEXT NOT NULL DEFAULT '',
    "product_title" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "phone_contact" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forwarded_email" TEXT NOT NULL DEFAULT '',
    "status" "public"."support_status" NOT NULL DEFAULT 'Transmis_Enregistre',

    CONSTRAINT "post_purchase_support_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."price_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID,
    "store_id" UUID,
    "event_type" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" TEXT NOT NULL DEFAULT '',
    "mime_type" TEXT NOT NULL DEFAULT '',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "user_id" UUID,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "comment" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID,
    "vendor_id" UUID,
    "store_name" TEXT NOT NULL DEFAULT 'FORTIA Digital Official Store',
    "store_logo" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "public"."product_type" NOT NULL DEFAULT 'ebook',
    "type_label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "full_description" TEXT NOT NULL DEFAULT '',
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "original_price" DECIMAL(10,2),
    "file_format" TEXT NOT NULL DEFAULT 'PDF',
    "file_size" TEXT NOT NULL DEFAULT '10 MB',
    "image" TEXT NOT NULL DEFAULT '',
    "banner_image" TEXT NOT NULL DEFAULT '',
    "features" JSONB NOT NULL DEFAULT '[]',
    "download_url" TEXT NOT NULL DEFAULT '#',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviews_count" INTEGER NOT NULL DEFAULT 0,
    "sales_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moderation_status" TEXT NOT NULL DEFAULT 'ok',
    "moderation_reason" TEXT NOT NULL DEFAULT '',
    "moderation_at" TIMESTAMP(6),
    "funds_frozen" BOOLEAN NOT NULL DEFAULT false,
    "appeal_status" TEXT NOT NULL DEFAULT '',
    "appeal_message" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quiz_id" UUID NOT NULL,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quiz_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rate_limit_counters" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "reset_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "payment_id" UUID,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "reason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT '',
    "provider_ref" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."registration_fee_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "freelance_fee_usd" DECIMAL(10,2) NOT NULL DEFAULT 15,
    "freelance_fee_fcfa" DECIMAL(10,2) NOT NULL DEFAULT 10000,
    "enterprise_fee_usd" DECIMAL(10,2) NOT NULL DEFAULT 50,
    "enterprise_fee_fcfa" DECIMAL(10,2) NOT NULL DEFAULT 30000,
    "buyer_fee_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fee_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_fee_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "service_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_packages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "starting_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estimated_days" TEXT NOT NULL DEFAULT '3 à 5 jours',
    "icon_name" TEXT NOT NULL DEFAULT 'Palette',
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "border_style" TEXT NOT NULL DEFAULT 'gold',
    "card_animation" TEXT NOT NULL DEFAULT 'fade-up',
    "accent_color" TEXT NOT NULL DEFAULT '#D69E25',
    "badge_text" TEXT NOT NULL DEFAULT '',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT NOT NULL DEFAULT '',
    "image_position" TEXT NOT NULL DEFAULT '50% 50%',
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "service_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_quotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_name" TEXT NOT NULL,
    "client_email" TEXT NOT NULL,
    "client_phone" TEXT NOT NULL DEFAULT '',
    "service_id" UUID,
    "service_title" TEXT NOT NULL,
    "estimated_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "details" TEXT NOT NULL DEFAULT '',
    "deadline" TEXT NOT NULL DEFAULT '',
    "status" "public"."quote_status" NOT NULL DEFAULT 'Recu',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "admin_user_id" UUID,
    "token" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."site_banners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT NOT NULL DEFAULT '',
    "image_url" TEXT NOT NULL DEFAULT '',
    "animation" TEXT NOT NULL DEFAULT 'fade',
    "interval_ms" INTEGER NOT NULL DEFAULT 5000,
    "button_label" TEXT NOT NULL DEFAULT '',
    "button_link" TEXT NOT NULL DEFAULT '',
    "link_target" TEXT NOT NULL DEFAULT 'internal',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "image_position" TEXT NOT NULL DEFAULT '50% 50%',

    CONSTRAINT "site_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."site_content" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hero_badge_text" TEXT NOT NULL DEFAULT 'Plateforme Web Premium de Formation & Services Numériques',
    "hero_title_text" TEXT NOT NULL DEFAULT 'Excellence, Réussite & Prestige :',
    "hero_title_gradient" TEXT NOT NULL DEFAULT 'Maîtrisez les Métiers du Futur',
    "hero_subtitle" TEXT NOT NULL DEFAULT '',
    "hero_image_url" TEXT NOT NULL DEFAULT '',
    "hero_video_url" TEXT NOT NULL DEFAULT '',
    "hero_audio_url" TEXT NOT NULL DEFAULT '',
    "hero_primary_cta" TEXT NOT NULL DEFAULT 'Explorer les Formations',
    "hero_secondary_cta" TEXT NOT NULL DEFAULT 'Explorer la Boutique & Produits',
    "top_announcement_banner" TEXT NOT NULL DEFAULT '',
    "stat_students" TEXT NOT NULL DEFAULT '15k+',
    "stat_success_rate" TEXT NOT NULL DEFAULT '98%',
    "stat_modules" TEXT NOT NULL DEFAULT '45+',
    "footer_about_text" TEXT NOT NULL DEFAULT '',
    "contact_email" TEXT NOT NULL DEFAULT 'contact@fortia-hub.com',
    "contact_phone" TEXT NOT NULL DEFAULT '+228 90 88 99 00',
    "support_hours" TEXT NOT NULL DEFAULT '7J/7 • 08h00 - 22h00 GMT',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."storage_objects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "folder" TEXT NOT NULL DEFAULT '',
    "entity_id" TEXT NOT NULL DEFAULT '',
    "size" INTEGER NOT NULL DEFAULT 0,
    "content_type" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "storage_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."store_payout_info" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'mobile_money',
    "account_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_payout_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID,
    "owner_name" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "owner_phone" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT NOT NULL DEFAULT '',
    "banner" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "public"."store_status" NOT NULL DEFAULT 'pending',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "sales_count" INTEGER NOT NULL DEFAULT 0,
    "total_revenue_usd" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscription_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "order_id" UUID,
    "status" "public"."subscription_status" NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT '',
    "provider_ref" TEXT,
    "current_period_start" TIMESTAMPTZ(6),
    "current_period_end" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."training_centers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID,
    "center_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "logo" TEXT NOT NULL DEFAULT '',
    "banner" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "fee_paid" BOOLEAN NOT NULL DEFAULT false,
    "fee_amount_usd" DECIMAL(10,2) NOT NULL DEFAULT 2,
    "storage_quota_gb" INTEGER NOT NULL DEFAULT 4,
    "storage_used_bytes" BIGINT NOT NULL DEFAULT 0,
    "pricing_config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "avatar" TEXT NOT NULL DEFAULT '',
    "account_type" "public"."user_role" NOT NULL DEFAULT 'buyer',
    "badge" "public"."badge_type" NOT NULL DEFAULT 'none',
    "badge_label" TEXT NOT NULL DEFAULT '',
    "kyc_status" "public"."kyc_status" NOT NULL DEFAULT 'non_soumis',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "enrolled_course_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "course_progress" JSONB NOT NULL DEFAULT '{}',
    "purchased_product_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "earned_certificates" JSONB NOT NULL DEFAULT '[]',
    "payment_history" JSONB NOT NULL DEFAULT '[]',
    "deletion_requested_at" TIMESTAMPTZ(6),
    "deletion_scheduled_for" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendor_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "applicant_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "store_name" TEXT NOT NULL,
    "store_category" TEXT NOT NULL,
    "store_description" TEXT NOT NULL DEFAULT '',
    "experience_bio" TEXT NOT NULL DEFAULT '',
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."approval_status" NOT NULL DEFAULT 'En_attente',
    "admin_notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "vendor_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_admin_activity_log_action" ON "public"."admin_activity_log"("action" ASC);

-- CreateIndex
CREATE INDEX "idx_admin_activity_log_created" ON "public"."admin_activity_log"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_daily_stats_stat_date_key" ON "public"."admin_daily_stats"("stat_date" ASC);

-- CreateIndex
CREATE INDEX "idx_admin_daily_stats_date" ON "public"."admin_daily_stats"("stat_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "public"."admin_users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_admin_users_email" ON "public"."admin_users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "blog_categories_name_key" ON "public"."blog_categories"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "blog_categories_slug_key" ON "public"."blog_categories"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "public"."blog_posts"("slug" ASC);

-- CreateIndex
CREATE INDEX "idx_blog_posts_category_id" ON "public"."blog_posts"("category_id" ASC);

-- CreateIndex
CREATE INDEX "idx_blog_posts_is_published" ON "public"."blog_posts"("is_published" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_blog_posts_slug" ON "public"."blog_posts"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificate_number_key" ON "public"."certificates"("certificate_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "certificates_user_course_key" ON "public"."certificates"("user_id" ASC, "course_id" ASC);

-- CreateIndex
CREATE INDEX "idx_certificates_course_id" ON "public"."certificates"("course_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_certificates_number" ON "public"."certificates"("certificate_number" ASC);

-- CreateIndex
CREATE INDEX "idx_certificates_user_id" ON "public"."certificates"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "commission_rules_scope_key" ON "public"."commission_rules"("scope" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "course_categories_code_key" ON "public"."course_categories"("code" ASC);

-- CreateIndex
CREATE INDEX "idx_course_chapters_course_id" ON "public"."course_chapters"("course_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_user_id_course_id_key" ON "public"."course_enrollments"("user_id" ASC, "course_id" ASC);

-- CreateIndex
CREATE INDEX "idx_enrollments_course_id" ON "public"."course_enrollments"("course_id" ASC);

-- CreateIndex
CREATE INDEX "idx_enrollments_user_id" ON "public"."course_enrollments"("user_id" ASC);

-- CreateIndex
CREATE INDEX "course_lesson_progress_course_idx" ON "public"."course_lesson_progress"("course_id" ASC);

-- CreateIndex
CREATE INDEX "course_lesson_progress_user_course_idx" ON "public"."course_lesson_progress"("user_id" ASC, "course_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "course_lesson_progress_user_lesson_key" ON "public"."course_lesson_progress"("user_id" ASC, "lesson_id" ASC);

-- CreateIndex
CREATE INDEX "idx_course_lesson_progress_lesson_id" ON "public"."course_lesson_progress"("lesson_id" ASC);

-- CreateIndex
CREATE INDEX "course_lessons_protected_idx" ON "public"."course_lessons"("video_protected" ASC);

-- CreateIndex
CREATE INDEX "idx_course_lessons_chapter_id" ON "public"."course_lessons"("chapter_id" ASC);

-- CreateIndex
CREATE INDEX "course_quiz_attempts_course_idx" ON "public"."course_quiz_attempts"("course_id" ASC);

-- CreateIndex
CREATE INDEX "course_quiz_attempts_user_course_idx" ON "public"."course_quiz_attempts"("user_id" ASC, "course_id" ASC);

-- CreateIndex
CREATE INDEX "idx_course_quizzes_course_id" ON "public"."course_quizzes"("course_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "course_reviews_course_id_user_id_key" ON "public"."course_reviews"("course_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_course_reviews_course_id" ON "public"."course_reviews"("course_id" ASC);

-- CreateIndex
CREATE INDEX "idx_course_reviews_user_id" ON "public"."course_reviews"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "public"."courses"("slug" ASC);

-- CreateIndex
CREATE INDEX "idx_courses_category_id" ON "public"."courses"("category_id" ASC);

-- CreateIndex
CREATE INDEX "idx_courses_center_id" ON "public"."courses"("center_id" ASC);

-- CreateIndex
CREATE INDEX "idx_courses_instructor_id" ON "public"."courses"("instructor_id" ASC);

-- CreateIndex
CREATE INDEX "idx_courses_is_published" ON "public"."courses"("is_published" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_courses_slug" ON "public"."courses"("slug" ASC);

-- CreateIndex
CREATE INDEX "data_archive_archived_at_idx" ON "public"."data_archive"("archived_at" ASC);

-- CreateIndex
CREATE INDEX "data_archive_table_name_idx" ON "public"."data_archive"("table_name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "data_archive_table_name_record_id_reason_key" ON "public"."data_archive"("table_name" ASC, "record_id" ASC, "reason" ASC);

-- CreateIndex
CREATE INDEX "idx_enterprise_portfolio_enterprise_id" ON "public"."enterprise_portfolio"("enterprise_id" ASC);

-- CreateIndex
CREATE INDEX "idx_enterprise_profiles_sector" ON "public"."enterprise_profiles"("sector" ASC);

-- CreateIndex
CREATE INDEX "idx_enterprise_profiles_user_id" ON "public"."enterprise_profiles"("user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_enterprise_services_enterprise_id" ON "public"."enterprise_services"("enterprise_id" ASC);

-- CreateIndex
CREATE INDEX "idx_enterprise_team_enterprise_id" ON "public"."enterprise_team"("enterprise_id" ASC);

-- CreateIndex
CREATE INDEX "entitlements_expires_idx" ON "public"."entitlements"("expires_at" ASC);

-- CreateIndex
CREATE INDEX "entitlements_resource_idx" ON "public"."entitlements"("resource_type" ASC, "resource_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_user_resource_key" ON "public"."entitlements"("user_id" ASC, "resource_type" ASC, "resource_id" ASC);

-- CreateIndex
CREATE INDEX "entitlements_user_status_idx" ON "public"."entitlements"("user_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "idx_entitlements_order_id" ON "public"."entitlements"("order_id" ASC);

-- CreateIndex
CREATE INDEX "idx_entitlements_payment_id" ON "public"."entitlements"("payment_id" ASC);

-- CreateIndex
CREATE INDEX "idx_entitlements_subscription_id" ON "public"."entitlements"("subscription_id" ASC);

-- CreateIndex
CREATE INDEX "idx_freelance_portfolio_freelance_id" ON "public"."freelance_portfolio"("freelance_id" ASC);

-- CreateIndex
CREATE INDEX "idx_freelance_profiles_category" ON "public"."freelance_profiles"("category" ASC);

-- CreateIndex
CREATE INDEX "idx_freelance_profiles_user_id" ON "public"."freelance_profiles"("user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_freelance_services_freelance_id" ON "public"."freelance_services"("freelance_id" ASC);

-- CreateIndex
CREATE INDEX "idx_instructor_commissions_order_id" ON "public"."instructor_commissions"("order_id" ASC);

-- CreateIndex
CREATE INDEX "instructor_commissions_instructor_id_idx" ON "public"."instructor_commissions"("instructor_id" ASC);

-- CreateIndex
CREATE INDEX "idx_instructor_storage_purchases_instructor_id" ON "public"."instructor_storage_purchases"("instructor_id" ASC);

-- CreateIndex
CREATE INDEX "instructor_storage_purchases_instructor_id_idx" ON "public"."instructor_storage_purchases"("instructor_id" ASC);

-- CreateIndex
CREATE INDEX "idx_kyc_submissions_applicant_id" ON "public"."kyc_submissions"("applicant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_kyc_submissions_status" ON "public"."kyc_submissions"("status" ASC);

-- CreateIndex
CREATE INDEX "kyc_submissions_locked_at_idx" ON "public"."kyc_submissions"("locked_at" ASC);

-- CreateIndex
CREATE INDEX "marketplace_order_items_order_id_idx" ON "public"."marketplace_order_items"("order_id" ASC);

-- CreateIndex
CREATE INDEX "marketplace_order_items_type_resource_idx" ON "public"."marketplace_order_items"("item_type" ASC, "resource_id" ASC);

-- CreateIndex
CREATE INDEX "idx_marketplace_orders_product_id" ON "public"."marketplace_orders"("product_id" ASC);

-- CreateIndex
CREATE INDEX "idx_orders_buyer_email" ON "public"."marketplace_orders"("buyer_email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_orders_order_number" ON "public"."marketplace_orders"("order_number" ASC);

-- CreateIndex
CREATE INDEX "idx_orders_store_id" ON "public"."marketplace_orders"("store_id" ASC);

-- CreateIndex
CREATE INDEX "marketplace_orders_buyer_user_id_idx" ON "public"."marketplace_orders"("buyer_user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_orders_order_number_key" ON "public"."marketplace_orders"("order_number" ASC);

-- CreateIndex
CREATE INDEX "marketplace_orders_status_idx" ON "public"."marketplace_orders"("status" ASC);

-- CreateIndex
CREATE INDEX "idx_notifications_is_global" ON "public"."notifications"("is_global" ASC);

-- CreateIndex
CREATE INDEX "idx_notifications_user_id" ON "public"."notifications"("user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_otp_email" ON "public"."otp_codes"("email" ASC);

-- CreateIndex
CREATE INDEX "idx_otp_expires_at" ON "public"."otp_codes"("expires_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_payment_gateways_code" ON "public"."payment_gateways"("code" ASC);

-- CreateIndex
CREATE INDEX "idx_payment_gateways_is_active" ON "public"."payment_gateways"("is_active" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_gateways_code_key" ON "public"."payment_gateways"("code" ASC);

-- CreateIndex
CREATE INDEX "idx_payment_transactions_user_id" ON "public"."payment_transactions"("user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_transactions_gateway_id" ON "public"."payment_transactions"("gateway_id" ASC);

-- CreateIndex
CREATE INDEX "idx_transactions_order_id" ON "public"."payment_transactions"("order_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_transactions_ref" ON "public"."payment_transactions"("transaction_ref" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_provider_provider_ref_key" ON "public"."payment_transactions"("provider" ASC, "provider_ref" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_transaction_ref_key" ON "public"."payment_transactions"("transaction_ref" ASC);

-- CreateIndex
CREATE INDEX "idx_webhooks_gateway_code" ON "public"."payment_webhooks"("gateway_code" ASC);

-- CreateIndex
CREATE INDEX "idx_webhooks_processed" ON "public"."payment_webhooks"("processed" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhooks_gateway_code_event_id_key" ON "public"."payment_webhooks"("gateway_code" ASC, "event_id" ASC);

-- CreateIndex
CREATE INDEX "idx_payout_requests_status" ON "public"."payout_requests"("status" ASC);

-- CreateIndex
CREATE INDEX "idx_payout_requests_store_id" ON "public"."payout_requests"("store_id" ASC);

-- CreateIndex
CREATE INDEX "idx_pending_deletions_delete_at" ON "public"."pending_deletions"("delete_at" ASC);

-- CreateIndex
CREATE INDEX "idx_pending_deletions_processed" ON "public"."pending_deletions"("processed" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_platform_config_key" ON "public"."platform_config"("key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "platform_config_key_key" ON "public"."platform_config"("key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "price_plans_code_key" ON "public"."price_plans"("code" ASC);

-- CreateIndex
CREATE INDEX "idx_product_events_product" ON "public"."product_events"("product_id" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_product_events_store" ON "public"."product_events"("store_id" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_product_events_type" ON "public"."product_events"("event_type" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_product_files_product_id" ON "public"."product_files"("product_id" ASC);

-- CreateIndex
CREATE INDEX "idx_product_reviews_product_id" ON "public"."product_reviews"("product_id" ASC);

-- CreateIndex
CREATE INDEX "idx_product_reviews_user_id" ON "public"."product_reviews"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_user_product_key" ON "public"."product_reviews"("product_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_products_is_published_approved" ON "public"."products"("is_published" ASC, "is_approved" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_products_slug" ON "public"."products"("slug" ASC);

-- CreateIndex
CREATE INDEX "idx_products_store_id" ON "public"."products"("store_id" ASC);

-- CreateIndex
CREATE INDEX "idx_products_type" ON "public"."products"("type" ASC);

-- CreateIndex
CREATE INDEX "idx_products_vendor_id" ON "public"."products"("vendor_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "public"."products"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "public"."push_subscriptions"("endpoint" ASC);

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "public"."push_subscriptions"("user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_quiz_options_quiz_id" ON "public"."quiz_options"("quiz_id" ASC);

-- CreateIndex
CREATE INDEX "rate_limit_counters_reset_at_idx" ON "public"."rate_limit_counters"("reset_at" ASC);

-- CreateIndex
CREATE INDEX "refunds_order_id_idx" ON "public"."refunds"("order_id" ASC);

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "public"."refunds"("payment_id" ASC);

-- CreateIndex
CREATE INDEX "idx_service_options_service_id" ON "public"."service_options"("service_id" ASC);

-- CreateIndex
CREATE INDEX "idx_service_packages_active" ON "public"."service_packages"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_service_packages_category" ON "public"."service_packages"("category" ASC);

-- CreateIndex
CREATE INDEX "idx_service_packages_featured" ON "public"."service_packages"("featured" ASC);

-- CreateIndex
CREATE INDEX "idx_service_quotes_service_id" ON "public"."service_quotes"("service_id" ASC);

-- CreateIndex
CREATE INDEX "idx_service_quotes_status" ON "public"."service_quotes"("status" ASC);

-- CreateIndex
CREATE INDEX "idx_sessions_admin_user_id" ON "public"."sessions"("admin_user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_sessions_expires_at" ON "public"."sessions"("expires_at" ASC);

-- CreateIndex
CREATE INDEX "idx_sessions_user_id" ON "public"."sessions"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "public"."sessions"("token" ASC);

-- CreateIndex
CREATE INDEX "idx_site_banners_active" ON "public"."site_banners"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_site_banners_display_order" ON "public"."site_banners"("display_order" ASC);

-- CreateIndex
CREATE INDEX "storage_objects_created_at_idx" ON "public"."storage_objects"("created_at" ASC);

-- CreateIndex
CREATE INDEX "storage_objects_folder_idx" ON "public"."storage_objects"("folder" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "storage_objects_key_key" ON "public"."storage_objects"("key" ASC);

-- CreateIndex
CREATE INDEX "storage_objects_status_idx" ON "public"."storage_objects"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_stores_slug" ON "public"."stores"("slug" ASC);

-- CreateIndex
CREATE INDEX "idx_stores_status" ON "public"."stores"("status" ASC);

-- CreateIndex
CREATE INDEX "idx_stores_vendor_id" ON "public"."stores"("vendor_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "stores_slug_key" ON "public"."stores"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "public"."subscription_plans"("code" ASC);

-- CreateIndex
CREATE INDEX "idx_subscriptions_plan_id" ON "public"."subscriptions"("plan_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_order_id_key" ON "public"."subscriptions"("order_id" ASC);

-- CreateIndex
CREATE INDEX "subscriptions_status_period_idx" ON "public"."subscriptions"("status" ASC, "current_period_end" ASC);

-- CreateIndex
CREATE INDEX "subscriptions_user_status_idx" ON "public"."subscriptions"("user_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "training_centers_owner_id_idx" ON "public"."training_centers"("owner_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "training_centers_slug_key" ON "public"."training_centers"("slug" ASC);

-- CreateIndex
CREATE INDEX "idx_users_account_type" ON "public"."users"("account_type" ASC);

-- CreateIndex
CREATE INDEX "idx_users_badge" ON "public"."users"("badge" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_users_email" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE INDEX "idx_users_kyc_status" ON "public"."users"("kyc_status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE INDEX "idx_vendor_applications_user_id" ON "public"."vendor_applications"("user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_vendor_apps_status" ON "public"."vendor_applications"("status" ASC);

-- AddForeignKey
ALTER TABLE "public"."blog_posts" ADD CONSTRAINT "blog_posts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."certificates" ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."course_chapters" ADD CONSTRAINT "course_chapters_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."course_lesson_progress" ADD CONSTRAINT "course_lesson_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."course_lesson_progress" ADD CONSTRAINT "course_lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."course_lesson_progress" ADD CONSTRAINT "course_lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."course_lessons" ADD CONSTRAINT "course_lessons_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."course_chapters"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."course_quiz_attempts" ADD CONSTRAINT "course_quiz_attempts_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."course_quiz_attempts" ADD CONSTRAINT "course_quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."course_quizzes" ADD CONSTRAINT "course_quizzes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."course_reviews" ADD CONSTRAINT "course_reviews_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."course_reviews" ADD CONSTRAINT "course_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."course_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "public"."training_centers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."enterprise_portfolio" ADD CONSTRAINT "enterprise_portfolio_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprise_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."enterprise_profiles" ADD CONSTRAINT "enterprise_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."enterprise_services" ADD CONSTRAINT "enterprise_services_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprise_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."enterprise_team" ADD CONSTRAINT "enterprise_team_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprise_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."entitlements" ADD CONSTRAINT "entitlements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."entitlements" ADD CONSTRAINT "entitlements_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payment_transactions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."entitlements" ADD CONSTRAINT "entitlements_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."entitlements" ADD CONSTRAINT "entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."freelance_portfolio" ADD CONSTRAINT "freelance_portfolio_freelance_id_fkey" FOREIGN KEY ("freelance_id") REFERENCES "public"."freelance_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."freelance_profiles" ADD CONSTRAINT "freelance_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."freelance_services" ADD CONSTRAINT "freelance_services_freelance_id_fkey" FOREIGN KEY ("freelance_id") REFERENCES "public"."freelance_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."instructor_commissions" ADD CONSTRAINT "instructor_commissions_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "public"."training_centers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."instructor_commissions" ADD CONSTRAINT "instructor_commissions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."instructor_commissions" ADD CONSTRAINT "instructor_commissions_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."instructor_commissions" ADD CONSTRAINT "instructor_commissions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."instructor_storage_purchases" ADD CONSTRAINT "instructor_storage_purchases_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "public"."training_centers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."instructor_storage_purchases" ADD CONSTRAINT "instructor_storage_purchases_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."marketplace_order_items" ADD CONSTRAINT "marketplace_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."marketplace_orders" ADD CONSTRAINT "marketplace_orders_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."marketplace_orders" ADD CONSTRAINT "marketplace_orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."marketplace_orders" ADD CONSTRAINT "marketplace_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."payment_transactions" ADD CONSTRAINT "payment_transactions_gateway_id_fkey" FOREIGN KEY ("gateway_id") REFERENCES "public"."payment_gateways"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."payout_requests" ADD CONSTRAINT "payout_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_files" ADD CONSTRAINT "product_files_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_reviews" ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_options" ADD CONSTRAINT "quiz_options_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."course_quizzes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payment_transactions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."service_options" ADD CONSTRAINT "service_options_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."service_packages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."service_quotes" ADD CONSTRAINT "service_quotes_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."service_packages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."store_payout_info" ADD CONSTRAINT "store_payout_info_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."stores" ADD CONSTRAINT "stores_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."training_centers" ADD CONSTRAINT "training_centers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."vendor_applications" ADD CONSTRAINT "vendor_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
