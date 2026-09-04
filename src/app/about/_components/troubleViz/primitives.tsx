"use client";

import React from "react";
import s from "../TroubleViz.module.css";

/* 트러블슈팅 시각화가 공유하는 어휘 — 상태 칩 · 화살표 · 캡션 붙은 도형.
   각 시각화는 카드로 감싸지 않고 figure 만 만든다. 본문 중간의 [[viz]] 마커가
   position(증상/원인/해결/결론)에 맞는 도형 하나씩을 꺼내 배치한다. */


type L = (ko: string, en: string) => string;
export type VizPosition = "definition" | "cause" | "solution" | "insight";
type VizParts = Partial<Record<VizPosition, React.ReactNode>>;

/* ── 공용 프리미티브 ── */
const Chip = ({ k, children }: { k: "fresh" | "stale" | "bad" | "sync"; children: React.ReactNode }) => (
  <span className={`${s.chip} ${s[k]}`}>
    <span className={s.dot} />
    {children}
  </span>
);
const Arr = ({ label, x }: { label?: string; x?: boolean }) => (
  <div className={s.arrow}>
    <span className={x ? s.xmark : s.ln}>{x ? "↮" : "→"}</span>
    {label && <span className={s.lb}>{label}</span>}
  </div>
);
const Fig = ({ children, cap }: { children: React.ReactNode; cap?: string }) => (
  <figure className={s.fig}>
    {children}
    {cap && <figcaption className={s.cap}>{cap}</figcaption>}
  </figure>
);

export { Chip, Arr, Fig };
export type { L, VizParts };
