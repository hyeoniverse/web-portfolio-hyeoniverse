/**
 * README 원문을 사이트에서 그려도 되는 마크다운으로 바꾼다(#1062).
 *
 * 본문 렌더러(MarkdownRenderer)는 marked 의 결과를 그대로 innerHTML 로 넣는다. 게시물 본문은
 * 주인이 쓴 글이라 그래도 되지만 README 는 조직 저장소처럼 남이 쓴 것일 수 있다. GitHub 은
 * 자기 화면에서 README 의 HTML 을 걸러 내보내는데, 원문을 그대로 받아 그리면 그 방어가 없다.
 *
 * 그래서 HTML 을 통째로 믿지 않는다. 골라낼 태그 목록을 손으로 관리하는 건 빠뜨리기 쉬워서,
 * 남길 것을 마크다운으로 옮기고 나머지 태그는 지운다 — 남는 HTML 이 없으면 새는 구멍도 없다.
 *
 * 상대경로 그림·링크는 저장소 주소로 펴 준다. 안 그러면 사이트 주소로 붙어 전부 깨진다.
 */

/** 그림·링크에서 허용할 주소 — 그 밖(javascript:, data: 등)은 죽인 링크로 바꾼다 */
const SAFE_URL = /^(https?:\/\/|\/|#|mailto:)/i;

/** 내용까지 지울 태그 — 안에 든 것이 글이 아니다 */
const DROP_WITH_BODY = /<(script|style|template|noscript|svg|iframe|object|embed|form)\b[\s\S]*?<\/\1\s*>/gi;

/** 속성 값 하나 꺼내기. 값에 따옴표가 없을 수도 있다 */
function attr(tag: string, name: string): string {
  const quoted = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  if (quoted) return quoted[2] ?? quoted[3] ?? "";
  const bare = tag.match(new RegExp(`${name}\\s*=\\s*([^\\s>]+)`, "i"));
  return bare ? bare[1] : "";
}

/** 마크다운 대괄호·따옴표를 없애 alt 가 문법이나 속성을 벗어나지 못하게 한다 */
function safeAlt(text: string): string {
  return text.replace(/["'\[\]\\]/g, "").trim();
}

export interface ReadmeSource {
  owner: string;
  name: string;
  /** 기본 브랜치 — 상대경로를 raw 주소로 펼 때 쓴다 */
  branch: string;
}

/** 스킴이 붙은 주소인지 — javascript:, vbscript: 처럼 상대경로가 아닌 것을 가려낸다 */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const ALLOWED_SCHEME = /^(https?:|mailto:|data:)/i;

/** 상대경로를 저장소의 raw 주소로 — 이미 절대주소면 그대로 둔다.
    허용하지 않는 스킴은 빈 문자열이다. 이 검사를 펴기(absolutize) 뒤로 미루면
    javascript:alert(1) 이 상대경로로 보여 raw 주소가 붙고, 그 뒤 검사는 통과해 버린다 */
function absolute(url: string, src: ReadmeSource): string {
  const clean = url.trim().replace(/^\.\//, "");
  if (!clean) return "";
  if (clean.startsWith("//")) return `https:${clean}`;
  if (HAS_SCHEME.test(clean)) return ALLOWED_SCHEME.test(clean) ? clean : "";
  if (clean.startsWith("#")) return clean;
  const path = clean.replace(/^\//, "");
  return `https://raw.githubusercontent.com/${src.owner}/${src.name}/${src.branch || "HEAD"}/${path}`;
}

function safeUrl(url: string, src: ReadmeSource): string {
  const abs = absolute(url, src);
  /* data: 는 그림으로는 되지만 링크로는 위험하다 — 그림 쪽에서만 따로 허용한다 */
  return SAFE_URL.test(abs) ? abs : "";
}

export function readmeToMarkdown(markdown: string, src: ReadmeSource): string {
  let out = markdown.replace(/\r\n/g, "\n");

  // 1. 글이 아닌 것은 내용까지 버린다
  out = out.replace(DROP_WITH_BODY, "");

  // 2. 남길 것은 마크다운으로 옮긴다 — 가운데 정렬한 <img> 머리글은 README 에서 가장 흔한 모양이다
  out = out.replace(/<img\b[^>]*>/gi, (tag) => {
    const url = safeUrl(attr(tag, "src"), src);
    if (!url) return "";
    return `![${safeAlt(attr(tag, "alt"))}](${url})`;
  });
  out = out.replace(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi, (_, open: string, inner: string) => {
    const url = safeUrl(attr(open, "href"), src);
    const text = inner.trim();
    if (!url || !text) return text;
    return `[${text}](${url})`;
  });
  out = out.replace(/<br\s*\/?>/gi, "\n");
  out = out.replace(/<\/(p|div|section|h[1-6]|li|tr)\s*>/gi, "\n\n");

  // 3. 나머지 태그는 지운다 — 남는 HTML 이 없으면 새는 구멍도 없다
  out = out.replace(/<[^>]*>/g, "");

  // 4. 마크다운 문법으로 들어오는 주소도 같은 기준으로 본다
  out = out.replace(/(!?)\[([^\]]*)\]\(([^)\s]+)([^)]*)\)/g, (whole, bang: string, text: string, url: string, tail: string) => {
    const isImage = bang === "!";
    const clean = absolute(url, src);
    if (isImage) {
      /* 그림은 data: 도 그릴 수 있게 둔다. 그 밖의 수상한 스킴은 통째로 버린다 */
      const ok = SAFE_URL.test(clean) || clean.startsWith("data:image/");
      return ok ? `![${safeAlt(text)}](${clean}${tail})` : "";
    }
    return SAFE_URL.test(clean) ? `[${text}](${clean}${tail})` : text;
  });

  // 5. 빈 줄이 넷씩 겹치면 문서가 헐렁해진다
  return out.replace(/\n{3,}/g, "\n\n").trim();
}
