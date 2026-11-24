// Hinterhausen v2 — miasto w stylu wzoru (Roblox): kamienice z cegły/tynku z oknami, sklepy z szyldami i markizami,
// bruk w jodełkę, asfalt z pasami, latarnie, drzewa, ławki, a za kamienicami domki z dwuspadowymi dachami, drzewa i góry (jak wzór).
// Wszystko proceduralne, scalone w kilkadziesiąt siatek (1 siatka na materiał) — szybki render.
// Ulica wzdłuż osi Z (x=0), jezdnia |x|<1.85, chodnik 1.85..3.3, fasady na |x|=3.3. Postać R6 ~1.1 j.
import React, { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { brickTex, plasterTex, paverTex, asphaltTex, grassTex, towerTex, skyTex, labelTex, ctex, rep, rng } from "./Tex";

export type TownKit = Record<string, never>;
export const loadTown = (): Promise<TownKit> => (document.fonts?.ready ?? Promise.resolve()).then(() => ({}));

export type LightPreset = "day" | "dusk" | "night";

// ---------- batch: geometria w jednostkach świata, UV w jednostkach świata (tekstura powtarza się co `tile`) ----------
type MatDef = () => THREE.Material;
export class Batch {
  parts = new Map<string, THREE.BufferGeometry[]>(); defs = new Map<string, MatDef>(); flags = new Map<string, { cast: boolean; recv: boolean }>();
  mat(key: string, def: MatDef, cast = true, recv = true) { if (!this.defs.has(key)) { this.defs.set(key, def); this.flags.set(key, { cast, recv }); } return key; }
  add(geo: THREE.BufferGeometry, key: string, m: THREE.Matrix4) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m);
    for (const a of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(a)) g.deleteAttribute(a);
    (this.parts.get(key) ?? this.parts.set(key, []).get(key)!).push(g);
  }
  build() {
    const root = new THREE.Group();
    for (const [k, list] of this.parts) {
      const geo = mergeGeometries(list, false); if (!geo) continue;
      const mesh = new THREE.Mesh(geo, this.defs.get(k)!()); const f = this.flags.get(k)!; mesh.castShadow = f.cast; mesh.receiveShadow = f.recv; root.add(mesh);
      list.forEach((g) => g.dispose());
    }
    return root;
  }
}
const pboxCache = new Map<string, THREE.BufferGeometry>();
/** prostopadłościan z UV 0..1 na każdej ścianie (szyldy, witryny) */
export const pbox = (w: number, h: number, d: number) => { const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`; let g = pboxCache.get(k); if (!g) { g = new THREE.BoxGeometry(w, h, d); pboxCache.set(k, g); } return g; };
/** prostopadłościan z UV w jednostkach świata (dzielone przez tile) */
const boxCache = new Map<string, THREE.BufferGeometry>();
export const wbox = (w: number, h: number, d: number, tile = 1) => {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${tile}`; let g = boxCache.get(key);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv as THREE.BufferAttribute;
    const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const j = f * 4 + i; uv.setXY(j, uv.getX(j) * dims[f][0] / tile, uv.getY(j) * dims[f][1] / tile); }
    boxCache.set(key, g);
  }
  return g;
};
export const M4 = (x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, s: [number, number, number] = [1, 1, 1]) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), new THREE.Vector3(...s));
export const std = (o: THREE.MeshStandardMaterialParameters) => () => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
export const texMat = (t: THREE.Texture, o: THREE.MeshStandardMaterialParameters = {}) => std({ map: rep(t, 1, 1), ...o });

