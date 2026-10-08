# Physical identity: branded QR label and tamper-evident seals

**Digital identity** (the QR and its trace page) says what the registered record shows. **Physical integrity** (a serialised seal on the package) adds an indication of whether the package was opened. Neither is a food-safety guarantee, and a seal does not make tampering impossible: if a package is opened, the seal gives a visible exception that can be recorded and investigated.

## The QR and the label

- The QR encodes **only** `https://<domain>/trace/<256-bit random token>`. No database id, name, quantity or status. Tokens are random, not derived from anything, and never sequential.
- The QR is plain black on white on its own white panel with error correction Q and a full quiet zone; branding sits around it, never inside the matrix. (Decoded successfully from the rendered label in testing.)
- Label (SVG, so PNG/SVG/print are vector-sharp): SEEDCHAIN wordmark and leaf mark, "FROM FARM TO PROOF", SCAN TO TRACE, lot id, product line, and check rows.
- **Check rows are drawn from the same public data as the trace page**, so the label cannot claim more than the record says: "LOT REGISTERED" always; "FARM VERIFIED" only if an admin verified the farmer (otherwise "FARM VERIFICATION PENDING"); "QUALITY INSPECTED" only if a non-farmer recorded it, else "QUALITY RECORDED BY FARMER", else no quality row. Footer: "SEEDCHAIN VERIFIED" only for a verified farmer, otherwise "SEEDCHAIN REGISTERED".
- Words we do not use: "100% authentic", "tamper-proof", "guaranteed", "pesticide-free" (nothing verifies those).

Where it appears: lot creation, lot detail (farmer and admin), package labels, the public trace page (identity panel), the customer order page (lot identity + seal chip).

## Packages and seals

`Lot → Packages → QR token → Seal ID → inspection → dispatch`

- A farmer (or admin) splits a harvested lot into packages (`count` × `quantityEach`, or explicit quantities). The total can never exceed the harvested quantity.
- Each package gets its **own random QR token** (same format as lot tokens) and a **random seal serial** `SC-SEAL-XXXXXXXX` (not sequential, readable on a sticker).
- A package token opens the same trace page, scoped to that package: it shows the package label, quantity and the seal serial so the buyer can compare it with the sticker. It inherits its lot's QR state: revoking or disabling the lot QR also disables its package tokens.
- Seal states: `ASSIGNED → DISPATCH_VERIFIED → INTACT`, with `BROKEN`, `REPORTED`, `REPLACED`. Integrity is **derived** (`OK` / `NOT_CHECKED` / `EXCEPTION`), never set by hand.
- Who may do what (enforced on the server):

| From | To | By |
|---|---|---|
| ASSIGNED | DISPATCH_VERIFIED | farmer, admin |
| DISPATCH_VERIFIED | INTACT (inspected) | admin only |
| any | BROKEN / REPORTED | admin (customers report through the public form) |
| BROKEN, REPORTED, INTACT, DISPATCH_VERIFIED | REPLACED (new serial issued; old one kept in history) | farmer or admin, note required |
| REPLACED | DISPATCH_VERIFIED | farmer, admin |

  A farmer cannot declare their own package inspected-intact; a broken seal cannot be "un-broken", only replaced (publicly recorded).
- History is append-only (database trigger), like the main trace events. Exceptions are public by design: a seal problem is never quietly hidden.

## Public reporting

Anyone holding a package can report "seal broken / missing / number mismatch / other" from its trace page. This marks **that package** `REPORTED`, raises a HIGH alert, and notifies the admins and the farmer. It never concludes tampering. Free text is length-capped, control characters stripped, and shown as text only; the endpoint is rate-limited (10 per hour per client).

## Trace page wording

```
DIGITAL IDENTITY                    PHYSICAL INTEGRITY
✓ QR valid                          ✓ Seal intact            (or)  ⚠ Integrity exception reported
✓ Lot registered                      Package PKG-001 · 50 kg        Seal status: Reported
✓ Farm verified                       Check the number on the seal    Please contact SeedChain ...
◌ Quality recorded by the farmer      matches: SC-SEAL-XXXXXXXX
"Digital identity verifies the registered lot. The physical seal provides an additional indication of package integrity."
```
`NO_SEALS` and `NOT_VERIFIED` are shown as such; only fully verified sealed packages show "Seal intact".

## Not built

Printing seal stickers themselves (you buy serialised tamper-evident tape/labels and assign the serial shown here), photo evidence on reports, and a separate admin "inspection" screen (inspection is the admin seal action on the lot page).
