// KOS F04 „Kuss oder Schluss” — film (bramka 5: pilot ujęć 1–5, potem całość).
// Wszystko jest czystą funkcją czasu t (deterministyczne, renderowalne równolegle).
// Kamera: klucze („beaty”) ~co 0,9 s, ruch 0,3–0,5 s z wygładzeniem, między ruchami dryf ~1/3 prędkości
// szczytowej (kamera nigdy nie stoi), zero twardych cięć — ujęcia przechodzą płynnym przelotem.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { ComposerReady } from "../../lib/ComposerReady";
import { InkPass, NOINK } from "../bridge/ink";
import { LensBlur } from "../bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH } from "../bridge/grade";
import { CAST_IDS, NV, at, FACE, LOOKDEV, BASE, ShotDef } from "./shots";
import { buildSet, skyTex, wpt, Built, blendExpr } from "./set";
import TL from "./data/timeline.json";
import MOUTH from "./data/mouth.json";
// @ts-ignore
import { mouthFromCues } from "@kosengine/mouth.js";

export const KOS_E04_FRAMES = TL.durationFrames;
const FPS = 30;

// ---------- pomocnicze ----------
const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const R = (t: number, a: number, b: number) => cl((t - a) / (b - a));
const ease = (x: number) => { x = cl(x); return x * x * (3 - 2 * x); };
const hop = (t: number, t0: number, h = 0.15) => { const a = R(t, t0 - 0.12, t0), u = R(t, t0, t0 + 0.32), d = R(t, t0 + 0.32, t0 + 0.5); return -0.04 * Math.sin(Math.PI * a) * (u === 0 ? 1 : 0) + h * Math.sin(Math.PI * u) - 0.03 * Math.sin(Math.PI * d); };
const squashOf = (t: number, t0: number) => { const a = R(t, t0 - 0.12, t0), u = R(t, t0, t0 + 0.12), d = R(t, t0 + 0.32, t0 + 0.5); return 1 - 0.12 * Math.sin(Math.PI * a) * (u === 0 ? 1 : 0) + 0.1 * Math.sin(Math.PI * u) - 0.1 * Math.sin(Math.PI * d); };
const blinkAt = (t: number, i: number) => cl(1 - Math.abs(((t * 0.37 + i * 0.13) % 1) - 0.5) / 0.035);
const LN: Record<string, { start: number; end: number; who: string }> = Object.fromEntries(TL.lines.map((l) => [l.id, l]));
const SH = TL.shots; // {shot,start,end}

// ---------- kamera ----------
type Pose = { e: THREE.Vector3; l: THREE.Vector3; fov: number };
type Key = { t: number; dur: number; pose: Pose };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ROT = Math.atan2(NV[0], NV[1]);
const ptW = (p: [number, number, number]) => { const xz = at(p[1], p[0]); return V(xz[0], p[2], xz[1]); };

const basePose = (set: Built, sh: ShotDef): Pose => {
  const l = wpt(set, sh.look, V());
  const e = sh.eyeRel ? l.clone().add(V(...sh.eyeRel).applyAxisAngle(V(0, 1, 0), ROT)) : wpt(set, sh.eye, V());
  return { e, l, fov: sh.fov };
};
/** wariant beatu j (1, 2, …) wokół pozy bazowej: najazd / przekadrowanie po łuku */
const beatPose = (b: Pose, j: number, yawOk = true): Pose => {
  const push = Math.min(0.22, 0.09 * Math.ceil(j / 2) + 0.04 * (j % 2));
  const yaw = yawOk ? (j % 2 === 0 ? 1 : -1) * 0.07 * Math.min(2, Math.ceil(j / 2)) : 0;
  const d = b.e.clone().sub(b.l).applyAxisAngle(V(0, 1, 0), yaw).multiplyScalar(1 - push);
  return { e: b.l.clone().add(d).add(V(0, 0.03 * (j % 2), 0)), l: b.l.clone().add(V(0, 0.015 * j, 0)), fov: b.fov - 0.8 * j };
};

