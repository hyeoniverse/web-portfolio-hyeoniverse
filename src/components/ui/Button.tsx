"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { useSoundManager } from "@/hooks/useSoundManager";
import { fadeInUpScale } from "@/animations";
import styles from "./Button.module.css";

interface ButtonProps {
  style?: "primary" | "secondary" | "teritary" | "outline" | "underline";
  size?: "sm" | "md" | "lg" | "xl" | "xl2";
  weight?: "light" | "normal" | "bold";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  href?: string;
  active?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right" | "both";
}

export default function Button({
  type = "button",
  size = "md",
  weight = "normal",
  style = "primary",
  href,
  onClick,
  disabled,
  className,
  active,
  children,
  icon,
  iconPosition = "left",
}: ButtonProps) {
  const { playSound } = useSoundManager();

  const buttonClasses = clsx(
    styles.button,
    styles[style],
    styles[size],
    styles[weight],
    active && styles.active,
    className
  );

  const handleClick = () => {
    playSound("click");
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
    }
    onClick?.();
  };

  return (
    <motion.button
      type={type}
      className={buttonClasses}
      disabled={disabled}
      onMouseEnter={() => playSound("hover")}
      onClick={handleClick}
      variants={fadeInUpScale}
      whileHover={
        !disabled
          ? { scale: 1.01, y: -2, transition: { duration: 0.2 } }
          : undefined
      }
      whileTap={!disabled ? { scale: 0.95 } : undefined}
    >
      {icon && (iconPosition === "left" || iconPosition === "both") && (
        <span className={styles.icon}>{icon}</span>
      )}
      <span className={styles.label}>{children}</span>
      {icon && (iconPosition === "right" || iconPosition === "both") && (
        <span className={styles.icon}>{icon}</span>
      )}
    </motion.button>
  );
}
