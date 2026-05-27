"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, X } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import DraggableTag, { useTagDrag } from "@/components/ui/DraggableTag";
import BilingualInputPair from "@/components/admin/BilingualInputPair";
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

/** Works 카테고리 에디터 — TagNotesEditor 패턴.
 *  chips 리스트 + 클릭 시 inline drawer (KO/EN + description) + capsule group 으로 새 카테고리 추가. */
export default function WorksCategoriesEditor({ categories, onChange }: WorksCategoriesEditorProps) {
  const { t, language } = useLanguage();
  // 편집 중인 chip index — null = 모두 closed
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  // 새 카테고리 입력 상태
  const [newPair, setNewPair] = useState({ ko: "", en: "" });
  const [newDescription, setNewDescription] = useState("");

  const { itemProps } = useTagDrag((from, to) => {
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    if (editingIdx === from) setEditingIdx(to);
    else if (editingIdx !== null && from < editingIdx && to >= editingIdx) setEditingIdx(editingIdx - 1);
    else if (editingIdx !== null && from > editingIdx && to <= editingIdx) setEditingIdx(editingIdx + 1);
  });

  const addCategory = () => {
    const ko = newPair.ko.trim();
    const en = newPair.en.trim();
    if (!ko || !en) return;
    if (categories.some((c) => c.ko === ko || c.en === en)) return;
    onChange([...categories, { ko, en, description: newDescription.trim() || undefined }]);
    setNewPair({ ko: "", en: "" });
    setNewDescription("");
  };

  const updateCategory = (idx: number, patch: Partial<WorksCategory>) => {
    onChange(categories.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const removeCategory = (idx: number) => {
    if (categories.length <= 1) {
      alert(t("admin.settings.categoryLastWarning"));
      return;
    }
    onChange(categories.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
    else if (editingIdx !== null && idx < editingIdx) setEditingIdx(editingIdx - 1);
  };

  const addPairFilled = !!newPair.ko.trim() && !!newPair.en.trim();

  return (
    <div className={styles.worksCatEditor}>
      {/* 카테고리 chip 리스트 — drag-reorder + 클릭 시 drawer 토글 + edit 아이콘 */}
      {categories.length > 0 && (
        <div className={styles.worksCatChips}>
          {categories.map((cat, i) => {
            const label = language === "ko" ? cat.ko : cat.en;
            const isEditing = editingIdx === i;
            return (
              <DraggableTag
                key={`${cat.ko}-${cat.en}`}
                label={label}
                index={i}
                onRemove={() => removeCategory(i)}
                onClick={() => setEditingIdx(isEditing ? null : i)}
                active={isEditing}
                leftIcon={isEditing ? <X size={11} strokeWidth={2.5} /> : <Pencil size={11} strokeWidth={2} />}
                {...itemProps(i)}
              />
            );
          })}
        </div>
      )}

      {/* 편집 중인 chip 의 drawer — KO/EN BilingualInputPair + description */}
      <AnimatePresence initial={false}>
        {editingIdx !== null && categories[editingIdx] && (
          <motion.div
            key={`edit-${editingIdx}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={styles.worksCatDrawer}
          >
            <div className={styles.worksCatDrawerInner}>
              <BilingualInputPair
                value={{ ko: categories[editingIdx].ko, en: categories[editingIdx].en }}
                onChange={(v) => updateCategory(editingIdx, { ko: v.ko, en: v.en })}
              />
              <Input
                size="sm"
                value={categories[editingIdx].description ?? ""}
                onChange={(v) => updateCategory(editingIdx, { description: v })}
                placeholder={t("admin.settings.categoryDescPlaceholder") || "설명 (선택)"}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 새 카테고리 추가 — capsule group (KO/EN BilingualInputPair + description) */}
      <div className={styles.worksCatAddRow}>
        <BilingualInputPair
          value={newPair}
          onChange={setNewPair}
          koPlaceholder={t("admin.settings.categoryKoLabel")}
          enPlaceholder={t("admin.settings.categoryEnLabel")}
          onEnter={addCategory}
        />
        <div className={styles.worksCatAddDescRow}>
          <Input
            size="sm"
            value={newDescription}
            onChange={setNewDescription}
            placeholder={t("admin.settings.categoryDescPlaceholder") || "설명 (선택)"}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCategory();
              }
            }}
          />
          <Button
            variant="outline"
            shape="square"
            size="xs"
            onClick={addCategory}
            disabled={!addPairFilled}
            aria-label="Add category"
            icon={<Plus size={14} strokeWidth={2} />}
          >
            <T k="admin.settings.addCategory" />
          </Button>
        </div>
      </div>
    </div>
  );
}
