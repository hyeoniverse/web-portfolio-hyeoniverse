"use client";

import Image from "next/image";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import T from "@/components/ui/T";
import styles from "./AdjacentNav.module.css";

export interface AdjacentItem {
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
  const { navigateWithTransition } = usePageTransition();

  const handleClick = (item: AdjacentItem, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    navigateWithTransition(item.href, item.image || "", rect);
  };

  return (
    <nav className={`${styles.nav}${className ? ` ${className}` : ""}`}>
      {prev ? (
        <div className={styles.card} data-clickable="true" onClick={(e) => handleClick(prev, e)} role="link" style={{ cursor: "pointer" }}>
          <div className={styles.thumb}>
            {prev.image ? (
              <Image src={prev.image} alt={prev.title} fill sizes="64px" className={styles.thumbImg} />
            ) : (
              <svg className={styles.placeholder} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            )}
          </div>
          <div className={styles.body}>
            <span className={styles.label}>
              <span className={styles.arrow}>&larr;</span>
              <T k={prevLabelKey} />
            </span>
            <span className={styles.title}>{prev.title}</span>
          </div>
        </div>
      ) : (
        <span className={styles.card} />
      )}
      {next ? (
        <div className={`${styles.card} ${styles.cardNext}`} data-clickable="true" onClick={(e) => handleClick(next, e)} role="link" style={{ cursor: "pointer" }}>
          <div className={styles.thumb}>
            {next.image ? (
              <Image src={next.image} alt={next.title} fill sizes="64px" className={styles.thumbImg} />
            ) : (
              <svg className={styles.placeholder} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            )}
          </div>
          <div className={styles.body}>
            <span className={styles.label}>
              <T k={nextLabelKey} />
              <span className={styles.arrow}>&rarr;</span>
            </span>
            <span className={styles.title}>{next.title}</span>
          </div>
        </div>
      ) : (
        <span className={styles.cardNext} />
      )}
    </nav>
  );
}
