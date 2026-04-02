"use client";

import { motion, type MotionValue } from "framer-motion";
import styles from "./AboutSection.module.css";

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
  return (
    <nav
      className={styles.sectionNav}
      ref={navRef}
      onMouseLeave={() => onHover(null)}
      aria-label="Section navigation"
    >
      <motion.span
        className={styles.navIndicator}
        style={{ x: springX, width: springWidth }}
      />
      {navSections.map((sec, i) => (
        <button
          key={sec.id}
          ref={(el) => {
            navItemRefs.current[i] = el;
          }}
          data-clickable="true"
          className={`${styles.navItem} ${highlightedSection === sec.id ? styles.navItemActive : ""}`}
          onClick={() => onNavigate(sec.id)}
          onMouseEnter={() => onHover(sec.id)}
          aria-label={`Go to ${sec.label}`}
        >
          <span className={styles.navDot} />
          <span className={styles.navLabel}>{sec.label}</span>
        </button>
      ))}
    </nav>
  );
}
