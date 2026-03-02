"use client";

import { useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import CategoryReassignModal from "@/components/admin/CategoryReassignModal";
import styles from "../Settings.module.css";

interface CategoriesEditorProps {
  categories: string[];
  onChange: (cats: string[]) => void;
}

export default function CategoriesEditor({ categories, onChange }: CategoriesEditorProps) {
  const { t } = useLanguage();
  const [newCat, setNewCat] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string | null>(null);

  const addCategory = () => {
    const cat = newCat.trim();
    if (cat && !categories.includes(cat)) {
      onChange([...categories, cat]);
    }
    setNewCat("");
  };

  const removeCategory = (cat: string) => {
    const remaining = categories.filter((c) => c !== cat);
    if (remaining.length === 0) {
      alert(t("admin.settings.categoryLastWarning"));
      return;
    }
    setReassignTarget(cat);
  };

  const handleReassignConfirm = async (
    assignments: { id: string; category: string }[],
    newCategories: string[],
  ) => {
    if (assignments.length > 0) {
      await fetch("/api/posts/reassign-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });
    }
    const remaining = categories.filter((c) => c !== reassignTarget);
    const merged = [...remaining, ...newCategories.filter((c) => !remaining.includes(c))];
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
          <span
            key={cat}
            className={`${styles.catTag} ${dragIdx === i ? styles.catTagDragging : ""} ${overIdx === i && dragIdx !== i ? styles.catTagOver : ""}`}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
            onDrop={(e) => { e.preventDefault(); handleDrop(i); }}
            onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
          >
            <svg className={styles.catGrip} width="6" height="10" viewBox="0 0 6 10" fill="currentColor">
              <circle cx="1.5" cy="1.5" r="1" /><circle cx="4.5" cy="1.5" r="1" />
              <circle cx="1.5" cy="5" r="1" /><circle cx="4.5" cy="5" r="1" />
              <circle cx="1.5" cy="8.5" r="1" /><circle cx="4.5" cy="8.5" r="1" />
            </svg>
            {cat}
            <button
              type="button"
              className={styles.catRemove}
              onClick={() => removeCategory(cat)}
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <div className={styles.catInput}>
        <input
          className={styles.fieldInput}
          type="text"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCategory();
            }
          }}
          placeholder={t("admin.settings.newCategoryPlaceholder")}
        />
        <button
          type="button"
          className={styles.catAddBtn}
          onClick={addCategory}
          disabled={!newCat.trim()}
        >
          {t("admin.settings.addCategory")}
        </button>
      </div>
      {reassignTarget && (
        <CategoryReassignModal
          category={reassignTarget}
          availableCategories={categories.filter((c) => c !== reassignTarget)}
          onConfirm={handleReassignConfirm}
          onCancel={() => setReassignTarget(null)}
        />
      )}
    </div>
  );
}
