// E03 „Six Seven” — rekwizyty: cela z kratami, tort Omy „66+1”, cennik Dönera (6,70 € skreślone → 9 €), drzwi nr 67 z taśmą,
// megafon, paczka. Nakładki HTML: zakaz „67” (hook), transmisja LIVE (TV), pole komentarza + pieczątka „VERHAFTET”.
import React from "react";
import { RoundedBox } from "@react-three/drei";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { rowsTex } from "./PropsE02";
import { labelTex } from "./Tex";

type V3 = [number, number, number];
const PI = Math.PI;
const F = "Fredoka, sans-serif";

/** cela: podłoga y=0, przód (kraty) w z=0, wnętrze w z∈[-3,0], szer. 3 m; własne światło sufitowe */
export const Cell: React.FC<{ position: V3; t: number; door?: number; days?: number }> = ({ position, t, door = 0, days = 21 }) => {
  const wall = "#9a9ca3", bars = "#2b2e33";
  return <group position={position}>
    <mesh position={[0, 0.05, -1.5]} receiveShadow><boxGeometry args={[3.2, 0.1, 3.2]} /><meshStandardMaterial color="#6d6f73" roughness={1} /></mesh>
    <mesh position={[0, 1.45, -3.05]} receiveShadow><boxGeometry args={[3.2, 2.9, 0.12]} /><meshStandardMaterial color={wall} roughness={0.95} /></mesh>
    {[-1, 1].map((s) => <mesh key={s} position={[s * 1.6, 1.45, -1.5]} receiveShadow><boxGeometry args={[0.12, 2.9, 3.2]} /><meshStandardMaterial color={wall} roughness={0.95} /></mesh>)}
    <mesh position={[0, 2.92, -1.5]}><boxGeometry args={[3.3, 0.08, 3.3]} /><meshStandardMaterial color="#7d7f85" /></mesh>
    {/* okienko z kratą + kreski dni na ścianie */}
    <mesh position={[0.75, 2.1, -2.98]}><planeGeometry args={[0.7, 0.45]} /><meshBasicMaterial color="#bfe3ff" toneMapped={false} /></mesh>
    {[-0.2, 0, 0.2].map((x) => <mesh key={x} position={[0.75 + x, 2.1, -2.96]}><boxGeometry args={[0.03, 0.47, 0.03]} /><meshStandardMaterial color={bars} metalness={0.6} /></mesh>)}
    <mesh position={[-0.75, 1.75, -2.98]}><planeGeometry args={[1.1, 0.55]} /><meshStandardMaterial transparent map={rowsTex(560, 280, "rgba(0,0,0,0)", [{ t: "IIII IIII IIII IIII I".slice(0, Math.min(24, Math.max(1, days))), c: "#2a2a2a", px: 90 }, { t: `Tag ${days}`, c: "#2a2a2a", px: 60, f: "700" }])} /></mesh>
    {/* prycza */}
    <RoundedBox args={[1.5, 0.12, 0.6]} radius={0.03} position={[-0.6, 0.45, -2.6]} castShadow receiveShadow><meshStandardMaterial color="#8a6a46" /></RoundedBox>
    <mesh position={[-0.6, 0.53, -2.6]}><boxGeometry args={[1.4, 0.06, 0.55]} /><meshStandardMaterial color="#e8e8e0" /></mesh>
    {/* kraty (drzwi przesuwne w prawo o door*1.2) */}
    {[...Array(14)].map((_, i) => { const x = -1.5 + i * 0.23 + (i >= 4 && i <= 9 ? door * 1.2 : 0); return <mesh key={i} position={[x, 1.45, 0]} castShadow><cylinderGeometry args={[0.022, 0.022, 2.9, 8]} /><meshStandardMaterial color={bars} metalness={0.7} roughness={0.35} /></mesh>; })}
    {[0.25, 1.3, 2.75].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[3.2, 0.05, 0.05]} /><meshStandardMaterial color={bars} metalness={0.7} roughness={0.35} /></mesh>)}
    <mesh position={[0, 2.6, 0.04]}><planeGeometry args={[0.8, 0.22]} /><meshStandardMaterial map={labelTex("ZELLE 67", "#ffd23f", "#1a1a1a", 512, 140, "900 84px Arial, sans-serif")} /></mesh>
    <pointLight position={[0, 2.6, -1.2]} color="#fff2d6" intensity={9} distance={6} decay={1.6} castShadow />
    <mesh position={[0, 2.86, -1.2]}><cylinderGeometry args={[0.18, 0.22, 0.06, 16]} /><meshBasicMaterial color="#fff6dc" toneMapped={false} /></mesh>
    <pointLight position={[0, 1.4, 1.6]} color="#cfe0ff" intensity={4 + Math.sin(t * 2) * 0.2} distance={5} decay={1.5} />
  </group>;
};

