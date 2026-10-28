"""BH Loose Shorts on a studio wall like the tees (a slightly cooler, stone shade of the same wall).

Usage: python3 -I build_shorts.py <repo-root> <output-folder>
The wall is taken from a tee mockup with the tee removed; each shorts photo is cut out of its white background
(flood fill from the edges, so white parts inside the shorts stay) and placed with a soft shadow.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).parent))

COLOURS = {"Black": "black.png", "Blue": "blue0.png", "Gray": "gray.png", "Khaki": "khaki.png", "Mint": "mint.png",
           "Pink": "pink.png", "Red": "red.png", "White": "white.png", "Yellow": "yellow.png"}
SIZE = (1024, 1536)            # same 2:3 shape as the tee photos
TONE = np.array([0.95, 0.97, 1.02])   # cooler, stone-like version of the tees' warm wall
SHORTS_WIDTH = 0.80            # share of the image width


def wall(root):
    """The tees' wall without the tee: its soft light is rebuilt from the wall around the tee, plus the wall's grain."""
    photo = Image.open(root / "public/catalog/tees/oni-blade/white-front.jpg").convert("RGB")
    full = np.asarray(photo).astype(np.float32)
    # smooth light of the wall, worked out on a small copy where the tee is filled in from its surroundings
    small = np.asarray(photo.resize((48, 72), Image.BOX)).astype(np.float32)
    known = (small[..., 0] - small[..., 2]) > 30            # warm tan wall; the white tee is neutral
    known = np.asarray(Image.fromarray((known * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 127
    values = np.where(known[..., None], small, 0)
    for _ in range(400):                                    # spread the wall inwards until the hole is filled
        padded = np.pad(values, ((1, 1), (1, 1), (0, 0)), mode="edge"); weight = np.pad(known.astype(np.float32), 1, mode="edge")
        total = sum(padded[1 + dy:padded.shape[0] - 1 + dy, 1 + dx:padded.shape[1] - 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        count = sum(weight[1 + dy:weight.shape[0] - 1 + dy, 1 + dx:weight.shape[1] - 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        grow = (~known) & (count > 0)
        values = np.where(grow[..., None], total / np.maximum(count, 1)[..., None], values)
        known = known | grow
        if known.all():
            break
    light = np.asarray(Image.fromarray(values.astype(np.uint8)).resize(photo.size, Image.BICUBIC).filter(ImageFilter.GaussianBlur(40))).astype(np.float32)
    # grain: the fine texture of the real wall, taken from the band above the tee and repeated down the image
    band = full[: full.shape[0] // 10]
    texture = band - np.asarray(Image.fromarray(band.astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)
    texture = np.concatenate([texture, texture[::-1]] * 6)[: full.shape[0]]
    out = light + np.clip(texture, -14, 14)
    grey = out.mean(axis=2, keepdims=True)
    out = np.clip((out * 0.72 + grey * 0.28) * TONE, 0, 255).astype(np.uint8)  # less saturated, a touch cooler
    return Image.fromarray(out).resize(SIZE, Image.LANCZOS)


def cut_out(path):
    """RGBA shorts: background = near-white pixels connected to the image edge."""
    rgb = Image.open(path).convert("RGB")
    soft = np.asarray(rgb.filter(ImageFilter.GaussianBlur(0.8))).astype(np.int16)
    near_white = (soft.min(axis=2) >= 248)
    marks = Image.fromarray(np.where(near_white, 255, 0).astype(np.uint8)).copy()  # copy: editable pixels
    w, h = marks.size
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if marks.getpixel(seed) == 255:
            ImageDraw.floodfill(marks, seed, 128)
    background = np.asarray(marks) == 128
    # shrink the edge by 2px so no white halo from the old background is left, then soften it
    alpha = Image.fromarray(np.where(background, 0, 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    cut = rgb.convert("RGBA"); cut.putalpha(alpha)
    return cut.crop(alpha.getbbox())


def compose(background, shorts):
    canvas = background.convert("RGBA")
    width = round(SIZE[0] * SHORTS_WIDTH)
    shorts = shorts.resize((width, round(shorts.height * width / shorts.width)), Image.LANCZOS)
    x = (SIZE[0] - shorts.width) // 2
    y = round(SIZE[1] * 0.47 - shorts.height / 2)
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shade = shorts.getchannel("A").point(lambda v: v * 0.30)
    shadow.paste(Image.new("RGBA", shorts.size, (60, 42, 30, 255)), (x + 6, y + 26), shade)
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(22)))
    canvas.alpha_composite(shorts, (x, y))
    return canvas.convert("RGB")


def main():
    root, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    background = wall(root)
    for colour, name in COLOURS.items():
        shorts = cut_out(root / "public/catalog/Pants/loose shorts" / name)
        compose(background, shorts).save(out / f"{colour.lower()}.jpg", quality=86, optimize=True, progressive=True)


if __name__ == "__main__":
    main()
