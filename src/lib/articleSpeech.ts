/**
 * 글 읽어 주기(ListenButton)가 읽을 차례 — 화면의 글 상세를 블록(조각) 목록으로 바꾼다.
 *
 * 차례는 제목 → 요약 → 메타 → 본문. 헤더에서 읽을 자리는 data-listen="title | summary | meta" 로 표시해 둔다.
 * 본문(.prose-content)은 블록 단위로 나눈다 — 블록마다 따로 읽어야 읽는 자리를 강조하고, 거기서부터
 * 다시 읽고(일시정지 · 앞뒤로 건너뛰기 · 누른 문단부터), 블록마다 언어를 따로 정할 수 있다.
 *
 * 소리로 들어서는 소용없는 블록은 무엇인지만 알리고 넘어간다(기술 문서를 읽어 주는 도구들의 관례):
 * 코드 블록 → "코드 블록, 언어, N줄", 표 → "N행 M열 표", 수식 → "수식", 동영상 · 삽입 → 종류만.
 * 이미지는 대체 글(alt)과 캡션을 읽는다. 문장 안의 인라인 코드는 그대로 읽는다(이름 · 값이라 뜻이 있다).
 * 화면에 보이지 않는 것(닫힌 토글 안쪽 등)은 읽지 않는다 — 화면과 소리가 어긋나지 않게.
 */

import { speechLangOf, type SpeechLang } from "@/lib/speech";

export type SegmentKind = "title" | "summary" | "meta" | "heading" | "text" | "quote" | "code" | "table" | "image" | "math" | "media";

export interface SpeechSegment {
  kind: SegmentKind;
  text: string;
  /** 읽는 동안 강조하고, 화면 밖이면 따라 스크롤할 요소 */
  el: HTMLElement;
  lang: SpeechLang;
}

const HEADER_ORDER = ["title", "summary", "meta"] as const;

/** 아예 건너뛰는 것 — 단추(코드 줄바꿈 단추 등) · 장식 */
const SKIP = "button, script, style, template, noscript, [aria-hidden='true'], [data-listen-skip]";
const CODE = "pre, .code-block-wrap";
const MEDIA = "video, audio, iframe, embed, object";
const HEADING = /^H[1-6]$/;

/* 소리로 알리는 말 — 화면 언어가 아니라 읽는 목소리의 언어를 따른다 */
const SAY = {
  "ko-KR": {
    code: (lang: string, lines: number) => `코드 블록${lang ? `, ${lang}` : ""}, ${lines}줄은 건너뜁니다.`,
    table: (rows: number, cols: number) => `${rows}행 ${cols}열 표는 건너뜁니다.`,
    image: (alt: string) => (alt ? `이미지. ${alt}` : "이미지."),
    math: "수식.",
    inlineMath: " 수식 ",
    video: "동영상.",
    embed: "삽입된 콘텐츠.",
    quote: "인용.",
  },
  "en-US": {
    code: (lang: string, lines: number) => `Code block${lang ? `, ${lang}` : ""}, ${lines} ${lines === 1 ? "line" : "lines"}, skipped.`,
    table: (rows: number, cols: number) => `Table with ${rows} rows and ${cols} columns, skipped.`,
    image: (alt: string) => (alt ? `Image. ${alt}` : "Image."),
    math: "Equation.",
    inlineMath: " equation ",
    video: "Video.",
    embed: "Embedded content.",
    quote: "Quote.",
  },
} as const;

