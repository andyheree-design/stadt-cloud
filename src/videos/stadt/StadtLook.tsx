// Test wyglądu: miasto + sypialnia + obsada R6 + napisy. 7 ujęć po 60 klatek — każde odpowiada kadrowi wzoru.
import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { R6, CAST, R6Look, R6Pose } from "./R6";
import { Town, TownKit, loadTown, SPOT, PARK_C, CROSS_Z } from "./Town";
import { Room } from "./Room";
import { Fx } from "./Fx";
import { Caption } from "./Caption";

export const STADT_LOOK_FRAMES = 420;
type Cam = { p: [number, number, number]; l: [number, number, number]; fov: number; room?: boolean; focus?: [number, number, number] };
const SHOTS: Cam[] = [
  { p: [-1.5, 1.1, 1.3], l: [-3.7, 2.0, -8], fov: 58 },                                    // 0 chodnik przy witrynach (ref1_1)
  { p: [0.1, 1.0, 2.05], l: [0, 0.82, 0], fov: 32, focus: [0, 0.95, 0] },                  // 1 zbliżenie twarzy (ref3_1)
  { p: [0.15, 1.45, -3.3], l: [2.5, 1.2, -6.1], fov: 40, focus: [2.4, 1.0, -5.9] },            // 2 döner
  { p: [PARK_C.x + 12.5, 3.1, PARK_C.z + 0.2], l: [PARK_C.x - 4, 0.9, PARK_C.z], fov: 46 },     // 3 tłum w parku (ref3_6)
  { p: [2.0, 2.3, CROSS_Z + 3.4], l: [-4.2, 0.75, CROSS_Z - 3.2], fov: 54, focus: [-2.6, 1.0, CROSS_Z - 0.6] },                    // 4 przecznica: park + wieżowce (ref3_5)
  { p: [0.55, 1.5, 3.0], l: [-0.3, 1.0, -1.2], fov: 50, room: true, focus: [0.25, 1.0, 0.75] },                            // 5 sypialnia szeroko (ref1_2)
  { p: [0.2, 1.3, 0.75], l: [1.25, 1.05, -1.6], fov: 46, room: true, focus: [1.0, 1.0, -1.5] }, // 6 ich przy PC
];
const CamRig: React.FC<{ c: Cam; drift: number; exp?: number }> = ({ c, drift, exp = 1.1 }) => {
  const cam = useThree((s) => s.camera) as THREE.PerspectiveCamera, gl = useThree((s) => s.gl);
  gl.toneMappingExposure = exp;
  cam.position.set(c.p[0] + drift * 0.15, c.p[1], c.p[2] - drift * 0.25); cam.fov = c.fov; cam.updateProjectionMatrix();
  cam.lookAt(c.l[0], c.l[1], c.l[2]); return null;
};
const COP = { skin: "#f5cd30", shirt: "#1f4fa8", pants: "#17224a", shoes: "#111", face: "smug", hat: "postcap", hatColor: "#1a2d66", hatAccent: "#ffd23f", cloth: "uniform", accent: "#ffd23f", print: "POLIZEI", acc: ["bag"] } as const satisfies R6Look;
const POSES: R6Pose[] = [{ armsUp: 1, jump: 0.6 }, { point: 1, talk: 1 }, { cross: 1 }, { phone: 1, lean: 0.1 }, { wave: 1 }, { facepalm: 1 }, { shake: 1, talk: 1 }, { dance: 0.7 }, { point: 1, shake: 0.5 }, { armsUp: 0.6, talk: 1 }];
const WORDS = ["In", "dieser", "Stadt", "ist", "alles", "RAGEBAIT"].map((t, i) => ({ t, s: i * 70, e: i * 70 + 60 }));

