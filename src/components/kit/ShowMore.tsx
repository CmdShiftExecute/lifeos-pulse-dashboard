"use client";

import { ChevronDown } from "lucide-react";

/** Strip markdown bold markers and collapse whitespace — shared by every
    TELOS library/log renderer that shows raw markdown bullets as plain text. */
export function cleanMd(s: string): string {
  return s.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

export interface LibraryGroup {
  heading: string;
  items: string[];
}
export interface LibrarySection {
  key: string;
  title: string;
  updated: string | null;
  intro: string | null;
  groups: LibraryGroup[];
  count: number;
}
export interface LogLine {
  date: string | null;
  domain: string | null;
  text: string;
}
export interface LearningEntry {
  file: string;
  category: string;
  date: string;
  title: string;
  rating?: number | null;
  feedback?: string | null;
  summary?: string | null;
}
export interface SessionEntry {
  title: string;
  date: string | null;
  body: string;
}
export interface Logs {
  decisions: LogLine[];
  mistakes: LogLine[];
  learnings: LearningEntry[];
  sessions?: SessionEntry[];
}

/** Pill toggle for expandable lists — pairs with a grid-template-rows reveal. */
export function ShowMoreButton({ open, label, onClick }: { open: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="self-start inline-flex items-center gap-1.5 text-[12px] font-mono px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
      style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
    >
      {open ? "show less" : label}
      <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}
