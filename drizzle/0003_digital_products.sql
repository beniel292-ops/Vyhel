CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."digital_product_status" AS ENUM('draft', 'active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('created', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TABLE "digital_download_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"reason" text DEFAULT 'checkout' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"max_downloads" integer DEFAULT 10 NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "digital_download_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "digital_file_blobs" (
	"file_id" uuid PRIMARY KEY NOT NULL,
	"data" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digital_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"sha256" text,
	"storage" text DEFAULT 'database' NOT NULL,
	"storage_key" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digital_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_name" text,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"razorpay_order_id" text NOT NULL,
	"razorpay_payment_id" text,
	"razorpay_signature" text,
	"payment_status" "payment_status" DEFAULT 'created' NOT NULL,
	"payment_source" text,
	"failure_reason" text,
	"delivery_status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"delivery_attempts" integer DEFAULT 0 NOT NULL,
	"last_delivery_at" timestamp with time zone,
	"last_delivery_error" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "digital_orders_razorpay_order_id_unique" UNIQUE("razorpay_order_id"),
	CONSTRAINT "digital_orders_razorpay_payment_id_unique" UNIQUE("razorpay_payment_id")
);
--> statement-breakpoint
CREATE TABLE "digital_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"image_url" text,
	"image_alt" text,
	"file_id" uuid,
	"checkout_description" text,
	"whats_included" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "digital_product_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "digital_products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'razorpay' NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"razorpay_order_id" text,
	"razorpay_payment_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "digital_download_tokens" ADD CONSTRAINT "digital_download_tokens_order_id_digital_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."digital_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_file_blobs" ADD CONSTRAINT "digital_file_blobs_file_id_digital_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."digital_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_files" ADD CONSTRAINT "digital_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_orders" ADD CONSTRAINT "digital_orders_product_id_digital_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."digital_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_products" ADD CONSTRAINT "digital_products_file_id_digital_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."digital_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_products" ADD CONSTRAINT "digital_products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "digital_download_tokens_order_idx" ON "digital_download_tokens" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "digital_orders_status_idx" ON "digital_orders" USING btree ("payment_status","created_at");--> statement-breakpoint
CREATE INDEX "digital_orders_product_idx" ON "digital_orders" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "digital_orders_email_idx" ON "digital_orders" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "digital_products_status_idx" ON "digital_products" USING btree ("status","sort_order");--> statement-breakpoint
ALTER TABLE "digital_products" ADD CONSTRAINT "digital_products_slug_format" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "digital_products" ADD CONSTRAINT "digital_products_price_range" CHECK (price_minor >= 100 AND price_minor <= 50000000);--> statement-breakpoint
ALTER TABLE "digital_products" ADD CONSTRAINT "digital_products_currency" CHECK (currency = 'INR');--> statement-breakpoint
ALTER TABLE "digital_orders" ADD CONSTRAINT "digital_orders_amount_positive" CHECK (amount_minor > 0);--> statement-breakpoint
ALTER TABLE "digital_download_tokens" ADD CONSTRAINT "digital_download_tokens_counts" CHECK (download_count >= 0 AND max_downloads > 0);