export const StadtLook: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), shot = Math.min(SHOTS.length - 1, Math.floor(f / fps)), t = f / fps, local = (f % fps) / fps;
  const [kit, setKit] = useState<TownKit | null>(null);
  const [h] = useState(() => delayRender("town kit"));
  useEffect(() => { loadTown().then(setKit); }, []);
  useEffect(() => { if (kit) continueRender(h); }, [kit, h]);
  const names = Object.keys(CAST), S = SHOTS[shot];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {kit && <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }} camera={{ fov: 50, near: 0.1, far: 320 }}>
        <CamRig c={S} drift={local} />
        {S.room ? <Room /> : <Town kit={kit} light="day" center={shot === 3 ? [PARK_C.x, PARK_C.z] : [0, -6]} />}
        <Fx focus={S.focus ?? null} bokeh={S.focus ? (shot === 1 ? 2.2 : shot === 4 ? 0.3 : shot === 5 ? 1.0 : 4) : 0} aoRadius={S.room ? 0.5 : 1.0} ao={S.room ? 1.1 : 2.2} bright={S.room ? (shot === 5 ? -0.15 : -0.11) : shot === 0 ? -0.19 : shot === 4 ? -0.035 : shot === 3 ? 0.04 : shot === 1 ? 0.03 : 0} contrast={S.room ? (shot === 5 ? -0.46 : -0.3) : shot === 0 ? -0.24 : shot === 4 ? -0.1 : shot === 3 ? -0.07 : shot === 1 ? -0.1 : 0} sat={S.room ? (shot === 5 ? 0.13 : 0.12) : shot === 0 ? 0.15 : shot === 4 ? -0.03 : shot === 3 ? 0.15 : shot === 1 ? 0.2 : 0} />
        {shot === 0 && <>
          <R6 look={COP} t={t} pose={{ walk: 1 }} position={[-2.4, 0.12, -2.4 + local * 0.9]} rotY={0} />
          <R6 look={{ ...COP, face: "angry" }} t={t + 0.3} pose={{ walk: 1, point: 0.6 }} position={[-2.95, 0.12, -3.3 + local * 0.9]} rotY={0} />
          {names.slice(1, 6).map((n, i) => (
            <R6 key={n} look={CAST[n]} t={t + i * 0.37} pose={{ walk: 1, phone: i === 2 ? 1 : 0 }} position={[(i % 2 ? -1 : 1) * (2.3 + (i % 3) * 0.2), 0.12, -4.5 - i * 2.4 + (i % 2 ? 1 : -1) * local * 1.1]} rotY={i % 2 ? 0 : Math.PI} />
          ))}
        </>}
        {(shot === 1 || shot === 4) && <pointLight position={shot === 1 ? [0.5, 1.3, 1.6] : [3.6, 1.8, CROSS_Z + 0.8]} intensity={shot === 1 ? 2.5 : 6} distance={shot === 1 ? 4 : 8} decay={1.5} />}
        {shot === 1 && <>
          <R6 look={CAST.ich} t={t} pose={{ talk: 1 }} position={[0, 0.12, 0]} rotY={0.15} />
          <R6 look={CAST.kevin} t={t} pose={{ walk: 1 }} position={[1.2, 0.12, -3]} rotY={-0.4} />
        </>}
        {shot === 2 && <>
          <R6 look={CAST.murat} t={t} pose={{ talk: 1 }} position={[SPOT.doener.x + 0.45, 0.12, SPOT.doener.z]} rotY={SPOT.doener.rot} />
          <R6 look={CAST.ich} t={t} pose={{ point: 1 }} position={[SPOT.doener.x - 0.6, 0.12, SPOT.doener.z + 0.3]} rotY={Math.PI / 2} />
        </>}
        {shot === 3 && names.slice(0, 10).map((n, i) => (
          <R6 key={n} look={CAST[n]} t={t + i * 0.3} pose={POSES[i % POSES.length]}
            position={[PARK_C.x + 3.6 - Math.floor(i / 5) * 1.2 + ((i * 7) % 3) * 0.15, 0.075, PARK_C.z - 1.7 + (i % 5) * 0.85 + (Math.floor(i / 5) ? 0.4 : 0)]} rotY={Math.PI / 2 + ((i * 5) % 7 - 3) * 0.1} />
        ))}
        {shot === 3 && names.slice(10, 16).map((n, i) => (
          <R6 key={"bg" + n} look={CAST[n]} t={t + i * 0.41} pose={i % 3 ? { walk: 1 } : POSES[(i + 3) % POSES.length]}
            position={[PARK_C.x - 7 - (i % 3) * 3 + (i % 2 ? -1 : 1) * local * 0.8, 0.075, PARK_C.z + (i % 2 ? -2.3 : 2.3) + (i % 3) * 0.3]} rotY={i % 2 ? Math.PI / 2 : -Math.PI / 2} />
        ))}
        {shot === 4 && <>
          <R6 look={COP} t={t + 0.2} pose={{ talk: 1, point: 0.5 }} position={[-2.3, 0.03, CROSS_Z - 0.2]} rotY={1.45} />
          <R6 look={{ ...COP, face: "angry" }} t={t + 0.5} pose={{ cross: 1 }} position={[-2.7, 0.03, CROSS_Z - 1.7]} rotY={1.1} />
          <R6 look={CAST.kevin} t={t} pose={{ walk: 1 }} position={[-9 - local, 0.12, CROSS_Z + 2.6]} rotY={-Math.PI / 2} />
        </>}
        {shot === 5 && <>
          <R6 look={CAST.ich} t={t} pose={{ armsUp: 1, jump: 0.5 }} position={[0.25, 0, 0.75]} rotY={-0.15} />
          <R6 look={CAST.kevin} t={t} pose={{ talk: 1 }} position={[-1.95, 0.62, 0.2]} rotY={0.7} scale={1} />
        </>}
        {shot === 6 && <R6 look={CAST.ich} t={t} pose={{ talk: 1 }} position={[1.0, 0, -1.5]} rotY={-0.45} />}
      </ThreeCanvas>}
      <Caption words={WORDS} />
    </AbsoluteFill>
  );
};
