// EHRENSACHE — postać z GLB (MPFB/Blender) z tym samym kontraktem co buildHuman z cast.js:
// { group, pose(P), meshes, head, skull, faceMesh, spine, grip: {L, R}, acc }.
// Pozy: kierunkowo w przestrzeni postaci (patrzy w −Z, jak stare postacie), mimika: morph targets x_* (MPFB expression units).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
// @ts-ignore
import { softGradientMap } from "@kos/style/akte-tusche/toon.js";
// @ts-ignore
import { blendExpr } from "@kos/characters/ehre/cast.js";
import { NOINK } from "../bridge/ink";

export const loadGlb = (url: string) => new Promise<any>((res, rej) => new GLTFLoader().load(url, res, undefined, rej));

type Opts = { natural?: boolean; headScale?: number; skin?: string; tint?: Record<string, string> };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const DOWN = V(0, -1, 0);
const clamp = (x: number) => Math.max(0, Math.min(1, x));

/** parametry twarzy (drawFace) -> wagi morphów MPFB */
const faceToMorphs = (f: any): Record<string, number> => {
  const m: Record<string, number> = {};
  const both = (k: string, w: number) => { m[`x_${k.replace("*", "left")}`] = clamp(w); m[`x_${k.replace("*", "right")}`] = clamp(w); };
  const open = (f.eyeOpen ?? 0.82) * (1 - (f.blink ?? 0));
  both("eye-*-closure", open < 0.82 ? (0.82 - open) / 0.82 * 0.9 + (f.blink ?? 0) * 0.1 : 0);
  both("eye-*-opened-up", open > 0.82 ? (open - 0.82) / 0.26 : 0);
  both("eye-*-slit", (f.lidLower ?? 0) * 0.7);
  const br = f.browRaise ?? 0, bt = f.browTilt ?? 0, bf = f.browFurrow ?? 0;
  both("eyebrows-*-up", Math.max(0, br));
  both("eyebrows-*-down", Math.max(0, -br) + bf * 0.45 + Math.max(0, bt) * 0.35);
  both("eyebrows-*-inner-up", Math.max(0, -bt) * 0.9);
  both("eyebrows-*-extern-up", Math.max(0, bt) * 0.4);
  m["x_nose-compression"] = clamp(bf * 0.35);
  const articulation=typeof f.speechActivity==='number',activity=clamp(f.speechActivity??0);
  const mouthEmotion=1-.55*activity;
  m["x_mouth-open"] = articulation
    ? Math.min(.34,clamp((f.mouthOpen??0)*.64+(f.jaw??0)*.25))
    : Math.min(.23,clamp((f.mouthOpen??0)*.42+(f.jaw??0)*.24));
  const c = f.mouthCurve ?? 0;
  m["x_mouth-corner-puller"] = Math.min(f.smileLimit??0.22, clamp(Math.max(0, c) * 0.9 + (f.cheek ?? 0) * 0.2))*mouthEmotion; // uśmiech bez odsłaniania zębów
  m["x_mouth-depression"] = Math.min(0.14, clamp(Math.max(0, -c) * 1.2))*mouthEmotion;
  const w = f.mouthWidth ?? 0.42;
  m["x_mouth-retraction"] = Math.min(0.08, clamp((w - 0.42) * 1.4));
  m["x_mouth-pursing"] = articulation ? Math.min(.28,clamp(f.speechPurse??0)) : Math.min(.42,clamp((0.42-w)*2+(f.speechPurse??0)));
  m["x_mouth-compression"] = clamp((f.lipPress??0)*(1-.88*activity)+.22*clamp(f.speechClosure??0));
  return m;
};

