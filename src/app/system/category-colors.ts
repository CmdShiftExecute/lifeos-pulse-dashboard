/** Category accent tokens for the System wiki route (landing stats, recent
 *  changes, graph legend). Hues are chosen to track the palette the shared
 *  KnowledgeGraph canvas still hardcodes (cyan/sky/amber/violet/rose) so the
 *  legend reads true against the drawn nodes in the default theme. */
export const CATEGORY_COLOR: Record<string, string> = {
  "system-doc": "var(--neon-2)",
  person: "var(--neon-3)",
  company: "var(--warn)",
  idea: "var(--dim-relationships)",
  bookmark: "var(--dim-creative)",
};

export const CATEGORY_LABEL: Record<string, string> = {
  "system-doc": "System",
  person: "People",
  company: "Companies",
  idea: "Ideas",
  bookmark: "Bookmarks",
};

export const CATEGORY_ORDER = ["system-doc", "person", "company", "idea", "bookmark"];
