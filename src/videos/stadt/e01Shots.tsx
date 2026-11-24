// E01 „RAGEBAIT” — tabela 48 ujęć (indeks = TL.shots[i]); każde ujęcie: plan, kamera, aktorzy, rekwizyty, nakładki 2D.
import React from "react";
import { useCurrentFrame } from "remotion";
import { R6Look, R6Pose, Face } from "./R6";
import { SPOT, PARK_C, CROSS_Z } from "./Town";
import { DoenerProp, Board, Router, Paper, Splash } from "./Props";
import { Counter, VideoUI, PostCard, Comments, Note, Flash } from "./Overlays";

type V3 = [number, number, number];
export type Cam = { p: V3; l: V3; fov: number; mv?: V3; zoom?: number; fast?: boolean; shake?: number; focus?: V3 | ((u: number) => V3);
  /** pełna ścieżka kamery (nadpisuje p/l/mv/zoom) */ fn?: (u: number) => { p: V3; l: V3; fov: number } };
export type Act = { c: string; face?: Face; look?: Partial<R6Look>; pose?: R6Pose; p: V3; r: number; mv?: [number, number]; dt?: number };
export type Key = [number, number, number, number, number]; // x y z intensity distance
export type Spec = {
  room?: boolean; light?: "day" | "dusk"; fx: keyof typeof FX; fxo?: Partial<FxP>; cam: Cam; acts?: Act[]; key?: Key;
  props?: (u: number, t: number) => React.ReactNode; ui?: (s: number, e: number) => React.ReactNode;
};
type FxP = { bokeh?: number; bright?: number; contrast?: number; sat?: number };
// presety skalibrowane na kadrach wzoru (StadtLook v37: parity lum/con/sat/detail)
export const FX = {
  street: { bright: -0.19, contrast: -0.24, sat: 0.15 },
  close: { bokeh: 2.2, bright: 0.03, contrast: -0.1, sat: 0.2 },
  doener: { bokeh: 4, bright: 0, contrast: 0, sat: 0 },
  park: { bright: 0.04, contrast: -0.07, sat: 0.15 },
  cross: { bokeh: 0.3, bright: -0.035, contrast: -0.1, sat: -0.03 },
  room: { bokeh: 1.0, bright: -0.15, contrast: -0.46, sat: 0.13 },
  roomClose: { bokeh: 4, bright: -0.11, contrast: -0.3, sat: 0.12 },
} satisfies Record<string, FxP>;
export const COP = { skin: "#f5cd30", shirt: "#1f4fa8", pants: "#17224a", shoes: "#111", face: "smug", hat: "postcap", hatColor: "#1a2d66", hatAccent: "#ffd23f", cloth: "uniform", accent: "#ffd23f", print: "POLIZEI", acc: ["bag"] } as const satisfies R6Look;

export const PI = Math.PI, SW = 0.12, PK = 0.075, DUSK = { light: "dusk" as const };
const EXTRAS = ["extra1", "extra2", "extra3", "kevin", "oma", "murat", "post", "lehrerin", "mayor", "extra1", "extra2", "extra3"];

