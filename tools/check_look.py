#!/usr/bin/env python3
"""Strażnik wyglądu StadtWzorLook: signalstats (YAVG, SATAVG) per lokacja z gotowego mp4.
Fail (exit 1), gdy którakolwiek lokacja wypada poza YAVG 145–190 lub SAT 27–45 (zakres wzoru @larpniverse z marginesem).
Użycie: python tools/check_look.py full.mp4 [--fps 60]
Ujęcia czytane z src/videos/stadt/StadtWzorLook.tsx (loc + d), więc zmiana listy SHOTS nie rozjedzie progów."""
import re, subprocess, sys, pathlib
YAVG, SAT = (145, 190), (27, 45)
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "src/videos/stadt/StadtWzorLook.tsx").read_text(encoding="utf-8")
body = src[src.index("const SHOTS"):src.index("const STARTS")]
shots = re.findall(r'\{ loc: "(\w+)".*?\bd: (\d+)', body)
mp4 = sys.argv[1]; fps = float(sys.argv[sys.argv.index("--fps") + 1]) if "--fps" in sys.argv else 60.0
start, bad, per = 0, [], {}
for loc, d in shots:
    d = int(d); a, b = start + d * 0.2, start + d * 0.8; start += d
    out = subprocess.run(["ffmpeg", "-hide_banner", "-ss", f"{a / fps:.3f}", "-t", f"{(b - a) / fps:.3f}", "-i", mp4,
                          "-vf", "fps=6,scale=270:-2,signalstats,metadata=print", "-f", "null", "-"], capture_output=True, text=True).stderr
    y = [float(v) for v in re.findall(r"YAVG=([0-9.]+)", out)]; s = [float(v) for v in re.findall(r"SATAVG=([0-9.]+)", out)]
    if not y: bad.append(f"{loc}: brak klatek"); continue
    per.setdefault(loc, []).append((sum(y) / len(y), sum(s) / len(s)))
for loc, v in per.items():
    y = sum(p[0] for p in v) / len(v); s = sum(p[1] for p in v) / len(v)
    ok = YAVG[0] <= y <= YAVG[1] and SAT[0] <= s <= SAT[1]
    print(f"{'OK  ' if ok else 'FAIL'} {loc:10s} YAVG {y:6.1f}  SAT {s:5.1f}")
    if not ok: bad.append(loc)
print("check_look:", "PASS" if not bad else "FAIL " + ", ".join(bad)); sys.exit(1 if bad else 0)
