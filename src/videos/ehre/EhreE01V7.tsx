// EHRENSACHE E01 „POSITIV” — film. Ujęcia z osi czasu głosów v10 (e01_data.json), ruch ust z obwiedni głośności,
// napisy słowo po słowie (cenzura z pola sub), telefon MAMA, flashback w sepii, Abi w drzwiach, plansza końcowa.
// Audio: miksowane osobno (ffmpeg), tu tylko obraz.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {directCoverage} from "./cinematographyV7";
import {emotionalBeat} from "./intentionsV7";
import {solveSmokingGrip} from "./smokingGripV7";
import {directEnding,ENDING_V7,endingWalkTime} from "./endingV7";
import {RoomEnvironment} from "three/examples/jsm/environments/RoomEnvironment.js";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { ComposerReady } from "../../lib/ComposerReady";
import { InkPass, NOINK } from "../bridge/ink";
import { LensBlur } from "../bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH } from "../bridge/grade";
import { buildSet, poseActor, placeTest, swapCast, CAST_IDS, ActorDef, CastId, TestDef, blendExpr } from "./set";
import { buildGlbHuman, loadGlb } from "./glbHumanV7";
import {buildHomeV7,attachHomePlant,hoseCurveV7} from "./detailV7";
import {enrichPose,applyLiving,makePhone,mouthpiece,shoppingBag,animateTarekPhone,protectBag} from "./performanceV7";
import {applyRetarget} from "./retargetV7";
import DATA from "./e01_data.json";
import {captureNames,capturedPose,applySeriesCapture} from "./seriesMotionV7";
import {phonemePerformance} from "./phonemesV7";
import {solveThumbGrip} from "./handGripV7";
import {buildLoungeV7,attachLoungeAssets,environmentAssets} from "./seriesLoungeV7";
import {hoseCurve,smokeSprites,sceneAudit,fitTestGrip} from "./sceneDetailV6";
import {buildHome} from "./seriesHomeV5";
import {seriesActing} from "./seriesActingV7";

const FPS = 30;
export const SERIES_CAST: [CastId, { headScale?: number }][] = [["tarek", { headScale: 1.02 }], ["dilara", { headScale: 1.0 }], ["kevin", { headScale: 1.0 }], ["mama", { headScale: 1.0 }]];
type Line = { id: string; who: CastId; start: number; end: number; sub: string; env: number[] };
const LINES = DATA as unknown as Line[];

// ---------- inscenizacja bazowa (ciągłość planu ogólnego) ----------
const S = (x: number, z: number): [number, number, number] => [x, 0, z];
const BASE: Record<CastId, ActorDef> = {
  tarek: {pos:S(-0.30,1.62),sit:1,rotY:-0.12,armL:{out:0.16,elbow:0.65},armR:{out:0.14,elbow:0.65}},
  dilara: {pos:S(0.82,0.95),rotY:1.32,armR:{out:0.13,fwd:0.45,elbow:0.65},armL:{out:0.1,elbow:0.1}},
  kevin: {pos:S(-1.12,1.65),sit:1,rotY:-0.12,armL:{out:0.1,elbow:0.7},armR:{out:0.1,elbow:0.7}},
  mama: {pos:S(0.35,1.2),rotY:0.12,armL:{out:0.1,elbow:0.3},armR:{out:0.12,elbow:0.4}},
};
const mix = (a: ActorDef, b: Partial<ActorDef>): ActorDef => ({ ...a, ...b, armL: { ...(a.armL || {}), ...(b.armL || {}) }, armR: { ...(a.armR || {}), ...(b.armR || {}) } });

type Cam = { who?: CastId; dist?: [number, number]; dy?: number; yaw?: [number, number]; dx?: number;
  eye?: [number, number, number][]; look?: [number, number, number][]; fov: number; shake?: number; exp?: number };
type Shot = { t0: number; t1: number; cam: Cam; cast: (u: number) => Partial<Record<CastId, Partial<ActorDef>>>; test?: (u: number) => TestDef | undefined; fx?: "sepia" };

