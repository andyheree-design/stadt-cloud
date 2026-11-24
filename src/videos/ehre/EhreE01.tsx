// EHRENSACHE E01 „POSITIV” — film. Ujęcia z osi czasu głosów v10 (e01_data.json), ruch ust z obwiedni głośności,
// napisy słowo po słowie (cenzura z pola sub), telefon MAMA, flashback w sepii, Abi w drzwiach, plansza końcowa.
// Audio: miksowane osobno (ffmpeg), tu tylko obraz.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { ComposerReady } from "../../lib/ComposerReady";
import { InkPass, NOINK } from "../bridge/ink";
import { LensBlur } from "../bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH } from "../bridge/grade";
import { buildSet, poseActor, placeTest, swapCast, CAST_IDS, ActorDef, CastId, TestDef, blendExpr } from "./set";
import { buildGlbHuman, loadGlb } from "./glbHuman";
import DATA from "./e01_data.json";

const FPS = 30;
export const GLB_CAST_E01: [CastId, { headScale?: number }][] = [["tarek", { headScale: 1.12 }], ["dilara", { headScale: 1.1 }], ["kevin", { headScale: 1.1 }], ["mama", { headScale: 1.1 }]];
type Line = { id: string; who: CastId; start: number; end: number; sub: string; env: number[] };
const LINES = DATA as unknown as Line[];

// ---------- inscenizacja bazowa (ciągłość planu ogólnego) ----------
const S = (x: number, z: number): [number, number, number] => [x, 0, z];
const BASE: Record<CastId, ActorDef> = {
  tarek: { pos: S(-0.3, 1.55), sit: 1, rotY: -0.35, armL: { out: 0.45, elbow: 0.5 }, armR: { out: 0.4, fwd: 0.2, elbow: 0.7 } },
  dilara: { pos: S(0.78, 1.2), rotY: 0.75, armR: { out: 0.3, fwd: 0.6, elbow: 1.2 }, armL: { out: 0.12, elbow: 0.15 } },
  kevin: { pos: S(-1.05, 1.6), sit: 1, rotY: -0.45, armL: { fwd: 0.5, elbow: 1.0 }, armR: { fwd: 0.5, elbow: 1.0 } },
  mama: { pos: S(1.7, 0.2), rotY: 0.3 },
};
const mix = (a: ActorDef, b: Partial<ActorDef>): ActorDef => ({ ...a, ...b, armL: { ...(a.armL || {}), ...(b.armL || {}) }, armR: { ...(a.armR || {}), ...(b.armR || {}) } });

type Cam = { who?: CastId; dist?: [number, number]; dy?: number; yaw?: [number, number]; dx?: number;
  eye?: [number, number, number][]; look?: [number, number, number][]; fov: number; shake?: number; exp?: number };
type Shot = { t0: number; t1: number; cam: Cam; cast: (u: number) => Partial<Record<CastId, Partial<ActorDef>>>; test?: (u: number) => TestDef | undefined; fx?: "sepia" };

