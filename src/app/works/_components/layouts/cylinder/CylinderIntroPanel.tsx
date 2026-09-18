"use client";

import type { RefObject } from "react";
import T from "@/components/ui/T";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import styles from "./CylinderIntroPanel.module.css";

/* 슬롯 0 — 3D 인트로 패널 위에 겹쳐 놓는 HTML 오버레이.
   위치와 표시 여부는 useCylinderStage 의 rAF 가 slotRefs 로 직접 잡으므로
   여기서는 처음에 숨겨둔 채 ref 만 등록한다. 별 12개의 좌표는 고정 배열이라
   슬롯이 다시 그려져도 배치가 흔들리지 않는다. */
export default function CylinderIntroPanel({
  slotRefs,
}: {
  slotRefs: RefObject<Map<number, HTMLDivElement>>;
}) {
  const w = useSiteConfig().works;
  return (
    <div
      ref={(el) => { if (el) slotRefs.current.set(0, el); }}
      className={styles.introItem}
      style={{ visibility: "hidden", opacity: 0 }}
    >
      <span className={styles.introStars} aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={styles.introStar} style={{
            left: `${[8,85,22,68,42,90,15,55,75,35,62,5][i]}%`,
            top: `${[12,28,72,55,8,80,45,92,18,65,38,85][i]}%`,
            animationDelay: `${i * 0.4}s`,
            width: `${i % 3 === 0 ? 3 : 2}px`,
            height: `${i % 3 === 0 ? 3 : 2}px`,
          }} />
        ))}
      </span>
      <span className={styles.introOvalOuter} aria-hidden="true" />
      <span className={styles.introOvalInner} aria-hidden="true" />
      {/* 글자 묶음 — 작업물이 없는 화면에서는 스크롤에 따라 이 묶음만 사라진다(#1062).
          --dissolve 는 그 화면이 쓰는 값이고, 원통에서는 정의되지 않아 1 로 남는다.
          패널의 opacity 는 무대(rAF)가 매 프레임 쥐고 있어서 거기에 얹을 수 없다 */}
      <span className={styles.introText}>
        <span className={styles.introLabel}><T ko={w.introLabel_ko} en={w.introLabel} /></span>
        <h1 className={styles.introTitle}><T ko={w.introTitle_ko} en={w.introTitle} /></h1>
        <span className={styles.introRule} aria-hidden="true">
          <span className={styles.introRuleLine} />
          <span className={styles.introRuleDot} />
          <span className={styles.introRuleLine} />
        </span>
        <p className={styles.introTagline}><T ko={w.introTagline_ko} en={w.introTagline} /></p>
        <span className={styles.introScroll}>scroll to explore ↓</span>
      </span>
    </div>
  );
}
