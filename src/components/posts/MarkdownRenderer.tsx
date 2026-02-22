"use client";

import { useMemo, useRef, useEffect } from "react";
import { marked } from "marked";
import { highlightCodeBlocks } from "./highlightCodeBlocks";

export function slugify(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .toLowerCase()
    .replace(/[^\w가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

marked.use({
  breaks: true,
  gfm: true,
  renderer: {
    heading({ text, depth }: { text: string; depth: number }): string {
      const id = slugify(text);
      return `<h${depth} id="${id}">${text}</h${depth}>\n`;
    },
  },
});

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  const html = useMemo(() => {
    return marked.parse(content, { async: false }) as string;
  }, [content]);

  useEffect(() => {
    if (ref.current) highlightCodeBlocks(ref.current);
  }, [html]);

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
