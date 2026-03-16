"use client";

import { useMemo } from "react";
import { marked } from "marked";
import { hljs } from "./highlightCodeBlocks";
import { useLanguage } from "@/providers/LanguageProvider";

let _wrapLabel = "↩ Wrap";
let _scrollLabel = "↔ Scroll";

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
    image({ href, title, text }: { href: string; title?: string | null; text: string }): string {
      const alt = text || "";
      const caption = title || (alt && alt !== "image" ? alt : "");
      if (caption) {
        return `<figure><img src="${href}" alt="${alt}" /><figcaption>${caption}</figcaption></figure>\n`;
      }
      return `<img src="${href}" alt="${alt}" />\n`;
    },
    code({ text, lang }: { text: string; lang?: string }): string {
      const language = lang && hljs.getLanguage(lang) ? lang : null;
      const highlighted = language
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;
      return `<div class="code-block-wrap"><pre><code class="hljs${language ? ` language-${language}` : ""}">${highlighted}</code></pre><button type="button" class="code-wrap-toggle" data-wrap-btn><span class="code-wrap-label-default">${_wrapLabel}</span><span class="code-wrap-label-hover">${_scrollLabel}</span></button></div>\n`;
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
  const { t } = useLanguage();

  const html = useMemo(() => {
    _wrapLabel = `↩ ${t("common.codeWrap")}`;
    _scrollLabel = `↔ ${t("common.codeScroll")}`;
    return marked.parse(content, { async: false }) as string;
  }, [content, t]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
