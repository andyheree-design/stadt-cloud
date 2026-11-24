import * as THREE from "three";

export const ENDING_V7 = Object.freeze({
  start: 35.7,
  abiClose: 36.55,
  reaction: 37.6,
  card: 38.6,
  end: 39.5,
});

export type EndingCameraV7 = {
  eye: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  beat: "entry" | "abi" | "reaction";
};

const Y = new THREE.Vector3(0, 1, 0);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (v: number) => {
  const x = clamp(v, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const ramp = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const worldPoint = (object: any) => object.getWorldPosition(new THREE.Vector3());

/** One brisk, planted step from the verified capture. Integration stays unchanged. */
export const endingWalkTime = (t: number) => {
  const u = clamp((t - ENDING_V7.start) / .82, 0, 1);
  // Cubic deceleration: starts already walking, finishes without a velocity snap.
  return 1.9 + u + u * u - u * u * u;
};

function forward(actor: any) {
  const direction = actor.faceForward?.() ??
    new THREE.Vector3(0, 0, -1).applyQuaternion(actor.group.getWorldQuaternion(new THREE.Quaternion()));
  return direction.clone().normalize();
}
function yawTo(actor: any, target: THREE.Vector3) {
  const f = forward(actor).setY(0).normalize();
  const d = target.clone().sub(worldPoint(actor.skull)).setY(0).normalize();
  return Math.atan2(f.clone().cross(d).y, clamp(f.dot(d), -1, 1));
}

/** Apply a world-space correction to a fresh, captured bone, never a cached pose. */
function rotateWorld(bone: any, delta: THREE.Quaternion) {
  if (!bone?.parent) return;
  const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
  const wanted = delta.multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
  bone.quaternion.copy(parent.invert().multiply(wanted));
  bone.updateMatrixWorld(true);
}
function orientHead(actor: any, target: THREE.Vector3, weight: number) {
  if (!actor?.head || weight <= 0) return;
  actor.group.updateMatrixWorld(true);
  const f = forward(actor);
  const d = target.clone().sub(worldPoint(actor.skull)).normalize();
  const yaw = yawTo(actor, target) * weight;
  const yawQ = new THREE.Quaternion().setFromAxisAngle(Y, yaw);
  const turned = f.clone().applyQuaternion(yawQ);
  const right = turned.clone().cross(Y).normalize();
  const pitch = clamp(
    Math.atan2(d.y, Math.hypot(d.x, d.z)) -
    Math.atan2(turned.y, Math.hypot(turned.x, turned.z)),
    -.32, .32,
  ) * weight;
  const delta = new THREE.Quaternion().setFromAxisAngle(right, pitch).multiply(yawQ);
  const neck = actor.bones?.neck_01;
  if (neck && neck !== actor.head) {
    // The inherited pose may still look at Kevin. Correct its full world delta
    // across neck and head; clamping only that delta can leave a false eyeline.
    rotateWorld(neck, new THREE.Quaternion().slerp(delta, .45));
    actor.group.updateMatrixWorld(true);
    rotateWorld(actor.head, new THREE.Quaternion().slerp(delta, .55));
  } else {
    rotateWorld(actor.head, delta);
  }
  actor.group.updateMatrixWorld(true);
}

/**
 * The exact x_* names and equations are from glbHumanV7.faceToMorphs.
 * Modify only those face influences; calling actor.pose here would erase capture.
 */
function face(actor: any, f: Record<string, number>, weight = 1) {
  if (weight <= 0) return;
  const values: Record<string, number> = {};
  const unit = (v: number) => clamp(v, 0, 1);
  const both = (name: string, value: number) => {
    values["x_" + name.replace("*", "left")] = unit(value);
    values["x_" + name.replace("*", "right")] = unit(value);
  };
  const blink = f.blink ?? 0;
  const open = (f.eyeOpen ?? .82) * (1 - blink);
  both("eye-*-closure", open < .82 ? (.82 - open) / .82 * .9 + blink * .1 : 0);
  both("eye-*-opened-up", open > .82 ? (open - .82) / .26 : 0);
  both("eye-*-slit", (f.lidLower ?? 0) * .7);
  const br = f.browRaise ?? 0, bt = f.browTilt ?? 0, bf = f.browFurrow ?? 0;
  both("eyebrows-*-up", Math.max(0, br));
  both("eyebrows-*-down", Math.max(0, -br) + bf * .45 + Math.max(0, bt) * .35);
  both("eyebrows-*-inner-up", Math.max(0, -bt) * .9);
  both("eyebrows-*-extern-up", Math.max(0, bt) * .4);
  values["x_nose-compression"] = unit(bf * .35);
  values["x_mouth-open"] = Math.min(.23, unit((f.mouthOpen ?? 0) * .42 + (f.jaw ?? 0) * .24));
  const curve = f.mouthCurve ?? 0, width = f.mouthWidth ?? .42;
  values["x_mouth-corner-puller"] = Math.min(f.smileLimit ?? .22,
    unit(Math.max(0, curve) * .9 + (f.cheek ?? 0) * .2));
  values["x_mouth-depression"] = Math.min(.14, unit(Math.max(0, -curve) * 1.2));
  values["x_mouth-retraction"] = Math.min(.08, unit((width - .42) * 1.4));
  values["x_mouth-pursing"] = Math.min(.42, unit((.42 - width) * 2 + (f.speechPurse ?? 0)));
  values["x_mouth-compression"] = unit(f.lipPress ?? 0);
  for (const mesh of actor.meshes ?? []) {
    const dictionary = mesh.morphTargetDictionary, influences = mesh.morphTargetInfluences;
    if (!dictionary || !influences) continue;
    for (const key of Object.keys(values)) {
      const index = dictionary[key];
      if (index !== undefined) influences[index] += (values[key] - influences[index]) * weight;
    }
  }
}
function camera(actor: any, distance: number, side: number, down: number,
  fov: number, beat: EndingCameraV7["beat"], rootDirection = false): EndingCameraV7 {
  const look = worldPoint(actor.skull).add(new THREE.Vector3(0, -down, 0));
  const f = (rootDirection
    ? new THREE.Vector3(0, 0, -1).applyQuaternion(actor.group.getWorldQuaternion(new THREE.Quaternion()))
    : forward(actor)).setY(0).normalize();
  const right = f.clone().cross(Y).normalize();
  const eye = look.clone().addScaledVector(f, distance).addScaledVector(right, side);
  eye.y += .045;
  return { eye, look, fov, beat };
}

/**
 * Call ONCE after every actor's fresh pose, capture, props, and generic gazeAt.
 * Apply the returned camera AFTER directCoverage. Fresh poses on each frame are
 * mandatory: this helper has no mutable cross-frame cache and never calls pose.
 * Roots, pelvis, legs, hand poses and prop IK are preserved.
 * Abi's upper chest turns once; his arms follow the captured shoulder hierarchy.
 */
export function directEnding(t: number, cast: any, abi: any): EndingCameraV7 | undefined {
  if (t < ENDING_V7.start || t >= ENDING_V7.end || !abi?.skull || !abi?.head) return;
  const clock = Math.min(t, ENDING_V7.card);
  const tarek = cast?.tarek;
  if (!tarek?.skull) return;
  abi.group.updateMatrixWorld(true);
  tarek.group.updateMatrixWorld(true);

  // A definite shoulder/chest commitment, followed by a single eye/head lock.
  // The planted lower-body capture is left untouched; no root sliding is added.
  const tarekEye = worldPoint(tarek.skull);
  const chest = abi.bones?.spine_03 ?? abi.spine;
  if (chest) {
    const turn = clamp(yawTo(abi, tarekEye), -.18, .18) * ramp(clock, 35.78, 36.35);
    rotateWorld(chest, new THREE.Quaternion().setFromAxisAngle(Y, turn));
    abi.group.updateMatrixWorld(true);
  }
  const abiEyeStart = worldPoint(abi.skull).addScaledVector(forward(abi), 3);
  orientHead(abi, tarekEye, ramp(clock, 35.79, 36.17));
  abi.gazeAt?.(abiEyeStart.lerp(tarekEye, ramp(clock, 35.705, 35.94)));

  // One controlled change from stern to "I know". No nod loop or facial noise.
  const smile = ramp(clock, 36.55, 37.12);
  const blink = ramp(clock, 36.29, 36.36) * (1 - ramp(clock, 36.36, 36.45));
  face(abi, {
    browRaise: -.11 + .16 * smile,
    browTilt: .18 * (1 - smile),
    browFurrow: .60 * (1 - smile) + .055 * smile,
    eyeOpen: .82 - .015 * smile, lidLower: .08 + .035 * smile,
    mouthCurve: .015 + .21 * smile, cheek: .025 * smile,
    lipPress: .22 * (1 - smile) + .045 * smile,
    mouthOpen: .005, jaw: 0, mouthWidth: .42, blink,
  }, ramp(clock, 35.7, 36.02));

  const abiEye = worldPoint(abi.skull);
  const timing: Record<string, [number, number]> = {
    tarek: [35.80, 36.31], dilara: [35.90, 36.42], kevin: [36.00, 36.53],
  };
  for (const id of ["tarek", "dilara", "kevin"]) {
    const actor = cast?.[id];
    if (!actor?.skull || !actor?.head) continue;
    const [start, end] = timing[id];
    // These are the exact conversation gaze targets used by the scene at 35.7.
    const previous = id === "tarek" ? cast.kevin : tarek;
    const oldTarget = worldPoint(previous?.mouth ?? previous?.skull ?? actor.skull);
    orientHead(actor, abiEye, ramp(clock, start + .16, end + .22));
    actor.gazeAt?.(oldTarget.lerp(abiEye, ramp(clock, start, end)));
  }

  // Tarek understands the smile. Hold his reaction all the way into the card.
  const reaction = ramp(clock, 37.60, 37.83);
  face(tarek, {
    browRaise: .62, browTilt: -.16, browFurrow: 0,
    eyeOpen: 1.045, lidLower: .015,
    mouthCurve: -.045, cheek: 0, lipPress: .045,
    mouthOpen: .055, jaw: .04, mouthWidth: .40,
  }, reaction);
  const chin = .035 * ramp(clock, 37.69, 37.98);
  if (chin > 0) {
    const right = forward(tarek).cross(Y).normalize();
    rotateWorld(tarek.head, new THREE.Quaternion().setFromAxisAngle(right, chin));
    tarek.group.updateMatrixWorld(true);
    tarek.gazeAt?.(abiEye);
  }

  if (clock < ENDING_V7.abiClose) {
    const push = ramp(clock, ENDING_V7.start, ENDING_V7.abiClose);
    // Keep the actual planted step in frame while pushing decisively inward.
    const shot = camera(abi, 3.65 - .93 * push, .62 - .28 * push,
      .87, 45 - push, "entry", true);
    shot.eye.y -= .18;
    return shot;
  }
  if (clock < ENDING_V7.reaction) {
    const push = ramp(clock, ENDING_V7.abiClose, ENDING_V7.reaction);
    return camera(abi, 1.85 - .57 * push, -.22 + .07 * push, .14, 37, "abi");
  }
  return camera(tarek, 1.26, .23, .13, 38, "reaction");
}

