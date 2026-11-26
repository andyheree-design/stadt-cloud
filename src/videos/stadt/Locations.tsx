// Biblioteka lokacji w stylu wzoru „Roblox story / In this town”: jasno, pastelowo, niebieskie niebo, miękkie cienie.
// Wszystko własne (żadnych logo/nazw/assetów Roblox). Skala: postać R6 ≈ 1.2 j. wysokości, oczy ≈ 1.05.
// Każda lokacja: komponent C (t = sekundy, animacja tylko z useCurrentFrame przez t), spot (gdzie stoją aktorzy),
// cams (wide/close/top/side) — kamery ustawione tak, by nic (słup, latarnia, drzewo) nie stało między obiektywem a aktorami.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { ctex, rep, skyTex, labelTex } from "./Tex";

export type V3 = [number, number, number];
export type LocCam = { p: V3; l: V3; fov: number; mv?: V3 };
export type Loc = { C: React.FC<{ t: number }>; spot: V3; cams: Record<"wide" | "close" | "top" | "side", LocCam> };

// ---------- tekstury (gładkie, bez szumu — jak we wzorze) ----------
const winTex = (wall: string, frame = "#ffffff", glass = "#8fd3ff") => ctex(`wz-win${wall}${frame}${glass}`, 256, 256, (g) => {
  g.fillStyle = wall; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
    const X = 28 + x * 128, Y = 30 + y * 128;
    g.fillStyle = frame; g.fillRect(X - 6, Y - 6, 84, 84);
    const gr = g.createLinearGradient(X, Y, X + 72, Y + 72); gr.addColorStop(0, "#d9f2ff"); gr.addColorStop(0.5, glass); gr.addColorStop(1, "#5fb0e8");
    g.fillStyle = gr; g.fillRect(X, Y, 72, 72);
    g.fillStyle = frame; g.fillRect(X + 33, Y, 6, 72); g.fillRect(X, Y + 33, 72, 6);
    g.fillStyle = "rgba(0,0,0,0.10)"; g.fillRect(X - 6, Y + 78, 84, 8);
  }
});
const stripeTex = (a: string, b: string, n = 8, vertical = true) => ctex(`wz-str${a}${b}${n}${vertical}`, 256, 256, (g) => {
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; vertical ? g.fillRect((i * 256) / n, 0, 256 / n + 1, 256) : g.fillRect(0, (i * 256) / n, 256, 256 / n + 1); }
});
const tileTex = (c: string, line: string, n = 4) => ctex(`wz-tile${c}${line}${n}`, 256, 256, (g) => {
  g.fillStyle = c; g.fillRect(0, 0, 256, 256); g.fillStyle = line;
  for (let i = 0; i <= n; i++) { g.fillRect((i * 256) / n - 2, 0, 4, 256); g.fillRect(0, (i * 256) / n - 2, 256, 4); }
});
const checkTex = (a: string, b: string, n = 8) => ctex(`wz-chk${a}${b}${n}`, 256, 256, (g) => {
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect((x * 256) / n, (y * 256) / n, 256 / n, 256 / n); }
});
const plankTex = (c: string) => ctex(`wz-plank${c}`, 256, 256, (g) => {
  const col = new THREE.Color(c); g.fillStyle = c; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) { const k = col.clone().offsetHSL(0, 0, (i % 3) * 0.025 - 0.02); g.fillStyle = "#" + k.getHexString(); g.fillRect(0, i * 32 + 2, 256, 28); }
});
const gridTex = (bg: string, line: string) => ctex(`wz-grid${bg}${line}`, 256, 256, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 256, 256); g.strokeStyle = line; g.lineWidth = 6; g.shadowColor = line; g.shadowBlur = 14; g.strokeRect(3, 3, 250, 250);
});
const boardTex = (text: string) => ctex(`wz-board${text}`, 512, 256, (g) => {
  g.fillStyle = "#2f6b4a"; g.fillRect(0, 0, 512, 256); g.fillStyle = "rgba(255,255,255,0.9)"; g.font = "700 56px 'Nunito', Arial, sans-serif";
  g.textAlign = "center"; g.fillText(text, 256, 120); g.fillRect(120, 160, 272, 5); g.font = "600 34px Arial"; g.fillText("2 + 2 = 4", 256, 220);
});
const lavaTex = () => ctex("wz-lava", 256, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, "#ff3a00"); gr.addColorStop(0.5, "#ff8a00"); gr.addColorStop(1, "#ff3a00");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i++) { g.fillStyle = r() < 0.5 ? "#ffd23a" : "#c81e00"; g.beginPath(); g.ellipse(r() * 256, r() * 256, 10 + r() * 26, 6 + r() * 14, r() * 3, 0, 7); g.fill(); }
});
const screenTex = (bg: string, txt: string) => ctex(`wz-scr${bg}${txt}`, 256, 512, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 256, 512); g.fillStyle = "#fff"; g.font = "900 54px Arial"; g.textAlign = "center"; g.fillText(txt, 128, 250);
  for (let i = 0; i < 4; i++) { g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(30, 300 + i * 42, 196, 22); }
});

// ---------- wspólne ----------
const M: React.FC<{ c?: string; map?: THREE.Texture; rough?: number; metal?: number; emissive?: string; ei?: number; side?: THREE.Side; opacity?: number }> =
  ({ c = "#fff", map, rough = 0.75, metal = 0, emissive, ei = 0, side, opacity }) =>
    <meshStandardMaterial color={c} map={map} roughness={rough} metalness={metal} emissive={emissive ?? "#000"} emissiveIntensity={ei} side={side} transparent={opacity !== undefined} opacity={opacity ?? 1} />;
