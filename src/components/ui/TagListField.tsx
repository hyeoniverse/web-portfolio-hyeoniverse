"use client";

import { useState, type KeyboardEvent } from "react";
import Chip, { useChipReorder } from "./Chip";
import Input from "./Input";
import styles from "./TagListField.module.css";

interface TagListFieldProps {
  /** comma(or separator)-joined string */
  value: string;
  onChange: (next: string) => void;
  label?: string;
  hint?: string;
  placeholder?: string;
  /** 저장 시 join 에 쓰는 구분자. 기본 ", " */
  separator?: string;
  /** Enter 외에 "," 도 add trigger 로 쓸지 (scope/tag 입력처럼) */
  commaAsAdd?: boolean;
  /** Input 내부 좌측 inline 배지 (KO/EN) — Field 의 langBadge 와 동일 패턴 */
  langBadge?: "ko" | "en";
  /** Input 크기 — 기본 md */
  size?: "xs" | "sm" | "md";
}

export default function TagListField({
  value,
  onChange,
  label,
  hint,
  placeholder,
  separator = ", ",
  commaAsAdd = false,
  langBadge,
  size = "md",
}: TagListFieldProps) {
  const [input, setInput] = useState("");
  /* commaAsAdd 모드: 저장된 값 split = separator. 그 외엔 콤마 split + trim (bulk paste 지원) */
  const tags = value
    ? commaAsAdd
      ? value.split(separator).filter(Boolean)
      : value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const commit = (next: string[]) => onChange(next.join(separator));

  const { itemProps } = useChipReorder((from, to) => {
    const next = [...tags];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  });

  const addTags = () => {
    if (commaAsAdd) {
      const tag = input.trim();
      if (tag && !tags.includes(tag)) commit([...tags, tag]);
    } else {
      const incoming = input.split(",").map((s) => s.trim()).filter(Boolean);
      if (incoming.length === 0) return;
      const merged = [...tags];
      for (const tag of incoming) {
        if (!merged.includes(tag)) merged.push(tag);
      }
      commit(merged);
    }
    setInput("");
  };

  const removeTag = (idx: number) => {
    commit(tags.filter((_, i) => i !== idx));
  };

  /* Backspace 처리만 별도 — Enter 는 Input 의 onAdd 가 받음 */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (commaAsAdd && e.key === ",") {
      e.preventDefault();
      addTags();
      return;
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className="tw:flex tw:flex-col tw:items-stretch tw:gap-sm">
      {label && (
        <label className={styles.label}>
          {label}
          {hint && <span className={styles.hint}>{hint}</span>}
        </label>
      )}
      {tags.length > 0 && (
        <div className="tw:flex tw:flex-wrap tw:gap-xs">
          {tags.map((tag, i) => {
            const { dragging, dropSide, ...handlers } = itemProps(i);
            return (
              <Chip
                key={`${tag}-${i}`}
                variant="capsule"
                showHandle
                onRemove={() => removeTag(i)}
                dragging={dragging}
                dropSide={dropSide}
                dragHandlers={{ draggable: true, ...handlers }}
              >
                {tag}
              </Chip>
            );
          })}
        </div>
      )}
      <Input
        size={size}
        value={input}
        onChange={setInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        onAdd={addTags}
        inlineLabel={langBadge ? langBadge.toUpperCase() : undefined}
      />
    </div>
  );
}
