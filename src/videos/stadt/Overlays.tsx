// Warstwy 2D E01: licznik komentarzy, wklejony interfejs wideo (meta-chwyt wzoru, własny wygląd, bez logo),
// karta posta, dymki komentarzy, kartka „Sie waren nicht da.”, błysk. Wszystko poza strefą napisu (58%).
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const FONT = "'Arial Black', 'Helvetica Neue', Arial, sans-serif";
const de = (n: number) => n >= 1e6 ? `${(n / 1e6).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio.` : Math.round(n).toLocaleString("de-DE");
const Bubble: React.FC<{ size: number; color?: string }> = ({ size, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 48 48"><path d="M24 5C12.4 5 3 12.8 3 22.4c0 5.6 3.2 10.5 8.1 13.7L9 44l9.3-5.2c1.8.4 3.7.6 5.7.6 11.6 0 21-7.8 21-17.4S35.6 5 24 5z" fill={color} stroke="#000" strokeWidth="2.5" /></svg>
);
const Heart: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48"><path d="M24 43S4 30.5 4 17.3C4 10.5 9.2 6 14.8 6c4 0 7.3 2.3 9.2 5.6C25.9 8.3 29.2 6 33.2 6 38.8 6 44 10.5 44 17.3 44 30.5 24 43 24 43z" fill="#ff2d55" stroke="#000" strokeWidth="2.5" /></svg>
);

/** licznik komentarzy na górze — „rattert” od from do to w czasie dur klatek */
export const Counter: React.FC<{ from: number; to: number; dur?: number; at: number }> = ({ from, to, dur = 40, at }) => {
  const f = useCurrentFrame() - at, { fps } = useVideoConfig();
  const v = interpolate(f, [0, dur], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3) });
  const pop = spring({ frame: f, fps, config: { damping: 9, stiffness: 220 } }), shake = f < dur ? Math.sin(f * 2.3) * 4 : 0;
  return (
    <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${0.6 + 0.4 * pop}) rotate(${shake * 0.4}deg)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, background: "rgba(0,0,0,.72)", borderRadius: 60, padding: "14px 36px 14px 22px", border: "5px solid #fff" }}>
        <Bubble size={84} color="#ffd23f" />
        <span style={{ fontFamily: FONT, fontSize: 82, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{de(v)}</span>
      </div>
    </div>
  );
};

/** wklejony interfejs wideo: kolumna ikon po prawej + nick i podpis na dole (nad strefą UI platformy) */
export const VideoUI: React.FC<{ likes: number; comments: number; user: string; caption: string; at: number; grow?: number }> = ({ likes, comments, user, caption, at, grow = 1 }) => {
  const f = useCurrentFrame() - at, k = interpolate(f, [0, 50], [1, grow], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const item = (icon: React.ReactNode, n: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>{icon}
      <span style={{ fontFamily: FONT, fontSize: 34, color: "#fff", WebkitTextStroke: "3px #000", paintOrder: "stroke fill" }}>{n}</span></div>
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", right: 150, top: 760, display: "flex", flexDirection: "column", gap: 34, alignItems: "center" }}>
        <div style={{ width: 104, height: 104, borderRadius: 52, background: "linear-gradient(135deg,#d63a3a,#1d5fd1)", border: "5px solid #fff", fontFamily: FONT, fontSize: 52, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>H</div>
        {item(<Heart size={96} />, de(likes * k))}
        {item(<Bubble size={92} />, de(comments * k))}
      </div>
      <div style={{ position: "absolute", left: 60, right: 300, top: 1330, fontFamily: "Arial, sans-serif", color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,.9)" }}>
        <div style={{ fontWeight: 800, fontSize: 44 }}>@{user}</div>
        <div style={{ fontSize: 38, marginTop: 8 }}>{caption}</div>
      </div>
    </AbsoluteFill>
  );
};

/** karta posta (burmistrz) */
export const PostCard: React.FC<{ name: string; text: string; at: number; y?: number }> = ({ name, text, at, y = 260 }) => {
  const f = useCurrentFrame() - at, { fps } = useVideoConfig(), s = spring({ frame: f, fps, config: { damping: 11 } });
  return (
    <div style={{ position: "absolute", top: y, left: 90, right: 90, transform: `translateY(${(1 - s) * -80}px) scale(${0.8 + 0.2 * s})`, opacity: s }}>
      <div style={{ background: "#fff", borderRadius: 34, padding: "30px 36px", boxShadow: "0 12px 40px rgba(0,0,0,.45)", border: "4px solid #111", fontFamily: "Arial, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 84, height: 84, borderRadius: 42, background: "#23232f", border: "4px solid #c21d1d" }} />
          <div><div style={{ fontWeight: 900, fontSize: 40, color: "#111" }}>{name} <span style={{ color: "#1d9bf0" }}>✔</span></div><div style={{ fontSize: 30, color: "#666" }}>@hinterhausen_rathaus · jetzt</div></div>
        </div>
        <div style={{ fontSize: 50, fontWeight: 700, color: "#111", marginTop: 20, lineHeight: 1.15 }}>{text}</div>
      </div>
    </div>
  );
};

/** dymki komentarzy zalewają ekran */
export const Comments: React.FC<{ texts: string[]; at: number; every?: number; y0?: number }> = ({ texts, at, every = 7, y0 = 230 }) => {
  const f = useCurrentFrame() - at, { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {texts.map((t, i) => {
        const s = spring({ frame: f - i * every, fps, config: { damping: 10, stiffness: 180 } });
        if (f < i * every) return null;
        const left = 50 + ((i * 337) % 520), top = y0 + ((i * 211) % 7) * 120 + (i % 2) * 40;
        const top2 = top > 940 ? top + 300 : top; // omija strefę napisu
        return <div key={i} style={{ position: "absolute", left, top: top2, transform: `scale(${s}) rotate(${((i * 7) % 9) - 4}deg)`, transformOrigin: "left center",
          background: i % 3 === 0 ? "#ffd23f" : "#fff", borderRadius: 28, padding: "14px 26px", border: "4px solid #111", fontFamily: FONT, fontSize: 40, color: "#111", whiteSpace: "nowrap", boxShadow: "0 6px 0 rgba(0,0,0,.35)" }}>{t}</div>;
      })}
    </AbsoluteFill>
  );
};

/** kartka listonosza */
export const Note: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame() - at, { fps } = useVideoConfig(), s = spring({ frame: f, fps, config: { damping: 12 } });
  return (
    <div style={{ position: "absolute", top: 300, left: 200, right: 200, transform: `rotate(${-6 + (1 - s) * 30}deg) translateY(${(1 - s) * -400}px)` }}>
      <div style={{ background: "#fff6c8", padding: "40px 36px", border: "4px solid #111", boxShadow: "0 14px 30px rgba(0,0,0,.45)", fontFamily: "'Comic Sans MS', Arial, sans-serif", fontSize: 52, color: "#222", textAlign: "center" }}>
        <div style={{ fontFamily: FONT, color: "#1d2a5c", fontSize: 40 }}>POST</div>Sie waren<br />nicht da.
      </div>
    </div>
  );
};

/** błysk (biały) albo czerń; u = 0..1 */
export const Flash: React.FC<{ color?: string; opacity: number }> = ({ color = "#fff", opacity }) => <AbsoluteFill style={{ background: color, opacity }} />;
