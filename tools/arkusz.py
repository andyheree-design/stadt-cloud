#!/usr/bin/env python3
"""Arkusz klatek (contact sheet) wg timeline.json: jedna klatka ze środka każdego ujęcia, miniatury 180 px, podpis id + zakres klatek.

usage: python arkusz.py VIDEO.mp4 TIMELINE.json OUT.jpg [--cols 8] [--width 180] [--ffmpeg ffmpeg]
Klatki: ffmpeg -ss t -frames:v 1 (t = środek ujęcia s..e w klatkach / fps z timeline).
"""
import argparse
import json
import os
import subprocess
import tempfile

from PIL import Image, ImageDraw


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("video")
    ap.add_argument("timeline")
    ap.add_argument("out")
    ap.add_argument("--cols", type=int, default=8)
    ap.add_argument("--width", type=int, default=180)
    ap.add_argument("--ffmpeg", default="ffmpeg")
    a = ap.parse_args()

    tl = json.load(open(a.timeline, encoding="utf-8"))
    fps = float(tl.get("fps", 60))
    shots = tl["shots"]
    tmp = tempfile.mkdtemp(prefix="arkusz_")
    thumbs = []
    for i, sh in enumerate(shots):
        mid = (sh["s"] + sh["e"]) / 2.0 / fps
        png = os.path.join(tmp, f"{i:03d}.png")
        subprocess.run([a.ffmpeg, "-v", "error", "-y", "-ss", f"{mid:.3f}", "-i", a.video,
                        "-frames:v", "1", "-vf", f"scale={a.width}:-2", png], check=True)
        im = Image.open(png).convert("RGB")
        d = ImageDraw.Draw(im)
        label = f"{sh['id']} {sh['s']}-{sh['e']}"
        d.rectangle([0, 0, min(im.width, 7 * len(label) + 6), 14], fill=(0, 0, 0))
        d.text((3, 2), label, fill=(255, 255, 0))
        thumbs.append(im)

    if not thumbs:
        raise SystemExit("brak ujęć w timeline.json")
    tw, th = thumbs[0].size
    cols = min(a.cols, len(thumbs))
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * th), (20, 20, 20))
    for i, im in enumerate(thumbs):
        sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
    sheet.save(a.out, quality=85)
    print(f"OK {a.out}: {len(thumbs)} ujęć, {cols}x{rows}, {sheet.width}x{sheet.height}")


if __name__ == "__main__":
    main()
