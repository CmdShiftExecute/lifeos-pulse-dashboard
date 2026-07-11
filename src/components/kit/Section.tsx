"use client";

import type { LucideIcon } from "lucide-react";
import { Reveal } from "./Reveal";

/** Flagship section frame: glass icon chip, mono kicker, title, padded count. */
export function Section({
  icon: Icon,
  kicker,
  title,
  count,
  countLabel,
  children,
}: {
  icon: LucideIcon;
  kicker: string;
  title: string;
  count?: number;
  /** when set, the count renders as a prominent "N <label>" chip instead of a bare number */
  countLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16 sm:mt-20">
      <Reveal>
        <div className="flex items-end gap-3 mb-2.5">
          <span className="grid place-items-center w-9 h-9 rounded-lg glass shrink-0" style={{ color: "var(--neon)" }}>
            <Icon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">{kicker}</div>
            <h2 className="text-2xl font-bold text-foreground leading-tight">{title}</h2>
          </div>
          {typeof count === "number" &&
            (countLabel ? (
              <span
                className="ml-auto shrink-0 inline-flex items-baseline gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
                title={`${count} ${countLabel} in this group`}
              >
                <span className="text-[16px] font-bold font-mono tabular-nums leading-none" style={{ color: "var(--neon)" }}>
                  {count}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">{countLabel}</span>
              </span>
            ) : (
              <span className="ml-auto text-[13px] font-mono text-muted-foreground shrink-0">{String(count).padStart(2, "0")}</span>
            ))}
        </div>
        <div className="section-rule mb-6 max-w-[260px]" aria-hidden />
      </Reveal>
      {children}
    </section>
  );
}
