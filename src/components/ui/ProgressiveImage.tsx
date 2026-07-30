"use client";

import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import { ImageOff } from "@/components/icons";
import { getLqipUrl } from "@/utils/image";
import { isVideoUrl } from "@/lib/isVideoUrl";
import styles from "./ProgressiveImage.module.css";

interface ProgressiveImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  loading?: "eager" | "lazy";
  className?: string;
  style?: React.CSSProperties;
  onError?: () => void;
}

export default function ProgressiveImage({
  src,
  alt,
  fill,
  sizes,
  width,
  height,
  priority,
  loading,
  className,
  style,
  onError,
}: ProgressiveImageProps) {
  const isVideo = isVideoUrl(src);
  // video 는 fade-in 으로 깜빡이게 하지 않고 즉시 표시 (브라우저가 첫 프레임 디코드되는 대로 자연스럽게 보임)
  const [loaded, setLoaded] = useState(isVideo);
  const [errored, setErrored] = useState(false);
  const lqipUrl = useMemo(() => getLqipUrl(src), [src]);

  // src 변경 시 에러/로딩 상태 리셋
  useEffect(() => {
    setLoaded(isVideoUrl(src));
    setErrored(false);
  }, [src]);

  // 이미지 로드 실패 시 placeholder 렌더 (broken image icon 대신)
  if (errored) {
    return (
      <div className={`${styles.wrapper} ${styles.fallback}`} aria-label={alt} role="img">
        <ImageOff className={styles.fallbackIcon} size={28} strokeWidth={1.5} aria-hidden />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* 플레이스홀더: LQIP 또는 shimmer — video 모드에서는 skip (placeholder 가 video 가림) */}
      {!isVideo && (lqipUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={lqipUrl}
          alt=""
          aria-hidden
          className={`${styles.lqip} ${loaded ? styles.lqipHidden : ""}`}
        />
      ) : (
        <div
          className={`${styles.shimmer} ${loaded ? styles.shimmerHidden : ""}`}
        />
      ))}

      {/* 원본 미디어 */}
      {isVideo ? (
        <video
          src={src}
          className={`${className ?? ""} ${styles.full} ${loaded ? styles.fullLoaded : ""}`}
          style={fill
            ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }
            : { width, height, ...style }
          }
          autoPlay
          muted
          loop
          playsInline
          onLoadedMetadata={() => setLoaded(true)}
          onLoadedData={() => setLoaded(true)}
          onCanPlay={() => setLoaded(true)}
          onError={() => {
            setErrored(true);
            onError?.();
          }}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill={fill}
          sizes={sizes}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          priority={priority}
          loading={loading}
          className={`${className ?? ""} ${styles.full} ${loaded ? styles.fullLoaded : ""}`}
          style={style}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setErrored(true);
            onError?.();
          }}
        />
      )}
    </div>
  );
}
