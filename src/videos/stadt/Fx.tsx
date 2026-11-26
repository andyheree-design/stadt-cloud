// Postprocess jak we wzorze: miękki bloom (glow), płytka głębia ostrości w zbliżeniach, lekka winieta.
import React, { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { continueRender, delayRender, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { EffectComposer, Bloom, DepthOfField, Vignette, SMAA, N8AO, BrightnessContrast, HueSaturation, Noise, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

export const Fx: React.FC<{ focus?: [number, number, number] | null; bokeh?: number; bloom?: number; ao?: number; aoRadius?: number; bright?: number; contrast?: number; sat?: number; grain?: number; ca?: number }> = ({ focus, bokeh = 6, bloom = 0.35, ao = 2.2, aoRadius = 0.9, bright = 0, contrast = 0, sat = 0, grain = 0.06, ca = 0.0006 }) => {
  const target = useMemo(() => (focus ? new THREE.Vector3(...focus) : undefined), [focus?.[0], focus?.[1], focus?.[2]]);
  const caOff = useMemo(() => new THREE.Vector2(ca, ca), [ca]);
  // Remotion woła advance() raz na klatkę, zanim kompozytor zdąży się zainicjalizować → pusta klatka.
  // Dorenderowujemy klatkę po zamontowaniu efektów (2× rAF), dopiero potem Remotion robi zrzut.
  const frame = useCurrentFrame(); const advance = useThree((st) => st.advance);
  useEffect(() => {
    const h = delayRender("fx frame"); let id = requestAnimationFrame(() => { advance(performance.now()); id = requestAnimationFrame(() => { advance(performance.now()); continueRender(h); }); });
    return () => { cancelAnimationFrame(id); continueRender(h); };
  }, [frame, advance]);
  return (
    <EffectComposer multisampling={0}>
      {ao > 0 ? <N8AO aoRadius={aoRadius} intensity={ao} distanceFalloff={1} quality="high" halfRes={false} /> : <></>}
      <Bloom intensity={bloom} luminanceThreshold={0.82} luminanceSmoothing={0.25} mipmapBlur />
      {target ? <DepthOfField target={target} focalLength={0.04} bokehScale={bokeh} height={960} /> : <></>}
      {bright || contrast ? <BrightnessContrast brightness={bright} contrast={contrast} /> : <></>}
      {sat ? <HueSaturation saturation={sat} /> : <></>}
      {ca ? <ChromaticAberration offset={caOff} radialModulation={false} modulationOffset={0} /> : <></>}
      <Vignette offset={0.3} darkness={0.42} />
      {grain ? <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={grain} /> : <></>}
      <SMAA />
    </EffectComposer>
  );
};
