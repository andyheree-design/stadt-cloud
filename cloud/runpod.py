"""RunPod: odpala N podów GPU równolegle, każdy renderuje swój zakres; pobiera części.
python cloud/runpod.py start StadtE02 693 3734 4   -> tworzy 4 pody
python cloud/runpod.py status | fetch <outdir> | stop
Klucz API: C:/Users/dimau/.runpod_key (poza repo)."""
import json, sys, time, pathlib, urllib.request
KEY = pathlib.Path.home().joinpath(".runpod_key").read_text().strip()
STATE = pathlib.Path.home() / ".runpod_pods.json"
GPUS = ["NVIDIA GeForce RTX 4090", "NVIDIA GeForce RTX 3090", "NVIDIA RTX A5000", "NVIDIA RTX A4000", "NVIDIA L4"]
def gql(q):
    r = urllib.request.Request("https://api.runpod.io/graphql", json.dumps({"query": q}).encode(),
                               {"Content-Type": "application/json", "Authorization": f"Bearer {KEY}"})
    d = json.load(urllib.request.urlopen(r, timeout=60))
    if d.get("errors"): raise RuntimeError(d["errors"][0]["message"])
    return d["data"]
def start(comp, a, b, n):
    a, b, n = int(a), int(b), int(n); size = -(-(b - a + 1) // n); pods = []
    for i in range(n):
        f, t = a + i * size, min(a + (i + 1) * size - 1, b)
        env = [{"key": k, "value": str(v)} for k, v in dict(COMP=comp, FROM=f, TO=t, NVIDIA_DRIVER_CAPABILITIES="all").items()]
        cmd = "bash -c 'apt-get update -qq && apt-get install -y -qq curl >/dev/null; curl -fsSL https://raw.githubusercontent.com/andyheree-design/stadt-cloud/main/cloud/pod_start.sh | bash'"
        for g in GPUS:
            try:
                d = gql("mutation{podFindAndDeployOnDemand(input:{cloudType:ALL,gpuCount:1,gpuTypeId:%s,name:%s,"
                        "imageName:\"nvidia/cuda:12.4.1-runtime-ubuntu22.04\",containerDiskInGb:30,minVcpuCount:8,minMemoryInGb:24,"
                        "ports:\"8000/http\",dockerArgs:%s,env:%s}){id costPerHr machine{gpuDisplayName}}}" % (
                        json.dumps(g), json.dumps(f"stadt-{f}"), json.dumps(cmd),
                        json.dumps(env).replace('"key"', 'key').replace('"value"', 'value')))
                p = d["podFindAndDeployOnDemand"]; p.update(frm=f, to=t); pods.append(p)
                print(f"pod {p['id']} {g} ${p['costPerHr']}/h klatki {f}-{t}"); break
            except Exception as e: print(f"  {g}: {e}")
    STATE.write_text(json.dumps(pods))
def url(p, path=""): return f"https://{p['id']}-8000.proxy.runpod.net/{path}"
def status():
    for p in json.loads(STATE.read_text()):
        try: s = urllib.request.urlopen(url(p, "status.txt"), timeout=20).read().decode().strip().splitlines()[-1]
        except Exception as e: s = f"(jeszcze startuje: {e.__class__.__name__})"
        print(p["frm"], p["to"], s)
def fetch(out):
    out = pathlib.Path(out); out.mkdir(parents=True, exist_ok=True)
    for p in json.loads(STATE.read_text()):
        for a in range(p["frm"], p["to"] + 1, 100):
            f = out / f"part_{a:06d}.mp4"
            if f.exists(): continue
            try: f.write_bytes(urllib.request.urlopen(url(p, f.name), timeout=120).read()); print("pobrano", f.name)
            except Exception: pass
def stop():
    for p in json.loads(STATE.read_text()):
        gql('mutation{podTerminate(input:{podId:%s})}' % json.dumps(p["id"])); print("usunięty", p["id"])
if __name__ == "__main__": {"start": start, "status": status, "fetch": fetch, "stop": stop}[sys.argv[1]](*sys.argv[2:])