const Box: React.FC<{ p: V3; s: V3; c?: string; map?: THREE.Texture; r?: number; rough?: number; ry?: number; emissive?: string; ei?: number }> =
  ({ p, s, c, map, r = 0, rough, ry = 0, emissive, ei }) => r > 0
    ? <RoundedBox args={s} radius={Math.min(r, Math.min(...s) / 2 - 0.001)} smoothness={3} position={p} rotation={[0, ry, 0]} castShadow receiveShadow><M c={c} map={map} rough={rough} emissive={emissive} ei={ei} /></RoundedBox>
    : <mesh position={p} rotation={[0, ry, 0]} castShadow receiveShadow><boxGeometry args={s} /><M c={c} map={map} rough={rough} emissive={emissive} ei={ei} /></mesh>;
const Cyl: React.FC<{ p: V3; r: number; h: number; c: string; r2?: number; seg?: number; emissive?: string; ei?: number }> = ({ p, r, h, c, r2, seg = 20, emissive, ei }) =>
  <mesh position={p} castShadow receiveShadow><cylinderGeometry args={[r2 ?? r, r, h, seg]} /><M c={c} emissive={emissive} ei={ei} /></mesh>;
const Ball: React.FC<{ p: V3; r: number; c: string; s?: V3 }> = ({ p, r, c, s = [1, 1, 1] }) =>
  <mesh position={p} scale={s} castShadow receiveShadow><sphereGeometry args={[r, 20, 14]} /><M c={c} rough={0.85} /></mesh>;

/** pastelowe niebo jako tło sceny (bez mgły ciemniejącej horyzont) */
export const SkyBg: React.FC<{ top?: string; mid?: string; hor?: string; fog?: [number, number] }> = ({ top = "#3f9cff", mid = "#82c4ff", hor = "#d9f0ff", fog }) => {
  const scene = useThree((s) => s.scene);
  const tex = skyTex(top, mid, hor, 1);
  scene.background = tex;
  scene.fog = fog ? new THREE.Fog(hor, fog[0], fog[1]) : null;
  return null;
};
/** jasne, miękkie światło wzoru: mocna półkula + słońce z miękkim cieniem (PCFSoft daje ThreeCanvas shadows) */
export const BrightLights: React.FC<{ sun?: V3; sunI?: number; hemi?: number; sky?: string; ground?: string; amb?: number; box?: number; target?: V3 }> =
  ({ sun = [14, 26, 12], sunI = 2.4, hemi = 1.6, sky = "#eaf6ff", ground = "#f3e6d6", amb = 0.35, box = 22, target = [0, 0, 0] }) => {
    const tgt = useMemo(() => { const o = new THREE.Object3D(); o.position.set(...target); o.updateMatrixWorld(); return o; }, [target[0], target[1], target[2]]);
    return <>
      <hemisphereLight args={[sky, ground, hemi]} />
      <ambientLight intensity={amb} />
      <primitive object={tgt} />
      <directionalLight position={[sun[0] + target[0], sun[1] + target[1], sun[2] + target[2]]} target={tgt} intensity={sunI} color="#fff8ee" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03} shadow-radius={6}
        shadow-camera-left={-box} shadow-camera-right={box} shadow-camera-top={box} shadow-camera-bottom={-box} shadow-camera-near={1} shadow-camera-far={140} />
    </>;
  };

