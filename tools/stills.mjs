// node tools/stills.mjs <Comp> <plik z "id klatka"> <outDir> [scale] [entry]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "fs"; import path from "path";
const [comp, list, out, scale = "0.3", entry = "src/index.ts"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve(entry) });
const composition = await selectComposition({ serveUrl, id: comp, chromiumOptions: { gl: "swangle" } });
for (const ln of fs.readFileSync(list, "utf8").trim().split(/\r?\n/)) {
  const [id, f] = ln.split(" "); const t0 = Date.now();
  await renderStill({ serveUrl, composition, frame: +f, output: path.join(out, `${f.padStart(5, "0")}_${id}.jpg`), imageFormat: "jpeg", scale: +scale, chromiumOptions: { gl: "swangle" }, timeoutInMilliseconds: 120000 });
  console.log(id, f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
