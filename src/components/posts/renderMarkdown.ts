import { Marked } from "marked";
import markedFootnote from "marked-footnote";
import markedAlert from "marked-alert";
import markedKatex from "marked-katex-extension";
import { highlightCode } from "@/utils/prismHighlight";
import { slugify } from "@/utils/headingUtils";
import { macfolioExtensions, renderImage, renderMathBlock, renderTaggedCodespan } from "./markdownExtensions";

/* 마크다운 글(content_type 'markdown') → HTML. MarkdownRenderer 가 부른다.
   컴포넌트와 떼어 둔 것은 개발 서버 없이 렌더 결과를 단위 테스트로 보기 위해서다.
   전역 marked 대신 자기 인스턴스를 써서, 다른 곳의 marked 설정과 섞이지 않는다. */
const md = new Marked(
  markedFootnote({ keepLabels: true }),
  markedAlert(),
  markedKatex({ throwOnError: false }),
  // MacFolio 표기(형광펜 · 콜아웃 제목 · `코드{:언어}` · 수식 · 한국어 굵게 · 물결 하나) — markedAlert 뒤여야 한다
  ...macfolioExtensions(),
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
      // 캡션 링크 · #float-left|right 배치는 markdownExtensions.renderImage
      image: renderImage,
      codespan({ text }: { text: string }): string | false {
        // `코드{:언어}` · `식{:math}` 만 맡고, 나머지는 marked 기본(이스케이프한 <code>)
        return renderTaggedCodespan(text) ?? false;
      },
      code({ text, lang }: { text: string; lang?: string }): string {
        // ```math 는 KaTeX 블록 (GitHub · MacFolio 와 같은 표기)
        const math = renderMathBlock(text, lang);
        if (math !== null) return math;
        // hljs → Prism. hljs 는 언어 컴파일 시점에 정규식이 깨져 페이지를 죽인다(#312).
        // 자세한 건 utils/prismHighlight 주석.
        const { html: highlighted, lang: resolved } = highlightCode(text, lang ?? undefined);
        const language = resolved || null;
        return `<div class="code-block-wrap"><pre><code${language ? ` class="language-${language}"` : ""}>${highlighted}</code></pre></div>\n`;
      },
    },
  },
);

const DOWNLOAD_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>';
const ATTACH_ICON =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>';

/** 마크다운 본문 → 글 화면에 넣을 HTML (heading id · 첨부 카드 · 오디오 · 이미지 커서 힌트 포함) */
export function renderMarkdown(content: string): string {
  let raw = md.parse(content, { async: false }) as string;
  // 상대 경로 이미지를 절대 경로로 변환 (admin 페이지에서 404 방지)
  raw = raw.replace(/(<img\s[^>]*src=")(?!https?:\/\/|\/|data:)([^"]+)(")/g, '$1/$2$3');
  // 파일 첨부 링크를 파일 카드로 변환: <a href="url">📎 name</a>
  raw = raw.replace(
    /<a href="([^"]+)">📎\s*([^<]+)<\/a>/g,
    (_, url, name) => {
      const n = name.trim();
      return `<div style="max-width:480px;margin:8px 0"><div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:999px;border:1px solid var(--border-color-light);background:var(--bg-secondary)"><div style="width:32px;height:32px;border-radius:50%;background:color-mix(in oklch, var(--text-contrast) 5%, transparent);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--text-secondary)">${ATTACH_ICON}</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n}</div></div><a href="${url}" download="${n}" style="width:34px;height:34px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1px solid var(--border-color-light);background:var(--bg-primary);color:var(--text-primary);text-decoration:none">${DOWNLOAD_ICON}</a></div></div>`;
    }
  );
  // 오디오 첨부 링크를 오디오 플레이어로 변환: <a href="url">🔊 title</a>
  raw = raw.replace(
    /<a href="([^"]+)">🔊\s*([^<]+)<\/a>/g,
    (_, url, title) => `<audio src="${url}" controls preload="metadata" title="${title.trim()}" style="width:100%;max-width:480px;margin:8px 0;border-radius:8px"></audio>`
  );
  // img에 data-cursor="zoom" 주입 → CursorTrail이 이미지 뷰어 힌트 표시
  return raw.replace(/<img\s/g, '<img data-cursor="zoom" ');
}
