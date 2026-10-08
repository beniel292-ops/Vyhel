-- Affiliate CTA copy: make it explicit that the purchase happens on Amazon.
-- Only replaces the old seeded default; a custom CTA text set by an admin is left alone.
UPDATE "site_settings"
SET "value" = jsonb_set("value", '{defaultCtaText}', '"Buy on Amazon"'), "updated_at" = now()
WHERE "key" = 'site' AND "value"->>'defaultCtaText' = 'Check on Amazon';
