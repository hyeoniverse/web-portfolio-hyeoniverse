import { useEffect, type RefObject } from "react";
import {
  highlightCodeBlocks,
  attachCodeWrapToggle,
  applyColorSwatches,
  highlightInlineCode,
} from "@/components/posts/highlightCodeBlocks";
import { renderMathNodes } from "@/components/posts/renderMathNodes";
import { useLanguage } from "@/providers/LanguageProvider";

const PLACEHOLDER_SRC = "/images/placeholder.svg";

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
 * richtext HTML 컨테이너에 코드 하이라이트 + 줄바꿈 토글 + 수식 렌더링 + 이미지 fallback 적용
 */
export function useRichtextEnhance(
  ref: RefObject<HTMLElement | null>,
  trigger: unknown,
) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!ref.current) return;
    const root = ref.current;

    highlightCodeBlocks(root);
    attachCodeWrapToggle(root, {
      wrap: t("common.codeWrap"),
      scroll: t("common.codeScroll"),
      wrapTitle: t("common.codeWrapTitle"),
      scrollTitle: t("common.codeScrollTitle"),
      copy: t("common.codeCopy"),
      copied: t("common.codeCopied"),
    });
    renderMathNodes(root);
    applyColorSwatches(root);
    highlightInlineCode(root);
    const detachFallback = attachImageFallback(root);
    return () => { detachFallback(); };
  }, [ref, t, trigger]);
}
