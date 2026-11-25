# Kaggle (GPU T4 x2): render kawałków Remotion przez cloud/pod_start.sh; wyniki w /kaggle/working/out.
# Parametry w params.json obok (COMP, FROM, TO, CHUNK, GL, CONC, P, LIST). Diagnostyka GPU do out/diag.txt.
import json, os, subprocess, urllib.request
W = "/kaggle/working/out"; os.makedirs(W, exist_ok=True)
if not os.path.exists("/out"): os.symlink(W, "/out")
here = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else "/kaggle/src"
p = {"COMP": "StadtE03", "FROM": "600", "TO": "839", "CHUNK": "120", "GL": "angle-egl", "CONC": "4", "P": "1"}
for f in ("params.json", "/kaggle/src/params.json"):
    if os.path.exists(os.path.join(here, f)): p.update(json.load(open(os.path.join(here, f)))); break
diag = subprocess.run("nvidia-smi; echo CAPS=$NVIDIA_DRIVER_CAPABILITIES; ls /usr/lib/x86_64-linux-gnu | grep -iE 'egl_nvidia|vulkan|GLX_nvidia' ; nproc; free -g",
                      shell=True, capture_output=True, text=True)
open(f"{W}/diag.txt", "w").write(diag.stdout + diag.stderr); print(diag.stdout)
sh = urllib.request.urlopen("https://raw.githubusercontent.com/andyheree-design/stadt-cloud/main/cloud/pod_start.sh").read()
open("/tmp/pod_start.sh", "wb").write(sh)
env = dict(os.environ, KAGGLE="1", MAXH="11", **{k: str(v) for k, v in p.items()})
with open(f"{W}/run.log", "w") as log:
    r = subprocess.run(["bash", "/tmp/pod_start.sh"], env=env, stdout=log, stderr=subprocess.STDOUT)
print(open(f"{W}/status.txt").read() if os.path.exists(f"{W}/status.txt") else "brak status.txt", "exit", r.returncode)
