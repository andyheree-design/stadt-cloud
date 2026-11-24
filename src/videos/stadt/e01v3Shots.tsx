// E01 v3 — ujęcia po id (timeline.json shots[].id). Szablon wzoru: tłum nocą → „Außer mir” pokój z oknem na imprezę → refren „Huss” (POV rąk + zawzięte zbliżenie).
import React from "react";
import { PARK_C } from "./Town";
import { Router, DoenerProp } from "./Props";
import { Counter, VideoUI, Comments, PostCard } from "./Overlays";
import { NightWindow, Table, Toaster, Clock, MirrorFrame, StringLights, PovHands, PhoneFlat, Card, Mug } from "./PropsV3";
import { SHOTS, Spec, Cam, close, crowd, walkers, PARKCAM, PI, PK, ROOMWIDE } from "./e01Shots";

type V3 = [number, number, number];
export type SpecV3 = Omit<Spec, "light"> & { light?: "day" | "dusk" | "night"; pov?: "thumbs" | "wave" | "point" | "type"; open?: boolean };

/** pokój nocą: OTWARTE okno, za nim prawdziwa impreza 3D (tłum w czapeczkach, lampiony, konfetti, miasteczko w tle);
 *  przed bohaterem stół z rekwizytami (telefon z miłym komentarzem, kartki, kubek, budzik) — odpowiednik stołu z burgerami we wzorze */
const ROOMSET = (o: { toaster?: number; router?: boolean; clock?: boolean } = {}) => {
  const busy = o.toaster !== undefined || o.router;
  return <>
    <Table position={[0.2, 0, -1.3]} />
    <PhoneFlat position={busy ? [-0.12, 0.525, -1.08] : [0.2, 0.525, -1.2]} rotY={busy ? 0.35 : 0.08} />
    <Card position={[0.0, 0.525, -1.52]} rotY={0.3} text="Nett ❤" />
    <Card position={[0.52, 0.525, -1.1]} rotY={-0.25} text="Schön!" color="#d6402a" />
    <Mug position={[0.5, 0.525, -1.45]} />
    {o.clock !== false && <Clock position={[-0.22, 0.525, -1.3]} rotY={0.3} />}
    {o.toaster !== undefined && <Toaster position={[0.2, 0.525, -1.32]} pop={o.toaster} />}
    {o.router && <Router position={[0.25, 0.56, -1.3]} rot={[0, 0.3, 0]} scale={0.9} />}
  </>;
};
/** impreza tuż za szybą (jak wzór 2,2 s): statyści w czapeczkach, tańczą i nagrywają telefonami */
const HATS = ["#ff3b8d", "#3bb4ff", "#ffd23f", "#3bd16f", "#b04bff", "#ff7a2a"];
const PARTY = [
  { c: "extra1", x: -0.55, z: -3.25, pose: { phone: 1, dance: 0.5 } }, { c: "lehrerin", x: 0.0, z: -3.75, pose: { armsUp: 1, jump: 0.5 } },
  { c: "extra2", x: 0.55, z: -3.2, pose: { phone: 1, talk: 1 } }, { c: "murat", x: 1.05, z: -3.7, pose: { dance: 1 } },
  { c: "extra3", x: -0.2, z: -4.4, pose: { phone: 1, jump: 0.3 } }, { c: "kevin", x: 0.8, z: -4.5, pose: { armsUp: 0.7, dance: 0.6 } },
].map((a, i) => ({ c: a.c, face: "happy" as any, pose: a.pose, p: [a.x, 0, a.z] as V3, r: (i % 3 - 1) * 0.2, dt: i * 0.29, look: { hat: "party" as const, hatColor: HATS[i], hatAccent: "#fff" } }));
const room = (s: Omit<SpecV3, "room">, set: Parameters<typeof ROOMSET>[0] = {}): SpecV3 =>
  ({ room: true, open: true, key: [0.3, 1.5, -0.8, 3, 3], ...s, acts: [...(s.acts ?? []), ...PARTY], props: (u, t) => <>{ROOMSET(set)}{s.props?.(u, t)}</> });

/** „Außer mir”: plan średni — bohater zajmuje ~⅔ kadru, za nim okno i impreza, przed nim stół z rekwizytami */
const WIN: Cam = { p: [0.2, 1.06, -0.42], l: [0.2, 0.86, -1.75], fov: 46, focus: [0.2, 0.95, -1.75], mv: [0, -0.01, -0.1] }; // v4: oczy, nie z góry
const ICH_WIN = (face: any = "smug", pose: any = { cross: 1 }) => ({ c: "ich", face, pose, p: [0.2, 0, -1.75] as V3, r: 0 });
/** POV: stromo z góry na drewniany stół, przedmiot na środku, ręce od dołu kadru (jak wzór 2,6–3,1 s) */
const POV: Cam = { p: [0.2, 1.45, -1.0], l: [0.2, 0.5, -1.36], fov: 50, shake: 0.004 };
/** zawzięte zbliżenie (bohater przed stolikiem, okno-impreza w tle) */
const grind = (face: any, pose: any, extra: Partial<Cam> = {}): SpecV3 => room({ fx: "roomClose",
  cam: { p: [0.28, 1.12, -0.62], l: [0.2, 0.84, -1.75], fov: 44, focus: [0.2, 0.95, -1.75], ...extra },
  acts: [{ c: "ich", face, pose, p: [0.2, 0, -1.75], r: 0.1 }], key: [0.6, 1.3, -1.0, 2.5, 3] });
