-- BH Clothing: Loose Shorts photos on a studio wall like the tees (cooler stone shade), replacing the white-background
-- photos. Run only after the site with the new images (public/catalog/Pants/loose-shorts/*.jpg) is published.
update public.product_colours
set front_image = '/catalog/Pants/loose-shorts/' || lower(name) || '.jpg'
where product_id = 5 and name in ('Black', 'Blue', 'Gray', 'Khaki', 'Mint', 'Pink', 'Red', 'White', 'Yellow');

update public.categories
set image_path = '/catalog/Pants/loose-shorts/black.jpg'
where slug = 'shorts' and image_path like '%loose%shorts%';
