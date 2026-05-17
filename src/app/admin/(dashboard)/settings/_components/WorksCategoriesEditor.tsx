"use client";

import { useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import DraggableTag, { useTagDrag } from "@/components/ui/DraggableTag";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import styles from "../Settings.module.css";

interface WorksCategory {
  ko: string;
  en: string;
  description?: string;
}

interface WorksCategoriesEditorProps {
  categories: WorksCategory[];
  onChange: (cats: WorksCategory[]) => void;
}

export default function WorksCategoriesEditor({ categories, onChange }: WorksCategoriesEditorProps) {
  const { t, language } = useLanguage();
  const [newKo, setNewKo] = useState("");
  const [newEn, setNewEn] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { itemProps } = useTagDrag((from, to) => {
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  });

  const addCategory = () => {
    const ko = newKo.trim();
    const en = newEn.trim();
    if (ko && en && !categories.some((c) => c.ko === ko || c.en === en)) {
      onChange([...categories, { ko, en, description: newDescription.trim() }]);
    }
    setNewKo("");
    setNewEn("");
    setNewDescription("");
  };

  const updateDescription = (idx: number, description: string) => {
    onChange(categories.map((c, i) => (i === idx ? { ...c, description } : c)));
  };

  const removeCategory = (idx: number) => {
    if (categories.length <= 1) {
      alert(t("admin.settings.categoryLastWarning"));
      return;
    }
    const next = categories.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div>
      <div className={styles.catList}>
        {categories.map((cat, i) => (
          <DraggableTag
            key={`${cat.ko}-${cat.en}`}
            label={language === "ko" ? cat.ko : cat.en}
            index={i}
            onRemove={() => removeCategory(i)}
            {...itemProps(i)}
          />
        ))}
      </div>

      {/* 기존 카테고리 설명 편집 */}
      {categories.length > 0 && (
        <div className={styles.catDescList}>
          {categories.map((cat, i) => (
            <div key={`${cat.ko}-${cat.en}-desc`} className={styles.catDescRow}>
              <span className={styles.catDescLabel}>{language === "ko" ? cat.ko : cat.en}</span>
              <Input
                size="sm"
                value={cat.description ?? ""}
                onChange={(v) => updateDescription(i, v)}
                placeholder="설명"
              />
            </div>
          ))}
        </div>
      )}

      {/* 새 카테고리 추가 */}
      <div className={styles.catInput}>
        <div className={styles.catInputGroup}>
          <Input
            label={t("admin.settings.categoryNameLabel")}
            placeholder={t("admin.settings.categoryKoLabel")}
            size="sm"
            value={newKo}
            onChange={setNewKo}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCategory();
              }
            }}
          />
        </div>
        <div className={styles.catInputGroup}>
          <Input
            label={t("admin.settings.categoryNameLabel")}
            placeholder={t("admin.settings.categoryEnLabel")}
            size="sm"
            value={newEn}
            onChange={setNewEn}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCategory();
              }
            }}
          />
        </div>
        <div className={styles.catInputGroup}>
          <Input
            label="설명"
            placeholder="설명 (선택)"
            size="sm"
            value={newDescription}
            onChange={setNewDescription}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCategory();
              }
            }}
          />
        </div>
        <Button
          variant="outline"
          size="xs"
          onClick={addCategory}
          disabled={!newKo.trim() || !newEn.trim()}
        >
          <T k="admin.settings.addCategory" />
        </Button>
      </div>
    </div>
  );
}
