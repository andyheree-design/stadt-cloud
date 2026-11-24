// Napis jak we wzorze: JEDNO słowo naraz, biały gruby sans, cienki czarny kontur, ~58% wysokości kadru, lekki „pop” na wejściu.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export type Word = { t: string; s: number; e: number; c?: string };
export const Caption: React.FC<{ words: Word[]; y?: number; size?: number; color?: string; font?: string; stroke?: number; big?: RegExp }> = ({ words, y = 0.58, size = 64, color = "#fff", font = "'Arial Black', 'Helvetica Neue', Arial, sans-serif", stroke = 5, big }) => {
  const f = useCurrentFrame();
  const w = words.find((x) => f >= x.s && f < Math.max(x.e, x.s + 6));
  if (!w) return null;
  const k = interpolate(f - w.s, [0, 3, 6], [0.82, 1.06, 1], { extrapolateRight: "clamp" });
  const txt = w.t.replace(/[„“”"]/g, ""), fit = Math.min(1, 15 / Math.max(1, txt.length)); // długie złożenia (DE) mieszczą się w kadrze
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: `${y * 100}%`, left: 0, right: 0, textAlign: "center", transform: `translateY(-50%) scale(${k})`,
        fontFamily: font, fontWeight: 900, fontSize: size * fit * (big && big.test(txt) ? 1.35 : 1), color: w.c ?? color, letterSpacing: 0.5,
        WebkitTextStroke: `${stroke}px #000`, paintOrder: "stroke fill", textShadow: "0 3px 0 rgba(0,0,0,.35)",
      }}>{txt}</div>
    </AbsoluteFill>
  );
};
