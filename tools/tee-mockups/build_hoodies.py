"""Build BH hoodie mockups the same way as the tees: recolour the black studio hoodie (front and back photos already in
public/catalog/hoodies) and place the owner's original print files at their real size.

Usage: python3 -I build_hoodies.py <repo-root> <print-files-folder> <output-folder> [design ...]
These are digital mockups (composites), not photographs of finished hoodies.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).parent))
from build import DESIGNS, PX_PER_CM, SCALE, blur_fill, fill_holes, gblur, place, recolour  # noqa: E402

# Hoodie colours (name: hex, which print version: dark garments use the "black-shirt" artwork).
COLOURS = {"White": ("#f1efea", "light"), "Black": ("#1c1c1c", "dark"), "Gray": ("#8f9190", "light")}
HOODIE_DESIGN = {"fallen-sword": "fallen-sword", "oni-sword": "oni-blade", "oni-mask": "oni-mask", "rose": "rose"}

FRONT_PHOTO = "tools/tee-mockups/templates/hoodie-front.png"   # studio photo with an old chest print, removed below
BACK_PHOTO = "tools/tee-mockups/templates/hoodie-back.png"     # studio photo of a plain back
OLD_PRINT_BOX = (588, 714, 508, 628)                            # x0, x1, y0, y1 on the front photo
FRONT_CENTRE = (650, 567)                                       # left chest, where the old print sat
BACK_CENTRE = (512, 790)                                        # middle of the back, below the hood


def patch_print(shade, keep, box):
    """Seamless fill of the old chest print: Coons-patch light level plus fabric grain from just below."""
    x0, x1, y0, y1 = box
    low = gblur(shade, 4)
    T = low[y0, x0:x1]; B = low[y1 - 1, x0:x1]; L = low[y0:y1, x0]; R = low[y0:y1, x1 - 1]
    v = np.linspace(0, 1, y1 - y0)[:, None]; u = np.linspace(0, 1, x1 - x0)[None, :]
    patch = (1 - v) * T + v * B[None, :] + (1 - u) * L[:, None] + u * R[:, None] \
        - ((1 - u) * (1 - v) * T[0] + u * (1 - v) * T[-1] + (1 - u) * v * B[0] + u * v * B[-1])
    grain = (shade - low)[y0 + 140:y1 + 140, x0:x1]
    out = shade.copy(); out[y0:y1, x0:x1] = patch + np.clip(grain, -10, 10)
    return out


def prepare(path, print_box=None):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    lum = a.mean(2)
    neutral = (a[..., 0] - a[..., 2]) < 18
    garment = fill_holes((lum < 70) & neutral)
    # metal eyelets and aglets stay as photographed
    detail = garment & (lum > 95)
    shade = lum.copy()
    if print_box:
        shade = patch_print(shade, garment, print_box)
        x0, x1, y0, y1 = print_box
        detail[y0:y1, x0:x1] = False
    smooth = blur_fill(shade, garment, 2)
    shade = np.where(garment, 0.35 * shade + 0.65 * smooth, shade)
    # rebuild the wall just around the garment so recoloured edges have no dark rim
    grow = np.asarray(Image.fromarray((garment * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))) > 127
    for ch in range(3):
        a[..., ch] = np.where(grow & ~detail, blur_fill(a[..., ch], ~grow, 4), a[..., ch])
    garment = np.asarray(Image.fromarray((garment * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 127
    return a, garment & ~detail, shade


def main():
    root, designs, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    only = sys.argv[4:] or list(HOODIE_DESIGN)
    size = lambda arr: (round(arr.shape[1] * SCALE), round(arr.shape[0] * SCALE))
    views = {}
    for view, photo, box in (("front", FRONT_PHOTO, OLD_PRINT_BOX), ("back", BACK_PHOTO, None)):
        a, garment, shade = prepare(root / photo, box)
        a_big = np.asarray(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize(size(a), Image.LANCZOS)).astype(np.float32)
        g_big = np.asarray(Image.fromarray(garment.astype(np.float32), mode="F").resize(size(a), Image.BICUBIC)) > 0.5
        s_big = np.asarray(Image.fromarray(shade.astype(np.float32), mode="F").resize(size(a), Image.BICUBIC))
        views[view] = (a_big, g_big, s_big)
    for slug in only:
        design = DESIGNS[HOODIE_DESIGN[slug]]
        for colour, (hexcol, ink) in COLOURS.items():
            for view in ("front", "back"):
                img, ratio = recolour(*views[view], hexcol)
                art = designs / design[view][ink]
                if view == "front":
                    cw, ch = 10, 10; cx, cy = FRONT_CENTRE
                    place(img, ratio, art, (cw, ch), cx - cw * PX_PER_CM / 2, cy - ch * PX_PER_CM / 2)
                else:
                    cw, ch = design.get("back_canvas_cm", (30, 38))
                    bbox = Image.open(art).getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox()
                    mid_cm = (bbox[1] + bbox[3]) / 2 / Image.open(art).height * ch
                    place(img, ratio, art, (cw, ch), BACK_CENTRE[0] - cw * PX_PER_CM / 2, BACK_CENTRE[1] - mid_cm * PX_PER_CM)
                (out / slug).mkdir(parents=True, exist_ok=True)
                Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(out / slug / f"{colour.lower()}-{view}.jpg", quality=84, optimize=True, progressive=True)


if __name__ == "__main__":
    main()
