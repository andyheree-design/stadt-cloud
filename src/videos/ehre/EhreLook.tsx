// EHRENSACHE E01 — look-dev: klatka i = kadr kontrolny i+1. Łańcuch post z mostu (InkPass -> lens blur -> tone NEUTRAL -> grade day).
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { ComposerReady } from "../../lib/ComposerReady";
import { InkPass, NOINK } from "../bridge/ink";
import { LensBlur } from "../bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH } from "../bridge/grade";
import { buildSet, poseActor, placeTest, swapCast, CAST_IDS, ActorDef, CastId, TestDef } from "./set";
import { buildGlbHuman, loadGlb } from "./glbHuman";

type Look = { exp?: number; fov: number; eye: [number, number, number]; look: [number, number, number]; dof?: number; frame?: { who: CastId; dist: number; dy: number }; anchor?: { who: CastId; y: number }; cast: Partial<Record<CastId, ActorDef>>; test?: TestDef };
const S = (x: number, z: number): [number, number, number] => [x, 0, z];
const GLB_CAST: [CastId, { headScale?: number }][] = [["tarek", { headScale: 1.12 }], ["dilara", { headScale: 1.1 }]];
export const LOOK: Look[] = [
  // 1. lineup obsady przed stolikiem
  { exp: 1.3, fov: 60, eye: [0, 1.25, -2.9], look: [0, 1.1, 0.2], dof: 4, cast: {
    kevin: { pos: S(-0.66, 0.05), rotY: 0.15, face: { smile: 0.5, startle: 0.5 }, armL: { out: 0.1, fwd: 0.1, elbow: 0.3 }, armR: { out: 0.1, fwd: 0.1, elbow: 0.3 } },
    tarek: { pos: S(-0.3, -0.05), face: { determined: 0.7, smile: 0.3 }, shrug: 0.02, armL: { out: 0.35, elbow: 0.2 }, armR: { out: 0.35, elbow: 0.2 }, headPitch: -0.1 },
    dilara: { pos: S(0.32, 0.0), rotY: -0.1, face: { angry: 0.6, determined: 0.4 }, armR: { out: 0.5, fwd: 0.2, elbow: 1.6 }, handR: { curl: 0.2 }, headTilt: 0.12 },
    mama: { pos: S(0.7, 0.1), rotY: -0.2, face: { smile: 0.7, neutral: 0.3 } } } },
  // 2. hook: test „SCHWANGER 3+” przed twarzą Tareka
  { exp: 1.95, fov: 34, eye: [-0.02, 1.5, 0.15], look: [-0.02, 1.53, 1.1], dof: 6, anchor: { who: "tarek", y: 1.616 }, cast: {
    tarek: { pos: S(0, 1.1), face: { startle: 0.8, fear: 0.2 }, faceX: { sweat: 0.8 }, armR: { fwd: 1.3, out: 0.15, elbow: 1.1 }, handR: { curl: 0.7 }, headPitch: 0.15 } },
    test: { pos: [-0.03, 1.39, 0.76], rot: [0, 0, 0.08], scale: 1.0 } },
  // 3–6. zbliżenia: kadr liczony z pozycji głowy (głowa ~40% wysokości)
  { exp: 1.6, fov: 30, eye: [0, 0, 0], look: [0, 0, 0], frame: { who: "tarek", dist: 1.75, dy: -0.1 }, dof: 9, cast: { tarek: { pos: S(0, 1.0), face: { angry: 0.7, determined: 0.3 }, armL: { out: 0.4 }, armR: { out: 0.4 } } } },
  { fov: 30, eye: [0, 0, 0], look: [0, 0, 0], frame: { who: "dilara", dist: 1.75, dy: -0.1 }, dof: 9, cast: { dilara: { pos: S(0, 1.0), face: { angry: 0.8, sad: 0.2 }, headTilt: -0.1, armR: { out: 0.5, fwd: 0.3, elbow: 1.7 } } } },
  { exp: 0.68, fov: 30, eye: [0, 0, 0], look: [0, 0, 0], frame: { who: "kevin", dist: 1.75, dy: -0.1 }, dof: 9, cast: { kevin: { pos: S(0, 1.0), face: { startle: 0.6, smile: 0.4 }, faceX: { sweat: 0.5 } } } },
  { exp: 1.05, fov: 30, eye: [0, 0, 0], look: [0, 0, 0], frame: { who: "mama", dist: 1.75, dy: -0.1 }, dof: 9, cast: { mama: { pos: S(0, 1.0), face: { smile: 0.8, neutral: 0.2 } } } },
  // 7. plan sytuacyjny: Tarek i Dilara na sofie, Kevin na pufie
  { exp: 0.74, fov: 52, eye: [0.1, 1.3, -2.7], look: [0.3, 0.85, 1.0], dof: 5, cast: {
    tarek: { pos: S(-0.45, 1.55), sit: 1, face: { determined: 0.6, smile: 0.4 }, armL: { out: 0.6, elbow: 0.4 }, armR: { out: 0.5, fwd: 0.3, elbow: 0.8 } },
    dilara: { pos: S(0.4, 1.55), sit: 1, rotY: -0.3, face: { angry: 0.7, neutral: 0.3 }, headYaw: -0.6 },
    kevin: { pos: [0.8, 0.14, -0.15], sit: 1, rotY: 0.9, armL: { fwd: 0.6, elbow: 0.9 }, armR: { fwd: 0.6, elbow: 0.9 }, face: { startle: 0.5, neutral: 0.5 }, headYaw: 0.3 } } },
  // kontrola Tarka: profil głowy (fade, AirPod, pot) i cała sylwetka (łańcuch, torba, pasek, kamizelka)
  { fov: 30, eye: [0, 0, 0], look: [0, 0, 0], frame: { who: "tarek", dist: 0.9, dy: -0.06 }, dof: 9, cast: { tarek: { pos: S(0, 1.0), rotY: -1.25, face: { neutral: 1 }, faceX: { sweat: 0.8 } } } },
  { fov: 30, eye: [0, 0, 0], look: [0, 0, 0], frame: { who: "tarek", dist: 2.6, dy: -0.55 }, dof: 9, cast: { tarek: { pos: S(0, 1.0), rotY: 0.35, face: { neutral: 1 } } } },
  { fov: 30, eye: [0, 0, 0], look: [0, 0, 0], frame: { who: "dilara", dist: 0.85, dy: -0.06 }, dof: 9, cast: { dilara: { pos: S(0, 1.0), rotY: -0.6, face: { neutral: 1 } } } },
  { fov: 30, eye: [0, 0, 0], look: [0, 0, 0], frame: { who: "dilara", dist: 2.4, dy: -0.6 }, dof: 9, cast: { dilara: { pos: S(0, 1.0), rotY: 0.25, face: { neutral: 1 } } } },
];
export const EHRE_LOOK_FRAMES = LOOK.length;

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const set = useMemo(buildSet, []);
  const [glb, setGlb] = useState<any>(null);
  const [handle] = useState(() => delayRender("tarek.glb"));
  useEffect(() => { Promise.all(GLB_CAST.map(([id]) => loadGlb(staticFile(`ehre/${id}.glb`)))).then((gs) => setGlb(gs)).catch((e) => { console.error("GLB", e); setGlb({ failed: e }); }); }, [handle]);
  const advance = useThree((st) => st.advance);
  useEffect(() => { if (glb) requestAnimationFrame(() => requestAnimationFrame(() => { advance(performance.now()); continueRender(handle); })); }, [glb, handle, advance]);
  useMemo(() => { if (glb && !glb.failed) GLB_CAST.forEach(([id, o], i) => swapCast(set, id, buildGlbHuman(glb[i], o))); }, [glb, set]);
  useMemo(() => { scene.background = new THREE.Color("#3b2a44"); }, [scene]);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  const forced = (getInputProps() as { shot?: number }).shot;
  const sh = LOOK[Math.min(LOOK.length - 1, (forced ?? f + 1) - 1)];
  const k = sh.exp ?? 1; set.hemi.intensity = 1.8 * k; set.key.intensity = 3.0 * k;
  set.bar.update(f / 30);
  for (const id of CAST_IDS) poseActor(set.cast[id], sh.cast[id]);
  // kadr zaprojektowany dla czubka głowy na wysokości anchor.y — przesuń kamerę i test, gdy postać ma inny wzrost
  let ady = 0;
  if (sh.anchor) { set.root.updateMatrixWorld(true); ady = set.cast[sh.anchor.who].skull.getWorldPosition(new THREE.Vector3()).y - sh.anchor.y; }
  placeTest(set, sh.test && !sh.test.who && sh.test.pos ? { ...sh.test, pos: [sh.test.pos[0], sh.test.pos[1] + ady, sh.test.pos[2]] } : sh.test);
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = sh.fov; cam.updateProjectionMatrix();
  let eye = new THREE.Vector3(...sh.eye).add(new THREE.Vector3(0, ady, 0)), look = new THREE.Vector3(...sh.look).add(new THREE.Vector3(0, ady, 0));
  if (sh.frame) { set.root.updateMatrixWorld(true); set.cast[sh.frame.who].skull.getWorldPosition(look); look.y += sh.frame.dy; eye = look.clone().add(new THREE.Vector3(0, 0.03, -sh.frame.dist)); }
  cam.position.copy(eye); cam.lookAt(look);
  cam.layers.enable(NOINK);
  fx.lens.focus = sh.test && !sh.test.who ? eye.distanceTo(new THREE.Vector3(...sh.test.pos!).add(new THREE.Vector3(0, ady, 0))) : eye.distanceTo(look);
  fx.lens.cInf = sh.dof ?? 6;
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

export const EhreLook: React.FC = () => (
  <AbsoluteFill style={{ background: "#3b2a44" }}>
    <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
      camera={{ fov: 32, near: 0.03, far: 60 }}>
      <Inner />
      <ComposerReady />
    </ThreeCanvas>
  </AbsoluteFill>
);