const parkNight = (face?: any, poses?: any[]): SpecV3 => ({
  light: "night", fx: "park", fxo: { bright: -0.02, sat: 0.25 }, cam: { ...PARKCAM, mv: [-1.6, -0.25, 0] }, acts: crowd(face, poses),
  props: () => <>
    <StringLights a={[PARK_C.x + 5.4, 2.7, PARK_C.z - 5]} b={[PARK_C.x + 5.4, 2.7, PARK_C.z + 5]} n={22} h={0.6} />
    <StringLights a={[PARK_C.x + 1.2, 3.0, PARK_C.z - 6]} b={[PARK_C.x + 1.2, 3.0, PARK_C.z + 6]} n={24} h={0.7} />
    <pointLight position={[PARK_C.x + 5, 2.4, PARK_C.z]} color="#ff5ce1" intensity={6} distance={9} />
    <pointLight position={[PARK_C.x + 2, 2.6, PARK_C.z - 2]} color="#ffd23f" intensity={6} distance={9} />
  </>,
});
const o = (i: number): SpecV3 => SHOTS[i] as SpecV3;
/** v4: to samo ujęcie nocą + ciepłe światło na postaciach (lampiony) */
const night = (s: SpecV3): SpecV3 => {
  const l = s.cam.l; return { ...s, light: "night", fxo: { ...(s.fxo ?? {}), bright: 0.02, sat: 0.2 },
    key: s.key ?? [l[0] + 1.2, l[1] + 1.4, l[2] + 1.5, 6, 9],
    props: (u, t) => <>{s.props?.(u, t)}<pointLight position={[l[0], l[1] + 2.2, l[2]]} color="#ffb067" intensity={4} distance={10} /></> };
};
const COMM = (t: string[], y0?: number) => (s: number) => <Comments at={s} every={7} y0={y0} texts={t} />;

