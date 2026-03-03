"use client";

import { useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import CategoryReassignModal from "@/components/admin/CategoryReassignModal";
import styles from "../Settings.module.css";

interface BilingualCategory {
  ko: string;
  en: string;
}

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
          <span
            key={`${cat.ko}-${cat.en}`}
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
            {language === "ko" ? cat.ko : cat.en}
            <button
              type="button"
              className={styles.catRemove}
              onClick={() => removeCategory(i)}
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <div className={styles.catInput}>
        <label className={styles.catInputGroup}>
          <span className={styles.catInputGroupLabel}>{t("admin.settings.categoryKoLabel")}</span>
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
          <span className={styles.catInputGroupLabel}>{t("admin.settings.categoryEnLabel")}</span>
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
          {t("admin.settings.addCategory")}
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
