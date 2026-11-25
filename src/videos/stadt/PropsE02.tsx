// E02 „Die Bahn” — dworzec Hinterhausen (peron, tory, wiata, budynek stacji, płot, krzaki) + rekwizyty w stylu PropsV3:
// tablica odjazdów, zegar dworcowy, głośnik, pociąg regionalny, budka z Dönerem, sofa, bilet w D-Mark, biurko burmistrza, torba z bułkami.
// Wszystko proceduralne (bez cudzych assetów). Dworzec stoi w wolnym terenie Town (z ≈ 25–48), tory wzdłuż osi x.
import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { Batch, wbox, pbox, M4, std, texMat, LightPreset } from "./Town";
import { ctex, labelTex, paverTex, brickTex, plasterTex, woodTex } from "./Tex";
import { R6, R6Look, R6Pose } from "./R6";

type V3 = [number, number, number];
const PI = Math.PI;
/** geometria dworca: peron z∈[Z0,Z1] na wysokości PH, tor 1 w TZ, tor 2 w TZ2 */
export const ST = { PH: 0.38, Z0: 31, Z1: 35, TZ: 36.1, TZ2: 38.9 };
const PH = ST.PH;

/** tekstura z kilkoma wierszami tekstu (tablice, kartki, bilety) */
type Row = { t: string; c?: string; px?: number; f?: string };
export const rowsTex = (w: number, h: number, bg: string, rows: Row[], frame?: string) =>
  ctex("rows" + JSON.stringify([w, h, bg, rows, frame]), w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (frame) { g.lineWidth = Math.max(6, w / 90); g.strokeStyle = frame; g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth); }
    g.textAlign = "center"; g.textBaseline = "middle";
    rows.forEach((r, i) => { g.fillStyle = r.c ?? "#fff"; let px = r.px ?? 80; const fnt = () => `${r.f ?? "900"} ${px}px 'Arial Black', Arial, sans-serif`; g.font = fnt();
      while (px > 20 && g.measureText(r.t).width > w * 0.92) { px -= 4; g.font = fnt(); } // auto-dopasowanie: tekst nigdy nie wychodzi poza tablicę
      g.fillText(r.t, w / 2, h * (i + 0.5) / rows.length + 4); });
  });
const gravelTex = () => ctex("gravel", 256, 256, (g, r) => {
  g.fillStyle = "#77736c"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) { const c = 80 + Math.floor(r() * 90); g.fillStyle = `rgb(${c},${c - 4},${c - 10})`; g.beginPath(); g.arc(r() * 256, r() * 256, 1.5 + r() * 3.2, 0, 7); g.fill(); }
});
const tactileTex = () => ctex("tactile", 128, 128, (g) => {
  g.fillStyle = "#f2c230"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#d9a91c";
  for (let y = 8; y < 128; y += 16) g.fillRect(0, y, 128, 5);
});
const winTex = (lit: boolean) => ctex("stwin" + lit, 128, 192, (g) => {
  const gr = g.createLinearGradient(0, 0, 128, 192); gr.addColorStop(0, lit ? "#ffe2a0" : "#9cc4e4"); gr.addColorStop(1, lit ? "#d99a48" : "#1f3d63");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 192); g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 128, 10); g.fillRect(0, 182, 128, 10); g.fillRect(0, 0, 10, 192); g.fillRect(118, 0, 10, 192); g.fillRect(59, 0, 10, 192); g.fillRect(0, 90, 128, 8);
});

