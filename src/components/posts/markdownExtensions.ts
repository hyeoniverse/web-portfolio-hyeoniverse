import katex from "katex";
import { Prism } from "prism-react-renderer";
import type { MarkedExtension, Tokens, Token, TokenizerAndRendererExtension } from "marked";
import { normalizeLangAlias, resolveGrammar } from "@/utils/prismHighlight";

/* ── 마크다운 글의 확장 문법 (MarkdownRenderer 의 marked 에 건다) ──
   MacFolio 블로그(react-markdown + remark 플러그인)에서 옮겨 오는 글을 본문 수정 없이 읽기 위한 규칙이다.
   형광펜 · 콜아웃 제목 · 인라인 코드 언어 꼬리표 · `식{:math}` / ```math 수식 · 한국어 사이 굵게 · 물결 하나 ·
   그림 캡션 링크와 좌우 배치. 기존 글에 없던 표기만 새로 읽으므로 기존 글의 결과는 그대로다.

   본문 HTML 은 정화하지 않는다(작성자 = 관리자). 그래도 여기서 HTML 문자열로 끼워 넣는 글자는 전부 이스케이프하고,
   링크 주소는 http(s) 만 받는다 — 새 문법이 원래 없던 주입 경로를 만들지 않게. */

/** 속성 · 본문 글자 이스케이프. 이미 엔티티로 적힌 `&lt;` 같은 글자는 두 번 바꾸지 않는다(marked 의 escape 와 같은 규칙) */
function escapeHtml(s: string): string {
  return s
    .replace(/&(?!#?\w+;)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const KATEX_OPTIONS = { throwOnError: false } as const;

/** KaTeX → HTML. 문법 오류는 throwOnError:false 로 빨간 원문이 된다(marked-katex-extension 과 같은 설정) */
function renderMath(tex: string, displayMode: boolean): string {
  return katex.renderToString(tex, { ...KATEX_OPTIONS, displayMode });
}

/* ── 1. 형광펜 `==글자==` → <mark> ──
   Obsidian · Typora · MacFolio 와 같은 표기. 여는 `==` 뒤와 닫는 `==` 앞이 공백이면 형광펜이 아니다(`a == b`).
   닫는 `==` 를 찾을 때 코드(`…`) 안은 건너뛴다 — 코드 안의 `==` 는 글자 그대로 남는다. */

/** src(`==` 로 시작)에서 짝이 되는 닫는 `==` 의 위치. 없으면 -1 */
function findMarkClose(src: string): number {
  const first = src.charAt(2);
  if (!first || /\s/.test(first) || first === "=") return -1;
  // 여는 `==` 바로 뒤부터 본다 — `==\`코드\`…==` 처럼 코드로 시작해도 코드 경계를 맞게 건너뛴다
  let i = 2;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\") { i += 2; continue; }
    if (ch === "`") {
      const run = /^`+/.exec(src.slice(i))![0];
      const close = src.indexOf(run, i + run.length);
      i = close < 0 ? i + run.length : close + run.length;
      continue;
    }
    if (i > 2 && ch === "=" && src[i + 1] === "=" && !/\s/.test(src[i - 1])) return i;
    i++;
  }
  return -1;
}

const markExtension: TokenizerAndRendererExtension = {
  name: "mark",
  level: "inline",
  start(src) {
    const i = src.indexOf("==");
    return i < 0 ? undefined : i;
  },
  tokenizer(src) {
    if (!src.startsWith("==")) return undefined;
    const end = findMarkClose(src);
    if (end < 0) return undefined;
    const text = src.slice(2, end);
    return { type: "mark", raw: src.slice(0, end + 2), text, tokens: this.lexer.inlineTokens(text) };
  },
  renderer(token) {
    return `<mark>${this.parser.parseInline((token as Tokens.Generic).tokens ?? [])}</mark>`;
  },
};

/* ── 5. 한국어 사이 굵게 · 기울임 ──
   CommonMark 규칙은 닫는 `**` 앞이 문장부호면 뒤가 공백이나 문장부호여야 닫힌다고 본다. 그래서
   `**취소(cancelled)**가` 처럼 조사가 바로 붙으면 굵게가 되지 않고 `**` 가 글자로 남는다(여는 쪽도 같다).
   remark-cjk-friendly 처럼, 실패하는 쪽의 바깥 글자가 한중일 문자일 때만 이 짝을 굵게 · 기울임으로 받는다.
   표준 규칙으로 되는 짝은 건드리지 않는다(undefined 를 돌려 marked 기본 처리로 넘긴다). */

const PUNCT = /[\p{P}\p{S}]/u;
const SPACE = /\s/;
const CJK = /[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const isSpaceOrPunct = (ch: string) => !ch || SPACE.test(ch) || PUNCT.test(ch);

/** src(구분자 delim 로 시작)에서 닫는 구분자 위치. 코드 · 이스케이프는 건너뛴다. 없으면 -1 */
function findEmphasisClose(src: string, delim: "**" | "*"): number {
  let i = delim.length;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\") { i += 2; continue; }
    if (ch === "`") {
      const run = /^`+/.exec(src.slice(i))![0];
      const close = src.indexOf(run, i + run.length);
      i = close < 0 ? i + run.length : close + run.length;
      continue;
    }
    if (ch === "*") {
      const run = /^\*+/.exec(src.slice(i))![0];
      if (i > delim.length && run.length === delim.length && !SPACE.test(src[i - 1])) return i;
      i += run.length;
      continue;
    }
    i++;
  }
  return -1;
}

const cjkEmphasisExtension: TokenizerAndRendererExtension = {
  name: "cjkEmphasis",
  level: "inline",
  tokenizer(src, tokens) {
    const run = /^\*+/.exec(src)?.[0];
    if (!run || run.length > 2) return undefined;
    const delim = run as "**" | "*";
    const first = src.charAt(delim.length);
    if (!first || SPACE.test(first)) return undefined;
    const end = findEmphasisClose(src, delim);
    if (end < 0) return undefined;
    const text = src.slice(delim.length, end);
    const last = text.charAt(text.length - 1);
    // marked 와 같이 바로 앞 글자는 직전 글자 토큰의 마지막 글자만 본다(다른 토큰 뒤면 줄 처음처럼)
    const prevToken = tokens.at(-1);
    const before = prevToken?.type === "text" ? prevToken.raw.slice(-1) : "";
    const after = src.charAt(end + delim.length);
    const openOk = !PUNCT.test(first) || isSpaceOrPunct(before);
    const closeOk = !PUNCT.test(last) || isSpaceOrPunct(after);
    if (openOk && closeOk) return undefined; // 표준 규칙으로 된다
    if (!openOk && !CJK.test(before)) return undefined;
    if (!closeOk && !CJK.test(after)) return undefined;
    return {
      type: "cjkEmphasis",
      raw: src.slice(0, end + delim.length),
      text,
      strong: delim === "**",
      tokens: this.lexer.inlineTokens(text),
    };
  },
  renderer(token) {
    const t = token as Tokens.Generic;
    const tag = t.strong ? "strong" : "em";
    return `<${tag}>${this.parser.parseInline(t.tokens ?? [])}</${tag}>`;
  },
};

/* ── 2. 콜아웃 사용자 제목 `> [!NOTE] 제목` ──
   marked-alert 는 `[!NOTE]` 뒤 같은 줄 글자를 본문으로 남긴다. 그 글자를 콜아웃 제목으로 쓴다(MacFolio 규칙).
   제목이 없으면 marked-alert 의 기본 제목 그대로라 기존 글은 바뀌지 않는다.

   순서: 이 walkTokens 는 markedAlert 보다 뒤에 등록해 먼저 돈다(marked 는 나중에 쓴 walkTokens 부터 부른다).
   제목 부분을 토큰에서 떼어 calloutTitle 에 두고 첫 문단을 `[!NOTE]` 만 남긴 모양으로 바꾸면, 이어서 도는
   marked-alert 가 제목 없는 콜아웃처럼 바꾼다. 그리는 것은 아래 alert 렌더러가 calloutTitle 이 있을 때만 맡는다. */

const CALLOUT_MARK = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]+(?=\S)/;

type CalloutToken = Tokens.Generic & {
  calloutTitle?: Token[];
  meta?: { className: string; variant: string; icon: string; title: string; titleClassName: string };
};

function extractCalloutTitle(token: Token) {
  if (token.type !== "blockquote") return;
  const para = token.tokens?.[0];
  if (para?.type !== "paragraph") return;
  const inline = para.tokens ?? [];
  const head = inline[0];
  if (head?.type !== "text") return;
  const match = CALLOUT_MARK.exec(head.raw);
  if (!match) return;
  const brIndex = inline.findIndex((t) => t.type === "br");
  const titleEnd = brIndex < 0 ? inline.length : brIndex;
  const headRest = head.raw.slice(match[0].length);
  const titleTokens: Token[] = [
    ...(headRest ? [{ ...head, raw: headRest, text: head.text.replace(CALLOUT_MARK, "") } as Token] : []),
    ...inline.slice(1, titleEnd),
  ];
  // 제목 끝 공백 정리 — 마지막 글자 토큰의 꼬리 공백
  const tail = titleTokens.at(-1);
  if (tail?.type === "text") {
    tail.raw = tail.raw.trimEnd();
    (tail as Tokens.Text).text = (tail as Tokens.Text).text.trimEnd();
  }
  const marker = `[!${match[1]}]`;
  const markerToken: Tokens.Text = { type: "text", raw: marker, text: marker };
  if (brIndex < 0) {
    // 제목만 있는 문단 — marked-alert 가 빈 문단으로 보고 걷어 낸다
    para.tokens = [markerToken];
    para.raw = marker;
    para.text = marker;
  } else {
    // 표시 + 줄바꿈 + 본문 — marked-alert 가 표시와 줄바꿈을 지운다
    para.tokens = [markerToken, ...inline.slice(brIndex)];
  }
  (token as CalloutToken).calloutTitle = titleTokens;
}

const calloutTitleExtension: MarkedExtension = {
  walkTokens: extractCalloutTitle,
  extensions: [
    {
      name: "alert",
      level: "block",
      renderer(token) {
        const t = token as CalloutToken;
        if (!t.calloutTitle || !t.meta) return false; // 제목 없는 콜아웃 — marked-alert 기본 렌더러
        const { className, variant, icon, titleClassName } = t.meta;
        const title = this.parser.parseInline(t.calloutTitle);
        return (
          `<div class="${className} ${className}-${variant}">\n` +
          `<p class="${titleClassName}" data-custom-title="">${icon}${title}</p>\n` +
          `${this.parser.parse(t.tokens ?? [])}</div>\n`
        );
      },
    },
  ],
};

/* ── 3 · 4. 인라인 코드 꼬리표 `코드{:언어}` · `식{:math}` ──
   rehype-pretty-code · MacFolio 와 같은 표기. 꼬리표를 떼고 그 언어로 Prism 하이라이트, math 면 KaTeX 인라인.
   모르는 언어면 꼬리표까지 글자 그대로 둔다(MacFolio 와 같다). */

const INLINE_TAIL = /^([\s\S]*\S)\{:([\w+#-]+)\}$/;

/** 인라인 코드 텍스트(이스케이프 전) → HTML. 꼬리표가 없거나 모르는 언어면 null */
export function renderTaggedCodespan(text: string): string | null {
  const match = INLINE_TAIL.exec(text);
  if (!match) return null;
  const [, code, rawLang] = match;
  if (rawLang === "math") return renderMath(code, false);
  const alias = normalizeLangAlias(rawLang);
  const grammar = alias ? resolveGrammar(alias) : null;
  if (!grammar) return null;
  // data-inline-hl — 렌더 뒤 highlightInlineCode 가 언어를 다시 추론해 덮어쓰지 않게(이미 처리 표시)
  return `<code class="language-${alias}" data-inline-hl="1">${Prism.highlight(code, grammar.grammar, grammar.name)}</code>`;
}

/* ── 4-1. `$…$` 수식 안에 `$` 가 또 있으면 수식으로 보지 않는다 ──
   marked-katex-extension 의 인라인 규칙은 닫는 `$` 뒤가 공백 · 문장부호여야 해서, `$p$이면 … $2^{32-p}$,` 처럼
   조사가 붙은 `$p$` 는 건너뛰고 다음 `$` 까지 한 수식으로 묶는다. 그 식은 `$` 가 들어 있어 KaTeX 오류(빨간 원문)가 된다.
   이 경우 여는 `$` 를 글자로 넘겨, 뒤의 온전한 `$2^{32-p}$` 만 수식이 되게 한다. 수식 안에 `$` 가 없으면 관여하지 않는다. */
const KATEX_INLINE = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n$]))\1(?=[\s?!.,:？！。，：]|$)/;

const katexDollarGuard: TokenizerAndRendererExtension = {
  name: "katexDollarGuard",
  level: "inline",
  tokenizer(src) {
    const match = KATEX_INLINE.exec(src);
    if (!match || !/(^|[^\\])\$/.test(match[2])) return undefined;
    return { type: "text", raw: match[1], text: match[1] };
  },
};

/* ── 6. 물결 하나 `~` 는 취소선이 아니다 ──
   marked 의 GFM 은 `~글자~` 도 취소선으로 본다. `/25~/30` · `220~440px` 같은 범위 표기가 취소선이 되므로
   MacFolio(singleTilde:false)처럼 `~~` 만 취소선으로 받는다. 물결 하나로 시작하면 취소선 토큰을 만들지 않고
   (undefined → 다음 규칙인 글자로), `~~` 면 false 로 marked 기본 del 에 넘긴다. */
const singleTildeTokenizer: MarkedExtension = {
  tokenizer: {
    del(src) {
      if (src.startsWith("~") && !src.startsWith("~~")) return undefined;
      return false;
    },
  },
};

/* ── 7. 그림 캡션의 링크 · 좌우 배치 ──
   `![설명](주소 '캡션 [출처](https://…)')` — 캡션 안 `[글자](http…)` 를 링크로(MacFolio caption.ts 와 같은 규칙).
   `주소#float-right` · `#float-left` 는 조각을 떼고 그림을 글 옆으로 띄운다(figure/img data-float). */

const CAPTION_LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

/** 캡션 원문 → HTML. 글자는 이스케이프, 링크는 http(s) 만 */
export function renderCaption(caption: string): string {
  let out = "";
  let last = 0;
  for (const match of caption.matchAll(CAPTION_LINK)) {
    out += escapeHtml(caption.slice(last, match.index));
    out += `<a href="${escapeHtml(match[2])}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[1])}</a>`;
    last = match.index + match[0].length;
  }
  return out + escapeHtml(caption.slice(last));
}

const FLOAT_FRAGMENT = /#float-(left|right)$/;

/** 이미지 주소 끝의 `#float-left|right` 를 떼어 배치와 나눈다 */
export function splitImageFloat(href: string): { src: string; float: "left" | "right" | null } {
  const match = FLOAT_FRAGMENT.exec(href);
  if (!match) return { src: href, float: null };
  return { src: href.slice(0, match.index), float: match[1] as "left" | "right" };
}

/** marked 렌더러 image — 캡션(title, 없으면 alt)이 있으면 figure 로 */
export function renderImage({ href, title, text }: { href: string; title?: string | null; text: string }): string {
  const { src, float } = splitImageFloat(href);
  const alt = text || "";
  const caption = title || (alt && alt !== "image" ? alt : "");
  const floatAttr = float ? ` data-float="${float}"` : "";
  const img = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"`;
  if (caption) {
    return `<figure${floatAttr}>${img} /><figcaption>${renderCaption(caption)}</figcaption></figure>\n`;
  }
  return `${img}${floatAttr} />\n`;
}

/** 코드 블록 ```math → KaTeX 블록. 다른 언어면 null(기존 코드 블록 렌더러로) */
export function renderMathBlock(text: string, lang: string | undefined): string | null {
  if ((lang ?? "").trim().toLowerCase() !== "math") return null;
  return renderMath(text, true) + "\n";
}

/**
 * MacFolio 표기 확장 묶음. markedAlert 뒤에 등록해야 한다(콜아웃 제목이 marked-alert 보다 먼저 돌아야 해서).
 * 형광펜 · 한국어 굵게는 인라인 확장이라 marked 기본 규칙보다 먼저 시도된다.
 */
export function macfolioExtensions(): MarkedExtension[] {
  return [
    { extensions: [markExtension, cjkEmphasisExtension, katexDollarGuard] },
    singleTildeTokenizer,
    calloutTitleExtension,
  ];
}
