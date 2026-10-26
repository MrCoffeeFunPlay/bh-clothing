# Tee product mockups

`build.py` creates the tee images in `public/catalog/tees/<design>/<colour>-front.jpg` and `-back.jpg`.
They are **digital mockups** (the owner's print files placed on a recoloured reference tee), not photos of finished garments.

```bash
python3 -I tools/tee-mockups/build.py <reference-tee.webp> <print-files-folder> <output-folder> [design ...]
```

- `<print-files-folder>` holds the owner's print files (`fronts/fronts-10x10/…`, `backs/backs-30x38/…`); they are not stored in this repository.
- Front prints are placed as a 10×10 cm left-chest canvas. Back prints keep their real size (30×38 cm) and sit in the middle of the back, like the owner's reference photos (`BACK_CENTRE`).
- Dark garments use the "black-shirt" print versions, light garments the "white-shirt" versions.
- To add a colour: add it to `COLOURS` here, then to `teeColourHexes` and `teeColoursByWeight` in `src/catalog.ts`, and copy the new images into `public/catalog/tees/`.
- `new/` holds print files prepared from the owner's files: the Fallen Sword back with both side-text columns, and the Oni Blade back with white Japanese text for dark garments.
