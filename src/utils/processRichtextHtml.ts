import { addIdsToHtml } from "./headingUtils";
import { fixEmbedUrls } from "./htmlUtils";

/**
 * detail 페이지와 preview(미리보기)에서 공용으로 쓰는 richtext HTML 처리.
 * 동일한 출력이 나와야 미리보기가 게시 화면과 같아 보인다.
 *
 * 처리 순서:
 *  1. heading id 주입 (TOC 앵커)
 *  2. iframe embed URL 변환
 *  3. 코드블록 hljs 신택스 하이라이팅 (+ language 클래스)
 *  4. 코드 wrap 토글 버튼 라벨 삽입
 *  5. img 에 data-cursor="zoom" 힌트 주입
 */
export function processRichtextHtml(
  raw: string,
  labels: { codeScroll: string; codeWrap: string },
): string {
  let html = fixEmbedUrls(addIdsToHtml(raw));
  // 코드블록: hljs 하이라이트 + 버튼 라벨을 HTML 문자열 단계에서 적용
  // (DOM 조작은 리렌더 시 사라지므로 문자열 처리)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { hljs } = require("@/components/posts/highlightCodeBlocks") as typeof import("@/components/posts/highlightCodeBlocks");
    const wrapLabel = `↔ ${labels.codeScroll}`;
    const hoverLabel = `↩ ${labels.codeWrap}`;
    html = html.replace(
      /<pre><code(?:\s+class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
      (_match, cls, code) => {
        // mermaid 는 하이라이트하지 않고 원본 유지 → 클라이언트에서 SVG 렌더
        if ((cls || "").includes("language-mermaid")) return _match;
        const langMatch = (cls || "").match(/language-(\S+)/);
        const lang = langMatch?.[1];
        const validLang = lang && hljs.getLanguage(lang) ? lang : null;
        let highlighted: string;
        try {
          highlighted = validLang
            ? hljs.highlight(code.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"'), { language: validLang }).value
            : hljs.highlightAuto(code.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')).value;
        } catch {
          highlighted = code;
        }
        return `<pre><code class="hljs${validLang ? ` language-${validLang}` : ""}">${highlighted}</code></pre>`;
      },
    );
    // 빈 버튼에 라벨 span 삽입
    html = html.replace(
      /<button[^>]*data-wrap-btn[^>]*><\/button>/g,
      `<button type="button" class="code-wrap-toggle" data-wrap-btn><span class="code-wrap-label-default">${wrapLabel}</span><span class="code-wrap-label-hover">${hoverLabel}</span></button>`,
    );
  } catch { /* hljs 로드 실패 시 무시 */ }
  // img에 data-cursor="zoom" 주입 → CursorTrail 이미지 뷰어 힌트
  html = html.replace(/<img\s/g, '<img data-cursor="zoom" ');
  return html;
}
