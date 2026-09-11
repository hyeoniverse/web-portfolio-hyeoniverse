"use client";

import css from "./SectionJumpNav.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import type { SettingsSection } from "../_hooks/useSettingsSections";

/**
 * 태블릿·모바일에서 패널 안의 섹션들을 오른쪽 눈금(ruler)으로 보여 준다. 누르면 그 섹션으로 옮긴다.
 * 탭으로 콘텐츠를 숨기지 않고 "이동만" 시킨다. 섹션 목록과 이동은 useSettingsSections 가 맡고,
 * 데스크톱에서는 같은 결과를 사이드바의 SectionOutline 이 보여 준다.
 * 섹션이 2개 미만이면 렌더하지 않는다(점프할 게 없으니).
 */
export default function SectionJumpNav({
  sections,
  activeIdx,
  onJump,
  pinned = false,
}: {
  sections: SettingsSection[];
  activeIdx: number;
  onJump: (idx: number) => void;
  /** 상단 탭바가 고정됐는지 — 고정 시 frost 배경을 켠다 (탭바 frost 와 이어짐). */
  pinned?: boolean;
}) {
  const { language } = useLanguage();
  if (sections.length < 2) return null;

  return (
    /* 래퍼가 sticky + frost 를 맡고, 안쪽 nav 가 가로 스크롤(overflow) — 탭바와 같은 구조
       (overflow 가 ::before frost 를 자르지 않게). */
    <div className={`${css.jumpWrap} ${pinned ? css.jumpPinned : ""}`}>
      <div className={css.jumpNav} role="navigation" aria-label={language === "ko" ? "섹션 바로가기" : "Jump to section"}>
        {sections.map((s, i) => (
          <Pressable
            key={`${s.label}-${i}`}
            className={`${css.item} ${i === activeIdx ? css.itemActive : ""}`}
            onClick={() => onJump(i)}
            title={s.label}
          >
            <span className={css.label}>{s.label}</span>
            <span className={css.dot} aria-hidden />
          </Pressable>
        ))}
      </div>
    </div>
  );
}
