"use client";

import { Sparkles, MessageSquare, FolderOpen, BookOpen } from "lucide-react";

interface EmptyStateGuideProps {
  /** What this section is — used in the headline. e.g. "Telos", "Knowledge Archive". */
  section: string;
  /** Short sentence describing what kind of content lives here. */
  description: string;
  /** Subdir under LIFEOS/USER/ that holds this section's data, if any. e.g. "TELOS". */
  userDir?: string;
  /** Concrete interview command to surface. Defaults to "/interview". */
  interviewCommand?: string;
  /** Optional CTA-style example prompt the user can paste to the DA. */
  daPromptExample?: string;
  /** Hide a path if it doesn't apply (e.g. some sections aren't interview-driven). */
  hideInterview?: boolean;
}

export default function EmptyStateGuide({
  section,
  description,
  userDir,
  interviewCommand = "/interview",
  daPromptExample,
  hideInterview = false,
}: EmptyStateGuideProps) {
  const userPath = userDir ? `~/.claude/LIFEOS/USER/${userDir}/` : "~/.claude/LIFEOS/USER/";
  const readmePath = userDir ? `~/.claude/LIFEOS/USER/${userDir}/README.md` : "~/.claude/LIFEOS/USER/README.md";
  const defaultDaPrompt = daPromptExample ?? `help me set up my ${section.toLowerCase()}`;

  return (
    <div
      className="rounded-xl p-6"
      style={{
        border: "1px solid color-mix(in oklab, var(--neon) 25%, transparent)",
        background:
          "linear-gradient(to bottom right, color-mix(in oklab, var(--neon) 10%, transparent), var(--surface-1))",
      }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className="rounded-lg p-2 mt-0.5"
          style={{ background: "color-mix(in oklab, var(--neon) 12%, transparent)" }}
        >
          <Sparkles className="w-5 h-5 text-neon" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">
            {section} is empty — let's fill it in
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>

      <div className="space-y-2.5 ml-1">
        {!hideInterview && (
          <div className="flex items-start gap-2.5 text-sm">
            <MessageSquare className="w-4 h-4 text-neon mt-0.5 shrink-0" />
            <div>
              <span className="text-foreground">Run </span>
              <code className="px-1.5 py-0.5 rounded bg-surface-1 text-neon text-xs font-mono">
                {interviewCommand}
              </code>
              <span className="text-muted-foreground">
                {" "}— your DA walks you through the questions and writes the answers to disk.
              </span>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2.5 text-sm">
          <FolderOpen className="w-4 h-4 text-neon mt-0.5 shrink-0" />
          <div>
            <span className="text-foreground">Edit files at </span>
            <code className="px-1.5 py-0.5 rounded bg-surface-1 text-neon text-xs font-mono">
              {userPath}
            </code>
            <span className="text-muted-foreground">
              {" "}— or import existing data (Obsidian, Notion, journals) with the{" "}
            </span>
            <code className="px-1.5 py-0.5 rounded bg-surface-1 text-neon text-xs font-mono">
              Migrate
            </code>
            <span className="text-muted-foreground"> skill.</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 text-sm">
          <BookOpen className="w-4 h-4 text-neon mt-0.5 shrink-0" />
          <div>
            <span className="text-foreground">Read </span>
            <code className="px-1.5 py-0.5 rounded bg-surface-1 text-neon text-xs font-mono">
              {readmePath}
            </code>
            <span className="text-muted-foreground"> for the full layout and customization guide.</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 text-sm pt-1">
          <Sparkles className="w-4 h-4 text-neon mt-0.5 shrink-0" />
          <div>
            <span className="text-foreground">Or just ask your DA: </span>
            <span className="text-neon italic">"{defaultDaPrompt}"</span>
          </div>
        </div>
      </div>
    </div>
  );
}
