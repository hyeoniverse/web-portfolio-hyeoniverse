import { forwardRef } from "react";
import { cn } from "@/utils";
import styles from "./Section.module.css";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: "section" | "div";
  fullHeight?: boolean;
  center?: boolean;
  clipOverflow?: boolean;
}

const Section = forwardRef<HTMLElement, SectionProps>(
  (
    { as: Tag = "section", fullHeight, center, clipOverflow, className, children, ...rest },
    ref,
  ) => (
    <Tag
      ref={ref as React.Ref<HTMLDivElement & HTMLElement>}
      className={cn(
        styles.section,
        fullHeight && styles.fullHeight,
        center && styles.center,
        clipOverflow && styles.clipOverflow,
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  ),
);

Section.displayName = "Section";
export default Section;
