import React from "react";
import type { Language } from "@/providers/LanguageProvider";
import Tooltip from "@/components/ui/Tooltip";
import { getGlossary } from "./glossary";

/**
 * 텍스트에서 용어를 감지하여 Tooltip 컴포넌트로 래핑.
 * 같은 텍스트 블록 내에서 같은 용어는 첫 등장만 툴팁 처리.
 */
function applyGlossary(text: string, lang: Language, seen: Set<string>): React.ReactNode {
  const { regex, map } = getGlossary(lang);
  regex.lastIndex = 0;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const key = match[0].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const tip = map.get(key);
    if (!tip) continue;

    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <Tooltip key={match.index} content={tip}>
        <span className="glossary-term">{match[0]}</span>
      </Tooltip>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (parts.length === 0) return text;
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

/**
 * 인라인 마크다운 재귀 파서 — **bold** / *italic* / `code` 를 중첩까지 처리.
 * 각 위치에서 가장 먼저 등장하는 구분자를 잡고(같은 위치면 bold > italic), 안쪽을 다시 파싱한다.
 * 코드는 안쪽을 파싱하지 않고 그대로(툴팁·강조 없음), 그 외 텍스트에는 용어 툴팁을 적용한다.
 */
function parseInline(
  text: string,
  lang: Language | undefined,
  seen: Set<string>,
  kp: string,
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let rest = text;
  let k = 0;

  const plain = (t: string, key: string) => (
    <React.Fragment key={key}>{lang ? applyGlossary(t, lang, seen) : t}</React.Fragment>
  );

  while (rest.length > 0) {
    const mCode = /`[^`]+`/.exec(rest);
    const mBold = /\*\*([\s\S]+?)\*\*/.exec(rest);
    /* 이탤릭 내용은 `*` 로 시작할 수 없다. 이 제약이 없으면 `****` 에서 앞 세 글자가
       이탤릭(`*` 하나를 감싼 꼴)으로 잡혀 `**` 로 줄어든다. 볼드는 최소 1자를 요구하므로
       `****` 를 잡지 않고, 결국 마크업이 아닌 텍스트가 소리 없이 사라진다. */
    const mItal = /\*([^*][\s\S]*?)\*/.exec(rest);

    const cands: { idx: number; kind: "code" | "bold" | "ital"; m: RegExpExecArray }[] = [];
    if (mCode) cands.push({ idx: mCode.index, kind: "code", m: mCode });
    if (mBold) cands.push({ idx: mBold.index, kind: "bold", m: mBold });
    if (mItal) cands.push({ idx: mItal.index, kind: "ital", m: mItal });

    if (cands.length === 0) {
      out.push(plain(rest, `${kp}-t${k++}`));
      break;
    }

    // 가장 먼저 등장하는 구분자. 같은 위치(** 지점)면 bold 우선.
    cands.sort((a, b) => a.idx - b.idx || (a.kind === "bold" ? -1 : b.kind === "bold" ? 1 : 0));
    const c = cands[0];

    if (c.idx > 0) out.push(plain(rest.slice(0, c.idx), `${kp}-t${k++}`));

    if (c.kind === "code") {
      out.push(<code key={`${kp}-c${k++}`}>{c.m[0].slice(1, -1)}</code>);
    } else if (c.kind === "bold") {
      const kk = `${kp}-b${k++}`;
      out.push(
        <span key={kk} className="highlighted-text">
          {parseInline(c.m[1], lang, seen, kk)}
        </span>,
      );
    } else {
      const kk = `${kp}-i${k++}`;
      out.push(<em key={kk}>{parseInline(c.m[1], lang, seen, kk)}</em>);
    }

    rest = rest.slice(c.idx + c.m[0].length);
  }

  return out;
}

/**
 * **bold** 는 highlighted-text span, *italic* 은 <em>, `code` 는 전역 <code> 칩(사이트 공통)으로 변환하고,
 * 중첩(볼드 안 이탤릭·코드)까지 처리하며, 코드가 아닌 텍스트의 기술 용어에는 툴팁을 추가.
 */
export function renderHighlight(text: string, lang?: Language): React.ReactNode {
  const seen = new Set<string>();
  const nodes = parseInline(text, lang, seen, "rh");
  if (nodes.length === 1) return nodes[0];
  return <>{nodes}</>;
}
