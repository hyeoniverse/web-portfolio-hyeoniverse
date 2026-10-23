"use client";

import { getTechIcon } from "@/data/techIcons";
import type { LocalizedText } from "@/data/projects";
import { X } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import styles from "./ExtraInfoViews.module.css";

/**
 * 기술 칩 — 목록 카드에 쓰이는 기술 이름만 고친다(설명은 랜딩 · 카드에 쓰이지 않아 칸을 두지 않는다).
 * 빼면 그 기술의 설명도 같이 지운다.
 */
export function TechChips({
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
  labels: { remove: string; empty: string };
}) {
  if (items.length === 0) return <p className={styles.empty}>{labels.empty}</p>;
  const remove = (item: string) => {
    onItemsChange(items.filter((x) => x !== item));
    if (item in notes) {
      const { [item]: _drop, ...rest } = notes;
      onNotesChange(rest);
    }
  };
  return (
    <ul className={styles.chips}>
      {items.map((item) => (
        <li key={item} className={styles.chip}>
          {getTechIcon(item)}
          <span>{item}</span>
          <Pressable className={styles.chipRemove} onClick={() => remove(item)} aria-label={`${labels.remove}: ${item}`} title={labels.remove}>
            <X size={12} strokeWidth={2} />
          </Pressable>
        </li>
      ))}
    </ul>
  );
}
