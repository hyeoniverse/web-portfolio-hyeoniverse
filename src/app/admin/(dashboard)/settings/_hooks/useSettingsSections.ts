"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { useLenis } from "@/providers/LenisProvider";

export interface SettingsSection {
  el: HTMLElement;
  label: string;
}

/* 섹션 시작을 둘 자리(스크롤 offset). 머리가 붙는 선에 머리가 오게 한다.
   - 머리는 섹션 요소 자신이거나(SectionHeader 의 h2), 섹션의 첫 sticky 자식이다(About 패널의 StickyGlassBar).
   - 머리가 섹션 시작보다 아래에 있으면(About 패널은 flex gap 만큼 떨어져 있다) 그만큼 덜 내린다.
     sticky 요소의 위치는 붙거나 밀려난 자리로 잡히므로, 앞 형제(sticky 아님)의 끝 + gap 으로 잰다.
   - 머리가 없으면 사이트 nav 바로 아래. */
function landingOffsetOf(el: HTMLElement): number {
  const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) || 64;
  if (getComputedStyle(el).position === "sticky") return -(parseFloat(getComputedStyle(el).top) || header);
  const sticky = [...el.children].find((c): c is HTMLElement => c instanceof HTMLElement && getComputedStyle(c).position === "sticky");
  if (!sticky) return -header;
  const line = parseFloat(getComputedStyle(sticky).top) || header;
  const prev = sticky.previousElementSibling;
  const gap = parseFloat(getComputedStyle(el).rowGap) || 0;
  const before = prev ? prev.getBoundingClientRect().bottom - el.getBoundingClientRect().top + gap : 0;
  return -(line - before);
}

/**
 * 설정 패널 안의 섹션([data-settings-section])을 훑고, 지금 보고 있는 섹션을 따라간다.
 * 태블릿·모바일의 오른쪽 눈금(SectionJumpNav)과 데스크톱 사이드바의 패널 목록(SectionOutline)이
 * 이 결과 하나를 같이 쓴다.
 *
 * @param scanKey 이 값이 바뀌면 섹션을 다시 훑는다(activeTab:contentSubTab)
 */
export function useSettingsSections(panelRef: RefObject<HTMLElement | null>, scanKey: string) {
  const { scrollTo } = useLenis();
  const [sections, setSections] = useState<SettingsSection[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  /* 콘텐츠가 그려진 뒤 훑는다 — rAF 로 한 프레임 미룬다. */
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
            label: (el.dataset.sectionLabel ?? el.querySelector("h2")?.textContent ?? el.textContent ?? "").trim(),
          }))
          .filter((s) => s.label),
      );
      setActiveIdx(0);
    });
    return () => cancelAnimationFrame(raf);
  }, [panelRef, scanKey]);

  /* 지금 보는 섹션 — 상단 sticky 바 아래 처음 걸리는 섹션을 활성으로. */
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

  /* 섹션 시작을 그 머리가 붙는 선에 맞춰 옮긴다. 그러면 머리가 제자리에 붙고 바로 아래부터 내용이다.
     예전에는 눈금 자체의 높이를 빼서 계산해, 태블릿에서는 섹션이 화면 40% 쯤 아래에 멈췄다. */
  const jumpTo = useCallback((idx: number) => {
    const s = sections[idx];
    if (!s) return;
    setActiveIdx(idx);
    scrollTo(s.el, { offset: landingOffsetOf(s.el) });
  }, [sections, scrollTo]);

  return { sections, activeIdx, jumpTo };
}