/** tort urodzinowy z topperem „66+1” i świeczkami */
export const Cake: React.FC<{ position: V3; t: number; rotY?: number; text?: string }> = ({ position, t, rotY = 0, text = "66+1" }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <mesh position={[0, 0.35, 0]} castShadow><cylinderGeometry args={[0.32, 0.32, 0.7, 20]} /><meshStandardMaterial color="#e8e2d8" /></mesh>
    <mesh position={[0, 0.72, 0]}><cylinderGeometry args={[0.45, 0.45, 0.04, 24]} /><meshStandardMaterial color="#f4f4f4" /></mesh>
    <mesh position={[0, 0.86, 0]} castShadow><cylinderGeometry args={[0.36, 0.36, 0.24, 28]} /><meshStandardMaterial color="#ff8fc0" roughness={0.6} /></mesh>
    <mesh position={[0, 0.99, 0]}><cylinderGeometry args={[0.37, 0.37, 0.04, 28]} /><meshStandardMaterial color="#fff" /></mesh>
    {[...Array(7)].map((_, i) => { const a = (i / 7) * PI * 2; return <group key={i} position={[Math.cos(a) * 0.25, 1.06, Math.sin(a) * 0.25]}>
      <mesh><cylinderGeometry args={[0.012, 0.012, 0.12, 6]} /><meshStandardMaterial color={["#3b74d6", "#ffd23f", "#3cba54"][i % 3]} /></mesh>
      <mesh position={[0, 0.09 + Math.sin(t * 17 + i) * 0.006, 0]} scale={[1, 1.5 + Math.sin(t * 23 + i * 2) * 0.2, 1]}><sphereGeometry args={[0.018, 8, 8]} /><meshBasicMaterial color="#ffb42a" toneMapped={false} /></mesh>
    </group>; })}
    <mesh position={[0, 1.22, 0.05]}><cylinderGeometry args={[0.006, 0.006, 0.3, 6]} /><meshStandardMaterial color="#d9b45a" /></mesh>
    <mesh position={[0, 1.36, 0.06]}><planeGeometry args={[0.5, 0.22]} /><meshStandardMaterial side={2} map={labelTex(text, "#d6222a", "#fff", 512, 220, "900 160px Arial, sans-serif")} /></mesh>
    <pointLight position={[0, 1.2, 0.4]} color="#ffb067" intensity={1.6} distance={1.6} decay={1.5} />
  </group>
);