// ---------- tekstury szyb ----------
const glassTex = (v: number, night: boolean) => ctex(`win${v}${night}`, 128, 192, (g) => {
  const lit = night && v % 2 === 0;
  const gr = g.createLinearGradient(0, 0, 128, 192);
  gr.addColorStop(0, lit ? "#ffe2a0" : "#9cc4e4"); gr.addColorStop(0.5, lit ? "#f7c46e" : "#3f6f9c"); gr.addColorStop(1, lit ? "#d99a48" : "#1f3d63");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 192);
  if (v === 1 || v === 3) { g.fillStyle = v === 1 ? "#e9e2cf" : "#c85a5a"; g.fillRect(0, 0, 30, 192); g.fillRect(98, 0, 30, 192); g.fillStyle = "rgba(0,0,0,.15)"; for (let x = 4; x < 30; x += 7) { g.fillRect(x, 0, 2, 192); g.fillRect(98 + x, 0, 2, 192); } }
  if (v === 2) { g.fillStyle = "#d8d2c4"; g.fillRect(0, 0, 128, 70); g.fillStyle = "rgba(0,0,0,.12)"; for (let y = 4; y < 70; y += 6) g.fillRect(0, y, 128, 2); }
  g.fillStyle = "rgba(255,255,255,0.28)"; g.beginPath(); g.moveTo(10, 0); g.lineTo(48, 0); g.lineTo(0, 70); g.lineTo(0, 20); g.fill();
});
const doenerTex = (night: boolean) => ctex(`doener${night}`, 384, 192, (g, r) => {
  g.fillStyle = "#e9e6df"; g.fillRect(0, 0, 384, 192); g.fillStyle = "rgba(0,0,0,.08)"; for (let x = 0; x < 384; x += 16) g.fillRect(x, 0, 1, 192); for (let y = 0; y < 192; y += 16) g.fillRect(0, y, 384, 1);
  g.fillStyle = "#1d1d1f"; g.fillRect(150, 10, 220, 58); g.fillStyle = "#ffd23f"; g.font = "bold 13px Arial";
  ["Döner Kebab  6,50", "Dürüm  7,00", "Lahmacun  5,00", "Pommes  3,50"].forEach((t, i) => g.fillText(t, 160, 26 + i * 13));
  g.fillStyle = "#d62b2b"; g.fillRect(150, 10, 220, 4);
  for (const cx of [48, 104]) { g.fillStyle = "#8c8f94"; g.fillRect(cx - 2, 20, 4, 120); const gr = g.createLinearGradient(cx - 22, 0, cx + 22, 0); gr.addColorStop(0, "#7a4219"); gr.addColorStop(0.5, "#c47a3a"); gr.addColorStop(1, "#6b3812"); g.fillStyle = gr;
    g.beginPath(); g.moveTo(cx - 24, 34); g.lineTo(cx + 24, 34); g.lineTo(cx + 14, 128); g.lineTo(cx - 14, 128); g.fill(); g.fillStyle = "rgba(60,25,5,.35)"; for (let y = 40; y < 126; y += 7) g.fillRect(cx - 20 + (y - 34) * 0.1, y, 40 - (y - 34) * 0.2, 2);
    g.fillStyle = night ? "#ff9a40" : "#e0662a"; g.fillRect(cx + 26, 30, 8, 100); }
  g.fillStyle = "#b9bec4"; g.fillRect(0, 138, 384, 54); g.fillStyle = "#d9dde1"; g.fillRect(0, 134, 384, 8);
  const veg = ["#e04848", "#3fae4a", "#f4f4f4", "#f2c230", "#8a4fc9"]; for (let i = 0; i < 5; i++) { g.fillStyle = veg[i]; g.fillRect(150 + i * 42, 112, 36, 20); g.fillStyle = "rgba(0,0,0,.15)"; for (let k = 0; k < 12; k++) g.fillRect(150 + i * 42 + r() * 32, 112 + r() * 16, 3, 3); }
  g.fillStyle = "rgba(255,255,255,0.22)"; g.beginPath(); g.moveTo(40, 0); g.lineTo(140, 0); g.lineTo(40, 192); g.lineTo(0, 192); g.lineTo(0, 70); g.fill();
});
const shopTex = (v: number, night: boolean) => v === 3 ? doenerTex(night) : ctex(`shop${v}${night}`, 256, 160, (g, r) => {
  g.fillStyle = night ? "#3a2c1c" : "#2a2f36"; g.fillRect(0, 0, 256, 160);
  g.fillStyle = night ? "#ffdca0" : "#5a6470"; g.fillRect(0, 0, 256, 10);
  const pal = ["#e04848", "#f2c230", "#3fae4a", "#3b74d6", "#f4f4f4", "#e98a3a"];
  for (let s = 0; s < 3; s++) { const y = 40 + s * 40; g.fillStyle = "#b9b2a6"; g.fillRect(8, y, 240, 5); for (let x = 12; x < 244;) { const w = 8 + r() * 14, h = 12 + r() * 18; g.fillStyle = pal[(r() * pal.length) | 0]; g.fillRect(x, y - h, w, h); x += w + 3; } }
  g.fillStyle = "rgba(255,255,255,0.22)"; g.beginPath(); g.moveTo(30, 0); g.lineTo(110, 0); g.lineTo(20, 160); g.lineTo(0, 160); g.lineTo(0, 60); g.fill();
});
const awningTex = (c: string) => ctex("awn" + c, 256, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#f4f1ea" : c; g.fillRect(i * 32, 0, 32, 64); } g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(0, 56, 256, 8); });
const doorTex = () => ctex("door", 64, 128, (g) => { g.fillStyle = "#5a3a22"; g.fillRect(0, 0, 64, 128); g.fillStyle = "#9cc4e4"; g.fillRect(10, 10, 44, 50); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(10, 70, 44, 3); g.fillRect(10, 90, 44, 3); g.fillStyle = "#d8b45a"; g.fillRect(48, 70, 6, 6); });

// ---------- kamienica ----------
type Shop = { text: string; bg: string; fg: string; inner?: number };
type BStyle = { mat: "brick" | "plaster"; color: string; trim: string; base: string; floors: number; shop?: Shop; awning?: string };
const FLOOR = 2.7, GF = 3.1;
const building = (B: Batch, base: THREE.Matrix4, W: number, D: number, st: BStyle, seed: number, night: boolean) => {
  const r = rng(seed), H = GF + st.floors * FLOOR;
  const at = (x: number, y: number, z: number, ry = 0, rx = 0) => base.clone().multiply(M4(x, y, z, ry, rx));
  const wall = st.mat === "brick" ? B.mat("brick" + st.color, texMat(brickTex(st.color))) : B.mat("plas" + st.color, texMat(plasterTex(st.color)));
  const trim = B.mat("trim" + st.trim, std({ color: st.trim, roughness: 0.7 }));
  const baseM = B.mat("base" + st.base, texMat(plasterTex(st.base)));
  B.add(wbox(W, H - GF, D, st.mat === "brick" ? 2 : 3), wall, at(0, GF + (H - GF) / 2, -D / 2));
  B.add(wbox(W, GF, D, 3), baseM, at(0, GF / 2, -D / 2));
  B.add(wbox(W + 0.1, 0.22, 0.3), trim, at(0, GF, 0.05));
  for (let f = 1; f < st.floors; f++) B.add(wbox(W, 0.1, 0.12), trim, at(0, GF + f * FLOOR, 0.02));
  B.add(wbox(W + 0.2, 0.35, 0.4), trim, at(0, H + 0.12, 0.05)); B.add(wbox(W, 0.5, D), B.mat("roof", std({ color: "#5b5f66" })), at(0, H + 0.25, -D / 2 - 0.1));
  for (const sx of [-1, 1]) B.add(wbox(0.25, H, 0.14), trim, at(sx * (W / 2 - 0.12), H / 2, 0.03));
  const nw = W > 5.5 ? 3 : 2, wv = seed % 4;
  for (let f = 0; f < st.floors; f++) for (let i = 0; i < nw; i++) {
    const x = -W / 2 + W * (i + 0.5) / nw, y = GF + f * FLOOR + 1.35, v = (wv + i + f * 2 + ((r() * 4) | 0)) % 4;
    B.add(wbox(1.0, 1.5, 0.08), trim, at(x, y, 0.03));
    B.add(wbox(0.84, 1.34, 0.02), B.mat(`glass${v}${night}`, std({ map: glassTex(v, night), roughness: 0.15, metalness: 0.2, emissive: night && v % 2 === 0 ? "#ffcc80" : "#000", emissiveMap: night ? glassTex(v, night) : null, emissiveIntensity: night ? 0.9 : 0 }), false, true), at(x, y, 0.075));
    B.add(wbox(0.05, 1.34, 0.03), trim, at(x, y, 0.09)); B.add(wbox(0.84, 0.05, 0.03), trim, at(x, y + 0.2, 0.09));
    B.add(wbox(1.2, 0.08, 0.22), trim, at(x, y - 0.8, 0.1));
    if (st.mat === "brick") B.add(wbox(1.14, 0.16, 0.06), B.mat("lintel", std({ color: "#d9d2c3" })), at(x, y + 0.84, 0.03));
  }
  if (st.shop) {
    const sw = W * 0.58, sx = -W / 2 + 0.3 + sw / 2;
    B.add(wbox(sw + 0.16, 1.95, 0.1), trim, at(sx, 1.25, 0.04));
    const sv = st.shop.inner ?? seed % 3;
    B.add(pbox(sw, 1.8, 0.02), B.mat(`shop${sv}${night}`, std({ map: shopTex(sv, night), roughness: 0.2, emissive: night ? "#ffd9a0" : "#000", emissiveMap: night ? shopTex(sv, night) : null, emissiveIntensity: night ? 0.8 : 0 }), false, true), at(sx, 1.25, 0.1));
    B.add(wbox(0.9, 2.1, 0.06), B.mat("door", std({ map: doorTex() })), at(W / 2 - 0.85, 1.05, 0.04));
    B.add(wbox(sw + 0.6, 0.12, 0.3), trim, at(sx, 0.1, 0.1));
    const sgW = Math.min(W * 0.8, 4.2), lt = labelTex(st.shop.text, st.shop.bg, st.shop.fg);
    B.add(pbox(sgW, sgW / 4, 0.1), B.mat(`sign${st.shop.text}`, std({ map: lt, roughness: 0.5, emissive: night ? "#fff" : "#000", emissiveMap: night ? lt : null, emissiveIntensity: night ? 0.6 : 0 })), at(0, GF - 0.3, 0.16));
    if (st.awning) B.add(wbox(sw + 0.3, 0.06, 1.0), B.mat("awn" + st.awning, std({ map: awningTex(st.awning), roughness: 0.9 })), at(sx, 2.25, 0.5, 0, 0.32));
  } else {
    B.add(wbox(1.1, 2.3, 0.1), trim, at(0, 1.15, 0.03)); B.add(wbox(0.9, 2.1, 0.06), B.mat("door", std({ map: doorTex() })), at(0, 1.05, 0.06));
    B.add(wbox(1.4, 0.18, 0.5), trim, at(0, 0.09, 0.25));
    for (const sx of [-1, 1]) { const x = sx * W * 0.3; B.add(wbox(1.0, 1.3, 0.08), trim, at(x, 1.6, 0.03)); B.add(wbox(0.84, 1.14, 0.02), B.mat(`glass1${night}`, std({ map: glassTex(1, night), roughness: 0.15 }), false, true), at(x, 1.6, 0.075)); }
    B.add(wbox(0.5, 0.35, 0.04), B.mat("plaque", std({ color: "#c9a24a", metalness: 0.6, roughness: 0.3 })), at(0.85, 1.55, 0.06));
  }
};

const sph = new THREE.SphereGeometry(1, 14, 10), cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
// ---------- wieżowiec ----------
const tower = (B: Batch, x: number, z: number, w: number, d: number, h: number, v: number, night: boolean) => {
  const G = [["#7fb0d8", "#d9dde2"], ["#4f7fae", "#c7ccd2"], ["#6d8fae", "#d8b48a"], ["#5c8fb8", "#eef0f2"], ["#3f5f7e", "#a9b3bd"], ["#5a7d99", "#59616b"]][v % 6];
  const t = towerTex(G[0], G[1], night ? 0.35 : 0.04);
  const k = B.mat(`tower${v % 6}${night}`, std({ map: t, roughness: 0.35, metalness: 0.15, emissive: night ? "#ffd27a" : "#000", emissiveMap: night ? t : null, emissiveIntensity: night ? 0.7 : 0 }));
  const top = B.mat("towerTop", std({ color: "#b8bcc2" })), band = B.mat(`band${v % 6}`, std({ color: G[1], roughness: 0.5 })), dark = B.mat("towerDark", std({ color: "#5d636b", metalness: 0.4, roughness: 0.4 }));
  // podstawa + korpus z uskokiem (co 2. wieżowiec)
  const setback = v % 2 === 0 && h > 30, h1 = setback ? h * 0.62 : h;
  B.add(wbox(w + 0.5, 4, d + 0.5, 4), band, M4(x, 2, z));                                    // cokół / hol
  B.add(wbox(w, h1 - 4, d, 8), k, M4(x, 4 + (h1 - 4) / 2, z));
  for (let y = 8; y < h1; y += 8) B.add(wbox(w + 0.24, 0.35, d + 0.24), band, M4(x, y, z));    // pasy stropów
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.add(wbox(0.45, h1 - 4, 0.45), band, M4(x + sx * w / 2, 4 + (h1 - 4) / 2, z + sz * d / 2)); // narożne filary
  B.add(wbox(w + 0.4, 0.6, d + 0.4), top, M4(x, h1 + 0.3, z));
  let yt = h1;
  if (setback) { const w2 = w * 0.7, d2 = d * 0.7, h2 = h - h1; B.add(wbox(w2, h2, d2, 8), k, M4(x, h1 + h2 / 2, z)); for (let y = h1 + 8; y < h; y += 8) B.add(wbox(w2 + 0.2, 0.3, d2 + 0.2), band, M4(x, y, z)); B.add(wbox(w2 + 0.3, 0.5, d2 + 0.3), top, M4(x, h + 0.25, z)); yt = h; }
  // dach: maszynownia, klimatyzatory, antena
  B.add(wbox(w * 0.35, 2.2, d * 0.3), top, M4(x - w * 0.15, yt + 1.4, z));
  for (let i = 0; i < 3; i++) B.add(wbox(1.1, 0.8, 1.1), dark, M4(x + w * 0.25 - i * 0.05, yt + 0.9, z - d * 0.25 + i * 1.4));
  if (v % 3 === 0) { B.add(cyl, dark, M4(x + w * 0.1, yt + 5, z + d * 0.1, 0, 0, 0, [0.08, 8, 0.08])); B.add(sph, B.mat("beacon", std({ color: "#ff3030", emissive: "#ff2020", emissiveIntensity: 2 }), false, false), M4(x + w * 0.1, yt + 9, z + d * 0.1, 0, 0, 0, [0.2, 0.2, 0.2])); }
};

// ---------- domek z dwuspadowym dachem (miasteczko w tle) ----------
const prism = new THREE.CylinderGeometry(1, 1, 1, 3).rotateX(-Math.PI / 2); // trójkąt wierzchołkiem w górę, kalenica wzdłuż Z
const HOUSE = ["#f2d7a6", "#e9b8a0", "#f4efe2", "#cfe0c3", "#f1c9d6", "#d9c7ef", "#f6e39a"], ROOF = ["#c0392b", "#7a3b2e", "#3f5a8a", "#a84a2a", "#5b3a6e"];
const house = (B: Batch, x: number, z: number, w: number, d: number, fl: number, v: number, night: boolean) => {
  const H = fl * 2.6, rh = 1.6 + (v % 3) * 0.4;
  B.add(wbox(w, H, d, 2), B.mat("hwall" + (v % 7), std({ color: HOUSE[v % 7], roughness: 0.9 })), M4(x, H / 2, z));
  B.add(prism, B.mat("hroof" + (v % 5), std({ color: ROOF[v % 5], roughness: 0.7 })), M4(x, H + 0.5 * rh / 1.5, z, 0, 0, 0, [(w + 0.6) / 1.732, rh / 1.5, d + 0.6]));
  const win = B.mat("hwin" + night, std({ color: night ? "#ffd27a" : "#9cc7e8", emissive: night ? "#ffb54a" : "#000", emissiveIntensity: night ? 1.6 : 0, roughness: 0.3 }), false, false);
  for (let f = 0; f < fl; f++) for (const s of [-1, 1]) {
    for (const k of [-0.25, 0.25]) { B.add(wbox(0.9, 1.0, 0.06), win, M4(x + k * w, 1.4 + f * 2.6, z + s * (d / 2 + 0.02))); B.add(wbox(0.06, 1.0, 0.9), win, M4(x + s * (w / 2 + 0.02), 1.4 + f * 2.6, z + k * d)); }
  }
  B.add(wbox(0.5, 1.6, 0.5), B.mat("chim", std({ color: "#8a4a3a" })), M4(x + w * 0.22, H + rh * 0.7, z - d * 0.2));
};
/** góry jak we wzorze: zielono-niebieskie stożki ze śniegiem, pierścień daleko za miastem */
const mountains = (B: Batch, night: boolean) => {
  const g = B.mat("mnt" + night, std({ color: night ? "#2f5f6e" : "#5f9a6a", emissive: night ? "#16323c" : "#000", emissiveIntensity: night ? 0.6 : 0, roughness: 1, flatShading: true }), false, false);
  const sn = B.mat("snow" + night, std({ color: "#eef4ff", emissive: night ? "#5a6a8a" : "#000", emissiveIntensity: night ? 0.5 : 0, flatShading: true }), false, false);
  const cone = new THREE.ConeGeometry(1, 1, 7);
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, R = 190 + (i % 3) * 25, h = 45 + ((i * 37) % 40), rr = 38 + ((i * 13) % 20), x = Math.cos(a) * R, z = -50 + Math.sin(a) * R;
    B.add(cone, g, M4(x, h / 2 - 2, z, 0, 0, 0, [rr, h, rr])); B.add(cone, sn, M4(x, h - 2 - h * 0.11, z, 0, 0, 0, [rr * 0.24, h * 0.24, rr * 0.24])); }
};

