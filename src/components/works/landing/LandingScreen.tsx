"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { isVideoUrl } from "@/lib/isVideoUrl";
import styles from "./WorkLanding.module.css";

/**
 * 랜딩 페이지의 화면 한 장 — 그림이면 그림, 영상이면 소리 없이 되풀이해 재생한다(화면에 보일 때만, 움직임 줄이기면 멈춤).
 * fit="contain" 은 무대 안에 화면을 통째로(캡처 · 녹화), "cover" 는 칸을 꽉 채운다(화면 폭 가로 컷).
 */
export function LandingScreen({ src, alt, fit, sizes, priority, className }: {
  src: string; alt: string; fit: "contain" | "cover"; sizes: string; priority?: boolean; className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const video = isVideoUrl(src);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) void el.play().catch(() => {});
      else el.pause();
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  const fitClass = fit === "contain" ? styles.screenContain : styles.screenCover;
  if (video) {
    return (
      <video
        ref={videoRef}
        className={`${fitClass} ${className ?? ""}`}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={alt}
      />
    );
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`${fitClass} ${className ?? ""}`} />;
}
