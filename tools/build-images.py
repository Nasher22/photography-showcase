#!/usr/bin/env python3
"""Generate the responsive WebP variants used by the <picture> elements.

Only DOWNSCALES - it will never invent detail that isn't in the source, so a
small source produces a small variant. A variant is skipped when it would be
byte-identical to a smaller one already written (e.g. a 399px source does not
need both -800 and -1600).

Usage:
    pip install pillow
    python tools/build-images.py

Writes to assets/img/ and regenerates assets/img/manifest.json.
"""

import json
import os
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is required:  pip install pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "images")
OUT = os.path.join(ROOT, "assets", "img")
os.makedirs(OUT, exist_ok=True)

GALLERY = [f"img{i}" for i in range(1, 10)]
HERO_SRC = "55fe0f70-4b41-4eac-8c53-82e00472a443.jpg"
TARGETS = [800, 1600]
QUALITY = 80


def build(src_name, stem):
    """Write webp variants for one image. Returns {declared_width: [file, w, h]}."""
    src = os.path.join(SRC, src_name)
    if not os.path.exists(src):
        print(f"  ! missing source {src_name}, skipped")
        return {}

    variants = {}
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")

        for target in TARGETS:
            work = im.copy()
            if work.width > target:
                work.thumbnail((target, 9999), Image.LANCZOS)

            # Already produced this exact size at a smaller target.
            if any(w == work.width for w in variants):
                continue

            name = f"{stem}-{target}.webp"
            work.save(os.path.join(OUT, name), "WEBP", quality=QUALITY, method=6)
            variants[work.width] = [name, work.width, work.height]
            kb = os.path.getsize(os.path.join(OUT, name)) // 1024
            print(f"  {name:24} {work.width}x{work.height}  {kb} KB")

    # Remove stale variants from previous runs.
    for target in TARGETS:
        stale = f"{stem}-{target}.webp"
        if all(v[0] != stale for v in variants.values()):
            path = os.path.join(OUT, stale)
            if os.path.exists(path):
                os.remove(path)

    return variants


def main():
    manifest = {"gallery": {}, "hero": {}}

    print("Gallery images:")
    for stem in GALLERY:
        manifest["gallery"][stem] = build(f"{stem}.jpg", stem)

    print("\nHero:")
    manifest["hero"] = build(HERO_SRC, "hero")

    print("\nOpen Graph cover:")
    with Image.open(os.path.join(SRC, HERO_SRC)) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        cover = ImageOps.fit(im, (1200, 630), Image.LANCZOS)
        path = os.path.join(SRC, "og-cover.jpg")
        cover.save(path, "JPEG", quality=88, optimize=True, progressive=True)
        print(f"  og-cover.jpg          1200x630  {os.path.getsize(path) // 1024} KB")

    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)

    print("\nDone. Update the srcset widths in the HTML if any changed.")


if __name__ == "__main__":
    main()