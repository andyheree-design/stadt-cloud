// Fonty lokalne z public/fonts (SIL OFL, pobrane z Google Fonts, podzbiór „latin” — zawiera ä ö ü ß).
// Zero pobierania z sieci przy renderze: każdy krój ładowany przez FontFace + staticFile, render czeka (delayRender).
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

const loaded = new Map<string, string>();
const load = (family: string, file: string, weight: string): string => {
  const key = family + weight;
  if (loaded.has(key)) return family;
  loaded.set(key, family);
  if (typeof window === "undefined" || typeof FontFace === "undefined") return family;
  const h = delayRender("font " + family + " " + weight);
  const f = new FontFace(family, `url(${staticFile("fonts/" + file)}) format("woff2")`, { weight, style: "normal", display: "block" });
  f.load().then(() => { document.fonts.add(f); continueRender(h); }).catch((e) => cancelRender(e));
  return family;
};

export const poppins = load("Poppins Local", "Poppins-800.woff2", "800");
export const nunito = load("Nunito Local", "Nunito-900.woff2", "900");
/** Fredoka zmienna 300–700 */
export const fredoka = load("Fredoka Local", "Fredoka-var.woff2", "300 700");
