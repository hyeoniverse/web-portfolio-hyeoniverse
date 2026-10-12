"use client";

import css from "../../AboutStudio.module.css";
import { ChipList, DragHandle, ListLimit, RemoveButton, SortableItem, SortableList } from "../listControls";
import { EditableText, PanelStage, sec } from "../primitives";
import ov from "@/app/about/_panels/panels/OverviewPanel.module.css";
import { Plus } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import { type SiteConfigData } from "@/config/site.config";
import { type TFunction } from "@/providers/LanguageProvider";
import { type Language } from "@/types";
import { arrayMove } from "@dnd-kit/sortable";

/* 한국어 칸에 넣는 예시 · 기본 내용 — 화면 글이 아니라 편집하는 한국어 내용의 값(번역하지 않는다) */
// eslint-disable-next-line no-restricted-syntax -- 위 설명
const KO_CONTENT = { LABEL: "라벨" } as const;
export type OverviewStat = NonNullable<SiteConfigData["about"]["overview_stats"]>[number];

/* ═══════════ Overview ═══════════ */
const STATS_MAX = 8;
export function OverviewBlock({ about, lang, setAny, t, title }: {
  about: SiteConfigData["about"]; lang: Language; setAny: (k: string, v: unknown) => void; t: TFunction; title: string;
}) {
  const stats = (about.overview_stats ?? []) as OverviewStat[];
  const setStats = (v: OverviewStat[]) => setAny("overview_stats", v);
  const descKey = lang === "ko" ? "overview_description_ko" : "overview_description_en";
  const rec = about as unknown as Record<string, string | undefined>;
  const highlights = (about.overview_highlights ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const setHighlights = (arr: string[]) => setAny("overview_highlights", arr.filter(Boolean).join(", "));
  return (
    <PanelStage>
        <h3 className={sec.panelTitle}>{title}</h3>
        <div className={ov.overviewLayout}>
          <div className={ov.overviewTop}>
            <EditableText multiline className={ov.overviewDesc} value={rec[descKey] ?? ""} onChange={(v) => setAny(descKey, v)}
              placeholder={t("admin.settings.aboutOverviewDesc")} ariaLabel={t("admin.inline.overviewBlock.overviewDescription")} style={{ width: "100%" }} />
            <div className={ov.overviewHighlights}>
              <ChipList items={highlights} onChange={setHighlights} chipClassName={css.highlightChip}
                addLabel={t("admin.inline.overviewBlock.addHighlight")} itemLabel={t("admin.inline.overviewBlock.highlight")} />
            </div>
          </div>
          <div className={ov.overviewStats}>
            <SortableList count={stats.length} onMove={(from, to) => setStats(arrayMove(stats, from, to))}>
              {stats.map((s, i) => (
                <SortableItem key={i} index={i}>{(row) => (
                  <div ref={row.ref} style={row.style} className={`${ov.overviewStat} ${css.editStat}`}>
                    <EditableText className={ov.statValue} value={s.value} onChange={(v) => { const n = [...stats]; n[i] = { ...n[i], value: v }; setStats(n); }} placeholder="50+" ariaLabel={t("admin.inline.overviewBlock.metricValue")} />
                    <EditableText className={ov.statLabel} value={lang === "ko" ? s.label_ko : s.label_en}
                      onChange={(v) => { const n = [...stats]; n[i] = { ...n[i], [lang === "ko" ? "label_ko" : "label_en"]: v }; setStats(n); }}
                      placeholder={t("admin.inline.overviewBlock.label")} ariaLabel={t("admin.inline.overviewBlock.metricLabel")} />
                    <span className={css.itemTools}>
                      <DragHandle handle={row.handle} />
                      <RemoveButton onClick={() => setStats(stats.filter((_, x) => x !== i))} />
                    </span>
                  </div>
                )}</SortableItem>
              ))}
            </SortableList>
            {stats.length < STATS_MAX && (
              <Pressable className={css.addStatCell} onClick={() => setStats([...stats, { value: "0", label_ko: KO_CONTENT.LABEL, label_en: "Label" }])}>
                <Plus size={18} /> {t("admin.inline.overviewBlock.addMetric")}
              </Pressable>
            )}
          </div>
          {stats.length >= STATS_MAX && <ListLimit max={STATS_MAX} />}
        </div>
    </PanelStage>
  );
}
