// EHRENSACHE E01 — scenografia (shishabar) + obsada ludzka + światło. Wspólne dla EhreLook (look-dev) i filmu.
import * as THREE from "three";
import { NOINK } from "../bridge/ink";
// @ts-ignore — moduły JS z JARVIS-STUDIO
import { STYLE_FLAGS } from "@kos/style/akte-tusche/toon.js";
// @ts-ignore
import { build as buildBar, pregnancyTest } from "@kos/locations/shishabar/build.js";
// @ts-ignore
import { CAST, blendExpr } from "@kos/characters/ehre/cast.js";
export { blendExpr };

export const CAST_IDS = ["tarek", "dilara", "kevin", "mama"] as const;
export type CastId = (typeof CAST_IDS)[number];
export const HEIGHT: Record<CastId, number> = { tarek: 0.96, dilara: 0.95, kevin: 1.05, mama: 0.93 };

export type Built = { root: THREE.Group; bar: any; cast: Record<CastId, any>; test: THREE.Group; key: THREE.DirectionalLight; hemi: THREE.HemisphereLight };
export const buildSet = (): Built => {
  const root = new THREE.Group();
  STYLE_FLAGS.outlines = false; // świat: kontury z InkPass
  const bar = buildBar(); root.add(bar.group);
  bar.group.traverse((o: THREE.Object3D) => { if (o.userData.noink) o.layers.set(NOINK); });
  STYLE_FLAGS.outlines = true; // postacie i rekwizyt w dłoni: własne hulle
  const cast = {} as Record<CastId, any>;
  for (const id of CAST_IDS) {
    const c = CAST[id](); cast[id] = c; c.group.scale.setScalar(HEIGHT[id]); root.add(c.group);
    c.group.traverse((o: THREE.Object3D) => { o.layers.set(NOINK); if ((o as THREE.Mesh).isMesh && !o.userData.outline) o.castShadow = true; });
  }
  const test = pregnancyTest("SCHWANGER 3+"); test.traverse((o: THREE.Object3D) => o.layers.set(NOINK)); root.add(test);
  // światło: jasna ciepła baza (L* 50–54), klucz ciepły z przodu-lewej, zimne wypełnienie z prawej, kontra różowa (neon)
  const hemi = new THREE.HemisphereLight("#fff4e6", "#c08a6a", 1.8); root.add(hemi);
  const key = new THREE.DirectionalLight("#ffe7c8", 3.0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.camera.layers.enable(NOINK);
  const sc = key.shadow.camera; sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; sc.near = 0.5; sc.far = 20;
  key.position.set(-2.5, 4.5, -4); key.target.position.set(0, 0.8, 1); root.add(key, key.target);
  const fill = new THREE.DirectionalLight("#bcd4ff", 1.1); fill.position.set(3.5, 2.5, -2); root.add(fill);
  const rim = new THREE.DirectionalLight("#ff7ac0", 0.9); rim.position.set(0.5, 3, 4); root.add(rim);
  return { root, bar, cast, test, key, hemi };
};

/** podmiana postaci na wersję GLB (MPFB) — ten sam kontrakt co buildHuman; kontury z InkPass (warstwa 0) */
// realistyczna sylwetka: o ile wyższa/niższa od starej postaci (stare mają duże głowy)
export const HEIGHT_FIX: Partial<Record<CastId, number>> = { tarek: 0.9 };
export const swapCast = (set: Built, id: CastId, c: any) => {
  const old = set.cast[id]; if (old === c) return c;
  const hOf = (g: THREE.Object3D) => { g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g, true); return b.max.y - b.min.y; };
  const s0 = old.group.scale.x, h0 = hOf(old.group) / s0; c.group.scale.setScalar(1); const h1 = hOf(c.group);
  c.group.scale.setScalar(s0 * h0 / h1 * (HEIGHT_FIX[id] ?? 1));
  set.root.remove(old.group); set.root.add(c.group); set.cast[id] = c; return c;
};

export type ActorDef = { pos: [number, number, number]; rotY?: number; sit?: number; face?: Record<string, number>; faceX?: Record<string, number>;
  lean?: number; twist?: number; tilt?: number; shrug?: number; headYaw?: number; headPitch?: number; headTilt?: number;
  armL?: Record<string, number>; armR?: Record<string, number>; handL?: Record<string, number>; handR?: Record<string, number> };
export const poseActor = (c: any, a: ActorDef | undefined) => {
  c.group.visible = !!a; if (!a) return;
  c.pose({ ...a, face: blendExpr(a.face ?? { neutral: 1 }, a.faceX ?? {}) });
};
export type TestDef = { who?: CastId; side?: "L" | "R"; pos?: [number, number, number]; rot?: [number, number, number]; scale?: number };
/** test ciążowy: w dłoni (who, side) albo w świecie */
export const placeTest = (set: Built, t: TestDef | undefined) => {
  const T = set.test; T.visible = !!t; if (!t) return;
  if (t.who) { const gr = set.cast[t.who].grip[t.side ?? "R"]; if (T.parent !== gr) gr.add(T); }
  else if (T.parent !== set.root) set.root.add(T);
  T.position.set(...(t.pos ?? (t.who ? [0, 0, 0] : [0, 1, 0])));
  T.rotation.set(...(t.rot ?? [0, 0, 0])); T.scale.setScalar(t.scale ?? 1);
};
