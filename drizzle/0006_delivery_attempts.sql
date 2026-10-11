CREATE TABLE "digital_delivery_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"trigger" text NOT NULL,
	"provider" text DEFAULT 'resend' NOT NULL,
	"provider_message_id" text,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "digital_delivery_attempts_provider_message_id_unique" UNIQUE("provider_message_id")
);
--> statement-breakpoint
ALTER TABLE "digital_delivery_attempts" ADD CONSTRAINT "digital_delivery_attempts_order_id_digital_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."digital_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "digital_delivery_attempts_order_idx" ON "digital_delivery_attempts" USING btree ("order_id","created_at");