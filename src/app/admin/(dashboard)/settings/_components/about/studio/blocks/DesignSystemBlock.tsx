"use client";

import css from "../../AboutStudio.module.css";
import { EditableText, PanelStage, useL } from "../primitives";
import { StageTabs, useStageList } from "../stageList";
import dc from "@/app/about/_components/panels/DesignSystemPanel.module.css";
import { ImageIcon, X } from "@/components/icons";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import Button from "@/components/ui/Button";
import MediaThumb from "@/components/ui/MediaThumb";
import Popover from "@/components/ui/Popover";
import { designConcepts } from "@/data/about/concepts";
import { type TFunction } from "@/providers/LanguageProvider";
import { type Language } from "@/types";
/* ═══════════ 상수 ═══════════ */
export const WEIGHTS = [
  { value: "100", label: "100 · Thin" }, { value: "200", label: "200 · ExtraLight" },
  { value: "300", label: "300 · Light" }, { value: "400", label: "400 · Regular" },
  { value: "500", label: "500 · Medium" }, { value: "600", label: "600 · SemiBold" },
  { value: "700", label: "700 · Bold" }, { value: "800", label: "800 · ExtraBold" },
  { value: "900", label: "900 · Black" },
];

export const TYPO = {
  heroLine1: { min: 2, max: 20, step: 0.25, def: 4, fb: "primary" as const },
  heroLine2: { min: 2, max: 20, step: 0.25, def: 4, fb: "accent" as const },
  heroSubtitle: { min: 0.75, max: 3, step: 0.05, def: 1, fb: "primary" as const },
  heroWatermark: { min: 3, max: 24, step: 0.5, def: 12, fb: "primary" as const },
};

export type TypoKey = keyof typeof TYPO;

export type ActiveKey = TypoKey | "heroAccent";

/* ═══════════ Design System ═══════════ */
export type ConceptItem = { id: string; title: string; subtitle_ko: string; subtitle_en: string; description_ko: string; description_en: string; image: string };

/* config 가 비어있으면 현재 정적 데이터를 초기값으로 — 편집 시 전체 배열이 config 에 저장됨 */
export const seedConcepts = (): ConceptItem[] => designConcepts.map((c) => ({
  id: c.id, title: c.title,
  subtitle_ko: c.subtitle.ko, subtitle_en: c.subtitle.en,
  description_ko: c.description.ko, description_en: c.description.en,
  image: c.image ?? "",
}));

/* 실제 패널과 동일 — 컨셉 1개 = 배경 이미지 풀블리드 슬라이드 + 흰 오버레이 텍스트.
   실제도 strip 으로 한 장씩 넘겨 보므로 스튜디오도 탭으로 전환하며 한 장씩 편집. */
export function DesignSystemBlock({ value, onChange, lang, t }: {
  value: ConceptItem[]; onChange: (v: ConceptItem[]) => void; lang: Language; t: TFunction;
}) {
  const L = useL();
  const MAX = 8;
  const list = useStageList(value, onChange, (): ConceptItem => ({ id: `concept-${Date.now()}`, title: "", subtitle_ko: "", subtitle_en: "", description_ko: "", description_en: "", image: "" }));
  const { it, set } = list;
  return (
    <section className={css.block}>
      <StageTabs list={list} max={MAX} addLabel={L("컨셉 추가", "Add concept")}
        labelOf={(i) => list.items[i]?.title || L("새 컨셉", "Untitled")} />
      {it && (
        <PanelStage>
          {/* key = 컨셉별 remount — 탭을 바꿔도 같은 input 을 재사용하면 autoFocus 가 안 걸린다 */}
          <div key={it.id} className={css.dsSlide}>
            <div className={`${dc.dcCardBg} ${css.dsBg}`}>
              {/* 스테이지 폭(데스크톱에서 화면의 70% 남짓)만큼 최적화해 받는다 — FeaturesBlock 과 같다 */}
              {it.image && <MediaThumb src={it.image} fill sizes="(max-width: 1024px) 100vw, 70vw" />}
            </div>
            <div className={`${dc.dcCardOverlay} ${css.dsOverlay}`}>
              <EditableText className={dc.dcCardTitle} value={it.title} autoFocus={list.isDraft}
                onChange={(v) => set({ title: v })} placeholder="TYPOGRAPHY" ariaLabel={L("제목", "Title")} />
              <EditableText wrap className={dc.dcCardSubtitle} value={lang === "ko" ? it.subtitle_ko : it.subtitle_en}
                onChange={(v) => set(lang === "ko" ? { subtitle_ko: v } : { subtitle_en: v })}
                placeholder={lang === "ko" ? "4가지 서체 시스템" : "4-Font Type System"} ariaLabel={L("부제", "Subtitle")} />
              <EditableText multiline className={dc.dcCardDesc} value={lang === "ko" ? it.description_ko : it.description_en}
                onChange={(v) => set(lang === "ko" ? { description_ko: v } : { description_en: v })}
                placeholder={t("admin.settings.aboutItemDesc")} ariaLabel={L("설명", "Description")} style={{ width: "100%" }} />
            </div>
            <div className={css.slideTools}>
              <Popover placement="bottom-end" trigger={
                <Button variant="difference" shape="circle" size="xs" aria-label={L("배경 이미지", "Background image")}>
                  <ImageIcon size={14} />
                </Button>
              }>
                <div className={css.bgPanel}>
                  <CoverImagePicker onSelect={(u) => set({ image: u })} onClose={() => { }} currentUrl={it.image}
                    postContext={{ title: it.title, tags: [], excerpt: it.description_en }} />
                </div>
              </Popover>
              <Button variant="difference" shape="circle" size="xs" onClick={list.remove} aria-label={L("삭제", "Remove")}>
                <X size={14} />
              </Button>
            </div>
          </div>
        </PanelStage>
      )}
    </section>
  );
}
