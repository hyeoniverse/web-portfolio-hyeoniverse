import CloseIcon from "./CloseIcon";
import { cn } from "@/utils/cn";
import styles from "./CloseButton.module.css";

interface Props {
  onClick: () => void;
  ariaLabel?: string;
  /** sm (24px, default) | md (button-h-sm) */
  size?: "sm" | "md";
  className?: string;
}

/** Button wrapping CloseIcon with iconBtn pattern + data-close-trigger.
 *  CloseIcon 의 minus → X morph 는 hover 시 자동 (data-close-trigger).
 */
export default function CloseButton({ onClick, ariaLabel = "close", size = "sm", className }: Props) {
  return (
    <button
      type="button"
      className={cn(styles.btn, size === "sm" ? styles.sm : styles.md, className)}
      onClick={onClick}
      aria-label={ariaLabel}
      data-close-trigger
    >
      <CloseIcon />
    </button>
  );
}
