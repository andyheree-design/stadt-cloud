// @react-three/postprocessing 3.x builds its EffectComposer in a useEffect, after Remotion's single
// advance() for the frame, so that advance renders nothing and the still comes out blank.
// This re-advances once the composer exists and holds the frame until it has rendered.
import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame, useDelayRender } from "remotion";

export const ComposerReady: React.FC = () => {
  const advance = useThree((s) => s.advance);
  const f = useCurrentFrame();
  const { delayRender, continueRender } = useDelayRender();
  useLayoutEffect(() => {
    const h = delayRender(`composer frame ${f}`);
    let r = requestAnimationFrame(() => {
      r = requestAnimationFrame(() => { advance(performance.now()); continueRender(h); });
    });
    return () => { cancelAnimationFrame(r); continueRender(h); };
  }, [f, advance, delayRender, continueRender]);
  return null;
};