const TEST_R: TestDef = { who: "dilara", side: "R", pos: [-.075, 0, 0], rot: [0, 0, 0.1] };
const PERFORMANCES: Shot[] = [
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
// Coverage stays on the same side of the conversation axis. Cuts follow beats, not every line.
const coverage = (t0:number,t1:number, eye:[number,number,number],look:[number,number,number], fov=40):Shot =>
  ({t0,t1,cam:{eye:[eye,[eye[0]+0.035,eye[1],eye[2]+0.07]],look:[look],fov,shake:0.025},cast:()=>({})});
const SHOTS:Shot[] = [
  coverage(0,4.436,[-0.2,1.58,-4.9],[0,.90,1.25],47),
  coverage(4.436,7.175,[1.6,1.52,-1.5],[0.05,1.05,1.35],42),
  coverage(7.175,11.558,[-1.0,1.52,-2.2],[0.32,1.05,1.25],48),
  coverage(11.558,12.0,[-0.7,1.40,-1.95],[-0.70,0.96,1.6],44),
  coverage(12.0,13.8,[.12,1.23,-.1],[-.30,1.10,1.62],38),
  coverage(13.8,17.809,[-0.7,1.52,-2.6],[-0.60,1.15,1.6],46),
  coverage(17.809,23.55,[-0.65,1.52,-2.3],[0.25,1.02,1.28],48),
  coverage(23.55,25.15,[1.8,1.50,2.05],[.65,1.12,1.35],48),
  coverage(25.15,29.6,[-0.2,1.58,-4.9],[0,.90,1.25],47),
  coverage(29.6,31.85,[-.1,1.46,-.9],[.65,1.18,1.35],38),
  coverage(31.85,33.2,[1.6,1.52,-1.5],[0.05,1.05,1.35],42),
  coverage(33.2,35.7,[-0.6,1.42,-1.7],[-0.65,.96,1.6],40),
  coverage(35.7,37.1,[1.0,1.08,-2.55],[2.75,1.12,-1.2],46),
];
const END_T0 = ENDING_V7.card, END_T1 = ENDING_V7.end;
export const EHRE_SERIES_FRAMES = Math.round(END_T1 * FPS);

const ease = (u: number) => u * u * (3 - 2 * u);
const lerp3 = (a: [number, number, number][], u: number) => { const p = new THREE.Vector3(...a[0]); return a.length > 1 ? p.lerp(new THREE.Vector3(...a[1]), ease(u)) : p; };
const noise = (t: number, s: number) => Math.sin(t * 1.7 + s) * 0.5 + Math.sin(t * 3.1 + s * 2.3) * 0.3 + Math.sin(t * 5.3 + s * 0.7) * 0.2;
const lineAt = (t: number) => LINES.filter((l) => t >= l.start && t < l.end);
const envOf = (id: CastId, t: number) => {
  let v = 0;
  for (const l of LINES) if (l.who === id && t >= l.start && t < l.end) { const i = Math.floor((t - l.start) * FPS); v = Math.max(v, [0,1,2,3,4].reduce((a,k)=>a+(l.env[Math.max(0,i-k)]??0),0)/5); }
  return v;
};
const FREEZE0 = 23.25, FREEZE1 = 23.55;
const sceneTime = (t: number) => t;

// ---------- Abi: prawdziwy model (abi.glb) jako czarna sylwetka 2,3 m pod światło w drzwiach ----------
const ABI_M = new THREE.MeshBasicMaterial({ color: "#07050a" });
const buildAbi=(gltf:any)=>{
 const c=buildGlbHuman(gltf,{natural:true});c.group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(c.group,true);
 c.group.scale.setScalar(2.02/(bounds.max.y-bounds.min.y));return c;
};
// ---------- wąż od shishy: zamach przez twarz Tareka ----------
const hoseMat = new THREE.MeshStandardMaterial({color:"#30283c",roughness:.74,metalness:.06});

const Inner: React.FC<{ t: number; draft?:boolean }> = ({ t,draft=false }) => {
  const { camera, scene,gl:renderer } = useThree();
  useEffect(()=>{const room=new RoomEnvironment(),generator=new THREE.PMREMGenerator(renderer),target=generator.fromScene(room,.04);scene.environment=target.texture;scene.environmentIntensity=.30;return()=>{scene.environment=null;target.dispose();generator.dispose();room.dispose();};},[scene,renderer]);
  const set = useMemo(() => {
    const s = buildSet();
    s.bar.group.traverse((o:any)=>{if(!o.isMesh)return;
      const convert=(m:any)=>m.isMeshToonMaterial ? new THREE.MeshStandardMaterial({color:m.color,map:m.map,roughness:0.85,transparent:m.transparent,opacity:m.opacity,side:m.side}) : m;
      o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
    });
    s.root.remove(s.bar.group);s.bar=buildLoungeV7(s.bar);s.root.add(s.bar.group);
    s.hemi.color.set("#e6ecf3");s.hemi.groundColor.set("#5a5048");s.key.color.set("#fff4e9");
    s.root.traverse((o:any)=>{if(o.isDirectionalLight&&o!==s.key){o.color.set("#d3dce6");o.intensity=.65;}});
    return s;
  }, []);
  const home = useMemo(buildHomeV7, []);
    const hose = useMemo(() => { const h = new THREE.Mesh(new THREE.BufferGeometry(), hoseMat); set.root.add(h); return h; }, [set]);
  const smoking = useMemo(()=>{
    const tip=mouthpiece();
    set.root.add(tip);
    const vapour=smokeSprites();set.root.add(vapour);
    return {tip,vapour};
  },[set]);
  const homeProps=useMemo(()=>{const bag=shoppingBag(),phone=makePhone('Tarek');set.root.add(bag,phone);return {bag,phone};},[set]);
  const tarekPhone=useMemo(()=>{const phone=makePhone();set.root.add(phone);set.bar.table.traverse((o:any)=>{if(o.isMesh&&o.geometry.type==='BoxGeometry'&&o.geometry.parameters.width===.075)o.visible=false;});return phone;},[set]);
  const [glb, setGlb] = useState<any>(null);
  const [clips,setClips]=useState<any>(null);
  const [nativeMotion,setNativeMotion]=useState<any>(null);
  const [handle] = useState(() => delayRender("ehre glb"));
  useEffect(()=>{Promise.all([
    Promise.all([...SERIES_CAST.map(([id])=>id as string),'abi'].map(id=>loadGlb(staticFile(`ehre/v7/${id==='abi'?'abi_cinematic':id+'_cinematic'}.glb`)))),
    Promise.all(captureNames.map(name=>fetch(staticFile(`ehre/v5/${name}.json`)).then(r=>r.json()))),
    Promise.all(environmentAssets.map(id=>loadGlb(staticFile(`ehre/v6/vendor/${id}/${id}.gltf`)))),
    Promise.all(CAST_IDS.map(id=>loadGlb(staticFile(`ehre/v7/${id}_conversation_rokoko.glb`))))
  ]).then(([models,motion,environment,native])=>{setNativeMotion(Object.fromEntries(CAST_IDS.map((id,i)=>[id,native[i].animations[0]])));attachLoungeAssets(set.bar,environment);attachHomePlant(home,environment[2]);setClips(Object.fromEntries(captureNames.map((name,i)=>[name,motion[i]])));setGlb(models);}).catch(cancelRender);},[handle]);
  const advance = useThree((st) => st.advance);
  useEffect(() => { if (glb) requestAnimationFrame(() => requestAnimationFrame(() => { advance(performance.now()); continueRender(handle); })); }, [glb, handle, advance]);
  useMemo(() => { if (glb && !glb.failed) SERIES_CAST.forEach(([id, o], i) => {
    const c=buildGlbHuman(glb[i], {...o,natural:true});
    c.group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(c.group,true);
    const stature={tarek:1.78,dilara:1.66,kevin:1.82,mama:1.60}[id];
    const unitHeight=bounds.max.y-bounds.min.y;
    swapCast(set,id,c);c.group.scale.setScalar(stature/unitHeight);
  }); }, [glb, set]);
  const abi = useMemo(() => { if (!glb || glb.failed) return null; const a = buildAbi(glb[SERIES_CAST.length]); set.root.add(a.group); return a; }, [glb, set]);
  useMemo(() => { scene.background = new THREE.Color("#202724"); }, [scene]);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: draft?3.5:7, nearScale: 0.4 }),
    bloom: new BloomEffect({intensity:.32,luminanceThreshold:1.05,luminanceSmoothing:.25,mipmapBlur:true}),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);

  const st = sceneTime(Math.min(t, END_T0 - 0.001));
  const sh = SHOTS.find((s) => st >= s.t0 && st < s.t1) ?? SHOTS[SHOTS.length - 1];
  const u = Math.max(0, Math.min(1, (st - sh.t0) / (sh.t1 - sh.t0)));
  const k = sh.cam.exp ?? 1; set.hemi.intensity = .72 * k; set.key.intensity = 1.8 * k;
  set.bar.update(st);
  const acting = PERFORMANCES.find(s=>st>=s.t0 && st<s.t1);
  const pu=acting ? (st-acting.t0)/(acting.t1-acting.t0) : 0;
  const raw = acting?.cast(pu) ?? {};
  const ai=acting?PERFORMANCES.indexOf(acting):0;
  const previous=ai>0?PERFORMANCES[ai-1].cast(1):raw;
  const fade=acting?ease(Math.min(1,(st-acting.t0)/.24)):1;
  const blend=(a:any,b:any,k:number):any=>{if(typeof b==="number")return (typeof a==="number"?a:b)*(1-k)+b*k;if(b&&typeof b==="object"&&!Array.isArray(b)){const v:any={};for(const key of Object.keys(b))v[key]=blend(a?.[key],b[key],k);return v;}return b;};
  const over:Partial<Record<CastId,Partial<ActorDef>>>={};
  for(const id of CAST_IDS)over[id]=blend(mix(BASE[id],previous[id]??{}),mix(BASE[id],raw[id]??{}),fade);
  const flashback = (st>=23.55&&st<25.15)||(st>=29.6&&st<31.85);
  set.bar.group.visible = !flashback; home.visible=flashback;
  const talker=lineAt(st).filter(l=>l.who!=="mama").slice(-1)[0]?.who ?? "tarek";
  const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
  CAST_IDS.forEach((id, i) => {
    if ((id==="mama") !== flashback || (flashback && id!=="mama")) { poseActor(set.cast[id], undefined); return; }
    let a = mix(BASE[id], (over[id] ?? {}) as Partial<ActorDef>);
    a.rotY=BASE[id].rotY;
    const ramp=(start:number,end:number)=>ease(Math.max(0,Math.min(1,(st-start)/.35)))*(1-ease(Math.max(0,Math.min(1,(st-end)/.35))));
    const towardKevin=Math.max(ramp(11.558,17.809),ramp(33.2,35.7));
    if(id==="tarek"){a.rotY=-.25;a.twist=.55*towardKevin;}
    if(id==="kevin")a.twist=-.45;
    const target:CastId = id==="tarek" ? ((st>11.558 && st<17.809)||st>33.2 ? "kevin":"dilara") : id==="dilara"?"tarek":talker==="kevin"?"tarek":talker;
    if(id!=="mama") {
      const p=BASE[id].pos, q=BASE[target].pos;
      let desired=Math.atan2(-(q[0]-p[0]),-(q[2]-p[2]));
      if(id==='tarek'){
        const angle=(to:CastId)=>Math.atan2(-(BASE[to].pos[0]-p[0]),-(BASE[to].pos[2]-p[2]));
        const d=angle('dilara');desired=d+wrap(angle('kevin')-d)*towardKevin;
      }
      if(id==='kevin')desired=Math.atan2(-(BASE.tarek.pos[0]-p[0]),-(BASE.tarek.pos[2]-p[2]));
      const neckLimit=id==='tarek'||id==='kevin'?1.05:.75;a.headYaw=Math.max(-neckLimit,Math.min(neckLimit,wrap(desired-(a.rotY??0)-(a.twist??0))));
      const phone=ramp(27.45,33.2);a.headYaw*=1-.65*phone;a.headPitch=.12*phone;
    }
    a.faceX={...a.faceX,sweat:0};
    if(id==='mama'){a.face={neutral:.9,smile:.1};a.headYaw=-.14;}
    a=seriesActing(id,st,a,envOf(id,st));
    (a as any).grounded=true;
    if(clips)a=capturedPose(id,st,a,clips);
    // The foot target is expressed in model units: match the root transfer to the
    // actor scale so both shoes remain planted through the entire rise/sit.
    if(id==='tarek'){const transfer=.40*(set.cast[id].group.scale.y-1)*(1-(a.sit??0));a.pos=[a.pos[0]-Math.sin(a.rotY??0)*transfer,a.pos[1],a.pos[2]-Math.cos(a.rotY??0)*transfer];}

    const e = envOf(id, st), fb = blendExpr(a.face ?? { neutral: 1 });
    const blinkPhase=(st+i*1.37)%3.7;
    const bl=blinkPhase<.16?Math.sin(Math.PI*blinkPhase/.16)**2:0;
    a.faceX = { ...(a.faceX || {}), ...phonemePerformance(id,st), blink:bl };
    // Authored gaze only: no perpetual head noise.
    a=emotionalBeat(id,st,enrichPose(id,st,a));
    a.faceX={...a.faceX,...phonemePerformance(id,st)};
    a.headPitch=-(a.headPitch??0);
    poseActor(set.cast[id], a);
    if(clips&&set.cast[id].applyCapture)applySeriesCapture(set.cast[id],id,st,clips);
    if(nativeMotion)applyRetarget(set.cast[id],id,st,nativeMotion[id]);
    if(set.cast[id].addActing)applyLiving(set.cast[id],id,st);
    if(false)console.log('V5_WALK '+JSON.stringify({actor:id,frame:Math.round(st*30),errors:set.cast[id].group.userData.captureLegErrors,ankles:set.cast[id].group.userData.ankleHeights}));
  });
  if(abi){abi.group.visible=st>=35.7;
    if(abi.group.visible){abi.pose({pos:[3.15,0,-1.20],rotY:Math.PI/2,face:{...blendExpr({determined:.6,neutral:.4}),browFurrow:.5,lipPress:.25,eyeOpen:.74},handL:{curl:-.18},handR:{curl:-.18}});
      if(clips)abi.applyCapture(clips.m_waiting_walk,endingWalkTime(st),{legs:true,originTime:1.9,twist:true});
      if(false)console.log('V5_WALK '+JSON.stringify({actor:'abi',frame:Math.round(st*30),errors:abi.group.userData.captureLegErrors,ankles:abi.group.userData.ankleHeights}));
    }
  }
  if(glb){if(!flashback)protectBag(set.cast.tarek,st);animateTarekPhone(set.cast.tarek,tarekPhone,st);if(st>=26.4&&st<35.7)solveThumbGrip(set.cast.tarek,'L',{kind:'phone',phone:tarekPhone},Math.min(1,Math.max(0,(st-26.4)/.3))**2*(3-2*Math.min(1,Math.max(0,(st-26.4)/.3))));tarekPhone.visible=!flashback&&st<35.7;}
  if(glb&&!flashback){for(const id of ['tarek','dilara','kevin'] as CastId[]){const actor=set.cast[id];const to=id==='tarek'?((st>11.558&&st<17.809)||st>33.2?'kevin':'dilara'):'tarek';let target=set.cast[to].mouth.getWorldPosition(new THREE.Vector3());if(st>=26.05&&st<27.35)target=tarekPhone.position.clone();if(id==='kevin'&&st>15.8&&st<18.2)target.y-=.35;actor.gazeAt(target);}}
  // test: w dłoni Dilary albo w świecie przed twarzą Tareka (hook)
  const td = !flashback && st<35.7 ? TEST_R : undefined;
  placeTest(set, td);
  if(td&&glb)fitTestGrip(set.cast.dilara,set.test);
  set.root.updateMatrixWorld(true);
  const active=!flashback&&st<35.7&&!!set.cast.tarek.bones;
  smoking.tip.visible=active;hose.visible=active;
  if(active){
    const gripPose=solveSmokingGrip(set.cast.tarek,st),hand=gripPose.hand,direction=gripPose.axis;
    set.cast.tarek.group.userData.smokingTipError=gripPose.weight>.99?gripPose.tipError:undefined;
    const thumb=solveThumbGrip(set.cast.tarek,'R',{kind:'mouthpiece',hand,axis:direction},1);set.cast.tarek.group.userData.smokingThumbError=thumb.padError;
    smoking.tip.position.copy(hand);smoking.tip.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
    const start=hand.clone().addScaledVector(direction,-.105);
    const port=(set.bar as any).hosePort.getWorldPosition(new THREE.Vector3());
    const geo=new THREE.TubeGeometry(hoseCurveV7(start,port,(set.bar as any).tableBounds,set),128,.009,8,false);hose.geometry.dispose();hose.geometry=geo;
  }
  if(Math.round(st*30)%3===0&&glb&&!flashback)console.log('V7_QA '+JSON.stringify(sceneAudit(set,smoking,st)));
  const smokeAge=st-13.15;
  smoking.vapour.visible=active&&smokeAge>0&&smokeAge<1.4;
  if(smoking.vapour.visible){const face=set.cast.tarek.mouth.getWorldPosition(new THREE.Vector3()),forward=set.cast.tarek.faceForward();
    smoking.vapour.children.forEach((ob:any,n:number)=>{const a=smokeAge-n*.055;ob.visible=a>0;ob.position.copy(face).addScaledVector(forward,.035+a*.31).add(new THREE.Vector3(Math.sin(n*2.4)*a*.045,a*.12,0));ob.scale.setScalar(.023+Math.max(0,a)*.20);ob.material.opacity=Math.max(0,.27*(1-a/1.4));});}


  // kamera
  homeProps.bag.visible=flashback&&!!set.cast.mama.bones;
  homeProps.phone.visible=st>=29.6&&st<31.85&&!!set.cast.mama.bones;
  if(homeProps.bag.visible){const c=set.cast.mama;c.group.updateMatrixWorld(true);if(st<25.15){homeProps.bag.position.copy(c.grip.L.getWorldPosition(new THREE.Vector3()));homeProps.bag.rotation.set(0,-1.05,.045*Math.sin((st-23.55)*7));}else{homeProps.bag.position.set(-.85,1.11,1.98);homeProps.bag.rotation.set(0,0,0);}}
  if(homeProps.phone.visible){homeProps.phone.userData.phoneScreen.material.map=homeProps.phone.userData.callMap;const c=set.cast.mama;const ear=c.mouth.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(.093,.030,.075));homeProps.phone.position.copy(ear);homeProps.phone.rotation.set(0,.1,-.12);c.reachGripWorld(ear.clone().add(new THREE.Vector3(.015,-.046,-.018)));}

  const cam = camera as THREE.PerspectiveCamera; const c = sh.cam;
  cam.fov = c.fov; cam.updateProjectionMatrix();
  let eye: THREE.Vector3, look: THREE.Vector3;
  if (c.who) {
    set.root.updateMatrixWorld(true); look = set.cast[c.who].skull.getWorldPosition(new THREE.Vector3()); look.y += c.dy ?? -0.1;
    const d = c.dist![0] + (c.dist![1] - c.dist![0]) * ease(u), yw = c.yaw![0] + (c.yaw![1] - c.yaw![0]) * u;
    eye = look.clone().add(new THREE.Vector3(-Math.sin(yw) * d, 0.04, -Math.cos(yw) * d));
  } else { eye = lerp3(c.eye!, u); look = lerp3(c.look!, u); }
  const sk = 0;
  const tt = t; // wstrząs też w stop-klatce? nie — zamrożony
  const ts = st === FREEZE0 && t > FREEZE0 ? FREEZE0 : tt;
  eye.add(new THREE.Vector3(noise(ts * 2.2, 1) * sk, noise(ts * 2.0, 7) * sk, 0));
  look.add(new THREE.Vector3(noise(ts * 2.6, 3) * sk * 0.6, noise(ts * 2.4, 9) * sk * 0.6, 0));
  // uderzenie: szarpnięcie kamery
  if (false) { const a = Math.exp(-(st - 11.38) * 9) * 0.03; eye.x += a * Math.sin(st * 90); eye.y += a * Math.cos(st * 70); }
  const rise=st>15.05&&st<23.15?Math.min(1,Math.max(0,(st-15.05)/1.3))*Math.min(1,Math.max(0,(23.15-st)/1.3)):0;
  eye.y+=.10*rise;look.y+=.18*rise;
  if(st>=12&&st<13.8&&set.cast.tarek.faceForward){
    const actor=set.cast.tarek,front=actor.faceForward(),side=front.clone().cross(new THREE.Vector3(0,1,0)).normalize();
    const mouth=actor.mouth.getWorldPosition(new THREE.Vector3());
    eye=mouth.clone().addScaledVector(front,1.35).addScaledVector(side,.95).add(new THREE.Vector3(0,.10,0));
    look=mouth.clone().add(new THREE.Vector3(0,-.045,0));cam.fov=36;cam.updateProjectionMatrix();
  }
  if(st>=35.7&&abi){look=abi.skull.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,-.65,0));eye=look.clone().add(new THREE.Vector3(-2.5,.2,-2));cam.fov=42;cam.updateProjectionMatrix();}
  cam.up.set(0,1,0);
  const close=(id:CastId,dist:number,side:number,down=.14,fov=38)=>{
    const actor=set.cast[id],forward=(id==='mama'&&st<25.15?new THREE.Vector3(1,0,-.2):new THREE.Vector3(0,0,-1).applyQuaternion(actor.group.quaternion)).normalize(),right=forward.clone().cross(new THREE.Vector3(0,1,0));
    const head=actor.skull.getWorldPosition(new THREE.Vector3());
    const anchor=actor.group.position.clone();anchor.y+=(actor.restHeadY??1.65)*actor.group.scale.y-((actor.restPelvisY??.95)*actor.group.scale.y-.53)*(actor.group.userData.sit??0);
    look=anchor.lerp(head,.35).add(new THREE.Vector3(0,-down,0));eye=look.clone().addScaledVector(forward,dist*(1-.008*ease(u))).addScaledVector(right,side).add(new THREE.Vector3(0,.05,0));cam.fov=fov;cam.updateProjectionMatrix();
  };
  if(st<1.85)close('dilara',1.42,-.28,.13,39);
  else if(st<3.10)close('tarek',1.25,-.30,.13,37);
  else if(st>=4.436&&st<7.175)close('tarek',1.75,-.30,.28,41);
  else if(st>=7.175&&st<9.42)close('dilara',1.75,-.30,.24,42);
  else if(st>=9.42&&st<11.558)close('tarek',1.7,-.24,.24,40);
  else if(st>=13.8&&st<15.916)close('kevin',1.65,.28,.23,42);
  else if(st>=17.809&&st<19.65)close('dilara',1.55,-.32,.18,39);
  else if(st>=23.55&&st<25.15)close('mama',2.3,-.65,.38,46);
  else if(st>=26.05&&st<26.40&&tarekPhone){cam.up.set(0,0,1);look=tarekPhone.position.clone();eye=look.clone().add(new THREE.Vector3(.015,.67,.015));cam.fov=38;cam.updateProjectionMatrix();}
  else if(st>=26.40&&st<27.35)close('tarek',2.05,-.60,.20,41);
  else if(st>=27.35&&st<28.95)close('tarek',1.8,-.35,.27,42);
  else if(st>=28.95&&st<29.6)close('dilara',1.65,-.30,.20,40);
  else if(st>=29.6&&st<31.85)close('mama',1.85,-.42,.25,43);
  else if(st>=31.85&&st<33.2)close('tarek',1.6,-.30,.23,40);
  if(draft&&glb){const data:any={frame:Math.round(st*30),phoneVisible:tarekPhone.visible,hoseClearance:set.root.userData.hoseClearance,phone:st>=26.7&&st<35.7?tarekPhone.position.toArray():undefined,actors:{}};
    for(const id of CAST_IDS){const actor=set.cast[id];if(actor.group.visible&&actor.bones)data.actors[id]={head:actor.skull.getWorldPosition(new THREE.Vector3()).toArray(),L:actor.grip.L.getWorldPosition(new THREE.Vector3()).toArray(),R:actor.grip.R.getWorldPosition(new THREE.Vector3()).toArray(),phoneError:actor.group.userData.handErrorL,nativeBones:actor.group.userData.nativeMotionBones};}console.log('V7_JOINT '+JSON.stringify(data));}
  directCoverage(st,close);
  const ending=directEnding(st,set.cast,abi);if(ending){eye=ending.eye;look=ending.look;cam.up.set(0,1,0);cam.fov=ending.fov;cam.updateProjectionMatrix();}
  cam.position.copy(eye); cam.lookAt(look);
  cam.layers.enable(NOINK);
  fx.lens.focus = eye.distanceTo(look); fx.lens.cInf = 1.6;
  return (
    <>
      <primitive object={set.root} dispose={null} /><primitive object={home} dispose={null} />
      <EffectComposer multisampling={4}>

        <primitive object={fx.lens.pre} dispose={null} />
        <primitive object={fx.lens.main} dispose={null} />
        <primitive object={fx.bloom} dispose={null} />
        <primitive object={fx.tone} dispose={null} />

      </EffectComposer>
    </>
  );
};

