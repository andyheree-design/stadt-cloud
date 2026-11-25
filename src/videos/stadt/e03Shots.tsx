// E03 „Six Seven” — ujęcia po id (timeline.json shots[].id). Plan: miasto (Town). Cela „ZELLE 67” stoi na ulicy (x=0, kraty z=-8),
// rysowana tylko w ujęciach celi. Refren „Huss” (6 ujęć): Ich na chodniku (SPOT.ich) o zmierzchu, w tym nowy gest „67”.
import React from "react";
import { SPOT } from "./Town";
import { Counter, Comments } from "./Overlays";
import { PhoneFlat } from "./PropsV3";
import { Cam, Act, close, crowd, walkers, PARKCAM, STREET, DOENERCAM, MURAT, PI, SW } from "./e01Shots";
import { SpecV3 } from "./e01v3Shots";
import { R6Pose } from "./R6";
import { SchoolBoard, MayorDesk, Kasse, Speaker, Hearts } from "./PropsE02";
import { Cell, Cake, PriceSign, Door67, Parcel, Megaphone, Ban67, TvLive, CommentJail } from "./PropsE03";

type V3 = [number, number, number];
export type ActE03 = Act & { s?: number };
export type SpecE03 = Omit<SpecV3, "acts"> & { acts?: ActE03[]; town?: { center?: [number, number]; wide?: boolean; fog?: (u: number) => [number, number] } };

// ---------- cela ----------
const CZ = -8, FL = 0.1; // kraty w z=-8, podłoga celi
const cell = (t: number, door = 0) => <Cell position={[0, 0, CZ]} t={t} />;
/** koguty: czerwone/niebieskie światło migające na zmianę */
const siren = (t: number, p: V3 = [1.8, 2.2, CZ + 2.2], k = 7) => { const a = Math.floor(t * 6) % 2; return <>
  <pointLight position={p} color="#ff2a2a" intensity={a ? k : 0.4} distance={9} decay={1.4} />
  <pointLight position={[p[0] - 3.2, p[1], p[2]]} color="#2a5cff" intensity={a ? 0.4 : k} distance={9} decay={1.4} /></>; };
const inCell = (c: string, x: number, face: any, pose: R6Pose, r = 0, dt = 0): ActE03 => ({ c, face, pose, p: [x, FL, CZ - 1.3], r, dt });
/** zbliżenie przez kraty (close() przy podłodze celi) */
const cc = (c: string, x: number, o: Parameters<typeof close>[3] = {}) => close(c, x, CZ - 1.3, { y: FL, ...o });

// ---------- szkoła / ratusz / ulica ----------
const SCH = { x: SPOT.schule.x, z: SPOT.schule.z };
const schoolProps = (rows: string[]) => () => <group position={[SCH.x + 0.6, 0.35, SCH.z + 0.2]} scale={0.62}><SchoolBoard position={[0, 1.15, 0]} rotY={-PI / 2} rows={rows} />
  {[-1, 1].map((s) => <mesh key={s} position={[0.1, 0.55, s * 1.2]}><boxGeometry args={[0.06, 1.6, 0.06]} /><meshStandardMaterial color="#6b4a2b" /></mesh>)}</group>;
const PUPILS = (face: any, pose: R6Pose[] = [{}, { headScratch: 1 }]): ActE03[] => [[-0.2, 0], [-0.3, 0.9], [-1.1, -0.5], [-1.0, 0.5], [-0.4, -0.9]].map(([dx, dz], i) =>
  ({ c: ["kevin", "extra1", "extra2", "extra3", "ich"][i], face, pose: pose[i % pose.length], p: [SCH.x - 1.5 + dx, 0, SCH.z + dz] as V3, r: PI / 2, s: 0.62, dt: i * 0.3 }));
