# BH Clothing

A frontend-only ecommerce storefront starter for BH Clothing, built with React, TypeScript, and Vite.

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open the local preview at `http://localhost:5000`.

## Available scripts

- `npm run dev` — start Vite in development mode on port 5000
- `npm run build` — type-check and build the production bundle
- `npm run preview` — preview the production build on port 5000

## Included in this starter

- Mobile-first responsive storefront homepage
- BH Clothing header with navigation, search, account, and cart controls
- Hero, New Drop product grid, category browser, BH Club, brand story, newsletter, and footer sections
- Mock product data and placeholder image assets
- Working mobile navigation, product filtering, product search, bag count, smooth section links, and newsletter confirmation state

The storefront now uses the original BH product images committed in `public/catalog`. Prices and inventory remain unpublished until the owner confirms them, so these items cannot yet be purchased.

The Supabase schema is prepared in `supabase/migrations/20260904_create_bh_catalog.sql`. Payments, authentication, checkout, shipping, and real customer accounts are not connected yet.
