// KOS F04 — bramka 4: look-dev. Klatka i = ujęcie i+1 (17 kadrów, po jednym na ujęcie scenariusza).
// Obsada KOS (three.js z JARVIS-STUDIO/library) jako <primitive> pod łańcuchem post z mostu
// (InkPass świata -> lens blur -> tone NEUTRAL -> grade day). Postacie na warstwie NOINK z własnymi konturami
// (inverted hull, grubsze niż świat); świat (willa + ślub) bez hulli — kontury daje InkPass.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { ComposerReady } from "../../lib/ComposerReady";
import { InkPass, NOINK } from "../bridge/ink";
import { LensBlur } from "../bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH } from "../bridge/grade";
import { CAST_IDS, NV, LOOKDEV } from "./shots";
import { buildSet, skyTex, wpt, poseActor, applyProps } from "./set";

export const KOS_LOOK_FRAMES = LOOKDEV.length;

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const set = useMemo(buildSet, []);
  useMemo(() => { scene.background = skyTex("#3e7fd2", "#9cbfea", "#dcecff"); scene.fog = new THREE.Fog("#b8d0ec", 25, 120); }, [scene]);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  const forced = (getInputProps() as { shot?: number }).shot;
  const sh = LOOKDEV[Math.min(LOOKDEV.length - 1, (forced ?? f + 1) - 1)];
  set.villa.update(f / 30, {});
  for (const id of CAST_IDS) poseActor(set.cast[id], sh.cast[id]);
  applyProps(set.wedding, sh);
  const cam = camera as THREE.PerspectiveCamera;
  const eye = wpt(set, sh.eye, new THREE.Vector3()), look = wpt(set, sh.look, new THREE.Vector3());
  if (typeof sh.eye === "string" || sh.eyeRel) eye.copy(look).add(new THREE.Vector3(...(sh.eyeRel ?? [0, 0, 0])).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(NV[0], NV[1])));
  cam.fov = sh.fov; cam.updateProjectionMatrix();
  cam.position.copy(eye); cam.lookAt(look);
  cam.layers.enable(NOINK);
  fx.lens.focus = eye.distanceTo(look);
  fx.lens.cInf = sh.dof ?? 9;
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

export const KosLook: React.FC = () => (
  <AbsoluteFill style={{ background: "#cfe3f2" }}>
    <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
      camera={{ fov: 32, near: 0.05, far: 400 }}>
      <Inner />
      <ComposerReady />
    </ThreeCanvas>
  </AbsoluteFill>
);
