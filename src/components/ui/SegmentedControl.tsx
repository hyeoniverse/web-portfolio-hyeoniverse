"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowUp, ChevronRight, X } from "lucide-react";
import { cn } from "@/utils/cn";
import Button from "./Button";
import styles from "./SegmentedControl.module.css";

interface SegmentedControlItem<T extends string, S extends string = string> {
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
  /** 테두리 세기. 기본 "default"(--border-default-color).
   *  "subtle" — 한 단계 옅은 --border-light-color. 주변이 전부 border-light 결인 자리에서
   *  기본값이 혼자 진하게 튀는 걸 막는다(달력 블록 등). 호출부마다 box-shadow 를 복붙해
   *  덮으면 규격이 갈라지므로 variant 로 둔다. */
  variant?: "default" | "subtle";
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
  /** control 높이 — xs (24) / sm (28) / md (32, 기본). 다른 control 들과 정렬용 */
  size?: "xs" | "sm" | "md";
}

/** Capsule pill segmented control — single-select. framer-motion active background sliding + hover preview.
 *  선택된 item 에 subItems 가 있고 subValue/onSubChange 제공되면 sub 메뉴 표시.
 *  subVariant 로 inline/nested 스타일 분기. */
export default function SegmentedControl<T extends string, S extends string = string>({
  items,
  value,
  onChange,
  sortDir,
  variant = "default",
  className,
  subValue,
  onSubChange,
  subVariant = "nested",
  onBack,
  size = "md",
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
        className={cn(styles.group, styles.nestedGroup, variant === "subtle" && styles.groupSubtle, className)}
        role="tablist"
        /* 버튼 control-h-8 로 축소(여백 4px, 높이는 control-h 유지) + label 폰트를 세그먼트 btn 과 동일하게
           (Button 컴포넌트는 sm/md 가 font-size-sm 이라 커 보임 → xs, 단 size xs 는 2xs) */
        style={{
          "--nested-btn-h": `calc(var(--control-h-${size}) - 8px)`,
          "--nested-label-fs": size === "xs" ? "var(--font-size-2xs)" : "var(--font-size-xs)",
        } as CSSProperties}
      >
        {onBack && (
          <button
            type="button"
            className={cn(styles.btn, styles.btnNav)}
            onClick={onBack}
            aria-label="Back"
          >
            <X size={12} strokeWidth={2} />
          </button>
        )}
        <Button
          variant="primary"
          size={size}
          soundDisabled
          className={styles.btnNestedLabel}
          onClick={onBack}
        >
          {activeItem.label}
        </Button>
        <span aria-hidden className={styles.nestedDivider}>
          <ChevronRight size={12} strokeWidth={2} />
        </span>
        <SegmentedControl<S>
          items={activeItem.subItems!}
          value={subValue}
          onChange={onSubChange}
          size={size}
        />
      </motion.div>
    );
  }

  /* ── Main items (inline / 일반 모드 공용) ── */
  const mainGroup = (
    <motion.div
      layout
      transition={morphTransition}
      className={cn(styles.group, size === "sm" && styles.groupSm, variant === "subtle" && styles.groupSubtle, className)}
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
            className={cn(styles.btn, size === "sm" && styles.btnSm, size === "xs" && styles.btnXs, isActive && showIndicator && styles.btnActiveOver)}
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
          size={size}
        />
      </div>
    );
  }

  return mainGroup;
}
