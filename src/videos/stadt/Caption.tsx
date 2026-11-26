// Napis jak we wzorze: JEDNO słowo naraz, biały gruby sans, cienki czarny kontur, ~58% wysokości kadru, lekki „pop” na wejściu.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export type Word = { t: string; s: number; e: number; c?: string };
export const Caption: React.FC<{ words: Word[]; y?: number; size?: number; color?: string; font?: string; stroke?: number; big?: RegExp; hl?: RegExp; hlColor?: string; shadow?: string; spacing?: number; weight?: number; lower?: boolean }> = ({ weight = 900, lower = false, words, y = 0.58, size = 64, color = "#fff", font = "'Arial Black', 'Helvetica Neue', Arial, sans-serif", stroke = 5, big, hl, hlColor = "#e2fd00", shadow = "0 3px 0 rgba(0,0,0,.35)", spacing = 0.5 }) => {
  const f = useCurrentFrame();
  const w = words.find((x) => f >= x.s && f < Math.max(x.e, x.s + 6));
  if (!w) return null;
  const k = interpolate(f - w.s, [0, 3, 6], [0.82, 1.06, 1], { extrapolateRight: "clamp" });
  const raw = w.t.replace(/[„“”"]/g, ""), txt = lower ? raw.toLowerCase() : raw;
  // bardzo długie złożenia (DE, np. „neunzehnhundertachtundneunzig”) łamiemy na 2 wiersze z dywizem zamiast zmniejszać do nieczytelności
  const parts = txt.length > 18 ? [txt.slice(0, Math.ceil(txt.length / 2)) + "-", txt.slice(Math.ceil(txt.length / 2))] : [txt];
  const fit = Math.min(1, 15 / Math.max(1, ...parts.map((q) => q.length))); // długie złożenia (DE) mieszczą się w kadrze
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: `${y * 100}%`, left: 0, right: 0, textAlign: "center", transform: `translateY(-50%) scale(${k})`,
        fontFamily: font, fontWeight: weight, fontSize: size * fit * (big && big.test(txt) ? 1.35 : 1), color: w.c ?? (hl && hl.test(raw) ? hlColor : color), letterSpacing: spacing,
        WebkitTextStroke: `${stroke}px #000`, paintOrder: "stroke fill", textShadow: shadow, lineHeight: 1.0,
      }}>{parts.map((q, i) => <div key={i}>{q}</div>)}</div>
    </AbsoluteFill>
  );
};

// ---- styl wzoru (Roblox story, pomiar klatki 0:02 wzoru 1080×1920): środek napisu y≈0.73 H, słowo „watching” ≈457 px szer.,
// wys. liter ≈85 px (font ≈112 px), kontur czarny ≈9–10 px widoczny, słowa-klucze limonkowe #e2fd00, reszta biała.
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
const nunito = loadNunito("normal", { weights: ["900"] }).fontFamily;
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
const poppins = loadPoppins("normal", { weights: ["800"] }).fontFamily;
/** napisy wzoru. Domyślnie „yellow” = jak klipy 7711764636965588257 / 7712451364546252065: małe litery, geometryczny gruby krój (Poppins 800),
 *  żółty #FFE500 z czarnym konturem, środek y≈0.735 H, słowo 7–10 liter ≈ 450 px szer. „white” = poprzedni wariant (biały + limonkowe słowa-klucze). */
export const CaptionWzor: React.FC<{ words: Word[]; hl?: RegExp; variant?: "yellow" | "white" }> = ({ words, hl, variant = "yellow" }) => variant === "yellow"
  ? <Caption words={words} y={0.735} size={100} color="#FFE500" font={poppins} weight={800} lower stroke={14} hl={hl} hlColor="#FFE500" spacing={0} shadow="0 5px 0 rgba(0,0,0,.6), 0 8px 14px rgba(0,0,0,.3)" />
  : <Caption words={words} y={0.73} size={112} color="#fff" font={nunito} stroke={20} hl={hl} hlColor="#e2fd00" spacing={0} shadow="0 7px 0 rgba(0,0,0,.55), 0 10px 18px rgba(0,0,0,.35)" />;
