"use client";

import { useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import type { BilingualCategory } from "@/types/common";
import CategoryReassignModal from "@/components/admin/CategoryReassignModal";
import DraggableTag from "@/components/ui/DraggableTag";
import T from "@/components/ui/T";
import styles from "../Settings.module.css";

interface CategoriesEditorProps {
  categories: BilingualCategory[];
  onChange: (cats: BilingualCategory[]) => void;
}

export default function CategoriesEditor({ categories, onChange }: CategoriesEditorProps) {
  const { t, language } = useLanguage();
  const [newKo, setNewKo] = useState("");
  const [newEn, setNewEn] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [reassignTarget, setReassignTarget] = useState<BilingualCategory | null>(null);

  const addCategory = () => {
    const ko = newKo.trim();
    const en = newEn.trim();
    if (ko && en && !categories.some((c) => c.ko === ko || c.en === en)) {
      onChange([...categories, { ko, en }]);
    }
    setNewKo("");
    setNewEn("");
  };

  const removeCategory = (idx: number) => {
    if (categories.length <= 1) {
      alert(t("admin.settings.categoryLastWarning"));
      return;
    }
    setReassignTarget(categories[idx]);
  };

  const handleReassignConfirm = async (
    assignments: { id: string; category: string }[],
    newCategories: BilingualCategory[],
  ) => {
    if (assignments.length > 0) {
      await fetch("/api/posts/reassign-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });
    }
    const remaining = categories.filter(
      (c) => c.ko !== reassignTarget?.ko || c.en !== reassignTarget?.en,
    );
    const merged = [
      ...remaining,
      ...newCategories.filter((nc) => !remaining.some((r) => r.ko === nc.ko)),
    ];
    onChange(merged);
    setReassignTarget(null);
  };

  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const next = [...categories];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    onChange(next);
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div>
      <div className={styles.catList}>
        {categories.map((cat, i) => (
          <DraggableTag
            key={`${cat.ko}-${cat.en}`}
            label={language === "ko" ? cat.ko : cat.en}
            index={i}
            dragging={dragIdx === i}
            over={overIdx === i && dragIdx !== i}
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
            onDrop={(e) => { e.preventDefault(); handleDrop(i); }}
            onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
            onRemove={() => removeCategory(i)}
          />
        ))}
      </div>
      <div className={styles.catInput}>
        <label className={styles.catInputGroup}>
          <span className={styles.catInputGroupLabel}><T k="admin.settings.categoryKoLabel" /></span>
          <input
            className={styles.fieldInput}
            type="text"
            value={newKo}
            onChange={(e) => setNewKo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addCategory(); }
            }}
          />
        </label>
        <label className={styles.catInputGroup}>
          <span className={styles.catInputGroupLabel}><T k="admin.settings.categoryEnLabel" /></span>
          <input
            className={styles.fieldInput}
            type="text"
            value={newEn}
            onChange={(e) => setNewEn(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addCategory(); }
            }}
          />
        </label>
        <button
          type="button"
          className={styles.catAddBtn}
          onClick={addCategory}
          disabled={!newKo.trim() || !newEn.trim()}
        >
          <T k="admin.settings.addCategory" />
        </button>
      </div>
      {reassignTarget && (
        <CategoryReassignModal
          category={reassignTarget}
          availableCategories={categories.filter(
            (c) => c.ko !== reassignTarget.ko || c.en !== reassignTarget.en,
          )}
          onConfirm={handleReassignConfirm}
          onCancel={() => setReassignTarget(null)}
        />
      )}
    </div>
  );
}
