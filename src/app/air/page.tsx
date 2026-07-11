"use client";

import { useEffect, useState } from "react";
import { Wind, Thermometer, Droplets, Cloud, Sparkles, MapPin, Home, Trees, Gauge } from "lucide-react";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";

interface AirMonitor {
  id: number;
  name: string;
  pm25: number | null;
  co2: number | null;
  temp: number | null;
  rh: number | null;
  tvoc: number | null;
  nox: number | null;
  aqi: number | null;
  aqiLabel: string | null;
  timestamp: string;
  type: string | null;
}

interface AirData {
  fetched_at: string | null;
  count: number;
  worst_aqi: number | null;
  worst_label: string | null;
  monitors: AirMonitor[];
  error?: string;
}

/* ---------- theme-token color maps (re-theme with [data-theme]) ----------
   The US EPA AQI bands are semantic data, not decoration — each band maps to
   the nearest theme token (green→positive, yellow→warn, orange→dim-money,
   red→dim-creative, purple→dim-relationships, maroon→danger) so the scale
   stays meaningful in every palette. */

const MUTED = "hsl(var(--muted-foreground))";

function aqiTextColor(aqi: number | null): string {
  if (aqi === null) return MUTED;
  if (aqi <= 50) return "var(--positive)";
  if (aqi <= 100) return "var(--warn)";
  if (aqi <= 150) return "var(--dim-money)";
  if (aqi <= 200) return "var(--dim-creative)";
  if (aqi <= 300) return "var(--dim-relationships)";
  return "var(--danger)";
}

function co2Color(co2: number | null): string {
  if (co2 === null) return MUTED;
  if (co2 < 800) return "var(--positive)";
  if (co2 < 1200) return "var(--warn)";
  if (co2 < 2000) return "var(--dim-money)";
  return "var(--danger)";
}

function co2Label(co2: number | null): string {
  if (co2 === null) return "";
  if (co2 < 800) return "fresh";
  if (co2 < 1200) return "elevated";
  if (co2 < 2000) return "stuffy";
  return "poor";
}

