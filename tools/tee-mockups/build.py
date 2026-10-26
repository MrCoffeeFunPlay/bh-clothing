"""Build BH tee mockups: recolour the reference oversized tee and place the owner's original print files.

Usage: python3 -I build.py <reference.webp> <designs_dir> <out_dir> [tee ...]
These are digital mockups (composites), not photographs of physical products.
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

SCALE = 1.5           # reference is 1024x1536 -> output 1536x2304
PX_PER_CM = 9.7       # measured on the reference body width (~574 px ≈ 59 cm oversized body)

COLOURS = {  # name: (hex, ink) — ink "dark" = garment is dark, use the black-shirt artwork
    "White": ("#f1efea", "light"), "Black": ("#1c1c1c", "dark"), "Navy": ("#1f2940", "dark"),
    "Dark Gray": ("#4a4b4e", "dark"), "Beige": ("#d8c7ab", "light"), "Light Blue": ("#a8c4dc", "light"),
    "Camel": ("#b4865a", "light"),
}

DESIGNS = {
    "fallen-sword": {"front": {"dark": "fronts/fronts-10x10/fallen-sword-front-option2-black-shirt.png", "light": "fronts/fronts-10x10/fallen-sword-front-option2-white-shirt.png"},
                      # back print with the two side-text columns (layout from the owner's sample), 31.86 x 38.59 cm
                      "back": {"dark": "new/fallen-sword-back-with-side-text-black-shirt.png", "light": "new/fallen-sword-back-with-side-text-white-shirt.png"},
                      "back_canvas_cm": (31.86, 38.59)},
    "oni-blade": {"front": {"dark": "fronts/fronts-10x10/oni-blade-front.png", "light": "fronts/fronts-10x10/oni-blade-front.png"},
                   # dark garments: the same back with the small Japanese text in white
                   "back": {"dark": "new/oni-blade-back-white-text.png", "light": "backs/backs-30x38/oni-blade-back.png"}},
    "oni-mask": {"front": {"dark": "fronts/fronts-10x10/oni-mask-front-black-shirt.png", "light": "fronts/fronts-10x10/oni-mask-front-white-shirt.png"},
                  "back": {"dark": "backs/backs-30x38/oni-mask-back-black-shirt.png", "light": "backs/backs-30x38/oni-mask-back-white-shirt.png"}},
    "rose": {"front": {"dark": "fronts/fronts-10x10/rose-front-black-shirt.png", "light": "fronts/fronts-10x10/rose-front-white-shirt.png"},
              "back": {"dark": "backs/backs-30x38/rose-black-shirt.png", "light": "backs/backs-30x38/rose-white-shirt.png"}},
}

# Print placement on the reference (in reference pixels): canvas centre and canvas size in cm.
FRONT = {"centre": (629, 523), "canvas_cm": (10, 10)}          # left chest, matches the reference print
# Back prints sit in the middle of the back, like the owner's reference photos: the artwork's visual centre is placed
# at a fraction of the collar-to-hem height (per design, measured on the references), at its real printed size.
BACK = {"collar": 253, "hem": 1238, "centre_x": 511, "canvas_cm": (30, 38), "centre": 0.47}
BACK_CENTRE = {"fallen-sword": 0.46, "oni-blade": 0.43, "oni-mask": 0.47, "rose": 0.47}


def box(x, r, axis):
    c = np.cumsum(np.pad(x, [(r + 1, r) if i == axis else (0, 0) for i in range(2)], mode="edge"), axis=axis)
    hi = np.take(c, range(2 * r + 1, c.shape[axis]), axis=axis); lo = np.take(c, range(0, c.shape[axis] - 2 * r - 1), axis=axis)
    return (hi - lo) / (2 * r + 1)


def gblur(x, radius):
    r = max(1, int(radius))
    for _ in range(3):
        x = box(box(x, r, 0), r, 1)
    return x


def blur_fill(values, keep, radius):
    """Fill pixels where keep is False with a smooth estimate from the kept surroundings."""
    v = gblur((values * keep).astype(np.float64), radius)
    w = gblur(keep.astype(np.float64), radius)
    est = v / np.maximum(w, 1e-6)
    return np.where(keep, values, est)


def laplace_patch(lum, keep, box):
    """Seamless fill of a rectangle: Coons-patch light level from its border plus borrowed fabric grain."""
    x0, x1, y0, y1 = box
    low = gblur(lum, 4)
    T = low[y0, x0:x1]; B = low[y1 - 1, x0:x1]; Lf = low[y0:y1, x0]; R = low[y0:y1, x1 - 1]
    h, w = y1 - y0, x1 - x0
    v = np.linspace(0, 1, h)[:, None]; u = np.linspace(0, 1, w)[None, :]
    patch = (1 - v) * T[None, :] + v * B[None, :] + (1 - u) * Lf[:, None] + u * R[:, None] \
        - ((1 - u) * (1 - v) * T[0] + u * (1 - v) * T[-1] + (1 - u) * v * B[0] + u * v * B[-1])
    grain = (lum - low)[y0:y1, x0 - 170:x1 - 170]
    out = lum.copy(); out[y0:y1, x0:x1] = patch + np.clip(grain, -12, 12)
    return out


def fill_holes(mask):
    im = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8))
    im = Image.fromarray(np.pad(np.asarray(im), 1)).copy()
    from PIL import ImageDraw
    ImageDraw.floodfill(im, (0, 0), 128)
    return np.asarray(im)[1:-1, 1:-1] != 128


def prepare(reference):
    ref = Image.open(reference).convert("RGB")
    a = np.asarray(ref).astype(np.float32)
    lum = a.mean(2)
    neutral = (a[..., 0] - a[..., 2]) < 18           # the tee is neutral grey-black; the wall and its shadow are warm
    tee = (lum < 95) & neutral
    m = Image.fromarray((tee * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    tee = fill_holes(np.asarray(m) > 127)
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    # remove the reference chest print (it is not BH artwork) from the shading
    print_box = (xx > 570) & (xx < 690) & (yy > 472) & (yy < 575)
    keep = tee & ~print_box & (lum < 95) & neutral
    fill = blur_fill(lum, keep, 30) + np.roll(lum - gblur(lum, 3), -200, axis=0)
    shade = np.where(tee & ~keep, fill, lum)
    shade = np.where((xx >= 562) & (xx < 698) & (yy >= 466) & (yy < 582), laplace_patch(lum, keep, (562, 698, 466, 582)), shade)
    shade = np.where(tee, shade, lum)
    # soften the fabric grain so that light colours do not look noisy, keep the folds
    smooth = blur_fill(shade, tee, 2)
    shade = np.where(tee, 0.35 * shade + 0.65 * smooth, shade)
    # rebuild the wall just outside the tee edge so recoloured edges do not keep a dark rim
    grow = np.asarray(Image.fromarray((tee * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))) > 127
    wall = ~grow
    for ch in range(3):
        a[..., ch] = np.where(grow, blur_fill(a[..., ch], wall, 4), a[..., ch])
    tee = np.asarray(Image.fromarray((tee * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 127
    ref = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return ref, a, tee, shade, xx, yy


def back_shading(shade, tee, xx, yy):
    """Turn the front neckline into a plain back: keep the back collar band along the top edge, and rebuild the
    fabric below it (where the front view shows the neck opening and front collar) from the surrounding fabric."""
    s = shade.copy()
    X0, X1, YB = 360, 690, 470                                  # area to rebuild (reference px)
    top = np.full(tee.shape[1], -1.0)
    for x in range(X0, X1):
        col = np.where(tee[:, x])[0]
        if col.size: top[x] = col[0]
    xs = np.arange(X0, X1)
    top[xs] = np.convolve(np.pad(top[xs], 12, mode="edge"), np.ones(25) / 25, mode="same")[12:-12]
    BAND = 17
    below = np.zeros_like(tee)
    for x in range(X0, X1):
        below[int(round(top[x])) + BAND:YB, x] = True
    below &= tee
    # smooth light level: a Coons patch from fabric-only values on the left, right and bottom edges of the area,
    # following the curved collar line at the top (top edge interpolated between the two sides)
    low = blur_fill(gblur(s, 3), tee & ~below, 20)
    ytop = top + BAND
    yl, yr = ytop[X0], ytop[X1 - 1]
    smooth = s.copy()
    for x in range(X0, X1):
        u = (x - X0) / (X1 - 1 - X0)
        ys = np.arange(int(round(ytop[x])), YB)
        v = (ys - ytop[x]) / (YB - 1 - ytop[x])
        Lv = low[np.clip(np.round(yl + v * (YB - 1 - yl)).astype(int), 0, None), X0]
        Rv = low[np.clip(np.round(yr + v * (YB - 1 - yr)).astype(int), 0, None), X1 - 1]
        T0, T1 = low[int(round(yl)), X0], low[int(round(yr)), X1 - 1]
        Bx, B0, B1 = low[YB - 1, x], low[YB - 1, X0], low[YB - 1, X1 - 1]
        Tx = (1 - u) * T0 + u * T1
        smooth[ys, x] = (1 - v) * Tx + v * Bx + (1 - u) * Lv + u * Rv \
            - ((1 - u) * (1 - v) * T0 + u * (1 - v) * T1 + (1 - u) * v * B0 + u * v * B1)
    grain = np.roll(s - gblur(s, 3), -330, axis=0)            # plain fabric grain from lower on the body
    rebuilt = smooth + np.clip(grain, -10, 10)
    # soft edges at the sides and bottom of the rebuilt area so it blends into the fabric
    fx = np.clip(np.minimum(xx - X0, X1 - 1 - xx) / 25.0, 0, 1)
    fy = np.clip((YB - 1 - yy) / 25.0, 0, 1)
    w = below * fx * fy
    s = s * (1 - w) + rebuilt * w
    # back collar seam just under the band
    for x in range(X0 + 20, X1 - 20):
        t = int(round(top[x])) + BAND
        s[t:t + 2, x] = s[t:t + 2, x] * 0.85
    return s


def recolour(a, tee, shade, hexcol):
    c = np.array([int(hexcol[i:i + 2], 16) for i in (1, 3, 5)], np.float32)
    lumc = c.mean()
    med = np.median(shade[tee])
    g = 1.0 - 0.68 * (lumc / 255.0)
    ratio = np.clip(shade / med, 0.05, 4.0) ** g
    out = np.clip(c[None, None, :] * ratio[..., None], 0, 255)
    alpha = gblur(tee.astype(np.float64), 1)[..., None]
    return a * (1 - alpha) + out * alpha, ratio


def place(canvas, ratio, art_path, box_cm, left_px, top_px):
    art = Image.open(art_path).convert("RGBA")
    w = round(box_cm[0] * PX_PER_CM * SCALE); h = round(box_cm[1] * PX_PER_CM * SCALE)
    art = art.resize((w, h), Image.LANCZOS)
    x0, y0 = round(left_px * SCALE), round(top_px * SCALE)
    rgb = np.asarray(art).astype(np.float32)
    region = canvas[y0:y0 + h, x0:x0 + w]
    r = np.clip(ratio[y0:y0 + h, x0:x0 + w], 0.0, 3.0) ** 0.35
    r = np.clip(r, 0.82, 1.08)[..., None]
    ink = rgb[..., :3] * r
    al = rgb[..., 3:4] / 255 * 0.97
    canvas[y0:y0 + h, x0:x0 + w] = region * (1 - al) + ink * al


def main():
    reference, designs, out = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
    only = sys.argv[4:] or list(DESIGNS)
    ref, a, tee, shade, xx, yy = prepare(reference)
    big = lambda arr: np.asarray(Image.fromarray(arr.astype(np.float32), mode="F").resize((round(a.shape[1] * SCALE), round(a.shape[0] * SCALE)), Image.BICUBIC))
    a_big = np.asarray(ref.resize((round(a.shape[1] * SCALE), round(a.shape[0] * SCALE)), Image.LANCZOS)).astype(np.float32)
    tee_big = big(tee.astype(np.float32)) > 0.5
    shades = {"front": big(shade), "back": big(back_shading(shade, tee, xx, yy))}
    manifest = []
    for slug in only:
        for colour, (hexcol, ink) in COLOURS.items():
            for view in ("front", "back"):
                img, ratio = recolour(a_big, tee_big, shades[view], hexcol)
                art = designs / DESIGNS[slug][view][ink]
                if view == "front":
                    cw, ch = FRONT["canvas_cm"]; cx, cy = FRONT["centre"]
                    place(img, ratio, art, (cw, ch), cx - cw * PX_PER_CM / 2, cy - ch * PX_PER_CM / 2)
                else:
                    cw, ch = DESIGNS[slug].get("back_canvas_cm", BACK["canvas_cm"])
                    bbox = Image.open(art).getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox()
                    art_h = Image.open(art).height
                    art_mid_cm = (bbox[1] + bbox[3]) / 2 / art_h * ch          # visual centre of the artwork inside its canvas
                    target = BACK["collar"] + BACK_CENTRE.get(slug, BACK["centre"]) * (BACK["hem"] - BACK["collar"])
                    place(img, ratio, art, (cw, ch), BACK["centre_x"] - cw * PX_PER_CM / 2, target - art_mid_cm * PX_PER_CM)
                name = f"{colour.lower().replace(' ', '-')}-{view}.jpg"
                (out / slug).mkdir(parents=True, exist_ok=True)
                Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(out / slug / name, quality=84, optimize=True, progressive=True)
                manifest.append({"tee": slug, "colour": colour, "view": view, "artwork": str(DESIGNS[slug][view][ink]), "file": f"{slug}/{name}"})
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1))


if __name__ == "__main__":
    main()