const buildKeys = (set: Built): Key[] => {
  const keys: Key[] = [];
  const ant = wpt(set, "antrag", V());
  for (const s of SH) {
    const sh = LOOKDEV[s.shot - 1]; const b = basePose(set, sh);
    if (s.shot === 1) {
      // hook: makro pieczątki, potem odjazd na plac ślubny w trzech beatach
      keys.push({ t: 0, dur: 0, pose: b });
      keys.push({ t: 0.45, dur: 0.25, pose: { e: b.e.clone().lerp(ant, 0.12), l: ant.clone(), fov: b.fov - 2 } });
      keys.push({ t: 1.55, dur: 0.7, pose: { e: ptW([-0.55, 2.5, 1.25]), l: ptW([-0.95, 1.2, 0.85]), fov: 40 } }); // biurko + Bürokratius
      keys.push({ t: 2.85, dur: 0.7, pose: { e: ptW([0, 4.3, 1.45]), l: ptW([-0.1, 1.1, 0.85]), fov: 44 } });
      continue;
    }
    // przelot między ujęciami 0,55 s (krótszy wygląda w analizie jak twarde cięcie), beaty w ujęciu co ~1,5 s
    // przelot: dłuższy przy dalekich przeskokach (inaczej analiza widzi twarde cięcie)
    const prev = keys[keys.length - 1].pose; const dist = prev.e.distanceTo(b.e) + 0.5 * prev.l.distanceTo(b.l);
    let td = Math.min(1.1, Math.max(0.55, 0.45 + 0.12 * dist));
    // kontrplan (obrót > ~115°): szybki „whip” zamiast długiego omiatania pustej trawy
    { const da = prev.l.clone().sub(prev.e), db = b.l.clone().sub(b.e); const dy = Math.abs(Math.atan2(Math.sin(Math.atan2(db.x, db.z) - Math.atan2(da.x, da.z)), Math.cos(Math.atan2(db.x, db.z) - Math.atan2(da.x, da.z)))); if (dy > 2.0 || Math.hypot(b.e.x - prev.e.x, b.e.z - prev.e.z) > 3.0) td = 0.4; }
    keys.push({ t: s.start - 0.3 * td, dur: td, pose: b });
    const n = Math.max(1, Math.ceil(s.dur / (s.shot >= 6 ? 1.45 : 1.8)));
    for (let j = 1; j < n; j++) keys.push({ t: s.start + (s.dur * j) / n, dur: 0.5, pose: beatPose(b, j, s.shot !== 13 && s.shot !== 12) }); // 13: omdlenie — bez odchyłu, Pfandolino zostaje w kadrze
  }
  return keys;
};

// kierunek patrzenia interpolowany kątowo (yaw/pitch), nie punkt celu — przy kontrplanie cel nie przechodzi przez kamerę (kadr „w podłogę”)
const lerpLin = (a: Pose, b: Pose, u: number): Pose => ({ e: a.e.clone().lerp(b.e, u), l: a.l.clone().lerp(b.l, u), fov: a.fov + (b.fov - a.fov) * u });
// liniowo, chyba że cel przeszedłby blisko kamery — wtedy kątowo (kontrplan bez „patrzenia w podłogę”, a zwykły przelot bez omiatania pustej trawy)
const needAng = (a: Pose, b: Pose) => { for (let i = 1; i < 10; i++) { const p = lerpLin(a, b, i / 10); if (p.e.distanceTo(p.l) < 1.0) return true; } return false; };
const lerpPose = (a: Pose, b: Pose, u: number): Pose => {
  if (!needAng(a, b)) return lerpLin(a, b, u);
  const e = a.e.clone().lerp(b.e, u), da = a.l.clone().sub(a.e), db = b.l.clone().sub(b.e);
  const ya = Math.atan2(da.x, da.z), yb = Math.atan2(db.x, db.z); let dy = yb - ya; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  const pa = Math.atan2(da.y, Math.hypot(da.x, da.z)), pb = Math.atan2(db.y, Math.hypot(db.x, db.z));
  const yaw = ya + dy * u, pit = pa + (pb - pa) * u, len = da.length() + (db.length() - da.length()) * u;
  const l = e.clone().add(V(Math.sin(yaw) * Math.cos(pit), Math.sin(pit), Math.cos(yaw) * Math.cos(pit)).multiplyScalar(len));
  return { e, l, fov: a.fov + (b.fov - a.fov) * u };
};
const addDrift = (p: Pose, d: { e: THREE.Vector3; l: THREE.Vector3 }, dt: number): Pose => ({ e: p.e.clone().addScaledVector(d.e, dt), l: p.l.clone().addScaledVector(d.l, dt), fov: p.fov });
const camAt = (keys: Key[], t: number): Pose => {
  let P = keys[0].pose, t0 = 0;
  let drift = { e: P.l.clone().sub(P.e).setLength(0.012), l: V() }; // pierwszy dryf: powolny najazd
  for (let k = 1; k < keys.length; k++) {
    const K = keys[k];
    if (t < K.t) return addDrift(P, drift, t - t0);
    const start = addDrift(P, drift, K.t - t0);
    if (t < K.t + K.dur) {
      const u = ease((t - K.t) / K.dur), p = lerpPose(start, K.pose, u);
      // długi przelot (np. kontrplan) idzie łukiem nad głowami, a nie przez postacie
      const d = Math.hypot(K.pose.e.x - start.e.x, K.pose.e.z - start.e.z);
      if (d > 1.6) p.e.y += Math.min(1.1, 0.35 * d) * Math.sin(Math.PI * u);
      return p;
    }
    // dryf po ruchu: kierunek ruchu, 1/3 prędkości szczytowej (szczyt smoothstep = 1,5 × średnia), z limitem
    const de = K.pose.e.clone().sub(start.e).multiplyScalar(0.5 / K.dur), dl = K.pose.l.clone().sub(start.l).multiplyScalar(0.5 / K.dur);
    const cap = 0.012 / Math.max(0.012, de.length()); if (cap < 1) { de.multiplyScalar(cap); dl.multiplyScalar(cap); }
    if (de.length() < 0.008) de.add(K.pose.l.clone().sub(K.pose.e).setLength(0.01)); // zawsze minimalny ruch
    P = K.pose; t0 = K.t + K.dur; drift = { e: de, l: dl };
  }
  return addDrift(P, drift, t - t0);
};

