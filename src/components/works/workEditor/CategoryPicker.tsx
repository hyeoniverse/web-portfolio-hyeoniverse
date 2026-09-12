"use client";

import styles from "../WorkEditor.module.css";
import { useState } from "react";
import { Plus } from "@/components/icons";
import Button from "@/components/ui/Button";
import Chip, { useChipReorder } from "@/components/ui/Chip";
import Select from "@/components/ui/Select";
import { type LocalizedText } from "@/types/common";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
export interface WorksCategory {
  ko: string;
  en: string;
}

/* ──────────────────────────────────────────────────────────────────────────
 * CategoryMultiPicker — 카테고리 multi-select. Select 위, chip 아래.
 * 공통 DraggableTag 로 chip 렌더 + 드래그로 순서 변경 (ko/en 배열 동기 유지). */
export function CategoryMultiPicker({
  selectedKos,
  selectedEns,
  presets,
  editorLang,
  customMode,
  setCustomMode,
  labels,
  onChange,
}: {
  selectedKos: string[];
  selectedEns: string[];
  presets: LocalizedText[];
  editorLang: "ko" | "en";
  customMode: boolean;
  setCustomMode: (v: boolean) => void;
  labels: { placeholder: string; custom: string; add: string };
  onChange: (ko: string[], en: string[]) => void;
}) {
  const remaining = presets.filter((c) => !selectedKos.includes(c.ko));
  const add = (ko: string, en: string) => {
    const k = ko.trim();
    const e = en.trim();
    if (!k && !e) return;
    if (selectedKos.includes(k)) return;
    onChange([...selectedKos, k], [...selectedEns, e || k]);
    setCustomMode(false);
  };
  const remove = (idx: number) => {
    onChange(
      selectedKos.filter((_, i) => i !== idx),
      selectedEns.filter((_, i) => i !== idx),
    );
  };
  const { itemProps } = useChipReorder((from, to) => {
    const ko = [...selectedKos];
    const en = [...selectedEns];
    const [movedKo] = ko.splice(from, 1);
    const [movedEn] = en.splice(from, 1);
    ko.splice(to, 0, movedKo);
    en.splice(to, 0, movedEn);
    onChange(ko, en);
  });

  return (
    <div className={styles.categoryPicker}>
      {/* 위쪽 — Select + (custom 모드면) 직접 입력 row */}
      <div className={styles.categoryAddRow}>
        <Select
          value=""
          placeholder={labels.placeholder}
          options={[
            { value: "__custom__", label: labels.custom },
            ...remaining.map((cat, i) => ({
              value: `preset:${i}`,
              label: editorLang === "ko" ? cat.ko : cat.en,
            })),
          ]}
          onChange={(v) => {
            if (v === "__custom__") {
              setCustomMode(true);
            } else if (v.startsWith("preset:")) {
              const idx = parseInt(v.slice("preset:".length));
              const cat = remaining[idx];
              if (cat) add(cat.ko, cat.en);
            }
          }}
        />
        {customMode && (
          <CategoryCustomAdder onAdd={add} onCancel={() => setCustomMode(false)} koPh={labels.placeholder} enPh={labels.placeholder} addLabel={labels.add} />
        )}
      </div>
      {/* 아래쪽 — 선택된 chip 들 (공통 Chip + drag reorder) */}
      {selectedKos.length > 0 && (
        <div className={styles.categoryChipList}>
          {selectedKos.map((k, i) => {
            const { dragging, dropSide, ...handlers } = itemProps(i);
            return (
              <Chip
                key={`${k}-${i}`}
                variant="capsule"
                showHandle
                onRemove={() => remove(i)}
                dragging={dragging}
                dropSide={dropSide}
                dragHandlers={{ draggable: true, ...handlers }}
              >
                {editorLang === "en" ? (selectedEns[i] || k) : k}
              </Chip>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 카테고리 직접 입력 — KO/EN 두 input + 추가 버튼. Enter 로 submit 가능 */
function CategoryCustomAdder({ onAdd, onCancel, koPh, enPh, addLabel }: { onAdd: (ko: string, en: string) => void; onCancel: () => void; koPh: string; enPh: string; addLabel: string }) {
  const [ko, setKo] = useState("");
  const [en, setEn] = useState("");
  const handleAdd = () => {
    if (!ko.trim() && !en.trim()) return;
    onAdd(ko, en);
    setKo("");
    setEn("");
  };
  return (
    <>
      <div className={styles.customCategoryInputWrap}>
        <span className={styles.customCategoryBadge}>KO</span>
        <input
          className={`${es.fieldInput} ${styles.customCategoryInput}`}
          type="text"
          value={ko}
          onChange={(e) => setKo(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } else if (e.key === "Escape") onCancel(); }}
          placeholder={koPh}
          autoFocus
        />
      </div>
      <div className={styles.customCategoryInputWrap}>
        <span className={styles.customCategoryBadge}>EN</span>
        <input
          className={`${es.fieldInput} ${styles.customCategoryInput}`}
          type="text"
          value={en}
          onChange={(e) => setEn(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } else if (e.key === "Escape") onCancel(); }}
          placeholder={enPh}
        />
      </div>
      <Button
        variant="outline"
        shape="circle"
        size="sm"
        className={styles.categoryAddBtnSized}
        onClick={handleAdd}
        disabled={!ko.trim() && !en.trim()}
        aria-label={addLabel}
        icon={<Plus size={12} strokeWidth={2} />}
      />
    </>
  );
}
