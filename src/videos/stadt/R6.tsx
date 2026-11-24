// Postać w stylu Roblox R6 (v2, poziom detali jak u wzoru): zaokrąglone klocki na pivotach, głowa-walec jak w Roblox,
// ubrania z tekstur (bluza ze sznurkami/kieszenią/nadrukiem, garnitur, fartuch, mundur…), buty, twarze 512 px, akcesoria.
// Animacja to czysta funkcja czasu t (sekundy) → deterministyczna przy każdym fps.
import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";

export type Face = "smile" | "grin" | "sad" | "evil" | "shock" | "angry" | "smug" | "wink" | "happy" | "cry";
export type Hat = "none" | "cap" | "capBack" | "tophat" | "hair" | "bun" | "beanie" | "postcap" | "party" | "chef" | "longhair" | "spiky" | "sidepart" | "curly" | "ponytail" | "bob" | "fade";
export type Cloth = "tee" | "hoodie" | "suit" | "apron" | "uniform" | "stripes" | "cardigan" | "blouse" | "tank";
export type Acc = "glasses" | "bag" | "headphones" | "chain" | "medal" | "pearls" | "watch";
export type R6Look = {
  skin?: string; hair?: string; shirt: string; pants: string; shoes?: string; face?: Face; hat?: Hat; hatColor?: string; hatAccent?: string;
  cloth?: Cloth; accent?: string; print?: string; acc?: Acc[]; bareArms?: boolean;
  /** v3: otwarta kurtka (kolor), pasek (kolor | false = brak), zarost (kolor), podeszwa butów */
  jacket?: string; belt?: string | false; beard?: string; sole?: string;
  /** zgodność wstecz */ shirtDetail?: "none" | "tie" | "apron" | "bag" | "stripes"; detailColor?: string;
};
export type R6Pose = {
  walk?: number; walkSpeed?: number; wave?: number; armsUp?: number; point?: number; phone?: number;
  talk?: number; shake?: number; jump?: number;
  dance?: number;   // 0..1 taniec (ręce na zmianę, biodra)
  pushup?: number;  // 0..1 pompki (całe ciało poziomo)
  facepalm?: number;// 0..1 ręka na twarzy
  headScratch?: number; // 0..1 ręka za głową (pewna siebie poza)
  cross?: number;   // 0..1 ręce skrzyżowane
  lean?: number;    // pochylenie do przodu (rad)
};

export const STUD = 0.2;
const S = STUD;

// ---------- tekstury ----------
const texCache = new Map<string, THREE.CanvasTexture>();
// deterministyczny szum: każdy proces renderu rysuje identyczne tekstury (brak migotania na szwach kawałków)
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const hashKey = (k: string) => { let h = 2166136261; for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619); return (h >>> 0) % 2147483646 + 1; };
const canvasTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const hit = texCache.get(key); if (hit) return hit;
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!;
  seed = hashKey(key); draw(g); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; texCache.set(key, t); return t;
};

