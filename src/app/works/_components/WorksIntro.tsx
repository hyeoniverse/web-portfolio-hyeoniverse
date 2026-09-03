"use client";

import T from "@/components/ui/T";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import styles from "./WorksIntro.module.css";

/* 갤러리 인트로 — 무한 스크롤이면 각 프로젝트 세트 앞마다 반복해서 놓인다.
   트랙 안에서의 인접 여백(앞의 크레딧 패널·뒤의 첫 프로젝트)은 골격의 몫이라
   WorksSection 이 slotClassName 으로 자기 슬롯 클래스를 걸어준다. */
export default function WorksIntro({
  works,
  projectCount,
  techCount,
  slotClassName,
}: {
  works: ReturnType<typeof useSiteConfig>["works"];
  projectCount: number;
  /** 전체 작품의 tech 항목 union — statsClients 라벨이 "Tech Stack" 이라 기술 수를 센다 */
  techCount: number;
  slotClassName: string;
}) {
  const w = works;
  return (
    <div className={`${styles.intro} ${slotClassName}`}>
      <span className={styles.introLabel}><T ko={w.introLabel_ko} en={w.introLabel} /></span>
      <h1 className={styles.introTitle}><T ko={w.introTitle_ko} en={w.introTitle} /></h1>
      <span className={styles.introTagline}><T ko={w.introTagline_ko} en={w.introTagline} /></span>
      <div className={styles.introDivider} />
      <p className={styles.introDesc}><T ko={w.introDesc_ko} en={w.introDesc} /></p>
      <p className={styles.introDetail}><T ko={w.introDetail_ko} en={w.introDetail} /></p>
      <div className={styles.introStats}>
        <div className={styles.introStat}>
          <span className={styles.introStatNumber}>
            {String(projectCount).padStart(2, "0")}
          </span>
          <span className={styles.introStatLabel}>
            <T ko={w.statsProjects_ko} en={w.statsProjects} />
          </span>
        </div>
        <div className={styles.introStatDivider} />
        <div className={styles.introStat}>
          <span className={styles.introStatNumber}>
            {String(techCount).padStart(2, "0")}
          </span>
          <span className={styles.introStatLabel}>
            <T ko={w.statsClients_ko} en={w.statsClients} />
          </span>
        </div>
      </div>
      <span className={styles.introScope}><T ko={w.introScope_ko} en={w.introScope} /></span>
      <blockquote className={styles.introQuote}>
        <T ko={w.introQuote_ko} en={w.introQuote} />
      </blockquote>
    </div>
  );
}
