import { useEffect, type RefObject } from "react";
import {
  highlightCodeBlocks,
  attachCodeWrapToggle,
} from "@/components/posts/highlightCodeBlocks";
import { renderMathNodes } from "@/components/posts/renderMathNodes";
import { useLanguage } from "@/providers/LanguageProvider";

/**
 * richtext HTML 컨테이너에 코드 하이라이트 + 줄바꿈 토글 + 수식 렌더링 적용
 */
export function useRichtextEnhance(
  ref: RefObject<HTMLElement | null>,
  trigger: unknown,
) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!ref.current) return;

    highlightCodeBlocks(ref.current);
    attachCodeWrapToggle(ref.current, {
      wrap: t("common.codeWrap"),
      scroll: t("common.codeScroll"),
      wrapTitle: t("common.codeWrapTitle"),
      scrollTitle: t("common.codeScrollTitle"),
    });
    renderMathNodes(ref.current);
  }, [ref, t, trigger]);
}