const BOARD_ROWS = ["65, 66,", "68, 69 ✔"];
const MX = -2.35, MZ = -24.4; // burmistrz przy biurku przed ratuszem
const desk = (t: number) => <MayorDesk position={[MX, 0.12, MZ + 0.6]} t={t} />;
const tv = (title?: string) => (s: number) => <TvLive at={s} title={title} />;
const OMA = { x: SPOT.oma.x, z: SPOT.oma.z };
const cake = (t: number) => <Cake position={[OMA.x + 0.75, SW, OMA.z + 0.55]} t={t} rotY={0.9} />;
const DOOR: V3 = [-3.0, SW, -12];
const PRICE: V3 = [1.5, 0, -5.0];
/** tłum w parku robiący „67” */
const SIX: R6Pose[] = [{ six7: 1, jump: 0.5 }, { six7: 1, talk: 1 }, { six7: 1, dance: 0.4 }, { six7: 1 }, { six7: 1, jump: 0.3, talk: 1 }];

// ---------- refren: Ich na chodniku o zmierzchu ----------
const IX = SPOT.ich.x, IZ = SPOT.ich.z + 0.9 /* latarnia Town (-2.05,-6) stała przed twarzą */, IR = PI / 2;
const warm = (p: V3) => <pointLight position={p} color="#ffb067" intensity={5} distance={7} decay={1.5} />;
// v4: jasny dzień jak topka (było: zmierzch) — nazwa zostaje, żeby nie ruszać ujęć
const dusk = (s: SpecE03, _kp?: V3): SpecE03 => ({ ...s, light: "day", fxo: { sat: 0.3, bright: 0.05, ...(s.fxo ?? {}) } });
const ic = (o: Parameters<typeof close>[3]) => close("ich", IX, IZ, { r: IR, ...o });
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const FACE = { p: [IX + 2.05, 1.0, IZ + 0.1] as V3, l: [IX, 0.85, IZ] as V3, fov: 30 };
const HIGH = { p: [6, 26, 10] as V3, l: [-1, 0, -10] as V3, fov: 50 };
const outro = (u: number) => { if (u < 0.4) { const k = u / 0.4; return { ...FACE, fov: FACE.fov * (1 - 0.2 * k * k * (3 - 2 * k)) }; }
  const k = Math.pow((u - 0.4) / 0.6, 2.2), e = 1 - Math.pow(1 - k, 2); return { p: lerp3(FACE.p, HIGH.p, e), l: lerp3(FACE.l, HIGH.l, Math.min(1, e * 1.4)), fov: FACE.fov * 0.8 + (HIGH.fov - FACE.fov * 0.8) * e }; };

