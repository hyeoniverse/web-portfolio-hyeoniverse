"use client";

import { motion } from "framer-motion";
import type { TimelineIndexGroup } from "../_hooks/useTimeline";
import styles from "./TimelineIndex.module.css";
import { useLanguage } from "@/providers/LanguageProvider";

/* 타임라인 왼쪽 연·월 인덱스 — sticky, 연도별 그룹. 활성 월(scroll-spy)은 accent dot(layoutId)이 슬라이드.
   클릭하면 onJump(monthKey) — 미로드 월이면 useTimeline 이 순차 로드 뒤 스크롤한다. 640px 이하는 CSS 로 숨김. */
export default function TimelineIndex({
  groups,
  activeMonthKey,
  onJump,
}: {
  groups: TimelineIndexGroup[];
  activeMonthKey: string | null;
  onJump: (key: string) => void;
}) {
  const { t } = useLanguage();
  if (groups.length === 0) return null;
  return (
    <motion.nav
      className={styles.timelineIndex}
      aria-label={t("postsPage.jumpByMonth")}
      data-lenis-prevent
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } } }}
    >
      {groups.map((group) => {
        const yearActive = group.months.some((m) => m.key === activeMonthKey);
        return (
          <motion.div
            key={group.year}
            className={styles.timelineIndexGroup}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
          >
            <motion.div
              className={`${styles.timelineIndexYear} ${yearActive ? styles.timelineIndexYearActive : ""}`}
              variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
            >
              {group.year}<span className={styles.timelineIndexHanja}>年</span>
            </motion.div>
            <motion.div
              className={styles.timelineIndexMonths}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
            >
              {group.months.map((m) => {
                const isActive = activeMonthKey === m.key;
                return (
                  <motion.button
                    key={m.key}
                    type="button"
                    variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                    whileHover={{ x: 3 }}
                    transition={{ type: "spring", stiffness: 480, damping: 30 }}
                    className={`${styles.timelineIndexItem} ${isActive ? styles.timelineIndexItemActive : ""}`}
                    onClick={() => onJump(m.key)}
                    data-clickable="true"
                  >
                    <span className={styles.timelineIndexTick} aria-hidden="true">
                      {isActive && (
                        <motion.span
                          layoutId="tlIndexActiveDot"
                          className={styles.timelineIndexDot}
                          transition={{ type: "spring", stiffness: 520, damping: 34 }}
                        />
                      )}
                    </span>
                    <span className={styles.timelineIndexMm}>{m.mm}<span className={styles.timelineIndexHanja}>月</span></span>
                  </motion.button>
                );
              })}
            </motion.div>
          </motion.div>
        );
      })}
    </motion.nav>
  );
}