const tidy = (s: string) => s.replace(/[ \t ]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();

/** 글에 직접 붙은 언어 표시 — <html lang> 은 화면(UI) 언어라 글의 언어로 치지 않는다 */
function taggedLang(el: Element): SpeechLang | null {
  const tagged = el.closest("[lang]");
  if (!tagged || tagged === document.documentElement) return null;
  const tag = tagged.getAttribute("lang") ?? "";
  return tag.startsWith("ko") ? "ko-KR" : tag.startsWith("en") ? "en-US" : null;
}

/* 글 조각은 붙은 표시가 없으면 글자로(한글이 있으면 한국어), 알리는 말(코드 블록 · 표 등)은 본문 언어로 */
const textLang = (el: Element, text: string, base: SpeechLang) => taggedLang(el) ?? (text ? speechLangOf(text) : base);

/** 화면에 보이는지 — 닫힌 토글 안쪽 · display:none 은 상자가 없다 */
const visible = (el: Element) => el.getClientRects().length > 0;

function isInline(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) return true;
  if (node.nodeType !== Node.ELEMENT_NODE) return true;
  const el = node as HTMLElement;
  if (el.tagName === "BR") return true;
  if (el.matches(CODE) || el.matches(MEDIA) || el.matches("table, figure") || HEADING.test(el.tagName)) return false;
  if (el.classList.contains("katex-display")) return false;
  return getComputedStyle(el).display.startsWith("inline");
}

/** 문장 안 글 — 인라인 수식은 "수식", 인라인 이미지는 대체 글로 바꾸고, 단추 · 장식은 뺀다 */
function inlineText(nodes: Node[], lang: SpeechLang): string {
  const box = document.createElement("div");
  nodes.forEach((n) => box.append(n.cloneNode(true)));
  box.querySelectorAll(SKIP).forEach((el) => el.remove());
  box.querySelectorAll(".katex").forEach((el) => el.replaceWith(SAY[lang].inlineMath));
  box.querySelectorAll("img").forEach((el) => el.replaceWith(el.getAttribute("alt") ? ` ${el.getAttribute("alt")} ` : ""));
  box.querySelectorAll("br").forEach((el) => el.replaceWith("\n"));
  return tidy(box.textContent ?? "");
}

function codeSegment(el: HTMLElement, lang: SpeechLang): string {
  const code = el.querySelector("code") ?? el;
  const name = [...code.classList].find((c) => c.startsWith("language-"))?.slice(9) ?? el.getAttribute("data-language") ?? "";
  const lines = Math.max(1, (code.textContent ?? "").replace(/\n$/, "").split("\n").length);
  return SAY[lang].code(name === "plaintext" || name === "text" ? "" : name, lines);
}

function tableSegment(el: HTMLElement, lang: SpeechLang): string {
  const rows = el.querySelectorAll("tr");
  const cols = Math.max(0, ...[...rows].map((r) => r.children.length));
  return SAY[lang].table(rows.length, cols);
}

function imageSegment(el: HTMLElement, lang: SpeechLang): string {
  const img = el.matches("img") ? el : el.querySelector("img");
  const alt = tidy(img?.getAttribute("alt") ?? "");
  const caption = tidy(el.querySelector("figcaption")?.textContent ?? "");
  const said = SAY[lang].image(alt);
  return caption && caption !== alt ? `${said}\n${caption}` : said;
}

