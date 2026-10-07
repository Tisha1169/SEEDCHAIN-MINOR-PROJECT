# Database schema

> Generated from the live PostgreSQL 16 schema produced by `lib/db/migrations`. Source of truth: `lib/db/src/schema/*.ts` (Drizzle) and the SQL migrations.

Conceptual model:

```
users ─┬─ farmer_profiles (1:1, farmers)
       ├─ sessions
       ├─ farms ─┐
       ├─ products ─┤
       └─ lots ◄───┘ ──┬─ qr_codes (versions; one ACTIVE)
                       ├─ traceability_events (append-only)
                       ├─ lot_storage_records
                       ├─ qr_scan_events
                       └─ order_items ─ orders ─ order_feedback
system: alerts · audit_logs (append-only) · idempotency_keys
external: external_ingestion_runs ─┬─ market_price_observations
                                   └─ weather_observations
```

Sequences: `lot_code_seq` (global counter used in `LOT-<year>-<state>-<000001>`).

Enums: `user_role(admin,farmer,customer)`, `user_status(pending,active,rejected,suspended)`, `lot_status`, `quality_grade`, `qr_status`, `scan_result`, `order_status`, `fulfillment_method(CUSTOMER_PICKUP,FARMER_DELIVERY,THIRD_PARTY_DELIVERY)`, `alert_severity`, `ingestion_status`.

Migrations: `0000_initial_three_role_schema`, `0001_append_only_guards` (triggers + extra FKs), `0002_event_recorded_clock`. Legacy five-role tables are renamed to `legacy_*` (never dropped) and their data imported once; see DISASTER_RECOVERY.md.

## `alerts`

Operational alerts, de-duplicated while open.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `type` | text | no |  |
| `severity` | USER-DEFINED | no |  |
| `entity_type` | text | yes |  |
| `entity_id` | uuid | yes |  |
| `farmer_id` | uuid | yes |  |
| `message` | text | no |  |
| `metadata` | jsonb | no | `'{}'::jsonb` |
| `dedupe_key` | text | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |
| `acknowledged_at` | timestamp with time zone | yes |  |
| `acknowledged_by` | uuid | yes |  |
| `resolved_at` | timestamp with time zone | yes |  |
| `resolved_by` | uuid | yes |  |

Constraints:

- `alerts_acknowledged_by_users_id_fk`: `FOREIGN KEY (acknowledged_by) REFERENCES users(id)`
- `alerts_farmer_id_users_id_fk`: `FOREIGN KEY (farmer_id) REFERENCES users(id)`
- `alerts_resolved_by_users_id_fk`: `FOREIGN KEY (resolved_by) REFERENCES users(id)`

Indexes:

- `alerts_created_idx`: `btree (created_at)`
- `alerts_farmer_idx`: `btree (farmer_id)`
- `alerts_open_dedupe_uq`: `btree (dedupe_key) WHERE ((resolved_at IS NULL) AND (dedupe_key IS NOT NULL))`
- `alerts_type_idx`: `btree (type)`

## `audit_logs`

Append-only audit trail with before/after.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | yes |  |
| `role` | USER-DEFINED | yes |  |
| `action` | text | no |  |
| `entity_type` | text | no |  |
| `entity_id` | uuid | yes |  |
| `before` | jsonb | yes |  |
| `after` | jsonb | yes |  |
| `request_id` | text | yes |  |
| `event_id` | uuid | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `audit_logs_user_id_users_id_fk`: `FOREIGN KEY (user_id) REFERENCES users(id)`

Indexes:

- `audit_created_idx`: `btree (created_at)`
- `audit_entity_idx`: `btree (entity_type, entity_id)`
- `audit_user_idx`: `btree (user_id)`

## `external_ingestion_runs`

Lineage: one row per external data pull (source, endpoint, params, version, status, error).

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `source` | text | no |  |
| `source_endpoint` | text | no |  |
| `request_params` | jsonb | no | `'{}'::jsonb` |
| `processing_version` | text | no |  |
| `status` | USER-DEFINED | no |  |
| `record_count` | integer | no | `0` |
| `error` | text | yes |  |
| `started_at` | timestamp with time zone | no | `now()` |
| `finished_at` | timestamp with time zone | yes |  |

Indexes:

- `ingestion_source_idx`: `btree (source, started_at)`

## `farmer_profiles`

Public-facing farmer identity (the only farmer fields shown on public pages) and admin verification stamp.

