"use client";

import { useState } from "react";
import { getTechIcon } from "@/data/techIcons";
import type { LocalizedText } from "@/data/projects";
import { GripVertical, X } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import styles from "./ExtraInfoViews.module.css";

/**
 * 기술 스택 편집기 — 한 줄에 [손잡이 | 로고 · 이름 | 설명 KO | 설명 EN | 삭제].
 * 설명은 칸을 열고 닫을 필요 없이 줄에서 바로 고치고, 손잡이를 끌어 순서를 바꾼다.
 */
export function TechTable({
  items,
  notes,
  onItemsChange,
  onNotesChange,
  labels,
}: {
  items: string[];
  notes: Record<string, LocalizedText>;
  onItemsChange: (next: string[]) => void;
  onNotesChange: (next: Record<string, LocalizedText>) => void;
  labels: { tech: string; ko: string; en: string; placeholder: string; remove: string; empty: string; drag: string };
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  if (items.length === 0) return <p className={styles.empty}>{labels.empty}</p>;

  const setNote = (item: string, lang: "ko" | "en", value: string) => {
    const cur = notes[item] ?? { ko: "", en: "" };
    const next = { ...cur, [lang]: value };
    /* 두 칸 다 비면 설명을 지운다 — 빈 설명이 남으면 상세 화면에 빈 설명 칸이 생긴다 */
    if (!next.ko.trim() && !next.en.trim()) {
      const { [item]: _drop, ...rest } = notes;
      onNotesChange(rest);
      return;
    }
    onNotesChange({ ...notes, [item]: next });
  };
  const remove = (item: string) => {
    onItemsChange(items.filter((x) => x !== item));
    if (item in notes) {
      const { [item]: _drop, ...rest } = notes;
      onNotesChange(rest);
    }
  };
  const drop = (to: number) => {
    if (dragIdx === null || dragIdx === to) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(to, 0, moved);
    onItemsChange(next);
  };
  const reset = () => { setDragIdx(null); setOverIdx(null); };

  return (
    <div className={styles.table} role="table">
      <div className={`${styles.tableRow} ${styles.tableHead}`} role="row">
        <span role="columnheader" aria-hidden />
        <span role="columnheader">{labels.tech}</span>
        <span role="columnheader">{labels.ko}</span>
        <span role="columnheader">{labels.en}</span>
        <span role="columnheader" aria-hidden />
      </div>
      {items.map((item, idx) => (
        <div
          key={item}
          role="row"
          className={`${styles.tableRow}${dragIdx === idx ? ` ${styles.tableRowDragging}` : ""}${overIdx === idx && dragIdx !== idx ? ` ${styles.tableRowOver}` : ""}`}
          /* 손잡이에서 누를 때만 끌 수 있다 — 입력칸에서 글자를 고르다 줄이 끌려가지 않게 */
          draggable={dragIdx === idx}
          onDragOver={(e) => { if (dragIdx !== null) { e.preventDefault(); setOverIdx(idx); } }}
          onDrop={(e) => { e.preventDefault(); drop(idx); reset(); }}
          onDragEnd={reset}
        >
          <span
            role="cell"
            className={styles.tableGrip}
            title={labels.drag}
            aria-label={labels.drag}
            onPointerDown={() => setDragIdx(idx)}
            onPointerUp={() => { if (overIdx === null) setDragIdx(null); }}
          >
            <GripVertical size={12} strokeWidth={2} />
          </span>
          <span className={styles.tableName} role="cell">
            {getTechIcon(item)}
            <span>{item}</span>
          </span>
          {(["ko", "en"] as const).map((lang) => (
            <span key={lang} role="cell">
              <input
                className={styles.tableInput}
                value={notes[item]?.[lang] ?? ""}
                onChange={(e) => setNote(item, lang, e.target.value)}
                placeholder={labels.placeholder}
                aria-label={`${item} ${lang === "ko" ? labels.ko : labels.en}`}
              />
            </span>
          ))}
          <span role="cell">
            <Pressable className={styles.tableRemove} onClick={() => remove(item)} aria-label={`${labels.remove}: ${item}`} title={labels.remove}>
              <X size={14} strokeWidth={2} />
            </Pressable>
          </span>
        </div>
      ))}
    </div>
  );
}
