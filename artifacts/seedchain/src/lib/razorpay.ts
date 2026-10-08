/**
 * Loads Razorpay Standard Checkout on demand. The only values handed to it come from our server
 * (order id, amount, public key id); the secret never reaches the browser.
 */
export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
export interface RazorpayFailure {
  error?: { code?: string; description?: string; reason?: string };
}
interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", cb: (r: RazorpayFailure) => void): void;
}
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void; confirm_close?: boolean };
  handler: (r: RazorpaySuccess) => void;
}
declare global {
  interface Window {
    Razorpay?: new (opts: RazorpayOptions) => RazorpayInstance;
  }
}

const SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loading: Promise<void> | null = null;

export function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null; // allow a retry
      reject(new Error("Could not load the payment window. Check your connection."));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export interface OpenCheckoutArgs {
  keyId: string;
  amountPaise: number;
  currency: string;
  razorpayOrderId: string;
  merchantName: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  onSuccess: (r: RazorpaySuccess) => void;
  onFailure: (r: RazorpayFailure) => void;
  onDismiss: () => void;
}

export async function openRazorpayCheckout(a: OpenCheckoutArgs): Promise<void> {
  await loadRazorpay();
  if (!window.Razorpay) throw new Error("The payment window is unavailable.");
  const rzp = new window.Razorpay({
    key: a.keyId,
    amount: a.amountPaise,
    currency: a.currency,
    name: a.merchantName,
    description: a.description,
    order_id: a.razorpayOrderId,
    prefill: a.prefill,
    theme: { color: "#2f6b45" },
    modal: { ondismiss: a.onDismiss, confirm_close: true },
    handler: a.onSuccess,
  });
  rzp.on("payment.failed", a.onFailure);
  rzp.open();
}