const TEST_R: TestDef = { who: "dilara", side: "R", rot: [0, 0, 0.1] };
const SHOTS: Shot[] = [
  // 1. HOOK: test przed twarzą Tareka (świat), napis na górze
  { t0: 0, t1: 2.3, cam: { who: "tarek", dist: [0.95, 0.78], dy: -0.11, yaw: [0.1, 0.05], fov: 34, shake: 0.4 },
    cast: () => ({ tarek: { face: { startle: 0.8, fear: 0.2 }, faceX: { sweat: 0.8 }, headPitch: -0.04 }, dilara: {}, kevin: {} }),
    test: () => ({ pos: [0, 0, 0], rot: [0, 0, 0.08], scale: 1.0, who: undefined, side: undefined, ...{ rel: "tarek" } } as any) },
  // 2. Dilara krzyczy, test w dłoni
  { t0: 2.3, t1: 4.45, cam: { who: "dilara", dist: [1.15, 0.95], dy: -0.12, yaw: [0.45, 0.4], fov: 32, shake: 0.5 },
    cast: () => ({ dilara: { face: { angry: 0.9, determined: 0.1 }, armR: { fwd: 1.25, out: 0.2, elbow: 0.9 }, headPitch: -0.05 }, tarek: {}, kevin: {} }), test: () => TEST_R },
  // 3. Tarek nerwowo: „Baby… Corona-Test”
  { t0: 4.45, t1: 7.08, cam: { who: "tarek", dist: [1.05, 0.9], dy: -0.1, yaw: [-0.2, -0.28], fov: 32, shake: 0.3 },
    cast: () => ({ tarek: { face: { fear: 0.4, smile: 0.4, startle: 0.2 }, faceX: { sweat: 0.6 }, armR: { fwd: 0.6, out: 0.3, elbow: 1.4 }, headTilt: 0.08 }, dilara: {}, kevin: {} }), test: () => TEST_R },
  // 4. Dilara: „SCHWANGER 3+, du Hund!” — test ku kamerze
  { t0: 7.08, t1: 9.42, cam: { who: "dilara", dist: [0.95, 0.8], dy: -0.14, yaw: [0.35, 0.3], fov: 32, shake: 0.6 },
    cast: () => ({ dilara: { face: { angry: 1.0 }, armR: { fwd: 1.5, out: 0.1, elbow: 0.35 }, headPitch: -0.08 }, tarek: {}, kevin: {} }), test: () => TEST_R },
  // 5. Tarek panika + uderzenie wężem od shishy (11.25–11.6)
  { t0: 9.42, t1: 11.9, cam: { who: "tarek", dist: [1.0, 0.85], dy: -0.1, yaw: [-0.15, -0.2], fov: 32, shake: 0.6 },
    cast: (u) => { const t = 9.42 + u * 2.48, hit = t > 11.4 ? Math.exp(-(t - 11.4) * 5) : 0;
      return { tarek: { face: hit > 0.05 ? { startle: 0.6, angry: 0.4 } : { fear: 0.7, startle: 0.3 }, faceX: { sweat: 0.9 }, headYaw: -0.5 * hit, headTilt: 0.25 * hit, armL: { out: 0.6, fwd: 0.5, elbow: 1.3 }, armR: { out: 0.6, fwd: 0.5, elbow: 1.3 } }, dilara: {}, kevin: {} }; } },
  // 6a/6b. Kevin rzeczowo: „Rein theoretisch…”
  { t0: 11.9, t1: 13.9, cam: { who: "kevin", dist: [1.2, 1.1], dy: -0.12, yaw: [-0.3, -0.32], fov: 32, shake: 0.2 },
    cast: () => ({ kevin: { face: { neutral: 0.6, smile: 0.4 }, armR: { fwd: 0.9, out: 0.2, elbow: 1.6 } }, tarek: {} }) },
  { t0: 13.9, t1: 15.75, cam: { who: "kevin", dist: [0.85, 0.78], dy: -0.08, yaw: [-0.25, -0.28], fov: 32, shake: 0.2 },
    cast: () => ({ kevin: { face: { smile: 0.5, startle: 0.5 }, faceX: { sweat: 0.4 }, armR: { fwd: 1.0, out: 0.1, elbow: 1.9 } } }) },
  // 7. Tarek wrzeszczy na Kevina
  { t0: 15.75, t1: 17.8, cam: { who: "tarek", dist: [0.9, 0.75], dy: -0.1, yaw: [0.25, 0.3], fov: 32, shake: 0.9 },
    cast: () => ({ tarek: { face: { angry: 1.0 }, faceX: { sweat: 0.5 }, headYaw: 0.35, lean: 0.15, armR: { fwd: 1.0, out: 0.4, elbow: 0.6 } }, kevin: {}, dilara: {} }) },
  // 8. Dilara: „SELIN?!” — szybki najazd
  { t0: 17.8, t1: 20.05, cam: { who: "dilara", dist: [1.15, 0.72], dy: -0.1, yaw: [0.5, 0.45], fov: 32, shake: 0.7 },
    cast: () => ({ dilara: { face: { angry: 0.8, sad: 0.2 }, headTilt: -0.1, armR: { fwd: 1.2, out: 0.3, elbow: 0.8 } }, tarek: {} }), test: () => TEST_R },
  // 9. Tarek przysięga, szybciej i szybciej → „Und—” (stop-klatka 23.25–23.55)
  { t0: 20.05, t1: 23.55, cam: { who: "tarek", dist: [1.15, 0.7], dy: -0.1, yaw: [-0.1, -0.05], fov: 32, shake: 0.6 },
    cast: () => ({ tarek: { face: { determined: 0.6, fear: 0.4 }, faceX: { sweat: 0.7 }, armR: { fwd: 0.9, out: 0.1, elbow: 2.0 }, armL: { out: 0.7, fwd: 0.3, elbow: 0.9 }, headPitch: -0.05 }, dilara: {} }) },
  // 10. FLASHBACK (sepia): Mama „Isch gehen kurz zu dm.”
  { t0: 23.55, t1: 25.15, fx: "sepia", cam: { who: "mama", dist: [1.3, 1.15], dy: -0.15, yaw: [0.2, 0.25], fov: 32, shake: 0.15 },
    cast: () => ({ mama: { face: { smile: 0.45, neutral: 0.55 }, armL: { out: 0.5, fwd: 0.4, elbow: 1.6 } } }) },
  // 11. Tarek cicho, szok: „Mama war gestern damit bei dm.”
  { t0: 25.15, t1: 27.45, cam: { who: "tarek", dist: [1.3, 0.95], dy: -0.1, yaw: [0.0, 0.05], fov: 32, shake: 0.1 },
    cast: () => ({ tarek: { face: { sad: 0.5, startle: 0.5 }, faceX: { sweat: 0.4 }, headPitch: 0.04, armL: { out: 0.4, elbow: 0.3 }, armR: { out: 0.4, elbow: 0.3 } }, dilara: {} }) },
  // 12a. telefon dzwoni — plan ogólny, wszyscy patrzą na stolik
  { t0: 27.45, t1: 29.6, cam: { eye: [[0.1, 1.68, -2.5], [0.1, 1.58, -2.2]], look: [[0.1, 0.84, 1.2], [0.1, 0.84, 1.2]], fov: 58, shake: 0.2, exp: 0.95 },
    cast: () => ({ tarek: { face: { startle: 0.7, fear: 0.3 }, headPitch: 0.35 }, dilara: { face: { startle: 0.7, sad: 0.3 }, headPitch: 0.35, armR: { fwd: 0.3, out: 0.15, elbow: 0.3 } }, kevin: { face: { fear: 0.6, neutral: 0.4 }, headPitch: 0.3 } }),
    test: () => TEST_R },
  // 12b. Dilara: reakcja, test opuszczony
  { t0: 29.6, t1: 31.85, cam: { who: "dilara", dist: [1.1, 1.0], dy: -0.12, yaw: [0.4, 0.45], fov: 32, shake: 0.15 },
    cast: () => ({ dilara: { face: { startle: 0.8, sad: 0.2 }, headPitch: 0.15, armR: { fwd: 0.2, out: 0.15, elbow: 0.2 } }, tarek: {} }), test: () => TEST_R },
  // 13. „VON WEM, LAN?!” — wielkie zbliżenie, mocny wstrząs
  { t0: 31.85, t1: 33.2, cam: { who: "tarek", dist: [0.62, 0.55], dy: -0.06, yaw: [0.0, 0.0], fov: 32, shake: 1.6 },
    cast: () => ({ tarek: { face: { angry: 0.6, startle: 0.4 }, faceX: { sweat: 1.0 }, lean: 0.12, headPitch: -0.06 } }) },
  // 14a. Tarek powoli odwraca głowę ku Kevinowi
  { t0: 33.2, t1: 34.4, cam: { who: "tarek", dist: [0.95, 0.9], dy: -0.1, yaw: [0.05, 0.1], fov: 32, shake: 0.1 },
    cast: (u) => ({ tarek: { face: { startle: 0.5, angry: 0.5 }, faceX: { sweat: 0.6 }, headYaw: 0.6 * Math.min(1, u * 1.4), rotY: -0.35 + 0.25 * u }, kevin: {} }) },
  // 14b. Kevin wpatruje się w podłogę
  { t0: 34.4, t1: 35.7, cam: { who: "kevin", dist: [1.0, 0.85], dy: -0.12, yaw: [-0.3, -0.3], fov: 32, shake: 0.1 },
    cast: () => ({ kevin: { face: { fear: 0.7, sad: 0.3 }, faceX: { sweat: 1.0 }, headPitch: 0.45, lean: 0.1 }, tarek: {} }) },
  // 15. ABI w drzwiach (sylwetka pod światło)
  { t0: 35.7, t1: 37.1, cam: { eye: [[-0.2, 1.3, -1.2], [0.5, 1.35, -1.2]], look: [[3.3, 1.25, -1.2], [3.3, 1.3, -1.2]], fov: 46, shake: 0.15, exp: 0.9 }, cast: () => ({}) },
];
const END_T0 = 37.1, END_T1 = 39.6;
export const EHRE_E01_FRAMES = Math.round(END_T1 * FPS);

