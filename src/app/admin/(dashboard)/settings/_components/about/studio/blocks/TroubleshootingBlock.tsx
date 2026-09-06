"use client";

import { useState } from "react";
import css from "../../AboutStudio.module.css";
import { EditableText, PanelStage, StageTabs, sec } from "../primitives";
import bk from "@/app/about/_components/panels/BackendPanel.module.css";
import { Plus, X } from "@/components/icons";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { type TroubleShootingItem } from "@/data/about/types";
import { type Language } from "@/types";
/* ═══════════ Troubleshooting ═══════════ */
export const TS_MAX = 16;

export const TS_FIELDS = ["problem", "definition", "cause", "solution", "keyInsight"] as const;

/* 항목이 길고 서술형이라 한 번에 하나씩 편집한다.
   비교표·다이어그램·이미지는 구조가 깊어 개수만 보여주고 본문 편집에 집중. */
export function TroubleshootingBlock({ value, onChange, lang, title }: {
  value: TroubleShootingItem[]; onChange: (v: TroubleShootingItem[]) => void;
  lang: Language; title: string;
}) {
  const [tab, setTab] = useState(0);
  const cur = Math.min(tab, Math.max(0, value.length - 1));
  const it = value[cur];
  const set = (p: Partial<TroubleShootingItem>) => onChange(value.map((x, i) => (i === cur ? { ...x, ...p } : x)));
  const setLocal = (k: (typeof TS_FIELDS)[number], v: string) =>
    set({ [k]: { ...(it[k] ?? { ko: "", en: "" }), [lang]: v } } as Partial<TroubleShootingItem>);

  const add = () => {
    onChange([...value, {
      id: `custom-${Date.now().toString(36)}`,
      problem: { ko: "", en: "" }, definition: { ko: "", en: "" },
      cause: { ko: "", en: "" }, solution: { ko: "", en: "" }, keyInsight: { ko: "", en: "" },
      difficulty: 2,
    }]);
    setTab(value.length);
  };
  const removeAt = (i: number) => {
    onChange(value.filter((_, x) => x !== i));
    setTab(Math.max(0, i - 1));
  };
  const isEmpty = (c: TroubleShootingItem) => !c.problem.ko.trim() && !c.problem.en.trim();
  const selectTab = (next: number) => {
    if (next !== cur && it && isEmpty(it)) {
      onChange(value.filter((_, i) => i !== cur));
      setTab(next > cur ? next - 1 : next);
      return;
    }
    setTab(next);
  };

  const tags = it?.tags ?? [];
  const label = (k: (typeof TS_FIELDS)[number]) => ({
    problem: lang === "ko" ? "문제" : "Problem",
    definition: lang === "ko" ? "정의" : "Definition",
    cause: lang === "ko" ? "원인" : "Cause",
    solution: lang === "ko" ? "해결" : "Solution",
    keyInsight: lang === "ko" ? "핵심" : "Key insight",
  }[k]);

  return (
    <section className={css.block}>
      <div className={css.slideTabs}>
        <StageTabs count={value.length} active={cur} onSelect={selectTab} onAdd={add}
          canAdd={value.length < TS_MAX}
          addLabel={lang === "ko" ? "항목 추가" : "Add item"}
          labelOf={(i) => value[i]?.problem[lang] || value[i]?.problem.ko || (lang === "ko" ? "새 항목" : "Untitled")} />
      </div>
      {it && (
        <PanelStage>
          <div key={cur} className={css.tsStage}>
            <div className={css.chTools}>
              <SegmentedControl<"1" | "2" | "3"> size="sm" value={String(it.difficulty ?? 2) as "1" | "2" | "3"}
                onChange={(v) => set({ difficulty: Number(v) as TroubleShootingItem["difficulty"] })}
                items={[{ value: "1", label: "L1" }, { value: "2", label: "L2" }, { value: "3", label: "L3" }]} />
              <Button variant={it.recommended ? "primary" : "subtle"} size="sm"
                onClick={() => set({ recommended: !it.recommended })}
                aria-pressed={!!it.recommended}>
                {lang === "ko" ? "추천" : "Featured"}
              </Button>
              <Button variant="subtle" shape="circle" size="xs" onClick={() => removeAt(cur)} aria-label="remove">
                <X size={14} />
              </Button>
            </div>
            <h3 className={sec.panelTitle}>{title}</h3>

            <div className={css.tsBody}>
              {TS_FIELDS.map((k) => (
                <div key={k} className={css.tsField}>
                  <span className={bk.entryLabel}>{label(k)}</span>
                  <EditableText multiline className={css.tsText} value={it[k]?.[lang] ?? ""}
                    onChange={(v) => setLocal(k, v)}
                    placeholder={label(k)} ariaLabel={k} style={{ width: "100%" }} />
                </div>
              ))}

              <div className={css.tsField}>
                <span className={bk.entryLabel}>TAGS</span>
                <div className={css.tsTags}>
                  {tags.map((tg, i) => (
                    <Chip key={i} className={css.tsTag}
                      onRemove={() => set({ tags: tags.filter((_, j) => j !== i) })}>
                      {tg}
                    </Chip>
                  ))}
                  <Button variant="subtle" size="2xs" icon={<Plus size={12} />}
                    onClick={() => set({ tags: [...tags, `tag-${tags.length + 1}`] })}>
                    {lang === "ko" ? "태그" : "Tag"}
                  </Button>
                </div>
              </div>

              {/* 구조가 깊은 부가 콘텐츠는 개수만 — 본문 편집을 가리지 않게 */}
              <p className={css.tsMeta}>
                {lang === "ko"
                  ? `비교표 ${it.comparisons?.length ?? 0} · 다이어그램 ${it.diagrams?.length ?? 0} · 이미지 ${it.images?.length ?? 0}`
                  : `${it.comparisons?.length ?? 0} tables · ${it.diagrams?.length ?? 0} diagrams · ${it.images?.length ?? 0} images`}
              </p>
            </div>
          </div>
        </PanelStage>
      )}
    </section>
  );
}
