import styles from "./CloseIcon.module.css";

interface CloseIconProps {
  active?: boolean;
  className?: string;
}

/**
 * Minus → X morph icon.
 * Wrap the trigger element with `data-close-trigger` to activate on hover.
 * Or pass `active` to force the X state.
 */
export default function CloseIcon({ active, className }: CloseIconProps) {
  return (
    <span
      className={`${styles.root} ${className ?? ""}`}
      {...(active ? { "data-active": "" } : {})}
    >
      <span className={styles.line} />
      <span className={styles.line} />
    </span>
  );
}
