# BH Clothing: connecting the real store

The interface can run in **local mode** while the database is being connected.
Nothing in the browser is allowed to write an order, receipt or payment record
without a verified server-side payment event.

## 1. Connect Supabase

1. In the BH Supabase project, open **SQL Editor**.
2. Run `supabase/migrations/20260904_create_bh_catalog.sql` once.
3. Run `supabase/migrations/20260906_bh_storefront_core.sql` once.
4. In **Authentication**, create/sign in to the owner account, then run the
   `update public.user_roles ...` statement printed in the second migration,
   using that account's UUID. This unlocks the owner-only dashboard data.
5. In Replit **Secrets**, add only these public browser values:

   ```text
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```

   Never put a Supabase `service_role` key in Replit client code.

## 2. Set the storefront controls

Open **Account → Admin demo** in the site. The new owner panel groups catalog,
site contact details, points, coupons, future orders/receipts and FAQ/assistant
knowledge. Until the environment values above are present, its controls are
stored locally so they can be previewed safely.

The database rules enforce:

- a personal 10% welcome coupon when a user registers;
- one coupon per order, so promotions cannot stack;
- owner/staff-only changes to products, prices, settings and coupons;
- customers can only read their own profile, points, orders and receipts.

## 3. Payment and receipts

Choose a provider only after confirming the legal business country, supported
currencies and required checkout methods. The provider secret key and webhook
must run in a server function, never in Vite/React. The webhook should:

1. verify the provider signature;
2. create/update the order and payment event;
3. decrement inventory;
4. issue the receipt record and send the receipt email;
5. award BH Points only after payment is confirmed.

## 4. Shipping

Create shipping zones and rates in the owner panel/database for Israel, Europe,
North America and Asia only after confirming the carrier account and the actual
countries it accepts. Checkout should calculate the rate from the delivery
country/zone; do not promise delivery by straight-line distance.

## 5. Languages

The base locale is English. The language toggle persists the visitor's choice
and switches the document direction for Hebrew. The database already stores a
preferred locale and bilingual FAQ fields; add final Hebrew product copy before
showing a full Hebrew storefront to customers.
