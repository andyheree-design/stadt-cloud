// Test wyglądu 1:1 ze wzorem „Roblox story / In this town”: przelot nad aleją z wieżowcami (wysoko → w dół),
// potem ujęcia w lokacjach (zbliżenie / z góry / z boku), 3 postacie BLOCK_CAST, rekwizyty dosłowne, napisy wzoru.
// Bez audio. Render tylko w chmurze (lokalnie wyłącznie still --scale=0.5).
import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { R6, BLOCK_CAST, R6Pose } from "./R6";
import { Fx, FX_WZOR } from "./Fx";
import { CaptionWzor, Word } from "./Caption";
import { LOCATIONS, LocCam, V3, LavaFloor, Giant, Mammoth, Phone } from "./Locations";

const ease = (u: number) => u * u * (3 - 2 * u);
type Shot = { loc: string; cam: keyof typeof LOCATIONS["avenue"]["cams"] | LocCam; d: number; l2?: V3; acts?: { c: string; x: number; z?: number; r?: number; pose?: R6Pose; face?: any }[];
  props?: (t: number) => React.ReactNode; words: string };
const SHOTS: Shot[] = [
  { loc: "avenue", cam: "wide", d: 150, l2: [0, 3, -34], words: "In dieser Stadt passiert jeden Tag etwas Verrücktes" },
  { loc: "avenue", cam: "close", d: 90, acts: [{ c: "schueler", x: -0.75, r: 0.25, face: "shock", pose: { armsUp: 1 } }, { c: "babcia", x: 0, face: "happy", pose: { wave: 1 } }, { c: "lehrer", x: 0.75, r: -0.25, face: "smug", pose: { cross: 1 } }],
    props: (t) => <Giant p={[0.3, 0, -24]} t={t} s={1.5} ry={-0.1} />, words: "Heute kam ein RIESE in die Stadt" },
  { loc: "classroom", cam: "side", d: 90, acts: [{ c: "schueler", x: -0.8, r: 0.6, face: "sad", pose: { headScratch: 1 } }, { c: "lehrer", x: 0.9, z: -2.9, r: -0.5, face: "angry", pose: { point: 1, talk: 1 } }],
    words: "Der Lehrer sagt NEIN" },
  { loc: "omaRoom", cam: "top", d: 90, acts: [{ c: "babcia", x: 0, face: "smug", pose: { dance: 1 } }, { c: "schueler", x: -1.0, r: 0.5, face: "grin", pose: { dance: 1 } }, { c: "lehrer", x: 1.0, r: -0.5, face: "shock", pose: { armsUp: 1 } }],
    words: "Oma tanzt einfach weiter" },
  { loc: "kitchen", cam: { p: [0.5, 1.45, 2.7], l: [0, 0.95, -0.7], fov: 48 }, d: 90, acts: [{ c: "babcia", x: -0.2, z: -1.1, r: 0.15, face: "happy", pose: { phone: 1 } }],
    props: () => <Phone p={[0.55, 0.8, 0.25]} text="HUSS" s={0.4} rx={-1.2} ry={-0.3} />, words: "Beim Frühstück nur am HANDY" },
  { loc: "neonHall", cam: { p: [0, 2.6, 5.5], l: [0, 0.8, 0], fov: 50 }, d: 90, acts: [{ c: "schueler", x: -1, face: "shock", pose: { jump: 1 } }, { c: "lehrer", x: 1, face: "cry", pose: { armsUp: 1 } }],
    props: (t) => <LavaFloor t={t} />, words: "Plötzlich ist der Boden LAVA" },
  { loc: "showroom", cam: { p: [0, 2.2, 4.5], l: [0.3, 1.2, -1.5], fov: 50 }, d: 90, acts: [{ c: "babcia", x: -1.2, face: "grin", pose: { point: 1 } }],
    props: (t) => <Mammoth p={[1.6, 0.5, -3]} t={t} s={0.8} ry={-0.5} />, words: "Und Oma kauft ein MAMMUT" },
];
const STARTS = SHOTS.reduce<number[]>((a, s, i) => [...a, i ? a[i - 1] + SHOTS[i - 1].d : 0], []);
export const STADT_WZOR_LOOK_FRAMES = STARTS[STARTS.length - 1] + SHOTS[SHOTS.length - 1].d;
// napisy: jedno słowo naraz, równo rozłożone w ujęciu
const WORDS: Word[] = SHOTS.flatMap((s, i) => { const w = s.words.split(" "), step = (s.d - 6) / w.length;
  return w.map((t, k) => ({ t, s: STARTS[i] + 3 + Math.round(k * step), e: STARTS[i] + 3 + Math.round((k + 1) * step) })); });
const HL = /^(RIESE|NEIN|LAVA|MAMMUT|HANDY|Verrücktes|tanzt)$/;

const CamRig: React.FC<{ c: LocCam; u: number; l2?: V3 }> = ({ c, u, l2 }) => {
  const cam = useThree((s) => s.camera) as THREE.PerspectiveCamera, gl = useThree((s) => s.gl);
  gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.05;
  const e = ease(u), m = c.mv ?? [0, 0, 0], L = l2 ?? c.l;
  cam.position.set(c.p[0] + m[0] * e, c.p[1] + m[1] * e, c.p[2] + m[2] * e);
  cam.fov = c.fov; cam.updateProjectionMatrix();
  cam.lookAt(c.l[0] + (L[0] - c.l[0]) * e, c.l[1] + (L[1] - c.l[1]) * e, c.l[2] + (L[2] - c.l[2]) * e); cam.updateMatrixWorld();
  return null;
};

export const StadtWzorLook: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), t = f / fps;
  const [ready, setReady] = useState(false);
  const [h] = useState(() => delayRender("fonty wzoru"));
  useEffect(() => { (document.fonts?.ready ?? Promise.resolve()).then(() => setReady(true)); }, []);
  useEffect(() => { if (ready) continueRender(h); }, [ready, h]);
  let i = SHOTS.length - 1; while (i > 0 && f < STARTS[i]) i--;
  const S = SHOTS[i], L = LOCATIONS[S.loc], u = Math.min(1, (f - STARTS[i]) / S.d);
  const cam = typeof S.cam === "string" ? L.cams[S.cam] : S.cam;
  return (
    <AbsoluteFill style={{ background: "#9fd3ff" }}>
      {ready && <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.05 }} camera={{ fov: 50, near: 0.05, far: 400 }}>
        <CamRig c={cam} u={u} l2={S.l2} />
        <L.C t={t} />
        {(S.acts ?? []).map((a, k) => <R6 key={k} look={{ ...BLOCK_CAST[a.c], ...(a.face ? { face: a.face } : {}) }} t={t + k * 0.37} pose={a.pose ?? {}}
          position={[L.spot[0] + a.x, L.spot[1], a.z ?? L.spot[2]]} rotY={a.r ?? 0} />)}
        {S.props?.(t)}
        <Fx focus={null} bokeh={0} {...FX_WZOR} />
      </ThreeCanvas>}
      <CaptionWzor words={WORDS} hl={HL} />
    </AbsoluteFill>
  );
};
