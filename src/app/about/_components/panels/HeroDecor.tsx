"use client";

import { useEffect, useState } from "react";
import styles from "./HeroDecor.module.css";

/* 촬영 현장(behind the scenes) 뷰파인더 — 페이지를 연 뒤 흐른 시간을 타임코드로 */
function Timecode() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className={styles.timecode}>
      {pad(Math.floor(seconds / 3600))}:{pad(Math.floor(seconds / 60) % 60)}:{pad(seconds % 60)}
    </span>
  );
}

/** Hero 포스터 구도의 꾸밈 — REC·타임코드, 촬영 정보, 천천히 도는 원형 문구 배지 */
export default function HeroDecor() {
  const ring = "Behind the scenes ✦ The making of ✦ ";
  return (
    <div className={styles.decor} aria-hidden>
      <span className={styles.rec}>
        <i className={styles.recDot} />
        REC
        <Timecode />
      </span>
      <span className={styles.meta}>4K · 24 FPS · ISO 800</span>

      <svg className={styles.badge} viewBox="0 0 200 200">
        <defs>
          <path id="hero-badge-circle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text className={styles.badgeText}>
          {/* 원 둘레(2π·78 ≈ 490) 에 맞춰 글자 간격을 늘려 한 바퀴를 채운다 */}
          <textPath href="#hero-badge-circle" textLength="486" lengthAdjust="spacing">{ring}</textPath>
        </text>
        <text x="100" y="112" textAnchor="middle" className={styles.badgeStar}>✦</text>
      </svg>
    </div>
  );
}
