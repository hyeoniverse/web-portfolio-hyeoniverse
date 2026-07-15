"use client";

// ── 이벤트 관계(선행/후속) 선택 필드 ──
// 공통 Select(combobox)로 같은 달력의 다른 이벤트를 검색·선택해 추가, 선택 항목은 공통 Chip 으로 표시·제거.
import React, { useState } from "react";
import Select from "@/components/ui/Select";
import Chip from "@/components/ui/Chip/Chip";
import type { CalEvent } from "./model";
import styles from "./Calendar.module.css";

export default function EventRelationField({
  label, icon, selectedIds, candidates, resolveTitle, onAdd, onRemove, language, dropdownClassName, chipMaxLength,
}: {
  label: string;
  icon?: React.ReactNode;
  selectedIds: string[];
  candidates: CalEvent[];              // 추가 가능한 후보 (self·중복·순환 이미 제외)
  resolveTitle: (id: string) => string;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  language: string;
  dropdownClassName?: string;
  /** 칩 최대 글자수 (넘으면 …) */
  chipMaxLength?: number;
}) {
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const [q, setQ] = useState("");

  return (
    <div className={styles.relField}>
      <span className={styles.relFieldLabel}>{icon}{label}</span>
      <Select
        combobox
        value=""
        inputValue={q}
        onInputChange={setQ}
        onChange={() => {}}
        options={candidates.map((c) => ({ value: c.id, label: c.title || t("(제목 없음)", "(Untitled)") }))}
        onAdd={(v) => {
          const hit = candidates.find((c) => c.id === v) ?? candidates.find((c) => (c.title || "") === v);
          if (hit) { onAdd(hit.id); setQ(""); }
        }}
        placeholder={t("이벤트 검색해 추가", "Search events to add")}
        width="full"
        dropdownClassName={dropdownClassName}
      />
      {selectedIds.length > 0 && (
        <div className={styles.relChips}>
          {selectedIds.map((id) => (
            <Chip key={id} variant="capsule" truncate maxLength={chipMaxLength} onRemove={() => onRemove(id)}>{resolveTitle(id)}</Chip>
          ))}
        </div>
      )}
    </div>
  );
}
