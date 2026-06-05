"use client";

import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import { useModalStore } from "@/stores/modalStore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ModalFooterContext } from "@/components/ui/Modal";
import styles from "./ModalTemplates.module.css";

/* ── ModalAlert ── */
/* 메시지 + [확인] */

interface ModalAlertProps {
  desc: string;
  confirmText?: string;
  onConfirm?: () => void;
}

export function ModalAlert({
  desc,
  confirmText = "OK",
  onConfirm,
}: ModalAlertProps) {
  const { closeModal } = useModalStore();
  const footerEl = useContext(ModalFooterContext);

  return (
    <div className={styles.body}>
      <p className={styles.desc}>{desc}</p>
      {footerEl && createPortal(
        <Button
          variant="primary"
          size="sm"
          soundDisabled
          onClick={() => {
            closeModal();
            onConfirm?.();
          }}
        >
          {confirmText}
        </Button>,
        footerEl,
      )}
    </div>
  );
}

/* ── ModalConfirm ── */
/* 메시지 + [확인]. 취소는 X close 버튼으로 통일 */

interface ModalConfirmProps {
  desc: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export function ModalConfirm({
  desc,
  confirmText = "Confirm",
  danger = false,
  onConfirm,
}: ModalConfirmProps) {
  const { closeModal } = useModalStore();
  const footerEl = useContext(ModalFooterContext);

  return (
    <div className={styles.body}>
      <p className={styles.desc}>{desc}</p>
      {footerEl && createPortal(
        <Button
          variant="primary"
          size="sm"
          soundDisabled
          className={danger ? styles.dangerBtn : undefined}
          onClick={() => {
            closeModal();
            onConfirm();
          }}
        >
          {confirmText}
        </Button>,
        footerEl,
      )}
    </div>
  );
}

/* ── ModalPrompt ── */
/* 메시지 + 힌트 + 입력 + 검증 + [확인]. 취소는 X close 버튼으로 통일 */

interface ModalPromptProps {
  desc?: string;
  hint?: string;
  placeholder?: string;
  inputType?: string;
  /** 입력값 검증. 미제공 시 비어있지 않으면 통과 */
  validate?: (value: string) => boolean;
  confirmText?: string;
  danger?: boolean;
  error?: string;
  /** false면 onConfirm에서 직접 모달을 닫아야 함 (비동기 검증 등) */
  closeOnConfirm?: boolean;
  onConfirm: (value: string) => void;
}

export function ModalPrompt({
  desc,
  hint,
  placeholder,
  inputType,
  validate,
  confirmText = "Confirm",
  danger = false,
  error,
  closeOnConfirm = true,
  onConfirm,
}: ModalPromptProps) {
  const [input, setInput] = useState("");
  const { closeModal } = useModalStore();
  const footerEl = useContext(ModalFooterContext);

  const isValid = validate ? validate(input) : input.trim().length > 0;

  const handleConfirm = () => {
    if (!isValid) return;
    if (closeOnConfirm) closeModal();
    onConfirm(input);
  };

  return (
    <div className={styles.body}>
      {desc && <p className={styles.desc}>{desc}</p>}
      {hint && <p className={styles.hint}>{hint}</p>}
      <Input
        className={styles.input}
        value={input}
        onChange={setInput}
        placeholder={placeholder}
        type={inputType}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleConfirm();
        }}
      />
      {error && <p className={styles.error}>{error}</p>}
      {footerEl && createPortal(
        <Button
          variant="primary"
          size="sm"
          soundDisabled
          className={danger ? styles.dangerBtn : undefined}
          disabled={!isValid}
          onClick={handleConfirm}
        >
          {confirmText}
        </Button>,
        footerEl,
      )}
    </div>
  );
}
