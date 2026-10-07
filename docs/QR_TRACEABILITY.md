# QR traceability

## What is in the QR

**Only** `https://YOUR-DOMAIN/trace/<public_token>`.

Not in the QR: quantity, prices, status, phone/e-mail, database ids, JSON, credentials, farmer details. The QR never changes when the lot changes, because the information comes from the live database when it is opened.

* `public_token`: 32 bytes from the OS CSPRNG, base64url (43 chars, 256 bits). Not derived from any id, not sequential, not guessable. Unique constraint in `qr_codes`.
* `lot_code`: human-readable `LOT-<year>-<state code>-<6-digit global sequence>` (e.g. `LOT-2026-PB-000001`), printed on the label for people; it is **not** a lookup credential.
* Error-correction level Q with a 4-module quiet zone, rendered as SVG (print) and PNG.

## Lifecycle

```
create lot ─► lot_code + qr_codes row (version 1, ACTIVE) + LOT_CREATED, QR_GENERATED events ─► label printed ─► scans (qr_scan_events)
replace (farmer/admin)  ─► old row REPLACED, new row version n+1 ACTIVE, QR_REPLACED event    (same lot, same history)
revoke  (admin only)    ─► row REVOKED (+reason, who, when), optional replacement, QR_REVOKED event, alert
```
At most one `ACTIVE` QR per lot (partial unique index). Old tokens are never reused and never deleted, so a revoked label can always be recognised.

| Token state | `GET /api/trace/:token` | Scan result |
|---|---|---|
| ACTIVE | 200 + public-safe lot view | `OK` |
| REPLACED | 410 `{status:"REPLACED"}` (no lot data) | `REPLACED` |
| REVOKED | 410 `{status:"REVOKED"}` (no lot data) | `REVOKED` + alert |
| unknown / malformed | 404 (no data) | `UNKNOWN` / `INVALID` + alert |

## Public trace page (`/trace/:token`)

* Works without login; fetches the live record every time (`Cache-Control: no-store`), re-fetches every 30 s, and listens to a per-lot event stream so a farmer's update appears without refresh.
* Shows: SEEDCHAIN VERIFIED banner (or "farmer not verified"), product, variety, lot code, farmer public name/profile, farm, origin, harvest date, harvested and currently available quantity (when listed), quality, farmer-recorded storage, status, timeline, last-updated time, QR version.
* The timeline is an **allow-list projection** (`domain/public-trace.ts`): only whitelisted event types, with fixed labels. Customer names, addresses, order ids, GPS, actor ids, private notes and free-text reasons are never included. Unit tests assert this.
* "Verified" means *the lot exists in the SeedChain database and its farmer was approved by an admin*. It does not certify the physical produce.

## Scanner (`/scan`)

`@zxing/browser` live camera preview (rear camera preferred), flashlight toggle where the device supports it, stops the camera on first read, ignores repeated frames, restart button, paste-link fallback. A payload is accepted only if it is a bare token or a `/trace/<token>` URL on this site's origin (or `VITE_PUBLIC_TRACE_BASE_URL`); other websites and JSON blobs are rejected without being opened. After a valid read the app calls `POST /api/scans` (idempotent on `clientEventId`) and only navigates if the server says `OK`. Handles: permission denied, no camera, insecure context (no HTTPS), network failure (retry), unknown / revoked / replaced / invalid QR. Phones' native camera apps open the same `/trace/<token>` page directly, and the page records that scan itself (`camera_link`).

## Scan logging

`qr_scan_events(lot_id, qr_id, scanned_at, user_id?, scan_source, result, device_type, location?)`. No IP address and no precise location are stored. A burst of > 50 scans of one lot within 10 minutes raises `DUPLICATE_SCAN` (possible copied label).

## Security properties and limits

* A token cannot be enumerated or derived; rate limit 60 requests/min/IP on public trace + scans.
* Copying: anyone can photograph a label and stick it on other produce. The QR proves that a lot *record* exists; it cannot prove the physical produce is the lot. Mitigations: scan-burst alerts, admin revocation, printing the lot code and farmer on the label, and customers comparing label details with the trace page. This is an inherent limitation of unsealed printed QR codes.
* **Do not change the domain** after labels are printed: tokens are stable but the URL host is printed in the QR. Keep the domain (or a redirect from it) for the life of the labels.