export const SHOTS_E03: Record<string, SpecE03> = {
  // 1 — In dieser Stadt ist Six Seven verboten.  HOOK klatka 0: Kevin za kratami robi „67”, koguty, znak zakazu
  hookCell: { light: "day", fx: "close", fxo: { sat: 0.28, bright: 0.04, bokeh: 2.2 }, ...cc("kevin", -0.07, { face: "grin", pose: { six7: 1, talk: 1 }, zoom: 0.82, fast: true, shake: 0.005 }),
    props: (u, t) => <>{cell(t)}{siren(t)}</>, ui: (s) => <Ban67 at={s} /> },
  kevinSix: { light: "day", fx: "close", fxo: { sat: 0.28, bright: 0.04, bokeh: 3 }, ...cc("kevin", -0.25, { r: 0.3, face: "happy", pose: { six7: 1, jump: 0.2 }, zoom: 0.7, fov: 26, shake: 0.006 }),
    props: (u, t) => <>{cell(t)}{siren(t)}</>, ui: (s) => <Ban67 at={s - 60} size={200} /> },
  // 3 — Wer es sagt, kommt sofort ins Gefängnis. Mein bester Freund Kevin sitzt da schon seit drei Wochen.
  copArrest: { fx: "street", cam: { p: [0.7, 1.35, -1.0], l: [-2.4, 1.0, -4.6], fov: 46, mv: [-0.2, 0, -0.4], shake: 0.004, focus: [-2.4, 1.0, -4.4] },
    acts: [{ c: "extra2", face: "shock", pose: { six7: 1, shake: 0.6 }, p: [-2.3, SW, -4.3], r: PI / 2 + 0.3 },
      { c: "cop", face: "angry", pose: { point: 1, talk: 1 }, p: [-1.7, SW, -5.2], r: -0.4, dt: 0.2 }, { c: "cop", face: "evil", pose: { cross: 1 }, p: [-2.8, SW, -5.4], r: 0.4, dt: 0.5 },
      ...walkers(-9, 4, { face: "shock" })], props: (u, t) => siren(t, [0.5, 2.4, -3]), key: [-0.5, 1.6, -2.6, 3, 6] },
  cellWide: { light: "day", fx: "close", fxo: { sat: 0.28, bright: 0.04, bokeh: 1.2 }, cam: { p: [1.3, 1.45, CZ + 3.2], l: [0, 1.15, CZ - 1.8], fov: 46, mv: [-0.4, 0, -0.5], focus: [-0.2, 1.0, CZ - 1.3] },
    acts: [inCell("kevin", -0.4, "sad", { cross: 1 }, 0.15)], props: (u, t) => cell(t), key: [1.0, 1.8, CZ + 2, 3, 6] },
  cellTally: { light: "day", fx: "close", fxo: { sat: 0.28, bright: 0.04, bokeh: 2.5 }, cam: { p: [-0.24, 1.3, -7.1], l: [-0.75, 1.1, -10.5], fov: 38, zoom: 0.85, focus: [-0.45, 1.0, -10.2] },
    acts: [{ c: "kevin", face: "sad", pose: { headScratch: 1 }, p: [-0.45, FL, -10.2], r: -0.2 }], props: (u, t) => cell(t),
    ui: (s) => <Counter from={0} to={21} at={s} dur={40} icon="📅" suffix=" Tage" /> },
  // 4 — In der Schule zählen wir jetzt so: fünfundsechzig, sechsundsechzig... achtundsechzig.
  schoolBoard: { fx: "street", fxo: { bright: -0.05, contrast: -0.12 }, cam: { p: [SCH.x - 3.6, 1.15, SCH.z - 1.2], l: [SCH.x + 0.4, 0.95, SCH.z + 0.3], fov: 44, mv: [0.6, 0, 0.2], focus: [SCH.x + 0.5, 1.0, SCH.z + 0.2] },
    acts: [{ c: "lehrerin", face: "smug", pose: { point: 1, talk: 1 }, p: [SCH.x - 0.1, SW, SCH.z + 1.4], r: -PI / 2 - 0.4 }, ...PUPILS("smile")], props: schoolProps(BOARD_ROWS), key: [SCH.x - 1.5, 1.6, SCH.z, 3, 6] },
  teacher: { fx: "close", ...close("lehrerin", SCH.x - 0.1, SCH.z + 1.4, { r: -PI / 2 - 0.25, face: "evil", pose: { point: 1, talk: 1 }, zoom: 0.9 }), props: schoolProps(BOARD_ROWS) },
  pupilsShock: { fx: "close", fxo: { bokeh: 1.5 }, cam: { p: [SCH.x + 0.3, 1.1, SCH.z + 0.1], l: [SCH.x - 2.2, 0.7, SCH.z], fov: 58, zoom: 0.8, fast: true, shake: 0.006, focus: [SCH.x - 1.7, 0.7, SCH.z] },
    acts: PUPILS("shock", [{ armsUp: 1 }, { facepalm: 1 }, { headScratch: 1 }]), props: schoolProps(BOARD_ROWS), key: [SCH.x - 0.6, 1.4, SCH.z + 0.6, 3, 5] },
  // 5 — Meine Oma wird dieses Jahr siebenundsechzig. Sie sagt jetzt, sie ist sechsundsechzig plus eins.
  omaCake: { fx: "street", fxo: { bokeh: 1 }, cam: { p: [0.2, 1.35, -2.4], l: [-2.1, 1.0, 0.3], fov: 48, mv: [-0.4, -0.1, -0.3], focus: [-2.1, 1.0, 0.3] },
    acts: [{ c: "oma", face: "happy", pose: { wave: 1 }, p: [OMA.x, SW, OMA.z], r: PI / 2 }], props: (u, t) => <>{cake(t)}<Hearts position={[OMA.x + 0.2, 1.5, OMA.z]} t={t} /></>, key: [-0.8, 1.6, 1.2, 3, 5] },
  omaSmug: { fx: "close", ...close("oma", OMA.x, OMA.z, { r: PI / 2, face: "smug", pose: { cross: 1, talk: 1 }, zoom: 0.85 }), props: (u, t) => cake(t) },
  // v4: refren po scenie Omy — Oma przy torcie sama robi „67” na rytm Huss
  omaSix: { fx: "close", fxo: { sat: 0.3 }, ...close("oma", OMA.x, OMA.z, { r: PI / 2 + 0.15, face: "grin", pose: { six7: 1, jump: 0.3 }, zoom: 0.8, shake: 0.006 }), props: (u, t) => cake(t) },
  cakeClose: { fx: "close", fxo: { bokeh: 3 }, cam: { p: [OMA.x + 2.5, 1.5, OMA.z + 2.0], l: [OMA.x + 0.75, 1.42, OMA.z + 0.6], fov: 36, zoom: 0.8, fast: true, focus: [OMA.x + 0.78, 1.45, OMA.z + 0.62] },
    acts: [{ c: "oma", face: "wink", pose: { point: 0.6 }, p: [OMA.x, SW, OMA.z], r: PI / 2 + 0.3 }], props: (u, t) => cake(t), key: [OMA.x + 1.5, 1.8, OMA.z + 1.2, 2.5, 4],
    ui: (s) => <Counter from={66} to={67} at={s + 20} dur={20} icon="🎂" suffix="?" /> },
  // 6 — Der Dönermann hat seine Preise geändert. Sechs Euro siebzig war zu gefährlich. Jetzt kostet der Döner neun Euro.
  doenerSign: { fx: "doener", cam: { p: [-0.2, 1.3, -2.2], l: [2.0, 1.0, -5.6], fov: 46, mv: [0.2, 0, -0.4], focus: [1.6, 0.9, -5.0] },
    acts: [MURAT("smug", { cross: 1 })], props: () => <PriceSign position={PRICE} rotY={-0.67} k={0} /> },
  priceClose: { fx: "close", fxo: { bokeh: 2.5 }, cam: { p: [0.1, 1.0, -3.2], l: [1.5, 0.85, -5.0], fov: 38, zoom: 0.85, shake: 0.004, focus: [1.5, 0.92, -5.0] },
    props: (u) => <PriceSign position={PRICE} rotY={-0.67} k={Math.min(1, Math.max(0, (u - 0.25) / 0.25))} />, key: [0.6, 1.6, -3.8, 2.5, 4] },
  doenerMurat: { fx: "doener", cam: { ...DOENERCAM, zoom: 0.8, fast: true, shake: 0.006 }, acts: [MURAT("evil", { point: 1, talk: 1 })],
    props: () => <><Kasse position={[2.15, 1.05, -5.4]} rotY={-0.6} text="9,00 €" /></> },
  // 7 — Achtung, Achtung. Wer seine Hände so bewegt, wird sofort festgenommen.
  copSpeaker: { fx: "close", fxo: { bokeh: 2 }, ...close("cop", -2.4, -9, { r: PI / 2 + 0.25, face: "angry", pose: { talk: 1 }, zoom: 0.85, shake: 0.005 }),
    props: (u, t) => <><Megaphone position={[-2.4 + 0.22, 0.78, -9 + 0.38]} rot={[0.5, PI / 2 + 1.1, 0]} /><Speaker position={[-3.1, 1.55, -9.9]} rotY={PI / 2} t={t} on scale={0.8} />{siren(t, [-0.3, 2.2, -7.5], 5)}</> },
  copDemo: { fx: "street", cam: { p: [-0.1, 1.2, -7.6], l: [-2.4, 0.95, -9.2], fov: 42, mv: [-0.3, 0, -0.2], focus: [-2.4, 0.95, -9.0] },
    acts: [{ c: "cop", face: "evil", pose: { six7: 1, talk: 1 }, p: [-2.4, SW, -9], r: PI / 2 + 0.4 }, { c: "cop", face: "angry", pose: { cross: 1 }, p: [-2.9, SW, -10.2], r: PI / 2, dt: 0.4 }],
    props: (u, t) => siren(t, [-0.3, 2.2, -7.5], 5), key: [-0.8, 1.6, -8, 3, 5] },
  crowdHands: { fx: "park", fxo: { sat: -0.1 }, cam: { ...PARKCAM, mv: [-1.6, -0.2, 0] }, acts: crowd("shock", [{ cross: 1 }, { facepalm: 1 }, { cross: 1, shake: 0.5 }, { headScratch: 1 }]) },
  // 8 — Der Postbote liefert nicht mehr in die Hausnummer siebenundsechzig. Da wohnt jetzt keiner mehr.
  postDoor: { fx: "street", cam: { p: [0.3, 1.3, -9.9], l: [-3.0, 1.2, -12.1], fov: 46, mv: [-0.3, 0, -0.2], focus: [-2.6, 1.0, -11.6] },
    acts: [{ c: "post", face: "shock", pose: { headScratch: 1 }, p: [-1.95, SW, -11.0], r: PI / 2 - 0.3 }],
    props: (u, t) => <><Door67 position={DOOR} rotY={PI / 2} t={t} /><Parcel position={[-2.15, 0.75, -11.1]} rotY={0.6} /></> },
  door67: { fx: "close", fxo: { bokeh: 1.8 }, cam: { p: [-0.4, 2.0, -11.2], l: [-3.0, 2.0, -12], fov: 40, zoom: 0.85, fast: true, focus: [-3.0, 2.0, -12] },
    props: (u, t) => <Door67 position={DOOR} rotY={PI / 2} t={t} />, key: [-1.5, 2.2, -11.2, 2.5, 4] },
  postEmpty: { fx: "street", fxo: { sat: -0.12 }, cam: { p: [0.4, 1.0, -8.6], l: [-2.6, 0.8, -12.4], fov: 46, mv: [0, 0, -0.3], focus: [-2.4, 0.8, -12] },
    acts: [{ c: "post", face: "sad", pose: { walk: 1 }, p: [-2.2, SW, -11.4], r: 0, mv: [0, 1.4] }],
    props: (u, t) => <><Door67 position={DOOR} rotY={PI / 2} t={t} /><Parcel position={[-1.95, 0.75, -11.25 + u * 1.4]} />
      <mesh position={[0.6 - u * 2.8, 0.32 + Math.abs(Math.sin(t * 7)) * 0.15, -11.6]} rotation={[0, 0, t * 6]}><icosahedronGeometry args={[0.2, 1]} /><meshStandardMaterial color="#b0904a" roughness={1} wireframe /></mesh></> },
  // 9 — Alles war ruhig. Bis zur großen Rede vom Bürgermeister. Live im Fernsehen.
  calmTown: { fx: "street", fxo: { sat: 0.1 }, cam: STREET, acts: walkers(-4, 6) },
  rathausWide: { fx: "street", cam: { p: [1.4, 1.4, -21.4], l: [-2.2, 1.2, -24.6], fov: 48, mv: [-0.3, 0, -0.5], focus: [MX, 1.0, MZ] },
    acts: [{ c: "mayor", face: "smug", pose: { cross: 1 }, p: [MX, SW, MZ], r: PI / 2 - 0.7 }, { c: "cop", face: "smug", pose: { cross: 1 }, p: [MX - 1.1, SW, MZ + 0.5], r: PI / 2 - 0.4, dt: 0.3 }],
    props: (u, t) => desk(t) },
  tvMayor: { fx: "close", ...close("mayor", MX, MZ, { r: PI / 2 - 0.7, face: "smile", pose: { wave: 1 }, zoom: 0.9 }), props: (u, t) => desk(t), ui: tv("EILMELDUNG") },
  // 10 — Liebe Leute. Unsere Stadt hat jetzt genau... sechs... sieben...
  tvMayorTalk: { fx: "close", ...close("mayor", MX, MZ, { r: PI / 2 - 0.7, face: "smug", pose: { talk: 1, point: 0.4 }, zoom: 0.92 }), props: (u, t) => desk(t), ui: tv("REDE AN DIE STADT") },
  tvZoom: { fx: "close", fxo: { bokeh: 3 }, ...close("mayor", MX, MZ, { r: PI / 2 - 0.7, face: "shock", pose: { six7: 0.6, talk: 1 }, zoom: 0.6, fast: true, fov: 26, shake: 0.006 }),
    props: (u, t) => desk(t), ui: tv("REDE AN DIE STADT") },
  crowdFreeze: { fx: "park", fxo: { sat: -0.25, contrast: 0.08 }, cam: { ...PARKCAM, mv: [-3.2, -0.4, 0], fast: true, zoom: 0.8 }, acts: crowd("shock", [{ armsUp: 0.3 }, { facepalm: 1 }, {}]) },
  // 11 — ...tausend Einwohner. Aber es war zu spät.
  mayorSmile: { fx: "close", ...close("mayor", MX, MZ, { r: PI / 2 - 0.7, face: "happy", pose: { armsUp: 0.7, talk: 1 }, zoom: 0.95 }), props: (u, t) => desk(t),
    ui: (s, e) => <>{tv("67.000 EINWOHNER")(s)}<Counter from={66990} to={67000} at={s} dur={25} icon="🏠" /></> },
  crowdTurn: { fx: "park", fxo: { sat: 0.1, contrast: 0.1 }, cam: { ...PARKCAM, mv: [-2.4, -0.3, 0], shake: 0.006 }, acts: crowd("evil", [{ cross: 1 }, { point: 1 }, { shake: 0.4 }]) },
  // 12 — Die ganze Stadt ist eskaliert. Alle haben es geschrien. Sogar Oma.
  crowd67: { fx: "park", fxo: { sat: 0.3 }, cam: { ...PARKCAM, mv: [-2.0, -0.3, 0], shake: 0.008 }, acts: crowd("grin", SIX),
    ui: (s) => <Comments texts={["SIX SEVEN!!", "67 67 67", "🤚🤚 6️⃣7️⃣"]} at={s} every={9} /> },
  crowd67b: { fx: "street", fxo: { sat: 0.3 }, cam: { ...STREET, shake: 0.006 }, acts: walkers(-4, 8, { face: "grin", pose: { six7: 1, jump: 0.4 } }), props: (u, t) => siren(t, [0, 2.5, -6], 4) },
  oma67: { fx: "close", fxo: { sat: 0.2 }, ...close("oma", OMA.x, OMA.z, { r: PI / 2 + 0.35, face: "grin", pose: { six7: 1, jump: 0.3 }, zoom: 0.75, fast: true, shake: 0.007 }), props: (u, t) => cake(t) },
  // 13 — Jetzt sitzt der Bürgermeister im Gefängnis. Direkt neben Kevin.
  cellBoth: { light: "day", fx: "close", fxo: { sat: 0.28, bright: 0.04, bokeh: 1.2 }, cam: { p: [0.9, 1.35, CZ + 2.6], l: [-0.1, 1.05, CZ - 1.5], fov: 44, mv: [-0.3, 0, -0.4], focus: [-0.1, 1.0, CZ - 1.3] },
    acts: [inCell("mayor", 0.35, "cry", { facepalm: 1 }, -0.1), inCell("kevin", -0.6, "happy", { wave: 1 }, 0.25, 0.3)], props: (u, t) => <>{cell(t)}{siren(t)}</>, key: [0.8, 1.8, CZ + 1.8, 3, 6] },
  kevinWave: { light: "day", fx: "close", fxo: { sat: 0.28, bright: 0.04, bokeh: 2.5 }, ...cc("kevin", -0.6, { r: 0.25, face: "happy", pose: { wave: 1 }, zoom: 0.85 }),
    props: (u, t) => cell(t) },
  // 14 — Und wenn du jetzt Six Seven in die Kommentare schreibst... kommst du auch rein.
  ichSmug: dusk({ fx: "close", ...ic({ r: IR + 0.25, face: "smug", pose: { cross: 1 }, zoom: 0.85 }) }),
  commentBox: dusk({ fx: "close", fxo: { bokeh: 3 }, ...ic({ r: IR - 0.2, face: "evil", pose: { phone: 1 }, zoom: 0.9 }), ui: (s) => <CommentJail at={s} stampAt={45} /> }),
  ichPoint: dusk({ fx: "close", ...ic({ r: IR - 0.15, face: "grin", pose: { point: 1, shake: 0.4 }, zoom: 0.6, fast: true, shake: 0.006 }) }),

  // ---------- refren „Huss! Huss! Huss!” ----------
  hussLow: dusk({ fx: "close", fxo: { bokeh: 1.2 }, cam: { p: [IX + 1.25, 0.42, IZ + 0.4], l: [IX, 0.8, IZ], fov: 44, zoom: 0.8, fast: true, shake: 0.006, focus: [IX, 1.0, IZ] },
    acts: [{ c: "ich", face: "angry", pose: { armsUp: 1, shake: 0.6 }, p: [IX, SW, IZ], r: IR + 0.2 }] }, [IX + 1.5, 0.6, IZ + 0.6]),
  hussGrind: dusk({ fx: "close", ...ic({ r: IR + 0.35, face: "angry", pose: { shake: 1, talk: 1 }, zoom: 0.85, shake: 0.006 }) }),
  hussFast: dusk({ fx: "close", ...ic({ r: IR - 0.35, face: "smile", pose: { wave: 1, shake: 0.5 }, zoom: 0.72, fast: true, shake: 0.008 }) }),
  hussPoint: dusk({ fx: "close", ...ic({ r: IR, face: "grin", pose: { point: 1, shake: 0.6 }, zoom: 0.78, shake: 0.007 }) }),
  hussSix: dusk({ fx: "close", fxo: { bokeh: 2 }, ...ic({ r: IR + 0.1, face: "grin", pose: { six7: 1, jump: 0.3 }, zoom: 0.88, fast: true, shake: 0.007 }) }),
  hussOutro: dusk({ fx: "close", fxo: { bokeh: 0.9, sat: 0.3 }, cam: { p: FACE.p, l: FACE.l, fov: FACE.fov, fn: outro, focus: (u) => outro(u).l, shake: 0.003 },
    town: { wide: true, center: [0, -10], fog: (u) => { const k = Math.pow(Math.max(0, (u - 0.4) / 0.6), 2); return [40 + 120 * k, 160 + 260 * k]; } },
    acts: [{ c: "ich", face: "grin", pose: { six7: 1, talk: 1 }, p: [IX, SW, IZ], r: IR + 0.15 }, ...walkers(-2, 6, { face: "grin", pose: { six7: 1 } })],
    props: (u, t) => <>{cell(t)}{siren(t)}</> }),
};
