// Zdjęcie profilowe @larpstadt – styl: zbliżenie 3/4, ręka za głową, pewny uśmieszek, żółte tło.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { R6, CAST } from "./R6";

const Cam: React.FC = () => {
  const cam = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  cam.position.set(-0.25, 1.0, 1.35); cam.fov = 32; cam.updateProjectionMatrix(); cam.lookAt(0.02, 0.9, 0); cam.updateMatrixWorld();
  return null;
};

export const StadtAvatar: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(circle at 55% 40%, #fff35a 0%, #ffe100 40%, #f2b800 100%)" }}>
    <ThreeCanvas width={1080} height={1080} gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }} camera={{ fov: 32, near: 0.02, far: 50 }} style={{ position: "absolute", inset: 0 }}>
      <Cam />
      <hemisphereLight args={["#fff8e6", "#6b5030", 0.9]} />
      <directionalLight position={[-1.5, 2.2, 2.2]} intensity={2.6} color="#fff4e0" />
      <directionalLight position={[2.2, 1.6, -1.2]} intensity={2.2} color="#ffe36a" />
      <directionalLight position={[0, -1, 2]} intensity={0.5} />
      <R6 look={{ ...CAST.ich, face: "smug", hat: "spiky", hatColor: "#7a4520", cloth: "hoodie", shirt: "#1e1e22", accent: "#e8e8e8", bareArms: false }} pose={{ headScratch: 1 }} t={0} position={[0, 0, 0]} rotY={-0.45} />
    </ThreeCanvas>
  </AbsoluteFill>
);