/** stojak-tablica z cennikiem: stara cena skreślona (czerwona kreska rośnie z k) */
export const PriceSign: React.FC<{ position: V3; rotY?: number; k?: number }> = ({ position, rotY = 0, k = 1 }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    {[-1, 1].map((s) => <mesh key={s} position={[s * 0.42, 0.6, -0.08]} rotation={[-0.12, 0, 0]}><boxGeometry args={[0.05, 1.25, 0.05]} /><meshStandardMaterial color="#6b4a2b" /></mesh>)}
    <mesh position={[0, 0.78, 0]} rotation={[-0.12, 0, 0]} castShadow><boxGeometry args={[0.95, 1.1, 0.04]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
    <group position={[0, 0.78, 0.025]} rotation={[-0.12, 0, 0]}>
      <mesh><planeGeometry args={[0.86, 1.0]} /><meshStandardMaterial roughness={0.9} map={rowsTex(512, 600, "#1f2a24", [{ t: "DÖNER", c: "#ffe23a", px: 120 }, { t: "6,70 €", c: "#f4f4ec", px: 128 }, { t: "9,00 €", c: "#5aff6a", px: 150 }], "#ffe23a")} /></mesh>
      <mesh position={[0, 0.02, 0.006]} rotation={[0, 0, 0.12]} scale={[Math.max(0.001, k), 1, 1]}><planeGeometry args={[0.78, 0.06]} /><meshBasicMaterial color="#ff2a2a" toneMapped={false} /></mesh>
    </group>
  </group>
);

/** fasada z drzwiami nr 67, zaklejona taśmą „GESPERRT” */
export const Door67: React.FC<{ position: V3; rotY?: number; t: number }> = ({ position, rotY = 0, t }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <mesh position={[0, 1.4, -0.05]} receiveShadow><boxGeometry args={[2.4, 2.8, 0.1]} /><meshStandardMaterial color="#d9c7a3" roughness={0.95} /></mesh>
    <mesh position={[0, 1.05, 0.01]}><boxGeometry args={[0.95, 2.1, 0.04]} /><meshStandardMaterial color="#5a3a22" roughness={0.6} /></mesh>
    <mesh position={[0.33, 1.0, 0.045]}><sphereGeometry args={[0.035, 10, 10]} /><meshStandardMaterial color="#d9b45a" metalness={0.8} roughness={0.3} /></mesh>
    <mesh position={[0, 2.35, 0.02]}><planeGeometry args={[0.55, 0.42]} /><meshStandardMaterial map={labelTex("67", "#1f4fa8", "#fff", 256, 196, "900 150px Arial, sans-serif")} /></mesh>
    {[0.55, -0.55].map((r, i) => <mesh key={i} position={[0, 1.15, 0.07 + i * 0.01]} rotation={[0, 0, r + Math.sin(t * 2 + i) * 0.01]}><planeGeometry args={[2.0, 0.16]} />
      <meshStandardMaterial side={2} map={labelTex("GESPERRT  GESPERRT", "#d6222a", "#fff", 1024, 82, "900 62px Arial, sans-serif")} /></mesh>)}
    <mesh position={[-0.75, 0.2, 0.3]} rotation={[0, 0.3, 0]} castShadow><boxGeometry args={[0.35, 0.3, 0.3]} /><meshStandardMaterial color="#b88a52" /></mesh>
  </group>
);

/** paczka (do ręki postaci) */
export const Parcel: React.FC<{ position: V3; rotY?: number }> = ({ position, rotY = 0 }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <mesh castShadow><boxGeometry args={[0.36, 0.26, 0.3]} /><meshStandardMaterial color="#b88a52" roughness={0.9} /></mesh>
    <mesh position={[0, 0, 0.151]}><planeGeometry args={[0.36, 0.05]} /><meshStandardMaterial color="#d9c08a" /></mesh>
    <mesh position={[0.06, 0.04, 0.152]}><planeGeometry args={[0.16, 0.1]} /><meshStandardMaterial map={labelTex("Nr. 67", "#222", "#fff", 256, 160, "900 90px Arial, sans-serif")} /></mesh>
  </group>
);

/** megafon (stożek) — ustawiany przy ustach policjanta */
export const Megaphone: React.FC<{ position: V3; rot?: V3 }> = ({ position, rot = [0, 0, 0] }) => (
  <group position={position} rotation={rot}>
    <mesh rotation={[PI / 2, 0, 0]}><cylinderGeometry args={[0.16, 0.05, 0.38, 18, 1, true]} /><meshStandardMaterial color="#f2f2f2" side={2} /></mesh>
    <mesh position={[0, 0, 0.19]} rotation={[PI / 2, 0, 0]}><torusGeometry args={[0.16, 0.015, 8, 24]} /><meshStandardMaterial color="#d6222a" /></mesh>
    <mesh position={[0, -0.1, -0.05]}><boxGeometry args={[0.05, 0.16, 0.06]} /><meshStandardMaterial color="#222" /></mesh>
  </group>
);

// ----------------------------- nakładki HTML -----------------------------
const pop = (f: number, fps: number) => spring({ frame: f, fps, config: { damping: 9, stiffness: 220 } });

/** hook: duży znak zakazu „67” (klatka 0 → widoczny od razu, potem lekko pulsuje) */
export const Ban67: React.FC<{ at: number; top?: number; size?: number }> = ({ at, top = 110, size = 240 }) => { // prawy górny róg: na środku zasłaniał twarz Kevina (v2)
  const f = useCurrentFrame() - at, { fps } = useVideoConfig(), k = f < 0 ? 0 : Math.max(0.85, pop(f, fps)), s = 1 + Math.sin(f / 7) * 0.03;
  return <div style={{ position: "absolute", top, left: 0, right: 56, display: "flex", justifyContent: "flex-end", transformOrigin: "85% 50%", transform: `scale(${k * s}) rotate(${Math.sin(f / 9) * 3}deg)` }}>
    <div style={{ width: size, height: size, borderRadius: "50%", border: `${size * 0.09}px solid #e3191c`, background: "rgba(255,255,255,.93)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 40px rgba(0,0,0,.5)" }}>
      <span style={{ fontFamily: F, fontWeight: 700, fontSize: size * 0.5, color: "#111" }}>67</span>
      <div style={{ position: "absolute", width: size * 1.02, height: size * 0.09, background: "#e3191c", transform: "rotate(-45deg)" }} />
    </div></div>;
};

/** transmisja TV: ramka, „● LIVE”, pasek u góry (nie w strefie napisu 0,55–0,65) */
export const TvLive: React.FC<{ at: number; title?: string; sub?: string }> = ({ at, title = "EILMELDUNG", sub = "Bürgermeister LIVE aus dem Rathaus" }) => {
  const f = useCurrentFrame() - at, { fps } = useVideoConfig(), k = interpolate(f, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,.10) 0 2px, transparent 2px 5px)", opacity: k }} />
    <AbsoluteFill style={{ boxShadow: "inset 0 0 160px rgba(0,0,0,.65)", opacity: k }} />
    <div style={{ position: "absolute", top: 150, left: 60, display: "flex", alignItems: "center", gap: 14, opacity: k }}>
      <div style={{ background: "#e3191c", color: "#fff", fontFamily: F, fontWeight: 700, fontSize: 52, padding: "4px 22px", borderRadius: 12 }}>
        <span style={{ opacity: Math.floor(f / 18) % 2 ? 0.35 : 1 }}>●</span> LIVE</div>
      <div style={{ color: "#fff", fontFamily: F, fontWeight: 700, fontSize: 40, textShadow: "0 3px 8px #000" }}>STADT-TV</div>
    </div>
    <div style={{ position: "absolute", top: 1380, left: 0, right: 0, transform: `translateX(${(1 - pop(f, fps)) * -1100}px)` }}>
      <div style={{ background: "#e3191c", color: "#fff", fontFamily: F, fontWeight: 700, fontSize: 46, padding: "6px 60px", display: "inline-block" }}>{title}</div>
      <div style={{ background: "rgba(255,255,255,.95)", color: "#111", fontFamily: F, fontWeight: 700, fontSize: 44, padding: "10px 60px" }}>{sub}</div>
    </div>
  </AbsoluteFill>;
};

