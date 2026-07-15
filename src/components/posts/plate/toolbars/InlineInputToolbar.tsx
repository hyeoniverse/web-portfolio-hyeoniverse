"use client";

import React, { useRef, useEffect } from "react";
import TBtn from "../TBtn";
import FloatingBar from "./FloatingBar";
import styles from "../../RichTextEditor.module.css";

interface InlineInputToolbarProps {
  label: string;
  visible: boolean;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  onClose: () => void;
  /** 삽입 대상(선택 영역)에 앵커할 rect */
  getAnchorRect: () => DOMRect;
  placeholder?: string;
  inputType?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

// 단일 입력 바(임베드 등) — 대상 선택에 앵커된 FloatingBar (도킹형 대체).
export default React.memo(function InlineInputToolbar({
  label, visible, value, onChange, onSubmit, onClose, getAnchorRect,
  placeholder = "https://...", inputType = "text", inputRef: externalRef,
}: InlineInputToolbarProps) {
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = externalRef || internalRef;

  // 바깥 클릭 시 닫기 — body 로 portal 되므로 data-inline-input 으로 내부 판별
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-inline-input]") || t.closest("[data-slate-editor]")) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible, onClose]);

  return (
    <FloatingBar inline open={visible} getAnchorRect={getAnchorRect}>
      {/* display:contents 래퍼 — 바깥 클릭 판별 + 인풋 focus 위해 mousedown 전파 차단 */}
      <div data-inline-input style={{ display: "contents" }} onMouseDown={(e) => e.stopPropagation()}>
        <span className={styles.floatingBarLabel}>{label}</span>
        <div className={styles.linkInputWrap}>
          <input
            ref={ref}
            type={inputType}
            className={styles.linkInput}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim()) {
                onSubmit(value.trim());
                onClose();
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
          />
          <TBtn
            onClick={() => {
              if (value.trim()) {
                onSubmit(value.trim());
                onClose();
              }
            }}
            tooltip="삽입"
          >
            ✓
          </TBtn>
          <TBtn onClick={onClose} tooltip="취소">×</TBtn>
        </div>
      </div>
    </FloatingBar>
  );
})
