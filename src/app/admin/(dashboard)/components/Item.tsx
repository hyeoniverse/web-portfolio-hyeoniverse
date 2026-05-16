import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/utils/cn";
import styles from "./Panel.module.css";

type Props = ComponentPropsWithoutRef<"div">;

/** Panel 의 직접 자식. 구체 styling 은 className prop 으로 추가. */
export default function Item({ className, children, ...rest }: Props) {
  return (
    <div className={cn(styles.item, className)} {...rest}>
      {children}
    </div>
  );
}
