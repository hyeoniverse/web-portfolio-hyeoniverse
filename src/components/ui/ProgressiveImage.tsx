"use client";

import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import { ImageOff } from "lucide-react";
import { getLqipUrl } from "@/utils/image";
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
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const lqipUrl = useMemo(() => getLqipUrl(src), [src]);

  // src 변경 시 에러/로딩 상태 리셋
  useEffect(() => {
    setLoaded(false);
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
      {/* 플레이스홀더: LQIP 또는 shimmer */}
      {lqipUrl ? (
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
      )}

      {/* 원본 이미지 */}
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
    </div>
  );
}
