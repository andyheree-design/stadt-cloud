// E01 v3 (szablon „In dieser Stadt … Außer mir” + refren „Huss”): ręce POV, nocny widok z okna z imprezą, toster, lustro,
// budzik, stolik, girlandy świateł. Wszystko proceduralne (bez cudzych assetów).
import React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { ctex, labelTex } from "./Tex";

type V3 = [number, number, number];
const PI = Math.PI;
const SKIN = "#f0c39c", SKIN_D = "#e2ae84", SLEEVE = "#f4f4f4", CUFF = "#e6b48c"; // v4: rękaw białego T-shirtu, palce o ton ciemniejsze

/** nocne MAŁE MIASTECZKO (jak wzór): ciepłe niebo przy horyzoncie, góry ze śniegiem, domki ze spadzistymi dachami i ciepłymi oknami, drzewa, lampiony */
const townView = () => ctex("nighttown4", 1536, 768, (g, r) => {
  const W = 1536, H = 768;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#0f1748"); gr.addColorStop(0.45, "#3a3f86"); gr.addColorStop(0.72, "#b36a7a"); gr.addColorStop(1, "#f0a060");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,240,${0.3 + r() * 0.7})`; g.fillRect(r() * W, r() * 300, 2, 2); }
  g.fillStyle = "#fff6d8"; g.shadowColor = "#fff2c0"; g.shadowBlur = 40; g.beginPath(); g.arc(1220, 120, 42, 0, 7); g.fill(); g.shadowBlur = 0;
  const mount = (y0: number, hgt: number, col: string) => { let x = -100; while (x < W + 100) { const w = 260 + r() * 260, h = hgt * (0.6 + r() * 0.5), px = x + w / 2, py = y0 - h;
    g.fillStyle = col; g.beginPath(); g.moveTo(x, y0); g.lineTo(px, py); g.lineTo(x + w, y0); g.fill();
    g.fillStyle = "#e8eef8"; g.beginPath(); g.moveTo(px, py); g.lineTo(px - w * 0.12, py + h * 0.24); g.lineTo(px - w * 0.03, py + h * 0.19); g.lineTo(px + w * 0.04, py + h * 0.26); g.lineTo(px + w * 0.12, py + h * 0.24); g.fill();
    x += w * 0.62; } };
  mount(560, 330, "#3d5a86"); mount(600, 200, "#2a4466");
  g.fillStyle = "#1f3b30"; g.beginPath(); g.moveTo(0, 640); for (let x = 0; x <= W; x += 40) g.lineTo(x, 590 + Math.sin(x * 0.006) * 28 + r() * 8); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  const WALL = ["#e7b98a", "#d98f7a", "#f0d9a0", "#a9c6a0", "#c9a3c9", "#9fbfd9", "#f2c4a0"], ROOF = ["#8a3326", "#6e2a24", "#4a3a6a", "#7a4a2a"];
  const houses = (base: number, sc: number) => { let x = -40 + r() * 40; while (x < W) { const w = (90 + r() * 70) * sc, h = (70 + r() * 70) * sc, rh = (45 + r() * 30) * sc, y = base - h;
    g.fillStyle = WALL[Math.floor(r() * WALL.length)]; g.fillRect(x, y, w, h);
    g.fillStyle = "rgba(20,20,60,0.35)"; g.fillRect(x, y, w, h);
    g.fillStyle = ROOF[Math.floor(r() * ROOF.length)]; g.beginPath(); g.moveTo(x - 8 * sc, y); g.lineTo(x + w / 2, y - rh); g.lineTo(x + w + 8 * sc, y); g.fill();
    g.fillRect(x + w * 0.7, y - rh * 0.8, 10 * sc, rh * 0.5);
    for (let wy = y + 14 * sc; wy < base - 22 * sc; wy += 34 * sc) for (let wx = x + 12 * sc; wx < x + w - 20 * sc; wx += 30 * sc) {
      const lit = r() < 0.75; g.fillStyle = lit ? "#ffc65a" : "#2b2f55"; if (lit) { g.shadowColor = "#ffb040"; g.shadowBlur = 14; } g.fillRect(wx, wy, 14 * sc, 18 * sc); g.shadowBlur = 0; }
    if (r() < 0.5) { g.fillStyle = "#16301f"; const tx = x + w + 14 * sc; g.beginPath(); g.moveTo(tx - 22 * sc, base); g.lineTo(tx, base - 110 * sc); g.lineTo(tx + 22 * sc, base); g.fill(); }
    x += w + (16 + r() * 40) * sc; } };
  houses(650, 0.7); houses(768, 1.05);
  const cols = ["#ff5a3b", "#ffd23f", "#ffffff", "#ff9a3b", "#ff5ce1"];
  [[470, 1], [520, 0.6]].forEach(([y0, k]) => { for (let i = 0; i < 40; i++) { const u = i / 39, px = u * W, py = +y0 + Math.sin(u * PI * 4) * 30 * +k;
    g.fillStyle = cols[i % 5]; g.shadowColor = cols[i % 5]; g.shadowBlur = 16; g.beginPath(); g.arc(px, py, 7, 0, 7); g.fill(); } });
  g.shadowBlur = 0;
});
const nightView = townView;

