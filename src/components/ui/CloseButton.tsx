"use client";

import { type MouseEvent } from "react";
import CloseIcon from "./CloseIcon";
import { cn } from "@/utils/cn";
import styles from "./CloseButton.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";

type Size = "xs" | "sm" | "md" | "lg";

interface Props {
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
  title?: string;
  /** xs (20) | sm (24, default) | md (32) | lg (38) */
  size?: Size;
  className?: string;
}

/** Button wrapping CloseIcon with iconBtn pattern + data-close-trigger.
 *  CloseIcon 의 minus → X morph 는 hover 시 자동 (data-close-trigger).
 */
export default function CloseButton({ onClick, ariaLabel, title, size = "sm", className }: Props) {
  /* 기본 이름은 화면 언어로 — 예전엔 영어 "close" 로 고정이라 한국어 화면에서도 영어로 읽혔다 */
  const { t } = useLanguage();
  return (
    <Pressable
      type="button"
      className={cn(styles.btn, styles[size], className)}
      onClick={onClick}
      aria-label={ariaLabel ?? t("common.close")}
      title={title}
      data-close-trigger
    >
      <CloseIcon />
    </Pressable>
  );
}
