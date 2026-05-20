"use client";

import { forwardRef, type ReactNode, type MouseEvent } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/utils";
import { useSoundManager } from "@/hooks/useSoundManager";
import LoadingDots from "./LoadingDots";
import styles from "./Button.module.css";

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "outline" | "subtle" | "ghost" | "link" | "difference";
type ButtonShape = "capsule" | "circle" | "square";
type ButtonSize = "2xs" | "xs" | "sm" | "md" | "lg" | "xl";
type ButtonTone = "default" | "danger";

interface ButtonBaseProps {
  variant?: ButtonVariant;
  shape?: ButtonShape;
  size?: ButtonSize;
  tone?: ButtonTone;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
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

type ButtonProps = ButtonAsButton | ButtonAsLink;

/* --------------------------------------------------------------------------
   Component
   -------------------------------------------------------------------------- */

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      variant = "primary",
      shape = "capsule",
      size = "md",
      tone = "default",
      fullWidth,
      disabled,
      loading,
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

    const isDisabled = disabled || loading;

    const classes = cn(
      styles.btn,
      styles[`variant-${variant}`],
      styles[`shape-${shape}`],
      styles[`size-${size}`],
      tone !== "default" && styles[`tone-${tone}`],
      fullWidth && styles.fullWidth,
      active && styles.active,
      isDisabled && styles.disabled,
      className,
    );

    const handleMouseEnter = () => {
      if (!soundDisabled && !isDisabled) playSound("hover");
    };

    const content = loading ? (
      <LoadingDots />
    ) : (
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
        if (!soundDisabled && !isDisabled) playSound("click");
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
            aria-disabled={isDisabled || undefined}
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
    // onDrag/onDragStart/onDragEnd/onAnimation* — framer-motion 의 motion.button 이 이름 같지만 다른 시그니처라 spread 시 타입 충돌
    const {
      onClick,
      type,
      onDrag: _onDrag,
      onDragStart: _onDragStart,
      onDragEnd: _onDragEnd,
      onAnimationStart: _onAnimationStart,
      onAnimationEnd: _onAnimationEnd,
      onAnimationIteration: _onAnimationIteration,
      ...buttonRest
    } = rest as ButtonAsButton;
    void _onDrag; void _onDragStart; void _onDragEnd;
    void _onAnimationStart; void _onAnimationEnd; void _onAnimationIteration;

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      if (!soundDisabled && !isDisabled) playSound("click");
      onClick?.(e);
    };

    return (
      <motion.button
        ref={ref as React.Ref<HTMLButtonElement>}
        {...buttonRest}
        type={type ?? "button"}
        className={classes}
        disabled={isDisabled}
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
        whileTap={!isDisabled ? { scale: 0.97 } : undefined}
      >
        {content}
      </motion.button>
    );
  },
);

Button.displayName = "Button";
export default Button;
