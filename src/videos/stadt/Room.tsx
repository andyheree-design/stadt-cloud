// Sypialnia jak we wzorze (ref1_2/ref1_4): niebieskie ściany, plakaty, łóżko, biurko z PC, drewniana podłoga, dywan, okno z miastem.
// Pokój: x −3..3, z −2.5..2.5 (front otwarty na kamerę), wys. 3. Własne światło — renderuj ZAMIAST <Town/>.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Batch, wbox, M4, std, texMat } from "./Town";
import { woodTex, paintTex, ctex, skyTex } from "./Tex";

const poster = (kind: number) => ctex("poster" + kind, 256, 360, (g, r) => {
  const P = [["#c8323a", "#ffd23f", "#ffd23f"], ["#0e5b3a", "#f4f1e8", "#ff9f1c"], ["#f2e9d8", "#d62828", "#003049"], ["#2b2d42", "#8ecae6", "#ffb703"]][kind % 4];
  g.fillStyle = P[0]; g.fillRect(0, 0, 256, 360);
  if (kind % 4 === 0) { g.fillStyle = P[1]; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 34 : 86; g.lineTo(128 + Math.cos(a) * rr, 160 + Math.sin(a) * rr); } g.fill(); }
  if (kind % 4 === 1) { g.fillStyle = P[2]; g.beginPath(); g.moveTo(128, 40); g.lineTo(220, 260); g.lineTo(36, 260); g.fill(); }
  if (kind % 4 === 2) { for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? P[1] : P[2]; g.fillRect(0, 40 + i * 40, 256, 24); } }
  if (kind % 4 === 3) { g.fillStyle = P[1]; g.fillRect(60, 60, 136, 200); g.fillStyle = P[2]; g.beginPath(); g.arc(128, 140, 40, 0, 7); g.fill(); }
  g.fillStyle = kind % 4 === 2 ? P[2] : "#fff"; g.font = "900 44px 'Arial Black', Arial"; g.textAlign = "center";
  if (kind % 4) g.fillText(["", "LEVEL UP", "NOOB", "GG EZ"][kind % 4], 128, 318);
  g.strokeStyle = "#fff"; g.lineWidth = 8; g.strokeRect(4, 4, 248, 352);
});
const screenTex = () => ctex("pcscreen", 512, 288, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 288); gr.addColorStop(0, "#5aa8ff"); gr.addColorStop(0.6, "#9fd4ff"); gr.addColorStop(0.61, "#3d9a3d"); gr.addColorStop(1, "#2a7a2a");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 288);
  for (let i = 0; i < 6; i++) { g.fillStyle = ["#d94a3a", "#f2c230", "#3b74d6", "#f4f4f4"][i % 4]; const x = 40 + i * 75, h = 40 + r() * 60; g.fillRect(x, 175 - h, 50, h); }
  g.fillStyle = "#ffd23f"; g.fillRect(240, 150, 22, 30); g.fillStyle = "#3b74d6"; g.fillRect(238, 180, 26, 30);
  g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, 0, 512, 26); g.fillStyle = "#fff"; g.font = "bold 18px Arial"; g.fillText("Players: 1.284.003", 10, 19);
  g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(10, 200, 200, 78); g.fillStyle = "#fff"; g.font = "15px Arial";
  ["[Kevin]: lol", "[Oma]: wer bin ich", "[ich]: RAGEBAIT!!", "[Murat]: döner?"].forEach((s, i) => g.fillText(s, 18, 220 + i * 17));
});
const rugTex = () => ctex("rug", 256, 256, (g, r) => {
  g.fillStyle = "#5d7fa8"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#e6e2d8"; g.lineWidth = 10; g.strokeRect(14, 14, 228, 228); g.lineWidth = 4; g.strokeRect(34, 34, 188, 188);
  g.fillStyle = "#e6e2d8"; g.beginPath(); g.moveTo(128, 70); g.lineTo(186, 128); g.lineTo(128, 186); g.lineTo(70, 128); g.fill();
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${0.08 * r()})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
});
const blanketTex = () => ctex("blanket", 256, 256, (g) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? "#2f5fb3" : "#4a7fd1"; g.fillRect(x * 32, y * 32, 32, 32); } g.fillStyle = "rgba(255,255,255,.25)"; for (let i = 0; i < 8; i++) { g.fillRect(i * 32 + 15, 0, 2, 256); g.fillRect(0, i * 32 + 15, 256, 2); } });
const booksTex = () => ctex("books", 256, 64, (g, r) => { let x = 0; while (x < 256) { const w = 8 + r() * 10; g.fillStyle = ["#c0392b", "#2c5aa0", "#2f7d4a", "#e0a020", "#6c3483", "#eee"][(r() * 6) | 0]; g.fillRect(x, 64 - (40 + r() * 22), w, 64); x += w + 1; } });
const viewTex = () => ctex("winview", 256, 256, (g, r) => {
  const sky = skyTex("#3f8fe0", "#8cc0ea", "#d4e6f2", 1).image as HTMLCanvasElement; g.drawImage(sky, 0, 0, 512, 700, 0, 0, 256, 256);
  for (let i = 0; i < 9; i++) { const w = 20 + r() * 20, h = 80 + r() * 150, x = i * 30 - 10; g.fillStyle = ["#9fb4c8", "#7f97ad", "#b5c4d2"][i % 3]; g.fillRect(x, 256 - h, w, h); g.fillStyle = "rgba(255,255,255,.35)"; for (let y = 256 - h + 6; y < 256; y += 10) for (let xx = x + 3; xx < x + w - 4; xx += 7) g.fillRect(xx, y, 4, 5); }
});

