"use client";

import { Briefcase, Zap, Activity, Cpu } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * AI Architect Core — a circular brain-core HUD.
 * Generated silver brain (public/brain-core.png, transparent) sits in a fixed
 * dark reactor chamber, wrapped in concentric segmented rings, gauge ticks,
 * counter-rotating scan rings, an animated pulse meter, and crisp right-angle
 * connectors to real milestone labels. All theme-token colored + animated.
 */

const VB = 600;
const C = VB / 2;

// gauge tick marks
const TICKS = Array.from({ length: 72 }, (_, i) => {
  const a = (i / 72) * Math.PI * 2;
  const major = i % 6 === 0;
  const r1 = 236;
  const r2 = major ? 250 : 244;
  return {
    x1: C + r1 * Math.cos(a),
    y1: C + r1 * Math.sin(a),
    x2: C + r2 * Math.cos(a),
    y2: C + r2 * Math.sin(a),
    major,
  };
});

// decorative orbit nodes
const ORBIT = [18, 74, 128, 200, 250, 312].map((deg, i) => {
  const a = (deg * Math.PI) / 180;
  return { x: C + 210 * Math.cos(a), y: C + 210 * Math.sin(a), big: i % 2 === 0, key: deg };
});

// milestone callouts — real goal themes, placed at the four diagonals
interface Callout {
  deg: number;
  label: string;
  icon: LucideIcon;
  side: "l" | "r";
}
const CALLOUTS: Callout[] = [
  { deg: -32, label: "CAREER", icon: Briefcase, side: "r" },
  { deg: 32, label: "REVENUE", icon: Zap, side: "r" },
  { deg: 148, label: "HEALTH", icon: Activity, side: "l" },
  { deg: 212, label: "LIFEOS", icon: Cpu, side: "l" },
];