/** pokój: podłoga + 3 ściany + sufit, płaszczyzny jednostronne skierowane do środka → kamera z przodu/z góry widzi wnętrze przez „zdjętą” ścianę */
export const RoomBox: React.FC<{ w: number; d: number; h: number; wall: THREE.Texture | string; floor: THREE.Texture | string; ceil?: string; wallRep?: [number, number]; floorRep?: [number, number]; children?: React.ReactNode }> =
  ({ w, d, h, wall, floor, ceil = "#ffffff", wallRep = [w / 2, h / 2], floorRep = [w / 2, d / 2], children }) => {
    const wm = typeof wall === "string" ? { c: wall } : { map: rep(wall, wallRep[0], wallRep[1]) };
    const wmS = typeof wall === "string" ? { c: wall } : { map: rep(wall, (d / w) * wallRep[0], wallRep[1]) };
    const fm = typeof floor === "string" ? { c: floor } : { map: rep(floor, floorRep[0], floorRep[1]) };
    const F = THREE.FrontSide;
    return <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[w, d]} /><M {...fm} rough={0.6} side={F} /></mesh>
      <mesh position={[0, h / 2, -d / 2]} receiveShadow><planeGeometry args={[w, h]} /><M {...wm} side={F} /></mesh>
      <mesh position={[-w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow><planeGeometry args={[d, h]} /><M {...wmS} side={F} /></mesh>
      <mesh position={[w / 2, h / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow><planeGeometry args={[d, h]} /><M {...wmS} side={F} /></mesh>
      <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[w, d]} /><M c={ceil} side={F} /></mesh>
      {/* listwa przypodłogowa */}
      <Box p={[0, 0.06, -d / 2 + 0.03]} s={[w, 0.12, 0.06]} c="#ffffff" />
      {children}
    </group>;
  };
const Window: React.FC<{ p: V3; w?: number; h?: number; ry?: number }> = ({ p, w = 1.6, h = 1.2, ry = 0 }) =>
  <group position={p} rotation={[0, ry, 0]}>
    <mesh position={[0, 0, 0.01]}><planeGeometry args={[w, h]} /><M c="#bfe6ff" emissive="#dff3ff" ei={0.9} /></mesh>
    <Box p={[0, h / 2, 0.04]} s={[w + 0.12, 0.08, 0.08]} c="#fff" /><Box p={[0, -h / 2, 0.06]} s={[w + 0.2, 0.08, 0.14]} c="#fff" />
    <Box p={[-w / 2, 0, 0.04]} s={[0.08, h, 0.08]} c="#fff" /><Box p={[w / 2, 0, 0.04]} s={[0.08, h, 0.08]} c="#fff" /><Box p={[0, 0, 0.04]} s={[0.05, h, 0.05]} c="#fff" />
  </group>;

// ---------- 1. ALEJA: pastelowe kamienice, markizy w paski, drzewa, auta, wieżowce na końcu, plac z fontanną i billboardem ----------
const PASTEL = ["#ffd6a5", "#fdffb6", "#caffbf", "#9bf6ff", "#a0c4ff", "#ffc6ff", "#ffadad", "#f6e7c1", "#c8e7ff", "#e4c1f9"];
const AWN = [["#ff5d5d", "#ffffff"], ["#2fa9ff", "#ffffff"], ["#33c27a", "#ffffff"], ["#ffb000", "#ffffff"], ["#b06cff", "#ffffff"]];
const ROAD_W = 7, SIDE = 3; // jezdnia |x|<3.5, chodnik 3.5..6.5, domy od 6.5
const Car: React.FC<{ p: V3; c: string; ry?: number }> = ({ p, c, ry = 0 }) =>
  <group position={p} rotation={[0, ry, 0]}>
    <Box p={[0, 0.42, 0]} s={[1.5, 0.5, 3.0]} c={c} r={0.14} rough={0.35} />
    <Box p={[0, 0.86, -0.15]} s={[1.3, 0.46, 1.6]} c="#dff4ff" r={0.12} rough={0.15} />
    {[[-0.72, 0.95], [0.72, 0.95], [-0.72, -0.95], [0.72, -0.95]].map(([x, z], i) => <mesh key={i} position={[x, 0.24, z]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.24, 0.24, 0.18, 16]} /><M c="#2b2b33" /></mesh>)}
    <Box p={[-0.45, 0.48, 1.51]} s={[0.3, 0.14, 0.03]} c="#fff8c8" emissive="#fff3a0" ei={0.6} /><Box p={[0.45, 0.48, 1.51]} s={[0.3, 0.14, 0.03]} c="#fff8c8" emissive="#fff3a0" ei={0.6} />
  </group>;
const Tree: React.FC<{ p: V3; s?: number; c?: string }> = ({ p, s = 1, c = "#5fcf5a" }) =>
  <group position={p} scale={s}>
    <Cyl p={[0, 0.9, 0]} r={0.14} h={1.8} c="#9a6a3e" />
    <Ball p={[0, 2.25, 0]} r={0.9} c={c} /><Ball p={[0.45, 2.0, 0.2]} r={0.6} c={c} /><Ball p={[-0.4, 2.05, -0.2]} r={0.62} c="#6fdc66" />
  </group>;
const Lamp: React.FC<{ p: V3; side: 1 | -1 }> = ({ p, side }) =>
  <group position={p}>
    <Cyl p={[0, 1.7, 0]} r={0.06} h={3.4} c="#4a5568" /><Box p={[-side * 0.35, 3.38, 0]} s={[0.8, 0.07, 0.07]} c="#4a5568" />
    <Box p={[-side * 0.7, 3.3, 0]} s={[0.32, 0.14, 0.22]} c="#fff6c8" emissive="#fff1a0" ei={0.5} />
  </group>;
const Building: React.FC<{ x: number; z: number; w: number; h: number; d: number; i: number; side: 1 | -1 }> = ({ x, z, w, h, d, i, side }) => {
  const col = PASTEL[i % PASTEL.length], [a1, a2] = AWN[i % AWN.length];
  const wt = useMemo(() => rep(winTex(col), w / 2.4, (h - 1.6) / 2.4), [col, w, h]);
  const at = useMemo(() => rep(stripeTex(a1, a2, 8, true), w / 1.6, 1), [a1, a2, w]);
  const fx = x - side * d / 2; // lico od strony ulicy
  return <group>
    <Box p={[x, h / 2, z]} s={[d, h, w]} c={col} />
    {/* fasada z oknami (od 1.6 w górę), parter — witryna */}
    <mesh position={[fx - side * 0.012, 1.6 + (h - 1.6) / 2, z]} rotation={[0, -side * Math.PI / 2, 0]} receiveShadow><planeGeometry args={[w, h - 1.6]} /><M map={wt} /></mesh>
    <mesh position={[fx - side * 0.015, 0.8, z]} rotation={[0, -side * Math.PI / 2, 0]}><planeGeometry args={[w * 0.8, 1.3]} /><M c="#c8ecff" emissive="#e8f8ff" ei={0.5} rough={0.2} /></mesh>
    {/* markiza w paski */}
    <group position={[fx - side * 0.45, 1.85, z]} rotation={[0, -side * Math.PI / 2, 0]}><mesh rotation={[-1.0, 0, 0]} castShadow><planeGeometry args={[w * 0.9, 1.0]} /><M map={at} side={THREE.DoubleSide} /></mesh></group>
    {/* gzyms */}
    <Box p={[x - side * 0.1, h + 0.12, z]} s={[d + 0.3, 0.24, w + 0.2]} c="#ffffff" />
  </group>;
};
const Tower: React.FC<{ p: V3; w: number; h: number; c: string; i: number }> = ({ p, w, h, c, i }) => {
  const t = useMemo(() => rep(winTex(c, "#e8f4ff", i % 2 ? "#6fc3ff" : "#8adfff"), w / 3, h / 3), [c, w, h, i]);
  return <group position={p}>
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={[w, h, w]} /><M map={t} rough={0.25} metal={0.1} /></mesh>
    <Box p={[0, h + 0.4, 0]} s={[w * 0.7, 0.8, w * 0.7]} c="#e8f4ff" />
  </group>;
};
const Fountain: React.FC<{ p: V3; t: number }> = ({ p, t }) =>
  <group position={p}>
    <Cyl p={[0, 0.3, 0]} r={3} h={0.6} c="#f2efe8" seg={32} /><Cyl p={[0, 0.58, 0]} r={2.7} h={0.06} c="#4fc3ff" seg={32} />
    <Cyl p={[0, 1.2, 0]} r={0.3} h={1.6} c="#f2efe8" /><Cyl p={[0, 2.0, 0]} r={1.1} h={0.25} c="#f2efe8" seg={24} />
    <mesh position={[0, 2.6 + Math.sin(t * 6) * 0.05, 0]}><sphereGeometry args={[0.45, 16, 12]} /><M c="#bfeaff" emissive="#9fe0ff" ei={0.5} opacity={0.75} /></mesh>
  </group>;
export const Billboard: React.FC<{ p: V3; text?: string; bg?: string; fg?: string; w?: number; h?: number; ry?: number }> = ({ p, text = "HEUTE NEU!", bg = "#ff4d8d", fg = "#ffffff", w = 8, h = 4, ry = 0 }) => {
  const t = labelTex(text, bg, fg, 1024, 512, "900 150px 'Nunito', 'Arial Black', Arial, sans-serif");
  return <group position={p} rotation={[0, ry, 0]}>
    <Cyl p={[-w * 0.3, h * 0.6, -0.1]} r={0.15} h={h * 1.2} c="#5a6478" /><Cyl p={[w * 0.3, h * 0.6, -0.1]} r={0.15} h={h * 1.2} c="#5a6478" />
    <Box p={[0, h * 1.2 + h / 2, -0.05]} s={[w + 0.4, h + 0.4, 0.2]} c="#ffffff" />
    <mesh position={[0, h * 1.2 + h / 2, 0.06]}><planeGeometry args={[w, h]} /><M map={t} emissive="#ffffff" ei={0.15} /></mesh>
  </group>;
};
const AVENUE_LEN = 96; // domy z = +10 .. -86, plac -98, wieżowce -115..-150
const Avenue: React.FC<{ t: number }> = ({ t }) => {
  const houses = useMemo(() => {
    const out: { x: number; z: number; w: number; h: number; d: number; i: number; side: 1 | -1 }[] = [];
    let i = 0;
    for (const side of [1, -1] as const) {
      let z = 10;
      while (z > 10 - AVENUE_LEN) { const w = 4 + ((i * 7) % 4), h = 5 + ((i * 5) % 7), d = 6; out.push({ x: side * (ROAD_W / 2 + SIDE + d / 2), z: z - w / 2, w, h, d, i, side }); z -= w + 0.05; i++; }
    }
    return out;
  }, []);
  const asphalt = useMemo(() => rep(tileTex("#7b8496", "#7b8496", 1), 1, 1), []);
  const pave = useMemo(() => rep(tileTex("#f1e6d4", "#ddd0bb", 4), 2, AVENUE_LEN / 2), []);
  return <>
    <SkyBg fog={[90, 260]} />
    <BrightLights target={[0, 0, -30]} box={60} sun={[22, 34, 18]} />
    {/* ziemia, jezdnia, pasy, chodniki z krawężnikiem */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -60]} receiveShadow><planeGeometry args={[220, 260]} /><M c="#8fdc7a" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 10 - AVENUE_LEN / 2]} receiveShadow><planeGeometry args={[ROAD_W, AVENUE_LEN + 8]} /><M map={asphalt} rough={0.9} /></mesh>
    {Array.from({ length: 24 }, (_, k) => <mesh key={k} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 10 - k * 4]}><planeGeometry args={[0.18, 1.8]} /><M c="#ffffff" /></mesh>)}
    {[1, -1].map((s) => <group key={s}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[s * (ROAD_W / 2 + SIDE / 2), 0.14, 10 - AVENUE_LEN / 2]} receiveShadow><planeGeometry args={[SIDE, AVENUE_LEN + 8]} /><M map={pave} /></mesh>
      <Box p={[s * (ROAD_W / 2 + SIDE / 2), 0.07, 10 - AVENUE_LEN / 2]} s={[SIDE, 0.14, AVENUE_LEN + 8]} c="#e4dccd" />
      {/* zebra */}
      {Array.from({ length: 6 }, (_, k) => <mesh key={k} rotation={[-Math.PI / 2, 0, 0]} position={[-2.9 + k * 1.15 + (s > 0 ? 0 : 0), 0.013, s > 0 ? -22 : -58]}><planeGeometry args={[0.6, 2.4]} /><M c="#ffffff" /></mesh>)}
    </group>)}
    {houses.map((h, k) => <Building key={k} {...h} />)}
    {/* drzewa i latarnie TYLKO na chodnikach |x| ≥ 4.6 — kamera jedzie nad osią jezdni */}
    {Array.from({ length: 10 }, (_, k) => <React.Fragment key={k}>
      <Tree p={[5.3, 0.14, 4 - k * 9.5]} s={0.95} /><Tree p={[-5.3, 0.14, -0.5 - k * 9.5]} s={0.95} />
      <Lamp p={[4.6, 0.14, -0.8 - k * 9.5]} side={1} /><Lamp p={[-4.6, 0.14, 3.6 - k * 9.5]} side={-1} />
    </React.Fragment>)}
    <Car p={[1.7, 0, -14]} c="#ff5a5a" /><Car p={[-1.7, 0, -27]} c="#3aa0ff" ry={Math.PI} /><Car p={[1.7, 0, -41]} c="#ffd23a" /><Car p={[-1.7, 0, -52]} c="#ffffff" ry={Math.PI} /><Car p={[1.7, 0, -66]} c="#7a5cff" />
    {/* plac */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -100]} receiveShadow><circleGeometry args={[16, 48]} /><M map={rep(checkTex("#f4ede0", "#e6dccb", 8), 6, 6)} /></mesh>
    <Fountain p={[0, 0, -100]} t={t} />
    <Billboard p={[-9, 0, -104]} ry={0.45} text="IN DER STADT" bg="#2fa9ff" />
    <Tree p={[9, 0, -94]} s={1.3} /><Tree p={[-11, 0, -92]} s={1.2} /><Tree p={[11, 0, -108]} s={1.4} />
    {/* wieżowce ze szkła na końcu alei */}
    {[[-14, -122, 9, 46], [-3, -130, 10, 62], [9, -124, 9, 52], [20, -134, 11, 70], [-24, -136, 10, 38], [2, -150, 12, 80], [30, -118, 8, 30], [-34, -120, 8, 28]].map(([x, z, w, h], k) =>
      <Tower key={k} p={[x, 0, z]} w={w} h={h} i={k} c={["#bfe3ff", "#d3f0ff", "#c9dcff", "#e1f3ff"][k % 4]} />)}
  </>;
};