// ---------- aktorzy ----------
type W = Record<string, number>;
const EXPR: Record<string, [number, W][]> = {
  buero: [[0, { determined: 1 }], [3.85, { angry: 1 }], [6.2, { determined: 0.6, neutral: 0.4 }], [15.85, { determined: 1 }],
    [19.55, { startle: 1 }], [20.4, { sad: 0.5, angry: 0.5 }], [25.2, { angry: 0.7, startle: 0.3 }], [30.4, { determined: 1 }], [38.4, { angry: 0.6, sad: 0.4 }], [44.45, { determined: 0.6, smile: 0.4 }]],
  guenther: [[0, { smile: 0.6, neutral: 0.4 }], [6.1, { smile: 1 }], [9.1, { smile: 0.4, tense: 0.6 }], [12.4, { smile: 0.8, neutral: 0.2 }],
    [22.1, { smile: 1 }], [25.1, { startle: 1 }], [26.2, { tense: 0.6, neutral: 0.4 }], [33.0, { startle: 0.7, tense: 0.3 }], [36.2, { startle: 0.6, neutral: 0.4 }], [39.2, { smile: 1 }]],
  pfand: [[0, { fear: 0.4, neutral: 0.6 }], [9.0, { fear: 1 }], [12.45, { fear: 0.5, sad: 0.5 }], [25.2, { startle: 0.8, fear: 0.2 }], [27.3, { fear: 0.5, neutral: 0.5 }],
    [32.55, { startle: 1 }], [33.6, { fear: 1 }], [35.3, { sad: 0.7, fear: 0.3 }], [38.3, { smile: 1 }]],
  curry: [[0, { smile: 0.7, neutral: 0.3 }], [3.95, { sad: 0.5, neutral: 0.5 }], [6.2, { smile: 0.7, neutral: 0.3 }], [12.4, { smile: 0.8, sad: 0.2 }],
    [15.9, { sad: 0.7, neutral: 0.3 }], [19.0, { tense: 0.7, neutral: 0.3 }], [19.55, { startle: 1 }], [20.5, { smile: 0.6, startle: 0.4 }], [25.2, { startle: 1 }], [27.3, { sad: 0.4, smile: 0.6 }], [32.5, { smile: 1 }], [38.3, { smile: 1 }]],
  brez: [[0, { smile: 0.5, neutral: 0.5 }], [3.95, { startle: 0.4, neutral: 0.6 }], [5.0, { smile: 0.5, neutral: 0.5 }], [25.2, { startle: 0.6, neutral: 0.4 }],
    [26.55, { startle: 1 }], [28.2, { smile: 0.6, sad: 0.4 }], [38.3, { smile: 1 }]],
  doener: [[0, { determined: 1 }], [27.3, { smile: 0.6, sad: 0.4 }], [36.3, { startle: 0.6, neutral: 0.4 }], [38.3, { smile: 1 }]],
  versp: [[0, { startle: 1 }], [36.9, { tense: 0.6, smile: 0.4 }], [38.3, { smile: 0.6, neutral: 0.4 }]],
};
const exprAt = (id: string, t: number): W => {
  const L = EXPR[id]; let i = 0; while (i + 1 < L.length && L[i + 1][0] <= t) i++;
  const k = ease(R(t, L[i][0], L[i][0] + 0.22)); if (i === 0 || k >= 1) return L[i][1];
  const out: W = {}; for (const [n, w] of Object.entries(L[i - 1][1])) out[n] = (out[n] ?? 0) + w * (1 - k);
  for (const [n, w] of Object.entries(L[i][1])) out[n] = (out[n] ?? 0) + w * k; return out;
};
const speaking = (id: string, t: number) => TL.lines.find((l) => l.who === id && t >= l.start && t <= l.end + 0.05);
const mouth = (id: string, t: number) => {
  const l = speaking(id, t); if (!l) return null;
  return mouthFromCues((MOUTH as Record<string, unknown>)[l.id], t - l.start);
};
const ARMS = (fwd: number, out: number, elbow: number) => ({ fwd, out, elbow });