/** świat za otwartym oknem pokoju (Room open): bruk, namalowane miasteczko, lampiony, ciepłe światła, spadające konfetti */
export const PartyOutside: React.FC<{ t: number }> = ({ t }) => {
  const tv = townView();
  const CF = ["#ff3b3b", "#ffd23f", "#3bff7a", "#3bb4ff", "#ff5ce1", "#ffffff"];
  return <group>
    <mesh position={[0.2, 3.2, -10]}><planeGeometry args={[22, 11]} /><meshBasicMaterial map={tv} toneMapped={false} /></mesh>
    <mesh rotation={[-PI / 2, 0, 0]} position={[0.2, -0.005, -6.3]}><planeGeometry args={[22, 7.4]} /><meshStandardMaterial color="#6a5446" roughness={0.9} /></mesh>
    <StringLights a={[-2.2, 2.25, -2.9]} b={[2.8, 2.25, -2.9]} n={20} h={0.35} />
    <StringLights a={[-2.6, 2.6, -4.2]} b={[3.0, 2.6, -4.2]} n={22} h={0.5} />
    <pointLight position={[0.2, 2.0, -2.9]} color="#ffb36a" intensity={7} distance={5} decay={1.5} />
    <pointLight position={[-1.0, 1.8, -4.0]} color="#ff6ad5" intensity={5} distance={5} decay={1.5} />
    <pointLight position={[1.6, 1.8, -4.0]} color="#ffd23f" intensity={5} distance={5} decay={1.5} />
    {[...Array(70)].map((_, i) => { const a = i * 12.9898, x = -1.3 + ((a * 7.3) % 3.2), z = -2.75 - ((a * 3.1) % 1.8), y = 0.4 + (2.4 - ((t * (0.35 + (i % 5) * 0.06) + (a % 2.4)) % 2.4));
      return <mesh key={i} position={[x, y, z]} rotation={[t * 3 + i, t * 2.3 + i * 0.7, 0]}><planeGeometry args={[0.035, 0.022]} /><meshStandardMaterial color={CF[i % 6]} emissive={CF[i % 6]} emissiveIntensity={0.6} side={THREE.DoubleSide} /></mesh>; })}
  </group>;
};

/** nakładka na okno pokoju (Room: okno 1,5×1,2 w (0.2, 1.85, −2.43)) */
export const NightWindow: React.FC = () => {
  const t = nightView();
  return <mesh position={[0.2, 1.85, -2.415]}><planeGeometry args={[1.5, 1.2]} /><meshStandardMaterial map={t} emissive="#fff" emissiveMap={t} emissiveIntensity={0.85} roughness={0.2} /></mesh>;
};

/** stolik przed bohaterem (blat 1,6×0,66 na 0,5) */
export const Table: React.FC<{ position: V3 }> = ({ position }) => (
  <group position={position}>
    <RoundedBox args={[1.6, 0.05, 0.66]} radius={0.015} position={[0, 0.5, 0]} castShadow receiveShadow><meshStandardMaterial color="#9a6436" roughness={0.6} /></RoundedBox>
    {[[-0.72, -0.27], [0.72, -0.27], [-0.72, 0.27], [0.72, 0.27]].map(([x, z], i) => <mesh key={i} position={[x, 0.24, z]} castShadow><boxGeometry args={[0.05, 0.48, 0.05]} /><meshStandardMaterial color="#6b4423" /></mesh>)}
  </group>
);

