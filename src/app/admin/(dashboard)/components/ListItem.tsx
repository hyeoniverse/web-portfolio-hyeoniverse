import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/utils/cn";
import styles from "./List.module.css";

type Props = ComponentPropsWithoutRef<"li"> & {
  /** layout:
   *  - "row" (default) : 단일 라인, horizontal flex (status + title + date 등)
   *  - "column"        : 다단 stack (header + body + footer 등)
   *  - "grid"          : column-aligned grid row (grid-template-columns 은 className 으로 직접)
   * custom layout 필요하면 className 으로 display override (자체 className 이 .itemRow 의 flex 를 override). */
  layout?: "row" | "column" | "grid";
};

/** li wrapper — base padding + hairline divider (마지막 item 은 자동 strip). */
export default function ListItem({ layout = "row", className, children, ...rest }: Props) {
  const layoutClass = {
    row: styles.itemRow,
    column: styles.itemColumn,
    grid: styles.itemGrid,
  }[layout];

  return (
    <li className={cn(layoutClass, className)} {...rest}>
      {children}
    </li>
  );
}
