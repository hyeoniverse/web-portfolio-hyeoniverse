"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Check, X } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import TagNotesEditor from "@/components/admin/TagNotesEditor";
import BilingualInputPair from "@/components/admin/BilingualInputPair";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import styles from "../Settings.module.css";

/** legacy `description: string` → bilingual `{ko, en}` 자동 정규화. */
type LegacyDesc = string;
type BilingualDesc = { ko: string; en: string };
interface WorksCategory {
  ko: string;
  en: string;
  description?: BilingualDesc | LegacyDesc;
}

interface WorksCategoriesEditorProps {
  categories: WorksCategory[];
  onChange: (cats: WorksCategory[]) => void;
}

function normalizeDesc(d: WorksCategory["description"]): BilingualDesc {
  if (!d) return { ko: "", en: "" };
  if (typeof d === "string") return { ko: "", en: d };
  return { ko: d.ko ?? "", en: d.en ?? "" };
}

/** Works 카테고리 에디터 — TagNotesEditor (chip + drag) + 하단 통합 add/edit box.
 *  chip 클릭 시 박스가 해당 카테고리 편집 모드로 전환 → 이름·설명 모두 수정. */
export default function WorksCategoriesEditor({ categories, onChange }: WorksCategoriesEditorProps) {
  const { t } = useLanguage();

  // TagNotesEditor 용 데이터 변환 — items = EN name (canonical), notes[en] = bilingual description
  const items = useMemo(() => categories.map((c) => c.en), [categories]);
  const notes = useMemo(() => {
    const map: Record<string, BilingualDesc> = {};
    for (const c of categories) {
      map[c.en] = normalizeDesc(c.description);
    }
    return map;
  }, [categories]);

  // chip 라벨 — KO + EN 둘 다 표시 (en → ko 역인덱스)
  const koByEn = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.en] = c.ko;
    return map;
  }, [categories]);

  // items 순서 변경 / 제거
  const handleItemsChange = (nextItems: string[]) => {
    const byEn: Record<string, WorksCategory> = {};
    for (const c of categories) byEn[c.en] = c;
    const nextCats = nextItems.map((en) => byEn[en]).filter(Boolean);
    if (nextCats.length === 0) {
      alert(t("admin.settings.categoryLastWarning"));
      return;
    }
    onChange(nextCats);
  };

  // description 변경 — TagNotesEditor 자체 drawer 에서 편집 시
  const handleNotesChange = (nextNotes: Record<string, BilingualDesc>) => {
    onChange(
      categories.map((c) => {
        const nextDesc = nextNotes[c.en];
        if (!nextDesc) return { ...c, description: undefined };
        if (!nextDesc.ko.trim() && !nextDesc.en.trim()) return { ...c, description: undefined };
        return { ...c, description: nextDesc };
      }),
    );
  };

  // ── 하단 통합 add/edit box ──
  // editingEn = 편집 중인 카테고리 EN key (canonical). null 이면 add 모드.
  const [editingEn, setEditingEn] = useState<string | null>(null);
  const [pair, setPair] = useState<BilingualDesc>({ ko: "", en: "" });
  const [desc, setDesc] = useState<BilingualDesc>({ ko: "", en: "" });

  const isEdit = editingEn !== null;

  // editingEn 바뀌면 폼 값 sync (편집 → 해당 카테고리 / add → 빈 값)
  useEffect(() => {
    if (editingEn === null) {
      setPair({ ko: "", en: "" });
      setDesc({ ko: "", en: "" });
      return;
    }
    const cat = categories.find((c) => c.en === editingEn);
    if (!cat) {
      setEditingEn(null);
      return;
    }
    setPair({ ko: cat.ko, en: cat.en });
    setDesc(normalizeDesc(cat.description));
  }, [editingEn, categories]);

  const cancelEdit = () => setEditingEn(null);

  const submit = () => {
    const ko = pair.ko.trim();
    const en = pair.en.trim();
    if (!ko || !en) return;
    const descKo = desc.ko.trim();
    const descEn = desc.en.trim();
    const description = descKo || descEn ? { ko: descKo, en: descEn } : undefined;

    if (isEdit) {
      // 편집 — editingEn 항목의 ko/en/description 갱신 (en 변경 가능)
      const conflict = categories.some((c) => c.en !== editingEn && (c.ko === ko || c.en === en));
      if (conflict) return;
      onChange(categories.map((c) => (c.en === editingEn ? { ko, en, description } : c)));
      setEditingEn(null);
    } else {
      // 신규 — 중복 체크
      if (categories.some((c) => c.ko === ko || c.en === en)) return;
      onChange([...categories, { ko, en, description }]);
      setPair({ ko: "", en: "" });
      setDesc({ ko: "", en: "" });
    }
  };

  const submitEnabled = !!pair.ko.trim() && !!pair.en.trim();

  return (
    <div className={styles.worksCatEditor}>
      {/* 기존 카테고리 — chip (clickable) + drag */}
      <TagNotesEditor
        items={items}
        notes={notes}
        onItemsChange={handleItemsChange}
        onNotesChange={handleNotesChange}
        prefix=""
        notePlaceholder={t("admin.settings.categoryDescPlaceholder")}
        addLabel={t("admin.settings.categoryDescAdd")}
        cancelLabel={t("admin.settings.cancel")}
        editLabel={t("admin.settings.edit")}
        removeTitle={t("admin.settings.removeCategory")}
        renderItemLabel={(en) => (
          <span className={styles.worksCatChipLabel}>
            <span>{koByEn[en]}</span>
            <span className={styles.worksCatChipSep}>·</span>
            <span>{en}</span>
          </span>
        )}
        onItemClick={(en) => setEditingEn(en === editingEn ? null : en)}
        onEditClick={(en) => setEditingEn(en === editingEn ? null : en)}
      />

      {/* 하단 통합 add/edit box — editingEn 이면 편집 모드, 아니면 추가 모드 */}
      <div className={`${styles.worksCatAddBox} ${isEdit ? styles.worksCatAddBoxEdit : ""}`}>
        <div className={styles.worksCatAddLabel}>
          {isEdit ? <T k="admin.settings.edit" /> : <T k="admin.settings.addCategory" />}
          <div className={styles.worksCatAddActions}>
            {isEdit && (
              <Button
                variant="outline"
                size="2xs"
                onClick={cancelEdit}
                icon={<X size={12} strokeWidth={2.5} />}
              >
                <T k="admin.settings.cancel" />
              </Button>
            )}
            <Button
              variant="outline"
              size="2xs"
              onClick={submit}
              disabled={!submitEnabled}
              icon={isEdit ? <Check size={12} strokeWidth={2.5} /> : <Plus size={12} strokeWidth={2} />}
            >
              {isEdit ? <T k="admin.settings.saveEdit" /> : <T k="admin.settings.addCategory" />}
            </Button>
          </div>
        </div>
        <div className={styles.worksCatAddRow}>
          <span className={styles.worksCatAddRowLabel}>
            <T k="admin.settings.name" />
          </span>
          <BilingualInputPair value={pair} onChange={setPair} onEnter={submit} />
        </div>
        <div className={styles.worksCatAddRow}>
          <span className={styles.worksCatAddRowLabel}>
            <T k="admin.settings.categoryDescPlaceholder" />
          </span>
          <BilingualInputPair value={desc} onChange={setDesc} onEnter={submit} />
        </div>
      </div>
    </div>
  );
}