/** telefon leżący na blacie z miłym komentarzem na ekranie */
export const PhoneFlat: React.FC<{ position: V3; rotY?: number; text?: string }> = ({ position, rotY = 0, text = "❤ Nett!" }) => {
  const tx = labelTex(text, "#ffffff", "#e0245e", 256, 492, "900 50px 'Arial Black', Arial");
  return <group position={position} rotation={[0, rotY, 0]}>
    <RoundedBox args={[0.15, 0.014, 0.28]} radius={0.006} position={[0, 0.007, 0]} castShadow><meshStandardMaterial color="#15171c" roughness={0.3} /></RoundedBox>
    <mesh position={[0, 0.0145, 0]} rotation={[-PI / 2, 0, 0]}><planeGeometry args={[0.135, 0.26]} /><meshStandardMaterial map={tx} emissive="#fff" emissiveMap={tx} emissiveIntensity={0.5} /></mesh>
  </group>;
};
/** kartka z napisem na blacie */
export const Card: React.FC<{ position: V3; rotY?: number; text: string; color?: string }> = ({ position, rotY = 0, text, color = "#2a6fd6" }) => (
  <mesh position={[position[0], position[1] + 0.002, position[2]]} rotation={[-PI / 2, 0, rotY]} receiveShadow><planeGeometry args={[0.24, 0.17]} /><meshStandardMaterial map={labelTex(text, "#fbf6e8", color, 340, 240, "900 70px 'Arial Black', Arial")} roughness={0.9} /></mesh>
);
export const Mug: React.FC<{ position: V3 }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 0.06, 0]} castShadow><cylinderGeometry args={[0.05, 0.045, 0.12, 20]} /><meshStandardMaterial color="#e84a3a" roughness={0.4} /></mesh>
    <mesh position={[0.055, 0.065, 0]} rotation={[0, 0, PI / 2]}><torusGeometry args={[0.028, 0.009, 8, 16]} /><meshStandardMaterial color="#e84a3a" /></mesh>
  </group>
);

export const Toaster: React.FC<{ position: V3; rotY?: number; pop?: number }> = ({ position, rotY = 0, pop = 0 }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <RoundedBox args={[0.3, 0.19, 0.17]} radius={0.04} position={[0, 0.095, 0]} castShadow><meshStandardMaterial color="#d8dde3" metalness={0.85} roughness={0.22} /></RoundedBox>
    {[-0.045, 0.045].map((z) => <mesh key={z} position={[0, 0.192, z]}><boxGeometry args={[0.2, 0.004, 0.025]} /><meshStandardMaterial color="#111" /></mesh>)}
    {[-0.045, 0.045].map((z) => <mesh key={"t" + z} position={[0, 0.15 + pop * 0.1, z]}><boxGeometry args={[0.17, 0.15, 0.02]} /><meshStandardMaterial color="#d9a35a" roughness={0.9} /></mesh>)}
    <mesh position={[0.155, 0.08, 0]}><boxGeometry args={[0.02, 0.03, 0.05]} /><meshStandardMaterial color="#222" /></mesh>
  </group>
);

/** budzik z czerwonymi cyframi */
export const Clock: React.FC<{ position: V3; rotY?: number; text?: string }> = ({ position, rotY = 0, text = "05:00" }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <RoundedBox args={[0.24, 0.13, 0.1]} radius={0.025} position={[0, 0.065, 0]} castShadow><meshStandardMaterial color="#222831" roughness={0.4} /></RoundedBox>
    <mesh position={[0, 0.068, 0.051]}><planeGeometry args={[0.2, 0.09]} /><meshStandardMaterial map={labelTex(text, "#120404", "#ff2a2a", 256, 112, "900 84px 'Arial Black', Arial")} emissive="#ff2a2a" emissiveIntensity={0.25} /></mesh>
  </group>
);

/** lustro: rama + „odbicie” (aktor za ramą zwrócony do kamery) */
export const MirrorFrame: React.FC<{ position: V3; rotY?: number }> = ({ position, rotY = 0 }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    {[[0, 0.62, 0.9, 0.08], [0, -0.62, 0.9, 0.08], [-0.45, 0, 0.08, 1.32], [0.45, 0, 0.08, 1.32]].map(([x, y, w, h], i) =>
      <mesh key={i} position={[x, y, 0]} castShadow><boxGeometry args={[w, h, 0.06]} /><meshStandardMaterial color="#d4a838" metalness={0.7} roughness={0.3} /></mesh>)}
  </group>
);

/** girlanda kolorowych żarówek między punktami a i b (zwis h) */
export const StringLights: React.FC<{ a: V3; b: V3; n?: number; h?: number }> = ({ a, b, n = 18, h = 0.5 }) => {
  const C = ["#ff3b3b", "#ffd23f", "#3bff7a", "#3bb4ff", "#ff5ce1"];
  return <group>{[...Array(n)].map((_, i) => {
    const u = i / (n - 1), p: V3 = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(u * PI) * h, a[2] + (b[2] - a[2]) * u];
    return <mesh key={i} position={p}><sphereGeometry args={[0.07, 10, 8]} /><meshStandardMaterial color={C[i % 5]} emissive={C[i % 5]} emissiveIntensity={2.2} /></mesh>;
  })}</group>;
};