// ---------- drzewo, latarnia, ławka, kosz, hydrant, sygnalizacja ----------
const POLE = () => std({ color: "#23282b", metalness: 0.5, roughness: 0.4 });
const tree = (B: Batch, x: number, z: number, s: number, r: () => number) => {
  B.add(cyl, B.mat("trunk", std({ color: "#6b4a2e" })), M4(x, 0.9 * s, z, 0, 0, 0, [0.12 * s, 1.8 * s, 0.12 * s]));
  const a0 = r() < 0.5, leaf = B.mat("leaf" + a0, texMat(grassTex(a0 ? "#3f8f34" : "#4e9e3a"), { roughness: 0.95 }));
  for (let i = 0; i < 9; i++) { const a = i * 0.8 + r(), rr = i ? 0.45 + r() * 0.25 : 0, k = i ? 0.5 + r() * 0.15 : 0.75; B.add(sph, leaf, M4(x + Math.cos(a) * rr * s, (2.1 + (i ? r() * 0.7 - 0.1 : 0.5)) * s, z + Math.sin(a) * rr * s, 0, 0, 0, [k * s, k * 0.9 * s, k * s])); }
  B.add(wbox(0.9, 0.04, 0.9), B.mat("grate", std({ color: "#3a3a3a", metalness: 0.5 })), M4(x, 0.13, z));
};
const lamp = (B: Batch, x: number, z: number, side: number, night: boolean) => {
  const pole = B.mat("pole", POLE());
  B.add(cyl, pole, M4(x, 1.3, z, 0, 0, 0, [0.05, 2.6, 0.05])); B.add(cyl, pole, M4(x, 0.12, z, 0, 0, 0, [0.1, 0.24, 0.1]));
  B.add(wbox(0.6, 0.06, 0.06), pole, M4(x - side * 0.25, 2.58, z));
  B.add(wbox(0.3, 0.12, 0.2), pole, M4(x - side * 0.5, 2.55, z));
  B.add(wbox(0.24, 0.04, 0.16), B.mat("bulb" + night, std({ color: "#fff6d8", emissive: "#ffe9b0", emissiveIntensity: night ? 3 : 0.4 }), false, false), M4(x - side * 0.5, 2.48, z));
};
const bench = (B: Batch, x: number, z: number, ry: number) => {
  const wood = B.mat("benchWood", std({ color: "#8a5a32" })), iron = B.mat("pole", POLE());
  const b = M4(x, 0, z, ry), at = (px: number, py: number, pz: number, rx = 0) => b.clone().multiply(M4(px, py, pz, 0, rx));
  for (const k of [0, 1, 2]) B.add(wbox(1.3, 0.04, 0.1), wood, at(0, 0.36, -0.12 + k * 0.12));
  for (const k of [0, 1]) B.add(wbox(1.3, 0.1, 0.04), wood, at(0, 0.55 + k * 0.13, -0.2, -0.15));
  for (const sx of [-1, 1]) { B.add(wbox(0.05, 0.36, 0.4), iron, at(sx * 0.55, 0.18, 0)); B.add(wbox(0.05, 0.4, 0.05), iron, at(sx * 0.55, 0.55, -0.2)); }
};
const bin = (B: Batch, x: number, z: number) => { B.add(cyl, B.mat("bin", std({ color: "#e66a1c", roughness: 0.6 })), M4(x, 0.3, z, 0, 0, 0, [0.18, 0.6, 0.18])); B.add(cyl, B.mat("pole", POLE()), M4(x, 0.62, z, 0, 0, 0, [0.19, 0.04, 0.19])); };
const hydrant = (B: Batch, x: number, z: number) => { const m = B.mat("hydrant", std({ color: "#d42a2a", roughness: 0.5 })); B.add(cyl, m, M4(x, 0.37, z, 0, 0, 0, [0.1, 0.5, 0.1])); B.add(sph, m, M4(x, 0.62, z, 0, 0, 0, [0.1, 0.08, 0.1])); B.add(cyl, m, M4(x, 0.44, z, 0, 0, Math.PI / 2, [0.05, 0.3, 0.05])); };
const bollard = (B: Batch, x: number, z: number) => B.add(cyl, B.mat("bollard", std({ color: "#2b2f33", metalness: 0.4 })), M4(x, 0.42, z, 0, 0, 0, [0.06, 0.6, 0.06]));
const signal = (B: Batch, x: number, z: number, ry: number) => {
  const pole = B.mat("pole", POLE());
  B.add(cyl, pole, M4(x, 1.52, z, 0, 0, 0, [0.05, 2.8, 0.05])); const b = M4(x, 2.6, z, ry);
  B.add(wbox(0.28, 0.75, 0.2), B.mat("sigbox", std({ color: "#1b1d20" })), b);
  ["#e02020", "#f2b020", "#20c040"].forEach((c, i) => B.add(sph, B.mat("sig" + i, std({ color: c, emissive: c, emissiveIntensity: i === 2 ? 1.6 : 0.15 }), false, false), b.clone().multiply(M4(0, 0.22 - i * 0.22, 0.1, 0, 0, 0, [0.08, 0.08, 0.04]))));
};

