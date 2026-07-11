"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Crosshair } from "lucide-react";

export interface Relation {
  verb: string;
  id: string;
}

/** Flagship expandable entry card: accent dot, optional id/target/relation chips,
    grid-rows detail reveal, details + trace actions. */
export function EntryCard({
  id,
  head,
  detail,
  accent,
  showIds,
  target,
  relations,
  sensitive,
}: {
  id: string;
  head: string;
  detail: string;
  accent: string;
  showIds: boolean;
  target?: string | null;
  relations?: Relation[];
  /** marks the card's content for ObserverMode blur (data-sensitive) */
  sensitive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasDetail = detail && detail.length > 0;
  const hasMeta = !!target || (relations && relations.length > 0);
  const sens = sensitive ? { "data-sensitive": "" } : {};
  return (
    <div className="glass hover-lift rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
      <div className="flex items-start gap-2.5">
        <span
          className="mt-1 w-2 h-2 rounded-full shrink-0"
          style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
        />
        <div className="min-w-0 flex-1" {...sens}>
          <div className="flex items-center gap-2 flex-wrap">
            {showIds && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: accent, background: "var(--surface-1)" }}>
                {id}
              </span>
            )}
            <h3 className="text-[15px] font-semibold text-foreground leading-snug">{head}</h3>
          </div>
          {hasMeta && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {target && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full"
                  style={{ color: accent, background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
                >
                  <Crosshair className="w-3 h-3" /> {target}
                </span>
              )}
              {relations?.map((r) => (
                <span
                  key={r.verb + r.id}
                  className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full text-muted-foreground"
                  style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
                >
                  {r.verb} <b className="text-foreground font-semibold">{r.id}</b>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {hasDetail && (
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-out"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <p className="text-[13px] leading-relaxed text-muted-foreground pt-1 pl-4.5" {...sens}>{detail}</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 pl-4.5">
        {hasDetail && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[12px] font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            {open ? "less" : "details"}
            <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
        <Link
          href={`/telos/item?id=${encodeURIComponent(id)}`}
          className="inline-flex items-center gap-0.5 text-[12px] font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          trace <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