// trasy: [t, s, n] — między punktami ruch z wygładzeniem; poza trasą pozycja z BASE
type WP = [number, number, number];
const PATH: Record<string, WP[]> = {
  doener: [[24.35, 0.05, 8.3], [25.25, 0.1, 3.9], [26.65, 0.1, 3.9], [27.5, 1.25, 3.0], [38.6, 1.25, 3.0], [39.4, 0.75, 2.4]],
  versp: [[35.6, -0.2, 9.8], [36.3, -0.2, 5.4], [38.95, -0.2, 5.4], [39.9, -0.6, 2.8]],
  guenther: [[34.55, 0, 0.7], [35.1, 0.75, 0.8], [38.2, 0.75, 0.8], [38.9, 0, 0.7]],
};
const APPEAR: Record<string, number> = { doener: 24.35, versp: 35.6 };
const posOf = (id: string, t: number) => {
  const L = PATH[id]; const b = BASE[id];
  if (!L) return { s: b.s, n: b.n, speed: 0, head: 0, dist: 0 };
  if (t <= L[0][0]) return { s: L[0][1], n: L[0][2], speed: 0, head: 0, dist: 0 };
  let dist = 0;
  for (let i = 0; i + 1 < L.length; i++) {
    const [t0, s0, n0] = L[i], [t1, s1, n1] = L[i + 1]; const len = Math.hypot(s1 - s0, n1 - n0);
    if (t < t1) {
      const x = R(t, t0, t1), u = ease(x); const sp = len > 0.01 ? (6 * x * (1 - x) * len) / (t1 - t0) : 0;
      const a = at(n0, s0), c = at(n1, s1);
      return { s: s0 + (s1 - s0) * u, n: n0 + (n1 - n0) * u, speed: sp, head: Math.atan2(-(c[0] - a[0]), -(c[1] - a[1])), dist: dist + len * u };
    }
    dist += len;
  }
  const e = L[L.length - 1]; return { s: e[1], n: e[2], speed: 0, head: 0, dist };
};
// zwrot: liczba = obrót względem FACE (jak turn w shots.ts) albo id postaci, na którą patrzy
const TURN: Record<string, [number, number | string][]> = {
  buero: [[0, 0.3], [15.85, 0.05], [18.95, 0.3], [25.2, "doener"], [27.3, -0.45], [30.4, 0.3]],
  guenther: [[0, 0], [25.2, "doener"], [27.3, -0.45], [27.3, 0], [32.6, "pfand"], [38.9, 0]],
  pfand: [[0, -0.35], [25.2, "doener"], [27.3, -0.45], [30.4, -0.35], [36.3, "versp"], [38.4, -0.35]],
  curry: [[0, -0.25], [25.2, "doener"], [27.3, -0.45], [30.4, -0.25], [32.55, "pfand"], [36.3, "versp"], [38.4, -0.25]],
  brez: [[0, -0.2], [25.2, "doener"], [27.3, -0.45], [39.3, -0.2]],
  doener: [[0, Math.PI], [26.6, 0.45], [36.3, "versp"], [38.4, 0.45], [39.3, -0.2]],
  versp: [[0, Math.PI], [39.4, 0.2]],
};
const angLerp = (a: number, b: number, u: number) => { const d = ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI; return a + d * u; };
const turnVal = (id: string, v: number | string, t: number) => {
  if (typeof v === "number") return FACE + v;
  const p = posOf(id, t), q = posOf(v, t); const a = at(p.n, p.s), c = at(q.n, q.s);
  return Math.atan2(-(c[0] - a[0]), -(c[1] - a[1]));
};
const headingOf = (id: string, t: number) => {
  const L = TURN[id]; let i = 0; while (i + 1 < L.length && L[i + 1][0] <= t) i++;
  const k = ease(R(t, L[i][0], L[i][0] + 0.35)); const cur = turnVal(id, L[i][1], t);
  return i === 0 || k >= 1 ? cur : angLerp(turnVal(id, L[i - 1][1], t), cur, k);
};
const SNEEZE = 19.55, FAINT = 35.3, RECOVER = 37.7;
const HIT12 = LN.S12_buero.start + 1.3, HIT17 = LN.S17_buero.start + 1.05;
const BQ_THROW = SH[12].start + 0.15, BQ_LAND = BQ_THROW + 0.5;