/** auto w stylu Roblox — długość ~1.9 j. wzdłuż Z */
export const car = (color: string) => {
  const g = new THREE.Group(); const body = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: "#1d1d1d", roughness: 0.8 }), glass = new THREE.MeshStandardMaterial({ color: "#5d86a8", roughness: 0.08, metalness: 0.5 }), chrome = new THREE.MeshStandardMaterial({ color: "#d8dde2", roughness: 0.2, metalness: 0.9 });
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(0.86, 0.32, 1.9), body, 0, 0.3, 0);
  add(new THREE.BoxGeometry(0.76, 0.3, 1.0), body, 0, 0.6, -0.1);
  add(new THREE.BoxGeometry(0.78, 0.22, 0.02), glass, 0, 0.6, 0.41).rotation.x = -0.2;
  add(new THREE.BoxGeometry(0.78, 0.22, 0.02), glass, 0, 0.6, -0.61);
  for (const sx of [-1, 1]) { add(new THREE.BoxGeometry(0.02, 0.2, 0.42), glass, sx * 0.385, 0.6, 0.12); add(new THREE.BoxGeometry(0.02, 0.2, 0.38), glass, sx * 0.385, 0.6, -0.35); add(new THREE.BoxGeometry(0.03, 0.03, 0.12), chrome, sx * 0.44, 0.38, 0.05); add(new THREE.BoxGeometry(0.06, 0.06, 0.1), body, sx * 0.43, 0.62, 0.35); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { add(new THREE.CylinderGeometry(0.17, 0.17, 0.14, 20), dark, sx * 0.42, 0.17, sz * 0.6).rotation.z = Math.PI / 2; add(new THREE.CylinderGeometry(0.09, 0.09, 0.15, 12), chrome, sx * 0.42, 0.17, sz * 0.6).rotation.z = Math.PI / 2; }
  const hl = new THREE.MeshStandardMaterial({ color: "#fff8d0", emissive: "#fff3b0", emissiveIntensity: 0.8 }), tl = new THREE.MeshStandardMaterial({ color: "#d81e1e", emissive: "#a00", emissiveIntensity: 0.6 });
  for (const sx of [-1, 1]) { add(new THREE.BoxGeometry(0.18, 0.08, 0.02), hl, sx * 0.3, 0.36, 0.955); add(new THREE.BoxGeometry(0.18, 0.08, 0.02), tl, sx * 0.3, 0.36, -0.955); }
  add(new THREE.BoxGeometry(0.88, 0.08, 0.06), chrome, 0, 0.17, 0.96); add(new THREE.BoxGeometry(0.88, 0.08, 0.06), dark, 0, 0.17, -0.96);
  add(new THREE.BoxGeometry(0.3, 0.08, 0.02), new THREE.MeshStandardMaterial({ color: "#f4f4f4" }), 0, 0.26, 0.97);
  return g;
};

