"use client";

import styles from "./ShareIcon.module.css";

/* ShareIcon — 공유 노드 3개 + 연결선 2개. 좋아요의 HeartIcon 과 짝을 이루는 인터랙티브 아이콘.

   상태 머신 (data-state):
    - idle   : 기본
    - copied : 복사 완료 → 노드가 바깥으로 튀어나가는 burst 1회

   hover 는 CSS 가 부모(.btn:hover)를 보고 처리한다 — 두 자식 노드가 바깥으로 살짝 벌어지고
   연결선이 따라 늘어나 "보낸다" 는 느낌을 준다.
   stroke/fill 모두 currentColor — 부모 버튼의 color(기본/accent)를 그대로 따라간다. */

interface ShareIconProps {
  /** 복사 완료 — burst 1회 재생 */
  copied?: boolean;
  /** SVG width/height (px) */
  size?: number;
}

export default function ShareIcon({ copied = false, size = 16 }: ShareIconProps) {
  return (
    <span className={styles.holder}>
      <svg
        className={styles.icon}
        data-state={copied ? "copied" : "idle"}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        {/* 연결선 — 노드보다 먼저 그려서 노드 뒤에 깔린다 */}
        <line className={styles.link} x1="8.6" y1="10.9" x2="15.4" y2="7.1" />
        <line className={`${styles.link} ${styles.linkDown}`} x1="8.6" y1="13.1" x2="15.4" y2="16.9" />
        {/* 왼쪽(출발) 노드 — 움직이지 않는 기준점 */}
        <circle className={styles.node} cx="6" cy="12" r="2.6" />
        {/* 오른쪽(도착) 노드 2개 — hover 시 바깥으로 벌어지고, copied 시 튀어나간다 */}
        <circle className={`${styles.node} ${styles.nodeUp}`} cx="18" cy="6" r="2.6" />
        <circle className={`${styles.node} ${styles.nodeDown}`} cx="18" cy="18" r="2.6" />
      </svg>
    </span>
  );
}
