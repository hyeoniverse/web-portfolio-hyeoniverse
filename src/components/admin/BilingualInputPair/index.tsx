"use client";

import { Eraser } from "@/components/icons";
import type { LocalizedText } from "@/types/common";
import styles from "./BilingualInputPair.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";

export interface BilingualInputPairProps {
  value: LocalizedText;
  onChange: (next: LocalizedText) => void;
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
  /** wrap 높이 — sm (28px, TagNotesEditor 인라인 28px alignment) / md (32px, 일반 폼). 기본 md */
  size?: "sm" | "md";
  /** ko/en 배치 — auto (auto-fit, 좁으면 wrap, 기본) / row (항상 1fr 1fr 로 강제 나란히) */
  layout?: "auto" | "row";
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
  size = "md",
  layout = "auto",
}: BilingualInputPairProps) {
  const { t } = useLanguage();
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!onEnter) return;
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter();
    }
  };
  return (
    <div className={`${styles.pair} ${width === "fit" ? styles.pairFit : ""} ${layout === "row" ? styles.pairRow : ""}`}>
      <label className={`${styles.wrap} ${size === "sm" ? styles.wrapSm : ""}`} data-cursor="text">
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
          <Pressable
            className={styles.clearBtn}
            data-cursor="big"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange({ ...value, ko: "" });
            }}
            aria-label={`${t("common.clear")} KO`}
            title={t("common.clear")}
          >
            <Eraser size={11} strokeWidth={2} />
          </Pressable>
        )}
      </label>
      <label className={`${styles.wrap} ${size === "sm" ? styles.wrapSm : ""}`} data-cursor="text">
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
          <Pressable
            className={styles.clearBtn}
            data-cursor="big"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange({ ...value, en: "" });
            }}
            aria-label={`${t("common.clear")} EN`}
            title={t("common.clear")}
          >
            <Eraser size={11} strokeWidth={2} />
          </Pressable>
        )}
      </label>
    </div>
  );
}
