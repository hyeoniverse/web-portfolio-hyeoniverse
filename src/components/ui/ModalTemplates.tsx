"use client";

import { useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalStore } from "@/stores/modalStore";
import { useLanguage } from "@/providers/LanguageProvider";
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
  /** desc 아래에 덧붙일 상세 — 대상 목록 등. (ModalConfirm 과 같은 규약) */
  children?: ReactNode;
}

export function ModalAlert({
  desc,
  confirmText = "OK",
  onConfirm,
  children,
}: ModalAlertProps) {
  const { closeModal } = useModalStore();
  const footerEl = useContext(ModalFooterContext);

  return (
    <div className={`${styles.body} ${styles.alertBody}`}>
      <p className={styles.desc}>{desc}</p>
      {children}
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
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  /** 취소 버튼에 동작 부여 — 미지정 시 단순 close. (X/esc/backdrop 은 항상 단순 close) */
  onCancel?: () => void;
  /** desc 아래에 덧붙일 상세 — 무엇이 바뀌는지 목록으로 보여줄 때 (선택) */
  children?: ReactNode;
}

export function ModalConfirm({
  desc,
  confirmText = "Confirm",
  cancelText,
  danger = false,
  onConfirm,
  onCancel,
  children,
}: ModalConfirmProps) {
  const { closeModal } = useModalStore();
  const { language } = useLanguage();
  const footerEl = useContext(ModalFooterContext);
  const cancel = cancelText ?? (language === "ko" ? "취소" : "Cancel");

  return (
    <div className={styles.body}>
      <p className={styles.desc}>{desc}</p>
      {children}
      {footerEl && createPortal(
        <>
          <Button variant="outline" size="sm" soundDisabled onClick={() => { closeModal(); onCancel?.(); }}>
            {cancel}
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
        </>,
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
  cancelText?: string;
  danger?: boolean;
  error?: string;
  /** false면 onConfirm에서 직접 모달을 닫아야 함 (비동기 검증 등) */
  closeOnConfirm?: boolean;
  /** Promise 반환 시(closeOnConfirm=false) 확인 버튼에 loading 표시 */
  onConfirm: (value: string) => void | Promise<void>;
}

export function ModalPrompt({
  desc,
  hint,
  placeholder,
  inputType,
  validate,
  confirmText = "Confirm",
  cancelText,
  danger = false,
  error,
  closeOnConfirm = true,
  onConfirm,
}: ModalPromptProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { closeModal } = useModalStore();
  const { language } = useLanguage();
  const footerEl = useContext(ModalFooterContext);
  const cancel = cancelText ?? (language === "ko" ? "취소" : "Cancel");

  const isValid = validate ? validate(input) : input.trim().length > 0;

  const handleConfirm = async () => {
    if (!isValid || loading) return;
    if (closeOnConfirm) {
      closeModal();
      onConfirm(input);
      return;
    }
    // 비동기 검증 — 완료까지 확인 버튼에 loading
    setLoading(true);
    try {
      await onConfirm(input);
    } finally {
      setLoading(false);
    }
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
        <>
          <Button variant="outline" size="sm" soundDisabled disabled={loading} onClick={() => closeModal()}>
            {cancel}
          </Button>
          <Button
            variant="primary"
            size="sm"
            soundDisabled
            className={danger ? styles.dangerBtn : undefined}
            disabled={!isValid || loading}
            loading={loading}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </>,
        footerEl,
      )}
    </div>
  );
}
