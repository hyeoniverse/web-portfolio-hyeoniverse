import type { TocHeading } from "@/types";

/** 제목 → id 조각. 마크다운 렌더러와 richtext 처리(addIdsToHtml)가 같이 쓴다.
 *  여기 둔다 — MarkdownRenderer 에서 가져오면 marked · katex 가 richtext 글 · TIL 첫 로드까지 따라온다 */
export function slugify(text: string): string {
  /* 태그는 더 지울 것이 없을 때까지 지운다 — 한 번만 지우면 "<scr<script>ipt>" 처럼 겹친 조각이 다시 태그가 된다.
     아래 단계가 어차피 기호를 "-" 로 바꾸지만 여기서 끊는다(CodeQL js/incomplete-multi-character-sanitization) */
  let plain = text;
  for (let prev = ""; prev !== plain; ) {
    prev = plain;
    plain = plain.replace(/<[^>]*>/g, "");
  }
  return plain
    .toLowerCase()
    .replace(/[^\w가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 같은 문서 안에서 같은 이름의 제목("결정" 등)이 여러 번 나오면 id 가 겹쳐 목차가 항상 첫 번째로 간다.
 *  두 번째부터 -2, -3 을 붙인다. id 를 다는 쪽(addIdsToHtml · 마크다운 렌더러)과 목차를 뽑는 쪽이
 *  같은 순서로 같은 제목을 세므로 결과가 맞는다. */
function createSlugger() {
  const seen = new Map<string, number>();
  return (text: string): string => {
    const base = slugify(text);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  };
}

export function extractHeadings(content: string, isMarkdown: boolean): TocHeading[] {
  if (isMarkdown) {
    const lines = content.split("\n");
    const headings: TocHeading[] = [];
    const slug = createSlugger();
    let inCodeBlock = false;

    for (const line of lines) {
      if (line.trim().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      const match = line.match(/^(#{1,4})\s+(.+)$/);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].trim(),
          id: slug(match[2].trim()),
        });
      }
    }
    return headings;
  }

  const headings: TocHeading[] = [];
  const slug = createSlugger();
  const regex = /<h([1-4])[^>]*>(.*?)<\/h\1>/gi;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const plainText = m[2].replace(/<[^>]*>/g, "");
    headings.push({
      level: parseInt(m[1]),
      text: plainText,
      id: slug(plainText),
    });
  }
  return headings;
}

/** 본문 밖 항목(댓글 등)을 목차 끝에 — 본문의 가장 높은 제목과 같은 단계로 붙인다.
 *  목차는 가장 높은 단계를 장으로 묶는데, 예전엔 댓글을 1단계로 붙여 h2 로 시작하는 글의 h2 가 모두
 *  소제목이 되어 첫 제목 아래로 들어가고 h3 는 목차에서 빠졌다. */
export function appendTocEntry(headings: TocHeading[], entry: Omit<TocHeading, "level">): TocHeading[] {
  const top = headings.length ? Math.min(...headings.map((h) => h.level)) : 1;
  return [...headings, { ...entry, level: top }];
}

export function addIdsToHtml(html: string): string {
  const slug = createSlugger();
  return html.replace(/<h([1-4])([^>]*)>(.*?)<\/h\1>/gi, (_, level, attrs, text) => {
    const plainText = text.replace(/<[^>]*>/g, "");
    const id = slug(plainText);
    return `<h${level}${attrs} id="${id}">${text}</h${level}>`;
  });
}