// ---------- 2. ŁAZIENKA: turkusowe kafle ----------
const Bathroom: React.FC<{ t: number }> = () => <>
  <SkyBg /><BrightLights sun={[3, 10, 12]} sunI={1.6} hemi={1.9} box={8} />
  <RoomBox w={7} d={6} h={3.2} wall={tileTex("#5fd3c8", "#e8fffb", 4)} floor={checkTex("#ffffff", "#bfeee8", 4)} wallRep={[7, 3]} floorRep={[3, 3]}>
    <Box p={[-2.2, 0.35, -2.2]} s={[2.4, 0.7, 1.2]} c="#ffffff" r={0.2} rough={0.2} /><Box p={[-2.2, 0.66, -2.2]} s={[2.1, 0.06, 0.9]} c="#9fe6ff" rough={0.1} />
    <Box p={[1.6, 0.8, -2.75]} s={[1.0, 0.12, 0.5]} c="#ffffff" r={0.05} /><Cyl p={[1.6, 0.4, -2.75]} r={0.12} h={0.8} c="#ffffff" />
    <Box p={[1.6, 1.8, -2.98]} s={[0.9, 1.1, 0.04]} c="#dff6ff" rough={0.05} />
    <Box p={[2.9, 0.4, -2.4]} s={[0.6, 0.8, 0.7]} c="#ffffff" r={0.15} />
    <Box p={[0, 0.01, -0.4]} s={[1.6, 0.02, 1.0]} c="#ff9fc8" r={0.009} />
  </RoomBox>