/** ważne miejsca: punkt na chodniku przed wejściem + obrót postaci przodem do ulicy */
export const SPOT = {
  doener: { x: 2.5, z: -6, rot: -Math.PI / 2 },
  post: { x: -2.5, z: -12, rot: Math.PI / 2 },
  schule: { x: 2.5, z: -18, rot: -Math.PI / 2 },
  rathaus: { x: -2.5, z: -24, rot: Math.PI / 2 },
  oma: { x: -2.5, z: 0, rot: Math.PI / 2 },
  kevin: { x: 2.5, z: 0, rot: -Math.PI / 2 },
  ich: { x: -2.5, z: -6, rot: Math.PI / 2 },
};
const SPECIAL: Record<string, Partial<BStyle> & { shop: Shop }> = {
  "-6:1": { shop: { text: "DÖNER", bg: "#d62b2b", fg: "#ffe14d", inner: 3 }, awning: "#d62b2b", mat: "plaster", color: "#efe3c8" },
  "-12:-1": { shop: { text: "POST", bg: "#ffd21f", fg: "#111" }, mat: "plaster", color: "#f2efe6" },
  "-18:1": { shop: { text: "SCHULE", bg: "#2f6fd6", fg: "#fff" }, floors: 3, mat: "brick", color: "#b5533a" },
  "-24:-1": { shop: { text: "RATHAUS", bg: "#f2efe6", fg: "#1a1a1a" }, floors: 4, mat: "plaster", color: "#e8dcc2", trim: "#ffffff" },
};
const SHOPS: Shop[] = [
  { text: "KIOSK", bg: "#1f8a4c", fg: "#fff" }, { text: "FRISEUR", bg: "#151515", fg: "#ffd34d" }, { text: "BÄCKEREI", bg: "#f6e7c6", fg: "#7a3b12" },
  { text: "HANDY SHOP", bg: "#e8312f", fg: "#fff" }, { text: "APOTHEKE", bg: "#ffffff", fg: "#d4142a" }, { text: "SPÄTI", bg: "#2b2b8f", fg: "#ffde3a" },
  { text: "PIZZA", bg: "#0f7a3a", fg: "#fff" }, { text: "SHISHA BAR", bg: "#3b1d4a", fg: "#ffb86b" }, { text: "BANK", bg: "#0d3f80", fg: "#fff" }, { text: "WETTBÜRO", bg: "#ffcc00", fg: "#111" },
];
const FACADES: Pick<BStyle, "mat" | "color" | "trim" | "base">[] = [
  { mat: "brick", color: "#a8442f", trim: "#efe9dc", base: "#5e5a55" }, { mat: "plaster", color: "#e9dcc0", trim: "#ffffff", base: "#8a8378" },
  { mat: "brick", color: "#8c3b2c", trim: "#d9d2c3", base: "#45423e" }, { mat: "plaster", color: "#b9d0e0", trim: "#f4f4f4", base: "#6d7680" },
  { mat: "plaster", color: "#f1c9a5", trim: "#ffffff", base: "#7b6a5c" }, { mat: "brick", color: "#c46a45", trim: "#f2eee4", base: "#5a4a40" },
  { mat: "plaster", color: "#d9e6c8", trim: "#ffffff", base: "#727a68" }, { mat: "brick", color: "#7a3328", trim: "#cfc6b4", base: "#3f3b38" },
];
const AWN = ["#2f7d4a", "#c0392b", "#2c5aa0", "#e0a020"];
export const CROSS_Z = -30;
/** park jak we wzorze (ref3_6): trawnik, brukowana alejka, fontanna z pomnikiem, drzewa, ławki — lewa strona, za skrzyżowaniem */
const PARK = new Set([-36, -42, -48]);
export const PARK_C = { x: -13, z: -42 };
const park = (B: Batch, r: () => number) => {
  const pav = B.mat("parkpav", texMat(paverTex("#8f8c86")), false, true), stone = B.mat("stone", texMat(plasterTex("#c9c6bd")));
  const lawn = B.mat("lawn", texMat(grassTex("#5aa83f")), false, true);
  B.add(wbox(26, 0.05, 19, 1.5), lawn, M4(-16.3, 0.02, -42));
  B.add(wbox(26, 0.07, 3.0, 1.0), pav, M4(-16.3, 0.04, -42));                 // alejka wzdłuż X
  B.add(wbox(3.0, 0.07, 19, 1.0), pav, M4(-18, 0.041, -42));                  // alejka wzdłuż Z
  for (const sz of [-1, 1]) B.add(wbox(26, 0.1, 0.12, 2), stone, M4(-16.3, 0.05, -42 + sz * 1.56));
  // fontanna z pomnikiem
  B.add(cyl, stone, M4(-18, 0.25, -42, 0, 0, 0, [2.2, 0.5, 2.2]));
  B.add(cyl, B.mat("water", std({ color: "#4f9fd8", roughness: 0.05, metalness: 0.3 }), false, true), M4(-18, 0.5, -42, 0, 0, 0, [2.0, 0.04, 2.0]));
  // fontanna piętrowa (jak we wzorze) zamiast wysokiego pomnika
  const water = B.mat("water", std({ color: "#4f9fd8", roughness: 0.05, metalness: 0.3 }), false, true);
  B.add(cyl, stone, M4(-18, 0.9, -42, 0, 0, 0, [0.22, 1.0, 0.22])); B.add(cyl, stone, M4(-18, 1.42, -42, 0, 0, 0, [0.95, 0.14, 0.95])); B.add(cyl, water, M4(-18, 1.5, -42, 0, 0, 0, [0.85, 0.04, 0.85]));
  B.add(cyl, stone, M4(-18, 1.85, -42, 0, 0, 0, [0.13, 0.75, 0.13])); B.add(cyl, stone, M4(-18, 2.22, -42, 0, 0, 0, [0.5, 0.1, 0.5])); B.add(cyl, water, M4(-18, 2.28, -42, 0, 0, 0, [0.42, 0.03, 0.42]));
  B.add(sph, water, M4(-18, 2.5, -42, 0, 0, 0, [0.1, 0.22, 0.1]));
  const iron = B.mat("pole", POLE());
  const fence = (x0: number, z0: number, x1: number, z1: number) => { const L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (const y of [0.25, 0.85]) B.add(wbox(L, 0.05, 0.05), iron, M4(cx, y, cz, ry));
    for (let k = 0; k <= L / 0.18; k++) { const t = k * 0.18 / L; B.add(wbox(0.025, 0.8, 0.025), iron, M4(x0 + (x1 - x0) * t, 0.5, z0 + (z1 - z0) * t)); }
    for (let k = 0; k <= L / 2.4; k++) { const t = k * 2.4 / L; B.add(wbox(0.08, 1.0, 0.08), iron, M4(x0 + (x1 - x0) * t, 0.5, z0 + (z1 - z0) * t)); } };
  fence(-3.45, -33.4, -16.4, -33.4); fence(-19.6, -33.4, -29.2, -33.4); fence(-3.45, -33.4, -3.45, -40.4); fence(-3.45, -43.6, -3.45, -51.4);
  for (const x of [-7.5, -11.8, -24, -28]) for (const sz of [-1, 1]) tree(B, x, -42 + sz * 3.3, 1.0 + r() * 0.2, r);   // szpaler wzdłuż alejki
  for (let i = 0; i < 30; i++) { const x = -5 - r() * 22, z = -33.5 - r() * 17; if (Math.abs(z + 42) < 2.4 || Math.abs(x + 18) < 2.6) continue; tree(B, x, z, 0.9 + r() * 0.4, r); }
  for (const x of [-8, -13, -23, -27]) for (const sz of [-1, 1]) bench(B, x, -42 + sz * 2.1, sz < 0 ? 0 : Math.PI);
  for (const x of [-6, -10, -14.5, -22, -26]) for (const sz of [-1, 1]) lamp(B, x, -42 + sz * 1.8, 1, false);
  for (const z of [-36, -48]) for (const sx of [-1, 1]) lamp(B, -18 + sx * 1.8, z, sx, false);
  for (const z of [-37.5, -46.5]) for (const sx of [-1, 1]) bench(B, -18 + sx * 2.1, z, sx < 0 ? -Math.PI / 2 : Math.PI / 2);
  for (const x of [-9, -21]) for (const sz of [-1, 1]) bin(B, x, -42 + sz * 1.75);
  for (let i = 0; i < 40; i++) { const x = -5 - r() * 22, z = -33.5 - r() * 17; if (Math.abs(z + 42) < 2 || Math.abs(x + 18) < 2) continue;
    B.add(sph, B.mat("bush", texMat(grassTex("#3d8a30"), { roughness: 0.95 })), M4(x, 0.2, z, 0, 0, 0, [0.45, 0.35, 0.45])); }
  const fl = ["#e84a6a", "#ffd23f", "#ffffff", "#9b59d6"];
  for (let i = 0; i < 60; i++) { const x = -5 - r() * 22, z = -42 + (r() < 0.5 ? -1 : 1) * (1.9 + r() * 0.6); B.add(sph, B.mat("fl" + (i % 4), std({ color: fl[i % 4] })), M4(x, 0.08, z, 0, 0, 0, [0.07, 0.07, 0.07])); }
};

