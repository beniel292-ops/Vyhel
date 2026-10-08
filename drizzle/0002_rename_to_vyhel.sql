-- Brand rename: Velora → Vyhel.
ALTER TABLE "products" RENAME COLUMN "velora_score" TO "vyhel_score";--> statement-breakpoint
ALTER TABLE "guides" ALTER COLUMN "author" SET DEFAULT 'Vyhel Editorial';--> statement-breakpoint
UPDATE "guides" SET "author" = 'Vyhel Editorial' WHERE "author" = 'Velora Editorial';--> statement-breakpoint
-- Saved site settings (site name, tagline, SEO defaults…) that still use the old name.
UPDATE "site_settings" SET "value" = replace(replace("value"::text, 'Velora', 'Vyhel'), 'VELORA', 'VYHEL')::jsonb, "updated_at" = now() WHERE "value"::text ILIKE '%velora%';
