"use client";

import { useEffect, useMemo, useRef } from "react";
import { attachCodeWrapToggle, applyColorSwatches, highlightInlineCode } from "./highlightCodeBlocks";
import { useBodyLabels } from "./BodyLabelsContext";
import { attachImageFallback } from "@/lib/imageFallback";
import { enhanceFootnotes } from "./footnotes";
import { renderMarkdown } from "./renderMarkdown";

// KaTeX CSS (이미 글로벌에 포함되어 있지 않으면 여기서 import)
import "@/styles/vendor/katex.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}


export default function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  /* 화면 언어 라벨, 번역해 볼 때는 번역 라벨(BodyLabelsContext) */
  const { labels } = useBodyLabels();
  const ref = useRef<HTMLDivElement>(null);

  // marked 설정 · 확장 문법 · 첨부 카드 변환은 renderMarkdown 한 곳에 있다
  const html = useMemo(() => renderMarkdown(content), [content]);

  // 코드블록 복사·줄바꿈 바 주입 — marked 가 이미 Prism 으로 하이라이트했으므로 컨트롤 바만 붙인다.
  // 부모(디테일/미리보기/works)가 ref 를 넘겨주는지에 의존하지 않고 자체 ref 로 처리 → markdown 은
  // 어느 리더뷰에서든 항상 복사 버튼이 나온다. (mermaid 스킵·중복 주입 방지는 attachCodeWrapToggle 내부)
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    attachCodeWrapToggle(root, {
      wrap: labels.codeWrap,
      scroll: labels.codeScroll,
      wrapTitle: labels.codeWrapTitle,
      scrollTitle: labels.codeScrollTitle,
      copy: labels.codeCopy,
      copied: labels.codeCopied,
    });
    // 인라인 코드 색상값(`#hex`·`rgb()`·`hsl()`) 앞에 색 스와치
    applyColorSwatches(root);
    // 인라인 코드도 syntax highlight (명확히 코드로 추론될 때만)
    highlightInlineCode(root);
  }, [html, labels]);

  // 각주 — 번호 · 돌아가기 링크를 누르면 고정 네비에 가리지 않게 그 자리로(richtext 리더와 같은 동작)
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    return enhanceFootnotes(root, labels);
  }, [html, labels]);

  // 깨진 이미지 → 공용 placeholder 로 swap. 동적 추가 img 추적까지 공용 헬퍼가 담당
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    return attachImageFallback(root);
  }, [html]);

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
