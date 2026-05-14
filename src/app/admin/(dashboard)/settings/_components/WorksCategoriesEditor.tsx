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
}

interface WorksCategoriesEditorProps {
  categories: WorksCategory[];
  onChange: (cats: WorksCategory[]) => void;
}

export default function WorksCategoriesEditor({ categories, onChange }: WorksCategoriesEditorProps) {
  const { t, language } = useLanguage();
  const [newKo, setNewKo] = useState("");
  const [newEn, setNewEn] = useState("");

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
      <div className={styles.catInput}>
        <div className={styles.catInputGroup}>
          <Input
            label={t("admin.settings.categoryKoLabel")}
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
            label={t("admin.settings.categoryEnLabel")}
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