export const buildTown = (light: LightPreset = "day") => {
  const night = light === "night", B = new Batch(), r = rng(42);
  B.add(wbox(400, 0.02, 400, 4), B.mat("grass", texMat(grassTex())), M4(0, -0.02, -60));
  const asph = B.mat("asph", texMat(asphaltTex()), false, true);
  B.add(wbox(3.7, 0.04, 150, 4), asph, M4(0, 0, -45)); B.add(wbox(160, 0.04, 3.7, 4), asph, M4(0, 0.002, CROSS_Z));
  const yel = B.mat("yel", std({ color: "#f2c230", roughness: 0.6 }), false, true), wht = B.mat("wht", std({ color: "#f2f2ee", roughness: 0.6 }), false, true);
  for (let z = 25; z > -120; z -= 2.4) if (Math.abs(z - CROSS_Z) > 3) B.add(wbox(0.1, 0.012, 1.3), yel, M4(0, 0.025, z));
  for (const sx of [-1, 1]) B.add(wbox(0.06, 0.01, 150), wht, M4(sx * 1.65, 0.025, -45));
  for (let x = -1.5; x <= 1.5; x += 0.5) for (const dz of [-2.6, 2.6]) B.add(wbox(0.3, 0.012, 1.1), wht, M4(x, 0.03, CROSS_Z + dz));
  const pav = B.mat("parkpav", texMat(paverTex("#8f8c86")), false, true), curb = B.mat("curb", texMat(plasterTex("#a9a9a4")));
  for (const sx of [-1, 1]) {
    for (const [z0, z1] of [[25, CROSS_Z + 1.85], [CROSS_Z - 1.85, -120]]) {
      const L = z0 - z1, zc = (z0 + z1) / 2;
      B.add(wbox(1.45, 0.12, L, 1.6), pav, M4(sx * 2.575, 0.06, zc)); B.add(wbox(0.16, 0.14, L, 2), curb, M4(sx * 1.85, 0.07, zc));
    }
    B.add(wbox(160, 0.12, 1.45, 1.6), pav, M4(0, 0.059, CROSS_Z + sx * 2.575));
  }
  let hi = 0;
  for (let z = 18; z > -114; z -= 6) for (const side of [-1, 1] as const) {
    if (z === CROSS_Z || (side < 0 && PARK.has(z))) continue;
    const sp = SPECIAL[`${z}:${side}`], f = FACADES[(hi * 5 + (side > 0 ? 3 : 0)) % FACADES.length], D = 7;
    const shop = sp?.shop ?? (hi % 3 !== 2 ? SHOPS[(hi * 3 + (side > 0 ? 1 : 0)) % SHOPS.length] : undefined);
    const st = { ...f, floors: 3 + ((hi * 7 + (side > 0 ? 2 : 0)) % 3), shop, awning: shop && hi % 2 === 0 ? AWN[hi % 4] : undefined, ...(sp ?? {}) } as BStyle;
    const base = M4(side * (3.3 + D / 2), 0, z, side < 0 ? Math.PI / 2 : -Math.PI / 2).multiply(M4(0, 0, D / 2));
    building(B, base, 6, D, st, hi * 13 + 5, night); hi++;
  }
  let v = 0;
  // małe miasteczko jak we wzorze (zamiast wieżowców): domki z dwuspadowymi dachami, duże drzewa, góry na horyzoncie
  for (const sx of [-1, 1]) for (let z = 12; z > -150; z -= 7) { if (sx < 0 && z < -26 && z > -58) continue; const w = 5 + r() * 2.5, d = 5 + r() * 2;
    house(B, sx * (15 + w / 2 + r() * 3), z, w, d, 1 + Math.floor(r() * 2), v++, night); if (r() < 0.6) tree(B, sx * (12.5 + r() * 1.5), z - 3.5, 1.4 + r() * 0.5, r);
    if (r() < 0.7) house(B, sx * (27 + r() * 6), z + 3, 5 + r() * 2, 5, 1 + Math.floor(r() * 2), v++, night); }
  for (let z = -14; z > -74; z -= 8) for (const k of [0, 1, 2]) { if (Math.abs(z - CROSS_Z) < 5) continue; house(B, -38 - k * 10 - r() * 3, z + k * 3, 5 + r() * 2, 5 + r() * 2, 1 + (k + v) % 2, v++, night); tree(B, -34 - k * 10, z + 4, 1.5 + r() * 0.6, r); }
  for (let x = -40; x <= 40; x += 9) house(B, x + r() * 3, -128 - r() * 8, 6, 6, 2, v++, night);
  mountains(B, night);
  for (let z = 20; z > -112; z -= 8) for (const sx of [-1, 1]) if (Math.abs(z + sx * 2 - CROSS_Z) > 3) lamp(B, sx * 2.05, z + sx * 2, sx, night);
  for (let z = 16; z > -112; z -= 12) for (const sx of [-1, 1]) if (Math.abs(z - sx * 3 - CROSS_Z) > 4 && !(sx < 0 && z > -24) && !(sx < 0 && Math.abs(z + 3 + 42) < 5)) tree(B, sx * 2.35, z - sx * 3, 0.8 + r() * 0.2, r);
  for (let z = 12; z > -100; z -= 24) for (const sx of [-1, 1]) bench(B, sx * 2.95, z + sx * 5, sx < 0 ? Math.PI / 2 : -Math.PI / 2);
  for (let z = 9; z > -100; z -= 18) for (const sx of [-1, 1]) bin(B, sx * 2.1, z + sx * 1.3);
  park(B, r);
  hydrant(B, 2.1, -3.3); hydrant(B, -2.1, -15.5); hydrant(B, 2.1, -40);
  for (const sx of [-1, 1]) for (const dz of [-2.4, 2.4]) { bollard(B, sx * 2.0, CROSS_Z + dz * 1.3); signal(B, sx * 2.1, CROSS_Z + dz * 1.1, dz > 0 ? 0 : Math.PI); }
  const root = B.build();
  const cols = ["#3fae4a", "#d94a3a", "#3b74d6", "#f2c230", "#f4f4f4", "#7a4fc9", "#222428"];
  let ci = 0;
  for (let z = 3; z > -90; z -= 9) for (const sx of [-1, 1]) { if ((ci++ % 3) === 1 || Math.abs(z + sx * 3 - CROSS_Z) < 4 || (sx < 0 && z > -12)) continue; const c = car(cols[ci % cols.length]); c.position.set(sx * 1.2, 0.02, z + sx * 3); c.rotation.y = sx < 0 ? 0 : Math.PI; root.add(c); }
  return root;
};