// ---------- statyczny zestaw dworca (scalona geometria) ----------
const buildBahnhof = (night: boolean) => {
  const B = new Batch(), r = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  // plac przed dworcem (koniec ulicy) + przejście na peron
  B.add(wbox(34, 0.06, 6.2, 1.6), B.mat("vorplatz", texMat(paverTex("#a8a49a")), false, true), M4(0, 0.03, 27.9));
  // peron
  B.add(wbox(32, PH, ST.Z1 - ST.Z0, 1.2), B.mat("platform", texMat(paverTex("#bdb8ad")), true, true), M4(0, PH / 2, (ST.Z0 + ST.Z1) / 2));
  B.add(wbox(32, PH - 0.02, 0.12, 1), B.mat("edgeface", texMat(plasterTex("#9c9a94"))), M4(0, PH / 2 - 0.01, ST.Z1 + 0.03));
  B.add(wbox(32, 0.012, 0.32, 0.3), B.mat("tactile", texMat(tactileTex()), false, true), M4(0, PH + 0.004, ST.Z1 - 0.55));
  B.add(wbox(32, 0.012, 0.07), B.mat("edgeW", std({ color: "#f6f6f2", roughness: 0.5 }), false, true), M4(0, PH + 0.005, ST.Z1 - 0.12));
  // tory (2): tłuczeń, podkłady, szyny
  const grav = B.mat("gravel", texMat(gravelTex()), false, true), sleeper = B.mat("sleeper", std({ color: "#8d8a84", roughness: 0.9 })), rail = B.mat("rail", std({ color: "#8f959c", metalness: 0.7, roughness: 0.35 }));
  for (const tz of [ST.TZ, ST.TZ2]) {
    B.add(wbox(140, 0.1, 2.6, 1.2), grav, M4(0, 0.03, tz));
    for (let x = -70; x <= 70; x += 0.42) B.add(wbox(0.16, 0.06, 1.6), sleeper, M4(x, 0.1, tz));
    for (const dz of [-0.45, 0.45]) { B.add(wbox(140, 0.06, 0.05), rail, M4(0, 0.16, tz + dz)); B.add(wbox(140, 0.02, 0.1), rail, M4(0, 0.13, tz + dz)); }
  }
  B.add(wbox(140, 0.06, 0.5, 1.2), grav, M4(0, 0.02, (ST.TZ + ST.TZ2) / 2));
  // wiata nad lewą połową peronu (prawa zostaje w słońcu)
  const post = B.mat("canopyPost", std({ color: "#2f6fb0", metalness: 0.3, roughness: 0.5 })), roof = B.mat("canopyRoof", std({ color: "#e9e5dc", roughness: 0.7 })), trim = B.mat("trim", std({ color: "#d6402a", roughness: 0.55 }));
  for (const x of [-13.5, -9.5, -5.5, -1.5]) { B.add(wbox(0.12, 2.3, 0.12), post, M4(x, PH + 1.15, 32.6)); B.add(wbox(0.1, 0.1, 2.6), post, M4(x, PH + 2.25, 33.0, 0, -0.12)); }
  B.add(wbox(13.2, 0.1, 3.9), roof, M4(-7.5, PH + 2.38, 33.0, 0, -0.12));
  B.add(wbox(13.3, 0.2, 0.08), trim, M4(-7.5, PH + 2.16, 34.95));
  // budynek stacji z szyldem HINTERHAUSEN (fasada w stronę peronu)
  const brick = B.mat("stBrick", texMat(brickTex("#b8664a"))), roofT = B.mat("stRoof", std({ color: "#7e2f24", roughness: 0.8 })), white = B.mat("stWhite", std({ color: "#f3efe6", roughness: 0.7 }));
  B.add(wbox(9, 2.8, 3.6, 2), brick, M4(-8.5, 1.4, 27.6));
  B.add(wbox(9.3, 0.18, 3.9), white, M4(-8.5, 2.85, 27.6));
  for (const s of [-1, 1]) B.add(wbox(9.6, 0.14, 2.3), roofT, M4(-8.5, 3.45, 27.6 + s * 0.95, 0, s * 0.55));
  B.add(wbox(0.9, 0.9, 0.5), brick, M4(-6.2, 3.9, 27.4));
  const win = B.mat("stWin" + night, std({ map: winTex(night), emissive: night ? "#ffb04a" : "#000", emissiveIntensity: night ? 0.6 : 0, emissiveMap: night ? winTex(true) : null, roughness: 0.25 }), false, false);
  for (const x of [-11.6, -10.2, -6.8, -5.4]) B.add(pbox(0.8, 1.2, 0.06), win, M4(x, 1.3, 29.42));
  B.add(pbox(1.2, 1.9, 0.06), B.mat("stDoor", std({ color: "#2f6fb0", roughness: 0.5 })), M4(-8.5, 0.95, 29.42));
  B.add(pbox(4.6, 0.62, 0.08), B.mat("hhSign", std({ map: labelTex("HINTERHAUSEN", "#1f4fa8", "#ffffff", 1024, 140, "900 96px 'Arial Black', Arial, sans-serif"), emissive: "#ffffff", emissiveIntensity: night ? 0.35 : 0.08, emissiveMap: labelTex("HINTERHAUSEN", "#1f4fa8", "#ffffff", 1024, 140, "900 96px 'Arial Black', Arial, sans-serif") }), false, false), M4(-8.5, 2.35, 29.47));
  // tablica stacji na peronie (niebieska) + „Gleis 3”
  const steel = B.mat("steel", std({ color: "#5d6670", metalness: 0.5, roughness: 0.45 }));
  for (const x of [2.3, 4.7]) B.add(wbox(0.08, 1.9, 0.08), steel, M4(x, PH + 0.95, 31.5));
  B.add(pbox(2.9, 0.55, 0.06), B.mat("hhSign2", std({ map: labelTex("Hinterhausen", "#1f4fa8", "#ffffff", 1024, 190, "900 120px Arial, sans-serif") })), M4(3.5, PH + 1.62, 31.55));
  const g3 = B.mat("gleis3", std({ map: rowsTex(256, 256, "#f6f6f2", [{ t: "Gleis", c: "#1f4fa8", px: 56 }, { t: "3", c: "#1f4fa8", px: 150 }], "#1f4fa8") }));
  B.add(pbox(0.55, 0.55, 0.05), g3, M4(-3.5, PH + 1.8, 34.3)); B.add(wbox(0.03, 0.35, 0.03), steel, M4(-3.5, PH + 2.2, 34.3));
  B.add(wbox(0.07, 2.0, 0.07), steel, M4(11.5, PH + 1.0, 33.2)); B.add(pbox(0.55, 0.55, 0.05), g3, M4(11.5, PH + 1.9, 33.25));
  // latarnie na peronie, ławki, kosze
  const lampHead = B.mat("lampHead" + night, std({ color: night ? "#ffe2a0" : "#f4f1e8", emissive: night ? "#ffcf70" : "#000", emissiveIntensity: night ? 2.5 : 0 }), false, false);
  for (const x of [-14, -7, 0, 7, 14]) { B.add(wbox(0.08, 2.5, 0.08), steel, M4(x, PH + 1.25, 31.35)); B.add(wbox(0.5, 0.06, 0.12), steel, M4(x, PH + 2.48, 31.55)); B.add(wbox(0.36, 0.05, 0.16), lampHead, M4(x, PH + 2.44, 31.7)); }
  const wood = B.mat("benchWood", texMat(woodTex("#b0743e"))), red = B.mat("binRed", std({ color: "#d6402a", roughness: 0.5 }));
  for (const x of [-10.5, -4.6, 8.6]) {
    B.add(wbox(1.4, 0.06, 0.4), wood, M4(x, PH + 0.34, 31.55)); B.add(wbox(1.4, 0.32, 0.05), wood, M4(x, PH + 0.56, 31.37, 0, -0.15));
    for (const dx of [-0.6, 0.6]) B.add(wbox(0.06, 0.34, 0.4), steel, M4(x + dx, PH + 0.17, 31.55));
    B.add(wbox(0.3, 0.5, 0.3), red, M4(x + 1.05, PH + 0.25, 31.45));
  }
  // płot za torami, krzaki, drzewa, łąka z kwiatami
  const fence = B.mat("fence", std({ color: "#3f6b45", roughness: 0.6 }));
  for (let x = -60; x <= 60; x += 2) B.add(wbox(0.06, 0.9, 0.06), fence, M4(x, 0.45, 41.6));
  for (const y of [0.35, 0.8]) B.add(wbox(120, 0.05, 0.04), fence, M4(0, y, 41.6));
  const leafs = ["#3f8f3a", "#4f9f3f", "#5aa84a", "#3a7f3a"].map((c, i) => B.mat("leaf" + i, std({ color: c, roughness: 0.9, flatShading: true })));
  const ico = new THREE.IcosahedronGeometry(1, 1), trunk = B.mat("trunk", std({ color: "#6b4a2b" })), cyl = new THREE.CylinderGeometry(0.12, 0.16, 1, 8);
  for (let x = -58; x <= 58; x += 2.3 + r() * 1.6) { const s = 0.55 + r() * 0.5; B.add(ico, leafs[Math.floor(r() * 4)], M4(x, s * 0.55, 42.6 + r() * 1.2, r() * 3, 0, 0, [s * 1.3, s, s * 1.1])); }
  for (let x = -55; x <= 55; x += 6 + r() * 5) { const h = 2.2 + r() * 1.6, zz = 45 + r() * 4; B.add(cyl, trunk, M4(x, h / 2, zz, 0, 0, 0, [1, h, 1]));
    B.add(ico, leafs[Math.floor(r() * 4)], M4(x, h + 0.4, zz, r() * 3, 0, 0, [1.5, 1.4, 1.5])); B.add(ico, leafs[Math.floor(r() * 4)], M4(x + 0.6, h - 0.2, zz + 0.3, r() * 3, 0, 0, [1.0, 0.9, 1.0])); }
  // drzewa obok budynku stacji i na końcach peronu (kadry w bok nie są puste)
  for (const [x, z] of [[-15, 27], [-17.5, 30], [16.5, 29.5], [18.5, 32.5], [-18, 34], [13.5, 26.5]]) { const h = 2.4; B.add(cyl, trunk, M4(x, h / 2, z, 0, 0, 0, [1, h, 1])); B.add(ico, leafs[Math.floor(r() * 4)], M4(x, h + 0.5, z, r() * 3, 0, 0, [1.7, 1.6, 1.7])); }
  const flower = ["#ff5a7a", "#ffd23f", "#ffffff", "#b06bff"].map((c, i) => B.mat("fl" + i, std({ color: c, roughness: 0.7 }), false, false)), fl = new THREE.IcosahedronGeometry(0.06, 0);
  for (let i = 0; i < 160; i++) B.add(fl, flower[i % 4], M4(-40 + r() * 80, 0.06, 42.2 + r() * 2.5));
  return B.build();
};
export const Bahnhof: React.FC<{ light?: LightPreset }> = ({ light = "day" }) => {
  const night = light === "night";
  const set = useMemo(() => buildBahnhof(night), [night]);
  return <>
    <primitive object={set} />
    {night && [-7, 0, 7].map((x) => <pointLight key={x} position={[x, PH + 2.3, 31.9]} color="#ffcf80" intensity={5} distance={7} decay={1.5} />)}
  </>;
};

