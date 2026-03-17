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

    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
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
 * **bold** 마커를 highlighted-text span으로 변환하고,
 * 기술 용어에는 툴팁을 추가.
 */
export function renderHighlight(text: string, lang?: Language): React.ReactNode {
  const boldParts = text.split(/\*\*(.+?)\*\*/g);
  const seen = new Set<string>();

  if (boldParts.length === 1) {
    return lang ? applyGlossary(text, lang, seen) : text;
  }

  return boldParts.map((part, i) => {
    const content = lang ? applyGlossary(part, lang, seen) : part;
    return i % 2 === 1 ? (
      <span key={i} className="highlighted-text">
        {content}
      </span>
    ) : (
      <React.Fragment key={i}>{content}</React.Fragment>
    );
  });
}
