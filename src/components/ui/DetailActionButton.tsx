"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./DetailActionButton.module.css";

/* 상세 페이지 하단 액션 버튼 껍데기 — 좋아요 · 공유가 같이 쓴다.
   안쪽 내용은 서로 다르고(하트+카운트 / 공유아이콘+라벨), 캡슐 껍데기와 active(accent) 상태만 공통이라
   "껍데기만" 공유하는 형태로 뽑았다. 예전엔 두 버튼이 같은 값을 각자 CSS 에 복붙해두고
   share 쪽만 뒤처져 있었다(28px vs 47px, border-strong vs light). */

interface DetailActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 켜진 상태 — 좋아요는 "누름", 공유는 "복사됨". 둘 다 accent 로 표시된다. */
  active?: boolean;
  children: ReactNode;
}

export default function DetailActionButton({
  active = false,
  className,
  children,
  ...rest
}: DetailActionButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.btn}${active ? ` ${styles.active}` : ""}${className ? ` ${className}` : ""}`}
      data-clickable="true"
      {...rest}
    >
      {children}
    </button>
  );
}