export const SHOTS_V3: Record<string, SpecV3> = {
  // ── hook: „In dieser Stadt postet jeder Ragebait.” — impreza nocą, wszyscy z telefonami
  // blisko i przodem (jak wzór 0,5–1,5 s): 2–3 osoby w półpostaci, czapeczki, w tle domki i góry
  crowdNight: { ...parkNight("happy"),
    acts: crowd("happy", [{ phone: 1, dance: 0.5 }, { phone: 1, jump: 0.3 }, { armsUp: 1, jump: 0.6 }, { phone: 1, talk: 1 }, { dance: 1 }]).map((a, i) => ({ ...a, look: { hat: "party" as const, hatColor: HATS[i % 6], hatAccent: "#fff" } })),
    cam: { p: [PARK_C.x + 6.3, PK + 1.02, PARK_C.z + 0.9], l: [PARK_C.x + 3.3, PK + 0.95, PARK_C.z - 0.1], fov: 44, focus: [PARK_C.x + 3.6, PK + 0.9, PARK_C.z], mv: [-0.4, 0, -0.1] }, key: [PARK_C.x + 5.5, PK + 1.8, PARK_C.z + 0.5, 6, 6] },
  // „Außer mir.” — pokój, okno na imprezę, bohater spokojny
  roomWin: room({ fx: "room", fxo: { bright: -0.05 }, cam: WIN, acts: [ICH_WIN("smug", { talk: 0.4 })] }),
  roomWinEnd: room({ fx: "room", fxo: { bright: -0.05 }, cam: { ...WIN, mv: [0, 0, -0.15] }, acts: [ICH_WIN("smile", { wave: 0.6 })] }),
  // ── refren „Huss”: POV rąk (zmienia się przy każdym wystąpieniu) + zawzięte zbliżenie
  povThumbs: room({ fx: "roomClose", fxo: { bokeh: 1.5 }, cam: POV, pov: "thumbs" }, { toaster: 0 }),
  povWave: room({ fx: "roomClose", fxo: { bokeh: 1.5 }, cam: { ...POV, l: [0.2, 1.0, -2.4] }, pov: "wave" }),
  povToaster: room({ fx: "roomClose", fxo: { bokeh: 1.5 }, cam: POV, pov: "thumbs" }, { toaster: 0.5 }),
  povRouter: room({ fx: "roomClose", fxo: { bokeh: 1.5 }, cam: POV, pov: "point" }, { router: true }),
  povMirror: room({ fx: "roomClose", fxo: { bokeh: 1.2 }, cam: { p: [0.2, 1.0, -0.2], l: [0.2, 0.92, -1.75], fov: 50, shake: 0.004 }, pov: "thumbs",
    acts: [{ c: "ich", face: "grin", pose: { wave: 1 }, p: [0.2, 0, -1.9], r: 0 }], props: () => <MirrorFrame position={[0.2, 0.95, -1.7]} /> }, { clock: false }),
  povType: { room: true, fx: "roomClose", cam: { p: [1.3, 1.05, -0.75], l: [1.65, 0.75, -2.0], fov: 55, shake: 0.003 }, pov: "type", props: () => <NightWindow /> },
  grind: grind("angry", { shake: 1, talk: 1 }, { shake: 0.006, zoom: 0.85 }),
  grindFast: grind("smile", { wave: 1, shake: 0.5 }, { shake: 0.008, zoom: 0.75, fast: true }),
  grindPoint: grind("grin", { point: 1, shake: 0.6 }, { shake: 0.007, zoom: 0.8 }),
  // ── L3 dlaczego wszyscy postują
  streetPhones: night({ ...o(4), acts: walkers(-10.6, 8, { phone: true }), cam: { p: [0.6, 1.35, -8.6], l: [-2.0, 1.0, -14.5], fov: 46, mv: [0, 0, -0.5] } }),
  parkAngry: night({ ...o(18), cam: { ...PARKCAM, p: [PARK_C.x + 9.5, 2.2, PARK_C.z + 0.2], mv: [-1.4, -0.2, 0] } }),
  mayorPhone: night(o(19)),
  mayorPost: night(o(20)),
  // ── L4
  parkComments: night({ ...o(21), cam: { ...PARKCAM, p: [PARK_C.x + 9.5, 2.2, PARK_C.z + 0.2], shake: 0.03 } }),
  roomWin2: room({ fx: "room", cam: { p: [-1.2, 1.1, 0.6], l: [0.4, 1.1, -2.2], fov: 48, focus: [0.2, 0.9, -1.75], mv: [0.25, 0, -0.2] }, acts: [ICH_WIN("angry", { shake: 0.6, talk: 1 })] }),
  closeSmile: grind("smile", { wave: 0.4 }, { zoom: 0.8, fast: true }),
  // ── L5 trening o piątej rano
  clock: room({ fx: "roomClose", fxo: { bokeh: 5 }, cam: { p: [-0.05, 0.78, -0.68], l: [-0.22, 0.58, -1.3], fov: 34, focus: [-0.22, 0.6, -1.3], zoom: 0.8 } }),
  counter200: { ...grind("grin", { wave: 1, jump: 0.2 }, { zoom: 0.85 }), ui: (s) => <Counter from={0} to={200} at={s} dur={45} /> },
  // ── L6
  closeWave: grind("smile", { wave: 1 }, { zoom: 0.9 }),
  closeSad: grind("sad", {}, { zoom: 0.85 }),
  closeAgain: grind("angry", { point: 1, shake: 0.4 }, { zoom: 0.6, fast: true, shake: 0.006 }),
  // ── L7 Kevin
  kevinClose: o(26), kevinThrow: o(27), kevinSplash: o(28), routerPond: o(29),
  kevinDoor: room({ fx: "roomClose", ...close("kevin", -1.4, 0.6, { y: 0, r: 0.5, face: "grin", pose: { wave: 1, talk: 1 }, zoom: 0.9 }) } as any),
  // ── L8 odmowa
  closeNo: grind("smug", { cross: 1, talk: 1 }, { zoom: 0.85 }),
  // ── L9 chaos w mieście
  streetChaos: o(22), doener: o(6), nutella: o(7), board: o(10), postman: o(12), note: { ...o(14), fxo: { ao: 0 } as any, cam: { ...o(14).cam, focus: undefined } } as SpecV3, ichAngry: grind("angry", { shake: 1, talk: 1 }, { shake: 0.006, zoom: 0.85 }),
  // ── L10
  twitch: grind("smile", {}, { shake: 0.012, zoom: 0.7 }),
  // ── L11 pierwsze wideo
  pc: { ...o(30), props: () => <NightWindow /> },
  video: { ...o(32), props: () => <NightWindow /> },
  omaComment: { fx: "close", ...close("oma", -1.9, -23.6, { face: "happy", pose: { phone: 1 }, zoom: 0.9 }), ui: COMM(["Schön gemacht, Schatz ❤️ — Oma"], 700) } as SpecV3,
  // ── L12
  videoNice: { ...o(33), props: () => <NightWindow /> },
  // ── L13 miasto wariuje
  parkShock: o(35), streetComments: o(36), parkCounter: o(37), copsShock: o(38),
  // ── L14 wszyscy kopiują
  allNice: o(39), doenerThanks: o(40), postTwice: o(41), omaShoes: o(42), allAngry: o(45),
  // ── L15 burmistrz
  mayorAsk: { fx: "close", ...close("mayor", -1.6, -24.4, { face: "shock", pose: { point: 1, talk: 1 }, zoom: 0.9, fov: 40 }) } as SpecV3,
  mayorPostNice: { ...o(20), ui: (s) => <PostCard name="Bürgermeister" text="Wie macht der das?! 😳" at={s} /> },
  ichSmug: grind("smug", { talk: 1 }, { zoom: 0.85 }),
};
export { DoenerProp, VideoUI };