const ease = (u: number) => u * u * (3 - 2 * u);
const lerp3 = (a: [number, number, number][], u: number) => { const p = new THREE.Vector3(...a[0]); return a.length > 1 ? p.lerp(new THREE.Vector3(...a[1]), ease(u)) : p; };
const noise = (t: number, s: number) => Math.sin(t * 1.7 + s) * 0.5 + Math.sin(t * 3.1 + s * 2.3) * 0.3 + Math.sin(t * 5.3 + s * 0.7) * 0.2;
const lineAt = (t: number) => LINES.filter((l) => t >= l.start && t < l.end);
const envOf = (id: CastId, t: number) => {
  let v = 0;
  for (const l of LINES) if (l.who === id && t >= l.start && t < l.end) { const i = Math.floor((t - l.start) * FPS); v = Math.max(v, l.env[i] ?? 0); }
  return v;
};
const FREEZE0 = 23.25, FREEZE1 = 23.55;
const sceneTime = (t: number) => (t >= FREEZE0 && t < FREEZE1 ? FREEZE0 : t);

// ---------- Abi: prawdziwy model (abi.glb) jako czarna sylwetka 2,3 m pod światło w drzwiach ----------
const ABI_M = new THREE.MeshBasicMaterial({ color: "#07050a" });
const buildAbi = (gltf: any) => {
  const g = new THREE.Group();
  const h = buildGlbHuman(gltf, {});
  h.group.traverse((o: any) => { o.layers.set(NOINK); if (o.isMesh) { o.material = ABI_M; o.castShadow = false; } });
  h.pose({ pos: [0, 0, 0], rotY: Math.PI / 2, armL: { out: 0.17, fwd: 0.0, elbow: 0.1 }, armR: { out: 0.17, fwd: 0.0, elbow: 0.1 }, headPitch: -0.3, lean: 0.06, handL: { curl: 0.3 }, handR: { curl: 0.3 } });
  h.group.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(h.group, true);
  const k = 2.3 / (b.max.y - b.min.y); const w = new THREE.Group(); w.add(h.group); w.scale.setScalar(k); g.add(w);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.1), new THREE.MeshBasicMaterial({ color: "#FFF1C9" }));
  glow.rotation.y = -Math.PI / 2; glow.position.set(0.2, 1.05, 0); glow.layers.set(NOINK); g.add(glow);
  g.position.set(3.0, 0, -1.2);
  return g;
};
// ---------- wąż od shishy: zamach przez twarz Tareka ----------
const hoseMat = new THREE.MeshToonMaterial({ color: "#1C6E8C" });

