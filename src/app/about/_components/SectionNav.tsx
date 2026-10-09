"use client";

import styles from "./AboutNav.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import { ABOUT_CHAPTERS, chapterIndexOf } from "@/data/about/chapters";

interface NavSection {
  id: number;
  key: string;
  label: string;
}

interface SectionNavProps {
  navRef: React.RefObject<HTMLElement | null>;
  navSections: NavSection[];
  /** 지금 화면의 패널 */
  activeSection: number;
  /** 마우스를 올린 눈금이 있으면 그것, 없으면 지금 패널 */
  highlightedSection: number;
  onHover: (v: number | null) => void;
  onNavigate: (navIndex: number) => void;
}

/* 레일 구간 — 챕터(전시실)마다 한 구간, 앞뒤로 입구(Hello)와 출구(Credits) */
function buildGroups(sections: NavSection[]) {
  const groups: Array<{ title: string; room?: number; items: NavSection[] }> = [];
  for (const sec of sections) {
    const chapter = chapterIndexOf(sec.key);
    const title = chapter === undefined ? (sec.key === "hero" ? "Intro" : "Exit") : ABOUT_CHAPTERS[chapter].title;
    const last = groups[groups.length - 1];
    if (last && last.title === title) last.items.push(sec);
    else groups.push({ title, room: chapter === undefined ? undefined : chapter + 1, items: [sec] });
  }
  return groups;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * About 하단 내비 — 진행 막대. 왼쪽에 지금 위치, 가운데에 챕터 구간과 패널 눈금이 놓인 레일,
 * 오른쪽에 이전·다음. 지나온 눈금까지 레일이 강조색으로 차오른다.
 */
export default function SectionNav({
  navRef,
  navSections,
  activeSection,
  highlightedSection,
  onHover,
  onNavigate,
}: SectionNavProps) {
  const { language } = useLanguage();
  const groups = buildGroups(navSections);
  const shown = navSections[highlightedSection] ?? navSections[0];
  const shownGroup = groups.find((g) => g.items.some((it) => it.id === shown.id));
  const prev = navSections[activeSection - 1];
  const next = navSections[activeSection + 1];

  return (
    <nav
      className={styles.floorNav}
      data-type="sans"
      ref={navRef}
      onMouseLeave={() => onHover(null)}
      aria-label={language === "ko" ? "섹션 이동" : "Section navigation"}
    >
      <div className={styles.floorHere} aria-live="polite">
        <span className={styles.floorRoom}>
          {shownGroup?.title}
        </span>
        <span className={styles.floorCurrent}>
          <b>{shown.label}</b>
          <small>{pad(shown.id + 1)} / {pad(navSections.length)}</small>
        </span>
      </div>

      <div className={styles.floorRail}>
        {groups.map((group) => (
          <div
            key={group.title}
            className={styles.floorGroup}
            style={{ flexGrow: group.items.length }}
            data-current={group === shownGroup || undefined}
          >
            <span className={styles.floorGroupTitle}>{group.title}</span>
            <div className={styles.floorTicks}>
              {group.items.map((sec) => (
                <Pressable
                  key={sec.id}
                  data-clickable="true"
                  className={styles.floorTick}
                  data-state={sec.id === activeSection ? "active" : sec.id < activeSection ? "past" : undefined}
                  data-hovered={sec.id === highlightedSection || undefined}
                  onClick={() => onNavigate(sec.id)}
                  onMouseEnter={() => onHover(sec.id)}
                  onFocus={() => onHover(sec.id)}
                  aria-label={`Go to ${sec.label}`}
                  aria-current={sec.id === activeSection ? "step" : undefined}
                >
                  <span className={styles.floorTickLabel}>{sec.label}</span>
                </Pressable>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.floorSteps}>
        <Pressable
          data-clickable="true"
          className={`${styles.floorStep} ${styles.floorStepPrev}`}
          onClick={() => prev && onNavigate(prev.id)}
          disabled={!prev}
          aria-label={language === "ko" ? "이전 섹션" : "Previous section"}
        >
          <span className={styles.floorStepArrow}>←</span>
          <span className={styles.floorStepName}>{prev?.label ?? "—"}</span>
        </Pressable>
        <Pressable
          data-clickable="true"
          className={`${styles.floorStep} ${styles.floorStepNext}`}
          onClick={() => next && onNavigate(next.id)}
          disabled={!next}
          aria-label={language === "ko" ? "다음 섹션" : "Next section"}
        >
          <span className={styles.floorStepHint}>Next</span>
          <span className={styles.floorStepName}>{next?.label ?? "—"}</span>
          <span className={styles.floorStepArrow}>→</span>
        </Pressable>
      </div>
    </nav>
  );
}
