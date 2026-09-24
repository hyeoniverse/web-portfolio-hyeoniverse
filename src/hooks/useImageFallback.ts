import { useState } from "react";
import { useDepsChanged } from "./useDepsChanged";
import { IMAGE_FALLBACK_SRC } from "@/lib/imageFallback";

/**
 * 단일 이미지의 깨짐 폴백 — markBroken 을 부르면 src 가 공용 placeholder 로 바뀐다.
 * src 가 바뀌면 자동으로 리셋되어 새 주소를 다시 시도한다.
 *
 * onError 에서 곧바로 markBroken 해도 되고(단순한 곳), MediaThumb 처럼 최적화
 * 재시도 같은 자체 단계가 있는 곳은 최종 실패에서만 부른다.
 */
export function useImageFallback(src: string): {
  /** 그릴 주소 — broken 이면 placeholder */
  src: string;
  broken: boolean;
  markBroken: () => void;
} {
  const [errored, setErrored] = useState(false);
  const srcChanged = useDepsChanged([src]);
  if (srcChanged && errored) setErrored(false);
  const broken = errored && !srcChanged && !!src;
  return {
    src: broken ? IMAGE_FALLBACK_SRC : src,
    broken,
    markBroken: () => setErrored(true),
  };
}

/**
 * 여러 이미지를 한 컴포넌트가 그리는 곳(ImageViewer)용 — 깨진 주소를 Set 으로
 * 기억한다. 빈 주소도 placeholder 로 떨어진다(뷰어는 빈 칸을 그릴 수 없다).
 */
export function useImageFallbackSet(): {
  resolveSrc: (src: string) => string;
  markBroken: (src: string) => void;
  isBroken: (src: string) => boolean;
} {
  const [brokenSrcs, setBrokenSrcs] = useState<Set<string>>(new Set());
  return {
    resolveSrc: (src) => (src && !brokenSrcs.has(src) ? src : IMAGE_FALLBACK_SRC),
    markBroken: (src) => {
      if (!src) return;
      setBrokenSrcs((prev) => (prev.has(src) ? prev : new Set(prev).add(src)));
    },
    isBroken: (src) => brokenSrcs.has(src),
  };
}
