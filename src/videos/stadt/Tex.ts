// Proceduralne tekstury (canvas) w stylu materiałów Roblox: cegła, tynk, bruk, asfalt, trawa, szkło wieżowca, deski, farba, niebo.
// Deterministyczne (stałe ziarno) — każda klatka renderu identyczna.
import * as THREE from "three";

export const rng = (seed: number) => { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const cache = new Map<string, THREE.CanvasTexture>();
export const ctex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void) => {
  let t = cache.get(key);
  if (!t) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!;
    let hsh = 7; for (const ch of key) hsh = (hsh * 31 + ch.charCodeAt(0)) % 100000;
    draw(g, rng(hsh + 1));
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; cache.set(key, t);
  }
  return t;
};
/** kopia tekstury z własnym powtórzeniem (współdzieli obraz) */
export const rep = (t: THREE.Texture, rx: number, ry: number) => { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };

const shade = (hex: string, k: number) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, k); return "#" + c.getHexString(); };
const noise = (g: CanvasRenderingContext2D, r: () => number, w: number, h: number, n: number, a: number, size = 2) => {
  for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${a * r()})` : `rgba(255,255,255,${a * r()})`; g.fillRect(r() * w, r() * h, size, size); }
};

/** cegła: 1 kafel = 2×2 j. świata */
export const brickTex = (color: string) => ctex("brick" + color, 512, 512, (g, r) => {
  g.fillStyle = shade(color, 0.12); g.fillRect(0, 0, 512, 512);              // fuga
  const bw = 64, bh = 26;
  for (let y = 0, row = 0; y < 512; y += bh, row++) for (let x = -(row % 2) * bw / 2; x < 512; x += bw) {
    const k = (r() - 0.5) * 0.1 - (r() < 0.07 ? 0.08 : 0);
    g.fillStyle = shade(color, k); g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(x + 2, y + bh - 5, bw - 4, 3);
    g.fillStyle = "rgba(255,255,255,0.07)"; g.fillRect(x + 2, y + 2, bw - 4, 2);
  }
  noise(g, r, 512, 512, 5000, 0.12);
});
export const plasterTex = (color: string) => ctex("plaster" + color, 256, 256, (g, r) => {
  g.fillStyle = color; g.fillRect(0, 0, 256, 256); noise(g, r, 256, 256, 6000, 0.06, 1.5);
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(0,0,0,${0.03 * r()})`; g.beginPath(); g.arc(r() * 256, r() * 256, 6 + r() * 20, 0, 7); g.fill(); }
});
/** chodnik: jodełka (herringbone) jak bruk z Roblox, 1 kafel = 1.6 j. */
export const paverTex = (color = "#b9b5ac") => ctex("paver" + color, 512, 512, (g, r) => {
  g.fillStyle = shade(color, -0.22); g.fillRect(0, 0, 512, 512);
  const u = 32;
  for (let i = -16; i < 32; i++) for (let j = -16; j < 32; j++) {
    const x = (i - j) * u, y = (i + j) * u;
    for (const [dx, dy, w, h] of [[0, 0, 2 * u, u], [u * 2, -u, u, 2 * u]] as const) {
      const X = ((x + dx) % 512 + 512) % 512, Y = ((y + dy) % 512 + 512) % 512;
      g.fillStyle = shade(color, (r() - 0.5) * 0.09);
      for (const ox of [0, -512]) for (const oy of [0, -512]) { g.fillRect(X + ox + 2, Y + oy + 2, w - 4, h - 4); }
    }
  }
  noise(g, r, 512, 512, 4000, 0.1);
});
export const asphaltTex = () => ctex("asphalt", 512, 512, (g, r) => {
  g.fillStyle = "#3b3e43"; g.fillRect(0, 0, 512, 512); noise(g, r, 512, 512, 22000, 0.18, 2);
  for (let i = 0; i < 12; i++) { g.strokeStyle = "rgba(20,20,22,0.35)"; g.lineWidth = 1.5; g.beginPath(); let x = r() * 512, y = r() * 512; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); }
});
export const grassTex = (color = "#4f9a3a") => ctex("grass" + color, 512, 512, (g, r) => {
  g.fillStyle = color; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { g.fillStyle = shade(color, (r() - 0.5) * 0.14); g.fillRect(r() * 512, r() * 512, 2, 4 + r() * 4); }
});
/** wieżowiec: siatka okien. Kafel = 4 piętra × 4 okna; kolor szyb, ramy, losowo zapalone */
export const towerTex = (glass: string, frame: string, lit = 0.08) => ctex(`tower${glass}${frame}${lit}`, 256, 256, (g, r) => {
  g.fillStyle = frame; g.fillRect(0, 0, 256, 256);
  for (let fy = 0; fy < 4; fy++) for (let fx = 0; fx < 4; fx++) {
    const x = fx * 64 + 6, y = fy * 64 + 10, on = r() < lit;
    const gr = g.createLinearGradient(x, y, x + 52, y + 46);
    gr.addColorStop(0, on ? "#ffe7a8" : shade(glass, 0.12)); gr.addColorStop(1, on ? "#f2c66a" : shade(glass, -0.1));
    g.fillStyle = gr; g.fillRect(x, y, 52, 44);
    g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(x, y, 52, 4);
  }
  noise(g, r, 256, 256, 1500, 0.06);
});
export const woodTex = (color = "#9a6a3e") => ctex("wood" + color, 512, 512, (g, r) => {
  const ph = 64;
  for (let y = 0; y < 512; y += ph) {
    let x = -r() * 300;
    while (x < 512) {
      const L = 220 + r() * 200; g.fillStyle = shade(color, (r() - 0.5) * 0.12); g.fillRect(x, y, L, ph);
      for (let k = 0; k < 9; k++) { g.strokeStyle = `rgba(60,30,10,${0.08 + r() * 0.1})`; g.lineWidth = 1 + r() * 1.5; g.beginPath(); const yy = y + r() * ph; g.moveTo(x, yy); g.bezierCurveTo(x + L * 0.3, yy + (r() - 0.5) * 8, x + L * 0.6, yy + (r() - 0.5) * 8, x + L, yy); g.stroke(); }
      g.fillStyle = "rgba(30,15,5,0.55)"; g.fillRect(x, y, 3, ph); x += L;
    }
    g.fillStyle = "rgba(30,15,5,0.6)"; g.fillRect(0, y, 512, 3);
  }
});
export const paintTex = (color: string) => ctex("paint" + color, 256, 256, (g, r) => {
  g.fillStyle = color; g.fillRect(0, 0, 256, 256); noise(g, r, 256, 256, 3000, 0.035, 2);
});
/** niebo Roblox: gradient + miękkie chmury (tło ekranowe) */
export const skyTex = (top: string, mid: string, hor: string, clouds = 1) => ctex(`sky${top}${mid}${hor}${clouds}`, 512, 1024, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, top); gr.addColorStop(0.45, mid); gr.addColorStop(0.72, hor); gr.addColorStop(1, hor);
  g.fillStyle = gr; g.fillRect(0, 0, 512, 1024);
  if (clouds > 0) {
    g.filter = "blur(10px)";
    for (let c = 0; c < 9; c++) {
      const cx = r() * 512, cy = 80 + r() * 520, s = 30 + r() * 45;
      for (let k = 0; k < 7; k++) { g.fillStyle = `rgba(255,255,255,${0.35 * clouds})`; g.beginPath(); g.ellipse(cx + (r() - 0.5) * s * 3, cy + (r() - 0.5) * s * 0.6, s * (0.6 + r() * 0.6), s * (0.35 + r() * 0.3), 0, 0, 7); g.fill(); }
    }
    g.filter = "none";
  }
});
/** napis/szyld: tekst na tle z ramką */
export const labelTex = (text: string, bg: string, fg: string, w = 512, h = 128, font = "900 78px 'Arial Black', Arial, sans-serif") => ctex(`label${text}${bg}${fg}${w}${h}`, w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.lineWidth = 10; g.strokeStyle = "#111"; g.strokeRect(5, 5, w - 10, h - 10);
  g.fillStyle = fg; g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 4);
});
