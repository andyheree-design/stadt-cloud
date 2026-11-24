import * as THREE from 'three';

const GRIP_TO_LIPS = .105;
const GRIP_TO_TIP = .1062;
const SOLVE_PASSES = 8;
const EPSILON = 1e-10;
const UP = new THREE.Vector3(0, 1, 0);
const smooth = (v: number) => {
  const x = Math.max(0, Math.min(1, v));
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/** Call after body/capture/acting, once per frame, on a freshly posed actor. */
export function solveSmokingGrip(c: any, t: number): {
  hand: THREE.Vector3;
  axis: THREE.Vector3;
  tipError: number;
  weight: number;
} {
  const handBone = c.handBones?.R as THREE.Bone | undefined;
  if (!handBone || !/_[lr]$/.test(handBone.name)) {
    throw new Error('Smoking grip requires the mapped runtime right-hand bone.');
  }
  const suffix = handBone.name.slice(-1);
  const bone = (name: string): THREE.Bone => {
    const found = c.bones?.[`${name}_${suffix}`] as THREE.Bone | undefined;
    if (!found) throw new Error(`Smoking grip is missing ${name}_${suffix}.`);
    return found;
  };
  const index = bone('index_01'), pinky = bone('pinky_01');
  const middle = bone('middle_01');
  const chain = [bone('upperarm'), bone('lowerarm'), handBone];
  const position = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
  const handAxis = () => {
    const value = position(index).sub(position(pinky));
    if (value.lengthSq() < EPSILON) throw new Error('Smoking grip has a degenerate knuckle axis.');
    return value.normalize();
  };
  const weight = smooth((t - 11.55) / .65) * (1 - smooth((t - 12.95) / .45));
  c.group.updateMatrixWorld(true);
  const mouth = position(c.mouth);
  const finish = () => {
    c.group.updateMatrixWorld(true);
    const hand = position(c.grip.R), axis = handAxis();
    const tipError = hand.clone().addScaledVector(axis, GRIP_TO_TIP).distanceTo(mouth);
    return {hand, axis, tipError, weight};
  };
  if (weight === 0) return finish();

  const initialHand = position(c.grip.R);
  const initialAxis = handAxis();
  const longitudinal = position(middle).sub(position(handBone));
  if (longitudinal.lengthSq() < EPSILON) throw new Error('Smoking grip has a degenerate palm axis.');
  longitudinal.normalize();

  // Approach the lips from in front and slightly below, with fingers pointing up.
  // faceForward is present on buildGlbHuman; the fallback also supports its minimal contract.
  const pipeAxis = typeof c.faceForward === 'function'
    ? c.faceForward().clone().negate()
    : mouth.clone().sub(initialHand);
  if (pipeAxis.lengthSq() < EPSILON) pipeAxis.copy(initialAxis);
  pipeAxis.normalize().addScaledVector(UP, .18).normalize();
  const fingerUp = UP.clone().addScaledVector(pipeAxis, -UP.dot(pipeAxis));
  if (fingerUp.lengthSq() < EPSILON) {
    fingerUp.copy(longitudinal).addScaledVector(pipeAxis, -longitudinal.dot(pipeAxis));
  }
  if (fingerUp.lengthSq() < EPSILON) {
    fingerUp.set(1, 0, 0).addScaledVector(pipeAxis, -pipeAxis.x);
  }
  fingerUp.normalize();

  // MCP joints form an oblique row. Preserve its measured angle to the palm;
  // forcing middle-wrist perpendicular to index-pinky would mis-aim the real pipe.
  const obliquity = Math.max(-.999999, Math.min(.999999, initialAxis.dot(longitudinal)));
  const palmAxis = pipeAxis.clone().multiplyScalar(obliquity)
    .addScaledVector(fingerUp, Math.sqrt(1 - obliquity * obliquity)).normalize();
  const palmNormal = pipeAxis.clone().cross(palmAxis).normalize();
  const gripTarget = mouth.clone().addScaledVector(pipeAxis, -GRIP_TO_LIPS);

  // Solve the full pose first. Iterating a fractional influence would exponentiate
  // its effect, so blend each changed bone exactly once after solving.
  const before = chain.map(b => b.quaternion.clone());
  try {
    for (let pass = 0; pass < SOLVE_PASSES; pass++) {
      c.orientPalm('R', palmNormal, palmAxis, 1);
      c.reachHand('R', gripTarget, 1);
    }
    const solved = chain.map(b => b.quaternion.clone());
    chain.forEach((b, i) => b.quaternion.copy(before[i]).slerp(solved[i], weight));
  } catch (error) {
    chain.forEach((b, i) => b.quaternion.copy(before[i]));
    c.group.updateMatrixWorld(true);
    throw error;
  }
  return finish();
}
