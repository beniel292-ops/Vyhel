-- Integrity rules that are easier to express in SQL than in the ORM schema.
ALTER TABLE "products" ADD CONSTRAINT "products_scores_range" CHECK (
  (velora_score IS NULL OR velora_score BETWEEN 0 AND 10) AND
  (usefulness_score IS NULL OR usefulness_score BETWEEN 0 AND 10) AND
  (ease_score IS NULL OR ease_score BETWEEN 0 AND 10) AND
  (versatility_score IS NULL OR versatility_score BETWEEN 0 AND 10) AND
  (value_score IS NULL OR value_score BETWEEN 0 AND 10) AND
  (design_score IS NULL OR design_score BETWEEN 0 AND 10)
);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_slug_format" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "guides" ADD CONSTRAINT "guides_slug_format" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_slug_format" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_slug_format" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_not_self" CHECK (product_id <> related_product_id);--> statement-breakpoint
ALTER TABLE "guide_relations" ADD CONSTRAINT "guide_relations_not_self" CHECK (guide_id <> related_guide_id);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase" CHECK (email = lower(email));--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_https" CHECK (special_link ~ '^https://');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_search_idx" ON "products" USING gin (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(short_description,'')));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guides_search_idx" ON "guides" USING gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(excerpt,'')));
