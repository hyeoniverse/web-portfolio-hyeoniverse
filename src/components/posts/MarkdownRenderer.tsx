"use client";

import { useEffect, useMemo, useRef } from "react";
import { marked } from "marked";
import markedFootnote from "marked-footnote";
import markedAlert from "marked-alert";
import markedKatex from "marked-katex-extension";
import { attachCodeWrapToggle, applyColorSwatches, highlightInlineCode } from "./highlightCodeBlocks";
import { highlightCode } from "@/utils/prismHighlight";
import { useBodyLabels } from "./BodyLabelsContext";
import { attachImageFallback } from "@/lib/imageFallback";
import { slugify } from "@/utils/headingUtils";
import { enhanceFootnotes } from "./footnotes";


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
      // 같은 이름 제목은 목차(extractHeadings)와 같은 규칙으로 -2, -3 을 붙인다
      const seen = new Map<string, number>();
      html = html.replace(/<h(\d)>([\s\S]*?)<\/h\1>/g, (_, depth, content) => {
        const base = slugify(content);
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        const id = n === 1 ? base : `${base}-${n}`;
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
      return `<div class="code-block-wrap"><pre><code${language ? ` class="language-${language}"` : ""}>${highlighted}</code></pre></div>\n`;
    },
  },
});

// KaTeX CSS (이미 글로벌에 포함되어 있지 않으면 여기서 import)
import "@/styles/vendor/katex.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}


export default function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  /* 화면 언어 라벨, 번역해 볼 때는 번역 라벨(BodyLabelsContext) */
  const { labels } = useBodyLabels();
  const ref = useRef<HTMLDivElement>(null);

  const html = useMemo(() => {
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
        return `<div style="max-width:480px;margin:8px 0"><div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:999px;border:1px solid var(--border-color-light);background:var(--bg-secondary)"><div style="width:32px;height:32px;border-radius:50%;background:color-mix(in oklch, var(--text-contrast) 5%, transparent);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--text-secondary)">${iconSvg}</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n}</div></div><a href="${url}" download="${n}" style="width:34px;height:34px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1px solid var(--border-color-light);background:var(--bg-primary);color:var(--text-primary);text-decoration:none">${dlSvg}</a></div></div>`;
      }
    );
    // 오디오 첨부 링크를 오디오 플레이어로 변환: <a href="url">🔊 title</a>
    raw = raw.replace(
      /<a href="([^"]+)">🔊\s*([^<]+)<\/a>/g,
      (_, url, title) => `<audio src="${url}" controls preload="metadata" title="${title.trim()}" style="width:100%;max-width:480px;margin:8px 0;border-radius:8px"></audio>`
    );
    // img에 data-cursor="zoom" 주입 → CursorTrail이 이미지 뷰어 힌트 표시
    return raw.replace(/<img\s/g, '<img data-cursor="zoom" ');
  }, [content]);

  // 코드블록 복사·줄바꿈 바 주입 — marked 가 이미 Prism 으로 하이라이트했으므로 컨트롤 바만 붙인다.
  // 부모(디테일/미리보기/works)가 ref 를 넘겨주는지에 의존하지 않고 자체 ref 로 처리 → markdown 은
  // 어느 리더뷰에서든 항상 복사 버튼이 나온다. (mermaid 스킵·중복 주입 방지는 attachCodeWrapToggle 내부)
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    attachCodeWrapToggle(root, {
      wrap: labels.codeWrap,
      scroll: labels.codeScroll,
      wrapTitle: labels.codeWrapTitle,
      scrollTitle: labels.codeScrollTitle,
      copy: labels.codeCopy,
      copied: labels.codeCopied,
    });
    // 인라인 코드 색상값(`#hex`·`rgb()`·`hsl()`) 앞에 색 스와치
    applyColorSwatches(root);
    // 인라인 코드도 syntax highlight (명확히 코드로 추론될 때만)
    highlightInlineCode(root);
  }, [html, labels]);

  // 각주 — 번호 · 돌아가기 링크를 누르면 고정 네비에 가리지 않게 그 자리로(richtext 리더와 같은 동작)
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    return enhanceFootnotes(root, labels);
  }, [html, labels]);

  // 깨진 이미지 → 공용 placeholder 로 swap. 동적 추가 img 추적까지 공용 헬퍼가 담당
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    return attachImageFallback(root);
  }, [html]);

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
