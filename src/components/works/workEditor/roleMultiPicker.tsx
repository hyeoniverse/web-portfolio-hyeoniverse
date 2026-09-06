"use client";

import styles from "../WorkEditor.module.css";
import { useState } from "react";
import { Check } from "@/components/icons";
import Chip, { useChipReorder } from "@/components/ui/Chip";
import Select from "@/components/ui/Select";
import { showToast } from "@/stores/toastStore";
// 역할 프리셋 — Select combobox 의 옵션. 직접 입력으로 자유로운 텍스트도 가능
export const ROLE_PRESETS_KO = ["기획", "디자인", "프론트엔드", "백엔드", "풀스택", "데이터", "PM", "QA", "DevOps", "모바일"];

export const ROLE_PRESETS_EN = ["Planning", "Design", "Frontend", "Backend", "Full-stack", "Data", "PM", "QA", "DevOps", "Mobile"];

/* ──────────────────────────────────────────────────────────────────────────
 * useRoleMultiPicker — 역할 multi-select 의 state + 렌더 node 분리.
 * select 와 chip 을 다른 위치에 배치하고 싶을 때 사용 (예: 팀원 폼 → chip 을 URL row 아래로). */
export function useRoleMultiPicker({
  value,
  onChange,
  presets,
  placeholder,
  lang,
}: {
  value: string;
  onChange: (v: string) => void;
  presets: string[];
  placeholder: string;
  lang: "ko" | "en";
}) {
  const [input, setInput] = useState("");
  const tokens = value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const setTokens = (next: string[]) => onChange(next.join(", "));
  const add = (v: string) => {
    const t = v.trim().replace(/,/g, "");
    if (!t) return;
    if (tokens.includes(t)) {
      showToast(lang === "ko" ? `이미 추가됨: ${t}` : `Already added: ${t}`, "info");
      setInput("");
      return;
    }
    setTokens([...tokens, t]);
    setInput("");
  };
  const remove = (idx: number) => setTokens(tokens.filter((_, i) => i !== idx));
  const { itemProps } = useChipReorder((from, to) => {
    const next = [...tokens];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setTokens(next);
  });
  const selectNode = (
    <Select
      combobox
      className={styles.roleSelect}
      value=""
      onChange={() => {}}
      inputValue={input}
      onInputChange={setInput}
      onAdd={(v) => add(v)}
      options={presets.map((p) => {
        const added = tokens.includes(p);
        return {
          value: p,
          label: p,
          selected: added,
          trailing: added ? <Check size={12} strokeWidth={2.5} /> : undefined,
        };
      })}
      placeholder={placeholder}
    />
  );
  const chipsNode = tokens.length > 0 ? (
    <div className={styles.categoryChipList}>
      {tokens.map((t, i) => {
        const { dragging, dropSide, ...handlers } = itemProps(i);
        return (
          <Chip
            key={`${t}-${i}`}
            variant="capsule"
            showHandle
            onRemove={() => remove(i)}
            dragging={dragging}
            dropSide={dropSide}
            dragHandlers={{ draggable: true, ...handlers }}
          >
            {t}
          </Chip>
        );
      })}
    </div>
  ) : null;
  return { selectNode, chipsNode };
}
