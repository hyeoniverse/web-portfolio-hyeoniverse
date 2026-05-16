import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/utils/cn";
import styles from "./List.module.css";

type Props = ComponentPropsWithoutRef<"li"> & {
  /** layout:
   *  - "row" (default) : 단일 라인, horizontal flex (status + title + date 등)
   *  - "column"        : 다단 stack (header + body + footer 등)
   *  - "grid"          : column-aligned grid row (grid-template-columns 은 className 으로 직접)
   *  - "base"          : padding/divider 만, display 없음 — 완전 custom layout
   */
  layout?: "row" | "column" | "grid" | "base";
};

/** li wrapper — base padding + hairline divider (마지막 item 은 자동 strip).
 *  layout prop 으로 자주 쓰는 4가지 패턴 커버. */
export default function ListItem({ layout = "row", className, children, ...rest }: Props) {
  const layoutClass = {
    row: styles.itemRow,
    column: styles.itemColumn,
    grid: styles.itemGrid,
    base: styles.itemBase,
  }[layout];

  return (
    <li className={cn(layoutClass, className)} {...rest}>
      {children}
    </li>
  );
}
