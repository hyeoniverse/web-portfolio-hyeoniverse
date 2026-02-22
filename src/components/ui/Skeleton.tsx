import { cn } from "@/utils/cn";
import styles from "./Skeleton.module.css";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
}

/** 기본 스켈레톤 블록 */
export function Skeleton({ className, width, height, borderRadius }: SkeletonProps) {
  return (
    <div
      className={cn(styles.skeleton, className)}
      style={{ width, height, borderRadius }}
    />
  );
}

/** 텍스트 라인 스켈레톤 */
export function SkeletonLine({
  width = "100%",
  height = 14,
  className,
}: SkeletonProps) {
  return (
    <div
      className={cn(styles.skeleton, styles.line, className)}
      style={{ width, height }}
    />
  );
}
