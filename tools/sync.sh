#!/usr/bin/env bash
# Kopiuje aktualne src/ + public/stadt/ z remotion-shorts do stadt-cloud, generuje cloud/Root.tsx
# (tylko kompozycje Stadt*), wstawia placeholdery audio i robi commit.
# Użycie: bash tools/sync.sh ["opis commita"]
set -euo pipefail
SRC="${SRC:-/c/Users/dimau/remotion-shorts}"
DST="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DST"

# 1) src/ (bez kopii zapasowych)
rm -rf src && mkdir -p src
( cd "$SRC" && find src -type f ! -name '*.bak' ! -name '*.bak.*' ! -name '*.pre_*' ! -name '*.v[0-9]*.tsx.bak' -print0 ) |
  while IFS= read -r -d '' f; do mkdir -p "$(dirname "$f")"; cp "$SRC/$f" "$f"; done

# 2) public/stadt/ bez audio, takes, vo, kenney, sfx, plików >40 MB
rm -rf public/stadt && mkdir -p public/stadt
( cd "$SRC" && find public/stadt \
    \( -type d \( -name 'takes*' -o -name 'mix_raw*' -o -name 'vo' -o -name 'vo_*' -o -name 'vo[0-9]*' -o -name 'kenney' -o -name 'sfx' -o -name 'stems' \) -prune \) -o \
    \( -type f ! -iname '*.wav' ! -iname '*.mp3' ! -iname '*.flac' ! -iname '*.m4a' ! -iname '*.ogg' ! -iname '*.mp4' ! -iname '*.mov' ! -size +40M -print0 \) ) |
  while IFS= read -r -d '' f; do mkdir -p "$(dirname "$f")"; cp "$SRC/$f" "$f"; done

# 3) placeholdery audio: każde "audio"/".wav"/".mp3" wspomniane w JSON-ach public/stadt
#    (render idzie z --muted, ale staticFile musi się zresolwować)
python - <<'PY'
import json, pathlib, re, struct
root = pathlib.Path("public")
def silent_wav(p):
    p.parent.mkdir(parents=True, exist_ok=True)
    sr, n = 8000, 8000  # 1 s ciszy, mono 16-bit (~16 KB)
    data = b"\x00\x00" * n
    p.write_bytes(b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVEfmt " +
                  struct.pack("<IHHIIHH", 16, 1, 1, sr, sr * 2, 2, 16) + b"data" + struct.pack("<I", len(data)) + data)
refs = set()
for j in root.joinpath("stadt").rglob("*.json"):
    txt = j.read_text(encoding="utf-8", errors="ignore")
    refs |= set(re.findall(r'"((?:stadt/)[^"]+\.(?:wav|mp3))"', txt))
for r in sorted(refs):
    p = root / r
    if not p.exists():
        silent_wav(p.with_suffix(".wav") if p.suffix == ".wav" else p)
print(f"placeholdery audio: {len(refs)}")
PY

# 4) cloud/Root.tsx — tylko importy i <Composition> Stadt* z src/Root.tsx
python - <<'PY'
import re, pathlib
src = pathlib.Path("src/Root.tsx").read_text(encoding="utf-8")
imps = [l.replace('"./videos/', '"../src/videos/') for l in src.splitlines() if l.startswith("import") and "/videos/stadt/" in l]
comps = [l.strip() for l in src.splitlines() if re.search(r'<Composition\s+id="Stadt', l)]
out = ['// AUTOGENEROWANE przez tools/sync.sh — nie edytuj ręcznie.', 'import React from "react";',
       'import { Composition } from "remotion";', *imps, '',
       'export const RemotionRoot: React.FC = () => (', '  <>', *['    ' + c for c in comps], '  </>', ');', '']
pathlib.Path("cloud/Root.tsx").write_text("\n".join(out), encoding="utf-8")
print(f"cloud/Root.tsx: {len(comps)} kompozycji")
PY

# 5) package.json / lock (zależności mogły się zmienić)
cp "$SRC/package.json" "$SRC/package-lock.json" .

# 6) kontrola rozmiaru
big=$(find . -path ./.git -prune -o -path ./node_modules -prune -o -type f -size +50M -print)
[ -n "$big" ] && { echo "BŁĄD: pliki >50 MB: $big"; exit 1; }
du -sh --exclude=.git --exclude=node_modules . || true

git add -A
if git diff --cached --quiet; then echo "Brak zmian."; else git commit -q -m "${1:-sync $(date +%F_%H%M)}"; git log --oneline -1; fi
