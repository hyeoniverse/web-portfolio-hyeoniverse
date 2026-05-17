import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/utils/cn";
import styles from "./Panel.module.css";

type Props = ComponentPropsWithoutRef<"div"> & {
  /** vertical padding 제거 — wrapper/spacer 용도일 때 켜기 (기본 false) */
  flush?: boolean;
};

/** Panel 의 직접 자식. 구체 styling 은 className prop 으로 추가. */
export default function Item({ flush, className, children, ...rest }: Props) {
  return (
    <div className={cn(styles.item, flush && styles.itemFlush, className)} {...rest}>
      {children}
    </div>
  );
}