function bodySegments(root: HTMLElement, fallback: SpeechLang): SpeechSegment[] {
  const out: SpeechSegment[] = [];
  const push = (kind: SegmentKind, el: HTMLElement, make: (lang: SpeechLang) => string) => {
    /* 글 조각은 그 글로 언어를 정하고, 알리는 말은 본문 언어로 만든다 */
    const textual = kind === "text" || kind === "heading";
    const lang = textual ? textLang(el, make(fallback), fallback) : taggedLang(el) ?? fallback;
    const text = make(lang);
    if (text) out.push({ kind, text, el, lang });
  };

  const walk = (container: HTMLElement) => {
    /* 블록 사이에 낀 글(목록 항목 글 다음에 하위 목록이 오는 경우 등)은 모아 두었다가 블록을 만나면 한 조각으로 */
    let run: Node[] = [];
    const flush = () => {
      if (run.length) {
        const nodes = run;
        push("text", container, (lang) => inlineText(nodes, lang));
      }
      run = [];
    };
    for (const node of container.childNodes) {
      if (isInline(node)) {
        if (node.nodeType !== Node.ELEMENT_NODE || !(node as Element).matches(SKIP)) run.push(node);
        continue;
      }
      flush();
      const el = node as HTMLElement;
      if (el.matches(SKIP) || !visible(el)) continue;
      if (el.matches(CODE)) push("code", el, (lang) => codeSegment(el, lang));
      else if (el.matches("table") || el.querySelector(":scope > table")) push("table", el, (lang) => tableSegment(el.matches("table") ? el : el.querySelector("table")!, lang));
      else if (el.matches("img") || (el.matches("figure, picture") && el.querySelector("img"))) push("image", el, (lang) => imageSegment(el, lang));
      else if (el.matches("figure") && el.querySelector(MEDIA)) push("media", el, (lang) => (el.querySelector("video, audio") ? SAY[lang].video : SAY[lang].embed));
      else if (el.matches(MEDIA)) push("media", el, (lang) => (el.matches("video, audio") ? SAY[lang].video : SAY[lang].embed));
      else if (el.classList.contains("katex-display")) push("math", el, (lang) => SAY[lang].math);
      else if (HEADING.test(el.tagName)) push("heading", el, (lang) => inlineText([...el.childNodes], lang));
      else if (el.tagName === "BLOCKQUOTE") {
        const start = out.length;
        walk(el);
        /* 인용 첫 조각 앞에 "인용." — 듣는 쪽이 누구의 말인지 구분하게 */
        if (out[start]) out[start] = { ...out[start], kind: "quote", text: `${SAY[out[start].lang].quote}\n${out[start].text}` };
      } else if (el.tagName === "DETAILS" && !(el as HTMLDetailsElement).open) {
        const summary = el.querySelector("summary");
        if (summary) push("text", el, (lang) => inlineText([...summary.childNodes], lang));
      } else walk(el);
    }
    flush();
  };

  walk(root);
  return out;
}

/** 지금 화면의 글 상세를 읽을 조각 목록으로 — 헤더(제목 · 요약 · 메타)가 없으면 fallbackTitle 을 제목으로 */
/** 헤더 조각 — 화면에 보이는 대로(innerText) 줄로 나눈다. 칩 · 칸이 줄로 나뉘어 이름끼리 붙어 읽히지 않는다.
    메타는 한 조각으로 쉼표로 잇는다(조각마다 끊어 읽으면 느리다). "1" + "min read" 처럼 숫자 뒤에 소문자로 이어지는
    줄은 한 덩어리로 붙인다. 가운뎃점 구분자는 쉼으로 */
function headerText(el: HTMLElement, role: (typeof HEADER_ORDER)[number]): string {
  const lines = el.innerText.replace(/·/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  if (role !== "meta") return lines.join("\n");
  const merged: string[] = [];
  for (const line of lines) {
    const prev = merged[merged.length - 1];
    if (prev && /\d$/.test(prev) && /^[a-z]/.test(line)) merged[merged.length - 1] = `${prev} ${line}`;
    else merged.push(line);
  }
  return merged.join(", ");
}

export function articleSegments(fallbackTitle: string): SpeechSegment[] {
  const prose = document.querySelector<HTMLElement>(".prose-content");
  const base: SpeechLang = (prose && taggedLang(prose)) ?? speechLangOf(prose?.textContent || fallbackTitle);
  const header: SpeechSegment[] = HEADER_ORDER.flatMap((role) =>
    [...document.querySelectorAll<HTMLElement>(`[data-listen="${role}"]`)]
      .filter(visible)
      .map((el) => {
        const text = headerText(el, role);
        return { kind: role, el, text, lang: textLang(el, text, base) };
      })
      .filter((s) => s.text),
  );
  if (header.length === 0) header.push({ kind: "title", el: document.body, text: fallbackTitle, lang: base });
  return [...header, ...(prose ? bodySegments(prose, base) : [])];
}

/** 이 노드가 들어 있는 조각 — 누른 문단 · 선택한 곳부터 읽을 때. 가장 안쪽(뒤쪽) 조각을 고른다 */
export function segmentIndexOf(segments: SpeechSegment[], node: Node | null): number {
  if (!node) return -1;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i].el !== document.body && segments[i].el.contains(node)) return i;
  }
  return -1;
}
