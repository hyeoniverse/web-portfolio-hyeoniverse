"use client";

import { useId, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowUp, ChevronLeft } from "lucide-react";
import { cn } from "@/utils/cn";
import Button from "./Button";
import styles from "./SegmentedControl.module.css";

export interface SegmentedControlItem<T extends string, S extends string = string> {
  value: T;
  /** label — string 또는 icon 같은 ReactNode 지원 */
  label: ReactNode;
  /** 하위 메뉴 — 이 item 선택 시 sub items 표시 (subVariant 따라 inline/nested) */
  subItems?: readonly SegmentedControlItem<S>[];
}

interface Props<T extends string, S extends string = string> {
  items: readonly SegmentedControlItem<T, S>[];
  value: T;
  onChange: (v: T) => void;
  /** 선택된 item 옆 dir arrow (asc/desc) — onChange 가 dir 도 결정 (부모 책임) */
  sortDir?: "asc" | "desc";
  className?: string;
  /** subItems 가 있는 item 선택 시 sub value */
  subValue?: S;
  onSubChange?: (v: S) => void;
  /** sub 표시 방식
   *  - "nested" (default): main 의 다른 items 접고 [active main label + divider + sub items]
   *  - "inline": main items + 옆에 [divider + sub items] 같이 표시 */
  subVariant?: "inline" | "nested";
  /** nested 모드에서 main 으로 돌아가는 callback — 없으면 back 버튼 미표시 */
  onBack?: () => void;
}

/** Capsule pill segmented control — single-select. framer-motion active background sliding + hover preview.
 *  선택된 item 에 subItems 가 있고 subValue/onSubChange 제공되면 sub 메뉴 표시.
 *  subVariant 로 inline/nested 스타일 분기. */
export default function SegmentedControl<T extends string, S extends string = string>({
  items,
  value,
  onChange,
  sortDir,
  className,
  subValue,
  onSubChange,
  subVariant = "nested",
  onBack,
}: Props<T, S>) {
  const layoutId = useId();
  const [hovered, setHovered] = useState<T | null>(null);
  const indicatorTarget = hovered ?? value;

  const activeItem = items.find((i) => i.value === value);
  const hasSub =
    !!activeItem?.subItems && activeItem.subItems.length > 0 && subValue !== undefined && !!onSubChange;

  const morphTransition = { type: "spring" as const, stiffness: 400, damping: 32 };

  /* ── Nested 모드: main 의 다른 items 접고 selected main label + divider + sub items.
     outer motion.div layout — main↔nested 전환 시 size/position morph. */
  if (subVariant === "nested" && hasSub && activeItem) {
    return (
      <motion.div
        layout
        transition={morphTransition}
        className={cn(styles.group, styles.nestedGroup, className)}
        role="tablist"
      >
        {onBack && (
          <button
            type="button"
            className={cn(styles.btn, styles.btnNav)}
            onClick={onBack}
            aria-label="Back"
          >
            <ChevronLeft size={12} strokeWidth={2} />
          </button>
        )}
        <Button
          variant="primary"
          size="xs"
          soundDisabled
          className={styles.btnNestedLabel}
          onClick={onBack}
        >
          {activeItem.label}
        </Button>
        <span aria-hidden className={styles.nestedDivider} />
        <SegmentedControl<S>
          items={activeItem.subItems!}
          value={subValue}
          onChange={onSubChange}
        />
      </motion.div>
    );
  }

  /* ── Main items (inline / 일반 모드 공용) ── */
  const mainGroup = (
    <motion.div
      layout
      transition={morphTransition}
      className={cn(styles.group, className)}
      role="tablist"
      onMouseLeave={() => setHovered(null)}
    >
      {items.map((it) => {
        const isActive = it.value === value;
        const showIndicator = it.value === indicatorTarget;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cn(styles.btn, isActive && showIndicator && styles.btnActiveOver)}
            onClick={() => onChange(it.value)}
            onMouseEnter={() => setHovered(it.value)}
          >
            {showIndicator && (
              <motion.span
                className={cn(styles.indicator, isActive && styles.indicatorActive)}
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
              />
            )}
            <span className={styles.btnText}>
              {it.label}
              {isActive && sortDir && (
                <ArrowUp
                  size={10}
                  strokeWidth={2}
                  className={styles.dirIcon}
                  style={{ transform: sortDir === "desc" ? "rotate(180deg)" : undefined }}
                />
              )}
            </span>
          </button>
        );
      })}
    </motion.div>
  );

  /* ── Inline 모드: main + [divider + sub items] 같은 row ── */
  if (hasSub && subVariant === "inline" && activeItem) {
    return (
      <div className={styles.subInlineWrap}>
        {mainGroup}
        <span aria-hidden className={styles.nestedDivider} />
        <SegmentedControl<S>
          items={activeItem.subItems!}
          value={subValue}
          onChange={onSubChange}
        />
      </div>
    );
  }

  return mainGroup;
}
