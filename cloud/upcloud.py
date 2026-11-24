"""UpCloud: stawia N serwerów (GPU albo duże CPU), każdy renderuje swój zakres klatek przez pod_start.sh,
pobiera części z portu 8000, skleja z audio i KASUJE serwery (także przy błędzie / Ctrl+C).

python cloud/upcloud.py plany [gpu|cpu]                      -> lista planów z cenami
python cloud/upcloud.py start StadtE02 0 3734 2 [plan] [strefa]  -> tworzy serwery
python cloud/upcloud.py status | fetch <outdir> | stop
python cloud/upcloud.py film StadtE03 <audio.wav> <wynik.mp4> [serwery=1] [od=0] [plan] [strefa]
python cloud/upcloud.py test [plan] [strefa]                 -> 200 klatek StadtE02, mierzy s/klatkę i koszt

Dostęp API: C:/Users/dimau/.upcloud_key — token z Account → API tokens albo "login:hasło" subkonta API.
Klucz SSH: ~/.ssh/upcloud_ed25519(.pub). Bez klucza w repo, bez wypisywania sekretów.
GPU (L40S, fi-hel2) wymaga konta odblokowanego wpłatą >= 50% kredytu promocyjnego; CPU działa od razu."""
import base64, json, sys, time, pathlib, urllib.request, urllib.error

HOME = pathlib.Path.home()
_K = HOME.joinpath(".upcloud_key").read_text().strip()
AUTH = ("Basic " + base64.b64encode(_K.encode()).decode()) if ":" in _K else ("Bearer " + _K)
PUB = HOME.joinpath(".ssh", "upcloud_ed25519.pub").read_text().strip()
STATE = HOME / ".upcloud_servers.json"
API = "https://api.upcloud.com/1.3"
GPU_PLAN, GPU_ZONE = "GPU-8xCPU-64GB-1xL40S", "fi-hel2"
CPU_PLAN, CPU_ZONE = "HICPU-32xCPU-64GB", "de-fra1"  # limit konta 32 rdz; po podniesieniu limitu -> HICPU-64xCPU-128GB
# GPU: L40S = najlepsza karta do grafiki (WebGL/R3F); H100 to karta obliczeniowa, w rasteryzacji słabsza.
SCRIPT = "https://raw.githubusercontent.com/andyheree-design/stadt-cloud/main/cloud/pod_start.sh"


def api(method, path, body=None):
    r = urllib.request.Request(API + path, json.dumps(body).encode() if body else None, method=method,
                               headers={"Authorization": AUTH, "Content-Type": "application/json"})
    try:
        raw = urllib.request.urlopen(r, timeout=60).read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {path}: {e.code} {e.read().decode()[:400]}") from None
    return json.loads(raw) if raw else {}


def plany(kind="gpu"):
    for p in api("GET", "/plan")["plans"]["plan"]:
        g = "GPU" in p["name"]
        if (kind == "gpu") == g:
            print(f'{p["name"]:32} {p["core_number"]:>3} rdz {p["memory_amount"] // 1024:>4} GB')
    for z in api("GET", "/price")["prices"]["zone"]:
        if z["name"] in (GPU_ZONE, CPU_ZONE):
            print(z["name"], {k: v.get("price") for k, v in z.items() if isinstance(v, dict) and k.startswith("server_plan_")
                              and (("GPU" in k) == (kind == "gpu"))})


def template(gpu):
    for s in api("GET", "/storage/template")["storages"]["storage"]:
        t = s["title"]
        if "Ubuntu" in t and "24.04" in t and (("NVIDIA" in t or "CUDA" in t) == gpu):
            return s["uuid"]
    raise RuntimeError("brak szablonu Ubuntu 24.04" + (" z NVIDIA" if gpu else ""))


def user_data(comp, f, t, gpu, chunk=100):
    env = f"export COMP={comp} FROM={f} TO={t} CHUNK={chunk} MAXH=3 GL={'angle-egl' if gpu else 'swangle'}"
    if not gpu: env += " CONC=1 P=$(( $(nproc) / 2 ))"  # osobne procesy (pomiar 24.11: 16 proc. ~1,9 s/kl, 16 kart w 1 przegl. = timeout)
    return f"#!/bin/bash\n{env}\ncurl -fsSL {SCRIPT} | bash > /var/log/stadt.log 2>&1\n"


