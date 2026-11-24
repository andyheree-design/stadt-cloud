// Wersja chmurowa: tylko alias three (jedna instancja); bez aliasów do JARVIS-STUDIO.
import path from "path";
import { Config } from "@remotion/cli/config";

Config.overrideWebpackConfig((c) => ({
  ...c,
  resolve: {
    ...c.resolve,
    alias: {
      ...(c.resolve?.alias ?? {}),
      three$: path.resolve(process.cwd(), "node_modules/three/build/three.module.js"),
    },
  },
}));
