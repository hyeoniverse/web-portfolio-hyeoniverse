import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/utils/cn";
import styles from "./List.module.css";

type Props = ComponentPropsWithoutRef<"ul">;

/** ul wrapper — list-style 리셋 + flex column.
 *  ol 이 필요하면 별도 컴포넌트 만들거나 className prop 으로 처리. */
export default function List({ className, children, ...rest }: Props) {
  return (
    <ul className={cn(styles.list, className)} {...rest}>
      {children}
    </ul>
  );
}
