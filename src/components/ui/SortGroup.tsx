"use client";

import { useId, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { cn } from "@/utils/cn";
import styles from "./SortGroup.module.css";

export interface SortItem<T extends string> {
  value: T;
  /** label — string 또는 icon 같은 ReactNode 지원 */
  label: ReactNode;
}

interface Props<T extends string> {
  items: readonly SortItem<T>[];
  value: T;
  onChange: (v: T) => void;
  /** 선택된 item 옆 dir arrow (asc/desc) — onChange 가 dir 도 결정 (부모 책임) */
  sortDir?: "asc" | "desc";
  className?: string;
}

/** Capsule pill 그룹 — sort/filter 단일 선택. framer-motion 으로 active background sliding + hover preview. */
export default function SortGroup<T extends string>({
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
