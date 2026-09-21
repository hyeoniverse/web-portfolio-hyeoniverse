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

/** 저장 HTML 의 pre 속성 중 리더에서 쓰지 않을 것 — data-lenis-prevent 는 휠을 통째로 막아 블록 끝에서
 *  페이지가 이어서 내려가지 않게 만든다(리더는 블록마다 휠을 나눠 준다). tabindex 는 화면에서 붙인다 */
function readerPreAttrs(attrs: string): { style: string; rest: string } {
  let rest = attrs
    .replace(/\s+data-lenis-prevent(?:="[^"]*")?(?=\s|$)/g, "")
    .replace(/\s+tabindex="[^"]*"/g, "");
  let style = "";
  rest = rest.replace(/\s+style="([^"]*)"/, (_, v: string) => { style = v; return ""; });
  return { style, rest };
}

/**
 * richtext HTML 안의 `<pre><code class="language-x">…</code></pre>` 코드블록을 Shiki 결과로 치환.
 * mermaid 는 클라이언트에서 SVG 렌더하므로 원본 유지.
 *
 * pre 에 속성이 붙어 있어도 잡는다 — 줄바꿈 상태(data-wrap + white-space 인라인 style)나 mermaid 보기 모드가
 * 붙은 블록, 예전 저장 HTML 의 data-lenis-prevent 가 붙은 블록이 있다. 예전 식은 속성 없는 <pre> 만 잡아서
 * 이런 블록은 색이 안 칠해진 채 나갔다. 줄바꿈 상태는 Shiki 의 pre 로 옮긴다.
 */
export async function highlightRichtextCode(html: string): Promise<string> {
  const re = /<pre((?:\s[^>]*)?)><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g;
  const matches = [...html.matchAll(re)];
  if (matches.length === 0) return html;

  const h = await getHighlighter();
  const parts = await Promise.all(
    matches.map(async (m) => {
      const lang = (m[2] || "text").toLowerCase();
      const { style, rest } = readerPreAttrs(m[1] ?? "");
      const original = () => m[0].replace(/^<pre[^>]*>/, `<pre${rest}${style ? ` style="${style}"` : ""}>`);
      if (lang.includes("mermaid")) return original();
      try {
        let out = await highlightOne(h, unescape(m[3]), lang || "text");
        // 원본 언어를 data-lang 으로 보존 — Shiki 출력엔 language 클래스가 없어 상세/미리보기에서 라벨 표시용
        out = out.replace(/^<pre/, `<pre data-lang="${lang}"${rest}`);
        if (style) {
          // 줄바꿈 상태는 Shiki 가 넣은 색 변수 style 뒤에 잇는다 — 리더는 pre.style.whiteSpace 로 상태를 읽는다
          out = /^<pre[^>]*\sstyle="/.test(out)
            ? out.replace(/^(<pre[^>]*\sstyle="[^"]*)"/, (_, head: string) => `${head.replace(/;?$/, ";")}${style}"`)
            : out.replace(/^<pre/, `<pre style="${style}"`);
        }
        return out;
      } catch {
        return original();
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
