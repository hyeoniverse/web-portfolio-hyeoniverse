"use client";

import MediaThumb from "@/components/ui/MediaThumb";
import { ImageIcon, ArrowLeft, ArrowRight } from "@/components/icons";
import TransitionLink from "@/components/ui/TransitionLink";
import T from "@/components/ui/T";
import styles from "./AdjacentNav.module.css";
import { useLanguage } from "@/providers/LanguageProvider";

interface AdjacentItem {
  href: string;
  title: string;
  image?: string;
}

interface AdjacentNavProps {
  prev: AdjacentItem | null;
  next: AdjacentItem | null;
  prevLabelKey?: string;
  nextLabelKey?: string;
  className?: string;
}

export default function AdjacentNav({
  prev,
  next,
  prevLabelKey = "common.prev",
  nextLabelKey = "common.next",
  className,
}: AdjacentNavProps) {
  const { t } = useLanguage();

  /* 앞뒤가 다 없으면(글·작업물이 하나뿐) 아무것도 그리지 않는다 — 예전에는 빈 카드 틀과 위아래 줄만 남았다 */
  if (!prev && !next) return null;

  return (
    <nav aria-label={t("common.adjacentPosts")} className={`${styles.nav}${className ? ` ${className}` : ""}`}>
      {prev ? (
        <TransitionLink href={prev.href} image={prev.image || ""} className={`${styles.card}${next ? "" : ` ${styles.cardSolo}`}`} data-clickable="true">
          <div className={styles.thumb}>
            {prev.image ? (
              <MediaThumb src={prev.image} alt={prev.title} fill sizes="64px" className={styles.thumbImg} />
            ) : (
              <ImageIcon className={styles.placeholder} size={20} strokeWidth={1} />
            )}
          </div>
          <div className={styles.body}>
            <span className={styles.label}>
              <ArrowLeft className={styles.arrow} size={14} />
              <T k={prevLabelKey} />
            </span>
            <span className={styles.title}>{prev.title}</span>
          </div>
        </TransitionLink>
      ) : (
        /* 빈 자리 — 다음 카드를 오른쪽에 두려고 칸만 차지한다. 카드 틀(높이·구분선)은 주지 않는다 */
        <span className={styles.emptySlot} aria-hidden="true" />
      )}
      {next ? (
        <TransitionLink href={next.href} image={next.image || ""} className={`${styles.card} ${styles.cardNext}`} data-clickable="true">
          <div className={styles.thumb}>
            {next.image ? (
              <MediaThumb src={next.image} alt={next.title} fill sizes="64px" className={styles.thumbImg} />
            ) : (
              <ImageIcon className={styles.placeholder} size={20} strokeWidth={1} />
            )}
          </div>
          <div className={styles.body}>
            <span className={styles.label}>
              <T k={nextLabelKey} />
              <ArrowRight className={styles.arrow} size={14} />
            </span>
            <span className={styles.title}>{next.title}</span>
          </div>
        </TransitionLink>
      ) : (
        <span className={styles.emptySlot} aria-hidden="true" />
      )}
    </nav>
  );
}
