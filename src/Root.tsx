import {EhreE01V7} from "./videos/ehre/EhreE01V7";
import {EhreE01V6} from "./videos/ehre/EhreE01V6";
import {EhreE01V5} from "./videos/ehre/EhreE01V5";
import {EhrePerformanceLab} from "./videos/ehre/EhrePerformanceLab";
import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { StadtLook, STADT_LOOK_FRAMES } from "./videos/stadt/StadtLook";
import { StadtE01, STADT_E01_FRAMES } from "./videos/stadt/StadtE01";
import { StadtE01v3, STADT_E01V3_FRAMES } from "./videos/stadt/StadtE01v3";
import { StadtAvatar } from "./videos/stadt/Avatar";
import { StadtBanner } from "./videos/stadt/Banner";
import { KosLook, KOS_LOOK_FRAMES } from "./videos/kos/KosLook";
import { KosE04, KOS_E04_FRAMES } from "./videos/kos/KosE04";
import { EhreLook, EHRE_LOOK_FRAMES } from "./videos/ehre/EhreLook";
import { EhreE01, EHRE_E01_FRAMES } from "./videos/ehre/EhreE01";

import {EhreE01Series, EHRE_SERIES_FRAMES} from "./videos/ehre/EhreE01Series";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="EhreE01V7" component={EhreE01V7} durationInFrames={1185} fps={30} width={1080} height={1920} />
    <Composition id="EhreE01V6" component={EhreE01V6} durationInFrames={1140} fps={30} width={1080} height={1920} />
    <Composition id="EhreE01V5" component={EhreE01V5} durationInFrames={1188} fps={30} width={1080} height={1920} />
    <Composition id="EhrePerformanceLab" component={EhrePerformanceLab} durationInFrames={360} fps={30} width={1080} height={1920} />
    <Composition id="StadtLook" component={StadtLook} durationInFrames={STADT_LOOK_FRAMES} fps={60} width={1080} height={1920} />
    <Composition id="StadtE01" component={StadtE01} durationInFrames={STADT_E01_FRAMES} fps={60} width={1080} height={1920} />
    <Composition id="StadtE01v3" component={StadtE01v3} durationInFrames={STADT_E01V3_FRAMES} fps={60} width={1080} height={1920} />
    <Composition id="StadtAvatar" component={StadtAvatar} durationInFrames={1} fps={60} width={1080} height={1080} />
    <Composition id="StadtBanner" component={StadtBanner} durationInFrames={1} fps={60} width={2560} height={1440} />
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="KosLook" component={KosLook} durationInFrames={KOS_LOOK_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="KosE04" component={KosE04} durationInFrames={KOS_E04_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="EhreLook" component={EhreLook} durationInFrames={EHRE_LOOK_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="EhreE01" component={EhreE01} durationInFrames={EHRE_E01_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="EhreE01Series" component={EhreE01Series} durationInFrames={EHRE_SERIES_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
