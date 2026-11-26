#!/usr/bin/env python3
# Standardowe oddawanie odcinka: mux audio (mix.wav) + MASTERING (2-pass loudnorm) + kompresja 2-pass h264 <=target MB + bramka.
# Uzycie: python tools/deliver.py <video_niemy.mp4> <audio.wav> <out.mp4> [target_MB=30]
# Wideo z GHA jest --muted (nieme) -> tu dokladamy sciezke z mix.wav i scinamy do dlugosci wideo (-shortest).
import json, os, re, subprocess, sys

# Cele mastera (z researchu): TikTok/Shorts lubi glosniej niz -14; bramka wymaga -17..-11 LUFS.
TARGET_I, TARGET_TP, TARGET_LRA = -12.0, -1.0, 11.0

def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", **kw)

def dur(p):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p])
    return float((r.stdout or "0").strip() or 0)

def measure_loudnorm(aud):
    # Pierwszy przebieg loudnorm: zmierz, zeby drugi przebieg byl liniowy (bez pompowania).
    f = f"loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={TARGET_LRA}:print_format=json"
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", aud, "-af", f, "-f", "null", "-"])
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None

def loudnorm_filter(j):
    if not j:
        return f"loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={TARGET_LRA}"
    return (f"loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={TARGET_LRA}"
            f":measured_I={j['input_i']}:measured_TP={j['input_tp']}"
            f":measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}"
            f":offset={j.get('target_offset','0')}:linear=true:print_format=summary")

def main():
    if len(sys.argv) < 4:
        print("Uzycie: python tools/deliver.py <video.mp4> <audio.wav> <out.mp4> [target_MB=30]"); sys.exit(1)
    vid, aud, out = sys.argv[1:4]
    target_mb = float(sys.argv[4]) if len(sys.argv) > 4 else 30.0
    for f in (vid, aud):
        if not os.path.exists(f): print(f"BRAK pliku: {f}"); sys.exit(1)
    vdur, adur = dur(vid), dur(aud)
    d = min(vdur, adur) if adur else vdur
    print(f"wideo {vdur:.2f}s, audio {adur:.2f}s -> dlugosc {d:.2f}s, cel {target_mb} MB")

    print("mastering: pomiar loudnorm (pass 1/2 audio)...")
    jm = measure_loudnorm(aud)
    af = loudnorm_filter(jm)
    print(f"  {'zmierzono' if jm else 'UWAGA: brak pomiaru, loudnorm jednoprzebiegowy'} -> I={TARGET_I} TP={TARGET_TP} LUFS")

    a_kbps = 160
    total_kbps = (target_mb * 8192 * 0.94) / d
    v_kbps = max(600, int(total_kbps - a_kbps))
    print(f"docelowy bitrate wideo {v_kbps} kb/s + audio {a_kbps} kb/s")
    passlog = out + ".pass"
    base = ["-y", "-i", vid, "-i", aud, "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "libx264", "-b:v", f"{v_kbps}k", "-preset", "slow",
            "-pix_fmt", "yuv420p", "-shortest", "-movflags", "+faststart"]
    print("wideo pass 1/2..."); r1 = run(["ffmpeg", "-hide_banner", "-nostats", *base,
                                           "-pass", "1", "-passlogfile", passlog, "-an", "-f", "mp4", os.devnull])
    if r1.returncode != 0: print("PASS1 FAIL:\n" + r1.stderr[-1500:]); sys.exit(2)
    print("wideo pass 2/2 + master audio..."); r2 = run(["ffmpeg", "-hide_banner", "-nostats", *base,
                                           "-pass", "2", "-passlogfile", passlog,
                                           "-af", af, "-c:a", "aac", "-b:a", f"{a_kbps}k", out])
    if r2.returncode != 0: print("PASS2 FAIL:\n" + r2.stderr[-1500:]); sys.exit(2)
    for ext in ("", "-0.log", "-0.log.mbtree"):
        try: os.remove(passlog + ext)
        except OSError: pass
    mb = os.path.getsize(out) / 1048576
    print(f"GOTOWE: {out}  {mb:.2f} MB  ({'OK <=' if mb <= target_mb else 'UWAGA >'} {target_mb})")

    gate = os.path.expanduser("~/.claude/hooks/stadt_gate.py")
    if os.path.exists(gate):
        print("\n=== BRAMKA JAKOSCI ===")
        g = run([sys.executable, gate, out])
        print(g.stdout or g.stderr)
        sys.exit(0 if g.returncode == 0 else 3)

if __name__ == "__main__":
    main()
