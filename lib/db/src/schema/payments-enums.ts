import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Payment lifecycle of an order, separate from its fulfilment status.
 * UNPAID = no online payment involved (pay-the-farmer-directly fallback, or orders before payments existed).
 */
export const orderPaymentStatusEnum = pgEnum("order_payment_status", [
  "UNPAID",
  "PAYMENT_PENDING",
  "PAYMENT_PROCESSING",
  "PAID",
  "PAYMENT_FAILED",
  "PAYMENT_CANCELLED",
  "REFUND_PENDING",
  "REFUNDED",
]);
