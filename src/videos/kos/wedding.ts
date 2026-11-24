// KOS F04 — scenografia ślubu przy Pfandautomacie. Lokalny układ: z = odległość od frontu automatu (n),
// x = -s (bok). Grupa ustawiana w świecie przez placeWedding(). Wszystko deterministyczne (rng z seedem).
// Świat bez hulli (kontury z InkPass); tagi tekstowe po niemiecku, niewoświetlane (MeshBasic), offset ≥1 cm.
import * as THREE from "three";
// @ts-ignore
import { toon } from "@kos/style/akte-tusche/toon.js";
// @ts-ignore
import { rng } from "@kosengine/core.js";

const R: () => number = rng(404);
const mat = (c: string, o: Record<string, unknown> = {}) => toon(c, o) as THREE.Material;
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o;
};
const ctex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
/** tag tekstowy (nieoświetlony): ciemny tusz na jasnym papierze / szyldzie */
export const tagTex = (text: string, { w = 512, h = 192, bg = "#fbf3e2", fg = "#1d1a24", red = false, font = 120 } = {}) =>
  ctex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = red ? "#c8102e" : fg; g.lineWidth = 10; if (red) g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = red ? "#c8102e" : fg; g.font = `900 ${font}px Arial Black, Arial, sans-serif`;
    const tw = g.measureText(text).width, fit = (w * 0.86) / tw; // auto-dopasowanie: tekst zawsze w całości
    if (fit < 1) g.font = `900 ${Math.floor(font * fit)}px Arial Black, Arial, sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 4);
  });
const plane = (tex: THREE.Texture, w: number, h: number, basic = true) =>
  new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }) : mat("#ffffff", { map: tex }));

export type Wedding = {
  group: THREE.Group;
  antrag: THREE.Group[];        // 3 egzemplarze wniosku (do animacji: mnożenie, odlot)
  stamp: THREE.Group;           // pieczątka Bürokratiusa (uchwyt + stopka)
  stampMark: THREE.Mesh;        // odcisk „ABGELEHNT” na wierzchnim wniosku (skala 0 = brak)
  bouquet: THREE.Group;
  board: THREE.Group;           // tablica głosowania A/B (w świecie)
  marks: Record<string, [number, number, number]>; // punkty lokalne
};

export function buildWedding(): Wedding {
  const g = new THREE.Group(); g.name = "wedding";
  const add = <T extends THREE.Object3D>(o: T) => { g.add(o); return o; };

  // 1 — czerwony dywan (box, nie płaszczyzna: brak koplanarności z tarasem)
  const carpetT = ctex(64, 512, (x) => { x.fillStyle = "#b3122a"; x.fillRect(0, 0, 64, 512); x.fillStyle = "#e8b923"; x.fillRect(0, 0, 5, 512); x.fillRect(59, 0, 5, 512); });
  add(mesh(new THREE.BoxGeometry(1.0, 0.02, 6.2), mat("#ffffff", { map: carpetT }), 0, 0.012, 4.2));

  // 2 — łuk z kwiatami nad parą
  const arch = new THREE.Group(); arch.position.set(0, 0, 1.0); add(arch);
  arch.add(mesh(new THREE.TorusGeometry(1.15, 0.055, 10, 48, Math.PI), mat("#f6f1e8")));
  for (const s of [-1, 1]) arch.add(mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.08, 16), mat("#d9cfc0"), s * 1.15, 0.04, 0));
  const petals = ["#ff5c9e", "#ffffff", "#ffd23f", "#ff8fb8", "#f25f5c"];
  for (let i = 0; i <= 26; i++) {
    const a = (i / 26) * Math.PI, r = 1.15 + (R() - 0.5) * 0.05;
    const fl = mesh(new THREE.SphereGeometry(0.075 + R() * 0.04, 12, 10), mat(petals[i % petals.length]), Math.cos(a) * r, Math.sin(a) * r, (R() - 0.5) * 0.08);
    arch.add(fl);
    if (i % 2) arch.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), mat("#3f9a4a"), Math.cos(a) * (r + 0.07), Math.sin(a) * (r + 0.07), 0.05));
  }
  // 3 — baner „HOCHZEIT” nad łukiem
  const banner = plane(tagTex("HOCHZEIT", { w: 768, h: 160, bg: "#fff6e0", fg: "#b3122a", font: 116 }), 1.5, 0.31);
  banner.position.set(0, 1.42, 0.08); arch.add(banner);

  // 4 — krzesła gości: 2 rzędy × 3 na stronę, białe z różową kokardą
  const chair = (x: number, z: number) => {
    const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = Math.PI; // przodem do łuku
    c.add(mesh(new THREE.BoxGeometry(0.42, 0.05, 0.4), mat("#f4f1ea"), 0, 0.45, 0));
    c.add(mesh(new THREE.BoxGeometry(0.42, 0.45, 0.04), mat("#f4f1ea"), 0, 0.7, 0.19));
    for (const [lx, lz] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) c.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 6), mat("#e2ddd2"), lx, 0.225, lz));
    c.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), mat("#ff5c9e"), 0, 0.82, 0.22));
    c.userData.nearCull = 1.9; // kamera między krzesłami: bliskie znikają
    return add(c);
  };
  for (const z of [3.6, 4.6]) for (const x of [0.85, 1.35, 1.85]) { chair(x, z); chair(-x, z); }

  // 5 — pulpit Bürokratiusa: 3 egzemplarze wniosku, pieczątka, poduszka z tuszem
  const desk = new THREE.Group(); desk.position.set(1.55, 0, 1.45); desk.rotation.y = -0.5; add(desk);
  desk.add(mesh(new THREE.BoxGeometry(0.8, 0.72, 0.5), mat("#7a5434"), 0, 0.36, 0));
  desk.add(mesh(new THREE.BoxGeometry(0.86, 0.04, 0.56), mat("#5e3f26"), 0, 0.74, 0));
  const antragT = ctex(256, 352, (x) => {
    x.fillStyle = "#fbf6ea"; x.fillRect(0, 0, 256, 352); x.fillStyle = "#1d1a24"; x.font = "900 40px Arial Black, Arial";
    x.textAlign = "center"; x.fillText("ANTRAG", 128, 58); x.fillStyle = "#9aa3b5";
    for (let i = 0; i < 9; i++) x.fillRect(28, 96 + i * 24, i % 3 === 2 ? 120 : 200, 7);
    x.strokeStyle = "#1d1a24"; x.lineWidth = 3; x.strokeRect(28, 312, 90, 22); x.strokeRect(138, 312, 90, 22);
  });
  const antrag: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const a = new THREE.Group(); a.position.set(-0.12 + i * 0.05, 0.765 + i * 0.006, 0.02 - i * 0.03); a.rotation.y = (i - 1) * 0.12;
    const p = mesh(new THREE.BoxGeometry(0.26, 0.004, 0.36), [mat("#fbf6ea"), mat("#fbf6ea"), mat("#ffffff", { map: antragT }), mat("#fbf6ea"), mat("#fbf6ea"), mat("#fbf6ea")] as unknown as THREE.Material);
    a.add(p); desk.add(a); antrag.push(a);
  }
  const markT = tagTex("ABGELEHNT", { w: 512, h: 160, bg: "rgba(0,0,0,0)", red: true, font: 86 });
  const stampMark = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.07), new THREE.MeshBasicMaterial({ map: markT, transparent: true, depthWrite: false }));
  stampMark.rotation.set(-Math.PI / 2, 0, 0.18); stampMark.position.set(0, 0.0125, 0.02); antrag[2].add(stampMark);
  const stamp = new THREE.Group(); stamp.position.set(0.25, 0.76, -0.05); desk.add(stamp);
  stamp.add(mesh(new THREE.BoxGeometry(0.12, 0.03, 0.07), mat("#2b2f36"), 0, 0.015, 0));
  stamp.add(mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.1, 10), mat("#7a5434"), 0, 0.08, 0));
  stamp.add(mesh(new THREE.SphereGeometry(0.035, 12, 10), mat("#c8102e"), 0, 0.14, 0));
  desk.add(mesh(new THREE.BoxGeometry(0.12, 0.015, 0.08), mat("#1b2a6b"), 0.28, 0.768, 0.12)); // poduszka z tuszem

  // 6 — tabliczka „§ 12” na słupku przy pulpicie
  const sign = new THREE.Group(); sign.position.set(2.15, 0, 1.15); sign.rotation.y = -0.35; add(sign);
  sign.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 8), mat("#5e3f26"), 0, 0.65, 0));
  sign.add(mesh(new THREE.BoxGeometry(0.5, 0.34, 0.03), mat("#fbf3e2"), 0, 1.35, 0));
  const sp = plane(tagTex("§ 12", { w: 384, h: 256, font: 150 }), 0.46, 0.3); sp.position.set(0, 1.35, 0.017); sign.add(sp);

  // 7 — balony po obu stronach łuku
  const balloonCols = ["#ff5c9e", "#ffd23f", "#4fb3ff", "#ffffff", "#f25f5c"];
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
    const bx = s * (1.35 + R() * 0.25), by = 1.6 + R() * 0.5, bz = 0.9 + (R() - 0.5) * 0.3;
    const b = mesh(new THREE.SphereGeometry(0.15, 16, 12), mat(balloonCols[(i + (s > 0 ? 2 : 0)) % 5]), bx, by, bz); b.scale.y = 1.18; add(b);
    const len = by - 0.15; const str = mesh(new THREE.CylinderGeometry(0.004, 0.004, len, 4), mat("#ffffff"), (bx + s * 1.2) / 2, len / 2, (bz + 1.0) / 2);
    str.lookAt(new THREE.Vector3(bx, by, bz)); str.rotateX(Math.PI / 2); str.userData.noink = true; add(str);
  }

  // 8 — stół z tortem (3 piętra) i 9 — prezenty
  const cake = new THREE.Group(); cake.position.set(-2.1, 0, 2.1); add(cake);
  cake.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 24), mat("#f6f1e8"), 0, 0.74, 0));
  cake.add(mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.72, 8), mat("#d9cfc0"), 0, 0.36, 0));
  [[0.26, 0.16], [0.19, 0.14], [0.12, 0.12]].reduce((y, [r, h], i) => { cake.add(mesh(new THREE.CylinderGeometry(r, r, h, 24), mat(i % 2 ? "#ffd6e5" : "#fffaf0"), 0, y + h / 2, 0)); return y + h; }, 0.76);
  cake.add(mesh(new THREE.SphereGeometry(0.035, 10, 8), mat("#c8102e"), 0, 1.22, 0));
  for (const [x, z, w, c, r] of [[-1.55, 2.5, 0.26, "#4fb3ff", "#ffd23f"], [-1.75, 2.75, 0.2, "#ff5c9e", "#ffffff"], [-1.45, 2.85, 0.18, "#7bd389", "#f25f5c"]] as const) {
    add(mesh(new THREE.BoxGeometry(w, w, w), mat(c), x, w / 2, z));
    add(mesh(new THREE.BoxGeometry(w + 0.01, w + 0.01, 0.04), mat(r), x, w / 2, z));
  }

  // 10 — skrzynki Pfand z butelkami przy automacie
  for (const [x, y, z, ry] of [[-0.95, 0.15, 0.35, 0.1], [-0.95, 0.45, 0.35, -0.05], [0.95, 0.15, 0.3, -0.15]]) {
    const cr = new THREE.Group(); cr.position.set(x, y, z); cr.rotation.y = ry; add(cr);
    cr.add(mesh(new THREE.BoxGeometry(0.45, 0.3, 0.32), mat("#e8b923")));
    for (let i = 0; i < 6; i++) cr.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8), mat(i % 2 ? "#2f8f4a" : "#6fb8d8"), -0.15 + (i % 3) * 0.15, 0.22, i < 3 ? -0.07 : 0.07));
  }

  // 11 — girlanda z chorągiewek nad dywanem (między łukiem a krzesłami)
  for (const s of [-1, 1]) add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 8), mat("#f6f1e8"), s * 2.4, 1.1, 3.0));
  const flagCols = ["#ff5c9e", "#ffd23f", "#4fb3ff", "#7bd389", "#f25f5c"];
  for (let i = 0; i < 15; i++) {
    const u = i / 14, x = -2.4 + u * 4.8, y = 2.15 - Math.sin(u * Math.PI) * 0.35;
    const tri = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.1, 0, 0), new THREE.Vector3(0.1, 0, 0), new THREE.Vector3(0, -0.22, 0)]);
    tri.computeVertexNormals(); const fl = mesh(tri, mat(flagCols[i % 5], { side: THREE.DoubleSide }), x, y, 3.0); fl.userData.nearCull = true; add(fl);
  }

  // 12 — wazony z kwiatami na początku dywanu, 13 — bukiet (Curry trzyma / leci w ujęciu 13)
  for (const s of [-1, 1]) {
    add(mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.45, 14), mat("#4fb3ff"), s * 0.75, 0.225, 6.6));
    for (let i = 0; i < 7; i++) add(mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(petals[i % 5]), s * 0.75 + (R() - 0.5) * 0.2, 0.52 + R() * 0.15, 6.6 + (R() - 0.5) * 0.2));
  }
  const bouquet = new THREE.Group(); add(bouquet);
  bouquet.add(mesh(new THREE.ConeGeometry(0.06, 0.18, 10), mat("#3f9a4a"), 0, -0.09, 0));
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; bouquet.add(mesh(new THREE.SphereGeometry(0.045, 10, 8), mat(petals[i % 5]), Math.cos(a) * 0.05, 0.02 + (i % 2) * 0.02, Math.sin(a) * 0.05)); }
  bouquet.position.set(0.3, 0.6, 1.25); bouquet.visible = false;

  // 14 — tablica głosowania A/B (w świecie, ujęcie 16), domyślnie ukryta
  const board = new THREE.Group(); board.position.set(0, 0, 3.25); board.visible = false; add(board);
  // pionowa tablica (kadr 9:16): A nad B, rama 1,05 × 1,5 m
  board.add(mesh(new THREE.BoxGeometry(1.05, 1.5, 0.06), mat("#2b2f36"), 0, 1.45, 0));
  for (const s of [-1, 1]) board.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 8), mat("#5e3f26"), s * 0.42, 0.37, 0));
  const pa = plane(tagTex("A: BEAMTER", { w: 640, h: 300, bg: "#fff6e0", fg: "#1b2a6b", font: 110 }), 0.93, 0.44); pa.position.set(0, 1.84, 0.035); board.add(pa);
  const pb = plane(tagTex("B: DÖNER", { w: 640, h: 300, bg: "#fff6e0", fg: "#b3122a", font: 110 }), 0.93, 0.44); pb.position.set(0, 1.3, 0.035); board.add(pb);
  const pt = plane(tagTex("HOCHZEIT?", { w: 512, h: 128, bg: "#2b2f36", fg: "#fbf3e2", font: 80 }), 0.7, 0.175); pt.position.set(0, 0.88, 0.035); board.add(pt);

  return {
    group: g, antrag, stamp, stampMark, bouquet, board,
    marks: { couple: [0, 0, 1.25], desk: [1.55, 0, 1.45], aisle: [0, 0, 5.5], cake: [-2.1, 0, 2.1], sign: [2.15, 0, 1.15] },
  };
}

/** ustawia lokalny układ ślubu w świecie: początek w F0 (przed frontem automatu), oś +z = NV */
export function placeWedding(w: Wedding, F0: [number, number], NV: [number, number]) {
  w.group.position.set(F0[0], 0, F0[1]);
  w.group.rotation.y = Math.atan2(NV[0], NV[1]);
}
