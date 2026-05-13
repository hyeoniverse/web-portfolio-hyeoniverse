import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import Tooltip from "@/components/ui/Tooltip";
import styles from "../RichTextEditor.module.css";

// ── Toolbar button with Tooltip ──
type TBtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { tooltip?: ReactNode; active?: boolean; square?: boolean };

const TBtn = forwardRef<HTMLButtonElement, TBtnProps>(function TBtn(
  { tooltip, active, square, className, children, ...props },
  ref,
) {
  const cls = [styles.toolbarBtn, active && styles.toolbarBtnActive, square && styles.toolbarBtnSquare, className]
    .filter(Boolean).join(" ");
  const btn = (
    <button
      ref={ref}
      type="button"
      className={cls}
      onMouseDown={(e) => { e.preventDefault(); props.onMouseDown?.(e as React.MouseEvent<HTMLButtonElement>); }}
      {...props}
      style={{ ...props.style, ...(props.disabled ? { opacity: 0.35, cursor: "not-allowed" } : {}) }}
    >
      {children}
    </button>
  );
  if (!tooltip) return btn;
  return <Tooltip content={tooltip} delay={500} placement="top">{btn}</Tooltip>;
});

export default TBtn;
