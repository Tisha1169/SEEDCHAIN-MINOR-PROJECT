CREATE TYPE "public"."anomaly_status" AS ENUM('OPEN', 'INVESTIGATING', 'DISMISSED', 'CONFIRMED');--> statement-breakpoint
CREATE TYPE "public"."recall_status" AS ENUM('ACTIVE', 'CLEARED');--> statement-breakpoint
ALTER TYPE "public"."user_status" ADD VALUE 'correction_required' BEFORE 'active';--> statement-breakpoint
ALTER TYPE "public"."qr_status" ADD VALUE 'DISABLED';--> statement-breakpoint
ALTER TYPE "public"."scan_result" ADD VALUE 'DISABLED' BEFORE 'INVALID';--> statement-breakpoint
CREATE TABLE "lot_quality_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid NOT NULL,
	"farmer_id" uuid NOT NULL,
	"grade" "quality_grade" NOT NULL,
	"appearance" text,
	"size_category" text,
	"defects" text,
	"inspection_date" date NOT NULL,
	"notes" text,
	"recorded_by" text DEFAULT 'FARMER' NOT NULL,
	"client_event_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lot_quality_records_client_event_id_unique" UNIQUE("client_event_id")
);
--> statement-breakpoint
CREATE TABLE "lot_recalls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid NOT NULL,
	"status" "recall_status" DEFAULT 'ACTIVE' NOT NULL,
	"reason" text NOT NULL,
	"public_message" text NOT NULL,
	"initiated_by" uuid NOT NULL,
	"initiated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cleared_by" uuid,
	"cleared_at" timestamp with time zone,
	"clear_note" text,
	"impact" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qr_anomalies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qr_id" uuid NOT NULL,
	"lot_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" "anomaly_status" DEFAULT 'OPEN' NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"handled_by" uuid,
	"handled_at" timestamp with time zone,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"organization" text NOT NULL,
	"url" text NOT NULL,
	"dataset" text NOT NULL,
	"geography" text NOT NULL,
	"frequency" text NOT NULL,
	"units" text,
	"licence" text,
	"usage_notes" text,
	"data_class" text NOT NULL,
	"integration" text NOT NULL,
	"stale_after_hours" integer,
	"integration_note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_raw_payloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"source_id" text NOT NULL,
	"content_type" text,
	"byte_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"body" text NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reference_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" text NOT NULL,
	"run_id" uuid,
	"topic" text NOT NULL,
	"text" text NOT NULL,
	"retrieved_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reference_statistics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" text NOT NULL,
	"run_id" uuid,
	"geography_level" text NOT NULL,
	"geography_name" text NOT NULL,
	"crop" text NOT NULL,
	"metric" text NOT NULL,
	"unit" text NOT NULL,
	"period_label" text NOT NULL,
	"year_start" integer NOT NULL,
	"value" numeric(20, 4) NOT NULL,
	"citation" text NOT NULL,
	"retrieved_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "farmer_profiles" ADD COLUMN "submitted_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "lots" ADD COLUMN "recalled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "qr_scan_events" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "qr_scan_events" ADD COLUMN "approx_lat" double precision;--> statement-breakpoint
ALTER TABLE "qr_scan_events" ADD COLUMN "approx_lon" double precision;--> statement-breakpoint
ALTER TABLE "order_feedback" ADD COLUMN "freshness_rating" integer;--> statement-breakpoint
ALTER TABLE "order_feedback" ADD COLUMN "quality_rating" integer;--> statement-breakpoint
ALTER TABLE "order_feedback" ADD COLUMN "farmer_id" uuid;--> statement-breakpoint
ALTER TABLE "order_feedback" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_feedback" ADD COLUMN "hidden_by" uuid;--> statement-breakpoint
ALTER TABLE "order_feedback" ADD COLUMN "hidden_reason" text;--> statement-breakpoint
ALTER TABLE "external_ingestion_runs" ADD COLUMN "source_id" text;--> statement-breakpoint
ALTER TABLE "external_ingestion_runs" ADD COLUMN "fetched_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "external_ingestion_runs" ADD COLUMN "rejected_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "lot_quality_records" ADD CONSTRAINT "lot_quality_records_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_quality_records" ADD CONSTRAINT "lot_quality_records_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_recalls" ADD CONSTRAINT "lot_recalls_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_recalls" ADD CONSTRAINT "lot_recalls_initiated_by_users_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_recalls" ADD CONSTRAINT "lot_recalls_cleared_by_users_id_fk" FOREIGN KEY ("cleared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_anomalies" ADD CONSTRAINT "qr_anomalies_qr_id_qr_codes_id_fk" FOREIGN KEY ("qr_id") REFERENCES "public"."qr_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_anomalies" ADD CONSTRAINT "qr_anomalies_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_anomalies" ADD CONSTRAINT "qr_anomalies_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_raw_payloads" ADD CONSTRAINT "external_raw_payloads_run_id_external_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."external_ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_notes" ADD CONSTRAINT "reference_notes_run_id_external_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."external_ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_statistics" ADD CONSTRAINT "reference_statistics_run_id_external_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."external_ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quality_lot_idx" ON "lot_quality_records" USING btree ("lot_id","inspection_date");--> statement-breakpoint
CREATE INDEX "recalls_lot_idx" ON "lot_recalls" USING btree ("lot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recalls_one_active_per_lot" ON "lot_recalls" USING btree ("lot_id") WHERE status = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "anomalies_status_idx" ON "qr_anomalies" USING btree ("status","detected_at");--> statement-breakpoint
CREATE INDEX "anomalies_lot_idx" ON "qr_anomalies" USING btree ("lot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "anomalies_open_dedupe_uq" ON "qr_anomalies" USING btree ("qr_id","kind") WHERE status IN ('OPEN','INVESTIGATING');--> statement-breakpoint
CREATE INDEX "raw_run_idx" ON "external_raw_payloads" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "raw_source_idx" ON "external_raw_payloads" USING btree ("source_id","retrieved_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("user_id") WHERE read_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ref_notes_natural_uq" ON "reference_notes" USING btree ("source_id","topic");--> statement-breakpoint
CREATE UNIQUE INDEX "ref_stats_natural_uq" ON "reference_statistics" USING btree ("source_id","geography_level","geography_name","crop","metric","period_label");--> statement-breakpoint
CREATE INDEX "ref_stats_lookup_idx" ON "reference_statistics" USING btree ("crop","metric","year_start");--> statement-breakpoint
ALTER TABLE "order_feedback" ADD CONSTRAINT "order_feedback_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_feedback" ADD CONSTRAINT "order_feedback_hidden_by_users_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scans_qr_time_idx" ON "qr_scan_events" USING btree ("qr_id","scanned_at");--> statement-breakpoint
CREATE INDEX "feedback_farmer_idx" ON "order_feedback" USING btree ("farmer_id");--> statement-breakpoint
ALTER TABLE "order_feedback" ADD CONSTRAINT "feedback_freshness_range" CHECK ("order_feedback"."freshness_rating" IS NULL OR "order_feedback"."freshness_rating" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "order_feedback" ADD CONSTRAINT "feedback_quality_range" CHECK ("order_feedback"."quality_rating" IS NULL OR "order_feedback"."quality_rating" BETWEEN 1 AND 5);--> statement-breakpoint
-- Backfill the denormalised farmer id on pre-existing reviews.
UPDATE "order_feedback" f SET "farmer_id" = o."farmer_id" FROM "orders" o WHERE o."id" = f."order_id" AND f."farmer_id" IS NULL;
