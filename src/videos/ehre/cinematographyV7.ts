/**
 * Emotional coverage for the intervals left in the lounge master.
 * Call after the existing close-shot chain. false preserves its camera.
 *
 * The current close helper calls its third argument "side": it is a lateral
 * camera offset in world units, not an angle. Keep the established reverse-shot
 * signs, lift the frame above the table, and stay off the central shisha axis.
 */
export function directCoverage(
  t: number,
  close: (id: any, dist: number, yaw: number, dy: number, fov: number) => void,
): boolean {
  // Hold the accusation after the opening hook, before Tarek's first answer.
  if (t >= 3.1 && t < 4.436) {
    close("dilara", 1.58, -0.38, 0.18, 39);
    return true;
  }

  // The outburst belongs to Tarek; its consequence belongs to Kevin.
  if (t >= 15.916 && t < 17.16) {
    close("tarek", 1.48, -0.42, 0.17, 39);
    return true;
  }
  if (t >= 17.16 && t < 17.809) {
    close("kevin", 1.44, 0.40, 0.18, 39);
    return true;
  }

  // Continue Dilara's established shot; cut on the name, not a new sentence.
  if (t >= 19.4 && t < 19.65) {
    close("dilara", 1.55, -0.32, 0.18, 39);
    return true;
  }
  if (t >= 19.65 && t < 20.16) {
    close("tarek", 1.42, -0.40, 0.16, 38);
    return true;
  }

  // Leave room for the attempted explanation, then commit to his realisation.
  if (t >= 20.16 && t < 22.45) {
    close("tarek", 1.72, -0.43, 0.29, 41);
    return true;
  }
  if (t >= 22.45 && t < 23.55) {
    close("tarek", 1.30, -0.40, 0.14, 38);
    return true;
  }

  // A human discovery before the existing phone insert at 26.05.
  if (t >= 25.15 && t < 26.05) {
    close("tarek", 1.44, -0.40, 0.17, 39);
    return true;
  }

  // Suspicion crosses the reverse shot; let Kevin's retreat finish the beat.
  if (t >= 33.2 && t < 34.25) {
    close("tarek", 1.45, -0.44, 0.17, 39);
    return true;
  }
  if (t >= 34.25 && t < 35.7) {
    close("kevin", 1.44, 0.40, 0.21, 39);
    return true;
  }

  // Hook, smoking, phone, Mama, Abi, and all other coverage stay with the caller.
  return false;
}

