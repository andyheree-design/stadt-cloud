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
apt-get update -qq && apt-get install -y -qq curl git ffmpeg ca-certificates libnss3 libdbus-1-3 libgbm-dev libxrandr2 libxkbcommon-dev libxfixes3 libxcomposite1 libxdamage1 libpango-1.0-0 libcairo2 libegl1 libgl1 fonts-liberation fonts-noto-color-emoji >/dev/null 2>&1 || log "BLAD apt podstawowe"
# Ubuntu 24.04 ma nazwy z sufiksem t64 (libatk1.0-0t64 itd.), starsze bez — próbuj obu
for p in libatk1.0-0 libasound2 libatk-bridge2.0-0 libcups2; do apt-get install -y -qq ${p}t64 >/dev/null 2>&1 || apt-get install -y -qq $p >/dev/null 2>&1 || log "BLAD apt $p"; done
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1 && apt-get install -y -qq nodejs >/dev/null 2>&1
git clone -q --depth 1 https://github.com/andyheree-design/stadt-cloud /app && cd /app
npm ci --no-audit --no-fund >/dev/null 2>&1; npx remotion browser ensure --chrome-mode=chrome-for-testing >/dev/null 2>&1
npx remotion bundle cloud/index.ts --out-dir=build >/dev/null 2>&1 || { log "BLAD bundle"; fail; }
log "setup ok node $(node -v)"
CHUNK=${CHUNK:-100}; CONC=${CONC:-$(( $(nproc) > 16 ? 16 : $(nproc) ))}; GL=${GL:-angle-egl}
render(){ npx remotion render build "$COMP" "$3" --frames=$1-$2 --gl=$GL --chrome-mode=chrome-for-testing --concurrency=$CONC --muted --codec=h264 --crf=16 --pixel-format=yuv420p --timeout=240000 --log=error 2>>/out/err.txt; }
# P = ile osobnych procesów renderu naraz. CPU (swangle): wiele kart w JEDNEJ przeglądarce dzieli jeden
# programowy GPU-proces -> kolejka i timeouty; osobne procesy po conc=1 skalują się na wszystkie rdzenie.
P=${P:-1}
chunk(){ local a=$1 b=$2 n=0 g=$GL f=/out/part_$(printf %06d $1).mp4 t=$(date +%s) y
  until GL=$g render $a $b $f.tmp.mp4; do n=$((n+1)); log "BLAD render $a-$b GL=$g proba $n"
    if [ $g != swangle ]; then g=swangle; elif [ $n -ge 3 ]; then fail; fi; done
  y=$(ffmpeg -hide_banner -i $f.tmp.mp4 -vf signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=- -an -f null - 2>/dev/null | awk -F= '/YAVG/{s+=$2;n++}END{printf "%.0f",s/n}')
  if { [ $y -gt 235 ] || [ $y -lt 8 ]; } && [ $g != swangle ]; then log "PODEJRZANA jasnosc $y przy $g -> swangle"; g=swangle; GL=$g render $a $b $f.tmp.mp4; fi
  mv $f.tmp.mp4 $f; local dt=$(( $(date +%s)-t ))
  log "OK $a-$b ${dt}s $(awk "BEGIN{printf \"%.2f\",$dt/($b-$a+1)}") s/kl/proces YAVG=$y GL=$g conc=$CONC P=$P"; }
pids=()
# LIST="a:b a:b ..." = tylko wybrane kawałki (poprawki); bez LIST cały zakres FROM..TO po CHUNK
RL=${LIST:-$(for a in $(seq $FROM $CHUNK $TO); do b=$((a+CHUNK-1)); [ $b -gt $TO ] && b=$TO; echo $a:$b; done)}
for r in $RL; do a=${r%:*}; b=${r#*:}
  while :; do al=(); for q in "${pids[@]}"; do kill -0 $q 2>/dev/null && al+=($q); done; pids=("${al[@]}"); [ ${#pids[@]} -lt $P ] && break; sleep 5; done
  chunk $a $b & pids+=($!)
done
wait "${pids[@]}"
log "KONIEC"; sleep 1200; kill_self; sleep infinity
