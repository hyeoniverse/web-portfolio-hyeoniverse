"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import TagNotesEditor from "@/components/admin/TagNotesEditor";
import BilingualInputPair from "@/components/admin/BilingualInputPair";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import styles from "../Settings.module.css";

/** legacy `description: string` → bilingual `{ko, en}` 도 자동 정규화.
 *  새 데이터는 bilingual 로 저장됨. */
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

/** Works 카테고리 에디터 — TagNotesEditor 그대로 사용 (works/posts editor 패턴 통일).
 *  - chip 라벨 = EN name (canonical key)
 *  - drawer 내용 = description bilingual (KO/EN)
 *  - 이름 (KO/EN) 변경 = 별도 inline editor (drawer 안) OR 새로 추가
 *  - description 도 bilingual 구조 — TagNotesEditor 의 notes 와 1:1 매칭 */
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

  // items 순서 변경 / 제거 — categories 배열 재구성
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

  // description 변경 — categories 의 해당 항목 description 만 업데이트
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

  // 새 카테고리 추가 입력
  const [newPair, setNewPair] = useState<BilingualDesc>({ ko: "", en: "" });
  const [newDesc, setNewDesc] = useState<BilingualDesc>({ ko: "", en: "" });

  const addCategory = () => {
    const ko = newPair.ko.trim();
    const en = newPair.en.trim();
    if (!ko || !en) return;
    if (categories.some((c) => c.ko === ko || c.en === en)) return;
    const descKo = newDesc.ko.trim();
    const descEn = newDesc.en.trim();
    const description = descKo || descEn ? { ko: descKo, en: descEn } : undefined;
    onChange([...categories, { ko, en, description }]);
    setNewPair({ ko: "", en: "" });
    setNewDesc({ ko: "", en: "" });
  };

  const addEnabled = !!newPair.ko.trim() && !!newPair.en.trim();

  return (
    <div className={styles.worksCatEditor}>
      {/* 기존 카테고리 — TagNotesEditor 그대로 사용 (chip + bilingual description drawer) */}
      <TagNotesEditor
        items={items}
        notes={notes}
        onItemsChange={handleItemsChange}
        onNotesChange={handleNotesChange}
        prefix=""
        notePlaceholder={t("admin.settings.categoryDescPlaceholder") || "설명 (선택)"}
        addLabel={t("admin.settings.categoryDescAdd") || "설명 추가"}
        cancelLabel={t("admin.settings.cancel") || "취소"}
        editLabel={t("admin.settings.edit") || "편집"}
        removeTitle={t("admin.settings.removeCategory") || "카테고리 제거"}
      />

      {/* 새 카테고리 추가 — KO/EN 이름 + 선택적 설명 (bilingual) + Add */}
      <div className={styles.worksCatAddBox}>
        <div className={styles.worksCatAddLabel}>
          <T k="admin.settings.addCategory" />
        </div>
        <BilingualInputPair
          value={newPair}
          onChange={setNewPair}
          koPlaceholder={t("admin.settings.categoryKoLabel")}
          enPlaceholder={t("admin.settings.categoryEnLabel")}
          onEnter={addCategory}
        />
        <BilingualInputPair
          value={newDesc}
          onChange={setNewDesc}
          koPlaceholder={(t("admin.settings.categoryDescPlaceholder") || "설명") + " (KO)"}
          enPlaceholder={(t("admin.settings.categoryDescPlaceholder") || "설명") + " (EN)"}
          onEnter={addCategory}
        />
        <Button
          variant="outline"
          size="xs"
          onClick={addCategory}
          disabled={!addEnabled}
          icon={<Plus size={14} strokeWidth={2} />}
        >
          <T k="admin.settings.addCategory" />
        </Button>
      </div>
    </div>
  );
}