// ---------- tablica odjazdów (Anzeigetafel) ----------
/** wisząca tablica: linia, cel, opóźnienie (kolor), świeci (emissive → bloom) */
export const Anzeige: React.FC<{ position: V3; rotY?: number; line?: string; dest?: string; delay: string; delayColor?: string; blink?: number; scale?: number; hang?: boolean }> =
({ position, rotY = 0, line = "RE 7", dest = "Hinterhausen", delay, delayColor = "#ffd23a", blink = 1, scale = 1, hang = true }) => {
  const tex = rowsTex(1024, 420, "#0a2766", [{ t: `${line}  →  ${dest}`, c: "#ffffff", px: 92 }, { t: delay, c: delayColor, px: 150 }], "#d9dde4");
  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      {hang && [-0.8, 0.8].map((x) => <mesh key={x} position={[x, 0.62, 0]}><boxGeometry args={[0.03, 0.5, 0.03]} /><meshStandardMaterial color="#5d6670" metalness={0.5} roughness={0.4} /></mesh>)}
      <RoundedBox args={[2.2, 0.98, 0.14]} radius={0.04} castShadow><meshStandardMaterial color="#1c2430" metalness={0.4} roughness={0.4} /></RoundedBox>
      {[1, -1].map((s) => <mesh key={s} position={[0, 0, s * 0.073]} rotation={[0, s > 0 ? 0 : PI, 0]}>
        <planeGeometry args={[2.06, 0.85]} /><meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.55 * blink} roughness={0.35} toneMapped={false} />
      </mesh>)}
    </group>
  );
};