const Inner: React.FC<{ t: number }> = ({ t }) => {
  const { camera, scene } = useThree();
  const set = useMemo(buildSet, []);
    const hose = useMemo(() => { const h = new THREE.Mesh(new THREE.BufferGeometry(), hoseMat); set.root.add(h); return h; }, [set]);
  const [glb, setGlb] = useState<any>(null);
  const [handle] = useState(() => delayRender("ehre glb"));
  useEffect(() => { Promise.all([...GLB_CAST_E01.map(([id]) => id as string), "abi"].map((id) => loadGlb(staticFile(`ehre/${id}.glb`)))).then(setGlb).catch((e) => { cancelRender(e); }); }, [handle]);
  const advance = useThree((st) => st.advance);
  useEffect(() => { if (glb) requestAnimationFrame(() => requestAnimationFrame(() => { advance(performance.now()); continueRender(handle); })); }, [glb, handle, advance]);
  useMemo(() => { if (glb && !glb.failed) GLB_CAST_E01.forEach(([id, o], i) => swapCast(set, id, buildGlbHuman(glb[i], o))); }, [glb, set]);
  const abi = useMemo(() => { if (!glb || glb.failed) return null; const a = buildAbi(glb[GLB_CAST_E01.length]); set.root.add(a); return a; }, [glb, set]);
  useMemo(() => { scene.background = new THREE.Color("#3b2a44"); }, [scene]);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);

  const st = sceneTime(Math.min(t, END_T0 - 0.001));
  const sh = SHOTS.find((s) => st >= s.t0 && st < s.t1) ?? SHOTS[SHOTS.length - 1];
  const u = Math.max(0, Math.min(1, (st - sh.t0) / (sh.t1 - sh.t0)));
  const k = sh.cam.exp ?? 1; set.hemi.intensity = 1.8 * k; set.key.intensity = 3.0 * k;
  set.bar.update(st);
  const over = sh.cast(u);
  CAST_IDS.forEach((id, i) => {
    if (!(id in over)) { poseActor(set.cast[id], undefined); return; }
    const a = mix(BASE[id], over[id] as Partial<ActorDef>);
    const e = envOf(id, st), fb = blendExpr(a.face ?? { neutral: 1 });
    const bl = ((st + i * 1.37) % 3.3) < 0.13 ? 1 : 0;
    a.faceX = { ...(a.faceX || {}), mouthOpen: (fb.mouthOpen ?? 0) * 0.35 + Math.min(1, e) * 0.95, jaw: Math.min(1, e) * 0.5, blink: bl };
    a.headYaw = (a.headYaw ?? 0) + 0.035 * noise(st * 0.8, i * 3);
    a.headPitch = -(a.headPitch ?? 0) + 0.02 * noise(st * 0.9, i * 5 + 1) - e * 0.04;
    poseActor(set.cast[id], a);
  });
  if (abi) abi.visible = sh === SHOTS[SHOTS.length - 1];
  // test: w dłoni Dilary albo w świecie przed twarzą Tareka (hook)
  const td = sh.test?.(u) as any;
  if (td && td.rel) {
    set.root.updateMatrixWorld(true); const p = set.cast.tarek.skull.getWorldPosition(new THREE.Vector3());
    placeTest(set, { pos: [p.x - 0.07 + 0.01 * Math.sin(st * 2), p.y - 0.19 + 0.008 * Math.sin(st * 3.1), p.z - 0.36], rot: [0, 0, 0.08], scale: 0.78 });
  } else placeTest(set, td);
  // wąż: zamach 11.25–11.6
  const sw = (st - 11.22) / 0.33;
  if (sw > 0 && sw < 1.6) {
    set.root.updateMatrixWorld(true); const p = set.cast.tarek.skull.getWorldPosition(new THREE.Vector3());
    const s = Math.min(1, sw), x = p.x + 0.45 - 0.9 * ease(s);
    const pts = [new THREE.Vector3(0.28, 0.9, 0.85), new THREE.Vector3(0.5, 1.2, 0.6), new THREE.Vector3(x + 0.25, p.y - 0.02, p.z - 0.25), new THREE.Vector3(x, p.y - 0.09, p.z - 0.13), new THREE.Vector3(x - 0.18, p.y - 0.15 - 0.2 * s, p.z - 0.05)];
    hose.geometry.dispose(); hose.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.016, 8); hose.visible = true;
  } else hose.visible = false;
  // kamera
  const cam = camera as THREE.PerspectiveCamera; const c = sh.cam;
  cam.fov = c.fov; cam.updateProjectionMatrix();
  let eye: THREE.Vector3, look: THREE.Vector3;
  if (c.who) {
    set.root.updateMatrixWorld(true); look = set.cast[c.who].skull.getWorldPosition(new THREE.Vector3()); look.y += c.dy ?? -0.1;
    const d = c.dist![0] + (c.dist![1] - c.dist![0]) * ease(u), yw = c.yaw![0] + (c.yaw![1] - c.yaw![0]) * u;
    eye = look.clone().add(new THREE.Vector3(-Math.sin(yw) * d, 0.04, -Math.cos(yw) * d));
  } else { eye = lerp3(c.eye!, u); look = lerp3(c.look!, u); }
  const sk = (c.shake ?? 0.2) * 0.012;
  const tt = t; // wstrząs też w stop-klatce? nie — zamrożony
  const ts = st === FREEZE0 && t > FREEZE0 ? FREEZE0 : tt;
  eye.add(new THREE.Vector3(noise(ts * 2.2, 1) * sk, noise(ts * 2.0, 7) * sk, 0));
  look.add(new THREE.Vector3(noise(ts * 2.6, 3) * sk * 0.6, noise(ts * 2.4, 9) * sk * 0.6, 0));
  // uderzenie: szarpnięcie kamery
  if (st > 11.38 && st < 11.8) { const a = Math.exp(-(st - 11.38) * 9) * 0.03; eye.x += a * Math.sin(st * 90); eye.y += a * Math.cos(st * 70); }
  cam.position.copy(eye); cam.lookAt(look);
  // Keep the entire result window visible throughout the hook's camera push-in.
  cam.updateMatrixWorld(true);
  if (td?.rel) {
    for (let pass = 0; pass < 2; pass++) {
      set.root.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(set.test), center = b.getCenter(new THREE.Vector3());
      const depth = center.clone().project(cam).z;
      const target = new THREE.Vector3(0, -0.54, depth).unproject(cam);
      set.test.position.add(target.sub(center)); set.root.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(set.test); let lo = Infinity, hi = -Infinity;
      for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
        const sx = new THREE.Vector3(x, y, z).project(cam).x; lo = Math.min(lo, sx); hi = Math.max(hi, sx);
      }
      set.test.scale.multiplyScalar(Math.min(1, 1.65 / (hi - lo)));
    }
  }

  cam.layers.enable(NOINK);
  fx.lens.focus = eye.distanceTo(look); fx.lens.cInf = c.who ? 9 : 5;
  return (
    <>
      <primitive object={set.root} dispose={null} />
      <EffectComposer multisampling={4}>
        <primitive object={fx.ink} dispose={null} />
        <primitive object={fx.lens.pre} dispose={null} />
        <primitive object={fx.lens.main} dispose={null} />
        <primitive object={fx.tone} dispose={null} />
        <primitive object={fx.grade} dispose={null} />
      </EffectComposer>
    </>
  );
};

