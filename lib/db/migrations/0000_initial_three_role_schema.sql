CREATE TYPE "public"."user_role" AS ENUM('admin', 'farmer', 'customer');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('pending', 'active', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."lot_status" AS ENUM('CREATED', 'GROWING', 'HARVESTED', 'AVAILABLE', 'RESERVED', 'PARTIALLY_SOLD', 'SOLD_OUT');--> statement-breakpoint
CREATE TYPE "public"."qr_status" AS ENUM('ACTIVE', 'REVOKED', 'REPLACED');--> statement-breakpoint
CREATE TYPE "public"."quality_grade" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."scan_result" AS ENUM('OK', 'UNKNOWN', 'REVOKED', 'REPLACED', 'INVALID');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_method" AS ENUM('CUSTOMER_PICKUP', 'FARMER_DELIVERY', 'THIRD_PARTY_DELIVERY');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED', 'CUSTOMER_CONFIRMED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."alert_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."ingestion_status" AS ENUM('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED');--> statement-breakpoint
CREATE SEQUENCE "public"."lot_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "farmer_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"public_name" text NOT NULL,
	"bio" text,
	"village" text,
	"district" text,
	"state" text,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farmer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"village" text,
	"district" text,
	"state" text NOT NULL,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"size_hectares" numeric(10, 2),
	"soil_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farmer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"variety" text NOT NULL,
	"description" text,
	"unit" text DEFAULT 'kg' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"phone" text,
	"role" "user_role" NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"location" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "lot_storage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid NOT NULL,
	"farmer_id" uuid NOT NULL,
	"storage_type" text NOT NULL,
	"storage_location" text NOT NULL,
	"storage_start" timestamp with time zone NOT NULL,
	"storage_end" timestamp with time zone,
	"temperature_c" numeric(5, 2),
	"humidity_pct" numeric(5, 2),
	"storage_condition" text,
	"notes" text,
	"client_event_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lot_storage_records_client_event_id_unique" UNIQUE("client_event_id"),
	CONSTRAINT "storage_humidity_range" CHECK ("lot_storage_records"."humidity_pct" IS NULL OR ("lot_storage_records"."humidity_pct" >= 0 AND "lot_storage_records"."humidity_pct" <= 100))
);
--> statement-breakpoint
CREATE TABLE "lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_code" text NOT NULL,
	"farmer_id" uuid NOT NULL,
	"farm_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"unit" text DEFAULT 'kg' NOT NULL,
	"planting_date" date,
	"expected_harvest_date" date,
	"harvest_date" date,
	"harvested_qty" numeric(12, 3) DEFAULT 0 NOT NULL,
	"reserved_qty" numeric(12, 3) DEFAULT 0 NOT NULL,
	"sold_qty" numeric(12, 3) DEFAULT 0 NOT NULL,
	"loss_qty" numeric(12, 3) DEFAULT 0 NOT NULL,
	"available_qty" numeric(12, 3) GENERATED ALWAYS AS (harvested_qty - reserved_qty - sold_qty - loss_qty) STORED,
	"price_per_unit" numeric(12, 2),
	"listed" boolean DEFAULT false NOT NULL,
	"quality_grade" "quality_grade",
	"quality_notes" text,
	"origin" text NOT NULL,
	"status" "lot_status" DEFAULT 'CREATED' NOT NULL,
	"public_notes" text,
	"private_notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lots_lot_code_unique" UNIQUE("lot_code"),
	CONSTRAINT "lots_inventory_non_negative" CHECK ("lots"."harvested_qty" >= 0 AND "lots"."reserved_qty" >= 0 AND "lots"."sold_qty" >= 0 AND "lots"."loss_qty" >= 0),
	CONSTRAINT "lots_inventory_balance" CHECK ("lots"."reserved_qty" + "lots"."sold_qty" + "lots"."loss_qty" <= "lots"."harvested_qty"),
	CONSTRAINT "lots_price_non_negative" CHECK ("lots"."price_per_unit" IS NULL OR "lots"."price_per_unit" >= 0)
);
--> statement-breakpoint
CREATE TABLE "qr_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid NOT NULL,
	"public_token" text NOT NULL,
	"version" integer NOT NULL,
	"status" "qr_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"revoke_reason" text,
	"replaced_by_id" uuid,
	CONSTRAINT "qr_codes_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE "qr_scan_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid,
	"qr_id" uuid,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	"scan_source" text NOT NULL,
	"result" "scan_result" NOT NULL,
	"device_type" text,
	"location" text,
	"client_event_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qr_scan_events_client_event_id_unique" UNIQUE("client_event_id")
);
--> statement-breakpoint
CREATE TABLE "traceability_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid NOT NULL,
	"order_id" uuid,
	"event_type" text NOT NULL,
	"event_time" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"actor_role" "user_role",
	"location" text,
	"latitude" double precision,
	"longitude" double precision,
	"quantity_before" numeric(12, 3),
	"quantity_change" numeric(12, 3),
	"quantity_after" numeric(12, 3),
	"status" text,
	"reason" text,
	"source" text DEFAULT 'web' NOT NULL,
	"client_event_id" uuid,
	"is_public" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"previous_event_id" uuid,
	"corrects_event_id" uuid
);
--> statement-breakpoint
CREATE TABLE "order_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_feedback_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "feedback_rating_range" CHECK ("order_feedback"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"lot_id" uuid NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"line_total" numeric(14, 2) NOT NULL,
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_code" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"farmer_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"fulfillment_method" "fulfillment_method" NOT NULL,
	"delivery_address" text,
	"customer_notes" text,
	"total_amount" numeric(14, 2) NOT NULL,
	"idempotency_key" text,
	"rejection_reason" text,
	"cancel_reason" text,
	"accepted_at" timestamp with time zone,
	"prepared_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"delivery_location" text,
	"delivery_latitude" double precision,
	"delivery_longitude" double precision,
	"delivery_notes" text,
	"third_party_name" text,
	"third_party_reference" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_code_unique" UNIQUE("order_code"),
	CONSTRAINT "orders_total_non_negative" CHECK ("orders"."total_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"farmer_id" uuid,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedupe_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"role" "user_role",
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"request_id" text,
	"event_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"source_endpoint" text NOT NULL,
	"request_params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processing_version" text NOT NULL,
	"status" "ingestion_status" NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"route" text NOT NULL,
	"response_status" integer NOT NULL,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_price_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"source" text NOT NULL,
	"source_endpoint" text NOT NULL,
	"observation_date" date NOT NULL,
	"retrieved_at" timestamp with time zone NOT NULL,
	"state" text NOT NULL,
	"district" text,
	"market" text NOT NULL,
	"commodity" text NOT NULL,
	"variety" text DEFAULT '' NOT NULL,
	"grade" text DEFAULT '' NOT NULL,
	"arrival_quantity_tonnes" numeric(12, 2),
	"min_price" numeric(12, 2),
	"max_price" numeric(12, 2),
	"modal_price" numeric(12, 2),
	"price_unit" text DEFAULT 'INR/quintal' NOT NULL,
	"processing_version" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weather_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"farm_id" uuid NOT NULL,
	"source" text NOT NULL,
	"source_endpoint" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"observation_time" timestamp with time zone NOT NULL,
	"retrieved_at" timestamp with time zone NOT NULL,
	"temperature_c" double precision,
	"precipitation_mm" double precision,
	"humidity_pct" double precision,
	"weather_code" integer,
	"condition" text,
	"processing_version" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "farmer_profiles" ADD CONSTRAINT "farmer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_profiles" ADD CONSTRAINT "farmer_profiles_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_storage_records" ADD CONSTRAINT "lot_storage_records_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_storage_records" ADD CONSTRAINT "lot_storage_records_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_scan_events" ADD CONSTRAINT "qr_scan_events_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_scan_events" ADD CONSTRAINT "qr_scan_events_qr_id_qr_codes_id_fk" FOREIGN KEY ("qr_id") REFERENCES "public"."qr_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_scan_events" ADD CONSTRAINT "qr_scan_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traceability_events" ADD CONSTRAINT "traceability_events_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traceability_events" ADD CONSTRAINT "traceability_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_feedback" ADD CONSTRAINT "order_feedback_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_feedback" ADD CONSTRAINT "order_feedback_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_price_observations" ADD CONSTRAINT "market_price_observations_run_id_external_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."external_ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weather_observations" ADD CONSTRAINT "weather_observations_run_id_external_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."external_ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weather_observations" ADD CONSTRAINT "weather_observations_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "farms_farmer_idx" ON "farms" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "products_farmer_idx" ON "products" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "storage_lot_idx" ON "lot_storage_records" USING btree ("lot_id");--> statement-breakpoint
CREATE INDEX "lots_farmer_idx" ON "lots" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "lots_status_idx" ON "lots" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lots_listed_idx" ON "lots" USING btree ("listed");--> statement-breakpoint
CREATE INDEX "lots_created_idx" ON "lots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "qr_lot_idx" ON "qr_codes" USING btree ("lot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qr_one_active_per_lot" ON "qr_codes" USING btree ("lot_id") WHERE status = 'ACTIVE';--> statement-breakpoint
CREATE UNIQUE INDEX "qr_lot_version_uq" ON "qr_codes" USING btree ("lot_id","version");--> statement-breakpoint
CREATE INDEX "scans_lot_idx" ON "qr_scan_events" USING btree ("lot_id");--> statement-breakpoint
CREATE INDEX "scans_time_idx" ON "qr_scan_events" USING btree ("scanned_at");--> statement-breakpoint
CREATE INDEX "events_lot_time_idx" ON "traceability_events" USING btree ("lot_id","event_time");--> statement-breakpoint
CREATE INDEX "events_type_idx" ON "traceability_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "events_recorded_idx" ON "traceability_events" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "events_order_idx" ON "traceability_events" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_client_event_uq" ON "traceability_events" USING btree ("client_event_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_lot_idx" ON "order_items" USING btree ("lot_id");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_farmer_idx" ON "orders" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_idempotency_uq" ON "orders" USING btree ("customer_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "alerts_created_idx" ON "alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "alerts_type_idx" ON "alerts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "alerts_farmer_idx" ON "alerts" USING btree ("farmer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "alerts_open_dedupe_uq" ON "alerts" USING btree ("dedupe_key") WHERE resolved_at IS NULL AND dedupe_key IS NOT NULL;--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ingestion_source_idx" ON "external_ingestion_runs" USING btree ("source","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_user_key_route_uq" ON "idempotency_keys" USING btree ("user_id","key","route");--> statement-breakpoint
CREATE UNIQUE INDEX "market_obs_natural_uq" ON "market_price_observations" USING btree ("source","observation_date","state","market","commodity","variety","grade");--> statement-breakpoint
CREATE INDEX "market_obs_date_idx" ON "market_price_observations" USING btree ("observation_date");--> statement-breakpoint
CREATE INDEX "market_obs_commodity_idx" ON "market_price_observations" USING btree ("commodity");--> statement-breakpoint
CREATE INDEX "weather_farm_time_idx" ON "weather_observations" USING btree ("farm_id","observation_time");--> statement-breakpoint
CREATE UNIQUE INDEX "weather_farm_obs_uq" ON "weather_observations" USING btree ("farm_id","observation_time","source");