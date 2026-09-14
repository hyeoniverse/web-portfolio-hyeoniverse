import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import Tooltip from "@/components/ui/Tooltip";
import styles from "../RichTextEditor.module.css";
import Pressable from "@/components/ui/Pressable";

// ── Toolbar button with Tooltip ──
type TBtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { tooltip?: ReactNode; active?: boolean; square?: boolean };

const TBtn = forwardRef<HTMLButtonElement, TBtnProps>(function TBtn(
  { tooltip, active, square, className, children, ...props },
  ref,
) {
  const cls = [styles.toolbarBtn, active && styles.toolbarBtnActive, square && styles.toolbarBtnSquare, className]
    .filter(Boolean).join(" ");
  /* 아이콘만 있는 버튼은 스크린리더에 읽을 이름이 없다 — 시각 툴팁으로만 쓰던 라벨을
     aria-label 로도 붙인다. 단, 글자(B·H1 등)가 이미 이름이 되는 버튼은 덮지 않는다
     (음성 입력이 보이는 글자와 이름을 맞추도록 — label-content-name-mismatch). 호출부가
     직접 준 aria-label 은 존중한다. 단축키 줄바꿈은 읽기 좋게 쉼표로 바꾼다. */
  const hasTextName = typeof children === "string" || typeof children === "number";
  const ariaLabel =
    (props["aria-label"] as string | undefined) ??
    (!hasTextName && typeof tooltip === "string" ? tooltip.replace(/\n+/g, ", ") : undefined);
  const btn = (
    <Pressable
      ref={ref}
      className={cls}
      onMouseDown={(e) => { e.preventDefault(); props.onMouseDown?.(e as React.MouseEvent<HTMLButtonElement>); }}
      {...props}
      aria-label={ariaLabel}
      aria-pressed={active ? true : undefined}
      style={{ ...props.style, ...(props.disabled ? { opacity: 0.35, cursor: "not-allowed" } : {}) }}
    >
      {children}
    </Pressable>
  );
  if (!tooltip) return btn;
  return <Tooltip content={tooltip} delay={500} placement="top">{btn}</Tooltip>;
});

export default TBtn;
