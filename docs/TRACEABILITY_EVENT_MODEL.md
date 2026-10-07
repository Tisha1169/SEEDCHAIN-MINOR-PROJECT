# Traceability event model

`traceability_events` is an **append-only** log. The API never updates or deletes rows, and a database trigger rejects `UPDATE`, `DELETE` and `TRUNCATE` (migration `0001_append_only_guards`). Corrections are new `CORRECTION_RECORDED` events that reference the entry they correct (`corrects_event_id`). Each event points to the previous event of the same lot (`previous_event_id`), giving an ordered chain.

*Honest scope:* this is "append-only by design and enforced by the database", not tamper-proof: a database superuser can disable triggers or restore a modified backup. It is not a blockchain and no hash-chain signature is claimed.

## Every event answers who / what / where / when / why

| Question | Columns |
|---|---|
| WHO | `actor_user_id`, `actor_role`, `source` (`web`, `offline_sync`, `in_app_scanner`, `camera_link`, `pilot_seed`, `legacy_migration`) |
| WHAT | `lot_id`, `order_id?`, `event_type`, `status`, `metadata` (jsonb) |
| WHERE | `location`, `latitude?`, `longitude?` |
| WHEN | `event_time` (when it happened in the real world, supplied by the farmer/offline client) and `recorded_at` (server clock when stored) |
| WHY | `reason` |
| Quantity | `quantity_before`, `quantity_change`, `quantity_after` (available quantity) |
| Idempotency | `client_event_id` (unique) |
| Visibility | `is_public` (private events such as `LOT_UPDATED` never reach the public page) |

## Event types

| Event | Written when | Public |
|---|---|---|
| `LOT_CREATED` | farmer creates a lot | ✔ |
| `GROWING_RECORDED` | farmer marks the crop growing | ✔ |
| `HARVEST_RECORDED` | harvest quantity added (stock +) | ✔ |
| `QUALITY_RECORDED` | grade recorded/changed | ✔ (grade only) |
| `STORAGE_RECORDED` | farmer-managed storage entry | ✔ (type only) |
| `LOSS_RECORDED`, `SPOILAGE_RECORDED` | stock lost (loss +) | ✔ (quantity) |
| `CORRECTION_RECORDED` | fixes an earlier entry | ✔ (no free text) |
| `LOT_UPDATED` | private details edited | ✘ |
| `LOT_AVAILABLE` / `LOT_UNLISTED` | listed / paused | ✔ |
| `QR_GENERATED`, `QR_REPLACED`, `QR_REVOKED` | QR lifecycle | ✔ |
| `QR_SCANNED` | first verified scan of a QR version | ✔ |
| `ORDER_CREATED` | order placed, stock reserved | ✔ (quantity) |
| `ORDER_ACCEPTED`, `ORDER_PREPARED`, `ORDER_READY` | farmer progress | ✔ |
| `ORDER_DISPATCHED` | farmer/third-party delivery started (the brief's `DELIVERY_INITIATED`) | ✔ |
| `CUSTOMER_PICKUP` / `DELIVERY_COMPLETED` | handover recorded by the farmer | ✔ |
| `CUSTOMER_RECEIVED` | customer confirms (reserved → sold) | ✔ (quantity) |
| `ORDER_REJECTED`, `ORDER_CANCELLED` | stock released | ✔ (no reason text) |
| `LOT_SOLD_OUT` | lot reaches zero available/reserved | ✔ |

There are no storage-operator or logistics-operator events; those activities are recorded by the farmer as `STORAGE_RECORDED` and the delivery events above.

## Audit log

`audit_logs` (also append-only) records privileged and state-changing actions with `before`/`after`, user, role, request id and linked event id: `LOT_CREATED`, `LOT_UPDATED`, `LOT_LISTING_UPDATED`, `ORDER_CREATED`, `ORDER_ACCEPT`/…/`ORDER_CONFIRM_RECEIPT`, `INVENTORY_ADJUSTED`, `QR_REPLACED`, `QR_REVOKED`, `USER_APPROVE`/`REJECT`/`SUSPEND`/`REACTIVATE`, `EVENT_CORRECTED`, `ALERT_*`, `INTEGRATION_RUN`, `FARM_*`, `PRODUCT_CREATED`, `PROFILE_UPDATED`.

## Idempotency

* Farmer events: `client_event_id` (UUID generated on the device). A repeat returns the original event (HTTP 200) and changes nothing.
* Orders: `Idempotency-Key` header; unique `(customer_id, idempotency_key)` makes concurrent duplicates collapse into one order.
* Order transitions: `Idempotency-Key`/`clientEventId`; a replay returns the stored result.
* Scans: `clientEventId`.

## Offline

The farmer UI queues actions locally when the network is down ("Saved offline — waiting for synchronization."), replays them in order with `X-Offline-Replay: 1`, and treats a 4xx as `SYNC_CONFLICT`: the action stays visible for review, an `OFFLINE_SYNC_CONFLICT` alert is raised, and nothing is overwritten.