</>;

// ---------- 3. KLASA: zielona tablica, ławki ----------
const Classroom: React.FC<{ t: number }> = () => <>
  <SkyBg /><BrightLights sun={[-6, 10, 10]} sunI={1.8} hemi={1.8} box={10} />
  <RoomBox w={10} d={8} h={3.4} wall="#fff1c9" floor={plankTex("#d8a66a")} floorRep={[4, 4]}>
    <Box p={[0, 1.75, -3.96]} s={[4.6, 1.7, 0.06]} c="#ffffff" />
    <mesh position={[0, 1.75, -3.92]}><planeGeometry args={[4.4, 1.5]} /><M map={boardTex("DEUTSCH")} rough={0.9} /></mesh>
    <Window p={[-4.98, 1.8, -1.5]} ry={Math.PI / 2} /><Window p={[-4.98, 1.8, 1.6]} ry={Math.PI / 2} />
    <Box p={[3.4, 0.45, -3.4]} s={[1.6, 0.9, 0.8]} c="#a86a3a" r={0.04} />
    {[-2.6, 0, 2.6].map((x) => [-0.8, 1.4].map((z) => <group key={`${x}${z}`}>
      <Box p={[x, 0.7, z]} s={[1.4, 0.08, 0.7]} c="#f2c27a" r={0.03} /><Box p={[x, 0.35, z]} s={[1.2, 0.7, 0.06]} c="#7b8aa8" />
      <Box p={[x, 0.42, z + 0.7]} s={[0.6, 0.06, 0.5]} c="#4f8cff" r={0.02} /><Box p={[x, 0.72, z + 0.93]} s={[0.6, 0.6, 0.05]} c="#4f8cff" r={0.02} />
    </group>))}
    <Ball p={[4.3, 2.6, -3.9]} r={0.3} c="#ffffff" s={[1, 1, 0.15]} />
  </RoomBox>
</>;

// ---------- 4. POKÓJ BABCI: tapeta w paski, fotel, dywan ----------
const OmaRoom: React.FC<{ t: number }> = () => <>
  <SkyBg /><BrightLights sun={[5, 10, 10]} sunI={1.5} hemi={1.8} box={8} ground="#f6dccc" />
  <RoomBox w={8} d={6} h={3.2} wall={stripeTex("#ffd9e6", "#fff4f8", 10, true)} floor={plankTex("#c98d5a")} wallRep={[4, 1]} floorRep={[3, 3]}>
    <Cyl p={[0, 0.01, -0.3]} r={1.8} h={0.02} c="#ff8fb2" seg={40} />
    <Box p={[-2.4, 0.4, -2.0]} s={[1.3, 0.8, 1.1]} c="#b06cff" r={0.2} /><Box p={[-2.4, 1.0, -2.5]} s={[1.3, 1.0, 0.3]} c="#b06cff" r={0.15} />
    <Box p={[2.6, 0.5, -2.6]} s={[1.4, 1.0, 0.6]} c="#a8703e" r={0.05} />
    <Cyl p={[2.4, 1.2, -2.6]} r={0.06} h={0.4} c="#d4af37" /><Cyl p={[2.4, 1.55, -2.6]} r={0.18} r2={0.3} h={0.4} c="#fff1c2" emissive="#ffe9a0" ei={0.4} />
    {[[-1, 2.1], [0.4, 2.3], [1.6, 1.9]].map(([x, y], i) => <Box key={i} p={[x, y, -2.98]} s={[0.7, 0.55, 0.04]} c={["#ffd23a", "#7fd3ff", "#9be38a"][i]} />)}
    <Window p={[3.98, 1.8, 0.5]} ry={-Math.PI / 2} />
  </RoomBox>
