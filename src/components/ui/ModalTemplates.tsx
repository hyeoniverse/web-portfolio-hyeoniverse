"use client";

import { useState } from "react";
import { useModalStore } from "@/stores/modalStore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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

  return (
    <div className={styles.body}>
      <p className={styles.desc}>{desc}</p>
      <div className={styles.actions}>
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
        </Button>
      </div>
    </div>
  );
}

/* ── ModalConfirm ── */
/* 메시지 + [취소] [확인] */

interface ModalConfirmProps {
  desc: string;
  cancelText?: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ModalConfirm({
  desc,
  cancelText = "Cancel",
  confirmText = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: ModalConfirmProps) {
  const { closeModal } = useModalStore();

  return (
    <div className={styles.body}>
      <p className={styles.desc}>{desc}</p>
      <div className={styles.actions}>
        <Button
          variant="outline"
          size="sm"
          soundDisabled
          onClick={() => {
            closeModal();
            onCancel?.();
          }}
        >
          {cancelText}
        </Button>
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
        </Button>
      </div>
    </div>
  );
}

/* ── ModalPrompt ── */
/* 메시지 + 힌트 + 입력 + 검증 + [취소] [확인] */

interface ModalPromptProps {
  desc?: string;
  hint?: string;
  placeholder?: string;
  inputType?: string;
  /** 입력값 검증. 미제공 시 비어있지 않으면 통과 */
  validate?: (value: string) => boolean;
  cancelText?: string;
  confirmText?: string;
  danger?: boolean;
  error?: string;
  /** false면 onConfirm에서 직접 모달을 닫아야 함 (비동기 검증 등) */
  closeOnConfirm?: boolean;
  onConfirm: (value: string) => void;
  onCancel?: () => void;
}

export function ModalPrompt({
  desc,
  hint,
  placeholder,
  inputType,
  validate,
  cancelText = "Cancel",
  confirmText = "Confirm",
  danger = false,
  error,
  closeOnConfirm = true,
  onConfirm,
  onCancel,
}: ModalPromptProps) {
  const [input, setInput] = useState("");
  const { closeModal } = useModalStore();

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
      <div className={styles.actions}>
        <Button
          variant="outline"
          size="sm"
          soundDisabled
          onClick={() => {
            closeModal();
            onCancel?.();
          }}
        >
          {cancelText}
        </Button>
        <Button
          variant="primary"
          size="sm"
          soundDisabled
          className={danger ? styles.dangerBtn : undefined}
          disabled={!isValid}
          onClick={handleConfirm}
        >
          {confirmText}
        </Button>
      </div>
    </div>
  );
}
