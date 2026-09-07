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
  /** next/image 의 unoptimized — admin 미리보기처럼 외부 도메인이라 optimizer 우회 필요할 때 */
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
        unoptimized={unoptimized}
        style={style}
        onError={onError}
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
      unoptimized={unoptimized}
      style={style}
      onError={onError}
    />
  );
}
