"use client";

import type { ReactNode } from "react";
import { cn } from "@/utils";
import styles from "./ButtonGroup.module.css";

interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
}

export default function ButtonGroup({ children, className }: ButtonGroupProps) {
  return (
    <div className={cn(styles.group, className)}>
      {children}
    </div>
  );
}