export const buildRoom = (open = false) => {
  const B = new Batch();
  const wall = B.mat("rwall", texMat(paintTex("#4f86c6")), false, true), floor = B.mat("rfloor", texMat(woodTex("#a8723f"), { roughness: 0.6 }), false, true);
  const white = B.mat("rwhite", std({ color: "#f4f4f2", roughness: 0.6 })), wood = B.mat("rwood", texMat(woodTex("#7a4f2a"), { roughness: 0.7 })), dark = B.mat("rdark", std({ color: "#1e2126", roughness: 0.5 }));
  B.add(wbox(6, 0.1, 5, 2), floor, M4(0, -0.05, 0));
  if (!open) B.add(wbox(6, 3, 0.1, 3), wall, M4(0, 1.5, -2.55));
  else { // otwór okienny 2,2×1,5 (x −0,9…1,3, y 0,6…2,1) — za nim prawdziwa impreza 3D (v3)
    B.add(wbox(2.1, 3, 0.1, 3), wall, M4(-1.95, 1.5, -2.55)); B.add(wbox(1.7, 3, 0.1, 3), wall, M4(2.15, 1.5, -2.55));
    B.add(wbox(2.2, 0.6, 0.1, 3), wall, M4(0.2, 0.3, -2.55)); B.add(wbox(2.2, 0.9, 0.1, 3), wall, M4(0.2, 2.55, -2.55)); } B.add(wbox(0.1, 3, 5, 3), wall, M4(-3.05, 1.5, 0)); B.add(wbox(0.1, 3, 5, 3), wall, M4(3.05, 1.5, 0));
  B.add(wbox(6.2, 0.1, 5.2), B.mat("rceil", std({ color: "#eef0f2" })), M4(0, 3.05, 0));
  B.add(wbox(6, 0.14, 0.04), white, M4(0, 0.07, -2.48)); B.add(wbox(0.04, 0.14, 5), white, M4(-2.98, 0.07, 0)); B.add(wbox(0.04, 0.14, 5), white, M4(2.98, 0.07, 0));
  // okno w tylnej ścianie
  if (!open) {
    B.add(wbox(1.7, 1.4, 0.08), white, M4(0.2, 1.85, -2.48)); B.add(wbox(1.5, 1.2, 0.02), B.mat("rview", std({ map: viewTex(), emissive: "#fff", emissiveMap: viewTex(), emissiveIntensity: 0.6, roughness: 0.1 }), false, false), M4(0.2, 1.85, -2.43));
    B.add(wbox(0.06, 1.2, 0.04), white, M4(0.2, 1.85, -2.41)); B.add(wbox(1.9, 0.08, 0.25), white, M4(0.2, 1.12, -2.4));
    for (const sx of [-1, 1]) B.add(wbox(0.35, 1.9, 0.06), B.mat("rcurt", std({ color: "#e8d9b0" })), M4(0.2 + sx * 1.05, 1.95, -2.38));
  } else {
    for (const [x, y, w, h] of [[0.2, 2.13, 2.36, 0.08], [0.2, 0.57, 2.36, 0.08], [-0.94, 1.35, 0.08, 1.62], [1.34, 1.35, 0.08, 1.62]] as const) B.add(wbox(w, h, 0.08), white, M4(x, y, -2.5));
    B.add(wbox(2.5, 0.06, 0.28), white, M4(0.2, 0.56, -2.4));
    for (const sx of [-1, 1]) B.add(wbox(0.4, 2.0, 0.06), B.mat("rcurt", std({ color: "#e8d9b0" })), M4(0.2 + sx * 1.38, 1.45, -2.42));
  }
  // plakaty
  (open ? [[-2.4, 1.9, -2.48, 0], [-1.65, 2.05, -2.48, 0], [2.2, 1.9, -2.48, 0]] : [[-1.9, 1.9, -2.48, 0], [-1.05, 2.05, -2.48, 0], [2.0, 1.9, -2.48, 0]]).forEach(([x, y, z], i) => B.add(wbox(0.65, 0.9, 0.02), B.mat("rposter" + i, std({ map: poster(i), roughness: 0.5 })), M4(x, y, z)));
  B.add(wbox(0.02, 0.9, 0.65), B.mat("rposter3", std({ map: poster(3), roughness: 0.5 })), M4(-2.98, 1.9, -0.2));
  // łóżko (lewa ściana)
  B.add(wbox(1.4, 0.35, 2.3), wood, M4(-2.2, 0.18, 0.2)); B.add(wbox(1.4, 0.9, 0.12), wood, M4(-2.2, 0.45, -0.95));
  B.add(wbox(1.3, 0.2, 2.2), white, M4(-2.2, 0.45, 0.22)); B.add(wbox(1.34, 0.08, 1.6), B.mat("rblank", std({ map: blanketTex(), roughness: 0.95 })), M4(-2.2, 0.58, 0.5));
  B.add(wbox(0.9, 0.16, 0.42), white, M4(-2.2, 0.62, -0.62));
  // szafka nocna z lampką
  B.add(wbox(0.5, 0.5, 0.45), wood, M4(-2.7, 0.25, -1.55)); B.add(new THREE.CylinderGeometry(0.05, 0.08, 0.3, 10), dark, M4(-2.7, 0.65, -1.55));
  B.add(new THREE.CylinderGeometry(0.12, 0.18, 0.2, 14), B.mat("rshade", std({ color: "#fff2c8", emissive: "#ffd98a", emissiveIntensity: 1.2 }), false, false), M4(-2.7, 0.88, -1.55));
  // biurko + PC (prawa strona)
  B.add(wbox(1.8, 0.06, 0.75), wood, M4(1.9, 0.78, -2.05)); for (const sx of [-1, 1]) B.add(wbox(0.06, 0.78, 0.7), wood, M4(1.9 + sx * 0.85, 0.39, -2.05));
  B.add(wbox(0.9, 0.52, 0.04), dark, M4(1.8, 1.25, -2.25)); B.add(wbox(0.84, 0.47, 0.01), B.mat("rscreen", std({ map: screenTex(), emissive: "#fff", emissiveMap: screenTex(), emissiveIntensity: 1.1, roughness: 0.2 }), false, false), M4(1.8, 1.25, -2.225));
  B.add(wbox(0.08, 0.2, 0.08), dark, M4(1.8, 0.91, -2.28)); B.add(wbox(0.3, 0.02, 0.2), dark, M4(1.8, 0.82, -2.28));
  B.add(wbox(0.6, 0.03, 0.2), dark, M4(1.75, 0.82, -1.85)); B.add(wbox(0.1, 0.03, 0.14), dark, M4(2.25, 0.82, -1.85));
  B.add(wbox(0.28, 0.6, 0.6), dark, M4(2.6, 1.11, -2.1)); B.add(wbox(0.01, 0.5, 0.45), B.mat("rrgb", std({ color: "#7a2a9a", emissive: "#a43dff", emissiveIntensity: 0.55 }), false, false), M4(2.455, 1.11, -2.1));
  // krzesło gamingowe
  B.add(wbox(0.55, 0.1, 0.55), B.mat("rchair", std({ color: "#c0262e", roughness: 0.5 })), M4(1.75, 0.5, -1.3)); B.add(wbox(0.55, 0.8, 0.1), B.mat("rchair", std({})), M4(1.75, 0.95, -1.0));
  B.add(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8), dark, M4(1.75, 0.25, -1.3)); B.add(wbox(0.6, 0.04, 0.6), dark, M4(1.75, 0.03, -1.3));
  // szafa + półka z książkami
  B.add(wbox(1.0, 2.2, 0.6), B.mat("rward", texMat(woodTex("#d9c3a0"))), M4(2.7, 1.1, 0.9)); B.add(wbox(0.02, 2.0, 0.02), dark, M4(2.7, 1.1, 0.6)); B.add(wbox(0.02, 2.0, 0.02), dark, M4(2.2, 1.1, 0.9));
  B.add(wbox(1.2, 0.04, 0.25), white, M4(-1.0, 2.55, -2.42)); B.add(wbox(1.15, 0.28, 0.18), B.mat("rbooks", std({ map: booksTex() })), M4(-1.0, 2.71, -2.42));
  // dywan, kosz na pranie, roślinka, piłka
  B.add(wbox(1.6, 0.015, 1.1), B.mat("rrug", std({ map: rugTex(), roughness: 1 }), false, true), M4(0.6, 0.01, -0.6));
  B.add(new THREE.CylinderGeometry(0.2, 0.17, 0.45, 14), B.mat("rbasket", std({ color: "#d6c08a" })), M4(-0.8, 0.22, -2.1));
  B.add(new THREE.CylinderGeometry(0.15, 0.12, 0.25, 12), B.mat("rpot", std({ color: "#b5562f" })), M4(1.0, 0.12, -2.25)); B.add(new THREE.SphereGeometry(0.28, 12, 10), B.mat("rplant", std({ color: "#3f8f34" })), M4(1.0, 0.48, -2.25));
  B.add(new THREE.SphereGeometry(0.16, 16, 12), B.mat("rball", std({ color: "#f28c28" })), M4(0.9, 0.16, 1.2));
  return B.build();
};

