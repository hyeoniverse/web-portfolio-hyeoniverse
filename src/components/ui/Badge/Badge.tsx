import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";
import styles from "./Badge.module.css";

export type BadgeVariant = "outline" | "soft" | "solid" | "overlay";
export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "white";
export type BadgeSize = "sm" | "md";

interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  children: ReactNode;
  /** outline(테두리) · soft(옅은 바탕) · solid(채운 바탕) · overlay(이미지 위 어두운 유리). 기본 soft */
  variant?: BadgeVariant;
  /** 색 — neutral · accent · success · warning · white(어두운 바탕 위 흰 테두리). 기본 neutral */
  tone?: BadgeTone;
  /** sm 20(--badge-height) · md 24. 기본 sm */
  size?: BadgeSize;
  /** 글자 앞 아이콘 */
  icon?: ReactNode;
  /** 대문자 + 자간 */
  uppercase?: boolean;
  /** 글자 앞 작은 점(글자색) — 상태 표시 */
  dot?: boolean;
}

/**
 * 배지 — 누르지 않는 짧은 표시(역할 · 상태 · 분류 · 언어 등). 누르거나 지우는 것은 Chip, 발행 상태는 StatusBadge.
 * 칸 높이가 고정이라 글자는 줄을 바꾸지 않고, 줄이 모자라도 배지가 좁아지지 않는다.
 */
export default function Badge({
  children,
  variant = "soft",
  tone = "neutral",
  size = "sm",
  icon,
  uppercase = false,
  dot = false,
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(styles.badge, styles[size], styles[variant], styles[`tone-${tone}`], uppercase && styles.uppercase, className)}
      {...rest}
    >
      {dot && <span className={styles.dot} aria-hidden />}
      {icon && <span className={styles.icon} aria-hidden>{icon}</span>}
      {children}
    </span>
  );
}
