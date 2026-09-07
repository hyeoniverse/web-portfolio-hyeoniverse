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
    return (
      <video
        src={firstFrameSrc(src)}
        className={className}
        style={fill
          ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }
          : { width, height, ...style }
        }
        muted
        playsInline
        preload="metadata"
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
      loading={loading}
      className={className}
      unoptimized={skipOptimize}
      style={style}
      onError={handleError}
    />
  );
}