function polar(deg: number, r: number) {
  const a = (deg * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
}

export function BrainCore() {
  return (
    <div className="relative w-full max-w-[540px] mx-auto aspect-square">
      {/* theme glow */}
      <div
        className="pointer-events-none absolute inset-[14%] rounded-full blur-3xl opacity-60"
        style={{ background: "radial-gradient(circle, var(--glow), transparent 66%)" }}
        aria-hidden
      />
      {/* fixed dark reactor chamber so the silver brain reads on light themes too */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: "52%",
          height: "52%",
          background: "radial-gradient(circle, rgba(3,6,14,0.72) 42%, rgba(3,6,14,0.28) 70%, transparent 78%)",
        }}
        aria-hidden
      />
      {/* the brain (centered via grid so the float animation's transform is free) */}
      <div className="absolute inset-0 grid place-items-center pointer-events-none">
        <img
          src="/brain-core.png"
          alt="AI Architect Core"
          className="w-[46%] anim-float select-none"
          style={{ filter: "hue-rotate(var(--brain-tint, 0deg)) drop-shadow(0 0 18px var(--glow))" }}
          draggable={false}
        />
      </div>

      {/* HUD */}
      <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 w-full h-full" fill="none" aria-hidden>
        {/* outer hairline */}
        <circle cx={C} cy={C} r={288} stroke="var(--hairline)" strokeWidth="1" />
        {/* bright segmented band */}
        <circle
          cx={C}
          cy={C}
          r={268}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="10"
          opacity="0.28"
          strokeDasharray="300 70 150 70"
          strokeLinecap="round"
        />
        <circle cx={C} cy={C} r={256} stroke="var(--hairline)" strokeWidth="1" />

        {/* gauge ticks */}
        <g>
          {TICKS.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.major ? "var(--neon-3)" : "var(--hairline)"}
              strokeWidth={t.major ? 1.4 : 1}
              opacity={t.major ? 0.8 : 0.5}
            />
          ))}
        </g>

        {/* rotating segmented neon ring */}
        <g className="anim-spin-slow" style={{ transformOrigin: "300px 300px" }}>
          <circle
            cx={C}
            cy={C}
            r={214}
            stroke="var(--neon)"
            strokeWidth="2.5"
            opacity="0.85"
            strokeDasharray="80 34 130 40 60 50"
            strokeLinecap="round"
          />
        </g>
        {/* sweeping highlight arc */}
        <g className="anim-spin-slow" style={{ transformOrigin: "300px 300px", animationDuration: "8s" }}>
          <path
            d={`M ${C + 226} ${C} A 226 226 0 0 1 ${polar(70, 226).x} ${polar(70, 226).y}`}
            stroke="var(--neon-2)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.9"
          />
        </g>

        {/* counter-rotating dashed scan ring */}
        <g className="anim-spin-rev" style={{ transformOrigin: "300px 300px" }}>
          <circle cx={C} cy={C} r={180} stroke="var(--neon-2)" strokeWidth="1.5" strokeDasharray="2 12" opacity="0.6" />
        </g>
        {/* inner hairline chamber ring */}
        <circle cx={C} cy={C} r={150} stroke="var(--hairline-strong)" strokeWidth="1" opacity="0.7" />

        {/* orbit nodes */}
        {ORBIT.map((n) => (
          <g key={n.key}>
            <circle cx={n.x} cy={n.y} r={n.big ? 10 : 6} fill="none" stroke="var(--neon)" strokeWidth="1" opacity="0.4">
              <animate attributeName="r" from={n.big ? 4 : 3} to={n.big ? 14 : 10} dur="3s" begin={`${(n.key % 5) * 0.4}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.5" to="0" dur="3s" begin={`${(n.key % 5) * 0.4}s`} repeatCount="indefinite" />
            </circle>
            <circle cx={n.x} cy={n.y} r={n.big ? 3.2 : 2.2} fill="var(--neon)" />
          </g>
        ))}

        {/* callout connectors (crisp right-angle) */}
        {CALLOUTS.map((co) => {
          const node = polar(co.deg, 268);
          const bend = polar(co.deg, 292);
          const endX = co.side === "r" ? 588 : 12;
          return (
            <g key={co.label}>
              <circle cx={node.x} cy={node.y} r="3.5" fill="var(--neon-2)" />
              <path
                d={`M ${node.x} ${node.y} L ${bend.x} ${bend.y} L ${endX} ${bend.y}`}
                stroke="var(--hairline-strong)"
                strokeWidth="1"
                fill="none"
              />
              <circle cx={endX} cy={bend.y} r="2.5" fill="var(--neon-2)" />
            </g>
          );
        })}
      </svg>

      {/* callout labels (HTML overlay, positioned at connector ends) */}
      {CALLOUTS.map((co) => {
        const bend = polar(co.deg, 292);
        const topPct = (bend.y / VB) * 100;
        return (
          <div
            key={co.label}
            className="absolute flex items-center gap-1.5"
            style={{
              top: `${topPct}%`,
              [co.side === "r" ? "right" : "left"]: "0.5%",
              transform: "translateY(-50%)",
              flexDirection: co.side === "r" ? "row-reverse" : "row",
            }}
          >
            <co.icon className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--neon)" }} />
            <span className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground">{co.label}</span>
          </div>
        );
      })}

      {/* animated meter — top center */}
      <div className="absolute top-[1%] left-1/2 -translate-x-1/2 w-[62%]">
        <div className="glass rounded-full px-3 py-1.5 flex items-center gap-2.5">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Core Sync</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden relative" style={{ background: "var(--surface-1)" }}>
            {/* honest activity sweep, not a fill-level metric */}
            <div
              className="absolute inset-y-0 w-1/3 rounded-full"
              style={{
                background: "linear-gradient(90deg, transparent, var(--neon), var(--neon-2), transparent)",
                animation: "core-sweep 2.2s ease-in-out infinite",
              }}
            />
          </div>
          <span className="flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full anim-breathe" style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }} />
            <span className="text-[9px] font-mono tracking-[0.14em] text-muted-foreground">LIVE</span>
          </span>
        </div>
      </div>

      {/* core caption — bottom center */}
      <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2">
        <div className="glass rounded-full px-4 py-1.5">
          <span className="text-[11px] font-mono uppercase tracking-[0.28em] text-foreground whitespace-nowrap">
            AI Architect Core
          </span>
        </div>
      </div>
    </div>
  );
}
