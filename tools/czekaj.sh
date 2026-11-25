#!/bin/bash
# bash tools/czekaj.sh <log> <PID windows> [err]  — czeka na koniec procesu upcloud.py; wypisuje ogon logów.
LOG=$1; PID=$2; ERR=${3:-${LOG%.log}.err}
alive() { powershell -NoProfile -c "if (Get-Process -Id $PID -ErrorAction SilentlyContinue) {exit 0} else {exit 1}" >/dev/null 2>&1; }
until grep -qE "GOTOWE|Traceback" "$LOG" "$ERR" 2>/dev/null || ! alive; do sleep 30; done
echo "== log"; tail -5 "$LOG"; echo "== err"; tail -8 "$ERR" 2>/dev/null
grep -q GOTOWE "$LOG" && echo STATUS=OK || echo STATUS=BLAD