function freshness(iso: string | null): string {
  if (!iso) return "unknown";
  const age = Date.now() - new Date(iso).getTime();
  const m = Math.round(age / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

function monitorIcon(m: AirMonitor) {
  const name = m.name.toLowerCase();
  if (name.includes("backyard") || name.includes("outside") || m.type === "outdoor") return Trees;
  if (name.includes("bedroom") || name.includes("living") || name.includes("studio")) return Home;
  return MapPin;
}

/* ---------- small shared pieces ---------- */

function TokenPill({ text, color, title }: { text: string; color: string; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full whitespace-nowrap tabular-nums"
      style={{
        color,
        background: "var(--surface-1)",
        border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
      }}
    >
      {text}
    </span>
  );
}

function LabelPill({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full text-muted-foreground whitespace-nowrap"
      style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
    >
      {text}
    </span>
  );
}

/* ---------- hero ---------- */

function Hero({ air }: { air: AirData }) {
  const worstAqi = air.worst_aqi ?? null;
  const worstLabel = air.worst_label ?? null;
  const count = air.count ?? 0;
  const fetched = air.fetched_at ? freshness(air.fetched_at) : null;
  const hasFeed = count > 0 || !!air.fetched_at;

  return (
    <section className="pt-8 sm:pt-10">
      <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        <span
          className="w-1.5 h-1.5 rounded-full anim-breathe"
          style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
        />
        LifeOS · Air
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">Air Quality</h1>

      {worstAqi !== null && (
        <div className="mt-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.24em] mb-1.5" style={{ color: "var(--neon)" }}>
            Worst AQI
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span
              className="text-5xl font-bold font-mono tabular-nums leading-none"
              style={{ color: aqiTextColor(worstAqi) }}
            >
              {worstAqi}
            </span>
            {worstLabel && <TokenPill text={worstLabel} color={aqiTextColor(worstAqi)} title="US EPA AQI band" />}
            <span className="text-[13px] font-mono text-muted-foreground tabular-nums">
              across {count} monitor{count === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      )}

      {hasFeed && (
        <p className="mt-4 text-[12px] font-mono text-muted-foreground">
          Live from AirGradient · 5-minute Pulse poll
          {fetched && <span className="tabular-nums"> · cached {fetched}</span>}
        </p>
      )}

      {count > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="glass rounded-lg px-3.5 py-3 min-w-[124px]">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Wind className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase tracking-[0.16em]">Monitors</span>
            </div>
            <div className="text-3xl font-bold font-mono text-foreground tabular-nums">
              {String(count).padStart(2, "0")}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- monitor cards ---------- */

function Metric({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: typeof Wind;
  label: string;
  value: string;
  unit?: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="text-xl font-bold font-mono tabular-nums" style={{ color }}>
        {value}
        {unit && (
          <span className="text-[11px] font-mono font-normal ml-1 text-muted-foreground">{unit}</span>
        )}
      </div>
    </div>
  );
}

function MonitorCard({ m }: { m: AirMonitor }) {
  const Icon = monitorIcon(m);
  const aqi = m.aqi;
  const co2Lbl = co2Label(m.co2);

  // Real readings only — a null sensor value renders nothing, never a dash.
  const specs: Array<{ key: string; icon: typeof Wind; label: string; value: string | null; unit?: string; color: string }> = [
    { key: "pm25", icon: Cloud, label: "PM 2.5", value: m.pm25 !== null ? m.pm25.toFixed(1) : null, unit: "µg/m³", color: aqiTextColor(aqi) },
    { key: "co2", icon: Wind, label: "CO₂", value: m.co2 !== null ? String(m.co2) : null, unit: co2Lbl ? `ppm · ${co2Lbl}` : "ppm", color: co2Color(m.co2) },
    { key: "temp", icon: Thermometer, label: "Temp", value: m.temp !== null ? m.temp.toFixed(1) : null, unit: "°C", color: "var(--dim-rhythms)" },
    { key: "rh", icon: Droplets, label: "Humidity", value: m.rh !== null ? String(m.rh) : null, unit: "%", color: "var(--dim-health)" },
    { key: "tvoc", icon: Sparkles, label: "TVOC", value: m.tvoc !== null ? String(m.tvoc) : null, unit: "idx", color: "var(--dim-relationships)" },
    { key: "nox", icon: Sparkles, label: "NOx", value: m.nox !== null ? String(m.nox) : null, unit: "idx", color: "var(--dim-freedom)" },
  ];
  const metrics = specs.filter((x): x is (typeof specs)[number] & { value: string } => x.value !== null);

  // A monitor with no readings at all is absent data — hide the card entirely.
  if (metrics.length === 0 && aqi === null) return null;

  return (
    <div className="glass rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 shrink-0" style={{ color: "var(--dim-health)" }} />
          <h3 className="text-[15px] font-semibold text-foreground truncate">{m.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {m.type && <LabelPill text={m.type} />}
          {aqi !== null && (
            <TokenPill
              text={`AQI ${aqi}${m.aqiLabel ? ` · ${m.aqiLabel}` : ""}`}
              color={aqiTextColor(aqi)}
              title="US EPA AQI (PM2.5)"
            />
          )}
        </div>
      </div>

      {metrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {metrics.map((x) => (
            <Metric key={x.key} icon={x.icon} label={x.label} value={x.value} unit={x.unit} color={x.color} />
          ))}
        </div>
      )}

      <div
        className="mt-4 pt-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground tabular-nums"
        style={{ borderTop: "1px solid var(--hairline)" }}
      >
        <span>id {m.id}</span>
        <span>{freshness(m.timestamp)}</span>
      </div>
    </div>
  );
}

/* ---------- scale reference ---------- */

const AQI_BANDS = [
  { color: "var(--positive)", label: "0–50 Good" },
  { color: "var(--warn)", label: "51–100 Moderate" },
  { color: "var(--dim-money)", label: "101–150 USG" },
  { color: "var(--dim-creative)", label: "151–200 Unhealthy" },
  { color: "var(--dim-relationships)", label: "201–300 Very Unhealthy" },
  { color: "var(--danger)", label: "300+ Hazardous" },
];

function Legend() {
  return (
    <Reveal>
      <div className="glass rounded-xl p-4 sm:p-5">
        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-3">
          US AQI (PM2.5) scale
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {AQI_BANDS.map((band) => (
            <div key={band.label} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: band.color, boxShadow: `0 0 6px ${band.color}` }}
              />
              <span className="text-[11px] font-mono text-muted-foreground tabular-nums">{band.label}</span>
            </div>
          ))}
        </div>
        <div
          className="mt-3 pt-3 text-[11px] font-mono tabular-nums text-muted-foreground"
          style={{ borderTop: "1px solid var(--hairline)" }}
        >
          <span style={{ color: "var(--positive)" }}>CO₂ &lt; 800</span> fresh ·{" "}
          <span style={{ color: "var(--warn)" }}>800–1200</span> elevated ·{" "}
          <span style={{ color: "var(--dim-money)" }}>1200–2000</span> stuffy ·{" "}
          <span style={{ color: "var(--danger)" }}>&gt; 2000</span> poor
        </div>
      </div>
    </Reveal>
  );
}

/* ---------- page ---------- */

export default function AirPage() {
  const [air, setAir] = useState<AirData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/life/air")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setAir)
      .catch((err) => setError(String(err)));
    const interval = setInterval(() => {
      fetch("/api/life/air")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setAir(d))
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="px-5 sm:px-8 pt-10 max-w-5xl mx-auto">
        <div className="glass rounded-xl p-5 flex items-start gap-2.5">
          <span
            className="mt-1.5 w-2 h-2 rounded-full shrink-0"
            style={{ background: "var(--danger)", boxShadow: "0 0 8px var(--danger)" }}
          />
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--danger)" }}>
              Air Quality unavailable
            </h2>
            <p className="text-[13px] text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!air) return <div className="px-5 sm:px-8 pt-10 text-[13px] font-mono text-muted-foreground">Loading Air…</div>;

  const monitors = air.monitors ?? [];
  const sorted = [...monitors].sort((a, b) => {
    const aOut = a.type === "outdoor" || a.name.toLowerCase().includes("backyard") ? 1 : 0;
    const bOut = b.type === "outdoor" || b.name.toLowerCase().includes("backyard") ? 1 : 0;
    return aOut - bOut || a.name.localeCompare(b.name);
  });

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      <Hero air={air} />

      {air.error && (
        <Reveal>
          <div className="glass rounded-xl p-3.5 mt-6 flex items-center gap-2.5">
            <span
              className="w-2 h-2 rounded-full shrink-0 anim-breathe"
              style={{ background: "var(--warn)", boxShadow: "0 0 8px var(--warn)" }}
            />
            <p className="text-[12px] font-mono" style={{ color: "var(--warn)" }}>
              Poller reported: {air.error}
            </p>
          </div>
        </Reveal>
      )}

      {sorted.length === 0 ? (
        <div className="mt-10 space-y-4">
          <EmptyStateGuide
            section="Air Quality"
            description="Indoor air monitoring data. Add an AirGradient (or compatible) device and wire its API key to populate."
            hideInterview
            daPromptExample="walk me through connecting an air quality sensor"
          />
          <div className="glass rounded-xl p-5 text-center">
            <p className="text-[13px] text-muted-foreground">
              No monitors in cache yet. Run{" "}
              <code
                className="px-2 py-0.5 rounded font-mono text-[12px] text-foreground"
                style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
              >
                bun ~/.claude/LIFEOS/PULSE/checks/airgradient-poll.ts
              </code>{" "}
              to prime, or wait for the next 5-minute poll.
            </p>
          </div>
        </div>
      ) : (
        <>
          <Section icon={Wind} kicker="Live sensor readings" title="Monitors" count={sorted.length}>
            <div className="space-y-4">
              {sorted.map((m, i) => (
                <Reveal key={m.id} delay={i * 40}>
                  <MonitorCard m={m} />
                </Reveal>
              ))}
            </div>
          </Section>

          <Section icon={Gauge} kicker="US EPA semantic bands" title="Scale Reference">
            <Legend />
          </Section>
        </>
      )}
    </div>
  );
}