</>;

// ---------- 5. HALA NEONOWA: siatka świecących linii ----------
const NeonHall: React.FC<{ t: number }> = ({ t }) => {
  const g = useMemo(() => rep(gridTex("#4a2fa8", "#39f3ff"), 10, 10), []);
  const gw = useMemo(() => rep(gridTex("#3a2490", "#ff4fd8"), 12, 3), []);
  return <>
    <SkyBg top="#6a4cff" mid="#9b7bff" hor="#e6dcff" /><BrightLights sun={[0, 14, 10]} sunI={1.4} hemi={1.4} sky="#efe8ff" ground="#c6b4ff" box={14} />
    <RoomBox w={20} d={20} h={8} wall={gw} floor={g} wallRep={[12, 4]} floorRep={[10, 10]} ceil="#2a1a70" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><planeGeometry args={[20, 20]} /><M map={g} emissive="#5fe8ff" ei={0.25 + 0.05 * Math.sin(t * 4)} opacity={0.25} /></mesh>
    {[-6, 0, 6].map((x) => <Box key={x} p={[x, 0.5, -6]} s={[2, 1, 2]} c="#ff4fd8" emissive="#ff4fd8" ei={0.35} r={0.1} />)}
  </>;
};

// ---------- 6. AKADEMIA: szklana fasada, schody, plac ----------
const Academy: React.FC<{ t: number }> = () => {
  const glass = useMemo(() => rep(winTex("#e9f4ff", "#ffffff", "#7cc8ff"), 8, 4), []);
  return <>
    <SkyBg fog={[60, 200]} /><BrightLights sun={[16, 30, 22]} box={30} target={[0, 0, -8]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]} receiveShadow><planeGeometry args={[120, 120]} /><M c="#9be38a" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -6]} receiveShadow><planeGeometry args={[22, 18]} /><M map={rep(tileTex("#f4ede0", "#e0d5c2", 4), 6, 5)} /></mesh>
    <mesh position={[0, 6, -16]} castShadow receiveShadow><boxGeometry args={[24, 12, 6]} /><M c="#ffffff" /></mesh>
    <mesh position={[0, 6, -12.98]}><planeGeometry args={[22, 10]} /><M map={glass} rough={0.2} /></mesh>
    <Box p={[0, 12.4, -15.6]} s={[25, 0.8, 7]} c="#2f6fe0" />
    <mesh position={[0, 10.4, -12.9]}><planeGeometry args={[9, 1.6]} /><M map={labelTex("AKADEMIE", "#2f6fe0", "#ffffff", 1024, 192, "900 130px 'Nunito', Arial, sans-serif")} /></mesh>
    {[0, 1, 2].map((k) => <Box key={k} p={[0, 0.15 + k * 0.3, -12.2 + k * -0.0 + (2 - k) * 0.6]} s={[10 - k, 0.3, 1.2]} c="#f2efe8" />)}
    <Tree p={[-8, 0, -9]} s={1.3} /><Tree p={[8, 0, -9]} s={1.3} /><Tree p={[-11, 0, -3]} s={1.1} /><Tree p={[11, 0, -3]} s={1.1} />
  </>;
};

// ---------- 7. KUCHNIA: stół śniadaniowy z obrusem w czerwono-białe pasy ----------
const Kitchen: React.FC<{ t: number }> = () => <>
  <SkyBg /><BrightLights sun={[4, 10, 10]} sunI={1.7} hemi={1.8} box={8} />
  <RoomBox w={8} d={6} h={3.2} wall="#fff6d6" floor={checkTex("#ffffff", "#ffd6d6", 6)} floorRep={[2, 2]}>
    {/* blat i szafki */}
    <Box p={[0, 0.45, -2.65]} s={[7.6, 0.9, 0.7]} c="#7fd3c8" r={0.04} /><Box p={[0, 0.93, -2.65]} s={[7.7, 0.08, 0.75]} c="#ffffff" />
    <Box p={[0, 2.2, -2.82]} s={[7.6, 0.9, 0.35]} c="#7fd3c8" r={0.04} />
    <Box p={[3.2, 1.0, -2.4]} s={[1.0, 2.0, 0.9]} c="#f4f7ff" r={0.1} />
    <Window p={[-1.6, 1.75, -2.99]} w={1.6} h={0.7} />
    {/* stół */}
    <Box p={[0, 0.74, 0]} s={[2.4, 0.06, 1.4]} map={rep(checkTex("#e8322a", "#ffffff", 8), 2, 1)} />
    {[[-1.05, -0.55], [1.05, -0.55], [-1.05, 0.55], [1.05, 0.55]].map(([x, z], i) => <Box key={i} p={[x, 0.36, z]} s={[0.08, 0.72, 0.08]} c="#a86a3a" />)}
    {[-0.7, 0, 0.7].map((x) => <group key={x}><Cyl p={[x, 0.78, -0.2]} r={0.2} h={0.02} c="#ffffff" /><Ball p={[x, 0.82, -0.2]} r={0.07} c="#ffd23a" s={[1, 0.5, 1]} /></group>)}
    <Cyl p={[0.2, 0.86, 0.35]} r={0.07} h={0.18} c="#ffffff" /><Box p={[-0.4, 0.88, 0.35]} s={[0.16, 0.22, 0.1]} c="#ff9a3a" />
  </RoomBox>
