"""Silhouettes for BH "coming soon" products (shown locked and blurred in the store until real photos exist).

Usage: python3 -I build_silhouettes.py <repo-root> <tee-reference.webp> <output-folder>
Shapes come from existing BH photos where there is one (tee, hoodie, shorts, cap); pants and jewellery are drawn.
"""
import math
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).parent))
import build  # noqa: E402
import build_hoodies  # noqa: E402

W, H = 900, 1100


def to_png(shade, mask, out, stretch=True):
    """Grey shading inside the mask, transparent outside, centred on a W x H canvas."""
    ys, xs = np.where(mask)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    s = shade[y0:y1, x0:x1].astype(np.float32); m = mask[y0:y1, x0:x1]
    if stretch:
        lo, hi = np.percentile(s[m], 2), np.percentile(s[m], 98)
        grey = np.clip(70 + (s - lo) / max(hi - lo, 1) * 110, 40, 210).astype(np.uint8)
    else:
        grey = np.clip(s, 40, 210).astype(np.uint8)
    alpha = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1)))
    img = Image.merge("RGBA", [Image.fromarray(grey)] * 3 + [Image.fromarray(alpha)])
    k = min((W - 120) / img.width, (H - 120) / img.height)
    img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.alpha_composite(img, ((W - img.width) // 2, (H - img.height) // 2))
    canvas.save(out, optimize=True)


def textured(draw_shape, seams=()):
    """Draw a garment shape with soft vertical folds; seams are light lines."""
    mask = Image.new("L", (W, H), 0); draw_shape(ImageDraw.Draw(mask))
    m = np.asarray(mask) > 127
    xx = np.arange(W)[None, :]; yy = np.arange(H)[:, None]
    rng = np.random.default_rng(7)
    noise = np.asarray(Image.fromarray((rng.random((H // 40, W // 40)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32)
    folds = 118 + 0.05 * (noise - 128) + 6 * np.sin(xx / 53.0) * np.cos(yy / 210.0) - 18 * (np.abs(xx - W / 2) / (W / 2)) ** 2
    shade = Image.fromarray(np.clip(folds, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10))
    d = ImageDraw.Draw(shade)
    for line in seams: d.line(line, fill=140, width=3)
    return np.asarray(shade).astype(np.float32), m


def pants(kind):
    def shape(d):
        waist = [(250, 110), (650, 110), (655, 175), (245, 175)]
        d.polygon(waist, fill=255)
        if kind == "straight":
            d.polygon([(245, 170), (655, 170), (690, 1040), (480, 1040), (452, 360), (420, 1040), (210, 1040)], fill=255)
        elif kind == "cargo":
            d.polygon([(245, 170), (655, 170), (720, 1040), (490, 1040), (452, 380), (410, 1040), (180, 1040)], fill=255)
            for x0 in (175, 610): d.rounded_rectangle((x0, 520, x0 + 120, 700), 12, fill=255)
        elif kind == "jogger":
            d.polygon([(245, 170), (655, 170), (640, 960), (500, 960), (452, 360), (402, 960), (260, 960)], fill=255)
            d.rounded_rectangle((255, 955, 405, 1030), 16, fill=255); d.rounded_rectangle((497, 955, 645, 1030), 16, fill=255)
        else:  # wide
            d.polygon([(245, 170), (655, 170), (770, 1040), (480, 1040), (452, 380), (420, 1040), (130, 1040)], fill=255)
    seams = [((452, 175), (452, 360))]
    if kind == "cargo": seams += [((175, 560), (295, 560)), ((610, 560), (730, 560))]
    if kind == "jogger": seams += [((260, 955), (402, 955)), ((500, 955), (640, 955))]
    return textured(shape, seams + [((250, 172), (650, 172))])


def chain(path_points, link=34, out=None):
    """Cuban-style chain: overlapping rotated oval links along a path, metallic grey."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    pts = np.array(path_points, dtype=float)
    seg = np.r_[0, np.cumsum(np.hypot(*np.diff(pts, axis=0).T))]
    for i, t in enumerate(np.arange(0, seg[-1], link * 0.62)):
        k = min(np.searchsorted(seg, t), len(pts) - 1); k = max(k, 1)
        a, b = pts[k - 1], pts[k]; f = (t - seg[k - 1]) / max(seg[k] - seg[k - 1], 1e-6); c = a + (b - a) * f
        angle = math.degrees(math.atan2(*(b - a)[::-1])) + (25 if i % 2 else -25)
        link_img = Image.new("RGBA", (link * 2, link * 2), (0, 0, 0, 0)); ld = ImageDraw.Draw(link_img)
        tone = 150 + (i % 3) * 25
        ld.ellipse((4, link * 0.55, link * 2 - 4, link * 1.45), outline=(tone, tone, tone, 255), width=9)
        link_img = link_img.rotate(-angle, resample=Image.BICUBIC)
        img.alpha_composite(link_img, (int(c[0] - link), int(c[1] - link)))
    img.save(out, optimize=True)


def main():
    root, reference, out = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    # tee (print removed) and hoodie (print removed)
    _, _, tee, shade, _, _ = build.prepare(reference)
    to_png(shade, tee, out / "tee.png")
    a, garment, shade = build_hoodies.prepare(root / build_hoodies.FRONT_PHOTO, build_hoodies.OLD_PRINT_BOX)
    to_png(shade, garment, out / "hoodie.png")
    # shorts (white studio background) and cap (concrete background)
    shorts = np.asarray(Image.open(root / "public/catalog/Pants/loose shorts/black.png").convert("RGB")).astype(np.float32)
    to_png(shorts.mean(2), build.fill_holes(shorts.mean(2) < 200), out / "shorts.png")
    cap = np.asarray(Image.open(root / "public/catalog/accessories/bh-washed-cap.png").convert("RGB")).astype(np.float32)
    lum = cap.mean(2); cap_mask = build.fill_holes((lum < 75) & ((cap[..., 0] - cap[..., 2]) < 20))
    cap_mask = np.asarray(Image.fromarray((cap_mask * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))) > 127
    to_png(lum, cap_mask, out / "cap.png")
    for kind in ("straight", "cargo", "jogger", "wide"):
        shade, mask = pants(kind); to_png(shade, mask, out / f"pants-{kind}.png", stretch=False)
    # jewellery: a bracelet loop (seen at an angle) and a necklace
    loop = [(450 + 300 * math.cos(t), 560 + 170 * math.sin(t)) for t in np.linspace(0, 2 * math.pi, 240)]
    chain(loop, link=40, out=out / "bracelet.png")
    necklace = [(450 + 330 * math.sin(t), 160 + 760 * (1 + math.cos(t)) / 2) for t in np.linspace(-math.pi * 0.95, math.pi * 0.95, 300)]
    chain(necklace, link=30, out=out / "chain.png")


if __name__ == "__main__":
    main()
