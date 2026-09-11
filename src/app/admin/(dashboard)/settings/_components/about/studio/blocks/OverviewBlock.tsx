"use client";

import css from "../../AboutStudio.module.css";
import { EditableText, PanelStage, sec, useL } from "../primitives";
import ov from "@/app/about/_components/panels/OverviewPanel.module.css";
import { Plus, X } from "@/components/icons";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
import { type SiteConfigData } from "@/config/site.config";
import { type TFunction } from "@/providers/LanguageProvider";
import { type Language } from "@/types";
export type OverviewStat = NonNullable<SiteConfigData["about"]["overview_stats"]>[number];

/* ═══════════ Overview ═══════════ */
export function OverviewBlock({ about, lang, setAny, t, title }: {
  about: SiteConfigData["about"]; lang: Language; setAny: (k: string, v: unknown) => void; t: TFunction; title: string;
}) {
  const L = useL();
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
              placeholder={t("admin.settings.aboutOverviewDesc")} ariaLabel={L("개요 설명", "Overview description")} style={{ width: "100%" }} />
            <div className={ov.overviewHighlights}>
              {highlights.map((tag, i) => (
                <span key={i} className={`${ov.overviewTag} ${css.editTag}`}>
                  <EditableText value={tag} onChange={(v) => { const n = [...highlights]; n[i] = v; setHighlights(n); }} ariaLabel={L("하이라이트", "Highlight")} />
                  <span className={css.editTagX}><Button variant="subtle" shape="circle" size="2xs" onClick={() => setHighlights(highlights.filter((_, x) => x !== i))} aria-label={L("삭제", "Remove")}><X size={11} /></Button></span>
                </span>
              ))}
              <Pressable className={css.addTagBtn} onClick={() => setHighlights([...highlights, lang === "ko" ? "새 항목" : "New"])} aria-label={L("추가", "Add")}><Plus size={13} /></Pressable>
            </div>
          </div>
          <div className={ov.overviewStats}>
            {stats.map((s, i) => (
              <div key={i} className={`${ov.overviewStat} ${css.editStat}`}>
                <EditableText className={ov.statValue} value={s.value} onChange={(v) => { const n = [...stats]; n[i] = { ...n[i], value: v }; setStats(n); }} placeholder="50+" ariaLabel={L("지표 값", "Metric value")} />
                <EditableText className={ov.statLabel} value={lang === "ko" ? s.label_ko : s.label_en}
                  onChange={(v) => { const n = [...stats]; n[i] = { ...n[i], [lang === "ko" ? "label_ko" : "label_en"]: v }; setStats(n); }}
                  placeholder={L("라벨", "label")} ariaLabel={L("지표 이름", "Metric label")} />
                <span className={css.editStatX}><Button variant="subtle" shape="circle" size="xs" onClick={() => setStats(stats.filter((_, x) => x !== i))} aria-label={L("삭제", "Remove")}><X size={13} /></Button></span>
              </div>
            ))}
            {stats.length < 8 && (
              <Pressable className={css.addStatCell} onClick={() => setStats([...stats, { value: "0", label_ko: "라벨", label_en: "Label" }])}>
                <Plus size={18} /> {L("지표 추가", "Add metric")}
              </Pressable>
            )}
          </div>
        </div>
    </PanelStage>
  );
}
