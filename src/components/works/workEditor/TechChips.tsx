"use client";

import { getTechIcon } from "@/data/techIcons";
import { X } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import styles from "./ExtraInfoViews.module.css";

/** 기술 칩 — 목록 카드 · 랜딩에 쓰이는 기술 이름 */
export function TechChips({
  items,
  onItemsChange,
  labels,
}: {
  items: string[];
  onItemsChange: (next: string[]) => void;
  labels: { remove: string; empty: string };
}) {
  if (items.length === 0) return <p className={styles.empty}>{labels.empty}</p>;
  const remove = (item: string) => onItemsChange(items.filter((x) => x !== item));
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
