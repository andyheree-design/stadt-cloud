// Lekki punkt wejścia tylko dla testu wyglądu wzoru (pełny Root bundluje też ehre/kos z aliasem @kos, którego tu brak).
import React from "react";
import { Composition, registerRoot } from "remotion";
import { StadtWzorLook, STADT_WZOR_LOOK_FRAMES } from "./videos/stadt/StadtWzorLook";
const WzorRoot: React.FC = () => <Composition id="StadtWzorLook" component={StadtWzorLook} durationInFrames={STADT_WZOR_LOOK_FRAMES} fps={60} width={1080} height={1920} />;
registerRoot(WzorRoot);