| Column | Type | Null | Default |
|---|---|---|---|
| `user_id` | uuid | no |  |
| `public_name` | text | no |  |
| `bio` | text | yes |  |
| `village` | text | yes |  |
| `district` | text | yes |  |
| `state` | text | yes |  |
| `verified_at` | timestamp with time zone | yes |  |
| `verified_by` | uuid | yes |  |
| `review_note` | text | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

Constraints:

- `farmer_profiles_user_id_users_id_fk`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- `farmer_profiles_verified_by_users_id_fk`: `FOREIGN KEY (verified_by) REFERENCES users(id)`

## `farms`

Farmer-owned farms, optional GPS (used for weather).

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `farmer_id` | uuid | no |  |
| `name` | text | no |  |
| `village` | text | yes |  |
| `district` | text | yes |  |
| `state` | text | no |  |
| `latitude` | numeric | yes |  |
| `longitude` | numeric | yes |  |
| `size_hectares` | numeric | yes |  |
| `soil_type` | text | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

Constraints:

- `farms_farmer_id_users_id_fk`: `FOREIGN KEY (farmer_id) REFERENCES users(id)`

Indexes:

- `farms_farmer_idx`: `btree (farmer_id)`

## `idempotency_keys`

Stored responses for Idempotency-Key replays.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no |  |
| `key` | text | no |  |
| `route` | text | no |  |
| `response_status` | integer | no |  |
| `response_body` | jsonb | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `idempotency_keys_user_id_users_id_fk`: `FOREIGN KEY (user_id) REFERENCES users(id)`

Indexes:

- `idempotency_user_key_route_uq`: `btree (user_id, key, route)`

## `lot_storage_records`

Farmer-managed storage information (no storage role).

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `lot_id` | uuid | no |  |
| `farmer_id` | uuid | no |  |
| `storage_type` | text | no |  |
| `storage_location` | text | no |  |
| `storage_start` | timestamp with time zone | no |  |
| `storage_end` | timestamp with time zone | yes |  |
| `temperature_c` | numeric | yes |  |
| `humidity_pct` | numeric | yes |  |
| `storage_condition` | text | yes |  |
| `notes` | text | yes |  |
| `client_event_id` | uuid | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `lot_storage_records_client_event_id_unique`: `UNIQUE (client_event_id)`
- `lot_storage_records_farmer_id_users_id_fk`: `FOREIGN KEY (farmer_id) REFERENCES users(id)`
- `lot_storage_records_lot_id_lots_id_fk`: `FOREIGN KEY (lot_id) REFERENCES lots(id)`
- `storage_humidity_range`: `CHECK (((humidity_pct IS NULL) OR ((humidity_pct >= (0)::numeric) AND (humidity_pct <= (100)::numeric))))`

Indexes:

- `lot_storage_records_client_event_id_unique`: `btree (client_event_id)`
- `storage_lot_idx`: `btree (lot_id)`

## `lots`

One physical lot. Inventory counters + generated `available_qty`; CHECK constraints make negative/oversold stock impossible.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `lot_code` | text | no |  |
| `farmer_id` | uuid | no |  |
| `farm_id` | uuid | no |  |
| `product_id` | uuid | no |  |
| `unit` | text | no | `'kg'::text` |
| `planting_date` | date | yes |  |
| `expected_harvest_date` | date | yes |  |
| `harvest_date` | date | yes |  |
| `harvested_qty` | numeric | no | `0` |
| `reserved_qty` | numeric | no | `0` |
| `sold_qty` | numeric | no | `0` |
| `loss_qty` | numeric | no | `0` |
| `available_qty` | numeric | yes |  |
| `price_per_unit` | numeric | yes |  |
| `listed` | boolean | no | `false` |
| `quality_grade` | USER-DEFINED | yes |  |
| `quality_notes` | text | yes |  |
| `origin` | text | no |  |
| `status` | USER-DEFINED | no | `'CREATED'::lot_status` |
| `public_notes` | text | yes |  |
| `private_notes` | text | yes |  |
| `version` | integer | no | `1` |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

Constraints:

- `lots_farm_id_farms_id_fk`: `FOREIGN KEY (farm_id) REFERENCES farms(id)`
- `lots_farmer_id_users_id_fk`: `FOREIGN KEY (farmer_id) REFERENCES users(id)`
- `lots_inventory_balance`: `CHECK ((((reserved_qty + sold_qty) + loss_qty) <= harvested_qty))`
- `lots_inventory_non_negative`: `CHECK (((harvested_qty >= (0)::numeric) AND (reserved_qty >= (0)::numeric) AND (sold_qty >= (0)::numeric) AND (loss_qty >= (0)::numeric)))`
- `lots_lot_code_unique`: `UNIQUE (lot_code)`
- `lots_price_non_negative`: `CHECK (((price_per_unit IS NULL) OR (price_per_unit >= (0)::numeric)))`
- `lots_product_id_products_id_fk`: `FOREIGN KEY (product_id) REFERENCES products(id)`

Indexes:

- `lots_created_idx`: `btree (created_at)`
- `lots_farmer_idx`: `btree (farmer_id)`
- `lots_listed_idx`: `btree (listed)`
- `lots_lot_code_unique`: `btree (lot_code)`
- `lots_status_idx`: `btree (status)`

## `market_price_observations`

Government mandi price observations, each linked to its ingestion run.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `run_id` | uuid | no |  |
| `source` | text | no |  |
| `source_endpoint` | text | no |  |
| `observation_date` | date | no |  |
| `retrieved_at` | timestamp with time zone | no |  |
| `state` | text | no |  |
| `district` | text | yes |  |
| `market` | text | no |  |
| `commodity` | text | no |  |
| `variety` | text | no | `''::text` |
| `grade` | text | no | `''::text` |
| `arrival_quantity_tonnes` | numeric | yes |  |
| `min_price` | numeric | yes |  |
| `max_price` | numeric | yes |  |
| `modal_price` | numeric | yes |  |
| `price_unit` | text | no | `'INR/quintal'::text` |
| `processing_version` | text | no |  |

Constraints:

- `market_price_observations_run_id_external_ingestion_runs_id_fk`: `FOREIGN KEY (run_id) REFERENCES external_ingestion_runs(id)`

Indexes:

- `market_obs_commodity_idx`: `btree (commodity)`
- `market_obs_date_idx`: `btree (observation_date)`
- `market_obs_natural_uq`: `btree (source, observation_date, state, market, commodity, variety, grade)`

## `order_feedback`

One rating per confirmed order.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `order_id` | uuid | no |  |
| `customer_id` | uuid | no |  |
| `rating` | integer | no |  |
| `comment` | text | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `feedback_rating_range`: `CHECK (((rating >= 1) AND (rating <= 5)))`
- `order_feedback_customer_id_users_id_fk`: `FOREIGN KEY (customer_id) REFERENCES users(id)`
- `order_feedback_order_id_orders_id_fk`: `FOREIGN KEY (order_id) REFERENCES orders(id)`
- `order_feedback_order_id_unique`: `UNIQUE (order_id)`

Indexes:

- `order_feedback_order_id_unique`: `btree (order_id)`

## `order_items`

Order lines (lot, quantity, unit price at order time).

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `order_id` | uuid | no |  |
| `lot_id` | uuid | no |  |
| `quantity` | numeric | no |  |
| `unit_price` | numeric | no |  |
| `line_total` | numeric | no |  |

Constraints:

- `order_items_lot_id_lots_id_fk`: `FOREIGN KEY (lot_id) REFERENCES lots(id)`
- `order_items_order_id_orders_id_fk`: `FOREIGN KEY (order_id) REFERENCES orders(id)`
- `order_items_quantity_positive`: `CHECK ((quantity > (0)::numeric))`

Indexes:

- `order_items_lot_idx`: `btree (lot_id)`
- `order_items_order_idx`: `btree (order_id)`

## `orders`

Direct farmer↔customer orders with backend-enforced status and fulfilment fields. No logistics account exists.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `order_code` | text | no |  |
| `customer_id` | uuid | no |  |
| `farmer_id` | uuid | no |  |
| `status` | USER-DEFINED | no | `'PENDING'::order_status` |
| `fulfillment_method` | USER-DEFINED | no |  |
| `delivery_address` | text | yes |  |
| `customer_notes` | text | yes |  |
| `total_amount` | numeric | no |  |
| `idempotency_key` | text | yes |  |
| `rejection_reason` | text | yes |  |
| `cancel_reason` | text | yes |  |
| `accepted_at` | timestamp with time zone | yes |  |
| `prepared_at` | timestamp with time zone | yes |  |
| `ready_at` | timestamp with time zone | yes |  |
| `dispatched_at` | timestamp with time zone | yes |  |
| `delivered_at` | timestamp with time zone | yes |  |
| `confirmed_at` | timestamp with time zone | yes |  |
| `cancelled_at` | timestamp with time zone | yes |  |
| `delivery_location` | text | yes |  |
| `delivery_latitude` | double precision | yes |  |
| `delivery_longitude` | double precision | yes |  |
| `delivery_notes` | text | yes |  |
| `third_party_name` | text | yes |  |
| `third_party_reference` | text | yes |  |
| `version` | integer | no | `1` |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

