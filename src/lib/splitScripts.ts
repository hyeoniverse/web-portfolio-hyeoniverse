/**
 * 한꺼번에 붙여 넣은 대본을 슬라이드별로 나눈다 — 갤러리 음성 편집의 "대본 한꺼번에 넣기".
 *
 * 나누는 기준은 글에 있는 것 가운데 가장 뚜렷한 하나를 쓴다.
 * 1. `---` 만 있는 줄 — 명시적인 구분
 * 2. 마크다운 제목(`## 01 표지`) — 발표 대본 문서가 흔히 쓰는 모양. 제목 줄은 대본에서 뺀다
 * 3. 빈 줄 — 문단 하나가 한 장
 * 나눈 조각의 앞뒤 공백은 지우고 빈 조각은 버린다.
 */
export function splitScripts(text: string): string[] {
  return splitScriptSections(text).map((s) => s.text);
}

export interface ScriptSection {
  text: string;
  /** 제목 줄에 적힌 장 번호(`## 03 요약` → 3). 제목으로 나누지 않았거나 번호가 없으면 없다 */
  slide?: number;
}

/** splitScripts 와 같이 나누되, 마크다운 제목으로 나눈 경우 제목의 첫 숫자를 장 번호로 함께 돌려준다 */
export function splitScriptSections(text: string): ScriptSection[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const clean = (parts: string[]) => parts.map((p) => p.trim()).filter(Boolean);

  if (lines.some((l) => /^\s*-{3,}\s*$/.test(l))) {
    return clean(text.replace(/\r\n?/g, "\n").split(/^\s*-{3,}\s*$/m)).map((t) => ({ text: t }));
  }

  if (lines.some((l) => /^\s*#{1,6}\s+\S/.test(l))) {
    const parts: ScriptSection[] = [];
    let cur: { lines: string[]; slide?: number } | null = null;
    const flush = () => {
      const t = cur?.lines.join("\n").trim();
      if (cur && t) parts.push({ text: t, ...(cur.slide ? { slide: cur.slide } : {}) });
    };
    for (const line of lines) {
      if (/^\s*#{1,6}\s+\S/.test(line)) {
        flush();
        const num = /\d+/.exec(line.replace(/^\s*#+/, ""));
        cur = { lines: [], slide: num ? Number(num[0]) : undefined };
      } else if (cur) {
        cur.lines.push(line);
      }
    }
    flush();
    return parts;
  }

  return clean(text.replace(/\r\n?/g, "\n").split(/\n\s*\n/)).map((t) => ({ text: t }));
}

/**
 * 나눈 대본을 어느 장에 넣을지 — 모든 조각에 장 번호가 있으면 번호대로(순서·빠진 장과 상관없이),
 * 하나라도 없으면 1장부터 차례대로. 슬라이드 수를 넘는 번호와 남는 조각은 넣지 않는다.
 * slide 는 1부터. 같은 번호가 두 번이면 뒤의 것이 이긴다.
 */
export function planScripts(sections: ScriptSection[], total: number): {
  byNumber: boolean;
  items: { slide: number; text: string }[];
  skipped: number;
} {
  const byNumber = sections.length > 0 && sections.every((s) => s.slide !== undefined);
  const all = sections.map((s, i) => ({ slide: byNumber ? s.slide! : i + 1, text: s.text }));
  const inRange = all.filter((x) => x.slide >= 1 && x.slide <= total);
  const bySlide = new Map(inRange.map((x) => [x.slide, x]));
  return { byNumber, items: [...bySlide.values()].sort((a, b) => a.slide - b.slide), skipped: all.length - inRange.length };
}

/**
 * 지금 들어 있는 대본을 "대본 한꺼번에 편집" 상자에 넣을 글로 적는다 — 장마다 `## 01` 제목 아래 대본.
 * 모든 조각에 번호가 있으니 planScripts 가 번호대로 넣고, 대본이 없는 장은 제목만 남아 비어 있다(나눌 때 빠진다).
 * splitScriptSections → planScripts 로 되돌리면 같은 장에 같은 대본이 간다.
 */
export function serializeScripts(gallery: string[], scriptOf: (url: string) => string | undefined): string {
  return gallery
    .map((url, i) => {
      const script = scriptOf(url)?.trim();
      return `## ${String(i + 1).padStart(2, "0")}${script ? `\n${script}` : ""}`;
    })
    .join("\n\n");
}

