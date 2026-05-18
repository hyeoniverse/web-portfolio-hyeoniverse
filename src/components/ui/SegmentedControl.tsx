"use client";

import { useId, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { cn } from "@/utils/cn";
import styles from "./SegmentedControl.module.css";

export interface SegmentedControlItem<T extends string> {
  value: T;
  /** label — string 또는 icon 같은 ReactNode 지원 */
  label: ReactNode;
}

interface Props<T extends string> {
  items: readonly SegmentedControlItem<T>[];
  value: T;
  onChange: (v: T) => void;
  /** 선택된 item 옆 dir arrow (asc/desc) — onChange 가 dir 도 결정 (부모 책임) */
  sortDir?: "asc" | "desc";
  className?: string;
}

/** Capsule pill segmented control — single-select. framer-motion active background sliding + hover preview.
 *  sort/filter/tab 등에 범용 사용. */
export default function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  sortDir,
  className,
}: Props<T>) {
  const layoutId = useId();
  const [hovered, setHovered] = useState<T | null>(null);
  const indicatorTarget = hovered ?? value;

  return (
    <div
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
    </div>
  );
}