Constraints:

- `orders_customer_id_users_id_fk`: `FOREIGN KEY (customer_id) REFERENCES users(id)`
- `orders_farmer_id_users_id_fk`: `FOREIGN KEY (farmer_id) REFERENCES users(id)`
- `orders_order_code_unique`: `UNIQUE (order_code)`
- `orders_total_non_negative`: `CHECK ((total_amount >= (0)::numeric))`

Indexes:

- `orders_created_idx`: `btree (created_at)`
- `orders_customer_idx`: `btree (customer_id)`
- `orders_farmer_idx`: `btree (farmer_id)`
- `orders_idempotency_uq`: `btree (customer_id, idempotency_key)`
- `orders_order_code_unique`: `btree (order_code)`
- `orders_status_idx`: `btree (status)`

## `products`

Farmer-registered crop + variety.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `farmer_id` | uuid | no |  |
| `name` | text | no |  |
| `variety` | text | no |  |
| `description` | text | yes |  |
| `unit` | text | no | `'kg'::text` |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `products_farmer_id_users_id_fk`: `FOREIGN KEY (farmer_id) REFERENCES users(id)`

Indexes:

- `products_farmer_idx`: `btree (farmer_id)`

## `qr_codes`

QR identities for a lot: random public token, version, ACTIVE/REVOKED/REPLACED. One ACTIVE per lot (partial unique index).

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `lot_id` | uuid | no |  |
| `public_token` | text | no |  |
| `version` | integer | no |  |
| `status` | USER-DEFINED | no | `'ACTIVE'::qr_status` |
| `created_by` | uuid | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |
| `revoked_at` | timestamp with time zone | yes |  |
| `revoked_by` | uuid | yes |  |
| `revoke_reason` | text | yes |  |
| `replaced_by_id` | uuid | yes |  |

Constraints:

- `qr_codes_created_by_users_id_fk`: `FOREIGN KEY (created_by) REFERENCES users(id)`
- `qr_codes_lot_id_lots_id_fk`: `FOREIGN KEY (lot_id) REFERENCES lots(id)`
- `qr_codes_public_token_unique`: `UNIQUE (public_token)`
- `qr_codes_replaced_by_fk`: `FOREIGN KEY (replaced_by_id) REFERENCES qr_codes(id)`
- `qr_codes_revoked_by_users_id_fk`: `FOREIGN KEY (revoked_by) REFERENCES users(id)`

Indexes:

- `qr_codes_public_token_unique`: `btree (public_token)`
- `qr_lot_idx`: `btree (lot_id)`
- `qr_lot_version_uq`: `btree (lot_id, version)`
- `qr_one_active_per_lot`: `btree (lot_id) WHERE (status = 'ACTIVE'::qr_status)`

## `qr_scan_events`

Every scan attempt and its result. No IP address or precise location stored.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `lot_id` | uuid | yes |  |
| `qr_id` | uuid | yes |  |
| `scanned_at` | timestamp with time zone | no | `now()` |
| `user_id` | uuid | yes |  |
| `scan_source` | text | no |  |
| `result` | USER-DEFINED | no |  |
| `device_type` | text | yes |  |
| `location` | text | yes |  |
| `client_event_id` | uuid | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `qr_scan_events_client_event_id_unique`: `UNIQUE (client_event_id)`
- `qr_scan_events_lot_id_lots_id_fk`: `FOREIGN KEY (lot_id) REFERENCES lots(id)`
- `qr_scan_events_qr_id_qr_codes_id_fk`: `FOREIGN KEY (qr_id) REFERENCES qr_codes(id)`
- `qr_scan_events_user_id_users_id_fk`: `FOREIGN KEY (user_id) REFERENCES users(id)`

Indexes:

- `qr_scan_events_client_event_id_unique`: `btree (client_event_id)`
- `scans_lot_idx`: `btree (lot_id)`
- `scans_time_idx`: `btree (scanned_at)`

## `sessions`

