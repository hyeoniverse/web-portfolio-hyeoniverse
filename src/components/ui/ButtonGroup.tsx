"use client";

import type { ReactNode } from "react";
import { cn } from "@/utils";
import styles from "./ButtonGroup.module.css";

interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
  /** cta(기본): 마지막 filled 액션 그룹 / neutral: 색 없는 세그먼트(입력·아이콘 도구 결합용) */
  variant?: "cta" | "neutral";
}

export default function ButtonGroup({ children, className, variant = "cta" }: ButtonGroupProps) {
  return (
    <div className={cn(styles.group, variant === "neutral" && styles.neutral, className)}>
      {children}
    </div>
  );
}