export const SKY = { top: "#3f8fe0", mid: "#8cc0ea", horizon: "#d4e6f2" };
export const SKIES: Record<LightPreset, typeof SKY> = {
  day: SKY,
  dusk: { top: "#3b3f8f", mid: "#e98a6b", horizon: "#ffcf8f" },
  night: { top: "#060b1c", mid: "#14204a", horizon: "#2a3866" },
};
const LIGHT: Record<LightPreset, { hemi: [string, string, number]; sun: [string, number]; sunPos: [number, number, number]; rim: [string, number]; fog: [number, number] }> = {
  day:   { hemi: ["#dbe9ff", "#8a8070", 1.7], sun: ["#fff2dc", 3.1], sunPos: [10, 30, 10], rim: ["#cfe6ff", 1.1], fog: [80, 280] },
  dusk:  { hemi: ["#ffb08a", "#3a4a6a", 0.7], sun: ["#ff9a5a", 2.0], sunPos: [-20, 8, -30], rim: ["#ffcf9a", 1.4], fog: [40, 160] },
  night: { hemi: ["#9a8ccc", "#5a3a26", 1.0], sun: ["#e6c9f2", 0.85], sunPos: [-10, 30, -20], rim: ["#ffb98a", 1.0], fog: [70, 330] },
};

