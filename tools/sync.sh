#!/usr/bin/env bash
# Kopiuje aktualne src/ + public/stadt/ + public/fonts/ z remotion-shorts do stadt-cloud, generuje cloud/Root.tsx
# (tylko kompozycje Stadt*), wstawia placeholdery audio i robi commit TYLKO skopiowanych ścieżek.
# Użycie: bash tools/sync.sh ["opis commita"]
# ZABEZPIECZENIA (po incydencie 27.11 — sync kasował pracę zrobioną bezpośrednio w stadt-cloud):
#  G1  przerwij, jeśli stadt-cloud/src ma niezacommitowane zmiany,
#  G2  przerwij, jeśli w stadt-cloud/src jest plik, którego nie ma w remotion-shorts/src,
#  G3  przerwij, jeśli plik src/ albo public/ różni się i jest NOWSZY w stadt-cloud,
#  public/ kopiowane addytywnie (bez rm -rf), commit bez `git add -A` (cudze nieśledzone pliki zostają nietknięte).
#  FORCE=1 pomija G2/G3 (świadome nadpisanie).
set -euo pipefail
SRC="${SRC:-/c/Users/dimau/remotion-shorts}"
DST="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DST"
skip() { case "$1" in *.bak|*.bak.*|*.pre_*|*/__pycache__/*) return 0;; esac; return 1; }

# G1
if [ -n "$(git status --porcelain -- src cloud)" ]; then
  echo "STOP G1: niezacommitowane zmiany w stadt-cloud/src|cloud — przenieś je do $SRC/src albo zacommituj:"; git status --short -- src cloud; exit 2; fi
# G2/G3 dla src
fail=0
while IFS= read -r -d '' f; do
  skip "$f" && continue
  if [ ! -f "$SRC/$f" ]; then echo "STOP G2: $f jest tylko w stadt-cloud"; fail=1
  elif ! cmp -s "$f" "$SRC/$f" && [ "$f" -nt "$SRC/$f" ]; then echo "STOP G3: $f nowszy w stadt-cloud niż w remotion-shorts"; fail=1; fi
done < <(find src -type f -print0)
# G3 dla public (tylko pliki istniejące po obu stronach)
while IFS= read -r -d '' f; do
  [ -f "$SRC/$f" ] || continue
  if ! cmp -s "$f" "$SRC/$f" && [ "$f" -nt "$SRC/$f" ]; then echo "STOP G3: $f nowszy w stadt-cloud"; fail=1; fi
done < <(find public/stadt public/fonts -type f -print0 2>/dev/null)
[ "$fail" = 1 ] && [ "${FORCE:-0}" != 1 ] && { echo "Najpierw przenieś te pliki do $SRC (albo FORCE=1)."; exit 2; }

COPIED="$(mktemp)"; trap 'rm -f "$COPIED"' EXIT
# 1) src/ — lustro (G1/G2 gwarantują, że nic nie ginie)
rm -rf src && mkdir -p src
( cd "$SRC" && find src -type f ! -name '*.bak' ! -name '*.bak.*' ! -name '*.pre_*' ! -name '*.v[0-9]*.tsx.bak' ! -path '*/__pycache__/*' -print0 ) |
  while IFS= read -r -d '' f; do mkdir -p "$(dirname "$f")"; cp -p "$SRC/$f" "$f"; done
echo src >> "$COPIED"

# 2) public/stadt/ + public/fonts/ ADDYTYWNIE, bez audio, takes, vo, kenney, sfx, plików >40 MB
( cd "$SRC" && find public/stadt public/fonts     \( -type d \( -name 'takes*' -o -name 'mix_raw*' -o -name 'vo' -o -name 'vo_*' -o -name 'vo[0-9]*' -o -name 'kenney' -o -name 'sfx' -o -name 'stems' \) -prune \) -o     \( -type f ! -iname '*.wav' ! -iname '*.mp3' ! -iname '*.flac' ! -iname '*.m4a' ! -iname '*.ogg' ! -iname '*.mp4' ! -iname '*.mov' ! -size +40M -print0 \) 2>/dev/null ) |
  while IFS= read -r -d '' f; do
    if ! cmp -s "$SRC/$f" "$f"; then mkdir -p "$(dirname "$f")"; cp -p "$SRC/$f" "$f"; echo "$f" >> "$COPIED"; fi
  done

# 3) placeholdery audio: każde "audio"/".wav"/".mp3" wspomniane w JSON-ach public/stadt
#    (render idzie z --muted, ale staticFile musi się zresolwować)
SRC="$SRC" COPIED="$COPIED" python - <<'PY'
import json, pathlib, re, struct
root = pathlib.Path("public")
def silent_wav(p):
    p.parent.mkdir(parents=True, exist_ok=True)
    sr, n = 8000, 8000  # 1 s ciszy, mono 16-bit (~16 KB)
    data = b"\x00\x00" * n
    p.write_bytes(b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVEfmt " +
                  struct.pack("<IHHIIHH", 16, 1, 1, sr, sr * 2, 2, 16) + b"data" + struct.pack("<I", len(data)) + data)
refs = set()
import os
src_eps = {d.name for d in pathlib.Path(os.environ["SRC"], "public/stadt").iterdir() if d.is_dir()}
made = []
for j in root.joinpath("stadt").rglob("*.json"):
    if j.relative_to(root / "stadt").parts[0] not in src_eps: continue  # cudze katalogi (np. e04 w toku) — nie ruszać
    txt = j.read_text(encoding="utf-8", errors="ignore")
    refs |= set(re.findall(r'"((?:stadt/)[^"]+\.(?:wav|mp3))"', txt))
for r in sorted(refs):
    p = root / r
    if not p.exists():
        q = p.with_suffix(".wav") if p.suffix == ".wav" else p
        silent_wav(q); made.append(str(q).replace("\\", "/"))
open(os.environ["COPIED"], "a").write("".join(m + "\n" for m in made))
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
printf "cloud\npackage.json\npackage-lock.json\n" >> "$COPIED"

# 6) kontrola rozmiaru
big=$(find . -path ./.git -prune -o -path ./node_modules -prune -o -type f -size +50M -print)
[ -n "$big" ] && { echo "BŁĄD: pliki >50 MB: $big"; exit 1; }
du -sh --exclude=.git --exclude=node_modules . || true

# 7) kontrola: każda kompozycja z src/Root.tsx (Stadt*) jest w cloud/Root.tsx
for id in $(grep -oE '<Composition +id="Stadt[A-Za-z0-9]*"' src/Root.tsx | grep -oE 'Stadt[A-Za-z0-9]*'); do
  grep -q "id=\"$id\"" cloud/Root.tsx || { echo "BŁĄD: cloud/Root.tsx bez $id"; exit 1; }; done
echo "cloud/Root.tsx: $(grep -c '<Composition' cloud/Root.tsx) kompozycji, w tym StadtWzorLook: $(grep -c 'id="StadtWzorLook"' cloud/Root.tsx)"

sort -u "$COPIED" | tr '\n' '\0' | xargs -0 git add -A --
if git diff --cached --quiet; then echo "Brak zmian."; else git commit -q -m "${1:-sync $(date +%F_%H%M)}"; git log --oneline -1; fi
