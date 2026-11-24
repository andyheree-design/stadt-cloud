// E01 „RAGEBAIT” — pełny odcinek: 48 ujęć z public/stadt/e01/timeline.json, scena 3D (Town/Room + R6), napisy z lines[].words, mix.wav.
import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { R6, CAST, R6Look } from "./R6";
import { Town, TownKit, loadTown } from "./Town";
import { Room } from "./Room";
import { Fx } from "./Fx";
import { Caption, Word } from "./Caption";
import { Counter, Flash } from "./Overlays";
import { SHOTS, FX, Cam, Act, COP } from "./e01Shots";
import TL from "../../../public/stadt/e01/timeline.json";

export const STADT_E01_FRAMES = TL.frames;
const KEY = /ragebait|kommentar|million|ananas|nutella|fünf|crashout|teich|router|nett|dich|danke|zweimal|schuhe|explodiert|sauer|problem/i;
const WORDS: Word[] = TL.lines.flatMap((l) => l.words.map((w) => ({ t: w.t, s: w.s, e: w.e, c: KEY.test(w.t) ? "#ffd23f" : undefined })));
const ease = (u: number) => u * u * (3 - 2 * u);

const CamRig: React.FC<{ c: Cam; u: number; t: number }> = ({ c, u, t }) => {
  const cam = useThree((s) => s.camera) as THREE.PerspectiveCamera, gl = useThree((s) => s.gl);
  gl.toneMappingExposure = 1.1;
  const m = c.mv ?? [0, 0, 0], e = c.fast ? 1 - Math.pow(1 - u, 4) : ease(u), sh = c.shake ?? 0;
  cam.position.set(c.p[0] + m[0] * e + Math.sin(t * 37) * sh, c.p[1] + m[1] * e + Math.sin(t * 29 + 1) * sh, c.p[2] + m[2] * e);
  cam.fov = c.fov * (1 + ((c.zoom ?? 1) - 1) * e); cam.updateProjectionMatrix();
  cam.lookAt(c.l[0], c.l[1], c.l[2]); return null;
};

const Actor: React.FC<{ a: Act; t: number; u: number }> = ({ a, t, u }) => {
  const base: R6Look = a.c === "cop" ? COP : CAST[a.c];
  const mv = a.mv ?? [0, 0];
  return <R6 look={{ ...base, ...(a.look ?? {}), ...(a.face ? { face: a.face } : {}) }} t={t + (a.dt ?? 0)} pose={a.pose ?? {}} position={[a.p[0] + mv[0] * u, a.p[1], a.p[2] + mv[1] * u]} rotY={a.r} />;
};

export const StadtE01: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), t = f / fps;
  const [kit, setKit] = useState<TownKit | null>(null);
  const [h] = useState(() => delayRender("town kit"));
  useEffect(() => { loadTown().then(setKit); }, []);
  useEffect(() => { if (kit) continueRender(h); }, [kit, h]);
  const i = Math.max(0, TL.shots.findIndex((s) => f >= s.s && f < s.e)) || (f >= TL.frames - 1 ? TL.shots.length - 1 : 0), sh = TL.shots[i], S = SHOTS[i];
  const u = (f - sh.s) / (sh.e - sh.s), fx = { ...FX[S.fx], ...(S.fxo ?? {}) };
  const focus = S.cam.focus ? (typeof S.cam.focus === "function" ? S.cam.focus(u) : S.cam.focus) : null;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {kit && <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }} camera={{ fov: 50, near: 0.05, far: 320 }}>
        <CamRig c={S.cam} u={u} t={t} />
        {S.room ? <Room /> : <Town kit={kit} light={S.light ?? "day"} center={[S.cam.l[0], S.cam.l[2]]} />}
        <Fx focus={focus} bokeh={focus ? fx.bokeh ?? 2 : 0} aoRadius={S.room ? 0.5 : 1.0} ao={S.room ? 1.1 : 2.2} bright={fx.bright ?? 0} contrast={fx.contrast ?? 0} sat={fx.sat ?? 0} />
        {S.key && <pointLight position={[S.key[0], S.key[1], S.key[2]]} intensity={S.key[3]} distance={S.key[4]} decay={1.5} />}
        {(S.acts ?? []).map((a, k) => <Actor key={k} a={a} t={t} u={u} />)}
        {S.props?.(u, t)}
      </ThreeCanvas>}
      {S.ui?.(sh.s, sh.e)}
      {f < 149 && <Counter from={0} to={1240000} at={0} dur={110} />}
      {f >= 1 && f < 6 && <Flash opacity={0.45 * (1 - (f - 1) / 5)} />}
      <Caption words={WORDS} />
      {f >= STADT_E01_FRAMES - 22 && <Flash color="#000" opacity={interpolate(f, [STADT_E01_FRAMES - 22, STADT_E01_FRAMES - 18], [0, 1], { extrapolateRight: "clamp" })} />}
      <Audio src={staticFile(TL.audio)} />
    </AbsoluteFill>
  );
};
