import type { TocHeading } from "@/types";
import { slugify } from "@/components/posts/MarkdownRenderer";

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

export function addIdsToHtml(html: string): string {
  const slug = createSlugger();
  return html.replace(/<h([1-4])([^>]*)>(.*?)<\/h\1>/gi, (_, level, attrs, text) => {
    const plainText = text.replace(/<[^>]*>/g, "");
    const id = slug(plainText);
    return `<h${level}${attrs} id="${id}">${text}</h${level}>`;
  });
}
