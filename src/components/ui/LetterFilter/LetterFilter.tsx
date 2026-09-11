"use client";

import styles from "./LetterFilter.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";

/* 쌍자음 → 기본형 묶음 (예: ㄲ → ㄱ). 한글 syllable code → CHOSUNG index → 기본 letter. */
const CHOSUNG_GROUPED = [
  "ㄱ", "ㄱ", "ㄴ", "ㄷ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅂ", "ㅅ",
  "ㅅ", "ㅇ", "ㅈ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

export const KOREAN_LETTERS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
export const ENGLISH_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const LETTER_ETC = "#";

/** 문자열의 첫 글자 → letter 그룹. 한글 → 초성, 영문 → 대문자, 그 외 → "#". */
export function getLetterInitial(s: string): string {
  const c = s.charAt(0);
  const code = c.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    return CHOSUNG_GROUPED[Math.floor((code - 0xac00) / 588)];
  }
  if (/[A-Za-z]/.test(c)) return c.toUpperCase();
  return LETTER_ETC;
}

interface LetterFilterProps {
  /** 표시할 letter 배열 — 보통 [...KOREAN_LETTERS, ...ENGLISH_LETTERS, LETTER_ETC]. */
  letters: string[];
  /** 현재 선택된 letter 집합 (multiple). 비어있으면 전체. */
  active: Set<string>;
  /** letter 클릭 시 호출 — caller 가 active set toggle. */
  onToggle: (letter: string) => void;
  /** "전체" 버튼 클릭 시 — active 클리어. 미제공 시 "전체" 버튼 미표시. */
  onClear?: () => void;
  /** letter 가 실제 데이터에 존재하는지 여부 — false 면 disabled (회색·non-interactive). */
  hasLetter?: (letter: string) => boolean;
  className?: string;
}

/**
 * 철자 필터 chip row — 한글 초성 + 영문 대문자 + 기타(#) 그룹.
 * /posts/tags · admin 카테고리/태그 에디터 · 태그 dropdown 등에서 공통으로 사용.
 */
export default function LetterFilter({
  letters,
  active,
  onToggle,
  onClear,
  hasLetter,
  className,
}: LetterFilterProps) {
  const { t } = useLanguage();
  return (
    <div className={`${styles.row} ${className ?? ""}`.trim()}>
      {onClear && (
        <Pressable
          type="button"
          className={`${styles.btn} ${active.size === 0 ? styles.btnActive : ""}`}
          onClick={onClear}
          data-clickable="true"
        >
          {t("common.all")}
        </Pressable>
      )}
      {letters.map((l) => {
        const has = hasLetter ? hasLetter(l) : true;
        const isActive = active.has(l);
        return (
          <Pressable
            key={l}
            type="button"
            className={`${styles.btn} ${isActive ? styles.btnActive : ""} ${!has ? styles.btnDisabled : ""}`}
            onClick={() => has && onToggle(l)}
            disabled={!has}
            data-clickable={has ? "true" : undefined}
          >
            {l}
          </Pressable>
        );
      })}
    </div>
  );
}
