"use client";

import type { RefObject } from "react";
import T from "@/components/ui/T";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import styles from "./CylinderIntroPanel.module.css";

/* 슬롯 0 — 3D 인트로 패널 위에 겹쳐 놓는 HTML 오버레이.
   위치와 표시 여부는 useCylinderStage 의 rAF 가 slotRefs 로 직접 잡으므로
   여기서는 처음에 숨겨둔 채 ref 만 등록한다. 별 12개의 좌표는 고정 배열이라
   슬롯이 다시 그려져도 배치가 흔들리지 않는다.

   standalone 은 무대 없이 그 자리에 그대로 두는 모드다(#1062). 보여줄 작업물도 저장소도 없을 때
   작업물 목록이 이 패널을 그대로 쓴다 — 빈 화면에도 사이트의 첫 얼굴은 남아 있어야 한다.
   그때는 원통이 없으므로 rAF 가 자리를 잡아 주지 않고, 스크롤로 넘길 것도 없다. */
export default function CylinderIntroPanel({
  slotRefs,
  standalone = false,
}: {
  slotRefs?: RefObject<Map<number, HTMLDivElement>>;
  standalone?: boolean;
}) {
  const w = useSiteConfig().works;
  return (
    <div
      ref={(el) => { if (el && slotRefs) slotRefs.current.set(0, el); }}
      className={`${styles.introItem} ${standalone ? styles.introItemStandalone : ""}`}
      style={standalone ? undefined : { visibility: "hidden", opacity: 0 }}
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
      <span className={styles.introLabel}><T ko={w.introLabel_ko} en={w.introLabel} /></span>
      <h1 className={styles.introTitle}><T ko={w.introTitle_ko} en={w.introTitle} /></h1>
      <span className={styles.introRule} aria-hidden="true">
        <span className={styles.introRuleLine} />
        <span className={styles.introRuleDot} />
        <span className={styles.introRuleLine} />
      </span>
      <p className={styles.introTagline}><T ko={w.introTagline_ko} en={w.introTagline} /></p>
      {/* 넘길 것이 없는 화면에서는 스크롤을 권하지 않는다 */}
      {!standalone && <span className={styles.introScroll}>scroll to explore ↓</span>}
    </div>
  );
}
