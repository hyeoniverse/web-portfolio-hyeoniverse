"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus } from "lucide-react";
import DraggableTag, { useTagDrag } from "./DraggableTag";
import Button from "./Button";
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
}

export default function TagListField({
  value,
  onChange,
  label,
  hint,
  placeholder,
  separator = ", ",
  commaAsAdd = false,
}: TagListFieldProps) {
  const [input, setInput] = useState("");
  /* commaAsAdd 모드: 저장된 값 split = separator. 그 외엔 콤마 split + trim (bulk paste 지원) */
  const tags = value
    ? commaAsAdd
      ? value.split(separator).filter(Boolean)
      : value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const commit = (next: string[]) => onChange(next.join(separator));

  const { itemProps } = useTagDrag((from, to) => {
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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" || (commaAsAdd && e.key === ",")) {
      e.preventDefault();
      addTags();
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label}>
          {label}
          {hint && <span className={styles.hint}>{hint}</span>}
        </label>
      )}
      {tags.length > 0 && (
        <div className={styles.tags}>
          {tags.map((tag, i) => (
            <DraggableTag
              key={`${tag}-${i}`}
              label={tag}
              index={i}
              onRemove={() => removeTag(i)}
              {...itemProps(i)}
            />
          ))}
        </div>
      )}
      <div className={styles.inputRow}>
        <Input
          size="sm"
          value={input}
          onChange={setInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <Button
          variant="outline"
          shape="circle"
          size="xs"
          onClick={addTags}
          disabled={!input.trim()}
          aria-label="Add"
          icon={<Plus size={14} strokeWidth={2} />}
        />
      </div>
    </div>
  );
}
