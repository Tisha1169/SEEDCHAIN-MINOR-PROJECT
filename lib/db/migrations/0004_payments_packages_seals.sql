CREATE TYPE "public"."order_payment_status" AS ENUM('UNPAID', 'PAYMENT_PENDING', 'PAYMENT_PROCESSING', 'PAID', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED', 'REFUND_PENDING', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."integrity_status" AS ENUM('NOT_CHECKED', 'OK', 'EXCEPTION');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('CREATED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."seal_status" AS ENUM('ASSIGNED', 'DISPATCH_VERIFIED', 'INTACT', 'BROKEN', 'REPORTED', 'REPLACED');--> statement-breakpoint
CREATE TABLE "package_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"lot_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"from_status" "seal_status",
	"to_status" "seal_status",
	"actor_user_id" uuid,
	"actor_role" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid NOT NULL,
	"package_number" integer NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"public_token" text NOT NULL,
	"seal_id" text NOT NULL,
	"seal_status" "seal_status" DEFAULT 'ASSIGNED' NOT NULL,
	"integrity_status" "integrity_status" DEFAULT 'NOT_CHECKED' NOT NULL,
	"replaced_by_package_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packages_public_token_unique" UNIQUE("public_token"),
	CONSTRAINT "packages_seal_id_unique" UNIQUE("seal_id"),
	CONSTRAINT "packages_quantity_positive" CHECK ("packages"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"razorpay_payment_id" text,
	"razorpay_order_id" text,
	"payment_id" uuid,
	"outcome" text NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"razorpay_order_id" text NOT NULL,
	"razorpay_payment_id" text,
	"amount_paise" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" "payment_status" DEFAULT 'CREATED' NOT NULL,
	"method" text,
	"mode" text DEFAULT 'test' NOT NULL,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"webhook_verified" boolean DEFAULT false NOT NULL,
	"failure_code" text,
	"failure_reason" text,
	"paid_at" timestamp with time zone,
	"refund_id" text,
	"refund_amount_paise" integer,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_razorpay_order_id_unique" UNIQUE("razorpay_order_id"),
	CONSTRAINT "payments_razorpay_payment_id_unique" UNIQUE("razorpay_payment_id"),
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_paise" > 0)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" "order_payment_status" DEFAULT 'UNPAID' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "package_events" ADD CONSTRAINT "package_events_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_events" ADD CONSTRAINT "package_events_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_events" ADD CONSTRAINT "package_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "package_events_package_idx" ON "package_events" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "package_events_lot_idx" ON "package_events" USING btree ("lot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "packages_lot_number_uq" ON "packages" USING btree ("lot_id","package_number");--> statement-breakpoint
CREATE INDEX "packages_lot_idx" ON "packages" USING btree ("lot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_event_id_uq" ON "payment_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "payment_events_payment_idx" ON "payment_events" USING btree ("razorpay_payment_id");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");
--> statement-breakpoint
-- Seal history and the webhook log are append-only, like traceability_events and audit_logs.
CREATE TRIGGER package_events_append_only
  BEFORE UPDATE OR DELETE ON "package_events"
  FOR EACH ROW EXECUTE FUNCTION seedchain_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER payment_events_append_only
  BEFORE UPDATE OR DELETE ON "payment_events"
  FOR EACH ROW EXECUTE FUNCTION seedchain_reject_mutation();
