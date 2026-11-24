// Użycie: node tools/plan.mjs <serveUrl/bundle> <compositionId> <chunks>
// Wypisuje (do $GITHUB_OUTPUT jeśli jest) frames=<N>, fps, matrix=<json>.
import { getCompositions } from "@remotion/renderer";
import fs from "node:fs";

const [serveUrl, id, chunksArg, limitArg] = process.argv.slice(2);
const comps = await getCompositions(serveUrl, { chromiumOptions: { gl: "swangle" } });
const c = comps.find((x) => x.id === id);
if (!c) { console.error(`Brak kompozycji ${id}. Dostępne: ${comps.map((x) => x.id).join(", ")}`); process.exit(1); }
const N = Number(limitArg) > 0 ? Math.min(Number(limitArg), c.durationInFrames) : c.durationInFrames;
const chunks = Math.max(1, Math.min(Number(chunksArg) || 20, N));
const size = Math.ceil(N / chunks);
const include = [];
for (let i = 0, a = 0; a < N; i++, a += size) {
  const b = Math.min(N - 1, a + size - 1);
  include.push({ idx: String(i).padStart(2, "0"), from: a, to: b });
}
const lines = [`frames=${N}`, `fps=${c.fps}`, `matrix=${JSON.stringify({ include })}`];
console.log(lines.join("\n"));
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join("\n") + "\n");
