import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config";
import { logger } from "../lib/logger";
import { HttpError } from "../lib/errors";

/**
 * Minimal Razorpay REST client (Orders, Payments fetch, Refunds) plus the two signature checks.
 * Reference: Razorpay Standard Checkout "Build Integration" and "Validate webhooks" docs.
 *  - Payment signature: HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret), hex.
 *  - Webhook signature: HMAC_SHA256(raw request body, webhook_secret), hex, header X-Razorpay-Signature.
 * The key secret is read only here, on the server, and is never logged or returned.
 */

function hmacHex(message: string | Buffer, secret: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** orderId must be the Razorpay order id stored on our server, never the value the browser sent. */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string, secret = config.payments.keySecret): boolean {
  if (!secret || !orderId || !paymentId || !signature) return false;
  return safeEqualHex(hmacHex(`${orderId}|${paymentId}`, secret), signature);
}

/** rawBody must be the exact bytes received; never a re-serialised object. */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined, secret = config.payments.webhookSecret): boolean {
  if (!secret || !signature) return false;
  return safeEqualHex(hmacHex(rawBody, secret), signature);
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string | null;
}
export interface RazorpayPayment {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string; // created | authorized | captured | refunded | failed
  method?: string | null;
  error_code?: string | null;
  error_description?: string | null;
}
export interface RazorpayRefund {
  id: string;
  payment_id: string;
  amount: number;
  status: string; // pending | processed | failed
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  if (!config.payments.enabled) throw new HttpError(503, "Online payments are not configured", "PAYMENTS_DISABLED");
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15_000);
  try {
    const res = await fetch(`${config.payments.apiBase}${path}`, {
      method,
      signal: ctl.signal,
      headers: {
        authorization: `Basic ${Buffer.from(`${config.payments.keyId}:${config.payments.keySecret}`).toString("base64")}`,
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json: { error?: { code?: string; description?: string } } & Record<string, unknown> = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      /* non-JSON error page */
    }
    if (!res.ok) {
      // Log the gateway's own error code/description only; never the request headers or keys.
      logger.warn({ path, status: res.status, code: json.error?.code, description: json.error?.description }, "Razorpay API error");
      throw new HttpError(502, "The payment gateway could not process the request. Please try again.", "GATEWAY_ERROR");
    }
    return json as T;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    logger.warn({ path, err: (err as Error).name === "AbortError" ? "timeout" : (err as Error).message }, "Razorpay API unreachable");
    throw new HttpError(502, "The payment gateway is unreachable. Please try again.", "GATEWAY_UNREACHABLE");
  } finally {
    clearTimeout(timer);
  }
}

export const razorpay = {
  createOrder: (p: { amountPaise: number; receipt: string; notes: Record<string, string> }) =>
    call<RazorpayOrder>("POST", "/v1/orders", { amount: p.amountPaise, currency: "INR", receipt: p.receipt.slice(0, 40), notes: p.notes }),
  fetchPayment: (paymentId: string) => call<RazorpayPayment>("GET", `/v1/payments/${encodeURIComponent(paymentId)}`),
  refund: (paymentId: string, amountPaise: number, notes: Record<string, string>) =>
    call<RazorpayRefund>("POST", `/v1/payments/${encodeURIComponent(paymentId)}/refund`, { amount: amountPaise, notes }),
};
