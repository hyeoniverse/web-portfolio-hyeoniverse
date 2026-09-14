"use client";

import { useState } from "react";
import Image from "next/image";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { getFallbackCoverGradient } from "@/lib/coverFallback";
import { firstFrameSrc, hoverVideoHandlers } from "./hoverVideo";

export interface MediaThumbProps {
  src: string;
  alt?: string;
  className?: string;
  /** fill mode — 부모는 position: relative + 크기 지정 필수 */
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
  /**
   * next/image 의 최적화를 처음부터 건너뛴다.
   *
   * 평소에는 켤 필요가 없다. 허용 목록에 없는 주소라 최적화가 거부되면 알아서 원본으로
   * 되돌아간다(아래 handleError). admin 미리보기처럼 되돌아가는 한 번의 실패조차
   * 보이지 않게 하고 싶을 때만 쓴다.
   */
  unoptimized?: boolean;
  style?: React.CSSProperties;
  onError?: () => void;
  /** src 가 비어있을 때 — 이 seed 로 결정적 gradient 자동 생성 (slug/id 권장) */
  fallbackSeed?: string;
}

/** Video URL 이면 <video>, 아니면 next/image. src 없고 fallbackSeed 있으면 gradient. */
export default function MediaThumb({
  src, alt = "", className, fill, width, height, sizes, priority, loading, unoptimized, style, onError, fallbackSeed,
}: MediaThumbProps) {
  /* 최적화가 거부된 주소를 기억한다. 표지는 사용자가 고르는 값이라 허용 목록 밖 주소가
     들어올 수 있는데, 그때만 원본으로 되돌린다. 주소가 바뀌면 다시 최적화부터 시도한다. */
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const skipOptimize = unoptimized || failedSrc === src;
  const handleError = () => {
    if (!skipOptimize) { setFailedSrc(src); return; }
    onError?.();
  };
  // src 비어있고 fallbackSeed 있으면 gradient 배경
  if (!src && fallbackSeed) {
    return (
      <div
        className={className}
        style={fill
          ? { position: "absolute", inset: 0, background: getFallbackCoverGradient(fallbackSeed), ...style }
          : { width, height, background: getFallbackCoverGradient(fallbackSeed), ...style }
        }
      />
    );
  }
  if (isVideoUrl(src)) {
    /* 표지 동영상은 목록·미리보기용 썸네일이다. preload="none" 으로 놀고 있을 땐 한 바이트도
       받지 않는다 — Pexels 처럼 faststart 가 아닌 mp4 는 preload="metadata" + #t=0.1 로도
       첫 프레임 하나 그리려고 파일을 통째로 받아서(측정: 표지 하나 15 MB 를 목록 한 번에 세 번,
       43 MB) 목록 대역폭을 삼킨다. 정지 프레임 대신 결정적 gradient 를 깔고, 마우스를 올렸을
       때(hoverVideoHandlers 의 play)에만 실제로 받아 재생한다. */
    const posterBg = getFallbackCoverGradient(fallbackSeed || src);
    return (
      <video
        src={firstFrameSrc(src)}
        className={className}
        style={fill
          ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: posterBg, ...style }
          : { width, height, background: posterBg, ...style }
        }
        muted
        playsInline
        preload="none"
        loop
        onError={onError}
        {...hoverVideoHandlers}
      />
    );
  }
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        /* Next 16 의 priority 는 preload 만 넣고 fetchpriority 는 붙이지 않는다 — 첫 화면 이미지라 높게 받는다(#944) */
        fetchPriority={priority ? "high" : undefined}
        loading={loading}
        className={className}
        unoptimized={skipOptimize}
        style={style}
        onError={handleError}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 280}
      height={height ?? 140}
      priority={priority}
      fetchPriority={priority ? "high" : undefined}
      loading={loading}
      className={className}
      unoptimized={skipOptimize}
      style={style}
      onError={handleError}
    />
  );
}
