"use client";

import { Eraser } from "lucide-react";
import styles from "./BilingualInputPair.module.css";

export interface BilingualValue {
  ko: string;
  en: string;
}

export interface BilingualInputPairProps {
  value: BilingualValue;
  onChange: (next: BilingualValue) => void;
  /** 공통 placeholder — ko/en 둘 다 동일. 별도 지정 필요 시 koPlaceholder/enPlaceholder 사용 */
  placeholder?: string;
  koPlaceholder?: string;
  enPlaceholder?: string;
  /** 인풋 type — text (default), email, url 등 */
  type?: string;
  /** wrap 너비 — 기본 100% (부모 따라). inline 한 줄용은 "fit" */
  width?: "full" | "fit";
  /** Enter 키 입력 시 호출 — IME composition 가드 포함 */
  onEnter?: () => void;
}

/**
 * KO / EN 배지가 input 좌측 안쪽에 박힌 bilingual input 쌍.
 * TagNotesEditor / WorkEditor 팀원 이름 등에서 공용 사용.
 */
export default function BilingualInputPair({
  value,
  onChange,
  placeholder = "",
  koPlaceholder,
  enPlaceholder,
  type = "text",
  width = "full",
  onEnter,
}: BilingualInputPairProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!onEnter) return;
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter();
    }
  };
  return (
    <div className={`${styles.pair} ${width === "fit" ? styles.pairFit : ""}`}>
      <label className={styles.wrap} data-cursor="text">
        <span className={styles.badge}>KO</span>
        <input
          type={type}
          className={styles.input}
          value={value.ko}
          onChange={(e) => onChange({ ...value, ko: e.target.value })}
          placeholder={koPlaceholder ?? placeholder}
          onKeyDown={handleKeyDown}
        />
        {value.ko && (
          <button
            type="button"
            className={styles.clearBtn}
            data-cursor="big"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange({ ...value, ko: "" });
            }}
            aria-label="clear KO"
            title="지우기"
          >
            <Eraser size={11} strokeWidth={2} />
          </button>
        )}
      </label>
      <label className={styles.wrap} data-cursor="text">
        <span className={styles.badge}>EN</span>
        <input
          type={type}
          className={styles.input}
          value={value.en}
          onChange={(e) => onChange({ ...value, en: e.target.value })}
          placeholder={enPlaceholder ?? placeholder}
          onKeyDown={handleKeyDown}
        />
        {value.en && (
          <button
            type="button"
            className={styles.clearBtn}
            data-cursor="big"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange({ ...value, en: "" });
            }}
            aria-label="clear EN"
            title="지우기"
          >
            <Eraser size={11} strokeWidth={2} />
          </button>
        )}
      </label>
    </div>
  );
}
