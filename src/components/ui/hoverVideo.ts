"use client";

import type { SyntheticEvent } from "react";

/**
 * 목록에 놓인 표지 동영상을 다루는 방법.
 *
 * 표지로 동영상을 고를 수 있는데, 목록 화면에서 그것을 자동재생하면 카드마다 파일 전체를
 * 내려받는다. 실제로 글 목록에서 9.7 MB 짜리 동영상 하나가 세 번 받아졌다.
 *
 * 그래서 평소에는 첫 프레임만 보여 주고, 마우스를 올렸을 때만 재생한다.
 * 주소 끝의 `#t=0.1` 은 "0.1초 지점을 보여 달라" 는 뜻이다. 이것을 붙이면 브라우저가
 * 파일 전체가 아니라 그 지점까지만 받아서 한 장면을 그린다.
 */

/** 첫 프레임을 그리게 하는 주소 — 이미 시간 표시가 붙어 있으면 그대로 둔다. */
export function firstFrameSrc(src: string): string {
  return /#t=/.test(src) ? src : `${src}#t=0.1`;
}

/** 마우스를 올리면 재생, 벗어나면 멈추고 첫 프레임으로 되돌린다. */
export const hoverVideoHandlers = {
  onPointerEnter: (e: SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    v.play().catch(() => {});
  },
  onPointerLeave: (e: SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    v.pause();
    try { v.currentTime = 0.1; } catch { /* 아직 받지 못했으면 넘어간다 */ }
  },
};
