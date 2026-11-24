// KOS F04 — tabela 17 ujęć dla look-devu (bramka 4) i później dla animacji (bramka 5/6).
// Układ: punkt [s, n, y] — n = odległość od frontu automatu (oś NV, w stronę widza/alei),
// s = w poprzek (oś TV). W lokalnym układzie grupy ślubnej: x = -s, z = n.
export const AM: [number, number] = [3.4, 1.4];
export const AROT = -0.55;
export const NV: [number, number] = [-Math.sin(AROT), -Math.cos(AROT)];
export const TV: [number, number] = [-NV[1], NV[0]];
export const F0: [number, number] = [AM[0] + NV[0] * 0.35, AM[1] + NV[1] * 0.35];
export const at = (n: number, s = 0): [number, number] => [F0[0] + NV[0] * n + TV[0] * s, F0[1] + NV[1] * n + TV[1] * s];
export const FACE = Math.atan2(NV[0], NV[1]) + Math.PI;

export const CAST_IDS = ["versp", "pfand", "doener", "curry", "buero", "brez", "guenther"] as const;
type Arm = { fwd?: number; out?: number; elbow?: number };
export type ActorDef = { s: number; n: number; turn?: number; face?: Record<string, number>; lean?: number; tilt?: number; squash?: number; bob?: number; armL?: Arm; armR?: Arm };
type Pt = [number, number, number];
export type ShotDef = {
  id: number; note: string;
  eye: Pt | "antrag" | "board"; look: Pt | "antrag" | "board";
  eyeRel?: Pt;           // oko = cel + przesunięcie w lokalnym układzie ślubu (x=-s, y, z=n)
  fov: number; dof?: number;
  cast: Partial<Record<(typeof CAST_IDS)[number], ActorDef>>;
  props?: { antrag?: number; mark?: boolean; stampUp?: boolean; stampOnPaper?: boolean; fly?: boolean; board?: boolean; bouquet?: Pt };
};

// ustawienie bazowe (ceremonia)
const G: ActorDef = { s: 0, n: 0.7, face: { smile: 1 } };                       // Günther — urzędnik pod łukiem
const C: ActorDef = { s: 0.42, n: 1.35, turn: -0.25, face: { smile: 1 } };      // Currywurstine — panna młoda
const B: ActorDef = { s: -0.95, n: 1.1, turn: 0.3, face: { determined: 1 } };   // Bürokratius — pan młody przy biurku
const P: ActorDef = { s: 1.3, n: 0.95, turn: -0.35, face: { fear: 0.6, neutral: 0.4 } }; // Pfandolino przy skrzynkach
const Z: ActorDef = { s: 1.75, n: 2.6, turn: -0.2, face: { smile: 0.5, neutral: 0.5 } }; // Brezelina — gość
const base = { guenther: G, curry: C, buero: B, pfand: P, brez: Z };
export const BASE: Record<string, ActorDef> = base;

