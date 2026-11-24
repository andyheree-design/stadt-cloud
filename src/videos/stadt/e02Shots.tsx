// E02 „Die Bahn” — ujęcia po id (timeline.json shots[].id). Plan główny: dworzec Hinterhausen (peron z∈[31,35], tor 1 z=36,1),
// szkoła i ratusz w mieście (Town), pokój nocą (sofaHome). Refren „Huss” (6 ujęć): Ich na peronie o zmierzchu — POV, żabia perspektywa, zbliżenia.
import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { SPOT } from "./Town";
import { Router } from "./Props";
import { Counter, Comments } from "./Overlays";
import { PhoneFlat } from "./PropsV3";
import { Spec, Cam, Act, close, PI, SW } from "./e01Shots";
import { SpecV3 } from "./e01v3Shots";
import { R6Pose } from "./R6";
import { ST, Anzeige, StationClock, Speaker, Train, DoenerStand, Kasse, Money, Sofa, LivingSet, Ticket, Cobweb, SchoolBoard, MayorDesk, SorryBanner, BroetchenBag, Hearts } from "./PropsE02";

type V3 = [number, number, number];
export type ActE02 = Act & { s?: number };
export type SpecE02 = Omit<SpecV3, "acts"> & { acts?: ActE02[] };
const PH = ST.PH, ZI = 33.8; // wysokość peronu, linia „aktorska” na peronie
/** zbliżenie na peronie (close() z poprawką wysokości) */
const pc = (c: string, x: number, o: Parameters<typeof close>[3] & { z?: number } = {}) => close(c, x, o.z ?? ZI, { y: PH, ...o });
/** kolejarz Deutsche-Bahn-podobny (bez logo): czerwona czapka, „BAHN” */
const BAHNER = { shirt: "#d6222a", hatColor: "#d6222a", hatAccent: "#fff", accent: "#fff", print: "BAHN", pants: "#26292e" };
const WIFE = { hat: "longhair" as const, hatColor: "#7a3a1a", shirt: "#ff7ab0", cloth: "blouse" as const, accent: "#fff", face: "happy" as const };

// tablica i zegar — stałe miejsca na peronie
const BOARD: V3 = [-3, PH + 2.0, 33.6], CLOCK: V3 = [0.5, PH + 2.35, 32.9], SPK: V3 = [0, PH + 2.05, 31.45];
const board = (delay: string, o: { line?: string; dest?: string; color?: string; blink?: number } = {}) =>
  <Anzeige position={BOARD} delay={delay} line={o.line} dest={o.dest} delayColor={o.color ?? "#ff4a3a"} blink={o.blink} scale={0.8} />;
const clock = (h: number, m: number, s = 0) => <StationClock position={CLOCK} h={h} m={m} s={s} r={0.3} pole={1.95} />;
/** stałe dekoracje peronu (zegar, głośnik, tablica „+999 min”) */
const deco = (t: number, delay = "+999 min", spk = false) => <>{board(delay, { blink: 0.7 + 0.3 * Math.abs(Math.sin(t * 5)) })}{clock(8, 12, Math.floor(t) % 60)}<Speaker position={SPK} t={t} on={spk} scale={0.8} /></>;

/** czekający na peronie (statyści), rozstawieni wzdłuż peronu */
const WAIT: [string, number, number, number][] = [["extra1", -6.5, 32.4, 0.3], ["extra2", -1.4, 33.0, -0.2], ["lehrerin", 4.2, 32.6, 0.4], ["extra3", 6.6, 33.3, -0.4], ["murat", -8.6, 33.2, 0.2], ["kevin", 9.2, 32.8, -0.3]];
const waiting = (face?: any, poses: R6Pose[] = [{ phone: 1 }, { cross: 1 }, { lean: 0.15, phone: 1 }, { cross: 1 }, { headScratch: 1 }, { phone: 1 }], skip: string[] = []): ActE02[] =>
  WAIT.filter((w) => !skip.includes(w[0])).map(([c, x, z, r], i) => ({ c, face, pose: poses[i % poses.length], p: [x, PH, z], r, dt: i * 0.37 }));
