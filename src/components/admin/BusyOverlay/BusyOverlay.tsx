"use client";

import styles from "./BusyOverlay.module.css";

/**
 * 관리자 목록의 일괄 작업(지우기 · 공개 전환 · 카테고리 바꾸기)이 끝날 때까지 화면 전체를 덮고 스피너를 보인다 —
 * 그동안 다른 것을 누르지 못하게. 화면에 고정해 스크롤한 아래쪽 · 머리 · 푸터까지 덮는다
 * (예전 글 목록의 덮개는 목록 상자 안에만 깔려 아래쪽이 비었다).
 */
export default function BusyOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className={styles.overlay} role="status" aria-busy="true">
      <span className={styles.spinner} aria-hidden />
    </div>
  );
}
