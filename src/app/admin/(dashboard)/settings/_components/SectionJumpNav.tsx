"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useLenis } from "@/providers/LenisProvider";
import css from "./SectionJumpNav.module.css";

interface Section {
  el: HTMLElement;
  label: string;
}

/**
 * 패널 안의 섹션들(SectionHeader = [data-settings-section])을 훑어 가로 점프 링크로 보여준다.
 * 탭으로 콘텐츠를 숨기지 않고 "이동만" 시킨다 — 클릭하면 해당 섹션으로 스크롤.
 * 섹션이 2개 미만이면 렌더하지 않는다(점프할 게 없으니).
 */
export default function SectionJumpNav({
  panelRef,
  scanKey,
  pinned = false,
}: {
  panelRef: RefObject<HTMLElement | null>;
  /** 이 값이 바뀌면 섹션을 다시 스캔한다 (activeTab:contentSubTab). */
  scanKey: string;
  /** 상단 탭바가 고정됐는지 — 고정 시 frost 배경을 켠다 (탭바 frost 와 이어짐). */
  pinned?: boolean;
}) {
  const { scrollTo } = useLenis();
  const [sections, setSections] = useState<Section[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);

  /* 콘텐츠가 그려진 뒤 스캔 — rAF 로 한 프레임 미룬다. */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const raf = requestAnimationFrame(() => {
      const els = [...panel.querySelectorAll<HTMLElement>("[data-settings-section]")];
      setSections(
        els
          .map((el) => ({
            el,
            /* 라벨 우선순위: 명시 data-section-label(About 패널) → h2 텍스트(SectionHeader) */
            label: (el.dataset.sectionLabel ?? el.querySelector("h2")?.textContent ?? "").trim(),
          }))
          .filter((s) => s.label),
      );
      setActiveIdx(0);
    });
    return () => cancelAnimationFrame(raf);
  }, [panelRef, scanKey]);

  /* 스크롤 스파이 — 상단 sticky 바 아래 처음 걸리는 섹션을 활성 표시. */
  useEffect(() => {
    if (sections.length < 2) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!hit) return;
        const idx = sections.findIndex((s) => s.el === hit.target);
        if (idx >= 0) setActiveIdx(idx);
      },
      /* 상단 여백(-120)은 sticky 바 높이만큼 무시 — 그 아래로 들어온 섹션부터 활성 */
      { rootMargin: "-120px 0px -55% 0px", threshold: 0 },
    );
    sections.forEach((s) => io.observe(s.el));
    return () => io.disconnect();
  }, [sections]);

  if (sections.length < 2) return null;

  const jump = (s: Section, idx: number) => {
    setActiveIdx(idx);
    /* 스크롤 후 점프바가 "고정될" 위치(=sticky top + 자기 높이) 아래로 섹션이 멈추게.
       현재(비고정) 위치로 계산하면 스크롤 뒤 실제 고정 지점보다 아래에 착지한다. */
    const bar = navRef.current;
    const stickyTop = bar ? parseFloat(getComputedStyle(bar).top) || 0 : 0;
    const offset = bar ? -(stickyTop + bar.offsetHeight + 8) : -120;
    scrollTo(s.el, { offset });
  };

  return (
    /* 래퍼가 sticky + frost 를 맡고, 안쪽 nav 가 가로 스크롤(overflow) — 탭바와 같은 구조
       (overflow 가 ::before frost 를 자르지 않게). */
    <div className={`${css.jumpWrap} ${pinned ? css.jumpPinned : ""}`}>
      <div ref={navRef} className={css.jumpNav} role="navigation" aria-label="섹션 바로가기">
        {sections.map((s, i) => (
          <button
            key={`${s.label}-${i}`}
            type="button"
            className={`${css.item} ${i === activeIdx ? css.itemActive : ""}`}
            onClick={() => jump(s, i)}
            title={s.label}
          >
            <span className={css.label}>{s.label}</span>
            <span className={css.dot} aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
