/**
 * 깨진 이미지 폴백 — 경로 상수와 DOM 헬퍼의 단일 출처.
 *
 * 전에는 "/images/placeholder.svg" 문자열과 swap 로직이 본문 이미지·커버 필드·이미지
 * 패널·뷰어·썸네일에 제각각 복붙돼 있어, 경로 하나 바꾸려면 여섯 군데를 고쳐야 했다.
 * React state 계열은 @/hooks/useImageFallback, ref/observer 로 img 를 직접 만지는
 * 곳은 여기 DOM 헬퍼를 쓴다.
 */

/** 깨진 이미지의 공용 대체 이미지 */
export const IMAGE_FALLBACK_SRC = "/images/placeholder.svg";

/** img 엘리먼트를 대체 이미지로 바꾼다 — srcset 이 남아 있으면 브라우저가
 *  그쪽을 우선해 바꾼 src 가 무시되므로 함께 지운다. 이미 바뀐 것은 건드리지
 *  않아 onerror 재발화로 인한 무한 루프를 막는다. */
export function swapToImageFallback(img: HTMLImageElement): void {
  if (img.src.endsWith(IMAGE_FALLBACK_SRC)) return;
  img.src = IMAGE_FALLBACK_SRC;
  img.removeAttribute("srcset");
}

/**
 * 컨테이너 안 모든 <img> 에 깨짐 폴백을 부착하고, MutationObserver 로 나중에 추가되는
 * img 도 똑같이 처리한다(dangerouslySetInnerHTML 로 만든 DOM 용). cleanup 을 반환한다.
 * - 이미 실패 상태(complete + naturalWidth 0)면 즉시 swap
 * - 표식(data-fallbackBound)으로 리스너 중복 부착을 막는다
 */
export function attachImageFallback(root: HTMLElement): () => void {
  const handle = (img: HTMLImageElement) => {
    if (img.dataset.fallbackBound === "1") return;
    img.dataset.fallbackBound = "1";
    img.addEventListener("error", () => swapToImageFallback(img));
    if (img.complete && img.naturalWidth === 0) swapToImageFallback(img);
  };

  root.querySelectorAll("img").forEach((el) => handle(el as HTMLImageElement));

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
