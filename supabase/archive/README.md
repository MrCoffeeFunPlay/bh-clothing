# Archived migrations (not applied)

These two files are the original drafts. They were never run against the BH Supabase project and must not be run now:

- they store one price in one currency per product/variant, with no ILS + USD pricing, no prices per fabric weight and no colours per fabric weight;
- they also create orders, payments, coupons, points and customer tables, which are not part of the current phase;
- `staff` users could change user roles, including their own.

The live catalogue now comes from `supabase/migrations/20261027090000_catalog_and_admin.sql` and `20261027090100_seed_catalog.sql`.
Orders, payments, stock and customer accounts will get their own reviewed migrations in a later phase.
