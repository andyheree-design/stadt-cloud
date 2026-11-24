#!/bin/bash
# Start poda GPU (RunPod/Vast): instaluje wszystko, renderuje FROM..TO kawałkami, serwuje /out na porcie 8000.
# Zmienne: COMP, FROM, TO, CHUNK (100), CONC (auto), GL (angle-egl; zapas swangle)
set -u; mkdir -p /out
# Bezpiecznik kosztów: pod sam się usuwa po MAXH godzinach albo 20 min po końcu (RunPod wstrzykuje RUNPOD_API_KEY i RUNPOD_POD_ID)
kill_self(){ [ -z "${RUNPOD_API_KEY:-}" ] && { sync; shutdown -h now; return; }; curl -s https://api.runpod.io/graphql -H "Content-Type: application/json" -H "Authorization: Bearer $RUNPOD_API_KEY" -d "{\"query\":\"mutation{podTerminate(input:{podId:\\\"$RUNPOD_POD_ID\\\"})}\"}"; }
( sleep $(( ${MAXH:-2} * 3600 )); echo "$(date +%T) LIMIT CZASU - usuwam pod" >> /out/status.txt; kill_self ) &
 cd /out; nohup python3 -m http.server 8000 >/dev/null 2>&1 &
fail(){ log "BLAD KONCOWY - wylaczam za 15 min"; sleep 900; kill_self; sleep infinity; }
log(){ echo "$(date +%T) $*" | tee -a /out/status.txt; }
log "start $COMP $FROM-$TO"; nvidia-smi -L >> /out/status.txt 2>&1
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq curl git ffmpeg ca-certificates libnss3 libdbus-1-3 libgbm-dev libxrandr2 libxkbcommon-dev libxfixes3 libxcomposite1 libxdamage1 libpango-1.0-0 libcairo2 libegl1 libgl1 fonts-liberation >/dev/null 2>&1 || log "BLAD apt podstawowe"
# Ubuntu 24.04 ma nazwy z sufiksem t64 (libatk1.0-0t64 itd.), starsze bez — próbuj obu
for p in libatk1.0-0 libasound2 libatk-bridge2.0-0 libcups2; do apt-get install -y -qq ${p}t64 >/dev/null 2>&1 || apt-get install -y -qq $p >/dev/null 2>&1 || log "BLAD apt $p"; done
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1 && apt-get install -y -qq nodejs >/dev/null 2>&1
git clone -q --depth 1 https://github.com/andyheree-design/stadt-cloud /app && cd /app
npm ci --no-audit --no-fund >/dev/null 2>&1; npx remotion browser ensure --chrome-mode=chrome-for-testing >/dev/null 2>&1
npx remotion bundle cloud/index.ts --out-dir=build >/dev/null 2>&1 || { log "BLAD bundle"; fail; }
log "setup ok node $(node -v)"
CHUNK=${CHUNK:-100}; CONC=${CONC:-$(( $(nproc) > 16 ? 16 : $(nproc) ))}; GL=${GL:-angle-egl}
render(){ npx remotion render build "$COMP" "$3" --frames=$1-$2 --gl=$GL --chrome-mode=chrome-for-testing --concurrency=$CONC --muted --codec=h264 --crf=16 --pixel-format=yuv420p --timeout=240000 --log=error 2>>/out/err.txt; }
first=1
for a in $(seq $FROM $CHUNK $TO); do b=$((a+CHUNK-1)); [ $b -gt $TO ] && b=$TO
  f=/out/part_$(printf %06d $a).mp4; t=$(date +%s)
  # przy błędzie: najpierw swangle, potem połowa równoległości (za dużo kart CPU-WebGL naraz = timeout sceny)
  until render $a $b $f.tmp.mp4; do log "BLAD render $a-$b GL=$GL conc=$CONC"; if [ $GL != swangle ]; then GL=swangle; elif [ $CONC -gt 2 ]; then CONC=$((CONC/2)); else fail; fi; log "ponawiam GL=$GL conc=$CONC"; done
  y=$(ffmpeg -hide_banner -i $f.tmp.mp4 -vf signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=- -an -f null - 2>/dev/null | awk -F= '/YAVG/{s+=$2;n++}END{printf "%.0f",s/n}')
  if [ $first = 1 ] && { [ $y -gt 235 ] || [ $y -lt 8 ]; } && [ $GL != swangle ]; then log "PODEJRZANA jasnosc $y przy $GL -> swangle"; GL=swangle; render $a $b $f.tmp.mp4; fi
  first=0; mv $f.tmp.mp4 $f; dt=$(( $(date +%s)-t ))
  log "OK $a-$b ${dt}s $(awk "BEGIN{printf \"%.2f\",$dt/($b-$a+1)}") s/kl YAVG=$y GL=$GL conc=$CONC"
done
log "KONIEC"; sleep 1200; kill_self; sleep infinity
