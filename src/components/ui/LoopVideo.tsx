"use client";

import { forwardRef, useCallback, useEffect, useRef, type VideoHTMLAttributes } from "react";
import { useMotionStore } from "@/stores/motionStore";

/**
 * 저절로 반복 재생되는 영상(배경 · 장식) — 움직임 멈춤(3.9-4)을 따른다.
 * 멈추면 `autoplay` 를 꺼 둔 채 pause() 하고(아직 안 불려온 영상이 뒤늦게 시작하지 않게),
 * 다시 움직이면 autoplay 를 돌려 놓고 play() 한다. 그 밖은 <video> 그대로.
 */
const LoopVideo = forwardRef<HTMLVideoElement, VideoHTMLAttributes<HTMLVideoElement>>(function LoopVideo(
  { autoPlay, ...props },
  forwardedRef,
) {
  const isPaused = useMotionStore((s) => s.isPaused);
  const elRef = useRef<HTMLVideoElement | null>(null);

  const setRef = useCallback(
    (el: HTMLVideoElement | null) => {
      elRef.current = el;
      if (typeof forwardedRef === "function") forwardedRef(el);
      else if (forwardedRef) forwardedRef.current = el;
    },
    [forwardedRef],
  );

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (isPaused) {
      el.autoplay = false;
      el.pause();
    } else if (autoPlay) {
      el.autoplay = true;
      el.play().catch(() => {});
    }
  }, [isPaused, autoPlay]);

  // 멈춘 상태로 마운트되면 autoplay 속성을 처음부터 주지 않는다 — 효과가 돌기 전에 재생이 시작되지 않게
  return <video ref={setRef} autoPlay={autoPlay && !isPaused} {...props} />;
});

export default LoopVideo;
