"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import T from "@/components/ui/T";
import Pressable from "@/components/ui/Pressable";
import { ChevronRight, ArrowLeft, ArrowRight } from "@/components/icons";
import type { useSeriesPanel } from "./useSeriesPanel";
import styles from "./SeriesPanel.module.css";

/* 글 상세 본문 위 시리즈 박스 — 헤더(제목 · n/m · 펼침 토글), 펼친 목록(현재 글 표시 · hover 미리보기), 이전/다음 글 내비.
   state 는 useSeriesPanel(부모)이 들고 panel 로 받는다. 시리즈가 없거나 글이 0개면 렌더하지 않는다. */
export default function SeriesPanel({
  panel,
  postId,
  viewLang,
  onNavigate,
}: {
  panel: ReturnType<typeof useSeriesPanel>;
  postId: string;
  viewLang: "ko" | "en";
  onNavigate: (href: string, title: string, rect: DOMRect) => void;
}) {
  const { seriesData, seriesPosts, currentIdx, prev, next, open, toggleOpen, onHover, onLeave } = panel;
  if (!seriesData || seriesPosts.length === 0) return null;
  return (
    <motion.div
      className={styles.seriesBox}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <Pressable
        className={styles.seriesHeader}
        onClick={toggleOpen}
      >
        <span className={styles.seriesLabel}><T k="postDetail.series" /></span>
        <span className={styles.seriesTitle}>
          {viewLang === "en" && seriesData.title_en
            ? seriesData.title_en
            : seriesData.title}
        </span>
        <span className={styles.seriesCount}>
          {currentIdx + 1} / {seriesPosts.length}
        </span>
        <span className={`${styles.seriesChevron} ${open ? styles.seriesChevronOpen : ""}`}>
          <ChevronRight size={14} strokeWidth={1.5} />
        </span>
      </Pressable>

      <div className={`${styles.seriesListWrap} ${open ? styles.seriesListWrapOpen : ""}`}>
        <div className={styles.seriesListInner}>
          <ol className={styles.seriesList}>
            {seriesPosts.map((sp, idx) => (
              <li
                key={sp.id}
                className={`${styles.seriesItem} ${sp.id === postId ? styles.seriesItemCurrent : ""}`}
                onMouseEnter={(e) => onHover(sp, e)}
                onMouseLeave={onLeave}
              >
                <span className={`${styles.seriesIndicator} ${sp.id === postId ? styles.seriesIndicatorActive : ""}`}><ChevronRight size={16} strokeWidth={2.5} /></span>
                <span className={styles.seriesNum}>#{idx + 1}</span>
                {sp.id === postId ? (
                  <span>{viewLang === "en" && sp.title_en ? sp.title_en : sp.title}</span>
                ) : (
                  <Link href={`/posts/${sp.slug}`}>
                    {viewLang === "en" && sp.title_en ? sp.title_en : sp.title}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className={styles.seriesNav}>
        {prev ? (
          <div onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); onNavigate(`/posts/${prev.slug}`, "", rect); }} style={{ cursor: "pointer" }} className={styles.seriesNavLink}>
            <span className={styles.seriesNavBadge}><ArrowLeft className={styles.seriesNavArrow} size={14} /> <T k="postDetail.previous" /></span>
            <span className={styles.seriesNavSep}>|</span>
            <span className={styles.seriesNavTitle}>{viewLang === "en" && prev.title_en ? prev.title_en : prev.title}</span>
          </div>
        ) : (
          <span />
        )}
        {prev && next && <span className={styles.seriesNavDivider} />}
        {next ? (
          <div onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); onNavigate(`/posts/${next.slug}`, "", rect); }} style={{ cursor: "pointer" }} className={`${styles.seriesNavLink} ${styles.seriesNavRight}`}>
            <span className={styles.seriesNavTitle}>{viewLang === "en" && next.title_en ? next.title_en : next.title}</span>
            <span className={styles.seriesNavSep}>|</span>
            <span className={styles.seriesNavBadge}><T k="postDetail.next" /> <ArrowRight className={styles.seriesNavArrow} size={14} /></span>
          </div>
        ) : (
          <span />
        )}
      </div>
    </motion.div>
  );
}