/** zbliżenie twarzy (jak StadtLook shot 1): postać w (x,y,z) zwrócona w r, kamera 2,05 m przed nią */
export const close = (c: string, x: number, z: number, o: { r?: number; y?: number; face?: Face; pose?: R6Pose; look?: Partial<R6Look>; zoom?: number; fast?: boolean; mv?: V3; shake?: number; fov?: number } = {}): Pick<Spec, "cam" | "acts" | "key"> => {
  const r = o.r ?? 0, y = o.y ?? SW, fx = Math.sin(r), fz = Math.cos(r), d = y - SW;
  return {
    cam: { p: [x + fx * 2.05 + fz * 0.1, 1.0 + d, z + fz * 2.05 - fx * 0.1], l: [x, 0.82 + d, z], fov: o.fov ?? 32, focus: [x, 0.95 + d, z], zoom: o.zoom, fast: o.fast, mv: o.mv, shake: o.shake },
    acts: [{ c, face: o.face, look: o.look, pose: o.pose ?? { talk: 1 }, p: [x, y, z], r: r + 0.15 }],
    key: [x + fx * 1.6 + fz * 0.5, 1.3 + d, z + fz * 1.6 - fx * 0.5, 2.5, 4],
  };
};
/** przechodnie na chodnikach obu stron ulicy (jak StadtLook shot 0) */
export const walkers = (z0: number, n: number, o: { face?: Face; phone?: boolean; pose?: R6Pose } = {}): Act[] =>
  [...Array(n)].map((_, i) => ({
    c: EXTRAS[i % EXTRAS.length], face: o.face, dt: i * 0.37,
    pose: o.pose ?? { walk: 1, phone: o.phone || i % 3 === 2 ? 1 : 0 },
    p: [(i % 2 ? -1 : 1) * (2.3 + (i % 3) * 0.2), SW, z0 - i * 2.4] as V3, r: i % 2 ? 0 : PI, mv: [0, (i % 2 ? 1 : -1) * 1.1] as [number, number],
  }));
export const POSES: R6Pose[] = [{ armsUp: 1, jump: 0.6 }, { point: 1, talk: 1 }, { cross: 1 }, { phone: 1, lean: 0.1 }, { wave: 1 }, { facepalm: 1 }, { shake: 1, talk: 1 }, { dance: 0.7 }, { point: 1, shake: 0.5 }, { armsUp: 0.6, talk: 1 }];
/** tłum w parku zwrócony do kamery (jak StadtLook shot 3 — ref3_6) */
export const crowd = (face?: Face, poses: R6Pose[] = POSES): Act[] =>
  [...Array(10)].map((_, i) => ({
    c: i === 0 ? "ich" : EXTRAS[i % EXTRAS.length], face: i === 0 ? undefined : face, dt: i * 0.3, pose: poses[i % poses.length],
    p: [PARK_C.x + 3.6 - Math.floor(i / 5) * 1.2 + ((i * 7) % 3) * 0.15, PK, PARK_C.z - 1.7 + (i % 5) * 0.85 + (Math.floor(i / 5) ? 0.4 : 0)] as V3,
    r: PI / 2 + (((i * 5) % 7) - 3) * 0.1,
  })).filter((a) => a.c !== "ich");
