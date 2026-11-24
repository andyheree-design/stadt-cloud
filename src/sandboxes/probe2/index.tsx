import React from "react";
import { Composition, registerRoot, AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { EffectComposer } from "@react-three/postprocessing";
import { ComposerReady } from "../../lib/ComposerReady";
import { ToneMappingEffect, ToneMappingMode } from "postprocessing";
const tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL });
const P: React.FC = () => (
  <AbsoluteFill style={{ background: "white" }}>
    <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, preserveDrawingBuffer: true }} camera={{ position: [0, 0, 5] }}>
      <mesh><boxGeometry args={[2, 2, 2]} /><meshBasicMaterial color="red" /></mesh><EffectComposer multisampling={4}><primitive object={tone} dispose={null} /></EffectComposer><ComposerReady />
      
    </ThreeCanvas>
  </AbsoluteFill>
);
registerRoot(() => <Composition id="Probe" component={P} durationInFrames={1} fps={30} width={1080} height={1920} />);
