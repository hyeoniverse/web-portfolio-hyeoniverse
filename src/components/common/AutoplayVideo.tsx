"use client";

import { useEffect, useRef, type VideoHTMLAttributes } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * 저절로 반복 재생하는 소리 없는 영상(배경 · 데모). 기기의 "동작 줄이기"가 켜져 있으면 첫 장면에 멈춰 둔다
 * (docs/design-system.md 3.9-4). 보는 중에 설정을 바꾸면 따라 멈추거나 다시 돈다.
 */
export default function AutoplayVideo(props: Omit<VideoHTMLAttributes<HTMLVideoElement>, "autoPlay" | "muted" | "loop" | "playsInline">) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (reduce) video.pause();
    else void video.play().catch(() => {});
  }, [reduce]);

  return <video ref={ref} autoPlay={!reduce} muted loop playsInline {...props} />;
}
