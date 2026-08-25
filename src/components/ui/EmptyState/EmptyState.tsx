import { type ReactNode } from "react";
import { cn } from "@/utils/cn";
import styles from "./EmptyState.module.css";

interface Props {
  children: ReactNode;
  /** 텍스트 크기 — sm(기본) | xs */
  size?: "sm" | "xs";
  /** 세로 여백 — 기본 xl. 리스트 안 등 좁은 곳은 "sm" */
  pad?: "xl" | "sm" | "none";
<<<<<<< HEAD
  /** 위에 표준 장식 원(64px) 표시 — 목록형 빈 상태(신고·댓글·알림 등)의 아이콘 자리. */
  circle?: boolean;
=======
  /** 가로 정렬 — 기본 center. 좌측 정렬된 목록 안에 놓일 때는 "start" */
  align?: "center" | "start";
>>>>>>> 4a829fcc (refactor(ui): 공통 컴포넌트 정리 + 권한 전환에 딸린 화면 손질)
  className?: string;
}

/**
 * "아직 없습니다" 류 빈 상태 메시지 — 가운데 정렬 muted 텍스트.
 * settings 전반에서 각 컴포넌트가 제각각 클래스로 만들던 빈 상태를 통합한다.
 * circle 을 주면 위에 표준 장식 원 + 세로 스택(아이콘 → 내용) 레이아웃.
 */
<<<<<<< HEAD
export default function EmptyState({ children, size = "sm", pad = "xl", circle = false, className }: Props) {
  return (
    <div className={cn(styles.empty, styles[size], styles[`pad-${pad}`], circle && styles.decorated, className)}>
      {circle && <span className={styles.circle} aria-hidden />}
      {children}
    </div>
  );
=======
export default function EmptyState({ children, size = "sm", pad = "xl", align = "center", className }: Props) {
  return <div className={cn(styles.empty, styles[size], styles[`pad-${pad}`], styles[`align-${align}`], className)}>{children}</div>;
>>>>>>> 4a829fcc (refactor(ui): 공통 컴포넌트 정리 + 권한 전환에 딸린 화면 손질)
}
