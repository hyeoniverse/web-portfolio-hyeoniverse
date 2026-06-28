// 서버 전용 — Shiki 로 richtext HTML 안의 코드블록을 빌드/SSR 시점에 하이라이트.
// 결과(이미 칠해진 HTML)를 클라이언트로 내려보내므로 클라 번들엔 하이라이터가 들어가지 않는다.
// (detail 페이지는 server component 에서 호출, preview 는 client 에서 별도 호출)
import { createHighlighter, bundledLanguages, type Highlighter } from "shiki";

const LIGHT = "github-light";
const DARK = "github-dark";

let highlighterPromise: Promise<Highlighter> | null = null;
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({ themes: [LIGHT, DARK], langs: [] });
  }
  return highlighterPromise;
}

const unescape = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

async function highlightOne(h: Highlighter, code: string, lang: string): Promise<string> {
  let useLang = lang;
  if (!h.getLoadedLanguages().includes(lang)) {
    if (lang in bundledLanguages) {
      try {
        await h.loadLanguage(lang as keyof typeof bundledLanguages);
      } catch {
        useLang = "text";
      }
    } else {
      useLang = "text";
    }
  }
  // defaultColor:false → light/dark 둘 다의 색을 CSS 변수(--shiki-dark)로 출력 → CSS 로 테마 전환
  return h.codeToHtml(code, { lang: useLang, themes: { light: LIGHT, dark: DARK }, defaultColor: false });
}

/**
 * richtext HTML 안의 `<pre><code class="language-x">…</code></pre>` 코드블록을 Shiki 결과로 치환.
 * mermaid 는 클라이언트에서 SVG 렌더하므로 원본 유지.
 */
export async function highlightRichtextCode(html: string): Promise<string> {
  const re = /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g;
  const matches = [...html.matchAll(re)];
  if (matches.length === 0) return html;

  const h = await getHighlighter();
  const parts = await Promise.all(
    matches.map(async (m) => {
      const lang = (m[1] || "text").toLowerCase();
      if (lang.includes("mermaid")) return m[0];
      try {
        const out = await highlightOne(h, unescape(m[2]), lang || "text");
        // 원본 언어를 data-lang 으로 보존 — Shiki 출력엔 language 클래스가 없어 상세/미리보기에서 라벨 표시용
        return out.replace(/^<pre/, `<pre data-lang="${lang}"`);
      } catch {
        return m[0];
      }
    }),
  );

  let out = "";
  let last = 0;
  matches.forEach((m, i) => {
    out += html.slice(last, m.index) + parts[i];
    last = (m.index ?? 0) + m[0].length;
  });
  out += html.slice(last);
  return out;
}
