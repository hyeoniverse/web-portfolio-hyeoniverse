"use client";

import { useEffect, useRef } from "react";
import css from "./SectionOutline.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import type { SettingsSection } from "../_hooks/useSettingsSections";

/**
 * 데스크톱 사이드바에서 지금 하위 탭의 섹션 목록. 누르면 그 섹션으로 옮기고, 지금 보고 있는 섹션을
 * 표시한다. 사이드바는 스크롤해도 붙어 있으므로 페이지 어디서든 쓸 수 있다.
 *
 * About 설정처럼 패널이 많고 길게 이어진 화면에 둔다(#348). 맨 위 패널 칩은 표시·이름·순서를
 * 바꾸는 자리라 누르면 이동하지 않고, 페이지 맨 위에만 있다. 태블릿·모바일에서는 사이드바가
 * 가로 탭 바로 바뀌므로 숨기고, 오른쪽 눈금(SectionJumpNav)이 같은 일을 한다.
 */
export default function SectionOutline({
  sections,
  activeIdx,
  onJump,
}: {
  sections: SettingsSection[];
  activeIdx: number;
  onJump: (idx: number) => void;
}) {
  const { language } = useLanguage();
  const listRef = useRef<HTMLUListElement>(null);

  /* 사이드바가 화면보다 길면 사이드바 안에서 스크롤된다. 지금 섹션이 사이드바의 보이는 범위를
     벗어나면 그 안으로 옮긴다 — 페이지 끝의 패널을 보는데 목록에서는 표시가 안 보이는 일을 막는다. */
  useEffect(() => {
    const item = listRef.current?.children[activeIdx];
    const box = item?.closest("nav");
    if (!(item instanceof HTMLElement) || !box) return;
    const ir = item.getBoundingClientRect();
    const br = box.getBoundingClientRect();
    if (ir.top < br.top) box.scrollTop -= br.top - ir.top + 8;
    else if (ir.bottom > br.bottom) box.scrollTop += ir.bottom - br.bottom + 8;
  }, [activeIdx]);

  if (sections.length < 2) return null;

  return (
    <ul ref={listRef} className={css.outline} aria-label={language === "ko" ? "이 화면의 섹션" : "Sections on this page"}>
      {sections.map((s, i) => (
        <li key={`${s.label}-${i}`}>
          <Pressable
            className={`${css.item} ${i === activeIdx ? css.itemActive : ""}`}
            onClick={() => onJump(i)}
            aria-current={i === activeIdx ? "location" : undefined}
            title={s.label}
          >
            {s.label}
          </Pressable>
        </li>
      ))}
    </ul>
  );
}
