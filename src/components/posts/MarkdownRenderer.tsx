"use client";

import { useEffect, useMemo, useRef } from "react";
import { marked } from "marked";
import markedFootnote from "marked-footnote";
import markedAlert from "marked-alert";
import markedKatex from "marked-katex-extension";
import { attachCodeWrapToggle, applyColorSwatches, highlightInlineCode } from "./highlightCodeBlocks";
import { highlightCode } from "@/utils/prismHighlight";
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
      // hljs → Prism. hljs 는 언어 컴파일 시점에 정규식이 깨져 페이지를 죽인다(#312).
      // 자세한 건 utils/prismHighlight 주석.
      const { html: highlighted, lang: resolved } = highlightCode(text, lang ?? undefined);
      const language = resolved || null;
      return `<div class="code-block-wrap"><pre data-lenis-prevent><code${language ? ` class="language-${language}"` : ""}>${highlighted}</code></pre><button type="button" class="code-wrap-toggle" data-wrap-btn><span class="code-wrap-label-default">${_scrollLabel}</span><span class="code-wrap-label-hover">${_wrapLabel}</span></button></div>\n`;
    },
  },
});

// KaTeX CSS (이미 글로벌에 포함되어 있지 않으면 여기서 import)
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const PLACEHOLDER_SRC = "/images/placeholder.svg";

export default function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);

  const html = useMemo(() => {
    _wrapLabel = `↩ ${t("common.codeWrap")}`;
    _scrollLabel = `↔ ${t("common.codeScroll")}`;
    let raw = marked.parse(content, { async: false }) as string;
    // 상대 경로 이미지를 절대 경로로 변환 (admin 페이지에서 404 방지)
    raw = raw.replace(/(<img\s[^>]*src=")(?!https?:\/\/|\/|data:)([^"]+)(")/g, '$1/$2$3');
    // 파일 첨부 링크를 파일 카드로 변환: <a href="url">📎 name</a>
    raw = raw.replace(
      /<a href="([^"]+)">📎\s*([^<]+)<\/a>/g,
      (_, url, name) => {
        const n = name.trim();
        const dlSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>';
        const iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>';
        return `<div style="max-width:480px;margin:8px 0"><div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:999px;border:1px solid var(--border-light-color);background:var(--bg-secondary)"><div style="width:32px;height:32px;border-radius:50%;background:var(--color-neutral-alpha-5);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--text-secondary)">${iconSvg}</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n}</div></div><a href="${url}" download="${n}" style="width:34px;height:34px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1px solid var(--border-light-color);background:var(--bg-primary);color:var(--text-primary);text-decoration:none">${dlSvg}</a></div></div>`;
      }
    );
    // 오디오 첨부 링크를 오디오 플레이어로 변환: <a href="url">🔊 title</a>
    raw = raw.replace(
      /<a href="([^"]+)">🔊\s*([^<]+)<\/a>/g,
      (_, url, title) => `<audio src="${url}" controls preload="metadata" title="${title.trim()}" style="width:100%;max-width:480px;margin:8px 0;border-radius:8px"></audio>`
    );
    // img에 data-cursor="zoom" 주입 → CursorTrail이 이미지 뷰어 힌트 표시
    return raw.replace(/<img\s/g, '<img data-cursor="zoom" ');
  }, [content, t]);

  // 코드블록 복사·줄바꿈 바 주입 — marked 가 이미 Prism 으로 하이라이트했으므로 컨트롤 바만 붙인다.
  // 부모(디테일/미리보기/works)가 ref 를 넘겨주는지에 의존하지 않고 자체 ref 로 처리 → markdown 은
  // 어느 리더뷰에서든 항상 복사 버튼이 나온다. (mermaid 스킵·중복 주입 방지는 attachCodeWrapToggle 내부)
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    attachCodeWrapToggle(root, {
      wrap: t("common.codeWrap"),
      scroll: t("common.codeScroll"),
      wrapTitle: t("common.codeWrapTitle"),
      scrollTitle: t("common.codeScrollTitle"),
      copy: t("common.codeCopy"),
      copied: t("common.codeCopied"),
    });
    // 인라인 코드 색상값(`#hex`·`rgb()`·`hsl()`) 앞에 색 스와치
    applyColorSwatches(root);
    // 인라인 코드도 syntax highlight (명확히 코드로 추론될 때만)
    highlightInlineCode(root);
  }, [html, t]);

  // 깨진 이미지 → /images/placeholder.svg 로 swap. MutationObserver 로 동적 추가 img 도 추적
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const swap = (img: HTMLImageElement) => {
      if (img.src.endsWith(PLACEHOLDER_SRC)) return;
      img.src = PLACEHOLDER_SRC;
      img.removeAttribute("srcset");
    };
    const handle = (img: HTMLImageElement) => {
      if (img.dataset.fallbackBound === "1") return;
      img.dataset.fallbackBound = "1";
      img.addEventListener("error", () => swap(img));
      if (img.complete && img.naturalWidth === 0) swap(img);
    };
    root.querySelectorAll("img").forEach((el) => handle(el as HTMLImageElement));
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          const el = node as Element;
          if (el.tagName === "IMG") handle(el as HTMLImageElement);
          el.querySelectorAll?.("img").forEach((img) => handle(img as HTMLImageElement));
        });
      }
    });
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [html]);

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