const poseAll = (set: Built, t: number) => {
  CAST_IDS.forEach((id, i) => {
    const c = set.cast[id];
    const visible = !!BASE[id] || t >= (APPEAR[id] ?? 1e9); c.group.visible = visible; if (!visible) return;
    const po = posOf(id, t); const run = cl(po.speed / 1.2);
    const P: any = {
      pos: at(po.n, po.s), rotY: angLerp(headingOf(id, t), po.head, run) + 0.05 * Math.sin(t * 0.9 + i) * (1 - run), phase: po.dist * 5.5, walk: cl(po.speed / 0.6), bob: 0,
      squash: 1 + 0.02 * Math.sin(t * 2.6 + i), tilt: 0.025 * Math.sin(t * 1.2 + i), lean: 0.06 * run,
      armL: ARMS(0.1 + 0.08 * Math.sin(t * 1.7 + i), 0.32 + 0.05 * Math.sin(t * 1.3 + i), 0.3),
      armR: ARMS(0.1 + 0.08 * Math.sin(t * 1.5 + i + 1), 0.32 + 0.05 * Math.sin(t * 1.1 + i), 0.3),
    };
    const extra: W = { blink: blinkAt(t, i), sweat: 0 };
    const sp = speaking(id, t); if (sp) { P.bob += hop(t, sp.start + 0.02, 0.05); P.squash *= squashOf(t, sp.start + 0.02); }
    if (id === "buero") {
      P.squash *= squashOf(t, 0.42);
      if (t > 3.8 && t < 6.3) { const k = ease(R(t, 3.8, 4.05)) * (1 - ease(R(t, 6.0, 6.3))); P.armR = ARMS(0.1 + k * (1.7 + 0.25 * Math.sin(t * 14)), 0.32 + 0.35 * k, 0.3 + 0.4 * k); P.lean = 0.12 * k; }
      // „Paragraf zwölf” — ręka w górę
      { const k = ease(R(t, 15.9, 16.3)) * (1 - ease(R(t, 18.7, 19.1))); P.armR = ARMS(P.armR.fwd + k * (2.4 + 0.12 * Math.sin(t * 9)), P.armR.out + 0.1 * k, P.armR.elbow - 0.1 * k); P.lean += 0.08 * k; P.squash *= 1 + 0.04 * k; }
      // kichnięcie: odrzut, potem łapanie lecących kartek
      { const k = ease(R(t, SNEEZE, SNEEZE + 0.15)) * (1 - ease(R(t, 21.6, 22.1))); P.lean -= 0.15 * ease(R(t, SNEEZE, SNEEZE + 0.12)) * (1 - ease(R(t, 20.0, 20.4)));
        P.armL = ARMS(P.armL.fwd + k * (2.0 + 0.4 * Math.sin(t * 7)), P.armL.out + 0.4 * k, 0.3); P.armR = ARMS(P.armR.fwd + k * (2.0 + 0.4 * Math.sin(t * 7 + 2)), P.armR.out + 0.4 * k, 0.3); }
      P.squash *= squashOf(t, SNEEZE + 0.05);
      // „abgelehnt” (12) i „Abgelehnt” (17): uderzenie całym ciałem
      P.squash *= squashOf(t, HIT12) * squashOf(t, HIT17); P.bob += hop(t, HIT12 - 0.15, 0.06);
    }
    if (id === "guenther") {
      const k = ease(R(t, 6.15, 6.5)) * (1 - ease(R(t, 8.9, 9.3)));
      P.armL = ARMS(P.armL.fwd + k * 1.1, P.armL.out + k * 0.7, 0.3 - 0.1 * k); P.armR = ARMS(P.armR.fwd + k * 1.1, P.armR.out + k * 0.7, 0.3 - 0.1 * k);
      P.bob += hop(t, 6.2, 0.1); P.lean = -0.08 * k;
      // „jetzt oder nie” — ręka do tłumu
      const k8 = ease(R(t, 22.15, 22.5)) * (1 - ease(R(t, 24.7, 25.1))); P.armR = ARMS(P.armR.fwd + k8 * 1.5, P.armR.out + 0.4 * k8, P.armR.elbow); P.rotY += 0.18 * Math.sin((t - 22.2) * 1.6) * k8;
      // łapie mdlejącego Pfandolino
      const kc = ease(R(t, 34.9, 35.25)) * (1 - ease(R(t, RECOVER, RECOVER + 0.4))); P.armL = ARMS(P.armL.fwd + kc * 1.3, P.armL.out, 0.3); P.armR = ARMS(P.armR.fwd + kc * 1.3, P.armR.out, 0.3); P.lean += 0.15 * kc;
      // „Ihr entscheidet!” — ręce szeroko
      const k15 = ease(R(t, 39.25, 39.6)) * (1 - ease(R(t, 41.9, 42.4))); P.armL = ARMS(P.armL.fwd + k15 * 1.2, P.armL.out + k15 * 0.8, 0.2); P.armR = ARMS(P.armR.fwd + k15 * 1.2, P.armR.out + k15 * 0.8, 0.2);
      P.bob += hop(t, 40.9, 0.1);
    }
    if (id === "pfand") {
      const k = ease(R(t, 8.95, 9.2)) * (1 - ease(R(t, 12.3, 12.7))) + ease(R(t, 33.5, 33.8)) * (1 - ease(R(t, FAINT, FAINT + 0.2)));
      P.tilt += k * 0.03 * Math.sin(t * 43); P.squash *= 1 - k * (0.04 + 0.015 * Math.sin(t * 37));
      P.armL = ARMS(P.armL.fwd + k * 0.9, P.armL.out - k * 0.6, 0.3 + k * 1.1); P.armR = ARMS(P.armR.fwd + k * 0.9, P.armR.out - k * 0.6, 0.3 + k * 1.1);
      P.bob += hop(t, 10.7, 0.12) + hop(t, BQ_LAND, 0.1);
      extra.sweat = cl(k);
      // omdlenie i powrót
      const kf = ease(R(t, FAINT, FAINT + 0.45)) * (1 - ease(R(t, RECOVER, RECOVER + 0.5))); P.lean -= 0.6 * kf; P.squash *= 1 - 0.05 * kf;
      if (kf > 0.5) extra.blink = 1;
    }
    if (id === "curry") {
      const k = ease(R(t, 12.3, 12.7)) * (1 - ease(R(t, 15.6, 15.95)));
      P.armL = ARMS(P.armL.fwd + k * 0.7, P.armL.out - k * 0.65, 0.3 + k * 1.0); P.armR = ARMS(P.armR.fwd + k * 0.7, P.armR.out - k * 0.65, 0.3 + k * 1.0);
      P.lean = 0.07 * k; P.rotY += 0.16 * Math.sin((t - 14.5) * 11) * R(t, 14.5, 14.6) * (1 - R(t, 15.2, 15.4));
      P.squash *= squashOf(t, 4.0);
      // „Hatschi!”: nabranie powietrza (odchylenie, rozciągnięcie) i wystrzał w przód
      const a = ease(R(t, 19.0, SNEEZE)), s = ease(R(t, SNEEZE, SNEEZE + 0.1)) * (1 - ease(R(t, 20.0, 20.6)));
      P.lean += -0.2 * a * (1 - s) + 0.28 * s; P.squash *= (1 + 0.07 * a * (1 - s)) * (1 - 0.13 * s);
      // rzut bukietem
      const kt = ease(R(t, BQ_THROW - 0.35, BQ_THROW)) * (1 - ease(R(t, BQ_THROW + 0.2, BQ_THROW + 0.6)));
      P.armR = ARMS(P.armR.fwd + 2.2 * kt, P.armR.out + 0.3 * kt, 0.2); P.bob += hop(t, BQ_THROW, 0.07);
    }
    if (id === "brez") { P.bob += hop(t, 4.0, 0.06) + hop(t, 25.25, 0.06) + hop(t, 26.6, 0.14); P.squash *= squashOf(t, 26.6); }
    if (id === "doener") {
      const k = ease(R(t, 25.2, 25.45)) * (1 - ease(R(t, 26.4, 26.8))); P.armR = ARMS(P.armR.fwd + k * 2.3, P.armR.out + 0.15 * k, 0.15); P.lean += 0.12 * k; // „Einspruch!” — palec w górę
      const kh = ease(R(t, 28.3, 28.7)) * (1 - ease(R(t, 30.1, 30.5))); P.armL = ARMS(P.armL.fwd + kh * 0.9, P.armL.out - 0.5 * kh, 0.3 + 1.0 * kh); // ręka na sercu
      P.bob += hop(t, 38.4, 0.12);
    }
    if (id === "versp") {
      P.armL = ARMS(P.armL.fwd + 0.9 * run * Math.sin(po.dist * 5.5), P.armL.out, 0.6); P.armR = ARMS(P.armR.fwd - 0.9 * run * Math.sin(po.dist * 5.5), P.armR.out, 0.6);
      const kp = ease(R(t, 36.3, 36.5)) * (1 - ease(R(t, 37.4, 37.9))); P.lean += 0.22 * kp; P.squash *= 1 + 0.035 * Math.sin(t * 13) * kp; // zdyszany
      const kw = ease(R(t, 37.4, 37.7)) * (1 - ease(R(t, 38.2, 38.5))); P.armR = ARMS(P.armR.fwd + 2.2 * kw, P.armR.out + 0.3 * kw, 0.3); P.rotY += 0.1 * Math.sin(t * 12) * kw;
      extra.sweat = kp; P.bob += hop(t, 38.45, 0.1);
    }
    P.face = { ...blendExpr(exprAt(id, t), extra), ...(mouth(id, t) ?? {}) };
    c.pose(P);
  });
};

