// Baner YouTube @larpstadt 2560x1440 – ulica z miasta + obsada, tekst w strefie bezpiecznej (1546x423 środek).
import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { fredoka } from "./fonts";
import { R6, CAST, R6Look } from "./R6";
import { Town, TownKit, loadTown } from "./Town";
import { Fx } from "./Fx";
import { FX, SW } from "./e01Shots";

const fontFamily = fredoka;
const CamB: React.FC = () => {
  const cam = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  cam.position.set(0.2, 1.12, 4.2); cam.fov = 40; cam.updateProjectionMatrix(); cam.lookAt(-1.4, 0.98, -6); cam.updateMatrixWorld();
  return null;
};
const ME: R6Look = { ...CAST.ich, face: "smug", hat: "spiky", hatColor: "#7a4520", cloth: "hoodie", shirt: "#1e1e22", accent: "#e8e8e8", bareArms: false };
// x, z, rotY, look, pose
const CREW: [number, number, number, R6Look, any][] = [
  [-6.2, -3.2, 0.5, CAST.oma, { wave: 1 }],
  [-4.6, -2.4, 0.35, CAST.murat, { point: 0.8 }],
  [-3.1, -1.6, 0.25, CAST.post, {}],
  [1.5, -1.6, -0.3, CAST.kevin, { phone: 1 }],
  [3.0, -2.4, -0.4, CAST.mayor, { wave: 0.7 }],
  [4.6, -3.2, -0.5, CAST.lehrerin, { talk: 0.6 }],
];

export const StadtBanner: React.FC = () => {
  const [kit, setKit] = useState<TownKit | null>(null);
  const [h] = useState(() => delayRender("town kit"));
  useEffect(() => { loadTown().then(setKit); }, []);
  useEffect(() => { if (kit) continueRender(h); }, [kit, h]);
  const fx = FX.street;
  return (
    <AbsoluteFill style={{ background: "#ffe100" }}>
      {kit && <ThreeCanvas width={2560} height={1440} shadows gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }} camera={{ fov: 40, near: 0.05, far: 320 }}>
        <CamB />
        <Town kit={kit} light="day" center={[-1.4, -6]} />
        <Fx focus={null} bokeh={0} aoRadius={1.0} ao={0} bright={0.04} contrast={-0.1} sat={0.25} />
        <R6 look={ME} pose={{ headScratch: 1 }} t={0} position={[-1.34, 0.02, 0.6]} rotY={0.35} />
        {CREW.map(([x, z, r, look, pose], k) => <R6 key={k} look={look} pose={pose} t={0.4 + k * 0.3} position={[x, SW, z]} rotY={r} />)}
      </ThreeCanvas>}
      {/* żółta tafla pod tekstem w strefie bezpiecznej */}
      <div style={{ position: "absolute", left: 1130, top: 508, width: 923, height: 423, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#ffe100", border: "10px solid #141416", borderRadius: 60, padding: "22px 46px 26px", boxShadow: "0 16px 0 #141416", textAlign: "center", transform: "rotate(-2deg)" }}>
          <div style={{ fontFamily, fontWeight: 700, fontSize: 112, lineHeight: 1, color: "#141416" }}>in dieser stadt</div>
          <div style={{ fontFamily, fontWeight: 600, fontSize: 44, marginTop: 14, color: "#141416" }}>jeden tag neue folge • @larpstadt</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
