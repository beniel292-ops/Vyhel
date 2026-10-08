-- Database-level guards for digital orders (the app already enforces these; this makes invalid
-- states impossible even for manual SQL). NOT VALID = enforced for every new/updated row without
-- re-checking historical rows, so this migration can never fail on existing production data.

-- A paid order always has its Razorpay payment id and paid_at.
ALTER TABLE "digital_orders" ADD CONSTRAINT "digital_orders_paid_has_payment"
  CHECK ("payment_status" <> 'paid' OR ("razorpay_payment_id" IS NOT NULL AND "paid_at" IS NOT NULL)) NOT VALID;--> statement-breakpoint

-- Delivery can only be "sent" for an order that was paid (refunded orders keep their history).
ALTER TABLE "digital_orders" ADD CONSTRAINT "digital_orders_delivery_requires_payment"
  CHECK ("delivery_status" <> 'sent' OR "payment_status" IN ('paid', 'refunded')) NOT VALID;--> statement-breakpoint

-- Download tokens can only be issued for paid orders.
CREATE OR REPLACE FUNCTION "vyhel_token_requires_paid_order"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "digital_orders" o WHERE o."id" = NEW."order_id" AND o."payment_status" = 'paid') THEN
    RAISE EXCEPTION 'download tokens can only be issued for paid orders' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS "digital_download_tokens_paid_only" ON "digital_download_tokens";--> statement-breakpoint

CREATE TRIGGER "digital_download_tokens_paid_only"
  BEFORE INSERT ON "digital_download_tokens"
  FOR EACH ROW EXECUTE FUNCTION "vyhel_token_requires_paid_order"();
