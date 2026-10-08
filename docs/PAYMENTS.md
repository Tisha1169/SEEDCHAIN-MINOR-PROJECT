# Online payments (Razorpay)

Payments are **off until you set Razorpay keys**. With no keys the site behaves as before: the customer places an order and pays the farmer directly, and the checkout page says so. SeedChain never fakes a payment: there is no "mark as paid" button anywhere.

## Turn it on

1. Create a Razorpay account and use **Test Mode** first (Dashboard → Account & Settings → API Keys → generate test keys).
2. In Razorpay: Settings → Payment Capture → **Automatic** (SeedChain treats a captured payment as paid).
3. Webhook: Settings → Webhooks → Add. URL `https://<your-domain>/api/webhooks/razorpay`, set a secret, and tick `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`.
4. Set these on the server (Render: Environment):

| Variable | Meaning |
|---|---|
| `RAZORPAY_KEY_ID` | Public key id (`rzp_test_…` or `rzp_live_…`). Sent to the browser. |
| `RAZORPAY_KEY_SECRET` | Secret. **Server only**; never sent to the frontend, never logged. |
| `RAZORPAY_WEBHOOK_SECRET` | The secret you set on the webhook. Required in production when payments are on. |
| `PAYMENT_HOLD_MINUTES` | Optional, default 20: how long stock is held while paying. |

The key id's prefix decides the mode shown to users (`TEST MODE` banner) and stored on each payment (`mode`). Going live is changing the two keys, nothing else.

## Flow

```
Buy now → /checkout (review, delivery, address)
  → POST /api/checkout            server validates cart + stock, computes total, holds stock,
                                  creates the Razorpay order, stores payments row
  → Razorpay Checkout (UPI, cards, netbanking, wallets ...)
  → POST /api/checkout/verify     server checks HMAC_SHA256(order_id|payment_id, key_secret)
                                  against the Razorpay order id IT stored; cross-checks amount with Razorpay
  → order PAID, farmer notified   (also: webhook payment.captured / order.paid does the same, idempotently)
```

The browser is never believed. An order becomes `PAID` only by a verified signature or a signed webhook.

## States

Orders keep their existing fulfilment status (`PENDING … CUSTOMER_CONFIRMED`); payment is a separate field, `orders.payment_status`:

`UNPAID` (no online payment) · `PAYMENT_PENDING` · `PAYMENT_PROCESSING` · `PAID` · `PAYMENT_FAILED` · `PAYMENT_CANCELLED` · `REFUND_PENDING` · `REFUNDED`

This maps your suggested model: ORDER_CREATED = the order row exists with `PAYMENT_PENDING`; ORDER_ACCEPTED, DISPATCHED, DELIVERED, CUSTOMER_CONFIRMED are the existing fulfilment statuses, reachable only after `PAID`.

A farmer **cannot see or act on** an order until it is paid. Admins and the paying customer can.

## What is protected, and how

| Risk | Control |
|---|---|
| Fake "success" from the browser | Signature verified on the server against the stored Razorpay order id; amount/currency cross-checked with Razorpay's own record |
| Changing the price | Total computed server-side from lot prices; any client total is ignored; Razorpay order amount must equal it |
| Double click / double order | Required `Idempotency-Key`; unique per customer; same key returns the same order and Razorpay order |
| Duplicate / out-of-order webhooks | `payment_events.event_id` (Razorpay's `x-razorpay-event-id`) is unique and inserted in the same transaction as the effect; redelivery changes nothing |
| Callback and webhook racing | Both go through one idempotent `markPaid` under row locks |
| Overselling | Stock is reserved at checkout inside the same locked transaction as order creation; held stock counts as unavailable to others |
| Abandoned checkout | Order is cancelled and stock released after the hold; also released immediately if the gateway is down |
| Money arrives after expiry | Order stays cancelled, stock stays released, payment becomes `REFUND_PENDING`, admin alerted |
| Farmer rejects/cancels a paid order | `REFUND_PENDING` + admin alert; admin refunds through Razorpay once (guarded against double refunds) |
| Secrets | Key secret server-only; errors from Razorpay are logged by code/description only; no card/UPI/bank data is stored (only ids, status, method, amount) |
| Webhook forgery | HMAC over the raw bytes; route sits before the JSON parser and outside the cookie CSRF rule; rate limited |
| Bypassing payment | With payments on, plain `POST /api/orders` is refused (`PAYMENT_REQUIRED`) |
| Third-party scripts | CSP allows only `checkout.razorpay.com` (script/frame) and `api/lumberjack.razorpay.com` (connect) |

## Testing

- `artifacts/api-server/test/payments.test.ts`: 22 tests (real Postgres, stubbed Razorpay API, real HMACs).
- `scripts/dev/mock-razorpay.mjs`: a local stand-in for the Razorpay API so you can run the whole app with no keys.
- `scripts/e2e-smoke.mjs`: end-to-end against any running deployment. With `SIM_KEY_SECRET`/`SIM_WEBHOOK_SECRET` (local mock only) it also pays.
- **Not covered by automation:** Razorpay's own hosted payment window. Test it once yourself in Test Mode with Razorpay's test cards/UPI (https://razorpay.com/docs/payments/payments/test-card-details/).

## Not built

One payment covering several farmers (see `CART.md`: each farmer is checked out and paid separately), GST/invoice generation, partial refunds, saved cards, and settlement reconciliation reports. Delivery charges are not collected online (arranged with the farmer; shown as ₹0 online).
