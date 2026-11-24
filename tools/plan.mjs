// Użycie: node tools/plan.mjs <serveUrl/bundle> <compositionId> <chunks>
// Wypisuje (do $GITHUB_OUTPUT jeśli jest) frames=<N>, fps, matrix=<json>.
import { getCompositions } from "@remotion/renderer";
import fs from "node:fs";

const [serveUrl, id, chunksArg, limitArg, startArg] = process.argv.slice(2);
const comps = await getCompositions(serveUrl, { chromiumOptions: { gl: "swangle" } });
const c = comps.find((x) => x.id === id);
if (!c) { console.error(`Brak kompozycji ${id}. Dostępne: ${comps.map((x) => x.id).join(", ")}`); process.exit(1); }
const N = Number(limitArg) > 0 ? Math.min(Number(limitArg), c.durationInFrames) : c.durationInFrames;
const S = Math.max(0, Math.min(Number(startArg) || 0, N - 1)); // start: render od tej klatki (reszta np. na Modal)
const chunks = Math.max(1, Math.min(Number(chunksArg) || 20, N - S));
const size = Math.ceil((N - S) / chunks);
const include = [];
for (let i = 0, a = S; a < N; i++, a += size) {
  const b = Math.min(N - 1, a + size - 1);
  include.push({ idx: String(i).padStart(2, "0"), from: a, to: b });
}
const lines = [`frames=${N - S}`, `fps=${c.fps}`, `matrix=${JSON.stringify({ include })}`];
console.log(lines.join("\n"));
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join("\n") + "\n");
