"use client";

import T from "@/components/ui/T";
import { Flame, Eye, Heart } from "@/components/icons";
import { formatCount } from "@/utils/format";
import styles from "./PostCardChips.module.css";

/** 변형이 넘긴 보정 클래스를 붙인다 — 없을 때 class 속성에 빈칸이 남지 않게 */
const cx = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" ");

/* 카드 칩 셋 — 변형 넷이 같은 마크업으로 쓰던 조각. 변형별 크기·컨텍스트 보정은 className 으로 받는다
   (CSS 모듈이 갈리면 `.timelineEyebrow .hotBadge` 같은 후손 override 를 쓸 수 없다). */

/** HOT 배지 — 인기 상위 글. 아이콘 크기는 변형마다 다르다(10~15). */
export function HotBadge({ size = 10, className }: { size?: number; className?: string }) {
  return (
    <span className={cx(styles.hotBadge, className)}>
      <Flame size={size} fill="currentColor" stroke="none" />
      HOT
    </span>
  );
}

/** 언어 칩 — 한쪽 언어만 있는 글에 KO/EN 표시 */
export function LangChip({ badge, className }: { badge: "koOnly" | "enOnly"; className?: string }) {
  return (
    <span className={cx(styles.compactLang, className)}>
      <T k={`postDetail.${badge}`} />
    </span>
  );
}

/** 조회수·좋아요 — 아이콘 + 축약 수치 */
export function StatItem({ kind, value, className }: { kind: "views" | "likes"; value: number; className?: string }) {
  const Icon = kind === "views" ? Eye : Heart;
  return (
    <span className={cx(styles.compactStat, className)}>
      <Icon size={11} strokeWidth={1.75} />
      {formatCount(value)}
    </span>
  );
}
