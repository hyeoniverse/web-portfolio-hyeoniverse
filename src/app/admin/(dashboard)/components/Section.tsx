import { type ComponentPropsWithoutRef, type Ref } from "react";
import { cn } from "@/utils/cn";
import styles from "./Panel.module.css";

type Props = ComponentPropsWithoutRef<"section"> & {
  /** 외부에서 section element 에 ref 잡기 위함 (예: 클릭 감지) */
  ref?: Ref<HTMLElement>;
};

/** 대시보드 컨텐츠 그룹 단위 wrapper.
 *  구조: <Section> > <SectionHeader> + <Panel> ... */
export default function Section({ className, children, ref, ...rest }: Props) {
  return (
    <section ref={ref} className={cn(styles.section, className)} {...rest}>
      {children}
    </section>
  );
}
