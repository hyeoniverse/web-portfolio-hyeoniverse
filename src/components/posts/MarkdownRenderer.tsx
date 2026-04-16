"use client";

import { useMemo } from "react";
import { marked } from "marked";
import markedFootnote from "marked-footnote";
import markedAlert from "marked-alert";
import markedKatex from "marked-katex-extension";
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

marked.use(
  markedFootnote({ keepLabels: true }),
  markedAlert(),
  markedKatex({ throwOnError: false }),
  {
  breaks: true,
  gfm: true,
  hooks: {
    postprocess(html: string): string {
      // heading에 id 추가
      html = html.replace(/<h(\d)>([\s\S]*?)<\/h\1>/g, (_, depth, content) => {
        const id = slugify(content);
        return `<h${depth} id="${id}">${content}</h${depth}>`;
      });
      // 각주 정의 li에 data-label 추가 (원본 번호 표시용)
      html = html.replace(/<li id="footnote-([^"]+)">/g, (_, label) =>
        `<li id="footnote-${label}" data-label="${label}">`
      );
      return html;
    },
  },
  renderer: {
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
      return `<div class="code-block-wrap"><pre><code class="hljs${language ? ` language-${language}` : ""}">${highlighted}</code></pre><button type="button" class="code-wrap-toggle" data-wrap-btn><span class="code-wrap-label-default">${_scrollLabel}</span><span class="code-wrap-label-hover">${_wrapLabel}</span></button></div>\n`;
    },
  },
});

// KaTeX CSS (이미 글로벌에 포함되어 있지 않으면 여기서 import)
import "katex/dist/katex.min.css";

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
    const raw = marked.parse(content, { async: false }) as string;
    // img에 data-cursor="zoom" 주입 → CursorTrail이 이미지 뷰어 힌트 표시
    return raw.replace(/<img\s/g, '<img data-cursor="zoom" ');
  }, [content, t]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