// ---------- rekwizyty ----------
const STAMP_REST = V(0.25, 0.76, -0.05), STAMP_HIT = V(-0.02, 0.785, -0.04);
const BOARD_HIT = V(0.14, 0.9, 0.045);
const propsAt = (set: Built, t: number) => {
  const w = set.wedding;
  w.antrag.forEach((a) => { if (!a.userData.home) a.userData.home = { p: a.position.clone(), r: a.rotation.clone() }; a.position.copy(a.userData.home.p); a.rotation.copy(a.userData.home.r); a.scale.setScalar(1); });
  const s2 = LN.S2_buero; const pops = [s2.start + 0.62 * (s2.end - s2.start), s2.start + 0.8 * (s2.end - s2.start)];
  [0, 1].forEach((i) => { const a = w.antrag[i]; const u = R(t, pops[i], pops[i] + 0.25); a.visible = t >= pops[i]; const sc = u >= 1 ? 1 : 0.2 + 0.8 * u + 0.25 * Math.sin(Math.PI * u); a.scale.setScalar(sc); a.position.y += 0.06 * Math.sin(Math.PI * u); });
  w.antrag[2].visible = true;
  // kichnięcie: trzy egzemplarze odlatują w górę, wirując
  const fu = t - SNEEZE;
  if (fu > 0) w.antrag.forEach((a, i) => {
    if (t >= 22.1) { a.visible = false; return; }
    const u = fu, d = i - 1;
    a.position.x += d * 0.45 * u + 0.04 * Math.sin(u * 6 + i); a.position.y += 0.9 * u + 0.25 * u * u + 0.05 * Math.sin(u * 9 + i * 2); a.position.z += (0.35 + 0.1 * i) * u;
    a.rotation.x += u * (2.5 + i); a.rotation.z += u * (1.5 - i) + 0.4 * Math.sin(u * 7 + i);
  });
  // ujęcie 12: kartka sprzeciwu wraca na biurko
  if (t >= SH[11].start - 0.2) { const a = w.antrag[2]; a.visible = true; a.position.copy(a.userData.home.p); a.rotation.copy(a.userData.home.r); }
  w.stampMark.visible = (t >= 0.4 && t < 22.1) || t >= HIT12;
  // pieczątka
  const st = w.stamp; if (!st.userData.desk) st.userData.desk = st.parent;
  const desk = st.userData.desk as THREE.Object3D;
  const strike = (t0: number, rest: THREE.Vector3, hit: THREE.Vector3, up: THREE.Vector3) => {
    if (t < t0) st.position.copy(up).lerp(hit, Math.pow(R(t, t0 - 0.28, t0), 2));
    else if (t < t0 + 0.15) st.position.copy(hit);
    else if (t < t0 + 0.45) st.position.copy(hit).lerp(up, ease(R(t, t0 + 0.15, t0 + 0.45)) * 0.6);
    else st.position.copy(hit).lerp(up, 0.6).lerp(rest, ease(R(t, t0 + 0.45, t0 + 1.1)));
    const sq = t >= t0 && t < t0 + 0.15 ? 1 - 0.25 * Math.sin(Math.PI * R(t, t0, t0 + 0.15)) : 1;
    st.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  };
  st.rotation.set(0, 0, 0); st.scale.setScalar(1);
  if (t < HIT17 - 0.9) {
    if (st.parent !== desk) desk.add(st);
    const hover = STAMP_HIT.clone().setY(1.0);
    if (t < 3) strike(0.4, STAMP_REST, STAMP_HIT, hover);
    else if (t < HIT12 - 0.9) st.position.copy(STAMP_REST);
    else if (t < HIT12 - 0.28) st.position.copy(STAMP_REST).lerp(hover, ease(R(t, HIT12 - 0.9, HIT12 - 0.4)));
    else strike(HIT12, STAMP_REST, STAMP_HIT, hover);
  } else {
    // ujęcie 17: pieczątka leci z biurka i wbija „ABGELEHNT” w tablicę
    const b = w.board; if (st.parent !== b) b.add(st);
    b.updateMatrixWorld(true); desk.updateMatrixWorld(true);
    const from = b.worldToLocal(desk.localToWorld(STAMP_REST.clone()));
    const front = BOARD_HIT.clone().setZ(0.4);
    const u = ease(R(t, HIT17 - 0.9, HIT17 - 0.3));
    if (t < HIT17 - 0.28) { st.position.copy(from).lerp(front, u); st.position.y += 0.6 * Math.sin(Math.PI * u); st.rotation.x = (Math.PI / 2) * u; }
    else { st.rotation.x = Math.PI / 2; strike(HIT17, front, BOARD_HIT, front); }
  }
  // znak na tablicy
  if (!w.board.userData.mark) { const m = w.stampMark.clone(); m.rotation.set(0, 0, 0.2); m.position.copy(BOARD_HIT).setZ(0.05); m.scale.setScalar(3); w.board.add(m); w.board.userData.mark = m; }
  (w.board.userData.mark as THREE.Object3D).visible = t >= HIT17;
  w.board.visible = t >= SH[15].start - 0.4;
  // tablica: wyskok przy pojawieniu, lekkie kołysanie; A i B pulsują pod lektora
  { const u = R(t, SH[15].start - 0.4, SH[15].start + 0.1); w.board.scale.setScalar(u >= 1 ? 1 : 0.3 + 0.7 * u + 0.18 * Math.sin(Math.PI * u)); w.board.rotation.z = 0.015 * Math.sin(t * 2.1);
    const s16 = LN.S16_OFF; const pul = (t0: number) => 1 + 0.12 * Math.sin(Math.PI * R(t, t0, t0 + 0.35));
    w.board.children[3].scale.setScalar(pul(s16.start + 0.05)); w.board.children[4].scale.setScalar(pul(s16.start + 0.5 * (s16.end - s16.start))); }
  // bukiet: z rąk Curry łukiem do Pfandolino, potem z nim (omdlenie)
  const bq = w.bouquet; bq.visible = t >= BQ_THROW - 0.4 && t < SH[13].start + 3;
  const cH = V(-0.42 - 0.12, 1.0, 1.35 + 0.12), pH = V(-1.25, 1.05, 1.05);
  bq.rotation.set(0, 0, 0);
  if (t < BQ_THROW) bq.position.copy(cH);
  else if (t < BQ_LAND) { const u = R(t, BQ_THROW, BQ_LAND); bq.position.copy(cH).lerp(pH, u); bq.position.y += 0.75 * Math.sin(Math.PI * u); bq.rotation.set(u * 5, 0, u * 2); }
  else { const kf = ease(R(t, FAINT, FAINT + 0.45)) * (1 - ease(R(t, RECOVER, RECOVER + 0.5))); bq.position.copy(pH).add(V(0, -0.22 * kf, -0.25 * kf)); bq.rotation.set(0, 0, 0.3 * kf); }
};