/** ciepłe światło zmierzchu na twarzy (refren) */
const warm = (p: V3) => <pointLight position={p} color="#ffb067" intensity={5} distance={7} decay={1.5} />;
const ICH_X = 1.5;
const dusk = (s: SpecE02, kp?: V3): SpecE02 => ({ ...s, light: "dusk", fxo: { sat: 0.24, bright: 0.03, ...(s.fxo ?? {}) },
  props: (u, t) => <>{deco(t)}{s.props?.(u, t)}{warm(kp ?? [ICH_X + 1.2, PH + 1.6, ZI + 1.6])}</> });
/** POV bohatera na peronie (ręce od dołu kadru) */
const POVP = (l: V3): Cam => ({ p: [ICH_X, PH + 1.02, ZI + 0.05], l, fov: 52, shake: 0.004, mv: [0, 0, 0.05] });

const sofaSet = (x: number, z: number, t: number, router = false) => <>
  <Sofa position={[x, PH, z]} /><LivingSet position={[x, PH, z]} />
  {router && <Router position={[x - 1.3, PH + 0.5, z]} rot={[0, 0.5, 0]} scale={0.7} />}
  {router && [0, 1, 2].map((i) => { const k = (t * 1.2 + i / 3) % 1; return <mesh key={i} position={[x - 1.3, PH + 0.75 + k * 0.5, z]}><torusGeometry args={[0.08 + k * 0.25, 0.012, 6, 30, PI / 2]} /><meshBasicMaterial color="#3bb4ff" transparent opacity={1 - k} toneMapped={false} /></mesh>; })}
</>;
const POSTSOFA = (pose: R6Pose, face: any = "smug"): ActE02 => ({ c: "post", face, pose, p: [6.2, PH - 0.12, 32.2], r: 0 });

const DX = 9.5, DZ = 32.0; // budka z Dönerem
const SCH = { x: SPOT.schule.x, z: SPOT.schule.z }, RH = { x: SPOT.rathaus.x, z: SPOT.rathaus.z };
const schoolProps = (rows: string[]) => () => <group position={[SCH.x + 0.6, 0.35, SCH.z + 0.2]} scale={0.62}><SchoolBoard position={[0, 1.15, 0]} rotY={-PI / 2} rows={rows} />
  {[-1, 1].map((s) => <mesh key={s} position={[0.1, 0.55, s * 1.2]}><boxGeometry args={[0.06, 1.6, 0.06]} /><meshStandardMaterial color="#6b4a2b" /></mesh>)}</group>;
const PUPILS: ActE02[] = [[-0.2, 0], [-0.3, 0.9], [-1.1, -0.5], [-1.0, 0.5], [-0.4, -0.9]].map(([dx, dz], i) => ({ c: ["kevin", "extra1", "extra2", "extra3", "ich"][i], face: "shock" as any, pose: i % 2 ? { headScratch: 1 } : {}, p: [SCH.x - 1.5 + dx, SW, SCH.z + dz] as V3, r: PI / 2, s: 0.62, dt: i * 0.3 }));
const roomSofa = (pose: R6Pose[]): ActE02[] => ["ich", "kevin", "oma"].map((c, i) => ({ c, face: "happy" as any, pose: pose[i], p: [-0.62 + i * 0.62, -0.1, -1.12] as V3, r: 0, dt: i * 0.4 }));
const TRAIN_IN = (u: number) => 26 * Math.pow(1 - u, 2.2) - 4; // czoło pociągu: z prawej, hamuje

