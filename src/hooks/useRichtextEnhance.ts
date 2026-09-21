import { useEffect, useRef, type RefObject } from "react";
import { useLanguage } from "@/providers/LanguageProvider";

const PLACEHOLDER_SRC = "/images/placeholder.svg";
/** 후처리 적용 표식 — React 가 innerHTML 을 다시 세팅하면 사라져서 재적용 신호가 된다 */
const ENHANCED_FLAG = "data-reader-enhanced";

/** img 한 개를 placeholder 로 swap (이미 placeholder 면 무시) */
function swapToPlaceholder(img: HTMLImageElement) {
  if (img.src.endsWith(PLACEHOLDER_SRC)) return;
  img.src = PLACEHOLDER_SRC;
  img.removeAttribute("srcset");
}

/**
 * 컨테이너 내 모든 <img> 에 fallback 부착.
 * - 이미 실패 상태(complete + naturalWidth 0)면 즉시 swap
 * - 그렇지 않으면 error listener 부착
 * - MutationObserver 로 새로 추가되는 img 도 동일 처리 (rich-text 가 dynamic 하게 변할 때 대응)
 */
function attachImageFallback(root: HTMLElement): () => void {
  const handle = (img: HTMLImageElement) => {
    if (img.dataset.fallbackBound === "1") return;
    img.dataset.fallbackBound = "1";
    img.addEventListener("error", () => swapToPlaceholder(img));
    if (img.complete && img.naturalWidth === 0) swapToPlaceholder(img);
  };

  // 1) 현재 컨테이너 안 모든 img
  root.querySelectorAll("img").forEach((el) => handle(el as HTMLImageElement));

  // 2) 추가되는 img 도 추적
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        const el = node as Element;
        if (el.tagName === "IMG") handle(el as HTMLImageElement);
        el.querySelectorAll?.("img").forEach((img) => handle(img as HTMLImageElement));
      });
    }
  });
  mo.observe(root, { childList: true, subtree: true });
  return () => mo.disconnect();
}

/**
 * 리더뷰 richtext 후처리 — 글(posts)과 작업물(works) 상세·미리보기가 같이 쓴다.
 *
 * 수식(KaTeX) / 코드 하이라이트(서버 Shiki 가 못 칠한 블록만) / 코드블록 상단 바(복사·줄바꿈) /
 * 인라인 코드 색 스와치·하이라이트 / 특수 블록 island(mermaid·목차·달력 …) / 깨진 그림 대체.
 *
 * 전부 dangerouslySetInnerHTML 로 만든 DOM 위에 얹는 작업이라, React 가 그 DOM 을 다시 세팅하면
 * 통째로 날아간다. 그래서 "한 번 적용"이 아니라 **컨테이너를 계속 소유**한다 — 표식(sentinel)이
 * 사라지면 다시 건다.
 *
 * 라벨(t)은 deps 에 넣지 않는다. t 는 언어가 확정될 때 identity 가 바뀌는데, 그때마다 후처리를
 * 다시 돌리면 줄바꿈 단추의 라벨을 새로 만들어 버려, 누른 직후 라벨을 바꾸려던 처리가 떨어져 나간
 * 옛 라벨에 가서 단추가 엉뚱한 상태로 남았다(작업물 상세에서 가끔 보이던 버그). 라벨은 ref 로 최신값을 읽는다.
 *
 * @param html 컨테이너에 넣은 HTML — 바뀌면 다시 건다
 * @param enabled richtext 일 때만 — 마크다운은 MarkdownRenderer 가 스스로 처리한다
 */
export function useRichtextEnhance(
  ref: RefObject<HTMLElement | null>,
  html: string,
  enabled = true,
) {
  const { t } = useLanguage();
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    let extrasCleanup: (() => void) | undefined;
    let detachFallback: (() => void) | undefined;

    const apply = async () => {
      if (cancelled || !el.isConnected) return;
      const [{ renderMathNodes }, code, { enhanceReaderExtras }] = await Promise.all([
        import("@/components/posts/renderMathNodes"),
        import("@/components/posts/highlightCodeBlocks"),
        import("@/components/posts/enhanceReaderExtras"),
      ]);
      if (cancelled || !el.isConnected) return;
      const tr = tRef.current;

      /* 수식 오류 문구의 언어 — 이 효과는 언어가 바뀌어도 다시 돌지 않게 되어 있어(위 tRef 와 같은 이유) html lang 을 읽는다 */
      renderMathNodes(el, document.documentElement.lang === "en" ? "en" : "ko");
      // 서버 Shiki 가 칠하지 못한 블록만 Prism 으로 — 칠해진 것(.shiki)은 건드리지 않는다
      code.highlightCodeBlocks(el);
      code.attachCodeWrapToggle(el, {
        wrap: tr("common.codeWrap"),
        scroll: tr("common.codeScroll"),
        wrapTitle: tr("common.codeWrapTitle"),
        scrollTitle: tr("common.codeScrollTitle"),
        copy: tr("common.codeCopy"),
        copied: tr("common.codeCopied"),
      });
      // 인라인 코드 색상값(`#hex`·`rgb()`·`hsl()`) 앞에 색 스와치
      code.applyColorSwatches(el);
      // 인라인 코드도 syntax highlight (명확히 코드로 추론될 때만)
      code.highlightInlineCode(el);
      extrasCleanup?.();
      extrasCleanup = enhanceReaderExtras(el, {
        viewCode: tr("common.mermaidViewCode"),
        hideCode: tr("common.mermaidHideCode"),
        copyCode: tr("common.codeCopy"),
        copied: tr("common.codeCopied"),
        diagram: tr("common.mermaidDiagram"),
        code: tr("common.mermaidCode"),
        split: tr("common.mermaidSplit"),
      });
      detachFallback?.();
      detachFallback = attachImageFallback(el);

      // 재적용 판정용 sentinel — React 가 innerHTML 을 다시 세팅하면 이것도 같이 지워진다.
      if (!el.querySelector(`:scope > [${ENHANCED_FLAG}]`)) {
        const mark = document.createElement("span");
        mark.setAttribute(ENHANCED_FLAG, "");
        mark.hidden = true;
        el.appendChild(mark);
      }
    };

    void apply();

    /* 방어 — React 가 이 컨테이너의 innerHTML 을 다시 세팅하면 위 후처리가 전부 사라진다.
       sentinel 이 없어진 걸 신호로 재적용한다.
       island 의 host.replaceWith 는 sentinel 을 안 건드리므로 우리 변경엔 반응하지 않는다(루프 없음). */
    const mo = new MutationObserver(() => {
      if (cancelled) return;
      if (!el.querySelector(`:scope > [${ENHANCED_FLAG}]`)) void apply();
    });
    mo.observe(el, { childList: true });

    return () => {
      cancelled = true;
      mo.disconnect();
      extrasCleanup?.();
      detachFallback?.();
    };
  }, [ref, enabled, html]);
}