export const buildGlbHuman = (gltf: any, o: Opts = {}) => {
  const root = new THREE.Group();          // pozycja + rotY (jak stare postacie)
  const inner = new THREE.Group(); inner.rotation.y = Math.PI; root.add(inner); // GLB patrzy w +Z
  const scene: THREE.Object3D = SkeletonUtils.clone(gltf.scene); inner.add(scene);
  const grad = softGradientMap();
  const meshes: THREE.Mesh[] = []; let faceMesh: any = null;
  const morphed: THREE.Mesh[] = [];
  scene.traverse((ob: any) => {
    if (!ob.isMesh) return;
    if (/eyebrow|eyelash|hair|long01|teeth|tongue|sweat/i.test(ob.name)) ob.layers.set(NOINK); // karty z alfą: bez konturu tuszu
    // Small cloth clearance prevents skin poking through fitted tops in animated poses.
    if (/casualsuit|sportsuit|shirt_untucked/i.test(ob.name) || (o.natural && /knitted/i.test(ob.name))) {
      ob.geometry = ob.geometry.clone();
      const clearance = /knitted/i.test(ob.name) ? 0.006 : 0.003;
      const p = ob.geometry.attributes.position, n = ob.geometry.attributes.normal;
      if (n) for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * clearance, p.getY(i) + n.getY(i) * clearance, p.getZ(i) + n.getZ(i) * clearance);
      p.needsUpdate = true; ob.geometry.computeBoundingSphere();
    }
    meshes.push(ob); ob.castShadow = true; ob.receiveShadow = true; ob.frustumCulled = false;
    const conv = (mt: any) => {
      const props={color:mt.color,map:mt.map??null,alphaTest:mt.map?0.45:0,side:mt.side??THREE.FrontSide,vertexColors:!!ob.geometry.attributes.color};
      const t = o.natural ? new THREE.MeshStandardMaterial({...props,roughness:0.72,metalness:0}) : new THREE.MeshToonMaterial({...props,gradientMap:grad});
      const tk = Object.keys(o.tint ?? {}).find((k) => (mt.name + " " + ob.name).toLowerCase().includes(k));
      if (tk) t.color.set(o.tint![tk]);
      t.name = mt.name; return t;
    };
    if(o.natural){
      const keep=(m:any)=>{const c=m.clone();c.vertexColors=!!ob.geometry.attributes.color;c.side=THREE.DoubleSide;if(/hair|beard|lash|brow|cortu|grump/i.test(ob.name)){c.alphaTest=.4;c.transparent=false;}return c;};
      ob.material=Array.isArray(ob.material)?ob.material.map(keep):keep(ob.material);
    }else ob.material=Array.isArray(ob.material)?ob.material.map(conv):conv(ob.material);
    if (ob.morphTargetDictionary && Object.keys(ob.morphTargetDictionary).some((k) => k.startsWith("x_"))) morphed.push(ob);
    if (ob.name === "Human" || (ob.parent && ob.parent.name === "Human" && ob.morphTargetDictionary)) faceMesh = faceMesh ?? ob;
  });
  // kości
  const bones: Record<string, THREE.Bone> = {};
  scene.traverse((b: any) => { if (b.isBone) bones[b.name] = b; });
  root.updateMatrixWorld(true);
  const rootInv = () => root.matrixWorld.clone().invert();
  const posC = (b: THREE.Object3D) => b.getWorldPosition(new THREE.Vector3()).applyMatrix4(rootInv());
  const quatC = (b: THREE.Object3D) => {
    const q = b.getWorldQuaternion(new THREE.Quaternion());
    return root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q);
  };
  // strona: w przestrzeni postaci (patrzy w −Z) prawa ręka ma x > 0
  const side = (base: string) => {
    const l = bones[`${base}_l`], r = bones[`${base}_r`];
    return posC(l).x > 0 ? { R: l, L: r } : { R: r, L: l };
  };
  const UA = side("upperarm"), LA = side("lowerarm"), HA = side("hand"), TH = side("thigh"), CA = side("calf");
  const child = (b: THREE.Bone) => b.children.find((c: any) => c.isBone) as THREE.Bone | undefined;
  const rest = new Map<THREE.Object3D, THREE.Quaternion>();
  Object.values(bones).forEach((b) => rest.set(b, b.quaternion.clone()));
  const restPos = new Map<THREE.Object3D, THREE.Vector3>();
  Object.values(bones).forEach((b) => restPos.set(b, b.position.clone()));
  const restWorld = new Map<THREE.Object3D, THREE.Quaternion>();
  Object.values(bones).forEach((b) => restWorld.set(b, quatC(b)));
  const dirRest = (b: THREE.Bone, tip?: THREE.Object3D) => posC(tip ?? child(b)!).sub(posC(b)).normalize();
  const restDir = new Map<THREE.Object3D, THREE.Vector3>();
  for (const g of [UA, LA, TH, CA]) for (const b of [g.L, g.R]) restDir.set(b, dirRest(b, g === LA ? (b === LA.L ? HA.L : HA.R) : undefined));
  const resetAll = () => Object.values(bones).forEach((b) => { b.quaternion.copy(rest.get(b)!); b.position.copy(restPos.get(b)!); });

  /** ustaw kość tak, by jej kierunek (w przestrzeni postaci) = dir; skręt minimalny względem spoczynku */
  const aim = (b: THREE.Bone, dir: THREE.Vector3, reference?:THREE.Vector3) => {
    root.updateMatrixWorld(true);
    const d = new THREE.Quaternion().setFromUnitVectors(reference??restDir.get(b)!, dir.clone().normalize());
    const want = d.multiply(restWorld.get(b)!);
    const parentQ = quatC(b.parent!);
    b.quaternion.copy(parentQ.invert().multiply(want));
  };
  /** obrót kości o kąt wokół osi w przestrzeni postaci (oś liczona w pozie spoczynkowej) */
  const turn = (b: THREE.Bone, axis: THREE.Vector3, ang: number) => {
    if (!ang) return;
    const la = axis.clone().applyQuaternion(restWorld.get(b)!.clone().invert()).normalize();
    b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(la, ang));
  };
  // stawy palców: oś zgięcia = linia kłykci (palec wskazujący -> mały)
  const fingers = (h: "L" | "R") => {
    const s = h === "R" ? (HA.R.name.endsWith("_l") ? "l" : "r") : (HA.L.name.endsWith("_l") ? "l" : "r");
    const across = posC(bones[`pinky_01_${s}`]).sub(posC(bones[`index_01_${s}`])).normalize();
    const list = ["index", "middle", "ring", "pinky"].flatMap((f) => [1, 2, 3].map((i) => bones[`${f}_0${i}_${s}`]).filter(Boolean));
    const thumb = [2, 3].map((i) => bones[`thumb_0${i}_${s}`]).filter(Boolean);
    return { across, list, thumb, sign: h === "R" ? 1 : -1 };
  };
  const FG = { L: fingers("L"), R: fingers("R") };

  const head = bones["head"], neck = bones["neck_01"], spineB = [bones["spine_01"], bones["spine_02"], bones["spine_03"]], pelvis = bones["pelvis"];
  const sweat = new THREE.Group(); head.add(sweat);
  {
    const dropGeo = new THREE.SphereGeometry(0.0055, 12, 10);
    const pa = dropGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); const k = y > 0 ? 1 - (y / 0.0055) * 0.75 : 1; pa.setXYZ(i, pa.getX(i) * k, y * 1.5, pa.getZ(i) * k); }
    dropGeo.computeVertexNormals();
    const dropMat = new THREE.MeshToonMaterial({ color: "#8CCBEE", emissive: "#1E4A66", gradientMap: grad });
    const rimMat = new THREE.MeshBasicMaterial({ color: "#2F6E9A", side: THREE.BackSide });
    const hl = new THREE.MeshBasicMaterial({ color: "#FFFFFF" });
    const hlGeo = new THREE.SphereGeometry(0.0013, 6, 4);
    const spots: [number, number, number][] = []; // krople są w GLB (Tarek_sweat)
    root.updateMatrixWorld(true);
    for (const [x, y, z] of spots) {
      const d = new THREE.Mesh(dropGeo, dropMat); d.layers.set(NOINK);
      const rim = new THREE.Mesh(dropGeo, rimMat); rim.scale.setScalar(1.22); rim.layers.set(NOINK); d.add(rim);
      const h = new THREE.Mesh(hlGeo, hl); h.position.set(-0.0012, 0.0015, -0.003); d.add(h); h.layers.set(NOINK);
      d.position.copy(head.worldToLocal(V(x, y, z).applyMatrix4(root.matrixWorld)));
      d.quaternion.copy(quatC(head).invert()); // pion w przestrzeni postaci
      sweat.add(d);
    }
    sweat.visible = false;
  }
  if (o.headScale) head.scale.setScalar(o.headScale);
  // punkty montażowe
  const skull = new THREE.Object3D(); head.add(skull);
  { const hp = posC(head); const w = new THREE.Vector3(hp.x, hp.y + 0.085, hp.z - 0.01).applyMatrix4(root.matrixWorld);
    skull.position.copy(head.worldToLocal(w)); }
  // Mouth contact is derived from the teeth geometry, rather than a skull-height guess.
  const mouth=new THREE.Object3D();head.add(mouth);
  const teeth=meshes.find(m=>/teeth/i.test(m.name));
  if(teeth){root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(teeth,true);
    const lip=new THREE.Vector3((box.min.x+box.max.x)/2,box.max.y-.014,box.min.z-.014);
    mouth.position.copy(head.worldToLocal(lip));
  }else mouth.position.copy(skull.position).add(V(0,-.13,-.10));
  const mkGrip = (h: THREE.Bone, mid: THREE.Bone | undefined) => {
    const g = new THREE.Object3D(); h.add(g);
    const a = posC(h), b = mid ? posC(mid) : a.clone().add(V(0, -0.08, 0));
    const w = a.clone().lerp(b, 0.85).applyMatrix4(root.matrixWorld); g.position.copy(h.worldToLocal(w));
    // orientacja chwytu ~ jak w starych postaciach (oś Y wzdłuż dłoni w dół)
    g.quaternion.copy(restWorld.get(h)!.clone().invert());
    return g;
  };
  const sL = HA.L.name.endsWith("_l") ? "l" : "r", sR = sL === "l" ? "r" : "l";
  const grip = { L: mkGrip(HA.L, bones[`middle_01_${sL}`]), R: mkGrip(HA.R, bones[`middle_01_${sR}`]) };
  const acc: Record<string, THREE.Object3D> = {};
  scene.traverse((ob: any) => { const n = ob.name.toLowerCase(); for (const k of ["cap", "chain", "bag", "airpod", "vest", "sweat"]) if (n.includes("tarek_" + k)) acc[k] = ob; });

  const ZERO = { fwd: 0.05, out: 0.12, twist: 0, elbow: 0.15 };
  const armDirs = (a: any, sgn: number) => {
    const sh = new THREE.Quaternion().setFromEuler(new THREE.Euler(a.fwd, a.twist, sgn * a.out));
    const up = DOWN.clone().applyQuaternion(sh);
    const lo = DOWN.clone().applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(a.elbow, 0, 0))).applyQuaternion(sh);
    return { up, lo };
  };
  const X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);
  const gripReference=posC(grip.R).sub(posC(LA.R));
  const lowerToGrip=gripReference.length();gripReference.normalize();
  const pelvisY0 = posC(pelvis).y;
  // Foot targets and limb lengths are recorded in unscaled character space.
  const FT = {L: child(CA.L)!, R: child(CA.R)!};
  const feetRest = {L: posC(FT.L), R: posC(FT.R)};
  for(const side of ["L","R"] as const){const toe=child(FT[side]);if(toe)restDir.set(FT[side],dirRest(FT[side],toe));}
  const limb = {L: [posC(TH.L).distanceTo(posC(CA.L)),posC(CA.L).distanceTo(posC(FT.L))],
                R: [posC(TH.R).distanceTo(posC(CA.R)),posC(CA.R).distanceTo(posC(FT.R))]};
  const groundLegs = (sit:number) => {
    let residual=0;
    for(const side of ['L','R'] as const){
      const hip=posC(TH[side]);
      const target=feetRest[side].clone();
      target.x+=(side==='R'?1:-1)*.025;
      target.z-=.08+.40*sit;
      const [upper,lower]=limb[side];
      const delta=target.clone().sub(hip),distance=delta.length();
      const d=Math.max(Math.abs(upper-lower)+.0001,Math.min(upper+lower-.0001,distance));
      const direction=delta.normalize();
      const forward=V(0,0,-1).addScaledVector(direction,direction.z).normalize();
      const along=(upper*upper-lower*lower+d*d)/(2*d);
      const height=Math.sqrt(Math.max(0,upper*upper-along*along));
      const knee=hip.clone().addScaledVector(direction,along).addScaledVector(forward,height);
      aim(TH[side],knee.sub(hip));
      aim(CA[side],target.clone().sub(posC(CA[side])));
      // Keep the shoe parallel to its standing rest orientation while the knee bends.
      FT[side].quaternion.copy(quatC(FT[side].parent!).invert().multiply(restWorld.get(FT[side])!));
      root.updateMatrixWorld(true);
      residual=Math.max(residual,posC(FT[side]).distanceTo(target)*root.scale.y);
    }
    root.userData.footContactError=residual;
  };


  function pose(P: any = {}) {
    resetAll();
    const sit = P.sit ?? 0;root.userData.sit=sit;
    root.position.set(...((P.pos ?? [0, 0, 0]) as [number, number, number])); root.rotation.set(0, P.rotY ?? 0, 0);
    root.updateMatrixWorld(true);
    if(o.natural && P.grounded){
      const hip=posC(pelvis);
      // Seat surface 0.43 m + pelvis clearance. Convert metres using actor scale.
      hip.y=(pelvisY0-.006/root.scale.y)*(1-sit)+(.53/root.scale.y)*sit;
      hip.y+=(P.bob??0)/root.scale.y;
      pelvis.position.copy(pelvis.parent!.worldToLocal(root.localToWorld(hip)));
      root.updateMatrixWorld(true);
      groundLegs(sit);
    }else{
      if(sit || P.bob){
        const wp=pelvis.getWorldPosition(new THREE.Vector3());
        const lift=new THREE.Vector3(0,-sit*.43*(pelvisY0/.93)+(P.bob??0),0);
        pelvis.position.copy(pelvis.parent!.worldToLocal(wp.add(lift.applyQuaternion(root.quaternion))));
      }
      for(const side of ['L','R'] as const){
        const th=sit*Math.PI/2*.95;
        aim(TH[side],DOWN.clone().applyEuler(new THREE.Euler(th,0,0)));
        aim(CA[side],DOWN.clone().applyEuler(new THREE.Euler(th-sit*Math.PI/2,0,0)));
      }
    }
    // kręgosłup
    for (const b of spineB) { turn(b, X, -(P.lean ?? 0) / 3); turn(b, Y, (P.twist ?? 0) / 3); turn(b, Z, (P.tilt ?? 0) / 3); }
    if (P.shrug) for (const s of ["L", "R"] as const) turn(UA[s].parent as THREE.Bone, Z, (s === "R" ? 1 : -1) * P.shrug * 4);
    // ręce
    const aL = { ...ZERO, ...(P.armL || {}) }, aR = { ...ZERO, ...(P.armR || {}) };
    for (const [s, a, sg] of [["L", aL, -1], ["R", aR, 1]] as const) {
      const d = armDirs(a, sg);
      aim(UA[s], d.up); aim(LA[s], d.lo);
    }
    // dłonie: zgięcie palców
    for (const s of ["L", "R"] as const) {
      const h = (s === "L" ? P.handL : P.handR) ?? {}; const curl = h.curl ?? 0.15; const F = FG[s];
      for (const b of F.list) turn(b, F.across, F.sign * (b.name.startsWith("index")?(h.index??curl):curl) * 0.9);
      for (const b of F.thumb) turn(b, F.across, F.sign * (h.thumb??curl) * 0.4);
    }
    // torebka: kość "bag" (dziecko dłoni) wisi pionowo niezależnie od obrotu dłoni, z lekkim kołysaniem
    const bag = bones["bag"];
    if (bag && bag.parent) {
      const sway = (P as any).bagSway ?? 0;
      const want = new THREE.Quaternion().setFromAxisAngle(X, sway * 0.35).multiply(new THREE.Quaternion().setFromAxisAngle(Z, sway * 0.15)).multiply(restWorld.get(bag)!.clone());
      bag.quaternion.copy(quatC(bag.parent).invert().multiply(want));
    }
    // głowa
    const hp = P.headPitch ?? 0, hy = P.headYaw ?? 0;
    turn(neck, X, hp * 0.4); turn(neck, Y, hy * 0.35);
    turn(head, X, hp * 0.6); turn(head, Y, hy * 0.65); turn(head, Z, P.headTilt ?? 0);
    if(P.smoke>0)reachMouth(P.smoke);
    // mimika
    const fc = P.face ?? blendExpr({ neutral: 1 });
    const sw = fc.sweat ?? 0; sweat.visible = sw > 0.05; if (acc.sweat) acc.sweat.visible = sw > 0.1;
    sweat.children.forEach((d, i) => { d.visible = sw > 0.1 + i * 0.12; d.scale.setScalar(0.7 + sw * 0.5); });
    const mw = faceToMorphs(fc);
    for (const m of morphed) {
      const dict = (m as any).morphTargetDictionary, inf = (m as any).morphTargetInfluences;
      for (const k in dict) inf[dict[k]] = mw[k] ?? 0;
    }
  }
  const reachMouth=(weight:number)=>{
    if(weight<=0)return;
    root.updateMatrixWorld(true);
    const headDelta=quatC(head).multiply(restWorld.get(head)!.clone().invert());
    const offset=V(0,0,-1).applyQuaternion(headDelta).multiplyScalar(.104695).add(V(0,-.008,0)).normalize().multiplyScalar(.105/root.scale.y);
    const desired=posC(grip.R).lerp(posC(mouth).add(offset),weight);
    const shoulder=posC(UA.R),upper=shoulder.distanceTo(posC(LA.R)),lower=lowerToGrip;
    const delta=desired.clone().sub(shoulder),distance=delta.length(),d=Math.max(.001,Math.min(upper+lower-.0001,distance));
    const direction=delta.normalize(),pole=V(.8,-.8,0);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
    const along=(upper*upper-lower*lower+d*d)/(2*d);
    const elbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(pole,Math.sqrt(Math.max(0,upper*upper-along*along)));
    aim(UA.R,elbow.sub(shoulder));
    aim(LA.R,desired.clone().sub(posC(LA.R)),gripReference);
    root.updateMatrixWorld(true);root.userData.gripError=posC(grip.R).distanceTo(desired)*root.scale.y;
  };
  const captureMap:any={upperL:UA.L,lowerL:LA.L,upperR:UA.R,lowerR:LA.R,spine0:spineB[0],spine1:spineB[1],neck,head};
  for(const [b,tip] of [[spineB[0],spineB[1]],[spineB[1],spineB[2]],[neck,head],[head,skull]] as const){restDir.set(b,dirRest(b,tip));}
  const applyCapture=(clip:any,time:number,options:{skipRight?:boolean,skipLeft?:boolean,skipHead?:boolean,weight?:number,legs?:boolean,originTime?:number,twist?:boolean}={})=>{
    const weight=THREE.MathUtils.clamp(options.weight??1,0,1);if(weight===0)return;
    const f=Math.max(0,Math.min(clip.frames.length-1,time*clip.fps)),i=Math.floor(f),u=f-i;
    const a=clip.frames[i],b=clip.frames[Math.min(i+1,clip.frames.length-1)];
    const value=(k:string)=>new THREE.Vector3(...a[k]).lerp(new THREE.Vector3(...b[k]),u);
    const across=(key:string)=>{const d=value(key);return Math.atan2(-d.z,d.x);};
    if(options.legs&&a.ankleL){
      const origin=clip.frames[Math.max(0,Math.min(clip.frames.length-1,Math.round((options.originTime??0)*clip.fps)))];
      const scale=(limb.L[0]+limb.L[1])/(clip.legLength??.85);
      const base=posC(pelvis).sub(new THREE.Vector3(...origin.pelvis).multiplyScalar(scale));
      const ground=(feetRest.L.y+feetRest.R.y)/2;
      base.y+=ground-((origin.ankleL[1]+origin.ankleR[1])/2*scale+base.y);
      const hip=value('pelvis').multiplyScalar(scale).add(base);
      pelvis.position.copy(pelvis.parent!.worldToLocal(root.localToWorld(hip)));
      root.updateMatrixWorld(true);
      if(a.hipAcross){const q=new THREE.Quaternion().setFromAxisAngle(Y,across('hipAcross')).multiply(restWorld.get(pelvis)!);pelvis.quaternion.copy(quatC(pelvis.parent!).invert().multiply(q));}
      root.updateMatrixWorld(true);
      const legErrors:number[]=[];
      for(const side of ['L','R'] as const){
        const target=value('ankle'+side).multiplyScalar(scale).add(base);target.y=Math.max(feetRest[side].y,target.y);
        const h=posC(TH[side]),delta=target.clone().sub(h),distance=delta.length();
        const [upper,lower]=limb[side],d=Math.max(.001,Math.min(upper+lower-.0001,distance)),direction=delta.normalize();
        const hint=value('legUpper'+side).normalize();hint.addScaledVector(direction,-hint.dot(direction));
        if(hint.lengthSq()<.00001)hint.set(0,0,-1);hint.normalize();
        const along=(upper*upper-lower*lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));
        const knee=h.clone().addScaledVector(direction,along).addScaledVector(hint,height);
        aim(TH[side],knee.sub(h));aim(CA[side],target.clone().sub(posC(CA[side])));
        const foot=FT[side],toe=child(foot);if(toe){if(!restDir.has(foot))restDir.set(foot,dirRest(foot,toe));aim(foot,value('foot'+side).normalize());}
        root.updateMatrixWorld(true);legErrors.push(posC(foot).distanceTo(target)*root.scale.y);
      }
      root.userData.captureLegErrors=legErrors;root.userData.ankleHeights=[FT.L,FT.R].map(f=>f.getWorldPosition(new THREE.Vector3()).y);
    }
    const yaw=options.twist&&a.shoulderAcross?across('shoulderAcross'):0;
    for(const key of ['spine0','spine1','neck','head','upperL','lowerL','upperR','lowerR']){
      if(options.skipRight&&key.endsWith('R'))continue;if(options.skipLeft&&key.endsWith('L'))continue;
      if(options.skipHead&&(key==='head'||key==='neck'))continue;
      const bone=captureMap[key],before=bone.quaternion.clone(),dir=value(key).normalize();
      if(yaw&&['spine0','spine1','neck','head'].includes(key)){
        const q=new THREE.Quaternion().setFromAxisAngle(Y,yaw);
        const reference=restDir.get(bone)!.clone().applyQuaternion(q);
        const want=new THREE.Quaternion().setFromUnitVectors(reference,dir).multiply(q).multiply(restWorld.get(bone)!);
        bone.quaternion.copy(quatC(bone.parent!).invert().multiply(want));
      }else aim(bone,dir);
      const wanted=bone.quaternion.clone();bone.quaternion.copy(before).slerp(wanted,weight);root.updateMatrixWorld(true);
    }
    root.updateMatrixWorld(true);
  };
  const leftRef=posC(grip.L).sub(posC(LA.L)),leftLength=leftRef.length();leftRef.normalize();
  const reachHand=(side:'L'|'R',target:THREE.Vector3,weight=1)=>{
    root.updateMatrixWorld(true);const desired=posC(grip[side]).lerp(root.worldToLocal(target.clone()),weight);
    const currentRef=posC(grip[side]).sub(posC(LA[side])),lower=currentRef.length();const deltaLower=quatC(LA[side]).multiply(restWorld.get(LA[side])!.clone().invert());currentRef.normalize().applyQuaternion(deltaLower.invert());
    const shoulder=posC(UA[side]),upper=shoulder.distanceTo(posC(LA[side]));
    const rawDistance=desired.distanceTo(shoulder),delta=desired.clone().sub(shoulder),d=Math.max(.001,Math.min(upper+lower-.0001,rawDistance)),direction=delta.normalize();
    const pole=V(side==='R'?.8:-.8,-.8,0);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
    const along=(upper*upper-lower*lower+d*d)/(2*d);
    const elbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(pole,Math.sqrt(Math.max(0,upper*upper-along*along)));
    aim(UA[side],elbow.sub(shoulder));aim(LA[side],desired.sub(posC(LA[side])),currentRef);root.updateMatrixWorld(true);
    root.userData['handError'+side]=grip[side].getWorldPosition(new THREE.Vector3()).distanceTo(target);
  };
  const orientPalm=(side:'L'|'R',normalWorld:THREE.Vector3,axisWorld:THREE.Vector3,weight=1)=>{
    root.updateMatrixWorld(true);const h=HA[side],suffix=h.name.endsWith('_l')?'l':'r';
    const hp=h.getWorldPosition(new THREE.Vector3()),axis=bones['middle_01_'+suffix].getWorldPosition(new THREE.Vector3()).sub(hp).normalize();
    const across=bones['pinky_01_'+suffix].getWorldPosition(new THREE.Vector3()).sub(bones['index_01_'+suffix].getWorldPosition(new THREE.Vector3())).normalize();
    const normal=across.clone().cross(axis).normalize().multiplyScalar(side==='L'?1:-1),sx=axis.clone().cross(normal).normalize();
    const targetNormal=normalWorld.clone().normalize(),targetAxis=axisWorld.clone().addScaledVector(targetNormal,-axisWorld.dot(targetNormal)).normalize(),tx=targetAxis.clone().cross(targetNormal).normalize();
    const oldBasis=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(sx,axis,normal)),newBasis=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tx,targetAxis,targetNormal));
    const want=newBasis.multiply(oldBasis.invert()).multiply(h.getWorldQuaternion(new THREE.Quaternion()));const local=h.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(want);h.quaternion.slerp(local,weight);root.updateMatrixWorld(true);
  };
  const reachGripWorld=(target:THREE.Vector3,weight=1)=>reachHand('R',target,weight);
  const addActing=(p:{lean?:number;turn?:number;side?:number;headNod?:number;headTilt?:number;breath?:number})=>{
    spineB.forEach((bone,i)=>{turn(bone,X,-(p.lean??0)/3);turn(bone,Y,(p.turn??0)/3);turn(bone,Z,(p.side??0)/3);});
    turn(neck,X,(p.headNod??0)*.35);turn(head,X,(p.headNod??0)*.65);turn(head,Z,p.headTilt??0);
    // Chest expansion is separate from the planted pelvis and the limb contacts.
    spineB[1].scale.set(1+(p.breath??0)*.35,1+(p.breath??0)*.15,1+(p.breath??0));root.updateMatrixWorld(true);
  };
  const eyeMesh:any=meshes.find(m=>/high.poly/i.test(m.name));
  let eyeBase:Float32Array|undefined,eyeNorm:Float32Array|undefined,eyeCenters:THREE.Vector3[]=[];
  if(eyeMesh){eyeMesh.geometry=eyeMesh.geometry.clone();eyeBase=new Float32Array(eyeMesh.geometry.attributes.position.array);eyeNorm=new Float32Array(eyeMesh.geometry.attributes.normal.array);
    for(const sign of [-1,1]){const bounds=new THREE.Box3();for(let i=0;i<eyeBase.length;i+=3)if(eyeBase[i]*sign>=0)bounds.expandByPoint(V(eyeBase[i],eyeBase[i+1],eyeBase[i+2]));eyeCenters.push(bounds.getCenter(new THREE.Vector3()));}}
  const lookEyes=(yaw:number,pitch:number)=>{
    if(!eyeBase||!eyeNorm)return;const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,0)),v=new THREE.Vector3(),n=new THREE.Vector3();
    const pos=eyeMesh.geometry.attributes.position,normal=eyeMesh.geometry.attributes.normal;
    for(let i=0;i<eyeBase.length;i+=3){const center=eyeCenters[eyeBase[i]>=0?1:0];v.set(eyeBase[i],eyeBase[i+1],eyeBase[i+2]).sub(center).applyQuaternion(q).add(center);pos.setXYZ(i/3,v.x,v.y,v.z);n.set(eyeNorm[i],eyeNorm[i+1],eyeNorm[i+2]).applyQuaternion(q);normal.setXYZ(i/3,n.x,n.y,n.z);}pos.needsUpdate=normal.needsUpdate=true;
  };
  const faceForward=()=>V(0,0,-1).applyQuaternion(quatC(head).multiply(restWorld.get(head)!.clone().invert())).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())).normalize();
  const gazeAt=(target:THREE.Vector3)=>{const forward=faceForward(),right=forward.clone().cross(V(0,1,0)).normalize(),up=right.clone().cross(forward).normalize(),direction=target.clone().sub(skull.getWorldPosition(new THREE.Vector3())).normalize();const yaw=-Math.atan2(direction.dot(right),direction.dot(forward)),pitch=-Math.atan2(direction.dot(up),Math.hypot(direction.dot(right),direction.dot(forward)));lookEyes(Math.max(-.22,Math.min(.22,yaw)),Math.max(-.16,Math.min(.16,pitch)));};
  pose({});
  return { group: root, pose, meshes, head, skull, faceMesh, spine: spineB[2], grip, acc, bones, handBones:HA, sweat, mouth, applyCapture, reachMouth, reachGripWorld, reachHand, orientPalm, addActing, lookEyes, gazeAt, restHeadY:posC(skull).y, restPelvisY:pelvisY0, faceForward };
};