// ---------- światło ----------
const KEY_DAY = new THREE.Color("#fff1dc"), KEY_WARM = new THREE.Color("#ffcf96");
const lightAt = (set: Built, t: number) => {
  const s5 = SH[4]; const k = ease(R(t, s5.start - 0.2, s5.start + 0.3)) * (1 - ease(R(t, s5.end - 0.3, s5.end + 0.2)));
  set.key.color.copy(KEY_DAY).lerp(KEY_WARM, k); set.key.intensity = 1.72 + 0.2 * k;
};

const Inner: React.FC = () => {
  const f = useCurrentFrame(); const t = f / FPS;
  const { camera, scene } = useThree();
  const set = useMemo(buildSet, []);
  const keys = useMemo(() => { propsAt(set, 0); set.root.updateMatrixWorld(true); return buildKeys(set); }, [set]);
  useMemo(() => { scene.background = skyTex("#3e7fd2", "#9cbfea", "#dcecff"); scene.fog = new THREE.Fog("#b8d0ec", 25, 120); }, [scene]);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  set.villa.update(t, {});
  poseAll(set, t); propsAt(set, t); lightAt(set, t);
  const P = camAt(keys, t);
  // drgnięcie kamery przy uderzeniu pieczątki
  for (const h of [0.4, HIT12, HIT17]) { const sh = R(t, h, h + 0.22); if (sh > 0 && sh < 1) P.e.y += 0.012 * Math.sin(sh * Math.PI * 6) * (1 - sh); }
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = P.fov; cam.updateProjectionMatrix(); cam.position.copy(P.e); cam.lookAt(P.l); cam.layers.enable(NOINK);
  // chorągiewki girlandy chowamy, gdy kamera przez nie przelatuje
  set.wedding.group.updateMatrixWorld(); const wp = new THREE.Vector3();
  set.wedding.group.traverse((o: THREE.Object3D) => { if (o.userData.nearCull) o.visible = o.getWorldPosition(wp).distanceTo(P.e) > (typeof o.userData.nearCull === "number" ? o.userData.nearCull : 1.5); });
  // bezpiecznik: postać, w którą kamera by wjechała, znika (nigdy kadru „z wnętrza głowy”)
  for (const id of CAST_IDS) { const g = set.cast[id].group; if (g.visible && Math.hypot(g.position.x - P.e.x, g.position.z - P.e.z) < 0.45 && P.e.y < 2.2) g.visible = false; }
  fx.lens.focus = P.e.distanceTo(P.l); fx.lens.cInf = t < 1.3 || (t > SH[11].start + 0.3 && t < SH[11].end - 0.2) ? 4 : 9;
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

export const KosE04: React.FC = () => (
  <AbsoluteFill style={{ background: "#cfe3f2" }}>
    <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
      camera={{ fov: 40, near: 0.05, far: 400 }}>
      <Inner />
      <ComposerReady />
    </ThreeCanvas>
  </AbsoluteFill>
);
