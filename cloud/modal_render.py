"""Render Remotion na Modal.com — wiele kontenerów równolegle, potem sklejenie.

Użycie (z katalogu stadt-cloud, po `npx remotion bundle` do ./build):
  python -m modal run cloud/modal_render.py --comp StadtE02 --chunks 60
  python -m modal run cloud/modal_render.py --comp StadtE01v3 --chunks 4 --limit 240 --gpu
Wynik: out/full_<comp>.mp4 (bez dźwięku; audio muxujemy lokalnie).
"""
import os, subprocess, pathlib, time
import modal

ROOT = pathlib.Path(__file__).resolve().parent.parent
APT = ["libnss3", "libdbus-1-3", "libatk1.0-0", "libgbm-dev", "libasound2", "libxrandr2",
       "libxkbcommon-dev", "libxfixes3", "libxcomposite1", "libxdamage1", "libatk-bridge2.0-0",
       "libpango-1.0-0", "libcairo2", "libcups2", "ffmpeg", "curl", "ca-certificates"]

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install(*APT)
    .run_commands("curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs")
    .add_local_file(str(ROOT / "package.json"), "/app/package.json", copy=True)
    .add_local_file(str(ROOT / "package-lock.json"), "/app/package-lock.json", copy=True)
    .run_commands("cd /app && npm ci --no-audit --no-fund",
                  "cd /app && npx remotion browser ensure",
                  "cd /app && npx remotion browser ensure --chrome-mode=chrome-for-testing || true")
    .add_local_dir(str(ROOT / "build"), "/app/build")
)

app = modal.App("stadt-render", image=image)

FLAGS = ["--muted", "--codec=h264", "--crf=16", "--pixel-format=yuv420p", "--timeout=120000", "--log=info"]


def _render(comp, a, b, gl, extra):
    out = f"/tmp/part_{a:06d}.mp4"
    cores = os.cpu_count() or 4
    cmd = ["npx", "remotion", "render", "build", comp, out, f"--frames={a}-{b}",
           f"--gl={gl}", f"--concurrency={cores}", *FLAGS, *extra]
    t = time.time()
    subprocess.run(cmd, cwd="/app", check=True)
    dt = time.time() - t
    print(f"[{a}-{b}] {b - a + 1} kl. w {dt:.0f}s = {dt / (b - a + 1):.2f} s/kl. ({cores} rdzeni)")
    return pathlib.Path(out).read_bytes(), dt


@app.function(cpu=8, memory=12288, timeout=3600, retries=1)
def render_cpu(comp: str, a: int, b: int):
    return _render(comp, a, b, "swangle", [])


@app.function(gpu="T4", cpu=4, memory=12288, timeout=3600, retries=1)
def render_gpu(comp: str, a: int, b: int):
    subprocess.run(["nvidia-smi"], check=False)
    return _render(comp, a, b, "angle-egl",
                   ["--chrome-mode=chrome-for-testing", "--enable-multiprocess-on-linux"])


@app.function(timeout=300)
def frame_count(comp: str) -> int:
    js = ("const {selectComposition}=require('@remotion/renderer');"
          f"selectComposition({{serveUrl:'build',id:'{comp}'}}).then(c=>console.log('FRAMES='+c.durationInFrames))")
    r = subprocess.run(["node", "-e", js], cwd="/app", capture_output=True, text=True, check=True)
    return int(r.stdout.split("FRAMES=")[-1].strip())


@app.local_entrypoint()
def main(comp: str, chunks: int = 60, limit: int = 0, gpu: bool = False):
    total = frame_count.remote(comp)
    n = min(total, limit) if limit else total
    size = -(-n // chunks)
    ranges = [(i, min(i + size, n) - 1) for i in range(0, n, size)]
    print(f"{comp}: {n} klatek, {len(ranges)} kawałków po ~{size}, {'GPU T4' if gpu else 'CPU 8 rdzeni'}")
    fn = render_gpu if gpu else render_cpu
    t0 = time.time()
    outdir = ROOT / "out" / comp
    outdir.mkdir(parents=True, exist_ok=True)
    times = []
    for (a, _), (data, dt) in zip(ranges, fn.starmap([(comp, a, b) for a, b in ranges])):
        (outdir / f"part_{a:06d}.mp4").write_bytes(data)
        times.append(dt)
    lst = outdir / "list.txt"
    lst.write_text("".join(f"file 'part_{a:06d}.mp4'\n" for a, _ in ranges))
    full = ROOT / "out" / f"full_{comp}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst),
                    "-c", "copy", str(full)], check=True)
    print(f"GOTOWE {full} | ściana {time.time() - t0:.0f}s | najdłuższy kawałek {max(times):.0f}s | "
          f"średnio {sum(times) / len(times) / size:.2f} s/kl. na kontener")
