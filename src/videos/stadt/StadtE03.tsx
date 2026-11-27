// E02 „Die Bahn” — szablon E01v3 (refren Huss z POV, napisy żółte), plan: dworzec Hinterhausen (PropsE02).
import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { fredoka } from "./fonts";
import { R6, CAST, R6Look } from "./R6";
import { Town, TownKit, loadTown } from "./Town";
import { Room } from "./Room";
import { Fx } from "./Fx";
import { Caption, Word } from "./Caption";
import { FX, Cam, Act, COP } from "./e01Shots";
import { SHOTS_E03, ActE03 } from "./e03Shots";
import { PovHands, PartyOutside } from "./PropsV3";
import TL from "../../../public/stadt/e03/timeline.json";

const fontFamily = fredoka;
export const STADT_E03_FRAMES = TL.frames;
// v4: napisy od pierwszej klatki (także w locie z góry)
const WORDS: Word[] = TL.lines.flatMap((l: any) => l.words.map((w: any) => ({ t: w.t, s: w.s, e: w.e })));
const ease = (u: number) => u * u * (3 - 2 * u);

const CamRig: React.FC<{ c: Cam; u: number; t: number }> = ({ c, u, t }) => {
  const cam = useThree((s) => s.camera) as THREE.PerspectiveCamera, gl = useThree((s) => s.gl);
  gl.toneMappingExposure = 1.1;
  if (c.fn) { const k = c.fn(u), sh = c.shake ?? 0; cam.position.set(k.p[0] + Math.sin(t * 37) * sh, k.p[1] + Math.sin(t * 29 + 1) * sh, k.p[2]); cam.fov = k.fov;
    cam.updateProjectionMatrix(); cam.lookAt(k.l[0], k.l[1], k.l[2]); cam.updateMatrixWorld(); return null; }
  const m = c.mv ?? [0, 0, 0], e = c.fast ? 1 - Math.pow(1 - u, 4) : ease(u), sh = c.shake ?? 0;
  cam.position.set(c.p[0] + m[0] * e + Math.sin(t * 37) * sh, c.p[1] + m[1] * e + Math.sin(t * 29 + 1) * sh, c.p[2] + m[2] * e);
  cam.fov = c.fov * (1 + ((c.zoom ?? 1) - 1) * e); cam.updateProjectionMatrix();
  cam.lookAt(c.l[0], c.l[1], c.l[2]); cam.updateMatrixWorld(); return null;
};

const Actor: React.FC<{ a: ActE03; t: number; u: number }> = ({ a, t, u }) => {
  const base: R6Look = a.c === "cop" ? COP : CAST[a.c];
  const mv = a.mv ?? [0, 0];
  return <R6 look={{ ...base, ...(a.look ?? {}), ...(a.face ? { face: a.face } : {}) }} t={t + (a.dt ?? 0)} pose={a.pose ?? {}} position={[a.p[0] + mv[0] * u, a.p[1], a.p[2] + mv[1] * u]} rotY={a.r} scale={a.s ?? 1} />;
};

export const StadtE03: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), t = f / fps;
  const [kit, setKit] = useState<TownKit | null>(null);
  const [h] = useState(() => delayRender("town kit"));
  useEffect(() => { loadTown().then(setKit); }, []);
  useEffect(() => { if (kit) continueRender(h); }, [kit, h]);
  const shots = TL.shots as { id: string; s: number; e: number }[];
  const sh = shots.find((s) => f >= s.s && f < s.e) ?? shots[shots.length - 1], S = SHOTS_E03[sh.id];
  if (!S) throw new Error("brak ujęcia " + sh.id);
  const u = Math.min(1, (f - sh.s) / (sh.e - sh.s)), fx = { ...FX[S.fx], ...(S.fxo ?? {}) };
  const focus = S.cam.focus ? (typeof S.cam.focus === "function" ? S.cam.focus(u) : S.cam.focus) : null;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {kit && <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }} camera={{ fov: 50, near: 0.05, far: 320 }}>
        <CamRig c={S.cam} u={u} t={t} />
        {S.room ? <>{<Room night open={S.open} />}{S.open && <PartyOutside t={t} />}</> : <><Town kit={kit} light={S.light ?? "day"} center={S.town?.center ?? [S.cam.l[0], S.cam.l[2]]} fog={S.town?.fog?.(u)} wide={S.town?.wide} /></>}
        <Fx focus={focus} bokeh={focus ? fx.bokeh ?? 2 : 0} aoRadius={S.room ? 0.5 : 1.0} ao={(fx as any).ao ?? (S.room ? 1.1 : 2.2)} bright={fx.bright ?? 0.03} contrast={fx.contrast ?? 0.04} sat={fx.sat ?? 0.22} />
        {S.key && <pointLight position={[S.key[0], S.key[1], S.key[2]]} intensity={S.key[3]} distance={S.key[4]} decay={1.5} />}
        {(S.acts ?? []).map((a, k) => <Actor key={k} a={a} t={t} u={u} />)}
        {S.props?.(u, t)}
        {S.pov && <PovHands t={t} mode={S.pov} />}
      </ThreeCanvas>}
      {S.ui?.(sh.s, sh.e)}
      <Caption words={WORDS} y={0.6} size={96} color="#ffe23a" font={fontFamily} stroke={9} big={/^huss/i} />
      <Audio src={staticFile(TL.audio)} />
    </AbsoluteFill>
  );
};