export const Room: React.FC<{ night?: boolean; open?: boolean }> = ({ night, open }) => {
  const room = useMemo(() => buildRoom(open), [open]);
  const n = night ? 1 : 0;
  return (
    <>
      <color attach="background" args={[night ? "#0b1024" : "#2a3550"]} />
      <hemisphereLight args={[night ? "#c2b2ee" : "#eef3ff", "#9a8470", night ? 0.55 : 1.15]} />
      <ambientLight color={night ? "#dcc8f2" : "#f4f0ff"} intensity={night ? 0.32 : 0.5} />
      <pointLight color={night ? "#ffd59a" : "#fff1d8"} intensity={night ? 1.9 : 2.4} distance={10} decay={1.6} position={[0, 2.8, 0.6]} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.001} shadow-radius={6} />
      <directionalLight color={night ? "#ac8ae8" : "#dbe9ff"} intensity={night ? 0.7 : 0.5} position={[0.2, 2.2, -6]} />
      <directionalLight color="#fff6e8" intensity={night ? 0.35 : 0.6} position={[0, 2.2, 6]} />
      <pointLight color="#9fd0ff" intensity={1.5} distance={2.5} position={[1.8, 1.25, -1.9]} />
      <pointLight color="#ffcc80" intensity={1.2 + n * 0.8} distance={2.2 + n} position={[-2.7, 1.0, -1.4]} />
      {night && <pointLight color="#ff5ce1" intensity={1.6} distance={3.2} position={[0.2, 1.8, -2.0]} />}
      <primitive object={room} />
    </>
  );
};