// ---------- zegar dworcowy (czerwona sekundnica z tarczką) ----------
export const StationClock: React.FC<{ position: V3; rotY?: number; h: number; m: number; s?: number; r?: number; pole?: number }> = ({ position, rotY = 0, h, m, s = 0, r = 0.32, pole = 0 }) => {
  const aH = ((h % 12) + m / 60) / 12 * 2 * PI, aM = (m + s / 60) / 60 * 2 * PI, aS = s / 60 * 2 * PI;
  const hand = (a: number, len: number, w: number, c: string, z: number, disc?: boolean) => (
    <group rotation={[0, 0, -a]} position={[0, 0, z]}>
      <mesh position={[0, len / 2 - len * 0.15, 0]}><boxGeometry args={[w, len, 0.012]} /><meshStandardMaterial color={c} roughness={0.5} /></mesh>
      {disc && <mesh position={[0, len * 0.78, 0]} rotation={[PI / 2, 0, 0]}><cylinderGeometry args={[r * 0.12, r * 0.12, 0.012, 20]} /><meshStandardMaterial color={c} roughness={0.5} /></mesh>}
    </group>
  );
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {pole > 0 && <mesh position={[0, -pole / 2 - r, -0.05]} castShadow><boxGeometry args={[0.08, pole, 0.08]} /><meshStandardMaterial color="#5d6670" metalness={0.5} roughness={0.45} /></mesh>}
      <mesh rotation={[PI / 2, 0, 0]} castShadow><cylinderGeometry args={[r * 1.08, r * 1.08, 0.1, 40]} /><meshStandardMaterial color="#2a2f36" metalness={0.5} roughness={0.35} /></mesh>
      {[1, -1].map((side) => <group key={side} rotation={[0, side > 0 ? 0 : PI, 0]}>
        <mesh position={[0, 0, 0.051]}><circleGeometry args={[r, 40]} /><meshStandardMaterial color="#fbfbf6" roughness={0.6} emissive="#ffffff" emissiveIntensity={0.08} /></mesh>
        {[...Array(12)].map((_, i) => <mesh key={i} rotation={[0, 0, -i / 12 * 2 * PI]} position={[0, 0, 0.055]}><mesh position={[0, r * 0.82, 0]}><boxGeometry args={[i % 3 ? r * 0.05 : r * 0.09, r * 0.2, 0.006]} /><meshStandardMaterial color="#111" /></mesh></mesh>)}
        <group position={[0, 0, 0.055]}>{hand(aH, r * 0.6, r * 0.09, "#111", 0.004)}{hand(aM, r * 0.88, r * 0.065, "#111", 0.01)}{hand(aS, r * 0.8, r * 0.025, "#d6222a", 0.016, true)}</group>
      </group>)}
    </group>
  );
};

// ---------- głośnik peronowy (tuba) z falami dźwięku ----------
export const Speaker: React.FC<{ position: V3; rotY?: number; t: number; on?: boolean; scale?: number }> = ({ position, rotY = 0, t, on = true, scale = 1 }) => (
  <group position={position} rotation={[0, rotY, 0]} scale={scale}>
    <mesh position={[0, 0, -0.08]}><boxGeometry args={[0.1, 0.16, 0.12]} /><meshStandardMaterial color="#5d6670" metalness={0.5} roughness={0.45} /></mesh>
    <mesh rotation={[PI / 2, 0, 0]} position={[0, 0, 0.1]} castShadow><cylinderGeometry args={[0.2, 0.05, 0.34, 24, 1, true]} /><meshStandardMaterial color="#e9e7e1" metalness={0.3} roughness={0.4} side={2} /></mesh>
    <mesh rotation={[PI / 2, 0, 0]} position={[0, 0, 0.27]}><torusGeometry args={[0.2, 0.015, 8, 28]} /><meshStandardMaterial color="#c9c5bc" metalness={0.4} roughness={0.4} /></mesh>
    {on && [0, 1, 2].map((i) => { const k = (t * 1.6 + i / 3) % 1; return (
      <mesh key={i} position={[0, 0, 0.35 + k * 0.9]}><torusGeometry args={[0.2 + k * 0.45, 0.018, 6, 36]} /><meshBasicMaterial color="#ffe23a" transparent opacity={(1 - k) * 0.9} toneMapped={false} /></mesh>); })}
  </group>
);

