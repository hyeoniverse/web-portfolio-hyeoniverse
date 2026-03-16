import React, { type ButtonHTMLAttributes, type ReactNode } from "react";
import Tooltip from "@/components/ui/Tooltip";
import styles from "../RichTextEditor.module.css";

// ── Toolbar button with Tooltip ──
function TBtn({
  tooltip,
  active,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tooltip?: ReactNode; active?: boolean }) {
  const cls = [styles.toolbarBtn, active && styles.toolbarBtnActive, className]
    .filter(Boolean).join(" ");
  const btn = (
    <button
      type="button"
      className={cls}
      onMouseDown={(e) => { e.preventDefault(); props.onMouseDown?.(e as React.MouseEvent<HTMLButtonElement>); }}
      {...props}
    >
      {children}
    </button>
  );
  if (!tooltip) return btn;
  return <Tooltip content={tooltip} delay={500} placement="top">{btn}</Tooltip>;
}

export default TBtn;