/** pole komentarza: wpisywanie „Six Seven”, potem pieczątka VERHAFTET */
export const CommentJail: React.FC<{ at: number; text?: string; stampAt?: number }> = ({ at, text = "Six Seven 🤚🤚", stampAt = 50 }) => {
  const f = useCurrentFrame() - at, { fps } = useVideoConfig(), n = Math.max(0, Math.min(text.length, Math.floor(f / 2.2)));
  const st = f - stampAt, sk = st < 0 ? 0 : spring({ frame: st, fps, config: { damping: 11, stiffness: 260 } });
  return <div style={{ position: "absolute", top: 1330, left: 70, right: 70, transform: `scale(${0.8 + 0.2 * pop(f, fps)})` }}>
    <div style={{ background: "#fff", borderRadius: 34, padding: "22px 30px", display: "flex", alignItems: "center", gap: 20, boxShadow: "0 10px 30px rgba(0,0,0,.45)" }}>
      <div style={{ width: 76, height: 76, borderRadius: "50%", background: "#ffd23f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>🙂</div>
      <div style={{ fontFamily: F, fontWeight: 700, fontSize: 54, color: "#111", flex: 1 }}>{text.slice(0, n)}<span style={{ opacity: Math.floor(f / 15) % 2 ? 0 : 1 }}>|</span></div>
      <div style={{ background: "#ff2a55", borderRadius: 24, color: "#fff", fontFamily: F, fontWeight: 700, fontSize: 40, padding: "8px 22px" }}>➤</div>
    </div>
    {st >= 0 && <div style={{ position: "absolute", top: -30, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${2.2 - 1.2 * sk}) rotate(-12deg)`, opacity: Math.min(1, sk * 1.5) }}>
      <div style={{ border: "10px solid #e3191c", color: "#e3191c", fontFamily: F, fontWeight: 700, fontSize: 96, padding: "0 30px", borderRadius: 16, background: "rgba(255,255,255,.85)" }}>VERHAFTET</div></div>}
  </div>;
};