// ---------- pociąg regionalny RE 7 (czerwono-biały), czoło w x, wagony w stronę +x ----------
const Car: React.FC<{ x: number; front?: boolean; night?: boolean }> = ({ x, front, night }) => {
  const L = 8.4, Y = 1.22;
  const glass = <meshStandardMaterial color={night ? "#ffd690" : "#1a2a3c"} emissive={night ? "#ffb04a" : "#000"} emissiveIntensity={night ? 0.8 : 0} metalness={0.3} roughness={0.12} />;
  return (
    <group position={[x + L / 2, 0, 0]}>
      <RoundedBox args={[L, 1.8, 1.2]} radius={0.14} position={[0, Y, 0]} castShadow receiveShadow><meshStandardMaterial color="#d6222a" roughness={0.38} metalness={0.15} /></RoundedBox>
      <mesh position={[0, 0.58, 0]}><boxGeometry args={[L - 0.1, 0.26, 1.215]} /><meshStandardMaterial color="#eceae4" roughness={0.45} /></mesh>
      <mesh position={[0, 1.88, 0]}><boxGeometry args={[L - 0.2, 0.12, 1.215]} /><meshStandardMaterial color="#f4f4f0" roughness={0.45} /></mesh>
      {[-2.6, -1.3, 0, 1.3, 2.6].map((wx) => <mesh key={wx} position={[wx, 1.45, 0]}><boxGeometry args={[1.05, 0.52, 1.22]} />{glass}</mesh>)}
      {[-3.55, 3.55].map((dx) => <group key={dx}>
        <mesh position={[dx, 1.06, 0]}><boxGeometry args={[0.72, 1.36, 1.225]} /><meshStandardMaterial color="#c9ced4" roughness={0.4} metalness={0.2} /></mesh>
        <mesh position={[dx, 1.3, 0]}><boxGeometry args={[0.5, 0.62, 1.23]} />{glass}</mesh>
        <mesh position={[dx, 1.06, 0]}><boxGeometry args={[0.02, 1.3, 1.232]} /><meshStandardMaterial color="#222" /></mesh>
      </group>)}
      <mesh position={[0, 2.18, 0]}><boxGeometry args={[L - 0.6, 0.12, 0.95]} /><meshStandardMaterial color="#8d939a" metalness={0.4} roughness={0.5} /></mesh>
      <mesh position={[0, 0.27, 0]}><boxGeometry args={[L - 0.4, 0.22, 1.0]} /><meshStandardMaterial color="#26292e" roughness={0.7} /></mesh>
      {[-2.9, 2.9].map((bx) => <group key={bx} position={[bx, 0.24, 0]}>
        <mesh><boxGeometry args={[1.7, 0.2, 0.98]} /><meshStandardMaterial color="#1b1d20" roughness={0.7} /></mesh>
        {[-0.5, 0.5].map((wx) => [-0.46, 0.46].map((wz) => <mesh key={wx + "" + wz} position={[wx, -0.02, wz]} rotation={[PI / 2, 0, 0]}><cylinderGeometry args={[0.19, 0.19, 0.06, 18]} /><meshStandardMaterial color="#3a3d42" metalness={0.6} roughness={0.4} /></mesh>))}
      </group>)}
      <mesh position={[-1.6, 1.84, -0.611]}><planeGeometry args={[1.4, 0.18]} /><meshStandardMaterial map={labelTex("RE 7 Hinterhausen", "#111", "#ffb020", 768, 96, "900 64px Arial, sans-serif")} emissive="#ffb020" emissiveIntensity={0.4} toneMapped={false} /></mesh>
      {front && <group position={[-L / 2, 0, 0]}>
        <RoundedBox args={[0.9, 1.7, 1.18]} radius={0.2} position={[-0.25, 1.15, 0]} castShadow><meshStandardMaterial color="#d6222a" roughness={0.35} metalness={0.15} /></RoundedBox>
        <mesh position={[-0.6, 1.5, 0]} rotation={[0, 0, -0.35]}><boxGeometry args={[0.08, 0.7, 1.0]} /><meshStandardMaterial color="#14202c" metalness={0.4} roughness={0.08} /></mesh>
        <mesh position={[-0.71, 0.55, 0]}><boxGeometry args={[0.06, 0.24, 1.1]} /><meshStandardMaterial color="#eceae4" /></mesh>
        {[-0.4, 0.4].map((z) => <mesh key={z} position={[-0.72, 0.78, z]} rotation={[0, 0, PI / 2]}><cylinderGeometry args={[0.07, 0.07, 0.04, 16]} /><meshStandardMaterial color="#fff7d8" emissive="#fff3c0" emissiveIntensity={3} toneMapped={false} /></mesh>)}
        <mesh position={[-0.55, 1.95, 0]} rotation={[0, -PI / 2, 0]}><planeGeometry args={[0.8, 0.16]} /><meshStandardMaterial map={labelTex("RE 7", "#111", "#ffb020", 256, 64, "900 46px Arial, sans-serif")} emissive="#ffb020" emissiveIntensity={0.5} toneMapped={false} /></mesh>
        <mesh position={[0.9, 2.45, 0]} rotation={[0, 0, 0.5]}><boxGeometry args={[0.9, 0.03, 0.03]} /><meshStandardMaterial color="#333" /></mesh>
        <mesh position={[1.3, 2.62, 0]}><boxGeometry args={[0.05, 0.03, 0.9]} /><meshStandardMaterial color="#333" /></mesh>
      </group>}
    </group>
  );
};
export const Train: React.FC<{ x: number; z?: number; night?: boolean; cars?: number }> = ({ x, z = ST.TZ, night, cars = 2 }) => (
  <group position={[0, 0, z]}>
    {[...Array(cars)].map((_, i) => <Car key={i} x={x + i * 8.65} front={i === 0} night={night} />)}
  </group>
);

