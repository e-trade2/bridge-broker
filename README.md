# Bridge Broker — Project Structure

```
bridge-broker/
├── index.html              ← Main homepage
├── listings.html           ← All listings page
├── admin.html              ← Admin panel
├── seller-dashboard.html   ← Seller portal
│
├── css/
│   └── style.css           ← All styles (includes v2 chat additions)
│
├── js/
│   ├── main.js             ← App entry point (i18n, modals, search, auth)
│   ├── delala-ai.js        ← ✅ Improved AI chat (v2)
│   └── supabase.js         ← Supabase client + all DB helpers
│
└── api/
    ├── chat.js             ← ✅ Vercel serverless proxy (v2, deploy to GitHub)
    ├── payment-init.js     ← Chapa checkout for "Featured Listing" fees
    ├── payment-webhook.js  ← Confirms featured-listing payments
    ├── payment-status.js   ← Poll a featured-listing payment's status
    ├── expire-featured.js  ← Cron: un-features expired listings
    ├── escrow-init.js      ← Admin-only: create an OPTIONAL escrow link
    ├── escrow-webhook.js   ← Confirms escrow funds were paid in (→ 'held')
    ├── escrow-action.js    ← Admin-only: release / refund / dispute escrow
    └── package.json        ← Required by Vercel
```

## ⚠️ SQL Migration Order

Run these scripts in order in Supabase Dashboard → SQL Editor:

1. `sql/setup_listings_base.sql`
2. `sql/setup_admin_security.sql`
3. `sql/setup_seller_verification.sql`
4. `sql/setup_payments.sql`
5. `sql/setup_escrow.sql`
6. `sql/setup_commission.sql`
7. `sql/setup_seller_bank_details.sql`
8. `sql/setup_broker_telegram.sql`
9. `sql/setup_admin_settings.sql`
10. `sql/setup_view_counter.sql`
11. `sql/setup_require_auth_for_listings.sql`
12. **`sql/setup_fixes.sql`** ← Security & atomicity fixes (run last)

All scripts are idempotent (`IF NOT EXISTS`, `OR REPLACE`) — safe to re-run.

## Security Fixes (setup_fixes.sql)

`setup_fixes.sql` addresses three issues:

**1. Atomic featured-listing payment** — The previous code wrote to
`payments` and then `listings` as two separate calls. A crash between
them left a payment marked `completed` but the listing never featured.
Now a single `mark_featured_payment_complete()` DB function wraps both
writes in one transaction. Called by `api/_chapa-apply.js`.

**2. Escrow release race condition** — Two admin sessions clicking
"Release" simultaneously could both pass the `status='held'` check
before either wrote the new status, potentially triggering two Chapa
transfers for the same escrow. A new `release_escrow()` DB function
uses `SELECT … FOR UPDATE` to lock the row and returns `'conflict'`
(HTTP 409) to the losing session. Called by `api/escrow-action.js`.

**3. Listing photo namespace** — Photos are now stored as
`{user_id}/{timestamp}_{name}.jpg` instead of flat filenames. This
allows per-seller RLS policies on the storage bucket so sellers can
only delete their own photos (matching the pattern used by the
`verification-docs` bucket). Existing flat-path photos remain
accessible via the "Anyone can view listing photos" SELECT policy.


## Transaction Safety — Hybrid Escrow Model

Bridge Broker does **not** force every sale through escrow. Most vehicle
sales still happen the normal way: the broker (admin) arranges an
in-person cash/transfer handoff, same as before. There is no money held
by the platform unless someone specifically asks for protection.

When a buyer *does* want protection, the **admin** (acting as broker)
creates an escrow link for that specific listing from Admin Panel →
Escrow:

1. Admin enters the listing id, agreed price, and buyer's name/phone —
   the buyer does **not** need an account.
2. `api/escrow-init.js` creates a `pending` row in `escrow_transactions`
   and returns a Chapa checkout URL. Admin sends that link to the buyer.
3. Buyer pays the full vehicle price on Chapa's hosted page. Chapa's
   signed webhook hits `api/escrow-webhook.js`, which re-verifies the
   payment and marks the row `held`.
4. Buyer and seller complete the physical handoff (vehicle + papers).
5. Admin calls `api/escrow-action.js` with `release` (pays out
   to the seller, manually for now — automatic Chapa Transfers payout
   is a future enhancement) or `refund` if something went wrong, or
   `dispute` to flag a problem for review before deciding.

Run `sql/setup_escrow.sql` (after `setup_admin_security.sql` and
`setup_payments.sql`) to set this up. See the comments in that file and
in each `api/escrow-*.js` file for full details.


## Delala AI — What's New in v2

- ✅ **Persistent chat** — conversations saved to `localStorage`, restored on page reload
- ✅ **Clear chat button** — 🗑 icon in chat header wipes history
- ✅ **Animated typing dots** — replaces plain `...`
- ✅ **Deep-link buttons** — AI replies auto-generate "View Toyota Vitz →" links
- ✅ **XSS-safe rendering** — all text via `textContent`, not `innerHTML`
- ✅ **Dynamic listings** — `fetchListings()` ready to plug into Supabase

## Vercel Proxy — What's New in v2

- ✅ **CORS hardening** — set `ALLOWED_ORIGIN` env var to your real domain
- ✅ **Payload guard** — rejects conversations > 40 turns

## Deploy Checklist

### Website (GitHub Pages / Netlify / Vercel)
1. Upload all files keeping this folder structure
2. Make sure `<script src="js/main.js">` paths match

### Vercel Proxy (api/chat.js)
1. Create a separate repo with just the `api/` folder
2. Run `vercel deploy` from that folder
3. Set environment variables in Vercel dashboard:
   - `GROQ_API_KEY` = your Groq API key
   - `CHAPA_SECRET_KEY` = your Chapa live/test secret key
   - `CHAPA_WEBHOOK_SECRET` = webhook secret from Chapa Dashboard → Settings → Webhooks
   - `ALLOWED_ORIGIN` = `https://www.bridge-broker.com`
   - `SUPABASE_URL` = `https://xrmbzycasbzdaolvtuop.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role key (Settings → API — keep this server-side only)
   - `SITE_URL` = `https://www.bridge-broker.com` (used in Chapa callback/return URLs and webhook routing)
   - `CRON_SECRET` = a long random secret you generate (used to protect the `/api/expire-featured` cron endpoint)
4. Paste the deployment URL into `js/delala-ai.js` as `PROXY_URL` **and** into `js/supabase.js` as `PAYMENT_API_BASE`

> **Cron timezone note:** `vercel.json` schedules `expire-featured` at `0 1 * * *` — that is **01:00 UTC**, which is **04:00 Addis Ababa time (EAT = UTC+3)**. Adjust the schedule if you want it to run at a specific local time.

### Supabase (js/supabase.js)
- Already configured with your project URL and key
- Enable the `listings` table and `listing-photos` storage bucket
- Add `increment_views` RPC function for view counting
