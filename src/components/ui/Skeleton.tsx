import { cn } from "@/utils/cn";
import styles from "./Skeleton.module.css";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
}

/** 기본 스켈레톤 블록 — width/height/borderRadius 직접 지정 */
export function Skeleton({ className, width, height, borderRadius }: SkeletonProps) {
  return (
    <div
      className={cn(styles.skeleton, className)}
      style={{ width, height, borderRadius }}
    />
  );
}

/** 텍스트 라인 — radius-sm. 제목(h*) · 문단(p)처럼 div 를 품을 수 없는 자리에는 as="span"(인라인 블록) */
export function SkeletonLine({
  width = "100%",
  height = "var(--skeleton-height-line)",
  className,
  as: Tag = "div",
}: SkeletonProps & { as?: "div" | "span" }) {
  return (
    <Tag
      className={cn(styles.skeleton, styles.line, className)}
      style={{ width, height, ...(Tag === "span" ? { display: "inline-block", verticalAlign: "middle" } : null) }}
    />
  );
}

/** 원형 — 아이콘 / 아바타 / 도넛 / dot */
export function SkeletonCircle({ size = 36, className }: { size?: number | string; className?: string }) {
  return (
    <div
      className={cn(styles.skeleton, styles.circle, className)}
      style={{ width: size, height: size }}
    />
  );
}

/** 캡슐 — 태그 / 뱃지 / pill 버튼 */
export function SkeletonPill({
  width,
  height = "var(--skeleton-height-pill)",
  className,
}: SkeletonProps) {
  return (
    <div
      className={cn(styles.skeleton, styles.pill, className)}
      style={{ width, height }}
    />
  );
}

/** 큰 블록 — 이미지 / 차트 / 에디터 영역 (radius-md) */
export function SkeletonBlock({ width = "100%", height, className }: SkeletonProps) {
  return (
    <div
      className={cn(styles.skeleton, styles.block, className)}
      style={{ width, height }}
    />
  );
}