// ---------- budka z Dönerem na peronie ----------
export const DoenerStand: React.FC<{ position: V3; rotY?: number; t: number }> = ({ position, rotY = 0, t }) => {
  const stripes = useMemo(() => { const tx = ctex("awnE02", 256, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#ffffff" : "#d6222a"; g.fillRect(i * 32, 0, 32, 64); } }); return tx; }, []);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <RoundedBox args={[2.4, 1.9, 1.3]} radius={0.06} position={[0, 0.95, -0.25]} castShadow receiveShadow><meshStandardMaterial color="#f2c230" roughness={0.55} /></RoundedBox>
      <mesh position={[0, 1.15, 0.41]}><boxGeometry args={[2.1, 0.9, 0.04]} /><meshStandardMaterial color="#2a1a12" roughness={0.6} /></mesh>
      <RoundedBox args={[2.5, 0.12, 0.55]} radius={0.03} position={[0, 0.72, 0.55]} castShadow><meshStandardMaterial color="#c9ced4" metalness={0.5} roughness={0.3} /></RoundedBox>
      <mesh position={[0, 0.36, 0.42]}><boxGeometry args={[2.4, 0.7, 0.05]} /><meshStandardMaterial color="#d6222a" roughness={0.5} /></mesh>
      <mesh position={[0, 2.2, 0.36]} castShadow><boxGeometry args={[2.6, 0.5, 0.12]} /><meshStandardMaterial map={labelTex("DÖNER", "#d6222a", "#ffe23a", 512, 110, "900 86px 'Arial Black', Arial, sans-serif")} emissive="#ffffff" emissiveIntensity={0.08} /></mesh>
      <mesh position={[0, 1.82, 0.7]} rotation={[0.5, 0, 0]} castShadow><boxGeometry args={[2.6, 0.04, 0.8]} /><meshStandardMaterial map={stripes} roughness={0.6} /></mesh>
      <mesh position={[0, 0.36, 0.45]}><planeGeometry args={[1.5, 0.42]} /><meshStandardMaterial map={rowsTex(512, 144, "#fff6e0", [{ t: "Bahnsteig-Döner", c: "#d6222a", px: 52 }, { t: "4,50 €", c: "#111", px: 56 }], "#111")} /></mesh>
      {/* rożen */}
      <group position={[-0.65, 1.2, 0.2]} rotation={[0, t * 2, 0]}>
        <mesh><cylinderGeometry args={[0.12, 0.2, 0.62, 14]} /><meshStandardMaterial color="#8a4a24" roughness={0.7} /></mesh>
        <mesh position={[0, 0.38, 0]}><cylinderGeometry args={[0.015, 0.015, 0.2, 6]} /><meshStandardMaterial color="#ccc" metalness={0.8} /></mesh>
      </group>
      <mesh position={[-0.65, 1.2, 0.0]}><boxGeometry args={[0.36, 0.7, 0.04]} /><meshStandardMaterial color="#ff7a2a" emissive="#ff5a10" emissiveIntensity={1.4} toneMapped={false} /></mesh>
    </group>
  );
};
/** kasa fiskalna z wyświetlaczem */
export const Kasse: React.FC<{ position: V3; rotY?: number; text?: string }> = ({ position, rotY = 0, text = "9.999 €" }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <RoundedBox args={[0.34, 0.16, 0.28]} radius={0.02} castShadow><meshStandardMaterial color="#2a2f36" roughness={0.4} /></RoundedBox>
    <mesh position={[0, 0.16, -0.08]} rotation={[-0.4, 0, 0]}><boxGeometry args={[0.24, 0.14, 0.03]} /><meshStandardMaterial color="#1b1d20" /></mesh>
    <mesh position={[0, 0.165, -0.064]} rotation={[-0.4, 0, 0]}><planeGeometry args={[0.21, 0.1]} /><meshStandardMaterial map={labelTex(text, "#0b2a10", "#5aff6a", 256, 120, "900 64px Arial, sans-serif")} emissive="#5aff6a" emissiveIntensity={0.6} toneMapped={false} /></mesh>
    {[...Array(9)].map((_, i) => <mesh key={i} position={[-0.08 + (i % 3) * 0.08, 0.085, 0.02 + Math.floor(i / 3) * 0.05]}><boxGeometry args={[0.05, 0.02, 0.035]} /><meshStandardMaterial color={i === 8 ? "#3bd16f" : "#e9e7e1"} /></mesh>)}
  </group>
);
/** banknoty fruwające w górę (Umsatz) */
export const Money: React.FC<{ position: V3; t: number; n?: number }> = ({ position, t, n = 10 }) => (
  <group position={position}>
    {[...Array(n)].map((_, i) => { const k = (t * 0.7 + i / n) % 1; return (
      <mesh key={i} position={[Math.sin(i * 2.3) * 0.5, k * 1.4, Math.cos(i * 1.7) * 0.3]} rotation={[t * 3 + i, i, t * 2]}><planeGeometry args={[0.2, 0.1]} /><meshStandardMaterial color="#6fbf5a" side={2} emissive="#3a7a2a" emissiveIntensity={0.3} /></mesh>); })}
  </group>
);

// ---------- sofa (Postbote mieszka na peronie) ----------
export const Sofa: React.FC<{ position: V3; rotY?: number; color?: string }> = ({ position, rotY = 0, color = "#e0763a" }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <RoundedBox args={[1.9, 0.32, 0.8]} radius={0.06} position={[0, 0.2, 0]} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.85} /></RoundedBox>
    {[-0.45, 0.45].map((x) => <RoundedBox key={x} args={[0.86, 0.14, 0.7]} radius={0.06} position={[x, 0.42, 0.04]} castShadow><meshStandardMaterial color={color} roughness={0.9} /></RoundedBox>)}
    <RoundedBox args={[1.9, 0.62, 0.22]} radius={0.08} position={[0, 0.55, -0.32]} castShadow><meshStandardMaterial color={color} roughness={0.85} /></RoundedBox>
    {[-1, 1].map((s) => <RoundedBox key={s} args={[0.2, 0.52, 0.8]} radius={0.07} position={[s * 0.92, 0.36, 0]} castShadow><meshStandardMaterial color={color} roughness={0.85} /></RoundedBox>)}
    <RoundedBox args={[0.36, 0.3, 0.12]} radius={0.05} position={[-0.6, 0.62, -0.16]} rotation={[-0.2, 0.2, 0.1]}><meshStandardMaterial color="#ffd23f" roughness={0.9} /></RoundedBox>
    {[-0.85, 0.85].map((x) => [-0.32, 0.32].map((z) => <mesh key={x + "" + z} position={[x, 0.03, z]}><cylinderGeometry args={[0.03, 0.02, 0.06, 8]} /><meshStandardMaterial color="#3a2a1a" /></mesh>))}
  </group>
);
/** dywan + lampa stojąca + stolik (domek na Gleis 3) */
export const LivingSet: React.FC<{ position: V3; rotY?: number }> = ({ position, rotY = 0 }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <mesh rotation={[-PI / 2, 0, 0]} position={[0, 0.006, 0.35]} receiveShadow><planeGeometry args={[2.6, 1.6]} /><meshStandardMaterial map={rowsTex(256, 160, "#b04b6a", [{ t: "", px: 10 }], "#ffd23f")} roughness={1} /></mesh>
    <group position={[1.35, 0, -0.15]}>
      <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.015, 0.015, 1.4, 8]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh position={[0, 0.01, 0]}><cylinderGeometry args={[0.14, 0.14, 0.02, 16]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh position={[0, 1.45, 0]}><cylinderGeometry args={[0.12, 0.2, 0.22, 18, 1, true]} /><meshStandardMaterial color="#ffe8b0" emissive="#ffcf70" emissiveIntensity={0.9} side={2} /></mesh>
      <pointLight position={[0, 1.35, 0.1]} color="#ffcf80" intensity={1.6} distance={3} />
    </group>
    <group position={[-1.3, 0, 0]}>
      <RoundedBox args={[0.45, 0.04, 0.45]} radius={0.01} position={[0, 0.45, 0]} castShadow><meshStandardMaterial color="#9a6a3e" /></RoundedBox>
      <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.03, 0.03, 0.44, 8]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
    </group>
  </group>
);

