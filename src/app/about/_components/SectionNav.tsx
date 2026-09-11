"use client";

import { Fragment } from "react";
import { motion, type MotionValue } from "framer-motion";
import styles from "./AboutNav.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";

interface SectionNavProps {
  navRef: React.RefObject<HTMLElement | null>;
  navItemRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  navSections: { id: number; label: string }[];
  highlightedSection: number;
  springX: MotionValue<number>;
  springWidth: MotionValue<number>;
  onHover: (v: number | null) => void;
  onNavigate: (navIndex: number) => void;
}

// 그룹 boundary — 이 index 의 항목 *뒤* 에 divider 표시 (이후 항목은 다른 그룹)
// 0: Hello | 1-4: About (Overview/Arch/Flow/Features) | 5-12: Build (System/Process/Tech/Backend/ERD/Code/Decisions/Security) | 13: Credits
const GROUP_BOUNDARIES_AFTER = new Set([0, 4, 12]);

export default function SectionNav({
  navRef,
  navItemRefs,
  navSections,
  highlightedSection,
  springX,
  springWidth,
  onHover,
  onNavigate,
}: SectionNavProps) {
  const { language } = useLanguage();
  return (
    <nav
      className={styles.sectionNav}
      ref={navRef}
      onMouseLeave={() => onHover(null)}
      aria-label={language === "ko" ? "섹션 이동" : "Section navigation"}
    >
      <motion.span
        className={styles.navIndicator}
        style={{ x: springX, width: springWidth }}
      />
      {navSections.map((sec, i) => {
        const isActive = highlightedSection === sec.id;
        const isPast = sec.id < highlightedSection;
        const showDividerAfter = GROUP_BOUNDARIES_AFTER.has(i) && i < navSections.length - 1;
        return (
          <Fragment key={sec.id}>
            <Pressable
              ref={(el) => {
                navItemRefs.current[i] = el;
              }}
              data-clickable="true"
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ""} ${isPast ? styles.navItemPast : ""}`}
              onClick={() => onNavigate(sec.id)}
              onMouseEnter={() => onHover(sec.id)}
              aria-label={`Go to ${sec.label}`}
            >
              <span className={styles.navDot} />
              <span className={styles.navLabel}>{sec.label}</span>
            </Pressable>
            {showDividerAfter && <span className={styles.navGroupDivider} aria-hidden />}
          </Fragment>
        );
      })}
    </nav>
  );
}
