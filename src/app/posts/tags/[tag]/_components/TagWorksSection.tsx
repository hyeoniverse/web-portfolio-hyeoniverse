"use client";

import Link from "next/link";
import type { TagPageData } from "@/lib/posts";
import { useLanguage } from "@/providers/LanguageProvider";
import WorkYear from "@/components/works/WorkYear";
import { ArrowUpRight } from "@/components/icons";
import styles from "./TagWorksSection.module.css";

/* 통합 태그 — 같은 기술(tech)을 쓴 작업물 목록. tags↔tech 공유 어휘. 작업물이 없으면 렌더하지 않는다. */
export default function TagWorksSection({ works }: { works: TagPageData["works"] }) {
  const { language, t } = useLanguage();
  if (works.length === 0) return null;
  return (
    <section className={styles.worksSection}>
      <h2 className={styles.worksHeading}>
        {t("postsPage.tagProjects")}
        <span className={styles.worksCount}>{works.length}</span>
      </h2>
      <div className={styles.worksTable}>
        {works.map((w) => (
          <Link
            key={w.id}
            href={`/works/${w.slug}`}
            className={styles.workRow}
            data-clickable="true"
          >
            {w.image && (
              <div className={styles.workRowBg} aria-hidden="true">
                <div
                  className={styles.workRowBgImg}
                  style={{ backgroundImage: `url(${w.image})` }}
                />
              </div>
            )}
            <span className={styles.workRowTitle}>{(language === "ko" ? w.title : w.title_en) || (language === "ko" ? w.title_en : w.title)}</span>
            <span className={styles.workRowSubtitle}>
              {(language === "ko" ? w.subtitle_ko : w.subtitle_en) || (language === "ko" ? w.subtitle_en : w.subtitle_ko)}
            </span>
            {w.year && <span className={styles.workRowYear}><WorkYear value={w.year} /></span>}
            <ArrowUpRight className={styles.workRowArrow} size={20} strokeWidth={2} aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
}
