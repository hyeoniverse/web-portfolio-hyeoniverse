import Link from "next/link";
import { cn } from "@/utils/cn";
import styles from "./TagPill.module.css";

interface TagPillProps {
  tag: string;
  /** 우측 카운트 배지 (옵션) */
  count?: number;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/** 공통 태그 pill — # 접두 + 캡슐 모양. /posts/tags/[tag] 로 이동. */
export default function TagPill({ tag, count, className, onClick }: TagPillProps) {
  return (
    <Link
      href={`/posts/tags/${encodeURIComponent(tag)}`}
      className={cn(styles.pill, className)}
      onClick={onClick}
    >
      <span className={styles.name}>#{tag}</span>
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </Link>
  );
}