// ---------- nakładki 2D ----------
const NAME: Record<CastId, [string, string]> = { tarek: ["TAREK", "#FF9F1C"], dilara: ["DILARA", "#FF4FA3"], kevin: ["KEVIN", "#4FC3FF"], mama: ["MAMA", "#B8F25A"] };
const stroke = (w: number) => ({ WebkitTextStroke: `${w}px #000`, paintOrder: "stroke fill" as const });
const Captions: React.FC<{ t: number }> = ({ t }) => {
  const ls = lineAt(t); if (!ls.length || t >= END_T0) return null;
  const l = ls[ls.length - 1];
  const words = l.sub.split(/\s+/); const w8 = words.map((w) => w.length + 2); const tot = w8.reduce((a, b) => a + b, 0);
  const p = (t - l.start) / (l.end - l.start - 0.15); let acc = 0, cur = 0;
  for (let i = 0; i < words.length; i++) { acc += w8[i] / tot; if (p < acc) { cur = i; break; } cur = i; }
  const phone = (l.who === "mama" && l.start > 27);
  const [nm, col] = NAME[l.who];
  return (
    <div style={{ position: "absolute", left: 70, right: 150, bottom: 560, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ fontFamily: "Arial Black, Arial, sans-serif", fontSize: 34, color: "#000", background: col, padding: "4px 16px", borderRadius: 10, marginBottom: 12, letterSpacing: 2 }}>{phone ? "📱 " : ""}{nm}</div>
      <div style={{ fontFamily: "Arial Black, Arial, sans-serif", fontSize: 60, lineHeight: 1.12, color: "#fff", ...stroke(12) }}>
        {words.map((w, i) => <span key={i} style={{ color: i === cur ? "#FFE14A" : i < cur ? "#fff" : "rgba(255,255,255,0.92)", display: "inline-block", transform: i === cur ? "scale(1.06)" : "none", margin: "0 14px" }}>{w}</span>)}
      </div>
    </div>
  );
};
const Hook: React.FC<{ t: number }> = ({ t }) => {
  if (t > 2.6) return null; const a = Math.min(1, t * 6) * Math.min(1, (2.6 - t) * 6);
  return (
    <div style={{ position: "absolute", top: 230, left: 60, right: 60, textAlign: "center", opacity: a, fontFamily: "Arial Black, Arial, sans-serif" }}>
      <div style={{ display: "inline-block", background: "#FFE14A", color: "#000", fontSize: 64, padding: "10px 26px", borderRadius: 14, transform: `rotate(-2deg) scale(${0.9 + 0.1 * Math.min(1, t * 5)})` }}>Der Test ist positiv.</div>
      <div style={{ marginTop: 18, fontSize: 70, color: "#fff", ...stroke(12) }}>Es ist nicht ihrer.</div>
    </div>
  );
};
const Phone: React.FC<{ t: number }> = ({ t }) => {
  const t0 = 27.2; if (t < t0 || t >= END_T0 - 1.4) return null;
  const ring = t < 27.75;
  if (t >= 29.6) return (
    <div style={{ position: "absolute", top: 130, left: 40, background: "rgba(18,18,24,0.9)", borderRadius: 40, padding: "12px 26px", color: "#fff", fontFamily: "Arial, sans-serif", fontSize: 34, fontWeight: 900, border: "3px solid #B8F25A" }}>
      📱 MAMA ❤️ · 00:{String(Math.floor(t - 27.75)).padStart(2, "0")} 🔊
    </div>); const sx = ring ? Math.sin(t * 95) * 8 : 0; const sc = Math.min(1, (t - t0) * 7);
  const secs = Math.max(0, Math.floor(t - 27.75));
  return (
    <div style={{ position: "absolute", top: 210, left: "50%", transform: `translateX(-50%) translateX(${sx}px) scale(${sc})`, width: 560, background: "rgba(18,18,24,0.94)", borderRadius: 46, padding: "34px 30px", color: "#fff", fontFamily: "Arial, sans-serif", textAlign: "center", boxShadow: "0 18px 60px rgba(0,0,0,0.55)", border: "3px solid #333" }}>
      <div style={{ width: 120, height: 120, borderRadius: 60, background: "#B8F25A", color: "#000", fontSize: 64, fontWeight: 900, lineHeight: "120px", margin: "0 auto" }}>M</div>
      <div style={{ fontSize: 58, fontWeight: 900, marginTop: 16 }}>MAMA ❤️</div>
      <div style={{ fontSize: 32, color: ring ? "#B8F25A" : "#bbb", marginTop: 6 }}>{ring ? "eingehender Anruf…" : `00:0${secs} · Lautsprecher 🔊`}</div>
    </div>
  );
};
const EndCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < END_T0) return null; const u = t - END_T0;
  return (
    <AbsoluteFill style={{ background: "#000", alignItems: "center", justifyContent: "center", fontFamily: "Arial Black, Arial, sans-serif", textAlign: "center" }}>
      <div style={{ fontSize: 110, color: "#fff", letterSpacing: 6, transform: `scale(${1.15 - 0.15 * Math.min(1, u * 3)})`, opacity: Math.min(1, u * 5) }}>EHRENSACHE</div>
      <div style={{ marginTop: 60, fontSize: 66, color: "#FFE14A", opacity: Math.min(1, Math.max(0, (u - 0.5) * 4)) }}>WER IST DER VATER?</div>
      <div style={{ marginTop: 26, fontSize: 52, color: "#fff", opacity: Math.min(1, Math.max(0, (u - 1.0) * 4)) }}>→ Part 2</div>
    </AbsoluteFill>
  );
};

