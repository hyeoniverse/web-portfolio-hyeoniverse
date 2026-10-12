"use client";

import css from "../../AboutStudio.module.css";
import { ChipList } from "../listControls";
import { EditableText, PanelStage, sec } from "../primitives";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import { StageTabs, useStageList } from "../stageList";
import bk from "@/app/about/_panels/panels/BackendPanel.module.css";
import { X } from "@/components/icons";
import Button from "@/components/ui/Button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { type TroubleShootingItem } from "@/data/about/types";
import { type Language } from "@/types";
/* ═══════════ Troubleshooting ═══════════ */
const TS_MAX = 16;

export const TS_FIELDS = ["problem", "definition", "cause", "solution", "keyInsight"] as const;

/* 항목이 길고 서술형이라 한 번에 하나씩 편집한다.
   비교표·다이어그램·이미지는 구조가 깊어 개수만 보여주고 본문 편집에 집중. */
export function TroubleshootingBlock({ value, onChange, lang, title }: {
  value: TroubleShootingItem[]; onChange: (v: TroubleShootingItem[]) => void;
  lang: Language; title: string;
}) {
  const { t } = useLanguage();
  const list = useStageList(value, onChange, (): TroubleShootingItem => ({
    id: `custom-${Date.now().toString(36)}`,
    problem: { ko: "", en: "" }, definition: { ko: "", en: "" },
    cause: { ko: "", en: "" }, solution: { ko: "", en: "" }, keyInsight: { ko: "", en: "" },
    difficulty: 2,
  }));
  const { cur, it, set } = list;
  const setLocal = (k: (typeof TS_FIELDS)[number], v: string) =>
    set({ [k]: { ...(it[k] ?? { ko: "", en: "" }), [lang]: v } } as Partial<TroubleShootingItem>);

  const tags = it?.tags ?? [];
  const label = (k: (typeof TS_FIELDS)[number]) => ({
    problem: t("admin.inline.troubleshootingBlock.problem"),
    definition: t("admin.inline.troubleshootingBlock.definition"),
    cause: t("admin.inline.troubleshootingBlock.cause"),
    solution: t("admin.inline.troubleshootingBlock.solution"),
    keyInsight: t("admin.inline.troubleshootingBlock.keyInsight"),
  }[k]);

  return (
    <section className={css.block}>
      <StageTabs list={list} max={TS_MAX} addLabel={t("admin.inline.troubleshootingBlock.addItem")}
        labelOf={(i) => list.items[i]?.problem[lang] || list.items[i]?.problem.ko || t("admin.inline.troubleshootingBlock.untitled")} />
      {it && (
        <PanelStage>
          <div key={cur} className={css.tsStage}>
            <div className={css.chTools}>
              <SegmentedControl<"1" | "2" | "3"> value={String(it.difficulty ?? 2) as "1" | "2" | "3"}
                onChange={(v) => set({ difficulty: Number(v) as TroubleShootingItem["difficulty"] })}
                items={[{ value: "1", label: "L1" }, { value: "2", label: "L2" }, { value: "3", label: "L3" }]} />
              <Button variant={it.recommended ? "primary" : "subtle"}
                onClick={() => set({ recommended: !it.recommended })}
                aria-pressed={!!it.recommended}>
                {t("admin.inline.troubleshootingBlock.featured")}
              </Button>
              <Button variant="subtle" shape="circle" onClick={list.remove} aria-label={t("admin.inline.troubleshootingBlock.remove")}>
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
                  <ChipList items={tags} onChange={(v) => set({ tags: v })} chipClassName={css.tsTag}
                    addLabel={t("admin.inline.troubleshootingBlock.addTag")} itemLabel={t("admin.inline.troubleshootingBlock.tag")} />
                </div>
              </div>

              {/* 구조가 깊은 부가 콘텐츠는 개수만 — 본문 편집을 가리지 않게 */}
              <p className={css.tsMeta}>
                {fillTemplate(t("admin.inline.troubleshootingBlock.extrasCount"), { tables: it.comparisons?.length ?? 0, diagrams: it.diagrams?.length ?? 0, images: it.images?.length ?? 0 })}
              </p>
            </div>
          </div>
        </PanelStage>
      )}
    </section>
  );
}
