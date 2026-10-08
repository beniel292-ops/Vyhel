import Link from "next/link";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn, slugify } from "@/lib/utils";

const AFFILIATE_HOST = /(^|\.)amazon\.|^amzn\.(to|eu)$/i;

function text(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(text).join("");
  if (children && typeof children === "object" && "props" in children) {
    return text((children as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

export function extractHeadings(markdown: string) {
  return markdown
    .split("\n")
    .filter((l) => /^##\s+/.test(l))
    .map((l) => {
      const label = l.replace(/^##\s+/, "").replace(/[*_`]/g, "").trim();
      return { id: slugify(label), label };
    });
}

/**
 * Markdown renderer for editorial content. Raw HTML is NOT rendered (react-markdown default),
 * so admin content can't inject scripts or markup — this is our rich-text sanitisation.
 */
export function ArticleBody({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <div className={cn("prose-vyhel", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2 id={slugify(text(children))}>{children}</h2>,
          h2: ({ children }) => <h2 id={slugify(text(children))}>{children}</h2>,
          a: ({ href = "", children }) => {
            if (href.startsWith("/")) return <Link href={href}>{children}</Link>;
            let host = "";
            try {
              host = new URL(href).hostname;
            } catch {
              return <span>{children}</span>;
            }
            const paid = AFFILIATE_HOST.test(host);
            return (
              <a href={href} target="_blank" rel={paid ? "sponsored nofollow noopener" : "noopener"}>
                {children}
                {paid ? <span className="ml-1 align-super text-[0.65em] text-muted no-underline">Paid link</span> : null}
              </a>
            );
          },
          img: ({ src, alt }) =>
            typeof src === "string" ? (
              // eslint-disable-next-line @next/next/no-img-element -- editorial inline images from the media library
              <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" className="w-full rounded-[var(--radius-card)]" />
            ) : null,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
