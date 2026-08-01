import { type ReactNode } from "react";
import { cn } from "@/utils/cn";
import styles from "./EmptyState.module.css";

interface Props {
  children: ReactNode;
  /** 텍스트 크기 — sm(기본) | xs */
  size?: "sm" | "xs";
  /** 세로 여백 — 기본 xl. 리스트 안 등 좁은 곳은 "sm" */
  pad?: "xl" | "sm" | "none";
  className?: string;
}

/**
 * "아직 없습니다" 류 빈 상태 메시지 — 가운데 정렬 muted 텍스트.
 * settings 전반에서 각 컴포넌트가 제각각 클래스로 만들던 빈 상태를 통합한다.
 */
export default function EmptyState({ children, size = "sm", pad = "xl", className }: Props) {
  return <div className={cn(styles.empty, styles[size], styles[`pad-${pad}`], className)}>{children}</div>;
}
