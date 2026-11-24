// KOS F04 — wspólna scenografia (willa + ślub + obsada + światło) dla KosLook (look-dev) i KosE04 (film).
import * as THREE from "three";
import { NOINK } from "../bridge/ink";
import { buildWedding, placeWedding, Wedding } from "./wedding";
import { CAST_IDS, NV, TV, F0, at, FACE, ShotDef, ActorDef } from "./shots";
// @ts-ignore — moduły JS z JARVIS-STUDIO
import { STYLE_FLAGS } from "@kos/style/akte-tusche/toon.js";
// @ts-ignore
import { build as buildVilla } from "@kos/locations/villa/build.js";
// @ts-ignore
import { CAST } from "@kos/characters/kos/cast.js";
// @ts-ignore
import { blendExpr } from "@kos/style/akte-tusche/face.js";
export { blendExpr };

export const skyTex = (top: string, mid: string, bottom: string) => {
  const c = document.createElement("canvas"); c.width = 4; c.height = 256;
  const g = c.getContext("2d")!; const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top); gr.addColorStop(0.55, mid); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};

/** welon Currywurstine: półprzezroczysty stożek na czubku głowy */
export const addVeil = (c: any) => {
  c.group.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(c.body);
  const top = c.body.worldToLocal(new THREE.Vector3(0, bb.max.y, 0)).y;
  // połowa stożka po stronie +z (front modelu KOS patrzy w -z, więc +z = tył głowy): welon spływa za głową, twarz zostaje odsłonięta
  const veil = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.34, 20, 1, true, -Math.PI / 2, Math.PI),
    new THREE.MeshToonMaterial({ color: "#ffffff", transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false }));
  veil.position.set(0, top - 0.1, 0.04); veil.rotation.x = 0.18; veil.renderOrder = 2;
  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 20), new THREE.MeshToonMaterial({ color: "#ffd23f" }));
  crown.rotation.x = Math.PI / 2; crown.position.set(0, top + 0.02, 0);
  c.body.add(veil, crown);
};

export type Built = { root: THREE.Group; villa: any; wedding: Wedding; cast: Record<string, any>; key: THREE.DirectionalLight; hemi: THREE.HemisphereLight };
export const buildSet = (): Built => {
  const root = new THREE.Group();
  STYLE_FLAGS.outlines = false; // świat: kontury z InkPass
  const villa = buildVilla(); root.add(villa.group);
  // jak w F03: bez parasoli/leżaków w strefie ceremonii i na osi kamery (zasłaniały kadry)
  villa.group.updateMatrixWorld(true);
  const segD = (px: number, pz: number) => {
    const a = at(0.5, 0), b = at(9, 0), vx = b[0] - a[0], vz = b[1] - a[1];
    const u = Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[1]) * vz) / (vx * vx + vz * vz)));
    return Math.hypot(px - a[0] - u * vx, pz - a[1] - u * vz);
  };
  for (const ch of [...villa.group.children]) {
    if (ch === villa.automat || ch === villa.house) continue;
    const bb = new THREE.Box3().setFromObject(ch); if (bb.isEmpty()) continue;
    const sz = bb.getSize(new THREE.Vector3()), cc = bb.getCenter(new THREE.Vector3());
    if (sz.x > 6 || sz.z > 6 || sz.y < 0.35) continue;
    const cz = at(2.5, 0);
    if (segD(cc.x, cc.z) < 2.6 || Math.hypot(cc.x - cz[0], cc.z - cz[1]) < 3.6) ch.visible = false;
  }
  const wedding = buildWedding(); placeWedding(wedding, F0, NV); root.add(wedding.group);
  wedding.group.traverse((o: THREE.Object3D) => { if (o.userData.noink) o.layers.set(NOINK); }); // sznurki balonów bez grubego tuszu
  STYLE_FLAGS.outlines = true; // postacie: własne hulle
  const cast: Record<string, any> = {};
  for (const id of CAST_IDS) {
    const c = CAST[id](); cast[id] = c; root.add(c.group);
    if (id === "curry") addVeil(c);
    c.group.traverse((o: THREE.Object3D) => { o.layers.set(NOINK); if ((o as THREE.Mesh).isMesh && !o.userData.outline) o.castShadow = true; });
  }
  // światło: ciepły klucz z boku-przodu, zimne wypełnienie z drugiej strony, niebo/ziemia
  const hemi = new THREE.HemisphereLight("#dcecff", "#9a8270", 0.68); root.add(hemi);
  const key = new THREE.DirectionalLight("#fff1dc", 1.95); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.camera.layers.enable(NOINK);
  const sc = key.shadow.camera; sc.left = -7; sc.right = 7; sc.top = 7; sc.bottom = -7; sc.near = 0.5; sc.far = 40;
  const c0 = at(2.5, 0);
  key.target.position.set(c0[0], 0, c0[1]);
  key.position.set(c0[0] + NV[0] * 6 + TV[0] * 7, 9, c0[1] + NV[1] * 6 + TV[1] * 7);
  root.add(key, key.target);
  const fill = new THREE.DirectionalLight("#bcd4ff", 0.7); fill.position.set(c0[0] + NV[0] * 5 - TV[0] * 6, 4, c0[1] + NV[1] * 5 - TV[1] * 6);
  root.add(fill);
  return { root, villa, wedding, cast, key, hemi };
};

/** punkt [s, n, y] lub kotwica -> świat */
export const wpt = (set: Built, p: ShotDef["eye"], out: THREE.Vector3) => {
  if (typeof p === "string") {
    if (p === "antrag") { set.root.updateMatrixWorld(true); return set.wedding.antrag[2].getWorldPosition(out); }
    if (p === "board") { set.root.updateMatrixWorld(true); return set.wedding.board.getWorldPosition(out).setY(1.45); }
  }
  const [s, n, y] = p as [number, number, number]; const xz = at(n, s); return out.set(xz[0], y, xz[1]);
};

export const poseActor = (c: any, a: ActorDef | undefined) => {
  c.group.visible = !!a;
  if (!a) return;
  const P: Record<string, unknown> = { pos: at(a.n, a.s), rotY: FACE + (a.turn ?? 0), face: blendExpr(a.face ?? { neutral: 1 }) };
  for (const k of ["lean", "tilt", "squash", "bob", "armL", "armR"] as const) if (a[k] !== undefined) P[k] = a[k];
  c.pose(P);
};

export const applyProps = (w: Wedding, sh: ShotDef) => {
  const p = sh.props ?? {};
  w.antrag.forEach((a, i) => {
    a.visible = i < (p.antrag ?? 3);
    if (!a.userData.home) a.userData.home = { p: a.position.clone(), r: a.rotation.clone() };
    a.position.copy(a.userData.home.p); a.rotation.copy(a.userData.home.r);
  });
  if (p.fly) w.antrag.forEach((a, i) => { a.position.set(-0.4 + i * 0.35, 1.3 + i * 0.25, 0.6 - i * 0.2); a.rotation.set(0.6 + i, i * 0.9, 0.4 - i * 0.5); });
  w.stampMark.visible = !!p.mark;
  w.stamp.position.set(0.25, p.stampUp ? 0.9 : 0.76, p.stampOnPaper ? 0.02 : -0.05);
  if (p.stampOnPaper) w.stamp.position.x = -0.02;
  w.board.visible = !!p.board;
  w.bouquet.visible = !!p.bouquet;
  if (p.bouquet) w.bouquet.position.set(...p.bouquet);
};

