import { type MouseEvent } from "react";
import CloseIcon from "./CloseIcon";
import { cn } from "@/utils/cn";
import styles from "./CloseButton.module.css";

type Size = "xs" | "sm" | "md" | "lg";

interface Props {
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
  title?: string;
  /** xs (20) | sm (24, default) | md (32) | lg (38) */
  size?: Size;
  className?: string;
}

/** Button wrapping CloseIcon with iconBtn pattern + data-close-trigger.
 *  CloseIcon 의 minus → X morph 는 hover 시 자동 (data-close-trigger).
 */
export default function CloseButton({ onClick, ariaLabel = "close", title, size = "sm", className }: Props) {
  return (
    <button
      type="button"
      className={cn(styles.btn, styles[size], className)}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      data-close-trigger
    >
      <CloseIcon />
    </button>
  );
}