def start(comp, a, b, n, plan=None, zone=None, chunk=100):
    a, b, n, chunk = int(a), int(b), int(n), int(chunk); plan = plan or GPU_PLAN; gpu = "GPU" in plan
    zone = zone or (GPU_ZONE if gpu else CPU_ZONE); tpl = template(gpu)
    size = -(-(b - a + 1) // n); servers = []
    try:
        for i in range(n):
            f, t = a + i * size, min(a + (i + 1) * size - 1, b)
            body = {"server": {
                "zone": zone, "title": f"stadt-{comp}-{f}", "hostname": f"stadt-{f}", "plan": plan, "metadata": "yes",
                "storage_devices": {"storage_device": [{"action": "clone", "storage": tpl, "title": f"stadt-{f}",
                                                        "size": 100 if gpu else 60, "tier": "maxiops"}]},
                "networking": {"interfaces": {"interface": [
                    {"type": "public", "ip_addresses": {"ip_address": [{"family": "IPv4"}]}},
                    {"type": "utility", "ip_addresses": {"ip_address": [{"family": "IPv4"}]}}]}},
                "login_user": {"username": "root", "ssh_keys": {"ssh_key": [PUB]}},
                "user_data": user_data(comp, f, t, gpu, chunk)}}
            s = api("POST", "/server", body)["server"]
            servers.append(dict(id=s["uuid"], frm=f, to=t, ip=None, plan=plan, zone=zone, chunk=chunk))
            STATE.write_text(json.dumps(servers))
            print(f"serwer {s['uuid']} {plan} {zone} klatki {f}-{t}")
    except Exception:
        STATE.write_text(json.dumps(servers)); raise
    for s in servers:  # publiczne IP pojawia się po chwili
        for _ in range(30):
            d = api("GET", f"/server/{s['id']}")["server"]
            ips = [x["address"] for x in d["ip_addresses"]["ip_address"] if x["access"] == "public" and x["family"] == "IPv4"]
            if ips: s["ip"] = ips[0]; break
            time.sleep(5)
        print(s["id"], "IP", s["ip"])
    STATE.write_text(json.dumps(servers))


def url(s, path=""): return f"http://{s['ip']}:8000/{path}"


def status():
    bad = False
    for s in json.loads(STATE.read_text()):
        try: st = urllib.request.urlopen(url(s, "status.txt"), timeout=20).read().decode().strip().splitlines()[-1]
        except Exception as e: st = f"(jeszcze startuje: {e.__class__.__name__})"
        print(s["frm"], s["to"], st); bad |= "BLAD KONCOWY" in st
    return bad


def fetch(out):
    out = pathlib.Path(out); out.mkdir(parents=True, exist_ok=True)
    for s in json.loads(STATE.read_text()):
        for a in range(s["frm"], s["to"] + 1, s.get("chunk", 100)):
            f = out / f"part_{a:06d}.mp4"
            if f.exists(): continue
            try: f.write_bytes(urllib.request.urlopen(url(s, f.name), timeout=120).read()); print("pobrano", f.name)
            except Exception: pass


def stop():
    if not STATE.exists(): return
    left = []
    for s in json.loads(STATE.read_text()):
        try:
            try: api("POST", f"/server/{s['id']}/stop", {"stop_server": {"stop_type": "hard", "timeout": "60"}})
            except RuntimeError as e:
                if "SERVER_STATE_ILLEGAL" not in str(e) and "stopped" not in str(e): raise
            for _ in range(40):
                if api("GET", f"/server/{s['id']}")["server"]["state"] == "stopped": break
                time.sleep(5)
            api("DELETE", f"/server/{s['id']}?storages=1&backups=delete"); print("usunięty", s["id"])
        except Exception as e:
            print("NIE USUNIĘTO", s["id"], e); left.append(s)
    STATE.write_text(json.dumps(left))
    if left: print("!!! zostały serwery — usuń ręcznie w hub.upcloud.com, inaczej naliczają opłaty")


def frames(comp):
    import subprocess
    js = ("const {selectComposition}=require('@remotion/renderer');"
          f"selectComposition({{serveUrl:'build',id:'{comp}'}}).then(c=>console.log('FRAMES='+c.durationInFrames))")
    r = subprocess.run(["node", "-e", js], cwd=pathlib.Path(__file__).parent.parent, capture_output=True, text=True, check=True)
    return int(r.stdout.split("FRAMES=")[-1].strip())


def wait_all(out, need, t0, limit=3 * 3600):
    while True:
        if status(): raise SystemExit("serwer zgłosił BLAD KONCOWY — przerywam (err.txt na porcie 8000)")
        fetch(out)
        if all((out / f"part_{a:06d}.mp4").exists() for a in need): return
        if time.time() - t0 > limit: raise SystemExit("ponad limit czasu — przerywam")
        time.sleep(60)


def film(comp, audio, result, n=1, od=0, plan=None, zone=None):
    import subprocess
    total = frames(comp); t0 = time.time(); out = HOME / "stadt-cloud" / "out" / comp
    try:
        start(comp, int(od), total - 1, n, plan, zone)
        need = [a for s in json.loads(STATE.read_text()) for a in range(s["frm"], s["to"] + 1, s.get("chunk", 100))]
        wait_all(out, need, t0)
    finally:
        stop()
    parts = sorted(out.glob("part_*.mp4")); lst = out / "list.txt"
    lst.write_text("".join(f"file '{f.as_posix()}'\n" for f in parts))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-i", audio,
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                    "-movflags", "+faststart", result], check=True)
    print(f"GOTOWE {result} w {(time.time() - t0) / 60:.0f} min — teraz kontrola jakości (klatki, jasność, arkusz)")


def test(plan=None, zone=None):
    """200 klatek ze środka E02 w 16 kawałkach (sceny 3D) — wynik s/klatkę z status.txt, potem kasacja."""
    out = HOME / "stadt-cloud" / "out" / "upcloud_test"; t0 = time.time()
    try:
        start("StadtE02", 1800, 1999, 1, plan, zone, chunk=13)  # 16 kawałków = 16 procesów naraz
        wait_all(out, list(range(1800, 2000, 13)), t0, limit=3600)
        s = json.loads(STATE.read_text())[0]
        print(urllib.request.urlopen(url(s, "status.txt"), timeout=20).read().decode())
    finally:
        stop()
    print(f"test: {(time.time() - t0) / 60:.1f} min ściany (z instalacją)")


if __name__ == "__main__":
    {"plany": plany, "start": start, "status": status, "fetch": fetch, "stop": stop, "film": film,
     "test": test}[sys.argv[1]](*sys.argv[2:])