function faceTexture(face: Face) {
  // 1024×512: twarz zajmuje środek (decal owinięty na ~150° walca głowy)
  return canvasTex("face2:" + face, 1024, 512, (g) => {
    const cx = 512, k = 1.55; // skala rysunku
    g.fillStyle = "#151515"; g.strokeStyle = "#151515"; g.lineCap = "round"; g.lineJoin = "round";
    const eye = (x: number, y: number, rx = 17, ry = 34) => { g.beginPath(); g.ellipse(cx + x * k, y, rx * k / 1.55 * 1.2, ry * k / 1.55 * 1.2, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.ellipse(cx + x * k - 4, y - 14, 5, 7, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#151515"; };
    const brow = (x1: number, y1: number, x2: number, y2: number) => { g.lineWidth = 15; g.beginPath(); g.moveTo(cx + x1 * k, y1); g.lineTo(cx + x2 * k, y2); g.stroke(); };
    const openMouth = (y: number, w: number, h: number, tongue = true) => {
      g.beginPath(); g.moveTo(cx - w, y); g.quadraticCurveTo(cx, y + h * 2, cx + w, y); g.closePath(); g.fill();
      if (tongue) { g.save(); g.clip(); g.fillStyle = "#e8505b"; g.beginPath(); g.ellipse(cx + 6, y + h * 1.05, w * 0.55, h * 0.45, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
      g.fillStyle = "#fff"; g.fillRect(cx - w * 0.75, y + 2, w * 1.5, 12); g.fillStyle = "#151515";
    };
    g.translate(512, 250); g.scale(1.38, 1.38); g.translate(-512, -262); // twarz większa, jak we wzorze
    g.lineWidth = 14;
    const EY = 215, L = -46, R = 46;
    const arch = (lift = 0) => { g.lineWidth = 17; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(cx + sx * 26 * k, 160 - lift); g.quadraticCurveTo(cx + sx * 48 * k, 140 - lift, cx + sx * 70 * k, 156 - lift); g.stroke(); } g.lineWidth = 14; };
    if (["smile", "happy", "grin", "wink", "cry"].includes(face)) arch(face === "happy" || face === "grin" ? 8 : 0);
    switch (face) {
      case "shock": eye(L, EY, 20, 38); eye(R, EY, 20, 38); g.beginPath(); g.ellipse(cx, 340, 30, 40, 0, 0, Math.PI * 2); g.fill(); brow(-70, 140, -25, 150); brow(70, 140, 25, 150); break;
      case "wink": eye(L, EY); g.lineWidth = 15; g.beginPath(); g.moveTo(cx + 30 * k, EY - 22); g.lineTo(cx + 58 * k, EY + 2); g.lineTo(cx + 30 * k, EY + 22); g.stroke(); openMouth(300, 92, 48); break;
      case "happy": eye(L, EY); eye(R, EY); openMouth(298, 96, 52); break;
      case "grin": eye(L, EY); eye(R, EY); g.beginPath(); g.moveTo(cx - 100, 290); g.quadraticCurveTo(cx, 400, cx + 100, 290); g.closePath(); g.fill();
        g.fillStyle = "#fff"; g.fillRect(cx - 78, 296, 156, 22); g.fillStyle = "#151515"; break;
      case "sad": eye(L, EY); eye(R, EY); g.beginPath(); g.arc(cx, 395, 62, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke(); brow(-75, 160, -30, 145); brow(75, 160, 30, 145); break;
      case "cry": eye(L, EY); eye(R, EY); g.beginPath(); g.arc(cx, 395, 62, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke();
        g.fillStyle = "#49a8ff"; for (const x of [L, R]) { g.beginPath(); g.ellipse(cx + x * k, 300, 13, 40, 0, 0, Math.PI * 2); g.fill(); } g.fillStyle = "#151515"; break;
      case "evil": brow(-90, 150, -30, 180); brow(90, 150, 30, 180); eye(L, EY + 8, 17, 28); eye(R, EY + 8, 17, 28); g.beginPath(); g.arc(cx, 250, 85, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke(); break;
      case "angry": brow(-95, 145, -28, 182); brow(95, 145, 28, 182); eye(L, EY + 10, 17, 28); eye(R, EY + 10, 17, 28);
        g.beginPath(); g.arc(cx, 400, 62, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); g.fillStyle = "rgba(230,40,40,0.25)"; g.fillRect(cx - 160, 260, 320, 60); g.fillStyle = "#151515"; break;
      case "smug": eye(L, EY + 4, 17, 26); eye(R, EY + 4, 17, 26); g.fillStyle = "#151515"; brow(-80, 160, -25, 158); brow(80, 150, 25, 160);
        g.beginPath(); g.moveTo(cx - 60, 320); g.quadraticCurveTo(cx + 30, 345, cx + 85, 290); g.stroke(); break;
      default: eye(L, EY); eye(R, EY); g.beginPath(); g.arc(cx, 245, 80, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    }
  });
}

const shade = (hex: string, f: number) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return "#" + c.getHexString(); };

/** przód tułowia 512×512 */
function clothTexture(cloth: Cloth, base: string, accent: string, print?: string, jacket?: string) {
  return canvasTex(`cloth2:${cloth}:${base}:${accent}:${print ?? ""}:${jacket ?? ""}`, 512, 512, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    // delikatna tkanina: winieta + szum
    const gr = g.createRadialGradient(256, 220, 60, 256, 256, 380); gr.addColorStop(0, "rgba(255,255,255,0.06)"); gr.addColorStop(1, "rgba(0,0,0,0.16)");
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "255,255,255"},0.035)`; g.fillRect(rnd() * 512, rnd() * 512, 2, 2); }
    const dark = shade(base, 0.72);
    const printText = (y: number, size: number, col = accent) => {
      if (!print) return; g.save(); g.font = `900 ${size}px 'Cooper Black','Arial Rounded MT Bold','Arial Black',sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
      let s = size; while (g.measureText(print).width > 440 && s > 20) { s -= 2; g.font = `900 ${s}px 'Cooper Black','Arial Rounded MT Bold','Arial Black',sans-serif`; }
      g.lineWidth = 6; g.strokeStyle = shade(base, 0.5); g.strokeText(print, 256, y); g.fillStyle = col; g.fillText(print, 256, y); g.restore();
    };
    switch (cloth) {
      case "hoodie": {
        g.fillStyle = dark; g.beginPath(); g.ellipse(256, 0, 150, 70, 0, 0, Math.PI); g.fill(); // kaptur/dekolt
        g.fillStyle = shade(base, 0.85); g.beginPath(); g.roundRect(118, 352, 276, 130, 30); g.fill(); g.strokeStyle = dark; g.lineWidth = 5; g.stroke(); // kieszeń kangurka
        g.strokeStyle = accent; g.lineWidth = 11; for (const x of [212, 300]) { g.beginPath(); g.moveTo(x, 55); g.bezierCurveTo(x - 6, 120, x + 8, 150, x, 190); g.stroke();
          g.fillStyle = "#d9d9d9"; g.fillRect(x - 8, 186, 16, 26); } // sznurki z końcówkami
        printText(282, 66);
        if (base !== "#1e1e22") { g.fillStyle = accent; } if (base !== "#1e1e22") for (let i = 0; i < 16; i++) { const x = 40 + ((i * 97) % 430), y = 230 + ((i * 53) % 110); star(g, x, y, 6); }
        g.fillStyle = shade(base, 0.6); g.fillRect(0, 488, 512, 24); // ściągacz
        break;
      }
      case "tee": g.fillStyle = dark; g.beginPath(); g.ellipse(256, 0, 120, 52, 0, 0, Math.PI); g.fill(); printText(250, 70); break;
      case "tank": g.fillStyle = "rgba(0,0,0,0)"; g.clearRect(0, 0, 130, 512); g.clearRect(382, 0, 130, 512); printText(260, 60); break;
      case "stripes": for (let y = 60; y < 512; y += 110) { g.fillStyle = accent; g.fillRect(0, y, 512, 46); } g.fillStyle = dark; g.beginPath(); g.ellipse(256, 0, 120, 52, 0, 0, Math.PI); g.fill(); break;
      case "suit": {
        g.fillStyle = "#f4f4f4"; g.beginPath(); g.moveTo(170, 0); g.lineTo(342, 0); g.lineTo(256, 300); g.closePath(); g.fill();
        g.fillStyle = accent; g.beginPath(); g.moveTo(240, 30); g.lineTo(272, 30); g.lineTo(284, 250); g.lineTo(256, 290); g.lineTo(228, 250); g.closePath(); g.fill();
        g.fillStyle = shade(accent, 0.7); g.beginPath(); g.moveTo(236, 0); g.lineTo(276, 0); g.lineTo(266, 34); g.lineTo(246, 34); g.closePath(); g.fill();
        g.strokeStyle = shade(base, 1.8); g.lineWidth = 6; g.beginPath(); g.moveTo(165, 0); g.lineTo(256, 320); g.lineTo(347, 0); g.stroke();
        g.fillStyle = "#d4af37"; for (const y of [360, 430]) { g.beginPath(); g.arc(256, y, 13, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "#fff"; g.fillRect(372, 120, 70, 14); break; // poszetka
      }
      case "apron": {
        g.fillStyle = dark; g.beginPath(); g.ellipse(256, 0, 120, 52, 0, 0, Math.PI); g.fill();
        g.fillStyle = accent; g.beginPath(); g.roundRect(105, 120, 302, 392, 26); g.fill();
        g.strokeStyle = shade(accent, 0.7); g.lineWidth = 8; g.beginPath(); g.moveTo(130, 120); g.lineTo(150, 0); g.moveTo(382, 120); g.lineTo(362, 0); g.stroke();
        g.fillStyle = shade(accent, 0.82); g.beginPath(); g.roundRect(170, 330, 172, 100, 14); g.fill(); printText(230, 54, "#fff"); break;
      }
      case "uniform": {
        g.fillStyle = dark; g.beginPath(); g.moveTo(160, 0); g.lineTo(256, 90); g.lineTo(352, 0); g.closePath(); g.fill();
        g.fillStyle = shade(base, 0.85); g.fillRect(90, 170, 110, 90); g.fillRect(312, 170, 110, 90);
        g.fillStyle = accent; g.beginPath(); g.roundRect(330, 120, 80, 40, 6); g.fill();
        g.fillStyle = "#222"; for (let y = 120; y < 500; y += 80) { g.beginPath(); g.arc(256, y, 9, 0, Math.PI * 2); g.fill(); }
        printText(400, 58, accent); break;
      }
      case "cardigan": {
        g.fillStyle = shade(base, 1.25); g.beginPath(); g.moveTo(190, 0); g.lineTo(256, 230); g.lineTo(322, 0); g.closePath(); g.fill();
        g.strokeStyle = dark; g.lineWidth = 7; g.beginPath(); g.moveTo(190, 0); g.lineTo(256, 230); g.lineTo(256, 512); g.moveTo(322, 0); g.lineTo(256, 230); g.stroke();
        g.fillStyle = accent; for (let y = 270; y < 500; y += 65) { g.beginPath(); g.arc(275, y, 11, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = shade(base, 0.85); g.fillRect(80, 330, 100, 90); g.fillRect(332, 330, 100, 90);
        for (let y = 20; y < 512; y += 18) { g.fillStyle = "rgba(0,0,0,0.05)"; g.fillRect(0, y, 512, 6); } break;
      }
      case "blouse": {
        g.fillStyle = "#fff"; g.beginPath(); g.moveTo(150, 0); g.lineTo(256, 70); g.lineTo(362, 0); g.lineTo(330, 0); g.lineTo(256, 110); g.lineTo(182, 0); g.closePath(); g.fill();
        g.fillStyle = accent; g.beginPath(); g.arc(256, 140, 18, 0, Math.PI * 2); g.fill(); printText(320, 50); break;
      }
    }
    // szwy boczne i zagniecenia (każde ubranie)
    g.strokeStyle = "rgba(0,0,0,0.13)"; g.lineWidth = 3;
    for (const x of [14, 498]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
    g.strokeStyle = "rgba(0,0,0,0.07)"; g.lineWidth = 5;
    for (const [x, y, l] of [[150, 430, 70], [330, 450, 60], [210, 470, 40]]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 12, x + l, y + 4); g.stroke(); }
    if (jacket) { // otwarta kurtka: poły, klapy, zamek, przeszycia, kieszenie, ściągacz
      const jd = shade(jacket, 0.7), jl = shade(jacket, 1.18);
      for (const sd of [-1, 1]) {
        const xo = sd < 0 ? 0 : 512, xe = sd < 0 ? 168 : 344, xb = sd < 0 ? 150 : 362;
        g.fillStyle = jacket; g.beginPath(); g.moveTo(xo, 0); g.lineTo(xe, 0); g.lineTo(xb, 512); g.lineTo(xo, 512); g.closePath(); g.fill();
        g.fillStyle = jl; g.beginPath(); g.moveTo(xe, 0); g.lineTo(sd < 0 ? 110 : 402, 0); g.lineTo(xb, 160); g.closePath(); g.fill();
        g.strokeStyle = jd; g.lineWidth = 6; g.beginPath(); g.moveTo(xe, 0); g.lineTo(xb, 512); g.stroke();
        g.strokeStyle = "#c9c9c9"; g.lineWidth = 4; g.setLineDash([10, 6]); g.beginPath(); g.moveTo(xe - sd * 8, 10); g.lineTo(xb - sd * 7, 505); g.stroke(); g.setLineDash([]);
        g.fillStyle = jd; g.beginPath(); g.roundRect(sd < 0 ? 24 : 392, 330, 96, 16, 4); g.fill();
        g.strokeStyle = "rgba(255,255,255,0.25)"; g.lineWidth = 2; g.setLineDash([6, 6]); g.strokeRect(sd < 0 ? 22 : 390, 328, 100, 20); g.setLineDash([]);
      }
      g.fillStyle = jd; g.fillRect(0, 486, 152, 26); g.fillRect(360, 486, 152, 26);
    }
  });
}
/** tył tułowia (karczek, szum, ściągacz bluzy) */
const backTexture = (base: string, hood: boolean) => canvasTex(`back:${base}:${hood}`, 256, 256, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,255,255,0.05)"); gr.addColorStop(1, "rgba(0,0,0,0.16)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "255,255,255"},0.04)`; g.fillRect(rnd() * 256, rnd() * 256, 2, 2); }
  g.strokeStyle = "rgba(0,0,0,0.15)"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 48); g.quadraticCurveTo(128, 66, 256, 48); g.stroke();
  if (hood) { g.fillStyle = shade(base, 0.8); g.fillRect(0, 236, 256, 20); }
});
function star(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill();
}
const legTexture = (pants: string, shoes: string) => canvasTex(`leg2:${pants}:${shoes}`, 128, 256, (g) => {
  g.fillStyle = pants; g.fillRect(0, 0, 128, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,255,255,0.05)"); gr.addColorStop(1, "rgba(0,0,0,0.14)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "255,255,255"},0.05)`; g.fillRect(rnd() * 128, rnd() * 256, 2, 2); }
  g.strokeStyle = "rgba(0,0,0,0.22)"; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 206); g.stroke();
  g.strokeStyle = "rgba(255,230,160,0.35)"; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(57, 0); g.lineTo(57, 206); g.stroke(); g.setLineDash([]);
  g.strokeStyle = "rgba(0,0,0,0.22)"; g.lineWidth = 4; g.beginPath(); g.moveTo(10, 8); g.quadraticCurveTo(24, 40, 50, 46); g.stroke();
  g.strokeStyle = "rgba(0,0,0,0.1)"; g.lineWidth = 4; for (const y of [118, 146]) { g.beginPath(); g.moveTo(20, y); g.quadraticCurveTo(64, y + 10, 108, y); g.stroke(); }
  g.fillStyle = shade(pants, 0.78); g.fillRect(0, 192, 128, 16);
  g.fillStyle = shoes; g.fillRect(0, 208, 128, 48);
});
const sleeveTexture = (shirt: string, skin: string, bare: boolean, short: boolean) => canvasTex(`arm2:${shirt}:${skin}:${bare}:${short}`, 128, 256, (g) => {
  g.fillStyle = bare ? skin : shirt; g.fillRect(0, 0, 128, 256);
  if (bare) return;
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "255,255,255"},0.05)`; g.fillRect(rnd() * 128, rnd() * 256, 2, 2); }
  if (short) { g.fillStyle = shade(shirt, 0.82); g.fillRect(0, 74, 128, 12); g.fillStyle = skin; g.fillRect(0, 86, 128, 170); return; }
  g.strokeStyle = "rgba(0,0,0,0.12)"; g.lineWidth = 4; for (const y of [108, 126]) { g.beginPath(); g.moveTo(16, y); g.quadraticCurveTo(64, y + 12, 112, y); g.stroke(); }
  g.strokeStyle = "rgba(0,0,0,0.13)"; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 188); g.stroke();
  g.fillStyle = shade(shirt, 0.65); g.fillRect(0, 188, 128, 26); g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 195); g.lineTo(128, 195); g.stroke();
  g.fillStyle = skin; g.fillRect(0, 214, 128, 42);
});
const starTex = (col: string) => canvasTex("star:" + col, 128, 128, (g) => { g.fillStyle = col; star(g, 64, 64, 54); });
const stripeTex = (a: string, b: string) => canvasTex(`pstripe:${a}:${b}`, 256, 64, (g) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 32, 0, 32, 64); } g.fillStyle = "#fff"; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(rnd() * 256, rnd() * 64, 3, 0, 7); g.fill(); }
});

// ---------- geometria głowy Roblox (walec z zaokrągleniami) ----------
const HEAD_R = S * 0.62, HEAD_H = S * 1.22, HEAD_C = S * 0.24;
let headGeo: THREE.LatheGeometry | null = null, faceGeo: THREE.CylinderGeometry | null = null;
const getHead = () => {
  if (!headGeo) {
    const pts: THREE.Vector2[] = [], h = HEAD_H / 2;
    pts.push(new THREE.Vector2(0, -h));
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * Math.PI / 2; pts.push(new THREE.Vector2(HEAD_R - HEAD_C + Math.cos(a) * HEAD_C, -h + HEAD_C + Math.sin(a) * HEAD_C)); }
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; pts.push(new THREE.Vector2(HEAD_R - HEAD_C + Math.cos(a) * HEAD_C, h - HEAD_C + Math.sin(a) * HEAD_C)); }
    pts.push(new THREE.Vector2(0, h));
    headGeo = new THREE.LatheGeometry(pts, 48);
    // decal twarzy: wycinek walca 180° z przodu (theta liczona od +Z)
    faceGeo = new THREE.CylinderGeometry(HEAD_R * 1.004, HEAD_R * 1.004, HEAD_H - HEAD_C * 1.6, 48, 1, true, -Math.PI / 2, Math.PI);
  }
  return { headGeo, faceGeo: faceGeo! };
};

const Mat: React.FC<{ color?: string; map?: THREE.Texture; rough?: number; emissive?: string }> = ({ color = "#fff", map, rough = 0.5, emissive }) =>
  <meshStandardMaterial color={map ? "#fff" : color} map={map ?? null} roughness={rough} metalness={0} emissive={emissive ?? "#000"} emissiveIntensity={emissive ? 0.6 : 0} />;

/** klocek z fazą + tekstura na przedniej ścianie (decal) */
const Block: React.FC<{ size: [number, number, number]; color: string; front?: THREE.Texture; side?: THREE.Texture; pos?: [number, number, number] }> =
  ({ size, color, front, side, pos = [0, 0, 0] }) => (
    <group position={pos}>
      <RoundedBox args={size} radius={S * 0.06} smoothness={3} castShadow receiveShadow><Mat color={color} /></RoundedBox>
      {front && <mesh position={[0, 0, size[2] / 2 + 0.0015]}><planeGeometry args={[size[0] - S * 0.04, size[1] - S * 0.04]} /><meshStandardMaterial map={front} roughness={0.6} transparent /></mesh>}
      {side && [-1, 1].map((sd) => <mesh key={sd} position={[sd * (size[0] / 2 + 0.0015), 0, 0]} rotation={[0, sd * Math.PI / 2, 0]}>
        <planeGeometry args={[size[2] - S * 0.04, size[1] - S * 0.04]} /><meshStandardMaterial map={side} roughness={0.6} /></mesh>)}
      {side && [1, -1].map((sd) => <mesh key={"f" + sd} position={[0, 0, sd * (size[2] / 2 + 0.0015)]} rotation={[0, sd < 0 ? Math.PI : 0, 0]}>
        <planeGeometry args={[size[0] - S * 0.04, size[1] - S * 0.04]} /><meshStandardMaterial map={side} roughness={0.6} /></mesh>)}
    </group>
  );

const Hat: React.FC<{ hat: Hat; color: string; accent: string }> = ({ hat, color, accent }) => {
  const r = HEAD_R, top = HEAD_H / 2;
  switch (hat) {
    case "cap": case "capBack": { const back = hat === "capBack" ? Math.PI : 0; return <group position={[0, top - S * 0.2, 0]} rotation={[0, back, 0]}>
      <mesh castShadow scale={[1, 0.62, 1]}><sphereGeometry args={[r * 1.07, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color={color} /></mesh>
      <mesh castShadow position={[0, S * 0.02, r * 1.05]} rotation={[0.12, 0, 0]}><cylinderGeometry args={[r * 0.75, r * 0.75, S * 0.04, 32, 1, false, -Math.PI / 2, Math.PI]} /><Mat color={shade(color, 0.85)} /></mesh>
      <mesh position={[0, r * 0.66, 0]}><sphereGeometry args={[S * 0.06, 12, 8]} /><Mat color={accent} /></mesh>
      <mesh position={[0, r * 0.3, r * 0.98]} rotation={[-0.35, 0, 0]}><planeGeometry args={[S * 0.4, S * 0.4]} /><meshStandardMaterial map={starTex(accent)} transparent /></mesh></group>; }
    case "beanie": return <group position={[0, top - S * 0.28, 0]}>
      <mesh castShadow scale={[1, 1.05, 1]}><sphereGeometry args={[r * 1.09, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color={color} rough={0.9} /></mesh>
      <mesh castShadow><cylinderGeometry args={[r * 1.12, r * 1.12, S * 0.28, 40]} /><Mat color={shade(color, 0.9)} rough={0.9} /></mesh>
      {Array.from({ length: 20 }, (_, i) => <mesh key={i} rotation={[0, (i / 20) * Math.PI * 2, 0]}><boxGeometry args={[S * 0.02, S * 0.27, r * 2.25]} /><Mat color={shade(color, 0.78)} rough={0.9} /></mesh>)}
      <mesh position={[0, S * 0.0, r * 1.125]}><planeGeometry args={[S * 0.3, S * 0.3]} /><meshStandardMaterial map={starTex(accent)} transparent /></mesh></group>;
    case "party": return <group position={[0, top + S * 0.25, 0]} rotation={[0, 0, 0.15]}>
      <mesh castShadow><coneGeometry args={[S * 0.38, S * 0.95, 32, 1, true]} /><meshStandardMaterial map={stripeTex(color, accent)} side={THREE.DoubleSide} roughness={0.5} /></mesh>
      <mesh position={[0, S * 0.5, 0]}><sphereGeometry args={[S * 0.1, 12, 10]} /><Mat color="#fff" rough={0.9} /></mesh></group>;
    case "chef": return <group position={[0, top + S * 0.05, 0]}>
      <mesh castShadow><cylinderGeometry args={[r * 0.95, r * 0.95, S * 0.4, 32]} /><Mat color="#fafafa" /></mesh>
      {[0, 1, 2, 3, 4].map((i) => <mesh key={i} castShadow position={[Math.cos(i * 1.256) * r * 0.5, S * 0.35, Math.sin(i * 1.256) * r * 0.5]}><sphereGeometry args={[r * 0.55, 16, 12]} /><Mat color="#fafafa" /></mesh>)}</group>;
    case "postcap": return <group position={[0, top - S * 0.05, 0]}>
      <mesh castShadow><cylinderGeometry args={[r * 1.1, r * 1.05, S * 0.3, 32]} /><Mat color={color} /></mesh>
      <mesh castShadow position={[0, -S * 0.12, r * 0.95]} rotation={[0.25, 0, 0]}><cylinderGeometry args={[r * 0.7, r * 0.7, S * 0.03, 32, 1, false, -Math.PI / 2, Math.PI]} /><Mat color="#151515" /></mesh>
      <mesh position={[0, 0, r * 1.09]}><planeGeometry args={[S * 0.34, S * 0.17]} /><meshStandardMaterial map={postHorn()} transparent /></mesh></group>;
    case "tophat": return <group position={[0, top, 0]}>
      <mesh castShadow><cylinderGeometry args={[r * 1.5, r * 1.5, S * 0.05, 40]} /><Mat color={color} rough={0.35} /></mesh>
      <mesh castShadow position={[0, S * 0.42, 0]}><cylinderGeometry args={[r * 0.95, r * 0.9, S * 0.8, 40]} /><Mat color={color} rough={0.35} /></mesh>
      <mesh position={[0, S * 0.12, 0]}><cylinderGeometry args={[r * 0.915, r * 0.915, S * 0.14, 40]} /><Mat color={accent} /></mesh></group>;
    case "hair": return <group position={[0, top - S * 0.3, -S * 0.02]}>
      <mesh castShadow scale={[1, 0.75, 1]}><sphereGeometry args={[r * 1.1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color={color} rough={0.75} /></mesh>
      <mesh castShadow position={[0, S * 0.02, 0]}><cylinderGeometry args={[r * 1.1, r * 1.1, S * 0.12, 32, 1, false, Math.PI * 0.25, Math.PI * 1.5]} /><Mat color={color} rough={0.75} /></mesh>
      {[-0.35, 0, 0.35].map((x) => <mesh key={x} castShadow position={[x * r, S * 0.08, r * 0.95]} rotation={[0.5, 0, x]}><coneGeometry args={[S * 0.13, S * 0.28, 8]} /><Mat color={color} rough={0.75} /></mesh>)}</group>;
    case "spiky": return <group position={[0, top - S * 0.3, -S * 0.02]}>
      <mesh castShadow scale={[1, 0.8, 1]}><sphereGeometry args={[r * 1.1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color={color} rough={0.7} /></mesh>
      <mesh castShadow position={[0, S * 0.02, 0]}><cylinderGeometry args={[r * 1.1, r * 1.1, S * 0.16, 32, 1, false, Math.PI * 0.3, Math.PI * 1.4]} /><Mat color={color} rough={0.7} /></mesh>
      {[[-0.55,0.15,0.75,0.9,0.2],[-0.2,0.2,0.85,0.75,0.05],[0.2,0.2,0.85,0.75,-0.1],[0.55,0.15,0.75,0.9,-0.25],[-0.4,0.42,0.3,0.35,0.35],[0.05,0.48,0.35,0.3,0],[0.45,0.42,0.3,0.35,-0.35],[-0.3,0.4,-0.35,-0.3,0.4],[0.3,0.4,-0.35,-0.3,-0.4],[0,0.45,-0.05,0,0.1],[-0.75,0.1,0.1,0.2,0.9],[0.75,0.1,0.1,0.2,-0.9]].map(([x,y,z,rx,rz],i) =>
        <mesh key={i} castShadow position={[x * r, S * 0.05 + y * r, z * r]} rotation={[rx, 0, rz]}><coneGeometry args={[S * 0.3, S * 0.8, 7]} /><Mat color={i % 2 ? shade(color, 1.12) : color} rough={0.7} /></mesh>)}</group>;
    case "longhair": return <group position={[0, top - S * 0.3, -S * 0.02]}>
      <mesh castShadow scale={[1, 0.75, 1]}><sphereGeometry args={[r * 1.12, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color={color} rough={0.75} /></mesh>
      <mesh castShadow position={[0, -S * 0.45, -r * 0.35]}><boxGeometry args={[r * 2.3, S * 1.0, r * 1.4]} /><Mat color={color} rough={0.75} /></mesh></group>;
    case "sidepart": return <group position={[0, top - S * 0.3, -S * 0.02]}>
      <mesh castShadow scale={[1, 0.78, 1]}><sphereGeometry args={[r * 1.1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color={color} rough={0.6} /></mesh>
      <mesh castShadow position={[0, S * 0.02, 0]}><cylinderGeometry args={[r * 1.1, r * 1.1, S * 0.14, 32, 1, false, Math.PI * 0.25, Math.PI * 1.5]} /><Mat color={color} rough={0.6} /></mesh>
      <RoundedBox args={[r * 1.7, S * 0.2, S * 0.5]} radius={S * 0.08} castShadow position={[r * 0.12, S * 0.2, r * 0.72]} rotation={[0.25, 0, -0.16]}><Mat color={shade(color, 1.1)} rough={0.55} /></RoundedBox>
      <mesh position={[-r * 0.42, S * 0.33, r * 0.2]} rotation={[0.1, 0, 0]}><boxGeometry args={[S * 0.025, S * 0.02, r * 1.5]} /><Mat color={shade(color, 0.6)} rough={0.9} /></mesh></group>;
    case "curly": return <group position={[0, top - S * 0.3, -S * 0.02]}>
      <mesh castShadow scale={[1, 0.8, 1]}><sphereGeometry args={[r * 1.1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color={color} rough={0.9} /></mesh>
      {Array.from({ length: 26 }, (_, i) => { const a = i * 2.39996, k = (i + 0.5) / 26, el = Math.asin(k) * 0.95, rr = r * 1.08;
        if (Math.cos(a) > 0.55 && el < 0.45) return null; // czoło wolne
        return <mesh key={i} castShadow position={[Math.sin(a) * Math.cos(el) * rr, Math.sin(el) * rr * 0.8 + S * 0.02, Math.cos(a) * Math.cos(el) * rr]}>
          <sphereGeometry args={[S * (0.2 + (i % 3) * 0.03), 12, 10]} /><Mat color={i % 2 ? shade(color, 1.15) : color} rough={0.9} /></mesh>; })}</group>;
    case "ponytail": return <group position={[0, top - S * 0.3, -S * 0.02]}>
      <mesh castShadow scale={[1, 0.75, 1]}><sphereGeometry args={[r * 1.1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color={color} rough={0.7} /></mesh>
      <mesh castShadow position={[0, S * 0.02, 0]}><cylinderGeometry args={[r * 1.1, r * 1.1, S * 0.2, 32, 1, false, Math.PI * 0.3, Math.PI * 1.4]} /><Mat color={color} rough={0.7} /></mesh>
      <mesh position={[0, S * 0.12, -r * 1.08]}><torusGeometry args={[S * 0.13, S * 0.045, 8, 20]} /><Mat color={accent} /></mesh>
      <mesh castShadow position={[0, -S * 0.32, -r * 1.25]} rotation={[0.28, 0, 0]}><capsuleGeometry args={[S * 0.15, S * 0.75, 6, 12]} /><Mat color={color} rough={0.7} /></mesh>
      {[-0.32, 0, 0.32].map((x) => <mesh key={x} castShadow position={[x * r, S * 0.1, r * 0.98]} rotation={[0.9, 0, x * 0.6]}><boxGeometry args={[S * 0.3, S * 0.08, S * 0.22]} /><Mat color={color} rough={0.7} /></mesh>)}</group>;
    case "bob": return <group position={[0, top - S * 0.3, -S * 0.02]}>
      <mesh castShadow scale={[1, 0.78, 1]}><sphereGeometry args={[r * 1.13, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color={color} rough={0.6} /></mesh>
      <mesh castShadow position={[0, -S * 0.32, 0]}><cylinderGeometry args={[r * 1.13, r * 1.2, S * 0.72, 40, 1, false, Math.PI * 0.32, Math.PI * 1.36]} /><Mat color={color} rough={0.6} /></mesh>
      <RoundedBox args={[r * 1.8, S * 0.18, S * 0.3]} radius={S * 0.07} castShadow position={[0, S * 0.08, r * 0.93]} rotation={[0.35, 0, 0]}><Mat color={shade(color, 1.08)} rough={0.6} /></RoundedBox></group>;
    case "fade": return <group position={[0, top - S * 0.3, -S * 0.02]}>
      <mesh castShadow scale={[1, 0.62, 1]}><sphereGeometry args={[r * 1.07, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color={color} rough={0.8} /></mesh>
      <mesh position={[0, -S * 0.02, 0]}><cylinderGeometry args={[r * 1.035, r * 1.03, S * 0.22, 40, 1, false, Math.PI * 0.27, Math.PI * 1.46]} /><Mat color={shade(color, 1.45)} rough={0.95} /></mesh>
      <mesh position={[0, S * 0.14, r * 0.86]} rotation={[0.55, 0, 0]}><boxGeometry args={[r * 1.3, S * 0.07, S * 0.18]} /><Mat color={color} rough={0.8} /></mesh></group>;
    case "bun": return <group position={[0, top - S * 0.25, 0]}>
      <mesh castShadow scale={[1, 0.7, 1]}><sphereGeometry args={[r * 1.1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color={color} rough={0.8} /></mesh>
      <mesh castShadow position={[0, S * 0.42, -S * 0.12]}><sphereGeometry args={[S * 0.3, 20, 14]} /><Mat color={color} rough={0.8} /></mesh>
      <mesh position={[0, S * 0.4, -S * 0.12]} rotation={[0.3, 0, 0]}><torusGeometry args={[S * 0.27, S * 0.035, 8, 24]} /><Mat color={shade(color, 0.8)} rough={0.8} /></mesh></group>;
    default: return null;
  }
};
/** włosy wystające spod czapki (jak we wzorze: brąz na bokach i z tyłu, baki) */
const HairUnder: React.FC<{ color: string }> = ({ color }) => {
  const r = HEAD_R;
  return <group>
    <mesh castShadow position={[0, S * 0.3, 0]}><cylinderGeometry args={[r * 1.05, r * 1.05, S * 0.34, 40, 1, false, Math.PI * 0.3, Math.PI * 1.4]} /><Mat color={color} rough={0.8} /></mesh>
    {[-1, 1].map((sx) => <mesh key={sx} castShadow position={[sx * r * 0.86, S * 0.14, r * 0.56]} rotation={[0, sx * 0.99, 0]}><boxGeometry args={[S * 0.2, S * 0.36, S * 0.06]} /><Mat color={color} rough={0.8} /></mesh>)}
    {[-0.5, -0.17, 0.17, 0.5].map((x) => <mesh key={x} castShadow position={[x * r * 1.1, S * 0.37, r * 0.99]} rotation={[0.25, 0, -x * 0.5]}><boxGeometry args={[S * 0.24, S * 0.12, S * 0.08]} /><Mat color={color} rough={0.8} /></mesh>)}
  </group>;
};

const postHorn = () => canvasTex("posthorn", 128, 64, (g) => { g.fillStyle = "#ffd21f"; g.fillRect(0, 0, 128, 64); g.strokeStyle = "#111"; g.lineWidth = 7;
  g.beginPath(); g.arc(70, 32, 16, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(54, 32); g.lineTo(22, 20); g.lineTo(22, 44); g.closePath(); g.fillStyle = "#111"; g.fill(); });

const Accessory: React.FC<{ a: Acc; color: string }> = ({ a, color }) => {
  const r = HEAD_R;
  switch (a) {
    case "glasses": return <group position={[0, S * 0.12, r * 1.02]}>
      {[-1, 1].map((s) => <mesh key={s} position={[s * S * 0.2, 0, 0]}><torusGeometry args={[S * 0.13, S * 0.022, 8, 24]} /><Mat color="#1b1b1b" /></mesh>)}
      <mesh><boxGeometry args={[S * 0.14, S * 0.025, S * 0.02]} /><Mat color="#1b1b1b" /></mesh></group>;
    case "headphones": return <group>
      <mesh position={[0, HEAD_H / 2 - S * 0.02, 0]} rotation={[0, 0, 0]}><torusGeometry args={[r * 1.12, S * 0.05, 8, 32, Math.PI]} /><Mat color="#222" /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * r * 1.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[S * 0.22, S * 0.22, S * 0.14, 24]} /><Mat color={color} /></mesh>)}</group>;
    default: return null;
  }
};

const Hand: React.FC<{ skin: string }> = () => null;

export const R6: React.FC<{ look: R6Look; pose?: R6Pose; t: number; position?: [number, number, number]; rotY?: number; scale?: number; children?: React.ReactNode }> =
({ look, pose = {}, t, position = [0, 0, 0], rotY = 0, scale = 1, children }) => {
  const skin = look.skin ?? "#f0c39c";
  const cloth: Cloth = look.cloth ?? (look.shirtDetail === "tie" ? "suit" : look.shirtDetail === "apron" ? "apron" : look.shirtDetail === "stripes" ? "stripes" : look.shirtDetail === "bag" ? "uniform" : "tee");
  const accent = look.accent ?? look.detailColor ?? "#ffd23f";
  const acc = look.acc ?? (look.shirtDetail === "bag" ? ["bag" as Acc] : []);
  const faceTex = useMemo(() => faceTexture(look.face ?? "smile"), [look.face]);
  const torsoTex = useMemo(() => clothTexture(cloth, look.shirt, accent, look.print, look.jacket), [cloth, look.shirt, accent, look.print, look.jacket]);
  const backTex = useMemo(() => backTexture(look.jacket ?? look.shirt, cloth === "hoodie"), [look.jacket, look.shirt, cloth]);
  const sleeve = look.jacket ?? look.shirt, shortSleeve = !!look.bareArms && !look.jacket && ["tee", "stripes", "uniform", "blouse"].includes(cloth);
  const belt = look.belt === false ? null : look.belt ?? (["tee", "stripes", "suit", "uniform", "tank"].includes(cloth) ? "#2a1f18" : null);
  const shoes = look.shoes ?? "#2b2b2b";
  const legTex = useMemo(() => legTexture(look.pants, look.shoes ?? "#2b2b2b"), [look.pants, look.shoes]);
  const armTex = useMemo(() => sleeveTexture(sleeve, skin, (!!look.bareArms && !shortSleeve && !look.jacket) || (cloth === "tank" && !look.jacket), shortSleeve), [sleeve, skin, look.bareArms, cloth, shortSleeve, look.jacket]);
  const { headGeo, faceGeo } = getHead();

  const w = pose.walk ?? 0, ws = pose.walkSpeed ?? 1.8, ph = t * ws * Math.PI * 2;
  const swing = Math.sin(ph) * 0.75 * w;
  const dance = pose.dance ?? 0, dph = t * 2.2 * Math.PI * 2;
  const bob = Math.abs(Math.sin(ph)) * 0.035 * w + Math.abs(Math.sin(t * 9)) * 0.15 * (pose.jump ?? 0) + Math.abs(Math.sin(dph)) * 0.04 * dance;
  const shake = (pose.shake ?? 0) * Math.sin(t * 55) * 0.05 + Math.sin(dph) * 0.12 * dance;
  const talk = (pose.talk ?? 0) * (Math.sin(t * 13) * 0.07 + Math.sin(t * 7.3) * 0.05);
  const up = pose.armsUp ?? 0;
  let rArmX = -swing - up * 2.8, rArmZ = up * 0.25, lArmX = swing - up * 2.8, lArmZ = -up * 0.25;
  if (dance) { rArmX = rArmX * (1 - dance) - (1.6 + Math.sin(dph) * 1.2) * dance; lArmX = lArmX * (1 - dance) - (1.6 - Math.sin(dph) * 1.2) * dance; rArmZ += 0.3 * dance; lArmZ -= 0.3 * dance; }
  if (pose.point) { rArmX = rArmX * (1 - pose.point) - 1.5 * pose.point; }
  if (pose.wave) { rArmX = rArmX * (1 - pose.wave) - 2.9 * pose.wave; rArmZ = rArmZ * (1 - pose.wave) + (0.35 + Math.sin(t * 12) * 0.35) * pose.wave; }
  if (pose.phone) { rArmX = rArmX * (1 - pose.phone) - 2.2 * pose.phone; rArmZ = rArmZ * (1 - pose.phone) - 0.55 * pose.phone; }
  if (pose.facepalm) { rArmX = rArmX * (1 - pose.facepalm) - 2.5 * pose.facepalm; rArmZ = rArmZ * (1 - pose.facepalm) - 0.85 * pose.facepalm; }
  if (pose.headScratch) { const h = pose.headScratch; rArmX = rArmX * (1 - h) - 3.35 * h; rArmZ = rArmZ * (1 - h) - 0.55 * h; }
  if (pose.cross) { const c = pose.cross; rArmX = rArmX * (1 - c) - 1.2 * c; lArmX = lArmX * (1 - c) - 1.2 * c; rArmZ = rArmZ * (1 - c) - 0.9 * c; lArmZ = lArmZ * (1 - c) + 0.9 * c; }
  // pompki: ciało poziomo, ręce prostopadle do ziemi, uginanie
  const pu = pose.pushup ?? 0, puY = (Math.sin(t * 5) * 0.5 + 0.5);
  const bodyPitch = pu * (Math.PI / 2 - 0.12 - puY * 0.1) + (pose.lean ?? 0);
  if (pu) { rArmX = rArmX * (1 - pu) - (Math.PI / 2 + 0.1) * pu - puY * 0.4 * pu; lArmX = rArmX; rArmZ *= 1 - pu; lArmZ *= 1 - pu; }
  const legLen = S * 2;

  return (
    <group position={[position[0], position[1] + bob + pu * (S * 0.6 + puY * S * 0.35), position[2]]} rotation={[0, rotY, shake]} scale={scale}>
      <group rotation={[bodyPitch, 0, 0]} position={[0, pu * -S * 0.5, 0]}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * S * 0.5, legLen, 0]} rotation={[s * swing + (dance ? Math.sin(dph + s) * 0.2 * dance : 0), 0, 0]}>
            <Block size={[S * 0.98, legLen, S * 0.98]} color={look.pants} side={legTex} pos={[0, -S, 0]} />
            <RoundedBox args={[S * 1.04, S * 0.3, S * 1.2]} radius={S * 0.07} smoothness={2} castShadow position={[0, -legLen + S * 0.2, S * 0.1]}><Mat color={shoes} rough={0.55} /></RoundedBox>
            <RoundedBox args={[S * 1.08, S * 0.09, S * 1.26]} radius={S * 0.03} smoothness={2} castShadow position={[0, -legLen + S * 0.045, S * 0.1]}><Mat color={look.sole ?? "#efefef"} rough={0.7} /></RoundedBox>
            <mesh position={[0, -legLen + S * 0.27, S * 0.705]}><boxGeometry args={[S * 0.5, S * 0.03, S * 0.02]} /><Mat color={shade(shoes, 0.55)} /></mesh>
          </group>))}
        <group position={[0, S * 3, 0]}>
          <Block size={[S * 2, S * 2, S]} color={look.jacket ?? look.shirt} front={torsoTex} />
          <mesh position={[0, 0, -S / 2 - 0.0015]} rotation={[0, Math.PI, 0]}><planeGeometry args={[S * 1.96, S * 1.96]} /><meshStandardMaterial map={backTex} roughness={0.6} /></mesh>
          {belt && <group position={[0, -S * 0.9, 0]}>
            <RoundedBox args={[S * 2.04, S * 0.15, S * 1.04]} radius={S * 0.03} smoothness={2} castShadow><Mat color={belt} rough={0.45} /></RoundedBox>
            <mesh position={[0, 0, S * 0.525]}><boxGeometry args={[S * 0.3, S * 0.2, S * 0.03]} /><meshStandardMaterial color="#d9b84a" metalness={0.85} roughness={0.3} /></mesh>
            <mesh position={[0, 0, S * 0.545]}><boxGeometry args={[S * 0.18, S * 0.09, S * 0.02]} /><Mat color={belt} /></mesh></group>}
          {["suit", "uniform", "blouse"].includes(cloth) && !look.jacket && [-1, 1].map((sx) => <mesh key={sx} castShadow position={[sx * S * 0.27, S * 0.97, S * 0.42]} rotation={[0.45, 0, sx * 0.4]}>
            <boxGeometry args={[S * 0.42, S * 0.07, S * 0.3]} /><Mat color={cloth === "uniform" ? shade(look.shirt, 0.85) : "#f7f7f7"} /></mesh>)}
          {(cloth === "hoodie" || look.jacket) && <RoundedBox args={[S * 1.55, S * 0.42, S * 0.42]} radius={S * 0.15} smoothness={3} castShadow position={[0, S * 0.98, -S * 0.3]}>
            <Mat color={shade(look.jacket ?? look.shirt, 0.92)} rough={0.8} /></RoundedBox>}
          {acc.includes("pearls") && Array.from({ length: 11 }, (_, i) => { const a = Math.PI * (0.1 + 0.8 * i / 10);
            return <mesh key={i} position={[Math.cos(a) * S * 0.42, S * 0.98 - Math.sin(a) * S * 0.38, S * 0.53]}><sphereGeometry args={[S * 0.055, 10, 8]} /><meshStandardMaterial color="#f6f1e6" roughness={0.2} metalness={0.1} /></mesh>; })}
          {acc.includes("bag") && <group>
            <mesh rotation={[0, 0, 0.75]} position={[0, 0, S * 0.52]}><boxGeometry args={[S * 0.2, S * 2.65, S * 0.03]} /><Mat color="#5a3a1a" rough={0.8} /></mesh>
            <RoundedBox args={[S * 0.6, S * 0.9, S * 1.0]} radius={S * 0.08} position={[S * 1.25, -S * 0.9, S * 0.15]} castShadow><Mat color={accent} rough={0.8} /></RoundedBox></group>}
          {acc.includes("chain") && <mesh position={[0, S * 0.45, S * 0.53]} rotation={[0, 0, Math.PI]}><torusGeometry args={[S * 0.45, S * 0.04, 8, 24, Math.PI]} /><meshStandardMaterial color="#e8c240" metalness={0.9} roughness={0.25} /></mesh>}
          {acc.includes("medal") && <mesh position={[0, S * 0.1, S * 0.53]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[S * 0.18, S * 0.18, S * 0.04, 24]} /><meshStandardMaterial color="#e8c240" metalness={0.9} roughness={0.25} /></mesh>}
        </group>
        <group position={[-S * 1.5, S * 3.75, 0]} rotation={[rArmX, 0, -rArmZ]}>
          <Block size={[S * 0.98, S * 2, S * 0.98]} color={look.jacket ? look.jacket : look.bareArms && !shortSleeve ? skin : look.shirt} side={armTex} pos={[0, -S * 0.75, 0]} />
          {(pose.phone ?? 0) > 0.3 && <RoundedBox args={[S * 0.55, S * 0.08, S * 0.95]} radius={S * 0.03} position={[0, -S * 1.85, S * 0.35]}><Mat color="#1a1a1a" rough={0.2} /></RoundedBox>}
          {children}
        </group>
        <group position={[S * 1.5, S * 3.75, 0]} rotation={[lArmX, 0, -lArmZ]}>
          <Block size={[S * 0.98, S * 2, S * 0.98]} color={look.jacket ? look.jacket : look.bareArms && !shortSleeve ? skin : look.shirt} side={armTex} pos={[0, -S * 0.75, 0]} />
          {acc.includes("watch") && <group position={[0, -S * 1.33, 0]}>
            <mesh><boxGeometry args={[S * 1.02, S * 0.13, S * 1.02]} /><Mat color="#262626" rough={0.6} /></mesh>
            <mesh position={[0, 0, S * 0.52]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[S * 0.17, S * 0.17, S * 0.05, 20]} /><meshStandardMaterial color="#d9d9d9" metalness={0.9} roughness={0.25} /></mesh></group>}
        </group>
        <group position={[0, S * 4.62, 0]} rotation={[talk, talk * 0.6, 0]}>
          <mesh geometry={headGeo} castShadow receiveShadow><Mat color={skin} rough={0.45} /></mesh>
          <mesh geometry={faceGeo}><meshStandardMaterial map={faceTex} transparent roughness={0.5} depthWrite={false} polygonOffset polygonOffsetFactor={-2} /></mesh>
          <mesh position={[0, -HEAD_H / 2 - S * 0.04, 0]}><cylinderGeometry args={[S * 0.3, S * 0.3, S * 0.12, 16]} /><Mat color={skin} /></mesh>
          {look.beard && <group>
            <mesh castShadow position={[0, -HEAD_H / 2 + S * 0.13, 0]}><cylinderGeometry args={[HEAD_R * 1.03, HEAD_R * 1.0, S * 0.2, 40, 1, false, -Math.PI * 0.42, Math.PI * 0.84]} /><Mat color={look.beard} rough={0.95} /></mesh>
            {[-1, 1].map((sx) => <mesh key={sx} castShadow position={[sx * HEAD_R * 0.9, -S * 0.12, HEAD_R * 0.42]} rotation={[0, sx * 1.1, 0]}><boxGeometry args={[S * 0.16, S * 0.42, S * 0.05]} /><Mat color={look.beard} rough={0.95} /></mesh>)}</group>}
          {look.hair && ["cap", "capBack", "beanie", "postcap", "party", "chef", "tophat"].includes(look.hat ?? "none") && <HairUnder color={look.hair} />}
          <Hat hat={look.hat ?? "none"} color={look.hatColor ?? "#333"} accent={look.hatAccent ?? accent} />
          {acc.filter((a) => a === "glasses" || a === "headphones").map((a) => <Accessory key={a} a={a} color={accent} />)}
        </group>
      </group>
    </group>
  );
};
void Hand;

// Stała obsada Hinterhausen (własne projekty, nie kopie postaci wzoru)
export const CAST: Record<string, R6Look> = {
  ich:    { skin: "#f0c39c", hair: "#5a3820", shirt: "#f4f4f4", pants: "#26324f", shoes: "#f2f2f2", face: "wink", hat: "cap", hatColor: "#d8302a", hatAccent: "#f4f4f4", cloth: "tee", accent: "#d8302a", bareArms: true },
  kevin:  { skin: "#f3cba4", hair: "#2a1a10", shirt: "#3cba54", pants: "#333",    face: "grin",  hat: "beanie", hatColor: "#f08c1a", hatAccent: "#fff", cloth: "stripes", accent: "#2a8a3e", acc: ["headphones"], jacket: "#2e4a7a", shoes: "#e8e8e8", sole: "#f08c1a" },
  oma:    { skin: "#f2d2b0", shirt: "#b88ad6", pants: "#7b5a9a", shoes: "#5a3b2b", face: "smug", hat: "bun", hatColor: "#dcdce4", cloth: "cardigan", accent: "#f4e2a1", acc: ["glasses", "pearls"] },
  murat:  { skin: "#d9a066", hair: "#1c1410", beard: "#1c1410", shirt: "#f4f4f4", pants: "#3b3b3b", shoes: "#1d1d1d", face: "evil",  hat: "chef", cloth: "apron", accent: "#d94040", print: "DÖNER" },
  post:   { skin: "#e8b68c", hair: "#3a2416", shirt: "#ffd21f", pants: "#1d2a5c", face: "smug",  hat: "postcap", hatColor: "#ffd21f", cloth: "uniform", accent: "#1d2a5c", print: "POST", acc: ["bag"] },
  mayor:  { skin: "#f2d2b0", hair: "#b9b9b9", beard: "#c4c4c4", shirt: "#23232f", pants: "#23232f", shoes: "#111", face: "grin",  hat: "tophat", hatColor: "#111", hatAccent: "#c21d1d", cloth: "suit", accent: "#c21d1d", acc: ["chain", "watch"] },
  lehrerin: { skin: "#f5d6b0", shirt: "#2f9fa8", pants: "#33415c", face: "evil", hat: "longhair", hatColor: "#c9862e", cloth: "blouse", accent: "#e8c240", acc: ["glasses"] },
  extra1: { skin: "#a8744a", shirt: "#f06aa7", pants: "#2b2b6b", face: "angry", hat: "curly", hatColor: "#111", cloth: "tee", accent: "#fff", print: "NEIN", shoes: "#f2f2f2", sole: "#e04a7a" },
  extra2: { skin: "#f1c6a0", hair: "#7a4a24", shirt: "#7cc3f5", pants: "#444",    face: "angry", hat: "cap", hatColor: "#222", cloth: "hoodie", accent: "#fff" },
  extra3: { skin: "#e0b48a", shirt: "#f5a623", pants: "#2e5e3a", face: "angry", hat: "fade", hatColor: "#2a1a10", beard: "#2a1a10", cloth: "tank", accent: "#222", bareArms: true, shoes: "#3a3a3a", acc: ["watch"] },
};