export const LOOKDEV: ShotDef[] = [
  { id: 1, note: "makro: pieczątka uderzyła w Antrag", eye: "antrag", look: "antrag", eyeRel: [-0.3, 0.7, 0.75], fov: 36, dof: 4,
    cast: base, props: { antrag: 1, mark: true, stampUp: true } },
  { id: 2, note: "Bürokratius plan średni, wniosek ×3", eye: [-0.3, 3.4, 1.1], look: [-0.95, 1.1, 0.75], fov: 38,
    cast: { ...base, buero: { ...B, face: { angry: 1 }, armR: { fwd: 1.3, elbow: 0.6 } } }, props: { antrag: 3, mark: true } },
  { id: 3, note: "Günther przy automacie, najazd", eye: [-0.55, 3.1, 1.15], look: [0.05, 0.7, 0.8], fov: 34,
    cast: { ...base, guenther: { ...G, armL: { fwd: 1.1, elbow: 0.8 }, armR: { fwd: 1.1, elbow: 0.8 } } }, props: { antrag: 3, mark: true } },
  { id: 4, note: "Pfandolino drży", eye: [0.8, 3.2, 1.0], look: [1.3, 0.95, 0.7], fov: 38,
    cast: { ...base, pfand: { ...P, squash: 0.94, tilt: 0.08, face: { fear: 1 } } }, props: { antrag: 3, mark: true } },
  { id: 5, note: "Currywurstine w welonie", eye: [0.2, 3.0, 1.1], look: [0.42, 1.35, 0.85], fov: 34,
    cast: base, props: { antrag: 3, mark: true } },
  { id: 6, note: "Bürokratius podnosi paragraf, znak § 12", eye: [-0.4, 3.8, 1.2], look: [-1.3, 1.1, 0.9], fov: 40,
    cast: { ...base, buero: { ...B, turn: 0.1, armR: { fwd: 2.6, elbow: 0.2 } } }, props: { antrag: 3, mark: true } },
  { id: 7, note: "kichnięcie, trzy egzemplarze odlatują", eye: [1.4, 2.6, 1.5], look: [-0.4, 1.2, 1.0], fov: 50,
    cast: { ...base, curry: { ...C, squash: 0.86, lean: -0.25, face: { startle: 1 } }, buero: { ...B, face: { startle: 1 }, lean: -0.15 } },
    props: { antrag: 3, mark: true, fly: true } },
  { id: 8, note: "Günther do tłumu, najazd", eye: [-0.1, 3.0, 1.2], look: [0, 0.7, 0.9], fov: 36,
    cast: { ...base, guenther: { ...G, armR: { fwd: 1.6, out: 0.5, elbow: 0.3 } } }, props: { antrag: 0 } },
  { id: 9, note: "ZWROT: kontrplan na aleję, Döner wpada", eye: [1.05, 0.15, 1.7], look: [0.1, 3.9, 0.75], fov: 44,
    cast: { ...base, doener: { s: 0.1, n: 3.9, turn: Math.PI, lean: 0.25, face: { determined: 1 }, armR: { fwd: 1.8, elbow: 0.2 } } }, props: { antrag: 0 } },
  { id: 10, note: "Brezelina, szybki najazd", eye: [1.3, 4.0, 1.55], look: [1.75, 2.6, 0.85], fov: 34,
    cast: { ...base, brez: { ...Z, face: { startle: 1 } } }, props: { antrag: 0 } },
  { id: 11, note: "Döner do Brezeliny", eye: [1.45, 4.4, 1.2], look: [1.5, 2.8, 0.75], fov: 46,
    cast: { ...base, doener: { s: 1.0, n: 2.75, turn: 0.9, face: { smile: 0.6, sad: 0.4 } }, brez: { ...Z, turn: -0.9, face: { smile: 1 } } }, props: { antrag: 0 } },
  { id: 12, note: "pieczątka na kartce sprzeciwu (makro)", eye: "antrag", look: "antrag", eyeRel: [-0.25, 0.6, 0.6], fov: 36, dof: 4,
    cast: base, props: { antrag: 1, mark: true, stampOnPaper: true } },
  { id: 13, note: "bukiet, Pfandolino mdleje, Günther łapie", eye: [0.6, 3.0, 1.25], look: [1.1, 0.95, 0.6], fov: 46,
    cast: { ...base, guenther: { ...G, s: 0.75, n: 0.8, turn: -0.6, armL: { fwd: 1.4 }, armR: { fwd: 1.4 } }, pfand: { ...P, lean: -0.55, face: { startle: 1 } } },
    props: { antrag: 0, bouquet: [-1.25, 1.05, 1.05] } },
  { id: 14, note: "Verspätino wbiega (kontrplan)", eye: [0.15, 3.55, 0.9], look: [-0.2, 5.4, 0.45], fov: 44,
    cast: { ...base, doener: { s: 0.85, n: 2.6, turn: Math.PI }, versp: { s: -0.2, n: 5.4, turn: Math.PI, lean: 0.3, face: { startle: 1 }, armL: { fwd: 1.5 }, armR: { fwd: -0.8 } } },
    props: { antrag: 0 } },
  { id: 15, note: "Günther na środku, odjazd na wszystkich", eye: [0, 8.4, 2.0], look: [0, 1.6, 0.8], fov: 42,
    cast: { ...base, doener: { s: 0.75, n: 2.4, turn: -0.2, face: { smile: 1 } }, versp: { s: -0.6, n: 2.8, turn: 0.2, face: { smile: 0.5, neutral: 0.5 } } },
    props: { antrag: 0 } },
  { id: 16, note: "tablica głosowania w świecie", eye: [0, 5.85, 1.45], look: "board", fov: 46,
    cast: base, props: { antrag: 0, board: true } },
  { id: 17, note: "pieczątka w róg tablicy (pętla) — sama pieczątka dojdzie w animacji", eye: [0.15, 5.55, 1.5], look: "board", fov: 44,
    cast: base, props: { antrag: 0, board: true } },
];
