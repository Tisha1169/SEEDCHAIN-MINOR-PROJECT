# Cart and checkout

Customers can **Add to cart** (collect lots from several farmers) or **Buy now** (straight to checkout for one lot).

## Behaviour

- The cart is stored in the database (`cart_items`), so it follows the customer across devices. The navbar shows a badge with the number of lots.
- Adding the same lot again adds to its quantity. A lot cannot be added if it is unlisted, recalled, sold out, its farmer is unavailable, or the total in the cart would exceed what is available. At most 30 different lots.
- **Nothing in the cart is trusted.** Every time it is shown, each line is re-read from the live lot: current price, live stock, recall/listing state. A line can carry issues (`SOLD_OUT`, `EXCEEDS_STOCK`, `NOT_LISTED`, `RECALLED`, `FARMER_UNAVAILABLE`) and a "price changed from X to Y" note (the price the customer last saw is kept for that). A farmer's group cannot be checked out while any of its lines has an issue.
- **One farmer at a time.** SeedChain is direct farmer-to-customer: each farmer fulfils and is paid separately, and there is no middleman holding a combined basket. The cart therefore groups lines by farmer with a subtotal and its own "Check out this farmer's items" button, plus a total of everything. A single order (and a single Razorpay payment) covers one farmer's lines.
- Checkout asks the server to **preview** the order (`POST /api/checkout/preview`): current prices, stock, and the one-farmer rule. The total shown is the server's. Starting payment holds the stock for 20 minutes; the cart is untouched until the lots are actually bought.
- Lines leave the cart when the order is **paid** (online payment) or **placed** (pay-the-farmer-directly mode), and only the bought lots leave. An abandoned or failed checkout leaves the cart as it was.

## API (customer only)

| | |
|---|---|
| `GET /api/cart` | lines re-priced, grouped by farmer, with totals and issues |
| `GET /api/cart/count` | for the badge |
| `POST /api/cart/items` `{lotId, quantity}` | add (accumulates) |
| `PATCH /api/cart/items/:lotId` `{quantity}` | set quantity |
| `DELETE /api/cart/items/:lotId` · `DELETE /api/cart` | remove one / empty |
| `POST /api/checkout/preview` `{items, fulfillmentMethod}` | server-priced preview (reserves nothing) |
| `POST /api/checkout` | start payment for a farmer's lines (see `PAYMENTS.md`) |

## Not built

One payment covering several farmers (it would mean one charge split between sellers, which needs a marketplace/route-style Razorpay account), saved addresses, wishlists, and reserving stock while an item merely sits in the cart.