/** jedna ręka R6 w układzie kamery: rękaw + dłoń (+ kciuk) */
const Arm: React.FC<{ p: V3; rot: V3; thumb?: boolean }> = ({ p, rot, thumb }) => (
  // v4: smuklejsze przedramię, rękaw koszulki u dołu, pięść z czterema palcami i kciukiem (nie gładki klocek)
  <group position={[p[0], p[1] - 0.1, p[2]]} rotation={rot} scale={0.4}>
    <RoundedBox args={[0.27, 0.22, 0.25]} radius={0.05} position={[0, -0.62, 0]}><meshStandardMaterial color={SLEEVE} roughness={0.8} /></RoundedBox>
    <RoundedBox args={[0.16, 0.5, 0.15]} radius={0.06} position={[0, -0.3, 0]}><meshStandardMaterial color={SKIN} roughness={0.6} /></RoundedBox>
    <RoundedBox args={[0.2, 0.15, 0.17]} radius={0.05} position={[0, 0.0, 0]}><meshStandardMaterial color={SKIN} roughness={0.55} /></RoundedBox>
    {[-0.069, -0.023, 0.023, 0.069].map((x) => <RoundedBox key={x} args={[0.042, 0.07, 0.06]} radius={0.018} position={[x, 0.07, -0.06]}><meshStandardMaterial color={SKIN_D} roughness={0.55} /></RoundedBox>)}
    {thumb ? <RoundedBox args={[0.06, 0.14, 0.06]} radius={0.025} position={[0.0, 0.17, 0.04]}><meshStandardMaterial color={SKIN} roughness={0.55} /></RoundedBox>
      : <RoundedBox args={[0.05, 0.09, 0.06]} radius={0.02} position={[0.095, 0.02, 0.03]} rotation={[0, 0, -0.4]}><meshStandardMaterial color={SKIN} roughness={0.55} /></RoundedBox>}
  </group>
);

/** ręce bohatera z perspektywy pierwszej osoby — przyklejone do kamery; mode: kciuki / machanie / wskazywanie; szybkie jak we wzorze */
export const PovHands: React.FC<{ t: number; mode: "thumbs" | "wave" | "point" | "type" }> = ({ t, mode }) => {
  const cam = useThree((s) => s.camera);
  const w = t * 2 * PI * 4.2; // ~4 ruchy/s
  // dłonie w środku kadru (jak wzór), rękawy wchodzą z dolnych rogów
  const Z = -0.62, X = -0.95; // kamera wysoko i stromo nad stołem
  const L: { p: V3; rot: V3; thumb?: boolean } = { p: [-0.1, -0.03, Z], rot: [X, 0, -0.35], thumb: true };
  const R: { p: V3; rot: V3; thumb?: boolean } = { p: [0.1, -0.03, Z], rot: [X, 0, 0.35], thumb: true };
  if (mode === "thumbs") { const a = Math.max(0, Math.sin(w)), b = Math.max(0, -Math.sin(w)); L.p = [-0.1 + a * 0.03, -0.05 + a * 0.06, Z - a * 0.06]; R.p = [0.1 - b * 0.03, -0.05 + b * 0.06, Z - b * 0.06]; }
  if (mode === "wave") { R.p = [0.08, -0.06, Z]; R.rot = [X + 0.3, 0, 0.3 + Math.sin(w * 1.2) * 0.55]; R.thumb = false; L.p = [-0.14, -0.2, Z]; }
  if (mode === "point") { const k = Math.sin(w) > 0; L.p = [-0.09, k ? -0.08 : -0.17, k ? Z - 0.1 : Z]; R.p = [0.09, k ? -0.17 : -0.08, k ? Z : Z - 0.1]; L.rot = [X - 0.3, 0, -0.35]; R.rot = [X - 0.3, 0, 0.35]; L.thumb = R.thumb = false; }
  if (mode === "type") { L.p = [-0.1, -0.17 + Math.abs(Math.sin(w * 1.5)) * 0.04, Z]; R.p = [0.1, -0.17 + Math.abs(Math.cos(w * 1.5)) * 0.04, Z]; L.rot = [X - 0.2, 0, -0.4]; R.rot = [X - 0.2, 0, 0.4]; L.thumb = R.thumb = false; }
  return (
    <group position={cam.position.clone()} quaternion={cam.quaternion.clone()}>
      <pointLight position={[0, 0.25, 0.1]} intensity={1.4} distance={2} color="#fff2e0" />
      <Arm {...L} /><Arm {...R} />
    </group>
  );
};

export { THREE };
