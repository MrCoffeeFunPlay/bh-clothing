-- Everything except the tees and Loose Shorts is "coming soon" for now.
-- Hoodies and the two anime pieces keep their real images (shown blurred behind the locked screen).
update public.products set coming_soon = true
where slug in ('fallen-sword-hoodie', 'oni-sword-hoodie', 'oni-mask-hoodie', 'rose-hoodie', 'oni-art-book', 'oni-wall-scroll');

-- The washed cap and crossbody bag are not real BH items: hidden from the store (kept, so the owner can bring them back).
update public.products set active = false
where slug in ('bh-washed-cap', 'bh-crossbody');
