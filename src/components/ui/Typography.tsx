import type React from "react";
import { cn } from "@/utils";
import styles from "./Typography.module.css";

export interface TypographyProps {
  variant?:
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6"
    | "body1"
    | "body2"
    | "caption"
    | "overline";
  component?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
  color?: "primary" | "secondary" | "tertiary" | "muted" | "accent" | "inverse";
  align?: "left" | "center" | "right";
  weight?: "light" | "normal" | "medium" | "semibold" | "bold";
  gradient?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variantMapping = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  body1: "p",
  body2: "p",
  caption: "span",
  overline: "span",
} as const;

export const Typography: React.FC<TypographyProps> = ({
  variant = "body1",
  component,
  color = "primary",
  align = "left",
  weight,
  gradient = false,
  className,
  children,
  ...props
}) => {
  const Component = component || variantMapping[variant];

  return (
    <Component
      className={cn(
        styles.typography,
        styles[variant],
        styles[`color-${color}`],
        styles[`align-${align}`],
        weight && styles[`weight-${weight}`],
        gradient && styles.gradient,
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};
