"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import Link from "next/link";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  onWikiLinkClick?: (slug: string) => void;
}

// Transform [[wikilinks]] into <a> tags before rendering
function preprocessWikilinks(content: string): string {
  return content.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_, slug, label) => {
      const displayText = label || slug;
      const href = slug.trim().toLowerCase().replace(/\s+/g, "-");
      return `<a href="/system?doc=${href}" class="wikilink" data-slug="${href}">${displayText}</a>`;
    }
  );
}

// Strip YAML frontmatter from content
function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n?/);
  return match ? content.slice(match[0].length) : content;
}

const components: Components = {
  h1: ({ children }) => (
    <h1
      className="text-2xl font-bold tracking-wide text-foreground mb-6 pb-3 border-b border-hairline"
      style={{ fontFamily: "'advocate-c14', sans-serif" }}
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      className="text-xl font-semibold tracking-wide text-foreground mt-8 mb-4"
      style={{ fontFamily: "'advocate-c14', sans-serif" }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      className="text-lg font-semibold text-foreground mt-6 mb-3"
      style={{ fontFamily: "'concourse-t3', sans-serif" }}
    >
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4
      className="text-base font-semibold text-foreground mt-5 mb-2"
      style={{ fontFamily: "'concourse-t3', sans-serif" }}
    >
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p
      className="text-sm text-foreground leading-relaxed mb-4"
      style={{ fontFamily: "'concourse-t3', sans-serif" }}
    >
      {children}
    </p>
  ),
  a: ({ href, children, className, ...props }) => {
    // Wikilink (preprocessed)
    if (className === "wikilink" || href?.startsWith("/system?doc=")) {
      const slug = (props as Record<string, string>)["data-slug"] || href?.replace("/system?doc=", "") || "";
      return (
        <Link
          href={`/system?doc=${slug}`}
          className="inline-flex items-center px-1.5 py-0.5 text-xs rounded text-neon hover:text-foreground transition-colors"
          style={{
            fontFamily: "'concourse-t3', sans-serif",
            background: "color-mix(in oklab, var(--neon) 10%, transparent)",
            border: "1px solid color-mix(in oklab, var(--neon) 30%, transparent)",
          }}
        >
          {children}
        </Link>
      );
    }
    // External link
    if (href?.startsWith("http")) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neon hover:text-neon underline underline-offset-2 transition-colors"
        >
          {children}
        </a>
      );
    }
    // Internal link
    return (
      <Link href={href || "#"} className="text-neon hover:text-neon underline underline-offset-2 transition-colors">
        {children}
      </Link>
    );
  },
  code: ({ className, children, ...props }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return (
        <code className={`${className} text-xs`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="px-1.5 py-0.5 text-xs rounded bg-surface-1 text-neon border border-hairline">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="rounded-lg bg-surface-1 border border-hairline p-4 mb-4 overflow-x-auto text-xs leading-relaxed">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-xs border-collapse rounded-lg overflow-hidden bg-surface-1 border border-hairline">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-surface-1">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th
      className="px-3 py-2 text-left text-neon font-medium tracking-wide border-b border-hairline"
      style={{ fontFamily: "'concourse-t3', sans-serif" }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      className="px-3 py-2 text-foreground border-b border-hairline"
      style={{ fontFamily: "'concourse-t3', sans-serif" }}
    >
      {children}
    </td>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-surface-1 transition-colors">
      {children}
    </tr>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-neon-3 pl-4 py-1 my-4 bg-surface-1 rounded-r italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul className="list-none space-y-1 mb-4 pl-4">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 mb-4 pl-6 text-sm text-foreground marker:text-neon">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-sm text-foreground leading-relaxed relative pl-3 before:content-['▸'] before:absolute before:left-0 before:text-neon before:text-[13px] before:top-[3px]"
      style={{ fontFamily: "'concourse-t3', sans-serif" }}
    >
      {children}
    </li>
  ),
  hr: () => (
    <hr className="border-hairline my-6" />
  ),
  img: ({ src, alt }) => (
    <img src={src} alt={alt || ""} className="rounded-lg border border-hairline max-w-full my-4" />
  ),
  strong: ({ children }) => (
    <strong className="text-foreground font-semibold">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-muted-foreground italic">{children}</em>
  ),
};

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const processed = preprocessWikilinks(stripFrontmatter(content));

  return (
    <div className="wiki-content max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={components}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