/** całe miasto + światło. Kamera i postacie z zewnątrz. */
export const Town: React.FC<{ kit?: TownKit; light?: LightPreset; center?: [number, number] }> = ({ light = "day", center = [0, -12] }) => {
  const L = LIGHT[light], sky = SKIES[light];
  const town = useMemo(() => buildTown(light), [light]);
  const sun = useMemo(() => {
    const d = new THREE.DirectionalLight(L.sun[0], L.sun[1]); d.position.set(L.sunPos[0] + center[0], L.sunPos[1], L.sunPos[2] + center[1]); d.castShadow = true;
    d.shadow.mapSize.set(4096, 4096); const c = d.shadow.camera as THREE.OrthographicCamera;
    c.left = -30; c.right = 30; c.top = 30; c.bottom = -30; c.near = 1; c.far = 100; d.shadow.bias = -0.0004; d.shadow.normalBias = 0.03;
    d.target.position.set(center[0], 0, center[1]); return d;
  }, [light, center[0], center[1]]);
  const bg = useMemo(() => skyTex(sky.top, sky.mid, sky.horizon, light === "night" ? 0 : 1), [light]);
  return (
    <>
      <primitive attach="background" object={bg} />
      <fog attach="fog" args={[sky.horizon, L.fog[0], L.fog[1]]} />
      <hemisphereLight args={L.hemi} />
      <directionalLight color={L.rim[0]} intensity={L.rim[1]} position={[-6, 8, -14]} />
      <primitive object={sun} />
      <primitive object={sun.target} />
      <primitive object={town} />
    </>
  );
};
