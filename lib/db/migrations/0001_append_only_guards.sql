-- Traceability events and audit logs are append-only.
-- Application code never updates or deletes them; this trigger makes the
-- database reject such statements as well. (A database superuser can still
-- disable triggers, so this is "append-only by design", not tamper-proof.)
CREATE OR REPLACE FUNCTION seedchain_reject_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'table % is append-only (% rejected)', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER traceability_events_append_only
  BEFORE UPDATE OR DELETE ON "traceability_events"
  FOR EACH ROW EXECUTE FUNCTION seedchain_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION seedchain_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER traceability_events_no_truncate
  BEFORE TRUNCATE ON "traceability_events"
  FOR EACH STATEMENT EXECUTE FUNCTION seedchain_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION seedchain_reject_mutation();
--> statement-breakpoint
ALTER TABLE "traceability_events"
  ADD CONSTRAINT "traceability_events_order_id_orders_id_fk"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id");
--> statement-breakpoint
ALTER TABLE "traceability_events"
  ADD CONSTRAINT "traceability_events_previous_event_fk"
  FOREIGN KEY ("previous_event_id") REFERENCES "traceability_events"("id");
--> statement-breakpoint
ALTER TABLE "traceability_events"
  ADD CONSTRAINT "traceability_events_corrects_event_fk"
  FOREIGN KEY ("corrects_event_id") REFERENCES "traceability_events"("id");
--> statement-breakpoint
ALTER TABLE "qr_codes"
  ADD CONSTRAINT "qr_codes_replaced_by_fk"
  FOREIGN KEY ("replaced_by_id") REFERENCES "qr_codes"("id");
