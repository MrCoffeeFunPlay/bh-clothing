"""BH app icons (PWA and the future Android/iPhone apps): cream "BH" with the gold dot on BH brown.

Usage: python3 -I tools/pwa/build_icons.py <output-folder>
"maskable" icons keep the mark inside the middle 80% so phones can crop them to any shape.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BROWN, CREAM, GOLD = (58, 44, 34), (255, 250, 244), (198, 147, 100)
FONT = "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"


def icon(size, mark=0.62, rounded=False):
    scale = 4  # draw large, then shrink for smooth edges
    big = size * scale
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if rounded:
        draw.rounded_rectangle((0, 0, big - 1, big - 1), radius=big * 0.22, fill=BROWN)
    else:
        draw.rectangle((0, 0, big, big), fill=BROWN)
    font = ImageFont.truetype(FONT, round(big * mark * 0.62))
    text = "BH"
    box = draw.textbbox((0, 0), text, font=font)
    width, height = box[2] - box[0], box[3] - box[1]
    dot = big * mark * 0.075
    x = (big - (width + dot * 2.6)) / 2 - box[0]
    y = (big - height) / 2 - box[1]
    draw.text((x, y), text, font=font, fill=CREAM)
    cx, cy = x + box[2] + dot * 1.5, y + box[3] - dot
    draw.ellipse((cx - dot, cy - dot, cx + dot, cy + dot), fill=GOLD)
    return img.resize((size, size), Image.LANCZOS)


def main():
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    icon(192).save(out / "icon-192.png", optimize=True)
    icon(512).save(out / "icon-512.png", optimize=True)
    icon(512, mark=0.48).save(out / "icon-maskable-512.png", optimize=True)
    icon(180).convert("RGB").save(out / "apple-touch-icon.png", optimize=True)
    icon(1024).save(out / "icon-1024.png", optimize=True)  # for the app stores later


if __name__ == "__main__":
    main()
