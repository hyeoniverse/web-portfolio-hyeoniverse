"use client";

import { forwardRef, type ReactNode, type MouseEvent } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/utils";
import { useSoundManager } from "@/hooks/useSoundManager";
import styles from "./Button.module.css";

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonShape = "capsule" | "circle" | "square";
type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

interface ButtonBaseProps {
  variant?: ButtonVariant;
  shape?: ButtonShape;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  active?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  className?: string;
  children?: ReactNode;
  soundDisabled?: boolean;
}

type ButtonAsButton = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    href?: undefined;
    external?: never;
  };

type ButtonAsLink = ButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
    href: string;
    external?: boolean;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/* --------------------------------------------------------------------------
   Component
   -------------------------------------------------------------------------- */

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      variant = "primary",
      shape = "capsule",
      size = "md",
      fullWidth,
      disabled,
      active,
      icon,
      iconPosition = "left",
      className,
      children,
      soundDisabled,
      ...rest
    },
    ref,
  ) => {
    const { playSound } = useSoundManager();

    const classes = cn(
      styles.btn,
      styles[`variant-${variant}`],
      styles[`shape-${shape}`],
      styles[`size-${size}`],
      fullWidth && styles.fullWidth,
      active && styles.active,
      disabled && styles.disabled,
      className,
    );

    const handleMouseEnter = () => {
      if (!soundDisabled && !disabled) playSound("hover");
    };

    const content = (
      <>
        {icon && iconPosition === "left" && (
          <span className={styles.icon}>{icon}</span>
        )}
        {children && <span className={styles.label}>{children}</span>}
        {icon && iconPosition === "right" && (
          <span className={styles.icon}>{icon}</span>
        )}
      </>
    );

    /* ---- Link (href 제공) ---- */
    if ("href" in rest && rest.href) {
      const { href, external, onClick, ...anchorRest } = rest as ButtonAsLink;

      const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
        if (!soundDisabled && !disabled) playSound("click");
        onClick?.(e);
      };

      if (external) {
        return (
          <a
            ref={ref as React.Ref<HTMLAnchorElement>}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={classes}
            aria-disabled={disabled || undefined}
            onMouseEnter={handleMouseEnter}
            onClick={handleLinkClick}
            {...anchorRest}
          >
            {content}
          </a>
        );
      }

      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={classes}
          aria-disabled={disabled || undefined}
          onMouseEnter={handleMouseEnter}
          onClick={handleLinkClick}
          {...(anchorRest as Omit<typeof anchorRest, "href">)}
        >
          {content}
        </Link>
      );
    }

    /* ---- Button (기본) ---- */
    const { onClick, type } = rest as ButtonAsButton;

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      if (!soundDisabled && !disabled) playSound("click");
      onClick?.(e);
    };

    return (
      <motion.button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type ?? "button"}
        className={classes}
        disabled={disabled}
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
        whileHover={
          !disabled ? { y: -1, transition: { duration: 0.2 } } : undefined
        }
        whileTap={!disabled ? { scale: 0.97 } : undefined}
      >
        {content}
      </motion.button>
    );
  },
);

Button.displayName = "Button";
export default Button;
