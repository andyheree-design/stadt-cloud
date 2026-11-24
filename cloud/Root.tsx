// AUTOGENEROWANE przez tools/sync.sh — nie edytuj ręcznie.
import React from "react";
import { Composition } from "remotion";
import { StadtLook, STADT_LOOK_FRAMES } from "../src/videos/stadt/StadtLook";
import { StadtE01, STADT_E01_FRAMES } from "../src/videos/stadt/StadtE01";
import { StadtE01v3, STADT_E01V3_FRAMES } from "../src/videos/stadt/StadtE01v3";
import { StadtE02, STADT_E02_FRAMES } from "../src/videos/stadt/StadtE02";
import { StadtAvatar } from "../src/videos/stadt/Avatar";
import { StadtBanner } from "../src/videos/stadt/Banner";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="StadtLook" component={StadtLook} durationInFrames={STADT_LOOK_FRAMES} fps={60} width={1080} height={1920} />
    <Composition id="StadtE01" component={StadtE01} durationInFrames={STADT_E01_FRAMES} fps={60} width={1080} height={1920} />
    <Composition id="StadtE01v3" component={StadtE01v3} durationInFrames={STADT_E01V3_FRAMES} fps={60} width={1080} height={1920} />
    <Composition id="StadtE02" component={StadtE02} durationInFrames={STADT_E02_FRAMES} fps={60} width={1080} height={1920} />
    <Composition id="StadtAvatar" component={StadtAvatar} durationInFrames={1} fps={60} width={1080} height={1080} />
    <Composition id="StadtBanner" component={StadtBanner} durationInFrames={1} fps={60} width={2560} height={1440} />
  </>
);