// Restrained subtitles: phrase groups, no character labels or karaoke effects.
const Captions:React.FC<{t:number}>=({t})=>{
  const l=lineAt(t).slice(-1)[0]; if(!l||t>=END_T0)return null;
  const words=l.sub.split(/\s+/), chunks:string[]=[];let chunk="";
  for(const w of words){if((chunk+" "+w).length>48&&chunk){chunks.push(chunk);chunk=w;}else chunk+=(chunk?" ":"")+w;}
  if(chunk)chunks.push(chunk);
  const weight=chunks.reduce((n,c)=>n+c.length,0);let cursor=Math.max(0,Math.min(.999,(t-l.start)/(l.end-l.start)))*weight;
  let text=chunks[chunks.length-1];for(const c of chunks){if(cursor<c.length){text=c;break;}cursor-=c.length;}
  return <div style={{position:"absolute",bottom:250,left:65,right:125,textAlign:"center",fontFamily:"Arial,sans-serif",fontSize:44,fontWeight:600,lineHeight:1.24,color:"#fff",textShadow:"0 2px 5px #000,0 0 12px #000"}}>{text}</div>;
};
export const EhreE01V7:React.FC<{draft?:boolean}>=({draft=false})=>{
  const t=useCurrentFrame()/FPS;
  return <AbsoluteFill style={{background:"#171b20"}}>
    <ThreeCanvas width={1080} height={1920} dpr={draft?.5:1} shadows gl={{antialias:false,stencil:false,powerPreference:"high-performance"}} camera={{fov:40,near:.03,far:60}}>
      <Inner t={t} draft={draft}/><ComposerReady/>
    </ThreeCanvas>
    {t<2.65&&<div style={{position:"absolute",top:150,left:65,right:125,textAlign:"center",fontFamily:"Arial,sans-serif",color:t<.85?"#e5f2dd":"#fff",letterSpacing:1,fontSize:t<.85?74:52,fontWeight:900,textShadow:"0 3px 14px #000"}}>{t<.85?"POSITIV.":"IN SEINER BAUCHTASCHE."}</div>}

    {t>=23.55&&t<25.15&&<div style={{position:"absolute",top:150,left:65,color:"#fff",fontFamily:"Arial",fontSize:28,letterSpacing:4}}>GESTERN</div>}
    {t>=27.45&&t<35.7&&!(t>=29.6&&t<31.85)&&<div style={{position:"absolute",top:140,left:65,color:"#e2dbd0",fontFamily:"Arial",fontSize:25,letterSpacing:2}}>MAMA · LAUTSPRECHER</div>}
    <Captions t={t}/>
    {t>=END_T0&&<AbsoluteFill style={{background:"rgba(12,6,18,.78)",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"Arial,sans-serif",padding:85,textAlign:"center"}}><div style={{fontSize:60,lineHeight:1.1,fontWeight:800}}>ER HAT ALLES<br/>GEHÖRT.</div><div style={{fontSize:24,letterSpacing:4,marginTop:35,color:"#d3afea"}}>EHRENSACHE · TEIL 2?</div></AbsoluteFill>}

  </AbsoluteFill>;
};
