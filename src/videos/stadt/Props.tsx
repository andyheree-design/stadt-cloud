// Rekwizyty E01: döner z ananasem (i Nutellą), tablica „2+2=5”, router, kartka, plusk.
import React from "react";
import { labelTex } from "./Tex";

type V3 = [number, number, number];
const M: React.FC<{ c: string; r?: number; m?: number; e?: string }> = ({ c, r = 0.6, m = 0, e }) => <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e ?? "#000"} emissiveIntensity={e ? 0.6 : 0} />;

export const DoenerProp: React.FC<{ position: V3; rot?: V3; scale?: number; nutella?: boolean }> = ({ position, rot = [0, 0, 0], scale = 1, nutella }) => (
  <group position={position} rotation={rot} scale={scale}>
    {/* chlebek (pita) — półwalec otwarty do góry */}
    <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.11, 0.11, 0.3, 18, 1, true, 0, Math.PI]} /><meshStandardMaterial color="#e8c48a" roughness={0.8} side={2} /></mesh>
    <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.27, 0.07, 0.15]} /><M c="#8a4a24" r={0.75} /></mesh>
    {[...Array(9)].map((_, i) => <mesh key={i} position={[-0.11 + (i % 5) * 0.055, 0.075 + (i % 2) * 0.02, -0.05 + Math.floor(i / 5) * 0.08]} rotation={[i, i * 0.7, 0]}><boxGeometry args={[0.04, 0.035, 0.04]} /><M c="#ffd23a" r={0.4} /></mesh>)}
    {[...Array(4)].map((_, i) => <mesh key={"s" + i} position={[-0.09 + i * 0.06, 0.07, 0.04]}><boxGeometry args={[0.035, 0.02, 0.03]} /><M c="#4cae3c" /></mesh>)}
    {nutella && [...Array(5)].map((_, i) => <mesh key={"n" + i} position={[0, 0.105, -0.06 + i * 0.03]} rotation={[0, 0.35 * (i % 2 ? 1 : -1), 0]}><boxGeometry args={[0.28, 0.018, 0.016]} /><M c="#3d1f12" r={0.2} /></mesh>)}
  </group>
);

export const Board: React.FC<{ position: V3; rotY?: number; text?: string }> = ({ position, rotY = 0, text = "2+2=5" }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <mesh position={[0, 1.45, 0]} castShadow><boxGeometry args={[1.7, 1.1, 0.06]} /><M c="#6b4a2b" /></mesh>
    <mesh position={[0, 1.45, 0.032]}><planeGeometry args={[1.56, 0.96]} /><meshStandardMaterial map={labelTex(text, "#24513a", "#f4f4ec", 512, 320, "900 150px 'Comic Sans MS', 'Arial Black', sans-serif")} roughness={0.9} /></mesh>
    {[-0.7, 0.7].map((x) => <mesh key={x} position={[x, 0.45, 0]}><boxGeometry args={[0.06, 0.9, 0.06]} /><M c="#4e3520" /></mesh>)}
  </group>
);

export const Router: React.FC<{ position: V3; rot?: V3; scale?: number }> = ({ position, rot = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rot} scale={scale}>
    <mesh castShadow><boxGeometry args={[0.32, 0.07, 0.22]} /><M c="#f2f2f2" r={0.35} /></mesh>
    {[-0.11, 0.11].map((x) => <mesh key={x} position={[x, 0.12, -0.1]} rotation={[0, 0, x * 1.5]}><boxGeometry args={[0.025, 0.2, 0.025]} /><M c="#222" /></mesh>)}
    {[0, 1, 2, 3].map((i) => <mesh key={i} position={[-0.09 + i * 0.05, 0.01, 0.112]}><boxGeometry args={[0.02, 0.012, 0.004]} /><M c="#2bff6a" e="#2bff6a" /></mesh>)}
  </group>
);

export const Paper: React.FC<{ position: V3; rot?: V3 }> = ({ position, rot = [0, 0, 0] }) => (
  <mesh position={position} rotation={rot}><planeGeometry args={[0.22, 0.3]} /><meshStandardMaterial map={labelTex("Sie waren nicht da.", "#fff8d8", "#222", 256, 340, "700 26px Arial, sans-serif")} side={2} roughness={0.9} /></mesh>
);

/** plusk: krople rozlatują się po łuku, u = 0..1 */
export const Splash: React.FC<{ position: V3; u: number }> = ({ position, u }) => (
  <group position={position}>
    {[...Array(16)].map((_, i) => {
      const a = (i / 16) * Math.PI * 2, r = 0.25 + u * (0.6 + (i % 3) * 0.25), y = Math.max(0, u * (1.6 + (i % 4) * 0.35) - u * u * 2.2);
      return <mesh key={i} position={[Math.cos(a) * r, y, Math.sin(a) * r]} scale={0.09 * (1 - u * 0.6)}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#eaf7ff" transparent opacity={0.9 * (1 - u * 0.5)} /></mesh>;
    })}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} scale={0.3 + u * 1.4}><ringGeometry args={[0.8, 1, 32]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.7 * (1 - u)} /></mesh>
  </group>
);

/** tafla stawu fontanny — matowy błękit, czytelny także o zmroku */
export const Pond: React.FC<{ position: V3; r?: number }> = ({ position, r = 1.98 }) => (
  <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[r, 48]} /><meshStandardMaterial color="#2f86d6" roughness={0.25} metalness={0} emissive="#1d5fa8" emissiveIntensity={0.35} /></mesh>
);
