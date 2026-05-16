import { type ReactNode } from "react";
import { cn } from "@/utils/cn";
import styles from "./PanelTitle.module.css";

type Props = {
  children: ReactNode;
  /** "default": panel 직접 child, padding-top spacing-sm 으로 위 spacing 자체 책임
   *  "inset": panelHeader 같은 wrapper 안에 들어갈 때 — padding-top 0 (wrapper 가 spacing) */
  variant?: "default" | "inset";
};

export default function PanelTitle({ children, variant = "default" }: Props) {
  return <h2 className={cn(styles.title, variant === "inset" && styles.inset)}>{children}</h2>;
}