export const PARKCAM: Cam = { p: [PARK_C.x + 12.5, 3.1, PARK_C.z + 0.2], l: [PARK_C.x - 4, 0.9, PARK_C.z], fov: 46, mv: [-1.2, -0.2, 0] };
export const STREET: Cam = { p: [-1.5, 1.1, 1.3], l: [-3.7, 2.0, -8], fov: 58, mv: [0.15, 0, -0.25] };
export const CROSS: Cam = { p: [2.0, 2.3, CROSS_Z + 3.4], l: [-4.2, 0.75, CROSS_Z - 3.2], fov: 54, focus: [-2.6, 1.0, CROSS_Z - 0.6], mv: [0.15, 0, -0.25] };
export const CROSSKEY: Key = [3.6, 1.8, CROSS_Z + 0.8, 6, 8];
export const cops = (f1: Face, f2: Face, p1: R6Pose = { talk: 1, point: 0.5 }, p2: R6Pose = { cross: 1 }): Act[] => [
  { c: "cop", face: f1, pose: p1, p: [-2.3, 0.03, CROSS_Z - 0.2], r: 1.45, dt: 0.2 },
  { c: "cop", face: f2, pose: p2, p: [-2.7, 0.03, CROSS_Z - 1.7], r: 1.1, dt: 0.5 },
];
export const DOENERCAM: Cam = { p: [0.15, 1.45, -3.3], l: [2.5, 1.2, -6.1], fov: 40, focus: [2.4, 1.0, -5.9], mv: [0.1, 0, -0.2] };
export const MURAT = (face: Face, pose: R6Pose): Act => ({ c: "murat", face, pose, p: [SPOT.doener.x + 0.45, SW, SPOT.doener.z], r: SPOT.doener.rot });
export const ROOMPC: Cam = { p: [0.2, 1.3, 0.75], l: [1.25, 1.05, -1.6], fov: 46, focus: [1.0, 1.0, -1.5] };
export const ROOMWIDE: Cam = { p: [0.55, 1.5, 3.0], l: [-0.3, 1.0, -1.2], fov: 50, focus: [0.25, 1.0, 0.75], mv: [0.1, 0, -0.3] };
export const ICH_PC: Act = { c: "ich", pose: { talk: 1 }, p: [1.0, 0, -1.5], r: -0.45 };
export const RATHAUS: Cam = { p: [1.2, 1.3, -22.6], l: [-2.4, 0.95, -24], fov: 42, focus: [-2.3, 1.0, -23.8], mv: [-0.3, 0, -0.2] };
export const FOUNT: V3 = [-18, 0.49, -42];
export const SPL: V3 = [-16.9, 0.52, -41.25]; // punkt w niecce (r≈1.3) między kolumną a kamerą
export const SOCKS = { shoes: "#f4f4f4" }; // Socken in Sandalen
export const arc = (a: V3, b: V3, u: number, h: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + Math.sin(u * PI) * h, a[2] + (b[2] - a[2]) * u];
export const FlashIn: React.FC<{ at: number }> = ({ at }) => { const k = useCurrentFrame() - at; return k < 8 ? <Flash opacity={1 - k / 8} /> : null; };
export const Fence: React.FC<{ z: number }> = ({ z }) => (
  <group position={[-2.5, SW, z]} rotation={[0, PI / 2, 0]}>
    {[...Array(7)].map((_, i) => <mesh key={i} position={[(i - 3) * 0.18, 0.5, 0]} castShadow><boxGeometry args={[0.1, 1.0, 0.04]} /><meshStandardMaterial color="#d9c49a" roughness={0.8} /></mesh>)}
    {[0.25, 0.75].map((y) => <mesh key={y} position={[0, y, -0.03]}><boxGeometry args={[1.3, 0.08, 0.03]} /><meshStandardMaterial color="#b89c6a" roughness={0.8} /></mesh>)}
  </group>
);