/** licznik lat czekania (rok bez kropki tysięcy) */
const Years: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame() - at, { fps } = useVideoConfig(), pop = spring({ frame: f, fps, config: { damping: 9, stiffness: 220 } });
  const y = Math.round(interpolate(f, [8, 70], [1998, 2026], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return <div style={{ position: "absolute", top: 110, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${0.6 + 0.4 * pop})` }}>
    <div style={{ background: "rgba(0,0,0,.75)", border: "5px solid #fff", borderRadius: 40, padding: "6px 28px", fontFamily: "Fredoka, sans-serif", fontWeight: 700, color: "#fff", fontSize: 62, textAlign: "center", lineHeight: 1.05 }}>
      ⏳ {y}<div style={{ fontSize: 38, color: "#ffd23f" }}>{y - 1998} Jahre gewartet</div></div></div>;
};

/** ujęcie z lotu ptaka (klatka 0 i ostatnia → pętla) i zbliżenie twarzy „ich” (jak pc() z fov 32) */
const BIRD = { p: [ICH_X + 7, 72, ZI + 27] as V3, l: [-1.5, 0, 12] as V3, fov: 50 };
const FACE = { p: [ICH_X + 0.1, PH + 0.88, ZI + 2.05] as V3, l: [ICH_X, PH + 0.7, ZI] as V3, fov: 32 };
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** lot w dół: start bardzo szybki, hamowanie przy twarzy; wysokość spada później niż poziom → łuk, nie prosta */
const dive = (u: number) => { const e = 1 - Math.pow(1 - u, 3.2), ey = 1 - Math.pow(1 - u, 2.4), el = 1 - Math.pow(1 - u, 4.5);
  const p = lerp3(BIRD.p, FACE.p, e); p[1] = BIRD.p[1] + (FACE.p[1] - BIRD.p[1]) * ey;
  return { p, l: lerp3(BIRD.l, FACE.l, el), fov: BIRD.fov + (FACE.fov - BIRD.fov) * e }; };
/** finał: twarz (zbliża się) do ostatniego „Huss”, potem odlot w górę do kadru klatki 0 */
const OUT_AT = 0.38, FKEY: [number, number, number, number, number] = [ICH_X + 0.5, PH + 1.18, ZI + 1.6, 2.5, 4];
const outro = (u: number) => { if (u < OUT_AT) { const k = u / OUT_AT, z = 1 - 0.22 * (k * k * (3 - 2 * k)); return { ...FACE, fov: FACE.fov * z }; }
  const k = Math.pow((u - OUT_AT) / (1 - OUT_AT), 2.2), d = dive(1 - k); return { ...d, fov: d.fov * (0.78 + 0.22 * Math.min(1, k / 0.05)) }; };

export const SHOTS_E02: Record<string, SpecE02> = {
  // 1 — In dieser Stadt ist die Bahn noch nie pünktlich gekommen.
  // HOOK (klatka 0) — nagłe przybliżenie z lotu ptaka: miasto + dworzec z ~70 m → twarz „ich” na peronie (pętla z hussOutro)
  stationWide: dusk({ fx: "close", fxo: { bokeh: 0.9, sat: 0.3 }, cam: { p: BIRD.p, l: BIRD.l, fov: 50, focus: (u) => dive(u).l, fn: dive, shake: 0.002 }, key: FKEY,
    town: { center: [0, 16], wide: true, fog: (u) => { const k = Math.pow(1 - u, 2); return [40 + 170 * k, 160 + 360 * k]; } },
    acts: [{ c: "ich", face: "angry", pose: { cross: 1, talk: 1, shake: 0.3 }, p: [ICH_X, PH, ZI], r: 0.15 }, ...waiting("angry")],
    props: (u, t) => deco(t) }),
  boardDelay: { fx: "close", cam: { p: [-2.4, PH + 1.55, 35.4], l: [-3, PH + 1.95, 33.6], fov: 38, zoom: 0.75, fast: true, focus: BOARD },
    acts: [{ c: "extra2", face: "angry", pose: { point: 1, shake: 0.5 }, p: [-2.6, PH, 34.3], r: PI + 0.3 }], props: (u, t) => deco(t), key: [-2, PH + 1.6, 35.2, 2, 5] },
  clockSpin: { fx: "close", fxo: { bokeh: 3 }, cam: { p: [0.9, PH + 2.0, 34.0], l: [0.5, PH + 2.32, 32.9], fov: 34, shake: 0.006, zoom: 0.8, focus: CLOCK },
    props: (u, t) => <>{clock(8 + t * 2, t * 300, t * 400)}<Speaker position={SPK} t={t} on={false} scale={0.8} /></>, key: [1.4, PH + 2.4, 34.4, 2.5, 4] },
  // 3 — Meine Oma wartet seit 1998 auf den RE7. Sie hat noch ein Ticket in D-Mark.
  omaBench: { fx: "close", ...pc("oma", -4.6, { z: 32.2, face: "smug", pose: { cross: 1 }, zoom: 0.9 }),
    props: (u, t) => <>{deco(t)}<Cobweb position={[-4.05, PH + 1.3, 32.15]} rotY={0.2} s={0.4} /><Cobweb position={[-5.15, PH + 0.55, 32.2]} rotY={0.2} s={0.3} /></>,
    ui: (s) => <Years at={s} /> },
  boardRE7: { fx: "close", fxo: { bokeh: 1.5 }, cam: { p: [-2.0, PH + 0.6, 35.6], l: [-3.2, PH + 1.6, 33.4], fov: 44, mv: [0.3, 0.1, -0.2], focus: BOARD },
    acts: [{ c: "oma", face: "smug", pose: { cross: 1 }, p: [-3.4, PH, 33.9], r: 0.3 }],
    props: (u, t) => <>{board("seit 1998", { line: "RE7", color: "#ffd23a" })}{clock(8, 12)}</>, key: [-2.4, PH + 1.4, 35.2, 2.5, 4] },
  dmarkTicket: { fx: "close", fxo: { bokeh: 4 }, cam: { p: [-4.4, PH + 1.05, 33.75], l: [-4.55, PH + 0.75, 32.6], fov: 42, mv: [0, 0, -0.25], focus: [-4.55, PH + 0.8, 32.75] },
    acts: [{ c: "oma", face: "happy", pose: { point: 0.4 }, p: [-4.6, PH, 32.2], r: 0 }],
    props: (u, t) => <><Ticket position={[-4.55, PH + 0.8, 32.72]} rot={[-0.35, 0.1, Math.sin(t * 3) * 0.04]} scale={0.9} />{deco(t)}</>, key: [-4.0, PH + 1.4, 33.6, 2.5, 4] },
  // 4 — Der Postbote wohnt inzwischen auf Gleis drei. Mit Sofa. Und WLAN.
  postSofa: { fx: "park", cam: { p: [6.9, PH + 1.5, 35.6], l: [5.6, PH + 0.6, 32.0], fov: 46, mv: [-0.5, -0.15, -0.3], focus: [6.2, PH + 0.7, 32.3] },
    acts: [POSTSOFA({ wave: 1 }, "happy"), ...waiting("shock", undefined, ["extra3", "kevin", "lehrerin"])], props: (u, t) => <>{sofaSet(6.2, 32.3, t)}{deco(t)}</> },
  sofaClose: { fx: "close", ...{ ...close("post", 6.2, 32.2, { y: PH - 0.12, face: "smug", pose: { phone: 1 }, zoom: 0.85, fov: 34 }), acts: [POSTSOFA({ phone: 1 })] },
    props: (u, t) => <>{sofaSet(6.2, 32.3, t)}{deco(t)}</> },
  routerPlatform: { fx: "close", fxo: { bokeh: 3.5 }, cam: { p: [4.4, PH + 0.95, 33.1], l: [4.9, PH + 0.6, 32.3], fov: 40, zoom: 0.8, fast: true, focus: [4.9, PH + 0.6, 32.3] },
    acts: [POSTSOFA({ phone: 1 }, "happy")], props: (u, t) => <>{sofaSet(6.2, 32.3, t, true)}{deco(t)}</>, key: [4.6, PH + 1.4, 33.6, 2.5, 4] },
  // 5 — Der Dönermann hat am Bahnsteig einen Laden aufgemacht. Bester Umsatz der Stadt.
  doenerStand: { fx: "park", cam: { p: [6.4, PH + 1.5, 37.0], l: [9.4, PH + 1.0, 32.0], fov: 50, mv: [0.3, 0, -0.4], focus: [DX, PH + 1.0, DZ + 0.6] },
    acts: [{ c: "murat", face: "grin", pose: { wave: 1 }, p: [DX, PH, DZ - 0.15], r: 0 }, ...[0, 1, 2, 3].map((i): ActE02 => ({ c: ["extra1", "kevin", "extra3", "oma"][i], face: "happy", pose: i % 2 ? { phone: 1 } : {}, p: [DX - 1.2 - i * 0.7, PH, DZ + 1.2 + (i % 2) * 0.3], r: PI / 2 + 0.3, dt: i * 0.3 }))],
    props: (u, t) => <><DoenerStand position={[DX, PH, DZ]} t={t} />{deco(t)}</> },
  doenerCash: { fx: "doener", ...pc("murat", DX, { z: DZ - 0.15, face: "evil", pose: { armsUp: 1, jump: 0.3 }, zoom: 0.85 }),
    props: (u, t) => <><DoenerStand position={[DX, PH, DZ]} t={t} /><Kasse position={[DX + 0.55, PH + 0.86, DZ + 0.55]} rotY={-0.3} text="99.999 €" /><Money position={[DX, PH + 0.9, DZ + 0.4]} t={t} n={14} /></>,
    ui: (s) => <Counter from={0} to={99999} at={s} dur={60} /> },
  // 6 — In der Schule lernen wir: Verspätung ist kein Problem. Verspätung ist ein Gefühl.
  schoolBoard: { fx: "street", fxo: { bright: -0.05, contrast: -0.12 }, cam: { p: [SCH.x - 3.6, 1.15, SCH.z - 1.2], l: [SCH.x + 0.4, 0.95, SCH.z + 0.3], fov: 44, mv: [0.6, 0, 0.2], focus: [SCH.x + 0.5, 1.0, SCH.z + 0.2] },
    acts: [{ c: "lehrerin", face: "evil", pose: { point: 1, talk: 1 }, p: [SCH.x - 0.1, SW, SCH.z + 1.4], r: -PI / 2 - 0.4 }, ...PUPILS], props: schoolProps(["Verspätung =", "kein Problem"]), key: [SCH.x - 1.5, 1.6, SCH.z, 3, 6] },
  teacher: { fx: "close", ...close("lehrerin", SCH.x - 0.1, SCH.z + 1.4, { r: -PI / 2 - 0.25, face: "evil", pose: { point: 1, talk: 1 }, zoom: 0.9 }), props: schoolProps(["Verspätung ist", "ein Gefühl"]) },
  teacherClose: { fx: "close", fxo: { bokeh: 3 }, ...close("lehrerin", SCH.x - 0.1, SCH.z + 1.4, { r: -PI / 2 + 0.2, face: "grin", pose: { armsUp: 0.6, talk: 1 }, zoom: 0.7, fast: true, fov: 28 }), props: schoolProps(["Verspätung ist", "ein Gefühl"]) },
  // 7 — Achtung an Gleis drei. Ihr Zug hat heute eine Verspätung von circa... ja.
  speaker: { fx: "close", fxo: { bokeh: 2.5 }, cam: { p: [0.75, PH + 1.65, 32.85], l: [0, PH + 2.05, 31.5], fov: 36, zoom: 0.85, shake: 0.004, focus: SPK }, props: (u, t) => <>{deco(t, "+999 min", true)}</>, key: [0.6, PH + 2.3, 32.6, 2.5, 4] },
  platformCrowd: { fx: "park", cam: { p: [2.5, PH + 2.2, 36.2], l: [0, PH + 1.1, 32.2], fov: 54, mv: [-0.8, -0.3, 0], focus: [0.5, PH + 1.0, 33] },
    acts: waiting("shock", [{ armsUp: 0.4 }, { facepalm: 1 }, { point: 1 }, { shake: 1 }, { facepalm: 1 }, { armsUp: 0.6 }]).concat([{ c: "ich", face: "shock", pose: { headScratch: 1 }, p: [ICH_X, PH, ZI], r: -0.5 }]),
    props: (u, t) => deco(t, "+999 min", true) },
  speakerClose: { fx: "close", fxo: { bokeh: 3 }, cam: { p: [0.3, PH + 1.9, 32.3], l: [0, PH + 2.05, 31.5], fov: 34, zoom: 0.65, fast: true, shake: 0.008, focus: SPK }, props: (u, t) => deco(t, "+999 min", true), key: [0.5, PH + 2.3, 32.4, 2.5, 4] },
  // 8 — Kevin hat auf dem Bahnsteig seine Frau kennengelernt. Die haben jetzt zwei Kinder. Der Zug ist immer noch nicht da.
  kevinCouple: { fx: "close", fxo: { bokeh: 2.5 }, cam: { p: [-0.6, PH + 0.95, 35.95], l: [-0.6, PH + 0.8, 33.6], fov: 38, mv: [0, 0, -0.3], focus: [-0.6, PH + 0.9, 33.6] },
    acts: [{ c: "kevin", face: "happy", pose: { wave: 0.3 }, p: [-0.95, PH, 33.6], r: 0.6 }, { c: "extra1", look: WIFE, pose: { talk: 1 }, p: [-0.25, PH, 33.6], r: -0.6 }],
    props: (u, t) => <><Hearts position={[-0.6, PH + 1.2, 33.6]} t={t} />{deco(t)}</>, key: [-0.6, PH + 1.4, 35.2, 2.5, 4] },
  kevinKids: { fx: "close", fxo: { bokeh: 1.8 }, cam: { p: [-0.6, PH + 1.1, 36.3], l: [-0.6, PH + 0.7, 33.6], fov: 44, mv: [0.3, 0, 0.1], focus: [-0.6, PH + 0.7, 33.6] },
    acts: [{ c: "kevin", face: "happy", pose: { cross: 1 }, p: [-1.15, PH, 33.5], r: 0.2 }, { c: "extra1", look: WIFE, pose: { wave: 1 }, p: [-0.05, PH, 33.5], r: -0.2 },
      { c: "kevin", look: { hat: "hair", hatColor: "#2a1a10", shirt: "#3cba54" }, face: "grin", pose: { jump: 0.6, armsUp: 1 }, p: [-0.75, PH, 33.95], r: 0, s: 0.6 },
      { c: "extra1", look: { ...WIFE, shirt: "#ffd23f" }, face: "happy", pose: { dance: 1 }, p: [-0.4, PH, 34.0], r: 0, s: 0.55, dt: 0.4 }],
    props: (u, t) => deco(t), key: [-0.6, PH + 1.4, 35.4, 2.5, 4], ui: (s) => <Counter from={0} to={2} at={s} dur={30} /> },
  emptyTrack: { fx: "park", fxo: { sat: -0.1, bokeh: 0.5 }, cam: { p: [2, 0.55, ST.TZ], l: [-40, 0.4, ST.TZ], fov: 48, mv: [-0.6, 0, 0], shake: 0.002 },
    props: (u, t) => <><mesh position={[-6 + u * 3, 0.32 + Math.abs(Math.sin(t * 6)) * 0.12, ST.TZ + 0.1]} rotation={[0, 0, t * 5]}><icosahedronGeometry args={[0.2, 1]} /><meshStandardMaterial color="#b0904a" roughness={1} wireframe /></mesh>{deco(t)}</> },
  // 9 — Niemand glaubt mehr an die Bahn. Bis eines Tages der Zug pünktlich kam. Auf die Minute.
  sadCrowd: { fx: "park", fxo: { sat: -0.15, bright: -0.06 }, cam: { p: [-2.5, PH + 1.3, 36.0], l: [0.5, PH + 0.8, 32.8], fov: 50, mv: [0.8, 0, -0.2], focus: [0, PH + 0.8, 33] },
    acts: [...waiting("sad", [{ facepalm: 1 }, { cross: 1 }, { lean: 0.3 }, { facepalm: 1 }, { cross: 1 }, { lean: 0.25 }]), { c: "ich", face: "sad", pose: { lean: 0.3 }, p: [ICH_X, PH, ZI], r: -0.3 }], props: (u, t) => deco(t) },
  trainArrive: { fx: "park", fxo: { bokeh: 1 }, cam: { p: [-3.5, PH + 0.95, 34.7], l: [12, PH + 1.0, 36.0], fov: 46, shake: 0.006, focus: (u) => [TRAIN_IN(u) + 1, 1.2, ST.TZ] },
    acts: [{ c: "ich", face: "shock", pose: { armsUp: 1, jump: 0.4 }, p: [-1.6, PH, 33.6], r: PI / 2 + 0.3 }], props: (u, t) => <><Train x={TRAIN_IN(u)} />{deco(t)}</> },
  clockExact: { fx: "close", fxo: { bokeh: 1.5 }, cam: { p: [2.3, PH + 1.55, 35.6], l: [0.2, PH + 2.0, 32.9], fov: 44, zoom: 0.8, fast: true, focus: CLOCK },
    props: (u, t) => <>{clock(8, 0, 0)}<Train x={-4} />{board("pünktlich", { color: "#3ad16a" })}</>, key: [1.0, PH + 2.5, 34.2, 1.4, 4] },
  // 10 — Und der Bahnsteig war leer. Weil alle zu Hause waren. Der Zug kommt ja eh nie.
  emptyPlatform: { fx: "park", fxo: { sat: -0.05 }, cam: { p: [12, PH + 2.6, 34.3], l: [-4, PH + 0.6, 32.6], fov: 48, mv: [-1.5, -0.4, 0] },
    props: (u, t) => <><Train x={-16} />{deco(t, "PÜNKTLICH", false)}<mesh position={[6 - u * 6, PH + 0.2 + Math.abs(Math.sin(t * 7)) * 0.15, 33.2]} rotation={[0, 0, t * 6]}><icosahedronGeometry args={[0.2, 1]} /><meshStandardMaterial color="#b0904a" roughness={1} wireframe /></mesh></> },
  sofaHome: { room: true, fx: "room", cam: { p: [0, 1.05, 1.4], l: [0, 0.6, -1.2], fov: 46, mv: [0, 0, -0.3], focus: [0, 0.7, -1.2] },
    acts: roomSofa([{ phone: 1 }, { cross: 1 }, { talk: 1 }]), props: () => <><Sofa position={[0, 0, -1.2]} color="#3b74d6" /><pointLight position={[0, 1, 0.6]} color="#8ab4ff" intensity={2.5} distance={4} /></>, key: [0.4, 1.5, 0.3, 2.5, 4] },
  trainWait: { fx: "park", fxo: { bokeh: 1.2 }, cam: { p: [-6.8, PH + 1.0, 34.2], l: [-3.2, PH + 1.2, 36.0], fov: 44, mv: [0.4, 0, 0.1], focus: [-4.6, 1.2, 35.6] },
    props: (u, t) => <><Train x={-4} />{deco(t, "PÜNKTLICH", false)}</> },
  // 11 — Der Bürgermeister macht eine Krisensitzung. Die Bahn muss sich offiziell entschuldigen!
  mayorDesk: { fx: "close", ...close("mayor", -1.6, -24.4, { face: "angry", pose: { point: 1, shake: 1, talk: 1 }, zoom: 0.8, shake: 0.006, fov: 36 }),
    props: (u, t) => <MayorDesk position={[-1.6, 0.12, -24.4 + 0.6]} t={t} /> },
  bahnSorry: { fx: "park", cam: { p: [ICH_X + 0.4, PH + 1.15, 36.4], l: [ICH_X, PH + 1.0, 32.6], fov: 46, mv: [0, 0, -0.4], focus: [ICH_X, PH + 1.0, 33] },
    acts: [{ c: "post", look: BAHNER, face: "sad", pose: { facepalm: 1 }, p: [ICH_X + 0.75, PH, 33.1], r: 0.1 }, { c: "post", look: BAHNER, face: "cry", pose: { talk: 1 }, p: [ICH_X - 0.75, PH, 33.1], r: -0.1, dt: 0.5 }, ...waiting("angry", [{ point: 1 }, { cross: 1 }, { point: 1, shake: 1 }, { cross: 1 }, { facepalm: 1 }, { point: 1 }])],
    props: (u, t) => <><SorryBanner position={[ICH_X, PH, 32.85]} t={t} />{deco(t)}</> },
  // 12 — Jetzt ist der Zug wieder zwei Stunden zu spät. Und alle sind glücklich.
  boardDelay2: { fx: "close", fxo: { bokeh: 1.4 }, cam: { p: [-2.1, PH + 1.2, 35.6], l: [-3, PH + 1.75, 33.6], fov: 42, zoom: 0.85, focus: BOARD },
    acts: waiting("happy", [{ armsUp: 1 }, { wave: 1 }, { dance: 1 }]), props: (u, t) => <>{board("+120 min", { color: "#5aff6a", blink: 0.7 + 0.3 * Math.abs(Math.sin(t * 5)) })}{clock(10, 12)}</>, key: [-2.4, PH + 1.6, 35.2, 2.5, 4] },
  happyCrowd: { fx: "park", fxo: { sat: 0.25 }, cam: { p: [2.0, PH + 1.6, 36.4], l: [-0.5, PH + 0.9, 32.6], fov: 52, mv: [-0.8, -0.2, -0.3], focus: [0, PH + 0.9, 33] },
    acts: [...waiting("happy", [{ armsUp: 1, jump: 0.6 }, { dance: 1 }, { wave: 1, jump: 0.4 }, { dance: 1 }, { armsUp: 1 }, { wave: 1 }]), { c: "ich", face: "happy", pose: { dance: 1 }, p: [ICH_X, PH, ZI], r: -0.3 }],
    props: (u, t) => deco(t, "+120 min"), ui: (s) => <Comments texts={["Endlich normal!", "Alles wie immer", "Danke Bahn"]} at={s} every={10} /> },
  // 13 — Nur Oma hat ihn verpasst. Sie war Brötchen holen. Typisch.
  omaBroetchen: { fx: "park", cam: { p: [-3.2, 1.0, 26.2], l: [-1.5, 0.8, 30.5], fov: 46, mv: [0.4, 0, 0.6], focus: (u) => [-1.6, 0.8, 27.8 + u * 1.8] },
    acts: [{ c: "oma", face: "happy", pose: { walk: 1, walkSpeed: 1.2 }, p: [-1.6, 0.06, 27.8], r: 0, mv: [0, 1.8] }],
    props: (u, t) => <><group position={[-1.32, 0.56, 27.85 + u * 1.8]}><BroetchenBag position={[0, 0, 0]} /></group><Train x={-4 - u * 9} />{deco(t, "ABGEFAHREN")}</>, key: [-2.4, 1.6, 29.0, 2.5, 5] },
  omaTypisch: { fx: "close", ...pc("oma", -0.8, { z: 33.2, face: "sad", pose: { facepalm: 1 }, zoom: 0.85 }),
    props: (u, t) => <><BroetchenBag position={[-0.45, PH + 0.43, 33.35]} /><Train x={-30 - u * 10} />{deco(t, "ABGEFAHREN")}</> },
  // 14 — Und wenn deine Bahn heute pünktlich war... lüg nicht.
  ichSmug: dusk({ fx: "close", ...pc("ich", ICH_X, { r: 0.25, face: "smug", pose: { cross: 1 }, zoom: 0.85 }) }),
  ichPoint: dusk({ fx: "close", ...pc("ich", ICH_X, { r: -0.15, face: "grin", pose: { point: 1, shake: 0.4 }, zoom: 0.6, fast: true, shake: 0.006 }) }),

  // ---------- refren „Huss! Huss! Huss!” (zmierzch, energia jak E01) ----------
  hussPov: dusk({ fx: "close", fxo: { bokeh: 1.5 }, cam: POVP([ICH_X + 2.5, PH + 0.1, ZI + 1.6]), pov: "thumbs",
    props: () => <PhoneFlat position={[ICH_X + 0.05, PH + 0.62, ZI + 0.42]} rotY={0.1} /> }),
  hussPov2: dusk({ fx: "close", fxo: { bokeh: 0.8 }, cam: POVP([-3, PH + 1.85, 33.6]), pov: "point" }),
  hussLow: dusk({ fx: "close", fxo: { bokeh: 1.2 }, cam: { p: [ICH_X + 0.5, PH + 0.32, ZI + 1.25], l: [ICH_X, PH + 1.05, ZI], fov: 44, zoom: 0.8, fast: true, shake: 0.006, focus: [ICH_X, PH + 0.95, ZI] },
    acts: [{ c: "ich", face: "angry", pose: { armsUp: 1, shake: 0.6 }, p: [ICH_X, PH, ZI], r: 0.2 }] }, [ICH_X + 0.6, PH + 0.5, ZI + 1.5]),
  hussGrind: dusk({ fx: "close", ...pc("ich", ICH_X, { r: 0.35, face: "angry", pose: { shake: 1, talk: 1 }, zoom: 0.85, shake: 0.006 }) }),
  hussFast: dusk({ fx: "close", ...pc("ich", ICH_X, { r: -0.35, face: "smile", pose: { wave: 1, shake: 0.5 }, zoom: 0.72, fast: true, shake: 0.008 }) }),
  hussPoint: dusk({ fx: "close", ...pc("ich", ICH_X, { r: 0, face: "grin", pose: { point: 1, shake: 0.6 }, zoom: 0.78, shake: 0.007 }) }),
  hussOutro: dusk({ fx: "close", fxo: { bokeh: 0.9, sat: 0.3 }, cam: { p: FACE.p, l: FACE.l, fov: 32, fn: outro, focus: (u) => outro(u).l, shake: 0.003 }, key: FKEY,
    town: { center: [0, 16], wide: true, fog: (u) => { const k = Math.pow(Math.max(0, (u - OUT_AT) / (1 - OUT_AT)), 2); return [40 + 170 * k, 160 + 360 * k]; } },
    acts: [{ c: "ich", face: "grin", pose: { point: 1, shake: 0.6 }, p: [ICH_X, PH, ZI], r: 0.15 }, ...waiting("angry")] }),
};
export type { Spec };