</>;

// ---------- 8. POKÓJ GRACZA (fioletowy) ----------
const Bedroom: React.FC<{ t: number }> = ({ t }) => <>
  <SkyBg /><BrightLights sun={[4, 10, 10]} sunI={1.5} hemi={1.7} sky="#f1e8ff" ground="#e0d0ff" box={8} />
  <RoomBox w={8} d={6} h={3.2} wall="#b99cff" floor={plankTex("#e3c9a0")} floorRep={[3, 3]}>
    <Box p={[-2.4, 0.3, -1.6]} s={[2.2, 0.6, 2.8]} c="#ffffff" r={0.1} /><Box p={[-2.4, 0.62, -1.3]} s={[2.1, 0.12, 2.1]} c="#4f8cff" r={0.05} />
    <Box p={[-2.4, 0.72, -2.7]} s={[1.0, 0.25, 0.5]} c="#ffffff" r={0.1} />
    <Box p={[1.9, 0.75, -2.5]} s={[2.4, 0.08, 0.9]} c="#2b2b3a" /><Box p={[1.9, 0.37, -2.5]} s={[2.2, 0.74, 0.06]} c="#2b2b3a" />
    <Box p={[1.9, 1.35, -2.75]} s={[1.6, 0.9, 0.06]} c="#111" />
    <mesh position={[1.9, 1.35, -2.71]}><planeGeometry args={[1.5, 0.8]} /><M c="#3affb0" emissive={new THREE.Color().setHSL((t * 0.2) % 1, 0.9, 0.55).getStyle()} ei={0.8} /></mesh>
    <Box p={[1.9, 0.5, -1.6]} s={[0.7, 0.1, 0.7]} c="#ff3a6a" r={0.05} /><Box p={[1.9, 0.95, -1.9]} s={[0.7, 0.9, 0.12]} c="#ff3a6a" r={0.05} />
    <Box p={[0, 3.1, -2.98]} s={[7.6, 0.06, 0.04]} c="#ff4fd8" emissive="#ff4fd8" ei={1} />
  </RoomBox>
</>;

// ---------- 9. SALON WYSTAWOWY (biały) ----------
const Showroom: React.FC<{ t: number }> = () => <>
  <SkyBg /><BrightLights sun={[6, 14, 12]} sunI={1.6} hemi={2.0} box={12} />
  <RoomBox w={16} d={12} h={5} wall="#ffffff" floor="#f4f6fa" ceil="#ffffff">
    {[-4.5, 0, 4.5].map((x) => <Cyl key={x} p={[x, 0.25, -3]} r={1.4} h={0.5} c="#e9edf5" seg={32} />)}
    <Window p={[-7.98, 2.5, 0]} w={5} h={3} ry={Math.PI / 2} /><Window p={[7.98, 2.5, 0]} w={5} h={3} ry={-Math.PI / 2} />
  </RoomBox>
</>;