export const SHOTS: Spec[] = [
  // 0 hook (cisza przed 1. linią): Murat ciska döner prosto w kamerę + licznik startuje
  { fx: "doener", cam: { ...DOENERCAM, mv: [0, 0, 0], shake: 0.01 }, acts: [MURAT("evil", { point: 1, jump: 0.3 })],
    props: (u, t) => <DoenerProp position={arc([2.35, 1.15, -5.8], [0.3, 1.42, -3.55], u, 0.25)} rot={[t * 5, t * 7, 0]} scale={1.4 + u * 1.2} nutella /> },
  // 1 „In dieser Stadt ist”
  { fx: "close", ...close("ich", 0, 0, { zoom: 0.9 }) },
  // 2 „alles Ragebait”: ulica jak ref1_1
  { fx: "street", cam: STREET, acts: [...cops("smug", "angry", { walk: 1 }, { walk: 1, point: 0.6 }).map((a, k) => ({ ...a, p: [-2.4 - k * 0.55, SW, -2.4 - k * 0.9] as V3, r: 0, mv: [0, 0.9] as [number, number] })), ...walkers(-4.5, 6)] },
  // 3 „Seit Ragebait Jugendwort”: park, wszyscy z telefonami
  { fx: "park", cam: PARKCAM, acts: crowd(undefined, [{ phone: 1 }, { phone: 1, lean: 0.1 }, { phone: 1, talk: 1 }, { point: 1, talk: 1 }]) },
  // 4 „des Jahres ist, will hier jeder”: ulica wzdłuż, tłum z telefonami
  { fx: "street", cam: { p: [1.1, 1.6, -7.5], l: [-2.2, 1.0, -16], fov: 50, mv: [0, 0, -0.6] }, acts: walkers(-9, 8, { phone: true }) },
  // 5 „nur noch eins: Kommentare.”
  { fx: "close", ...close("extra2", 0.4, -12, { face: "evil", pose: { phone: 1, talk: 1 }, zoom: 0.8, fast: true }),
    ui: (s) => <Counter from={1240000} to={9900000} at={s} dur={50} /> },
  // 6 „Der Dönermann macht Döner mit Ananas.”
  { fx: "doener", cam: DOENERCAM, acts: [MURAT("evil", { talk: 1 })], props: () => <DoenerProp position={[2.25, 1.12, -5.75]} rot={[0, 0.4, 0]} /> },
  // 7 „Und Nutella.”: zbliżenie dönera
  { fx: "doener", fxo: { bokeh: 5 }, cam: { p: [1.55, 1.42, -5.25], l: [2.25, 1.1, -5.75], fov: 32, focus: [2.25, 1.12, -5.75], zoom: 0.8, fast: true },
    acts: [MURAT("evil", { talk: 1 })], props: () => <DoenerProp position={[2.25, 1.12, -5.75]} rot={[0, 0.4, 0]} nutella />,
    ui: (s) => <VideoUI likes={410000} comments={2100000} user="doener_murat" caption="Döner Hawaii Spezial 🍍🍫" at={s} grow={1.2} /> },
  // 8 beat: Murat — evil grin
  { fx: "close", ...close("murat", 2.95, -6, { r: -PI / 2, face: "evil", pose: { cross: 1 }, zoom: 0.85 }) },
  // 9 „Meine Lehrerin sagt”
  { fx: "doener", cam: { p: [-0.5, 1.5, -14.6], l: [2.5, 1.3, -15.4], fov: 40, focus: [2.3, 1.1, -14.9], mv: [0.3, 0, -0.2] },
    acts: [{ c: "lehrerin", pose: { talk: 1, point: 0.6 }, p: [2.3, SW, -14.9], r: -PI / 2 + 0.35 }, ...walkers(-21, 2)],
    props: () => <Board position={[2.75, SW, -16.0]} rotY={-PI / 2} /> },
  // 10 „zwei plus zwei ist fünf”: tablica
  { fx: "doener", cam: { p: [-1.35, 1.5, -15.4], l: [2.75, 1.15, -15.75], fov: 46, focus: [2.75, 1.4, -16.0], zoom: 0.9 },
    acts: [{ c: "lehrerin", face: "smug", pose: { point: 1 }, p: [2.3, SW, -14.95], r: -PI / 2 - 0.3 }], props: () => <Board position={[2.75, SW, -16.0]} rotY={-PI / 2} /> },
  // 11 „Dann grinst sie in die Kamera.”
  { fx: "close", ...close("lehrerin", 2.3, -14.9, { r: -PI / 2, face: "evil", pose: {}, zoom: 0.75, fast: true }) },
  // 12 „Der Postbote klingelt nie.”
  { fx: "doener", cam: { p: [1.5, 1.4, -7.3], l: [-2.4, 1.0, -11.5], fov: 42, focus: (u) => [-2.6, 1.0, -12 + 2.4 * u] },
    acts: [{ c: "post", pose: { walk: 1 }, p: [-2.6, SW, -12], r: 0, mv: [0, 2.4] }] },
  // 13 „Er wirft nur einen Zettel rein:”
  { fx: "doener", cam: { p: [-0.1, 1.3, -7.7], l: [-2.4, 0.95, -9.6], fov: 40, focus: [-2.1, 1.0, -9.7] },
    acts: [{ c: "post", face: "smug", pose: { point: 1 }, p: [-2.1, SW, -9.7], r: 0.85 }],
    props: (u, t) => <Paper position={[-2.6, 1.05 - Math.min(1, u * 1.3) * 0.9, -9.2]} rot={[-PI / 2 * Math.min(1, u * 1.3), Math.sin(t * 6) * 0.5, 0]} /> },
  // 14 „Sie waren nicht da.”
  { fx: "doener", cam: { p: [-0.6, 1.2, -8.4], l: [-2.6, 0.4, -9.3], fov: 36, focus: [-2.6, 0.2, -9.2] },
    props: () => <Paper position={[-2.6, 0.135, -9.2]} rot={[-PI / 2, 0.3, 0]} />, ui: (s) => <Note at={s} /> },
  // 15 beat („Ich war da.”): ja — wściekły
  { fx: "close", ...close("ich", -1.6, -5, { face: "angry", pose: { shake: 1, talk: 1 }, zoom: 0.85, shake: 0.006 }) },
  // 16 „Meine Oma trägt Socken in Sandalen.”
  { fx: "doener", cam: RATHAUS, acts: [{ c: "oma", look: SOCKS, pose: { walk: 0.6 }, p: [-2.2, SW, -23.6], r: PI / 2 - 0.5 }, ...walkers(-27, 2)] },
  // 17 „Mit Absicht. Drei Millionen Kommentare.”
  { fx: "close", ...close("oma", -1.9, -23.6, { face: "smug", look: SOCKS, pose: { cross: 1 }, zoom: 0.9 }), ui: (s) => <Counter from={0} to={3000000} at={s + 50} dur={50} /> },
  // 18 beat: park — wszyscy wściekli
  { fx: "park", cam: { ...PARKCAM, mv: [-2, -0.3, 0] }, acts: crowd("angry", [{ shake: 1, talk: 1 }, { point: 1, shake: 0.5 }, { armsUp: 0.6, talk: 1 }, { facepalm: 1 }]) },
  // 19 „Und der Bürgermeister hat gepostet:”
  { fx: "doener", cam: { p: [0.5, 1.4, -23.0], l: [-2.0, 1.15, -24.4], fov: 38, focus: [-2.0, 1.1, -24.4], mv: [-0.3, 0, -0.1] },
    acts: [{ c: "mayor", face: "smug", pose: { phone: 1 }, p: [-2.0, SW, -24.4], r: PI / 2 - 0.35 }] },
  // 20 „Die Bahn ist heute pünktlich.”
  { fx: "close", ...close("mayor", -1.6, -24.4, { face: "grin", pose: { phone: 1 }, zoom: 0.95, fov: 42 }), ui: (s) => <PostCard name="Bürgermeister" text="Die Bahn ist heute pünktlich. 🚆" at={s} /> },
  // 21 „Da ist das Internet explodiert.”
  { fx: "park", cam: { ...PARKCAM, shake: 0.03 }, acts: crowd("shock", [{ armsUp: 1, jump: 0.6 }, { shake: 1, talk: 1 }, { facepalm: 1 }, { phone: 1 }]),
    ui: (s) => <Comments at={s} every={6} texts={["FAKE!!!", "Seit wann?!", "LÜGE 😡", "Bahn pünktlich?? 🤡", "Rücktritt!!", "Ich war im Zug. NEIN."]} /> },
  // 22 beat: błysk, ulica w chaosie
  { fx: "street", cam: { ...STREET, shake: 0.03 }, acts: walkers(-4.5, 7, { face: "angry", pose: { shake: 1, talk: 1 } }), ui: (s) => <FlashIn at={s} /> },
  // 23 „Aber es gibt ein Problem.” (zmierzch)
  { ...DUSK, fx: "close", ...close("ich", 0, 0, { face: "sad", pose: {}, zoom: 0.92 }) },
  // 24 „Alle sind sauer. Die ganze Zeit.”
  { ...DUSK, fx: "cross", cam: CROSS, key: CROSSKEY, acts: [...cops("angry", "angry", { shake: 1, talk: 1 }, { cross: 1 }), { c: "kevin", face: "angry", pose: { walk: 1 }, p: [-9, SW, CROSS_Z + 2.6], r: -PI / 2, mv: [-1, 0] }] },
  // 25 „Nachbarn schreien sich über den Zaun an.”
  { ...DUSK, fx: "doener", cam: { p: [-1.6, 1.5, -37.6], l: [-2.5, 1.05, -33.9], fov: 50, focus: [-2.5, 1.0, -33.9], shake: 0.006 },
    acts: [{ c: "extra1", face: "angry", pose: { shake: 1, talk: 1, point: 0.6 }, p: [-1.95, SW, -33.9], r: -PI / 2 - 0.25 }, { c: "oma", face: "angry", pose: { shake: 1, talk: 1 }, p: [-3.05, SW, -33.9], r: PI / 2 + 0.25, dt: 0.4 }],
    props: () => <Fence z={-33.9} /> },
  // 26 „Mein bester Freund Kevin”
  { ...DUSK, fx: "close", ...close("kevin", -14.5, -40.5, { face: "angry", pose: { shake: 1, talk: 1 }, r: 1.25, y: PK, zoom: 0.9 }) },
  // 27 „hatte so einen Crashout,”: rzut routerem
  { ...DUSK, fx: "park", cam: { p: [-16.6, 1.35, -39.3], l: [-15.6, 1.45, -42], fov: 44, mv: [0.15, 0, 0.25], shake: 0.006 },
    acts: [{ c: "kevin", face: "angry", pose: { armsUp: 1, shake: 0.6 }, p: [-15.5, PK, -42], r: -0.75 }],
    props: (u, t) => <Router position={u < 0.35 ? [-15.5, 2.25, -42] : arc([-15.5, 2.25, -42], [-16.9, 0.6, -41.25], (u - 0.35) / 0.65, 0.8)} rot={[t * 6, t * 4, 0]} /> },
  // 28 „dass sein Router jetzt im Teich wohnt.”: plusk
  { ...DUSK, fx: "park", cam: { p: [-14.2, 1.6, -39.6], l: [-16.9, 0.7, -41.25], fov: 40, focus: SPL, shake: 0.01 }, props: (u) => <Splash position={SPL} u={u} /> },
  // 29 beat: router w fontannie
  { ...DUSK, fx: "doener", cam: { p: [-14.6, 1.7, -39.9], l: [-16.9, 0.55, -41.25], fov: 30, focus: SPL, zoom: 0.85 },
    props: () => <Router position={[-16.9, 0.54, -41.25]} rot={[0.3, 0.6, 0.2]} /> },
  // 30 „Also hab ich”: pokój, PC
  { room: true, fx: "roomClose", cam: ROOMPC, acts: [ICH_PC] },
  // 31 „das schlimmste Ragebait aller Zeiten gepostet.”: szybki najazd
  { room: true, fx: "roomClose", cam: { ...ROOMPC, zoom: 26 / 46, fast: true }, acts: [{ ...ICH_PC, face: "evil" }] },
  // 32 „Ein Video, in dem nichts passiert.”
  { room: true, fx: "room", cam: ROOMWIDE, acts: [{ c: "ich", face: "smile", pose: { wave: 0.4 }, p: [0.25, 0, 0.75], r: -0.15 }],
    ui: (s) => <VideoUI likes={12} comments={3} user="ich_hinterhausen" caption="Schönen Tag noch 🙂" at={s} /> },
  // 33 „Ich lächle und sage: Schönen Tag noch.”
  { room: true, fx: "roomClose", ...close("ich", 0.25, 0.75, { y: 0, face: "smile", pose: { wave: 1 } }),
    ui: (s) => <VideoUI likes={12} comments={3} user="ich_hinterhausen" caption="Schönen Tag noch 🙂" at={s} /> },
  // 34 beat: cisza
  { room: true, fx: "room", cam: { ...ROOMWIDE, mv: [0, 0, 0], zoom: 0.95 }, acts: [{ c: "ich", face: "smile", pose: {}, p: [0.25, 0, 0.75], r: -0.15 }] },
  // 35 „Die Stadt ist durchgedreht.”
  { fx: "park", cam: { ...PARKCAM, shake: 0.02 }, acts: crowd("shock", [{ armsUp: 1, jump: 0.6 }, { shake: 1, talk: 1 }, { armsUp: 0.6, talk: 1 }]) },
  // 36 „Warum ist der so nett?!”
  { fx: "street", cam: STREET, acts: walkers(-4.5, 7, { face: "shock", pose: { phone: 1, shake: 0.4 } }),
    ui: (s) => <Comments at={s} every={8} texts={["Warum ist der so nett?!", "Das ist doch Ragebait 😡", "WAS SOLL DAS", "Ich kann nicht mehr"]} /> },
  // 37 „Was will der von uns?! Achtzig Millionen Kommentare.”
  { fx: "park", cam: PARKCAM, acts: crowd("angry", [{ shake: 1, talk: 1 }, { phone: 1 }, { point: 1, shake: 0.5 }]),
    ui: (s) => <><Comments at={s} every={7} y0={430} texts={["Was will der von uns?!", "Verdächtig nett 🤨", "Zu freundlich. Melden."]} /><Counter from={3000000} to={80000000} at={s + 30} dur={50} /></> },
  // 38 beat: gliny w szoku
  { fx: "cross", cam: CROSS, key: CROSSKEY, acts: cops("shock", "shock", { armsUp: 0.7 }, { facepalm: 1 }) },
  // 39 „Und dann haben mich alle kopiert.”
  { fx: "street", cam: STREET, acts: walkers(-4.5, 8, { face: "smile", pose: { wave: 1, walk: 0.5 } }) },
  // 40 „Der Dönermann sagt jetzt Danke.”
  { fx: "doener", cam: DOENERCAM, acts: [MURAT("happy", { wave: 1 })], props: () => <DoenerProp position={[2.25, 1.12, -5.75]} rot={[0, 0.4, 0]} /> },
  // 41 „Der Postbote klingelt. Zweimal.”
  { fx: "doener", cam: { p: [-0.1, 1.3, -5.9], l: [-2.1, 0.85, -7.8], fov: 38, focus: [-2.1, 1.3, -7.8] },
    acts: [{ c: "post", face: "smile", pose: { point: 1, jump: 0.15 }, p: [-2.1, SW, -7.8], r: 0.8 }] },
  // 42 „Oma trägt Schuhe.”
  { fx: "doener", cam: RATHAUS, acts: [{ c: "oma", face: "happy", pose: { wave: 1 }, p: [-2.2, SW, -23.6], r: PI / 2 - 0.5 }] },
  // 43 „Und Kevin hat seinen Router aus dem Teich geholt.”
  { fx: "park", cam: { p: [-12.6, 1.5, -39.6], l: [-16, 1.2, -42], fov: 42, focus: [-15.5, 1.2, -42], mv: [-0.3, 0, -0.2] },
    acts: [{ c: "kevin", face: "happy", pose: { armsUp: 1, jump: 0.4 }, p: [-15.5, PK, -42], r: 0.88 }],
    props: (u, t) => <Router position={[-15.5, 2.3 + Math.abs(Math.sin(t * 9)) * 0.12, -42]} rot={[0, 0.5, 0]} /> },
  // 44 „Jetzt ist in dieser Stadt jeder nett.”
  { fx: "park", cam: PARKCAM, acts: crowd("happy", [{ dance: 0.7 }, { wave: 1 }, { armsUp: 0.6 }, { dance: 1 }]) },
  // 45 „Und alle regen sich darüber auf.”
  { fx: "street", cam: { ...STREET, shake: 0.015 }, acts: walkers(-4.5, 7, { face: "angry", pose: { shake: 1, talk: 1 } }) },
  // 46 „Und wenn du das jetzt kommentierst”
  { fx: "close", ...close("ich", 0, 0, { face: "smug", pose: { talk: 1 }, zoom: 0.78 }) },
  // 47 „hab ich dich.”
  { fx: "close", ...close("ich", 0, 0, { face: "wink", pose: { point: 1 }, zoom: 0.7, fast: true }) },
];
