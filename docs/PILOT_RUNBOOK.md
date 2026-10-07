# Pilot runbook

Goal: prove, with real people and phones, that a real lot's printed QR opens the correct live record and that orders flow farmer ↔ customer. Be explicit about what is real: **only data entered by real participants is "real farmer data"**; anything seeded by `seed-pilot` is labelled `[PILOT TEST]` and must be described as simulated.

## 0. Prerequisites

- [ ] Staging deployed on HTTPS ([DEPLOYMENT.md](DEPLOYMENT.md)); `PUBLIC_TRACE_BASE_URL` is the final domain
- [ ] Admin account created via CLI; strong password in a password manager
- [ ] (Optional) `DATA_GOV_IN_API_KEY` configured and *Admin → Data sources → Run now* succeeded
- [ ] Backup + restore drill done ([DISASTER_RECOVERY.md](DISASTER_RECOVERY.md))
- [ ] A label printer (or normal printer + sticker paper) and 2 phones (ideally one Android, one iPhone)

## 1. Participants

5–20 farmers/lots and several customers where available. If real farmers are not yet available, run Part A with the seeded `[PILOT TEST]` accounts and **say so in every report**.

## 2. Procedure

**A. Farmer onboarding (per farmer)**
1. Farmer registers at `/register?role=farmer` (public name, district, state).
2. Admin: *Users & farmers → Approve* (record how identity was verified in the note).
3. Farmer: *Farms & products* → add farm (use "Use my location" in the field) and product.
4. Farmer: *My lots → New lot*: variety, origin, harvest date, quantity, grade, optional storage. The QR label appears.
5. Farmer prints the label (Print / PNG / SVG) and attaches it to the physical lot. **Record the lot code on the pilot sheet.**
6. Farmer lists the lot with a price.

**B. The critical QR acceptance test (two phones)**
1. Phone A (farmer) shows the lot page with the QR on screen (or the printed label).
2. Phone B (customer) opens its *native camera*, scans → the browser opens `/trace/<token>`.
3. Verify: lot code, farmer, farm/origin, harvest date and quantity match what the farmer entered; "SeedChain verified" banner; timeline lists the farmer's steps; "Retrieved … from the live database" shows a time within seconds.
4. Farmer records something new (e.g. *Record quality*, or changes the price). Phone B reloads the same page (or watches it, "Live") → the change appears.
5. Repeat with Phone B using the in-app `/scan`.
6. Fill in the QR matrix in [TESTING.md](TESTING.md) (print, screen, small, dim, damaged, slow network, invalid, revoked, duplicate, different lots).

**C. Order flow**
1. Customer registers, opens *Browse produce*, orders a quantity (pickup or delivery).
2. Farmer sees the order instantly, accepts, prepares, marks ready, dispatches or hands over, then taps *Record delivery/handover*.
3. Customer confirms receipt; leaves feedback.
4. Check: inventory shows reserved → sold; the public trace shows the new status; admin dashboard counts match.

**D. Admin drills**
- Revoke a label (*Lot → Revoke QR*): scan the old label → "QR revoked", no lot data; the replacement label works and shows the same history.
- Open *Alerts*, acknowledge, resolve. Review *Trace events* and *Audit log*.
- Put a phone in airplane mode, record a loss on a farmer device, reconnect: the action syncs once.

## 3. Pass / fail

| Criterion | Pass |
|---|---|
| Every printed QR opens its own lot; no two lots ever resolve to each other | 100% |
| Under normal conditions (good light, normal print) scans resolve | ≥ 95% of attempts on first try |
| Public page after a farmer/order change shows the change | ≤ 30 s without reload (or on reload) |
| No private data (phone, e-mail, address, private notes) visible on public pages | 0 occurrences |
| Revoked QR exposes no lot data | pass |
| Inventory reconciles (`available = harvested − reserved − sold − loss`) and no alerts of type `INVENTORY_MISMATCH` | pass |
| Offline action applied exactly once | pass |

## 4. Daily operations during the pilot

Check *Alerts* and the data-source status; skim *Audit log* for unexpected actions; note any farmer confusion for the retro. Keep a log of every scan failure with device, lighting and print method.

## 5. Ending the pilot

Export/dump the database; decide what is kept; if pilot-seeded data lives in the same database as real data, remove or suspend the `@pilot.seedchain.test` accounts (suspend rather than delete so history stays consistent).
