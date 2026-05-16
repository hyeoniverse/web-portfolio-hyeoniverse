import { type ComponentPropsWithoutRef, type Ref } from "react";
import { cn } from "@/utils/cn";
import styles from "./Panel.module.css";

type Props = ComponentPropsWithoutRef<"div"> & {
  /** flex (column, default) — vertical stacking. grid — 2D layout (cols 등은 className 으로 지정) */
  variant?: "flex" | "grid";
  ref?: Ref<HTMLDivElement>;
};

/** Section 안의 컨텐츠 container. variant 가 layout 결정, className 으로 구체 grid template 등 추가. */
export default function Panel({ variant = "flex", className, children, ref, ...rest }: Props) {
  const baseClass = variant === "grid" ? styles.panelGrid : styles.panelFlex;
  return (
    <div ref={ref} className={cn(baseClass, className)} {...rest}>
      {children}
    </div>
  );
}
