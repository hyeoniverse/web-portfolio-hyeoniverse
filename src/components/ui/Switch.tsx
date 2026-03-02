"use client";

import { useState, useCallback } from "react";
import styles from "./Switch.module.css";
import { cn } from "@/utils";

interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  name?: string;
}

function Switch({
  checked: controlledChecked,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  className,
  name,
}: SwitchProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = controlledChecked ?? internalChecked;

  const toggle = useCallback(() => {
    if (disabled) return;
    const next = !isChecked;
    if (controlledChecked === undefined) setInternalChecked(next);
    onCheckedChange?.(next);
  }, [disabled, isChecked, controlledChecked, onCheckedChange]);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      data-state={isChecked ? "checked" : "unchecked"}
      data-disabled={disabled || undefined}
      disabled={disabled}
      className={cn(styles.root, className)}
      onClick={toggle}
      name={name}
    >
      <span
        className={styles.thumb}
        data-state={isChecked ? "checked" : "unchecked"}
      />
    </button>
  );
}

export { Switch };
