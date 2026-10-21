"use client";

import { type ReactNode } from "react";
import { ChevronDown } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import styles from "./ExtraInfoViews.module.css";

/**
 * 작업물 편집기 — 추가 정보(기술 · 팀원 · 링크 · 관련 글 · 관련 시리즈).
 *
 * 요약 카드 한 줄(제목 · 개수 · 미리보기)을 두고, 카드를 누르면 그 아래에 그 항목의 편집기가 펼쳐진다.
 * 다시 누르거나 다른 카드를 누르면 바뀐다. 모달이 아니라 제자리라 본문을 보면서 고칠 수 있다.
 */
export type ExtraKey = "tech" | "team" | "links" | "posts" | "series";

export interface ExtraItem {
  key: ExtraKey;
  title: string;
  count: number;
  /** 요약 카드에 보일 짧은 미리보기 */
  preview: ReactNode;
  /** 펼쳤을 때의 편집기 */
  body: ReactNode;
}

export function ExtraSummary({
  items,
  open,
  onOpenChange,
}: {
  items: ExtraItem[];
  /** 펼친 항목 — 부모가 쥔다(SEO 체크리스트가 기술 칸을 열 수 있게) */
  open: ExtraKey | null;
  onOpenChange: (key: ExtraKey | null) => void;
}) {
  const current = items.find((it) => it.key === open) ?? null;
  return (
    <div className={styles.wrap}>
      <div className={styles.summary} role="tablist">
        {items.map((it) => {
          const active = it.key === open;
          return (
            <Pressable
              key={it.key}
              role="tab"
              aria-selected={active}
              aria-controls={`extra-panel-${it.key}`}
              className={`${styles.summaryCard}${active ? ` ${styles.summaryCardActive}` : ""}`}
              onClick={() => onOpenChange(active ? null : it.key)}
            >
              <span className={styles.summaryTop}>
                <span className={styles.summaryTitle}>{it.title}</span>
                <span className={styles.summaryCount}>{it.count}</span>
              </span>
              <span className={styles.summaryPreview}>{it.preview}</span>
              <ChevronDown size={14} strokeWidth={2} className={styles.summaryChevron} aria-hidden />
            </Pressable>
          );
        })}
      </div>
      {current && (
        <div id={`extra-panel-${current.key}`} role="tabpanel" className={`${styles.panel} ${styles.body}`}>
          {current.body}
        </div>
      )}
    </div>
  );
}

/** 요약 카드 안쪽에서 비어 있을 때 */
export function ExtraEmpty({ children }: { children: ReactNode }) {
  return <span className={styles.empty}>{children}</span>;
}
