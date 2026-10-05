"use client";

import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import styles from "./Menu.module.css";
import Pressable from "@/components/ui/Pressable";

interface MenuItemProps {
  icon?: ReactNode;
  label: ReactNode;
  /** chevron 등 우측 trailing 슬롯 — 펼침 가능한 항목은 ChevronRight + open 상태 표시 */
  trailing?: ReactNode;
  /** active (또는 펼침 중) 상태 — 배경 강조 */
  active?: boolean;
  onClick?: () => void;
  ariaExpanded?: boolean;
  className?: string;
  /** 지금은 할 수 없는 항목 — 숨기지 않고 흐리게 둬 메뉴에 무엇이 있는지 보이게 */
  disabled?: boolean;
}

export function MenuItem({
  icon,
  label,
  trailing,
  active,
  onClick,
  ariaExpanded,
  className,
  disabled,
}: MenuItemProps) {
  return (
    <Pressable
      type="button"
      className={cn(styles.item, active && styles.itemActive, className)}
      onClick={onClick}
      aria-expanded={ariaExpanded}
      disabled={disabled}
    >
      {icon && <span className={styles.itemIcon}>{icon}</span>}
      <span className={styles.itemLabel}>{label}</span>
      {trailing}
    </Pressable>
  );
}

interface MenuTrailingProps {
  /** 펼침 상태 — true 시 90° rotate */
  open?: boolean;
  children: ReactNode;
}

/** MenuItem 의 trailing 슬롯 헬퍼 — open 시 90° rotate (chevron 같은 아이콘용) */
export function MenuItemTrailing({ open, children }: MenuTrailingProps) {
  return (
    <span className={cn(styles.itemTrailing, open && styles.itemTrailingOpen)} aria-hidden>
      {children}
    </span>
  );
}

export function MenuDivider() {
  return <div className={styles.divider} aria-hidden />;
}