export const EhreE01: React.FC = () => {
  const f = useCurrentFrame(); const t = f / FPS;
  const st = sceneTime(t); const sh = SHOTS.find((s) => st >= s.t0 && st < s.t1);
  const sepia = sh?.fx === "sepia"; const frz = t >= FREEZE0 && t < FREEZE1;
  const zoom = frz ? 1 + 0.08 * ease((t - FREEZE0) / (FREEZE1 - FREEZE0)) : 1;
  const filt = sepia ? "sepia(0.85) contrast(1.1) brightness(0.95)" : frz ? "grayscale(1) contrast(1.35)" : "none";
  // biały błysk na wejściu/wyjściu flashbacku i przy uderzeniu
  const flash = Math.max(Math.exp(-Math.abs(t - 23.55) * 18), Math.exp(-Math.abs(t - 25.15) * 18), Math.exp(-Math.abs(t - 11.42) * 25) * 0.6);
  return (
    <AbsoluteFill style={{ background: "#3b2a44" }}>
      <AbsoluteFill style={{ filter: filt, transform: `scale(${zoom})` }}>
        <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
          camera={{ fov: 32, near: 0.03, far: 60 }}>
          <Inner t={t} />
          <ComposerReady />
        </ThreeCanvas>
      </AbsoluteFill>
      {sepia && <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(40,20,0,0.75) 100%)" }} />}
      {sepia && <div style={{ position: "absolute", top: 240, width: "100%", textAlign: "center", fontFamily: "Arial Black, Arial, sans-serif", fontSize: 64, color: "#fff", ...stroke(10) }}>GESTERN…</div>}
      {flash > 0.02 && <AbsoluteFill style={{ background: "#fff", opacity: Math.min(1, flash) }} />}
      <Hook t={t} />
      <Phone t={t} />
      <Captions t={t} />
      <EndCard t={t} />
    </AbsoluteFill>
  );
};
