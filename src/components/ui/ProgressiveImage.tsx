"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import { ImageOff } from "@/components/icons";
import { getLqipUrl } from "@/utils/image";
import { isVideoUrl } from "@/lib/isVideoUrl";
import styles from "./ProgressiveImage.module.css";
import { firstFrameSrc, hoverVideoHandlers } from "./hoverVideo";
import { useNearViewport } from "@/hooks/useNearViewport";

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
  // 원본을 곧바로 받는가 — next/image 는 priority 나 loading="eager" 가 아니면 lazy 로 받는다
  const eager = !!priority || loading === "eager";
  const lqipUrl = useMemo(() => getLqipUrl(src), [src]);
  /* 동영상 표지는 화면 근처에 올 때까지 받지 않는다 — MediaThumb 과 같은 이유. */
  const [observeVideo, videoNear] = useNearViewport(!priority);

  // src 변경 시 에러/로딩 상태 리셋
  const srcChanged = useDepsChanged([src]);
  if (srcChanged) {
    setLoaded(isVideoUrl(src));
    setErrored(false);
  }

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
      {/* 플레이스홀더: LQIP 또는 shimmer — video 모드에서는 skip (placeholder 가 video 가림).
          LQIP 도 원본과 같은 때 받는다. loading 이 없으면 서버가 그린 HTML 에서 React 가 이 img 를 <head> 의 preload 로 올려,
          화면 밖 카드의 미리보기가 첫 화면 이미지와 함께 받힌다(#925) */}
      {!isVideo && (lqipUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={lqipUrl}
          alt=""
          aria-hidden
          loading={eager ? undefined : "lazy"}
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
          ref={observeVideo}
          src={videoNear ? firstFrameSrc(src) : undefined}
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
          /* Next 16 의 priority 는 <head> 에 preload 만 넣고 fetchpriority 는 붙이지 않는다(15 까지는 high 였다).
             그러면 LCP 이미지가 Low 로 받혀 스타일시트·스크립트와 대역폭을 나눈다(#944) */
          fetchPriority={priority ? "high" : undefined}
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
