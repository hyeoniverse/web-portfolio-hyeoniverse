"use client";

import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import { ImageOff } from "@/components/icons";
import { getLqipUrl } from "@/utils/image";
import { isVideoUrl } from "@/lib/isVideoUrl";
import styles from "./ProgressiveImage.module.css";
import { firstFrameSrc, hoverVideoHandlers } from "./hoverVideo";

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
  /* priority 이미지는 화면 최상단에 있어 LCP 후보다. 다른 이미지처럼 opacity 0 에서 시작하면
     onLoad 핸들러가 붙는 하이드레이션 시점까지 안 보여서, 브라우저가 이미 받아 둔 이미지를
     몇 초씩 감추게 된다. 그래서 처음부터 불투명하게 두고 브라우저가 그리는 대로 보여준다.
     (아래 LQIP 미리보기는 loaded 로 그대로 제어되므로 흐린 미리보기는 유지된다.) */
  const visible = loaded || !!priority;
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
          src={firstFrameSrc(src)}
          className={`${className ?? ""} ${styles.full} ${loaded ? styles.fullLoaded : ""}`}
          style={fill
            ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }
            : { width, height, ...style }
          }
          muted
          loop
          playsInline
          preload="metadata"
          {...hoverVideoHandlers}
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
          className={`${className ?? ""} ${styles.full} ${visible ? styles.fullLoaded : ""}`}
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
