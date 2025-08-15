### Frontend Billing Integration Guide

This guide explains the UI/UX updates and API calls needed to support per‑user balances, free minutes, and number billing.

### Pricing and Rules

- Calls: $0.02/min (rounded up). First 200 minutes each calendar month are free.
- Numbers: $2/month per number. New users get one free number on their first purchase.
- Enforcement: When free minutes are 0, users must keep a minimum $5 balance to make calls or buy additional numbers.

### New/Updated API Endpoints

- GET `/api/billing/me`
  - Returns `{ balance, freeMinutesRemaining, hasClaimedFreeNumber, pricing }`.
  - Use to render current balance, remaining free minutes, and show/hide free number CTA.

- POST `/stripe/top-up`
  - Body: `{ amount: number }` (USD). Minimum 5.
  - Returns Checkout `url` for one-time top-up. Redirect the browser to complete payment.

- POST `/stripe/top-up-product`
  - Body: `{ priceId: string }` (Stripe Price ID). Use for fixed top-ups (e.g., $5 or $10).
  - Returns Checkout `url`. Redirect to complete payment.

- POST `/api/twilio/buy-number`
  - Body: `{ phoneNumber?: string, areaCode?: string, country?: 'US' }`.
  - Server grants first number free automatically (if eligible). Otherwise, requires min $5 balance and charges $2 immediately.
  - On insufficient funds returns HTTP 402 with a message and `minRequired`.

- GET `/api/twilio/access-token`
  - Requires the user to have at least one active number.
  - If free minutes are 0 and balance < $5, returns HTTP 402. Frontend should prompt to top up.

### UI/UX Changes

- Balance and allowance display
  - Show `balance` and `freeMinutesRemaining` prominently (e.g., header or billing page).
  - Show a badge if `hasClaimedFreeNumber` is false (CTA: “Claim your free number”).

- Top-up entry points
  - “Add funds” button opens a choice: fixed top-ups ($5/$10 via products) or custom amount (>= $5).
  - Call `POST /stripe/top-up-product` with `priceId` for $5/$10, or `POST /stripe/top-up` with `{ amount }`.
  - Redirect to the returned `url`. On success, route user back to app and refresh `/api/billing/me`.

- Purchase number flow
  - If `hasClaimedFreeNumber` is false, label buy action as “Get free number” (still call `/api/twilio/buy-number`; backend handles free grant).
  - If not eligible and `freeMinutesRemaining` is 0 and `balance` < 5, disable purchase and show “Minimum $5 balance required.”
  - Handle HTTP 402 responses and surface the `minRequired` and `price` from the response.

- Calling flow (Browser SDK)
  - Before requesting access token, optionally pre-check `/api/billing/me`.
  - If `freeMinutesRemaining` is 0 and `balance` < 5, disable “Call” and prompt top-up.
  - If you still request `/api/twilio/access-token` and get HTTP 402, show the top-up prompt and retry after success.

### Error Handling Patterns

- HTTP 402 from Twilio endpoints
  - JSON: `{ error, details, minRequired? }`
  - Show a non-blocking alert with a “Top up now” CTA.

- Post-top-up UX
  - After Stripe success redirect, refresh `/api/billing/me` to show updated balance.

### Example Frontend Calls

```ts
// Fetch billing state
const res = await fetch('/api/billing/me', { headers: { Authorization: `Bearer ${token}` }});
const billing = await res.json();

// Start a fixed top-up ($5 or $10)
const startTopUp = async (priceId: string) => {
  const r = await fetch('/stripe/top-up-product', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ priceId }),
  });
  const { url } = await r.json();
  window.location.href = url; // redirect to Checkout
};

// Buy a number (backend auto-applies free entitlement if eligible)
const buyNumber = async (params: { phoneNumber?: string; areaCode?: string; country?: string }) => {
  const r = await fetch('/api/twilio/buy-number', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(params),
  });
  if (r.status === 402) {
    const err = await r.json();
    // Show top-up prompt using err.minRequired
    return;
  }
  const data = await r.json();
  // Show success and refresh numbers
};
```

### Database Setup (Required)

1) Apply the migration `supabase/migrations/20250815000008_billing.sql` to add new columns:
   - `users`: `balance DECIMAL(10,2)`, `free_minutes_remaining INT`, `free_minutes_last_reset DATETIME`, `has_claimed_free_number TINYINT(1)`
   - `twilio_call_logs`: `is_billed TINYINT(1)`, `billed_minutes INT`, `billed_amount DECIMAL(10,2)`
   - `user_phone_numbers`: `is_free TINYINT(1)`, `next_renewal_at DATETIME`

2) Optional backfill (for existing data):
   - Set `users.balance` to `0.00` where NULL.
   - Set `users.free_minutes_remaining` to `200` if you want to grant the initial allowance immediately.
   - If users already own numbers, consider setting `has_claimed_free_number = 1`.

### Stripe Setup (Required)

- Environment:
  - `STRIPE_SECRET_KEY` = your secret key
  - `STRIPE_WEBHOOK_SECRET` = webhook signing secret for `/stripe/webhook`
  - `SERVER_URL` = public base URL for success/cancel and Twilio callbacks

- Webhook:
  - Configure Stripe to send `checkout.session.completed` and `customer.subscription.deleted` to `POST {SERVER_URL}/stripe/webhook`.

- Products/Prices for fixed top-ups:
  - Create two one‑time prices (mode=payment): `$5` and `$10`.
  - Capture the Price IDs (e.g., `price_5USD`, `price_10USD`).
  - Frontend passes the chosen `priceId` to `POST /stripe/top-up-product`.

### Testing Checklist

- Verify `/api/billing/me` returns expected fields.
- Attempt to buy first number with zero balance: should succeed as free.
- Attempt to buy second number with balance < $5 and no free minutes: should be blocked with 402.
- Complete a fixed $5 top-up; ensure balance increases by $5 after webhook.
- Make a call longer than 0s; on completion, verify free minutes are consumed first, then balance is deducted at $0.02/min (rounded up).