// ---------- rekwizyty dosłownie ilustrujące narrację ----------
/** podłoga z lawy (płynie: przesunięcie tekstury z t) */
export const LavaFloor: React.FC<{ t: number; w?: number; d?: number; p?: V3 }> = ({ t, w = 20, d = 20, p = [0, 0.03, 0] }) => {
  const tx = useMemo(() => rep(lavaTex(), w / 4, d / 4), [w, d]);
  tx.offset.set(t * 0.05, t * 0.12);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={p}><planeGeometry args={[w, d]} /><M map={tx} emissive="#ff5a00" ei={0.7} rough={0.4} /></mesh>;
};
/** olbrzym (fioletowy, blokowy, własny projekt); s = skala (1 ≈ 6 j. wysokości) */
export const Giant: React.FC<{ p: V3; t: number; s?: number; ry?: number; c?: string }> = ({ p, t, s = 1, ry = 0, c = "#8a4fff" }) => {
  const sw = Math.sin(t * 2.2) * 0.25;
  return <group position={p} rotation={[0, ry, 0]} scale={s}>
    <Box p={[-0.5, 1.1, 0]} s={[0.8, 2.2, 0.8]} c="#5a2fb0" r={0.1} /><Box p={[0.5, 1.1, 0]} s={[0.8, 2.2, 0.8]} c="#5a2fb0" r={0.1} />
    <Box p={[0, 3.2, 0]} s={[2.2, 2.0, 1.2]} c={c} r={0.15} />
    <group position={[-1.5, 4.0, 0]} rotation={[sw, 0, 0.15]}><Box p={[0, -1.0, 0]} s={[0.7, 2.2, 0.7]} c={c} r={0.1} /></group>
    <group position={[1.5, 4.0, 0]} rotation={[-sw, 0, -0.15]}><Box p={[0, -1.0, 0]} s={[0.7, 2.2, 0.7]} c={c} r={0.1} /></group>
    <Box p={[0, 5.0, 0]} s={[1.5, 1.4, 1.3]} c={c} r={0.2} />
    <Box p={[-0.35, 5.15, 0.66]} s={[0.36, 0.36, 0.04]} c="#ffffff" /><Box p={[0.35, 5.15, 0.66]} s={[0.36, 0.36, 0.04]} c="#ffffff" />
    <Box p={[-0.35, 5.12, 0.69]} s={[0.16, 0.2, 0.02]} c="#111" /><Box p={[0.35, 5.12, 0.69]} s={[0.16, 0.2, 0.02]} c="#111" />
    <Box p={[0, 4.68, 0.66]} s={[0.8, 0.18, 0.04]} c="#2a0f55" />
    {[-0.3, 0, 0.3].map((x) => <Box key={x} p={[x, 4.62, 0.69]} s={[0.12, 0.1, 0.03]} c="#ffffff" />)}
  </group>;
};
/** mamut (brązowy, blokowy, kły + trąba) */
export const Mammoth: React.FC<{ p: V3; t: number; s?: number; ry?: number }> = ({ p, t, s = 1, ry = 0 }) => {
  const b = "#8a5a3a", d = "#6e452b", tr = Math.sin(t * 2.5) * 0.15;
  return <group position={p} rotation={[0, ry, 0]} scale={s}>
    {[[-0.7, 0.8], [0.7, 0.8], [-0.7, -0.8], [0.7, -0.8]].map(([x, z], i) => <Box key={i} p={[x, 0.75, z]} s={[0.6, 1.5, 0.6]} c={d} r={0.12} />)}
    <Box p={[0, 2.0, 0]} s={[2.0, 1.6, 2.8]} c={b} r={0.4} />
    <Box p={[0, 2.5, 1.7]} s={[1.5, 1.4, 1.1]} c={b} r={0.3} />
    <Box p={[-0.95, 2.4, 1.5]} s={[0.25, 1.1, 0.9]} c={d} r={0.1} /><Box p={[0.95, 2.4, 1.5]} s={[0.25, 1.1, 0.9]} c={d} r={0.1} />
    <Box p={[-0.35, 2.75, 2.26]} s={[0.18, 0.18, 0.04]} c="#111" /><Box p={[0.35, 2.75, 2.26]} s={[0.18, 0.18, 0.04]} c="#111" />
    <group position={[0, 2.1, 2.25]} rotation={[0.3 + tr, 0, 0]}><Box p={[0, -0.6, 0.1]} s={[0.35, 1.3, 0.35]} c={b} r={0.12} /></group>
    {[-0.45, 0.45].map((x) => <mesh key={x} position={[x, 1.9, 2.4]} rotation={[1.1, 0, x > 0 ? -0.25 : 0.25]} castShadow><cylinderGeometry args={[0.03, 0.11, 1.4, 10]} /><M c="#fff8e6" /></mesh>)}
  </group>;
};
/** telefon w dłoni / na zbliżeniu — ekran z napisem */
export const Phone: React.FC<{ p: V3; text?: string; bg?: string; s?: number; rx?: number; ry?: number }> = ({ p, text = "LIKE", bg = "#ff3a6a", s = 1, rx = 0, ry = 0 }) =>
  <group position={p} rotation={[rx, ry, 0]} scale={s}>
    <RoundedBox args={[0.5, 1.0, 0.06]} radius={0.06} smoothness={3} castShadow><M c="#1d1d24" rough={0.3} /></RoundedBox>
    <mesh position={[0, 0, 0.032]}><planeGeometry args={[0.44, 0.92]} /><M map={screenTex(bg, text)} emissive="#ffffff" ei={0.35} /></mesh>
  </group>;

// ---------- rejestr ----------
const room = (w: number, d: number, spot: V3 = [0, 0, -0.6]): Loc["cams"] => ({
  wide: { p: [0, 1.9, d / 2 + 2.4], l: [spot[0], 1.0, spot[2]], fov: 50 },
  close: { p: [spot[0] + 0.5, 1.15, spot[2] + 2.0], l: [spot[0], 0.95, spot[2]], fov: 34 },
  top: { p: [spot[0] + 0.01, Math.max(w, d) * 0.95, spot[2] + 0.6], l: [spot[0], 0, spot[2]], fov: 50 },
  side: { p: [w / 2 - 0.5, 1.3, spot[2] + 0.2], l: [spot[0] - 1, 0.95, spot[2]], fov: 52 },
});
export const LOCATIONS: Record<string, Loc> = {
  avenue: { C: Avenue, spot: [0, 0, -8], cams: {
    wide: { p: [0, 38, 26], l: [0, 4, -80], fov: 50, mv: [0, -29, -20] },   // przelot nad osią jezdni, z góry w dół
    close: { p: [0.4, 1.2, -4.8], l: [0, 1.0, -8], fov: 36 },
    top: { p: [0.01, 16, -7], l: [0, 0, -8], fov: 45 },
    side: { p: [3.0, 1.3, -8.5], l: [-1, 1.0, -8], fov: 48 } } },          // x=3.0 < 4.6 (latarnie) → nic nie zasłania
  bathroom: { C: Bathroom, spot: [0, 0, -0.6], cams: room(7, 6) },
  classroom: { C: Classroom, spot: [0, 0, -2.2], cams: room(10, 8, [0, 0, -2.2]) },
  omaRoom: { C: OmaRoom, spot: [0, 0, -0.6], cams: room(8, 6) },
  neonHall: { C: NeonHall, spot: [0, 0, 0], cams: room(20, 20, [0, 0, 0]) },
  academy: { C: Academy, spot: [0, 0, -9], cams: {
    wide: { p: [0, 3.5, 6], l: [0, 5, -14], fov: 55 }, close: { p: [0.5, 1.15, -6.8], l: [0, 1.0, -9], fov: 36 },
    top: { p: [0.01, 22, -5], l: [0, 0, -9], fov: 50 }, side: { p: [4, 1.3, -9], l: [-1, 1.1, -9], fov: 50 } } },
  kitchen: { C: Kitchen, spot: [0, 0, 0.9], cams: room(8, 6, [0, 0, 0.9]) },
  bedroom: { C: Bedroom, spot: [0, 0, -0.4], cams: room(8, 6, [0, 0, -0.4]) },
  showroom: { C: Showroom, spot: [0, 0, -1], cams: room(16, 12, [0, 0, -1]) },
};
