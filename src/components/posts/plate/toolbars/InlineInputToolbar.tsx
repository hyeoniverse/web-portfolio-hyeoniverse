"use client";

import React, { useRef, useCallback } from "react";
import TBtn from "../TBtn";
import { useOutsideClick } from "../hooks";
import styles from "../../RichTextEditor.module.css";

interface InlineInputToolbarProps {
  label: string;
  visible: boolean;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  onClose: () => void;
  placeholder?: string;
  inputType?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default React.memo(function InlineInputToolbar({
  label, visible, value, onChange, onSubmit, onClose,
  placeholder = "https://...", inputType = "text", inputRef: externalRef,
}: InlineInputToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = externalRef || internalRef;

  useOutsideClick(toolbarRef, visible, useCallback(() => {
    onClose();
  }, [onClose]));

  return (
    <div ref={toolbarRef} className={`${styles.contextToolbar} ${!visible ? styles.contextToolbarHidden : ""}`}>
      <div className={styles.contextToolbarRow}>
        <span className={styles.contextToolbarLabel}>{label}</span>
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
    </div>
  );
})
