// @ts-ignore -- shared JS expression presets are resolved by Remotion's @kos alias.
import { blendExpr } from "@kos/style/akte-tusche/face.js";

type FaceCue = Record<string, number>;
type HeadCue = { headPitch?: number; headTilt?: number };
type ArmCue = { out: number; fwd: number; elbow: number };

// Deterministic thought/response envelopes: anticipation, hold, slower release.
const ease = (v: number) => {
  const x = Math.max(0, Math.min(1, v));
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const hold = (t: number, a: number, b: number, c: number, d: number) =>
  ease((t - a) / (b - a)) * (1 - ease((t - c) / (d - c)));
const mix = (a: number, b: number, weight: number) => a + (b - a) * weight;

function faceToward(p: any, cue: FaceCue, weight: number) {
  if (weight <= 0) return;
  // Sample the actual inherited expression, including enrichPose's overrides.
  // A neutral fallback here would make missing faceX channels jump on entry.
  const current = blendExpr(p.face ?? { neutral: 1 }, p.faceX ?? {});
  const extra = { ...(p.faceX ?? {}) };
  for (const key of Object.keys(cue)) extra[key] = mix(current[key] ?? 0, cue[key], weight);
  p.faceX = extra;
}
function headToward(p: any, cue: HeadCue, weight: number) {
  if (weight <= 0) return;
  for (const key of ["headPitch", "headTilt"] as const) {
    if (cue[key] !== undefined) p[key] = mix(p[key] ?? 0, cue[key]!, weight);
  }
}
function armToward(p: any, side: "armL" | "armR", cue: ArmCue, weight: number) {
  if (weight <= 0) return;
  const arm = { ...(p[side] ?? {}) };
  for (const key of ["out", "fwd", "elbow"] as const) {
    arm[key] = mix(arm[key] ?? 0, cue[key], weight);
  }
  p[side] = arm;
}

/**
 * Apply after enrichPose, BEFORE the scene negates headPitch.
 * Only expression, authored head pitch/tilt, and demonstrably free arms change.
 * Hands, props, gaze targets, articulation, blinks, roots, and IK stay intact.
 */
export function emotionalBeat(id: string, t: number, p: any): any {
  if (id === "kevin") {
    // He initially believes his explanation is helpful.
    const confident = hold(t, 11.65, 12.10, 14.55, 15.05);
    faceToward(p, {
      browRaise: .13, browTilt: -.05, browFurrow: 0, eyeOpen: .87,
      lidLower: .07, mouthCurve: .16, cheek: .04, lipPress: .02,
    }, confident);
    headToward(p, { headPitch: -.025, headTilt: .015 }, confident);
    armToward(p, "armR", { out: .16, fwd: .40, elbow: 1.18 }, confident);

    // The thought goes wrong before the hand retreats. No repeated nodding.
    const unsure = hold(t, 14.8, 15.15, 15.65, 16.15);
    faceToward(p, {
      browRaise: .28, browTilt: -.20, browFurrow: .04, eyeOpen: .94,
      lidLower: .03, mouthCurve: -.02, cheek: 0, lipPress: .06,
    }, unsure);
    headToward(p, { headPitch: .025, headTilt: -.045 },
      hold(t, 14.95, 15.30, 15.65, 16.1));

    // One small recoil in response to Tarek, then an embarrassed held shape.
    const recoil = hold(t, 15.916, 16.20, 17.55, 18.2);
    faceToward(p, {
      browRaise: .44, browTilt: -.28, browFurrow: .03, eyeOpen: .99,
      lidLower: .02, mouthCurve: -.07, cheek: 0, lipPress: .18,
    }, recoil);
    headToward(p, { headPitch: .07, headTilt: .025 },
      hold(t, 16.05, 16.38, 17.55, 18.2));
    armToward(p, "armR", { out: .10, fwd: .15, elbow: .88 },
      hold(t, 16.08, 16.65, 17.6, 18.25));

    // His later silence should look different from the earlier surprise.
    const guilty = hold(t, 33.2, 33.65, 35.5, 35.9);
    faceToward(p, {
      browRaise: .24, browTilt: -.36, browFurrow: .06, eyeOpen: .80,
      lidLower: .10, mouthCurve: -.09, cheek: 0, lipPress: .21,
    }, guilty);
    headToward(p, { headPitch: .16, headTilt: -.025 },
      hold(t, 33.55, 34.15, 35.5, 35.9));
  }

  if (id === "tarek") {
    // Caught first; the reassuring smile is a later, deliberate cover.
    const caught = hold(t, 1.70, 1.98, 3.4, 4.436);
    faceToward(p, {
      browRaise: .48, browTilt: -.16, browFurrow: 0, eyeOpen: 1.01,
      lidLower: .02, mouthCurve: -.06, cheek: 0, lipPress: .13,
    }, caught);
    headToward(p, { headPitch: .025, headTilt: -.02 }, caught);

    const cover = hold(t, 4.436, 4.80, 6.70, 7.175);
    faceToward(p, {
      browRaise: .25, browTilt: -.13, browFurrow: .03, eyeOpen: .91,
      lidLower: .06, mouthCurve: .13, cheek: .04, lipPress: .025,
    }, cover);
    headToward(p, { headPitch: -.025, headTilt: .055 }, cover);

    const bark = hold(t, 15.916, 16.12, 17.28, 17.809);
    faceToward(p, {
      browRaise: -.22, browTilt: .15, browFurrow: .62, eyeOpen: .94,
      lidLower: .08, mouthCurve: -.08, cheek: 0, lipPress: .01,
    }, bark);
    headToward(p, { headPitch: .035, headTilt: -.025 }, bark);

    // Eyes register the connection first, then the head stops explaining.
    const discovery = hold(t, 22.45, 22.67, 23.55, 24.00);
    faceToward(p, {
      browRaise: .58, browTilt: -.18, browFurrow: 0, eyeOpen: 1.035,
      lidLower: 0, mouthCurve: -.07, cheek: 0, lipPress: .065,
    }, discovery);
    headToward(p, { headPitch: .035, headTilt: 0 },
      hold(t, 22.62, 22.91, 23.55, 24.00));

    const who = hold(t, 31.85, 32.04, 32.91, 33.2);
    faceToward(p, {
      browRaise: -.10, browTilt: .10, browFurrow: .48, eyeOpen: .99,
      lidLower: .035, mouthCurve: -.06, cheek: 0, lipPress: .015,
    }, who);
    headToward(p, { headPitch: -.035, headTilt: -.045 },
      hold(t, 32.00, 32.25, 32.75, 33.2));
  }

  if (id === "dilara") {
    // Focused accusation rather than the same maximum scowl throughout.
    const challenge = hold(t, .70, 1.03, 4.436, 4.75);
    faceToward(p, {
      browRaise: -.24, browTilt: .12, browFurrow: .48, eyeOpen: .89,
      lidLower: .10, mouthCurve: -.06, cheek: 0, lipPress: .02,
    }, challenge);
    headToward(p, { headPitch: .035, headTilt: -.025 }, challenge);

    const proof = hold(t, 7.175, 7.47, 9.42, 9.80);
    faceToward(p, {
      browRaise: -.33, browTilt: .16, browFurrow: .70, eyeOpen: .95,
      lidLower: .09, mouthCurve: -.10, cheek: 0, lipPress: .015,
    }, proof);
    headToward(p, { headPitch: .05, headTilt: -.035 }, proof);
    // Her right hand owns the test; only the left arm punctuates the evidence.
    armToward(p, "armL", { out: .20, fwd: .30, elbow: .90 },
      hold(t, 7.44, 7.80, 8.20, 8.95));

    const nameShock = hold(t, 17.809, 18.06, 18.80, 19.28);
    faceToward(p, {
      browRaise: .48, browTilt: -.18, browFurrow: 0, eyeOpen: 1.02,
      lidLower: .015, mouthCurve: -.06, cheek: 0, lipPress: .025,
    }, nameShock);
    headToward(p, { headPitch: -.02, headTilt: -.045 }, nameShock);

    const suspicion = hold(t, 18.95, 19.24, 19.83, 20.16);
    faceToward(p, {
      browRaise: -.10, browTilt: .10, browFurrow: .42, eyeOpen: .91,
      lidLower: .07, mouthCurve: -.07, cheek: 0, lipPress: .04,
    }, suspicion);
    headToward(p, { headPitch: .035, headTilt: .02 }, suspicion);

    // New information interrupts anger; the stillness is the reaction.
    const phoneNews = hold(t, 28.95, 29.16, 29.60, 29.98);
    faceToward(p, {
      browRaise: .51, browTilt: -.20, browFurrow: 0, eyeOpen: 1.035,
      lidLower: 0, mouthCurve: -.015, cheek: 0, lipPress: .075,
    }, phoneNews);
    headToward(p, { headPitch: -.02, headTilt: 0 },
      hold(t, 29.05, 29.29, 29.60, 29.98));
  }

  return p;
}


