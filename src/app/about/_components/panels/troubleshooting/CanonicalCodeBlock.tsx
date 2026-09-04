"use client";

import { useEffect, useRef } from "react";
import { highlightCodeBlocks, attachCodeWrapToggle } from "@/components/posts/highlightCodeBlocks";
import { useLanguage } from "@/providers/LanguageProvider";

/** 리더/댓글/에디터와 동일한 코드블록 — highlightCodeBlocks + attachCodeWrapToggle 를 그대로 돌린다.
 *
 *  <pre> 를 JSX 나 dangerouslySetInnerHTML 로 렌더하면 안 된다. 그러면 그 subtree 의 소유자가
 *  React 라, 하이라이팅과 프레임(.code-block-wrap)을 주입해 둔 DOM 을 이후 렌더가 원본으로
 *  되돌린다 — 화면엔 스타일 없는 맨 <pre> 만 남고 에러는 안 난다. 실제로 About 패널이 여러 번
 *  마운트되는 환경에서 일부 인스턴스만 프레임을 잃는 형태로 재현됐다.
 *
 *  그래서 React 에는 빈 div 만 맡기고, 노드 생성부터 정리까지 이 effect 가 전부 소유한다. */
export default function CanonicalCodeBlock({ code, lang }: { code: string; lang: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const safeLang = lang.replace(/[^a-zA-Z0-9+#._-]/g, "").slice(0, 20);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const pre = document.createElement("pre");
    const codeEl = document.createElement("code");
    if (safeLang) codeEl.className = `language-${safeLang}`;
    codeEl.textContent = code; // textContent 라 별도 이스케이프 불필요
    pre.appendChild(codeEl);
    root.appendChild(pre);

    highlightCodeBlocks(root);
    attachCodeWrapToggle(root, {
      wrap: t("common.codeWrap"),
      scroll: t("common.codeScroll"),
      wrapTitle: t("common.codeWrapTitle"),
      scrollTitle: t("common.codeScrollTitle"),
      copy: t("common.codeCopy"),
      copied: t("common.codeCopied"),
    });

    /* 이 패널에서는 코드블록을 줄바꿈 고정으로 둔다.
       About 은 Lenis + GSAP 가로 스크롤 위에 올라가 있어 휠이 페이지로 라우팅된다.
       그래서 코드블록의 가로 스크롤은 프로그램적으로만 움직이고 휠로는 끝까지 못 간다
       (scrollLeft 는 41px 까지 이동하지만 wheel 은 0 에서 변하지 않는 것을 확인).
       스크롤이 실제로 안 되는데 스크롤/줄바꿈 토글만 남으면 잘린 코드를 볼 방법이 없다. */
    root.querySelectorAll("pre").forEach((el) => {
      (el as HTMLElement).style.whiteSpace = "pre-wrap";
    });
    root.querySelectorAll("button[data-wrap-btn]").forEach((btn) => btn.remove());

    // attachCodeWrapToggle 이 pre 를 wrap/outer 로 감싸므로 root 를 통째로 비운다
    return () => root.replaceChildren();
  }, [code, safeLang, t]);
  return <div ref={ref} />;
}