Server-side sessions; only an HMAC of the random token is stored. Revocable, expiring.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no |  |
| `token_hash` | text | no |  |
| `expires_at` | timestamp with time zone | no |  |
| `revoked_at` | timestamp with time zone | yes |  |
| `user_agent` | text | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:

- `sessions_token_hash_unique`: `UNIQUE (token_hash)`
- `sessions_user_id_users_id_fk`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`

Indexes:

- `sessions_token_hash_unique`: `btree (token_hash)`
- `sessions_user_idx`: `btree (user_id)`

## `traceability_events`

Append-only event log (trigger rejects UPDATE/DELETE/TRUNCATE). Chained by `previous_event_id`.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `lot_id` | uuid | no |  |
| `order_id` | uuid | yes |  |
| `event_type` | text | no |  |
| `event_time` | timestamp with time zone | no |  |
| `recorded_at` | timestamp with time zone | no | `clock_timestamp()` |
| `actor_user_id` | uuid | yes |  |
| `actor_role` | USER-DEFINED | yes |  |
| `location` | text | yes |  |
| `latitude` | double precision | yes |  |
| `longitude` | double precision | yes |  |
| `quantity_before` | numeric | yes |  |
| `quantity_change` | numeric | yes |  |
| `quantity_after` | numeric | yes |  |
| `status` | text | yes |  |
| `reason` | text | yes |  |
| `source` | text | no | `'web'::text` |
| `client_event_id` | uuid | yes |  |
| `is_public` | boolean | no | `true` |
| `metadata` | jsonb | no | `'{}'::jsonb` |
| `previous_event_id` | uuid | yes |  |
| `corrects_event_id` | uuid | yes |  |

Constraints:

- `traceability_events_actor_user_id_users_id_fk`: `FOREIGN KEY (actor_user_id) REFERENCES users(id)`
- `traceability_events_corrects_event_fk`: `FOREIGN KEY (corrects_event_id) REFERENCES traceability_events(id)`
- `traceability_events_lot_id_lots_id_fk`: `FOREIGN KEY (lot_id) REFERENCES lots(id)`
- `traceability_events_order_id_orders_id_fk`: `FOREIGN KEY (order_id) REFERENCES orders(id)`
- `traceability_events_previous_event_fk`: `FOREIGN KEY (previous_event_id) REFERENCES traceability_events(id)`

Indexes:

- `events_client_event_uq`: `btree (client_event_id)`
- `events_lot_time_idx`: `btree (lot_id, event_time)`
- `events_order_idx`: `btree (order_id)`
- `events_recorded_idx`: `btree (recorded_at)`
- `events_type_idx`: `btree (event_type)`

## `users`

Accounts. `role` ∈ admin/farmer/customer only; `status` gates farmers until admin approval.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `name` | text | no |  |
| `email` | text | no |  |
| `password_hash` | text | no |  |
| `phone` | text | yes |  |
| `role` | USER-DEFINED | no |  |
| `status` | USER-DEFINED | no | `'active'::user_status` |
| `location` | text | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

Constraints:

- `users_email_unique`: `UNIQUE (email)`

Indexes:

- `users_email_unique`: `btree (email)`
- `users_role_idx`: `btree (role)`
- `users_status_idx`: `btree (status)`

## `weather_observations`

Weather observations per farm, each linked to its ingestion run.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `run_id` | uuid | no |  |
| `farm_id` | uuid | no |  |
| `source` | text | no |  |
| `source_endpoint` | text | no |  |
| `latitude` | double precision | no |  |
| `longitude` | double precision | no |  |
| `observation_time` | timestamp with time zone | no |  |
| `retrieved_at` | timestamp with time zone | no |  |
| `temperature_c` | double precision | yes |  |
| `precipitation_mm` | double precision | yes |  |
| `humidity_pct` | double precision | yes |  |
| `weather_code` | integer | yes |  |
| `condition` | text | yes |  |
| `processing_version` | text | no |  |

Constraints:

- `weather_observations_farm_id_farms_id_fk`: `FOREIGN KEY (farm_id) REFERENCES farms(id)`
- `weather_observations_run_id_external_ingestion_runs_id_fk`: `FOREIGN KEY (run_id) REFERENCES external_ingestion_runs(id)`

Indexes:

- `weather_farm_obs_uq`: `btree (farm_id, observation_time, source)`
- `weather_farm_time_idx`: `btree (farm_id, observation_time)`
