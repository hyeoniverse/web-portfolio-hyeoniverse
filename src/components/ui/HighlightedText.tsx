import { useMemo } from "react";
import { parseSearchQuery, type SyntaxMode } from "@/lib/searchQuery";
import { highlightTokens } from "@/lib/searchHighlight";
import { useSearchHighlight } from "@/providers/SearchHighlightProvider";
import styles from "./HighlightedText.module.css";

interface HighlightedTextProps {
  text: string;
  /** 명시적 query — 미지정 시 SearchHighlightProvider context 의 query 사용. */
  query?: string;
  mode?: SyntaxMode;
  className?: string;
}

/** 검색 결과 텍스트에 매칭 부분을 <mark> 으로 강조. query 가 비면 plain text. */
export default function HighlightedText({ text, query, mode, className }: HighlightedTextProps) {
  const ctx = useSearchHighlight();
  const activeQuery = query ?? ctx.query;
  const activeMode = mode ?? ctx.mode;
  const tokens = useMemo(() => {
    if (!activeQuery?.trim()) return [{ text, mark: false }];
    return highlightTokens(text, parseSearchQuery(activeQuery, activeMode));
  }, [text, activeQuery, activeMode]);

  return (
    <span className={className}>
      {tokens.map((t, i) =>
        t.mark
          ? <mark key={i} className={styles.mark}>{t.text}</mark>
          : <span key={i}>{t.text}</span>,
      )}
    </span>
  );
}
