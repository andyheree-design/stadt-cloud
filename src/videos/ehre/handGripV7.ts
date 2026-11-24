import * as THREE from 'three';

export type ThumbGripTarget =
  | {kind: 'mouthpiece'; hand: THREE.Vector3; axis: THREE.Vector3; radius?: number; thumbCurl?: number}
  | {kind: 'phone'; phone: THREE.Object3D; thumbCurl?: number};
type ThumbData = {
  chain: THREE.Bone[];
  pad: THREE.Vector3;
  rest: THREE.Quaternion[];
  axes: THREE.Vector3[];
};
// Bind geometry only: no cached animation pose or dependence on evaluation order.
const cache = new WeakMap<object, Partial<Record<'L' | 'R', ThumbData>>>();
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

function thumbData(c: any, side: 'L' | 'R'): ThumbData {
  let entry = cache.get(c);
  if (!entry) {entry = {}; cache.set(c, entry);}
  if (entry[side]) return entry[side]!;
  const suffix = c.handBones[side].name.slice(-1);
  const chain = [1, 2, 3].map(i => c.bones[`thumb_0${i}_${suffix}`]) as THREE.Bone[];
  for (const mesh of c.meshes as THREE.SkinnedMesh[]) {
    if (!mesh.isSkinnedMesh) continue;
    const skeleton = mesh.skeleton;
    const index = (name: string) => skeleton.bones.findIndex(b => b.name === name);
    const distal = index(chain[2].name);
    if (distal < 0) continue;
    const restMatrix = (name: string) => {
      const i = index(name);
      if (i < 0) throw new Error(`Thumb grip is missing bind bone ${name}.`);
      return skeleton.boneInverses[i].clone().invert();
    };
    const restPoint = (name: string) => new THREE.Vector3().setFromMatrixPosition(restMatrix(name));
    const across = restPoint(`pinky_01_${suffix}`).sub(restPoint(`index_01_${suffix}`)).normalize();
    const inverse = skeleton.boneInverses[distal];
    const towardPalm = restPoint(`middle_01_${suffix}`).applyMatrix4(inverse);
    towardPalm.y = 0; towardPalm.normalize();
    const p = mesh.geometry.attributes.position;
    const ids = mesh.geometry.attributes.skinIndex, weights = mesh.geometry.attributes.skinWeight;
    const candidates: THREE.Vector3[] = [];
    for (let i = 0; i < p.count; i++) {
      let weight = 0;
      for (let j = 0; j < 4; j++) if (ids.getComponent(i, j) === distal) weight += weights.getComponent(i, j);
      if (weight < .999) continue;
      candidates.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.bindMatrix).applyMatrix4(inverse));
    }
    if (!candidates.length) continue;
    const lo = Math.min(...candidates.map(v => v.y)), hi = Math.max(...candidates.map(v => v.y));
    const pads = candidates.filter(v => v.y >= lo + .55 * (hi - lo));
    const pad = pads.reduce((a, b) => a.dot(towardPalm) > b.dot(towardPalm) ? a : b).clone();
    const rest: THREE.Quaternion[] = [], axes: THREE.Vector3[] = [];
    for (const b of chain.slice(1)) {
      const matrix = restMatrix(b.name), world = new THREE.Quaternion().setFromRotationMatrix(matrix).normalize();
      const parent = new THREE.Quaternion().setFromRotationMatrix(restMatrix(b.parent!.name)).normalize();
      rest.push(parent.invert().multiply(world.clone()));
      axes.push(across.clone().applyQuaternion(world.invert()).multiplyScalar(side === 'R' ? 1 : -1));
    }
    return entry[side] = {chain, pad, rest, axes};
  }
  throw new Error('Thumb grip requires the skinned distal thumb surface and bind matrices.');
}

/** Apply after final wrist/arm IK. Changes only thumb_01/02/03; influence is applied once. */
export function solveThumbGrip(c: any, side: 'L' | 'R', target: ThumbGripTarget, influence = 1) {
  const weight = clamp(influence, 0, 1), data = thumbData(c, side);
  const {chain, pad} = data, base = chain[0];
  const padWorld = () => chain[2].localToWorld(pad.clone());
  const closest = (point: THREE.Vector3) => {
    if (target.kind === 'phone') {
      const p = target.phone.worldToLocal(point.clone());
      p.set(clamp(p.x, -.032, .032), clamp(p.y, -.068, .068), -.0052);
      return target.phone.localToWorld(p);
    }
    const axis = target.axis.clone().normalize();
    const along = clamp(point.clone().sub(target.hand).dot(axis), -.085, .075);
    const center = target.hand.clone().addScaledVector(axis, along);
    const radial = point.clone().sub(center);
    if (radial.lengthSq() < 1e-10) radial.set(0, 1, 0).addScaledVector(axis, -axis.y);
    return center.addScaledVector(radial.normalize(), target.radius ?? .009);
  };
  c.group.updateMatrixWorld(true);
  const before = chain.map(b => b.quaternion.clone());
  if (weight > 0) {
    // Finger flexion is negative in this rig. Thumb hinges need their own pose:
    // applying that sign globally opens/lengthens the thumb instead of opposing it.
    const thumbCurl = clamp(target.thumbCurl ?? (target.kind === 'mouthpiece' ? .40 : .15), -.15, .65);
    chain.slice(1).forEach((b, i) => b.quaternion.copy(data.rest[i])
      .multiply(new THREE.Quaternion().setFromAxisAngle(data.axes[i], thumbCurl * .4)));
    c.group.updateMatrixWorld(true);
    for (let pass = 0; pass < 10; pass++) {
      const pivot = base.getWorldPosition(new THREE.Vector3()), p = padWorld();
      const a = p.sub(pivot).normalize(), b = closest(padWorld()).sub(pivot).normalize();
      const delta = new THREE.Quaternion().setFromUnitVectors(a, b);
      const parent = base.parent!.getWorldQuaternion(new THREE.Quaternion());
      base.quaternion.premultiply(parent.clone().invert().multiply(delta).multiply(parent));
      const angle = before[0].clone().normalize().angleTo(base.quaternion.clone().normalize());
      if (angle > .85) {
        const wanted = base.quaternion.clone();
        base.quaternion.copy(before[0]).slerp(wanted, .85 / angle);
      }
      c.group.updateMatrixWorld(true);
    }
    const solved = chain.map(b => b.quaternion.clone());
    chain.forEach((b, i) => b.quaternion.copy(before[i]).slerp(solved[i], weight));
    c.group.updateMatrixWorld(true);
  }
  const point = padWorld();
  return {pad: point, padError: point.distanceTo(closest(point)), weight,
    opposition: before[0].clone().normalize().angleTo(base.quaternion.clone().normalize())};
}