// ---------- bilet w D-Mark ----------
export const Ticket: React.FC<{ position: V3; rot?: V3; scale?: number }> = ({ position, rot = [0, 0, 0], scale = 1 }) => {
  const tex = rowsTex(640, 360, "#f3e7c6", [{ t: "FAHRKARTE", c: "#a0231e", px: 64 }, { t: "Hinterhausen  RE7", c: "#222", px: 40, f: "700" }, { t: "4,50 DM", c: "#111", px: 76 }, { t: "gültig: 12.03.1998", c: "#444", px: 36, f: "700" }], "#a0231e");
  return (
    <group position={position} rotation={rot} scale={scale}>
      <mesh castShadow><boxGeometry args={[0.36, 0.2, 0.004]} /><meshStandardMaterial color="#e6d8b0" roughness={0.9} /></mesh>
      {[1, -1].map((s) => <mesh key={s} position={[0, 0, s * 0.0025]} rotation={[0, s > 0 ? 0 : PI, 0]}><planeGeometry args={[0.36, 0.2]} /><meshStandardMaterial map={tex} roughness={0.9} /></mesh>)}
    </group>
  );
};
/** pajęczyna (Oma czeka od 1998) */
export const Cobweb: React.FC<{ position: V3; rotY?: number; s?: number }> = ({ position, rotY = 0, s = 0.35 }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    {[...Array(7)].map((_, i) => <mesh key={i} rotation={[0, 0, -i / 6 * PI / 2]} position={[0, 0, 0]}><mesh position={[0, -s / 2, 0]}><boxGeometry args={[0.004, s, 0.004]} /><meshBasicMaterial color="#f4f4f4" transparent opacity={0.85} /></mesh></mesh>)}
    {[0.3, 0.55, 0.8].map((k) => [...Array(6)].map((_, i) => { const a0 = -PI / 2 - (i / 6) * PI / 2, a1 = -PI / 2 - ((i + 1) / 6) * PI / 2, R = s * k;
      const x0 = Math.cos(a0) * R, y0 = Math.sin(a0) * R, x1 = Math.cos(a1) * R, y1 = Math.sin(a1) * R, L = Math.hypot(x1 - x0, y1 - y0);
      return <mesh key={k + "" + i} position={[(x0 + x1) / 2, (y0 + y1) / 2, 0]} rotation={[0, 0, Math.atan2(y1 - y0, x1 - x0)]}><boxGeometry args={[L, 0.003, 0.003]} /><meshBasicMaterial color="#f4f4f4" transparent opacity={0.8} /></mesh>; }))}
  </group>
);

