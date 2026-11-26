// Napis jak we wzorze: JEDNO słowo naraz, biały gruby sans, cienki czarny kontur, ~58% wysokości kadru, lekki „pop” na wejściu.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export type Word = { t: string; s: number; e: number; c?: string };
export const Caption: React.FC<{ words: Word[]; y?: number; size?: number; color?: string; font?: string; stroke?: number; big?: RegExp; hl?: RegExp; hlColor?: string; shadow?: string; spacing?: number }> = ({ words, y = 0.58, size = 64, color = "#fff", font = "'Arial Black', 'Helvetica Neue', Arial, sans-serif", stroke = 5, big, hl, hlColor = "#e2fd00", shadow = "0 3px 0 rgba(0,0,0,.35)", spacing = 0.5 }) => {
  const f = useCurrentFrame();
  const w = words.find((x) => f >= x.s && f < Math.max(x.e, x.s + 6));
  if (!w) return null;
  const k = interpolate(f - w.s, [0, 3, 6], [0.82, 1.06, 1], { extrapolateRight: "clamp" });
  const txt = w.t.replace(/[„“”"]/g, "");
  // bardzo długie złożenia (DE, np. „neunzehnhundertachtundneunzig”) łamiemy na 2 wiersze z dywizem zamiast zmniejszać do nieczytelności
  const parts = txt.length > 18 ? [txt.slice(0, Math.ceil(txt.length / 2)) + "-", txt.slice(Math.ceil(txt.length / 2))] : [txt];
  const fit = Math.min(1, 15 / Math.max(1, ...parts.map((q) => q.length))); // długie złożenia (DE) mieszczą się w kadrze
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: `${y * 100}%`, left: 0, right: 0, textAlign: "center", transform: `translateY(-50%) scale(${k})`,
        fontFamily: font, fontWeight: 900, fontSize: size * fit * (big && big.test(txt) ? 1.35 : 1), color: w.c ?? (hl && hl.test(txt) ? hlColor : color), letterSpacing: spacing,
        WebkitTextStroke: `${stroke}px #000`, paintOrder: "stroke fill", textShadow: shadow, lineHeight: 1.0,
      }}>{parts.map((q, i) => <div key={i}>{q}</div>)}</div>
    </AbsoluteFill>
  );
};

// ---- styl wzoru (Roblox story, pomiar klatki 0:02 wzoru 1080×1920): środek napisu y≈0.73 H, słowo „watching” ≈457 px szer.,
// wys. liter ≈85 px (font ≈112 px), kontur czarny ≈9–10 px widoczny, słowa-klucze limonkowe #e2fd00, reszta biała.
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
const nunito = loadNunito("normal", { weights: ["900"] }).fontFamily;
export const CaptionWzor: React.FC<{ words: Word[]; hl?: RegExp }> = ({ words, hl }) =>
  <Caption words={words} y={0.73} size={112} color="#fff" font={nunito} stroke={20} hl={hl} hlColor="#e2fd00" spacing={0} shadow="0 7px 0 rgba(0,0,0,.55), 0 10px 18px rgba(0,0,0,.35)" />;
