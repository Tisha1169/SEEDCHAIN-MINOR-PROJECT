/**
 * A stand-in for api.razorpay.com for LOCAL runs only (no real keys, no real money). Fake credentials:
 *   RAZORPAY_KEY_ID=rzp_test_localmock  RAZORPAY_KEY_SECRET=local-mock-secret  RAZORPAY_API_BASE=http://localhost:9099
 * It implements just Orders, Payments fetch and Refunds. Payment ids of the form pay_SIM_<orderSuffix> are treated as captured
 * for the matching order, which is how scripts/e2e-smoke.mjs and the simulated Checkout window "pay".
 * It does NOT replace Razorpay's hosted checkout window; test that with real Razorpay test keys.
 */
import http from "node:http";
const KEY = "rzp_test_localmock", SECRET = "local-mock-secret";
const orders = new Map(); let n = 0, rf = 0;
const send = (res, s, b) => { res.writeHead(s, { "content-type": "application/json" }); res.end(JSON.stringify(b)); };
http.createServer((req, res) => {
  let body = ""; req.on("data", (c) => (body += c));
  req.on("end", () => {
    const want = "Basic " + Buffer.from(`${KEY}:${SECRET}`).toString("base64");
    if (req.headers.authorization !== want) return send(res, 401, { error: { code: "BAD_REQUEST_ERROR", description: "Authentication failed" } });
    const u = req.url;
    if (u === "/v1/orders" && req.method === "POST") { const b = JSON.parse(body); const id = `order_MOCK${String(++n).padStart(6, "0")}`; orders.set(id, { id, amount: b.amount, currency: b.currency, receipt: b.receipt, status: "created" }); return send(res, 200, orders.get(id)); }
    let m = u.match(/^\/v1\/payments\/(pay_SIM_([A-Za-z0-9]+))$/);
    if (m && req.method === "GET") { const o = orders.get(`order_${m[2]}`); return o ? send(res, 200, { id: m[1], order_id: o.id, amount: o.amount, currency: "INR", status: "captured", method: "upi" }) : send(res, 404, { error: { description: "not found" } }); }
    m = u.match(/^\/v1\/payments\/([^/]+)\/refund$/);
    if (m && req.method === "POST") { const b = JSON.parse(body); return send(res, 200, { id: `rfnd_MOCK${++rf}`, payment_id: m[1], amount: b.amount, status: "processed" }); }
    send(res, 404, {});
  });
}).listen(9099, () => console.log("mock razorpay on 9099"));
