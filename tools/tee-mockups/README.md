# Tee product mockups

`build.py` creates the tee images in `public/catalog/tees/<design>/<colour>-front.jpg` and `-back.jpg`.
They are **digital mockups** (the owner's print files placed on a recoloured reference tee), not photos of finished garments.

```bash
python3 -I tools/tee-mockups/build.py <reference-tee.webp> <print-files-folder> <output-folder> [design ...]
```

- `<print-files-folder>` holds the owner's print files (`fronts/fronts-10x10/…`, `backs/backs-30x38/…`); they are not stored in this repository.
- Front prints are placed as a 10×10 cm left-chest canvas, back prints as a 30×38 cm canvas centred ~9 cm below the collar.
- Dark garments use the "black-shirt" print versions, light garments the "white-shirt" versions.
- To add a colour: add it to `COLOURS` here, then to `teeColourHexes` and `teeColoursByWeight` in `src/catalog.ts`, and copy the new images into `public/catalog/tees/`.
