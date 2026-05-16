import { type ComponentPropsWithoutRef, type CSSProperties, type Ref } from "react";
import { cn } from "@/utils/cn";
import styles from "./Panel.module.css";

type Props = ComponentPropsWithoutRef<"div"> & {
  /** layout 결정 — "flex" (default, column stack) | "grid" (2D) */
  variant?: "flex" | "grid";
  /** flex 일 때 방향 — "vertical" (default, column) | "horizontal" (row) */
  direction?: "vertical" | "horizontal";
  /** grid 일 때 grid-template-columns 값 (예: "auto 1fr", "1fr 1fr") */
  cols?: string;
  /** grid 일 때 grid-template-rows 값 */
  rows?: string;
  ref?: Ref<HTMLDivElement>;
};

/** Section 안의 컨텐츠 container.
 *  - flex: direction (vertical|horizontal) 으로 stacking 방향 제어
 *  - grid: cols / rows 로 template 직접 지정. child grid-area 등은 style/className 으로 */
export default function Panel({
  variant = "flex",
  direction,
  cols,
  rows,
  className,
  children,
  style,
  ref,
  ...rest
}: Props) {
  const baseClass = variant === "grid" ? styles.panelGrid : styles.panelFlex;

  const variantStyle: CSSProperties = {};
  if (variant === "flex" && direction === "horizontal") {
    variantStyle.flexDirection = "row";
  } else if (variant === "grid") {
    if (cols) variantStyle.gridTemplateColumns = cols;
    if (rows) variantStyle.gridTemplateRows = rows;
  }

  return (
    <div
      ref={ref}
      className={cn(baseClass, className)}
      style={{ ...variantStyle, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