// ---------- szkoła / biuro burmistrza ----------
export const SchoolBoard: React.FC<{ position: V3; rotY?: number; rows: string[] }> = ({ position, rotY = 0, rows }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <mesh castShadow><boxGeometry args={[2.6, 1.3, 0.06]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
    <mesh position={[0, 0, 0.032]}><planeGeometry args={[2.45, 1.16]} /><meshStandardMaterial map={rowsTex(1024, 480, "#24513a", rows.map((t, i) => ({ t, c: i === rows.length - 1 ? "#ffe23a" : "#f4f4ec", px: 118, f: "900" })))} roughness={0.9} /></mesh>
    <mesh position={[0, -0.68, 0.06]}><boxGeometry args={[2.4, 0.05, 0.1]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
    <mesh position={[0.6, -0.64, 0.07]}><boxGeometry args={[0.12, 0.03, 0.03]} /><meshStandardMaterial color="#fff" /></mesh>
  </group>
);
/** ławka szkolna z zeszytem */
export const Desk: React.FC<{ position: V3; rotY?: number; color?: string }> = ({ position, rotY = 0, color = "#c89a5a" }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <RoundedBox args={[0.9, 0.05, 0.5]} radius={0.015} position={[0, 0.5, 0]} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.7} /></RoundedBox>
    {[-0.4, 0.4].map((x) => [-0.2, 0.2].map((z) => <mesh key={x + "" + z} position={[x, 0.25, z]}><boxGeometry args={[0.04, 0.5, 0.04]} /><meshStandardMaterial color="#3a4048" metalness={0.4} /></mesh>))}
    <mesh position={[0.1, 0.53, 0.02]} rotation={[-PI / 2, 0, 0.2]}><planeGeometry args={[0.3, 0.2]} /><meshStandardMaterial color="#3b74d6" /></mesh>
  </group>
);
export const MayorDesk: React.FC<{ position: V3; rotY?: number; t: number }> = ({ position, rotY = 0, t }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <RoundedBox args={[1.7, 0.08, 0.8]} radius={0.02} position={[0, 0.58, 0]} castShadow receiveShadow><meshStandardMaterial color="#6e4426" roughness={0.5} /></RoundedBox>
    <mesh position={[0, 0.29, 0.34]} castShadow><boxGeometry args={[1.6, 0.58, 0.06]} /><meshStandardMaterial color="#5a361e" roughness={0.6} /></mesh>
    <mesh position={[0, 0.3, 0.375]}><planeGeometry args={[0.9, 0.22]} /><meshStandardMaterial map={labelTex("Bürgermeister", "#d9b45a", "#3a2410", 512, 110, "900 62px Arial, sans-serif")} metalness={0.4} roughness={0.35} /></mesh>
    <mesh position={[0.1, 0.625, 0.1]} rotation={[-PI / 2, 0, 0.12]}><planeGeometry args={[0.42, 0.3]} /><meshStandardMaterial map={rowsTex(420, 300, "#fbfbf6", [{ t: "KRISEN-", c: "#d6222a", px: 70 }, { t: "SITZUNG", c: "#d6222a", px: 70 }, { t: "Thema: Bahn", c: "#222", px: 40, f: "700" }])} /></mesh>
    <group position={[-0.55, 0.62, -0.05]}>
      <RoundedBox args={[0.24, 0.08, 0.16]} radius={0.02} castShadow><meshStandardMaterial color="#d6222a" roughness={0.4} /></RoundedBox>
      <RoundedBox args={[0.26, 0.05, 0.06]} radius={0.02} position={[0, 0.07 + Math.max(0, Math.sin(t * 20)) * 0.02, 0]}><meshStandardMaterial color="#d6222a" roughness={0.4} /></RoundedBox>
    </group>
    <group position={[0.7, 0.62, -0.25]}>
      <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.008, 0.008, 0.5, 6]} /><meshStandardMaterial color="#d9b45a" metalness={0.6} /></mesh>
      {["#111", "#d6222a", "#ffd23f"].map((c, i) => <mesh key={c} position={[0.1, 0.45 - i * 0.04, 0]} rotation={[0, Math.sin(t * 4 + i) * 0.2, 0]}><planeGeometry args={[0.2, 0.04]} /><meshStandardMaterial color={c} side={2} /></mesh>)}
    </group>
    {[-0.75, 0.75].map((x) => <mesh key={x} position={[x, 0.29, -0.1]}><boxGeometry args={[0.08, 0.58, 0.6]} /><meshStandardMaterial color="#5a361e" /></mesh>)}
  </group>
);
/** duży transparent „ENTSCHULDIGUNG” na dwóch tyczkach */
export const SorryBanner: React.FC<{ position: V3; rotY?: number; t: number; text?: string[] }> = ({ position, rotY = 0, t, text = ["Die Bahn sagt:", "ENTSCHULDIGUNG"] }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    {[-1.15, 1.15].map((x) => <mesh key={x} position={[x, 0.9, 0]} castShadow><cylinderGeometry args={[0.025, 0.025, 1.8, 8]} /><meshStandardMaterial color="#9a6a3e" /></mesh>)}
    <mesh position={[0, 1.45, 0.02]} rotation={[0, 0, Math.sin(t * 3) * 0.02]} castShadow>
      <planeGeometry args={[2.3, 0.75]} /><meshStandardMaterial map={rowsTex(1024, 336, "#ffffff", text.map((s, i) => ({ t: s, c: i ? "#d6222a" : "#1f4fa8", px: i ? 120 : 70 })), "#d6222a")} side={2} roughness={0.8} />
    </mesh>
  </group>
);
/** papierowa torba z bułkami (Brötchen) */
export const BroetchenBag: React.FC<{ position: V3; rotY?: number }> = ({ position, rotY = 0 }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <mesh castShadow><boxGeometry args={[0.22, 0.26, 0.14]} /><meshStandardMaterial color="#d9b884" roughness={0.95} /></mesh>
    <mesh position={[0, 0.02, 0.071]}><planeGeometry args={[0.2, 0.08]} /><meshStandardMaterial map={labelTex("BÄCKER", "#d9b884", "#7a3a1a", 256, 96, "900 60px Arial, sans-serif")} /></mesh>
    {[[-0.05, 0.15, 0], [0.05, 0.16, 0.02], [0, 0.18, -0.03]].map((p, i) => <mesh key={i} position={p as V3} scale={[1.2, 0.8, 1]} castShadow><sphereGeometry args={[0.065, 14, 10]} /><meshStandardMaterial color="#c98a3e" roughness={0.6} /></mesh>)}
  </group>
);
/** dziecko (mniejsza postać R6) */
export const Kid: React.FC<{ look: R6Look; t: number; position: V3; rotY?: number; pose?: R6Pose; scale?: number }> = ({ look, t, position, rotY = 0, pose = {}, scale = 0.6 }) =>
  <R6 look={look} t={t} pose={pose} position={position} rotY={rotY} scale={scale} />;
/** serduszka nad parą */
export const Hearts: React.FC<{ position: V3; t: number }> = ({ position, t }) => (
  <group position={position}>
    {[0, 1, 2, 3].map((i) => { const k = (t * 0.6 + i / 4) % 1; return (
      <mesh key={i} position={[Math.sin(i * 2.1 + t) * 0.25, k * 0.8, 0]} scale={0.6 + k * 0.4}><sphereGeometry args={[0.06, 12, 10]} /><meshStandardMaterial color="#ff3b6b" emissive="#ff3b6b" emissiveIntensity={0.8 * (1 - k)} transparent opacity={1 - k} toneMapped={false} /></mesh>); })}
  </group>
);
