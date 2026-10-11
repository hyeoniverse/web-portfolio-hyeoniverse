"use client";

/* 한 화면에 맞추기 — 안의 내용이 정해진 자리보다 크면 통째로 줄인다(zoom). 프레지 프레임은 안에서 스크롤하지 않으므로
   데모처럼 높이가 정해진 내용이 작은 화면에서 넘칠 때 잘리거나 스크롤되는 대신 조금 작아진다.
   zoom 은 transform 과 달리 줄어든 크기로 배치되어, 바깥 상자가 가운데 맞춤을 그대로 할 수 있다 */
import { useLayoutEffect, useRef, type ReactNode } from "react";

/** 이보다 작게는 줄이지 않는다 — 글자가 너무 작아진다 */
const MIN_ZOOM = 0.78;

export default function FitZoom({ className, children }: { className?: string; children: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;
    let z = 1;
    const fit = () => {
      /* 지금 배율로 그려진 높이를 배율로 나누면 원래 높이. 둘 다 화면에 그려진 크기라 카메라 배율은 약분된다 */
      const natural = inner.getBoundingClientRect().height / z;
      const avail = box.getBoundingClientRect().height;
      if (!natural || !avail) return;
      const next = Math.max(MIN_ZOOM, Math.min(1, Math.floor((avail / natural) * 100) / 100));
      if (next !== z) {
        z = next;
        inner.style.zoom = String(z);
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={boxRef} className={className}>
      <div ref={innerRef}>{children}</div>
    </div>
  );
}
