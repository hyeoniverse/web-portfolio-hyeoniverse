import { type CSSProperties, type ReactNode } from "react";
import { cn } from "@/utils/cn";
import styles from "./PanelTitle.module.css";

type Props = {
  children: ReactNode;
  /** "default": panel 직접 child, padding-top spacing-sm 으로 위 spacing 자체 책임
   *  "inset": panelHeader 같은 wrapper 안에 들어갈 때 — padding-top 0 (wrapper 가 spacing)
   *  "framed": 아래 padding + border-bottom 으로 self-contained header */
  variant?: "default" | "inset" | "framed";
  className?: string;
  style?: CSSProperties;
};

export default function PanelTitle({ children, variant = "default", className, style }: Props) {
  return (
    <h2
      className={cn(
        styles.title,
        variant === "inset" && styles.inset,
        variant === "framed" && styles.framed,
        className,
      )}
      style={style}
    >
      {children}
    </h2>
  );
}
