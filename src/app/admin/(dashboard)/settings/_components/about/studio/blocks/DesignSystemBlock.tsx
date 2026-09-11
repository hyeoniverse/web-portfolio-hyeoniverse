"use client";

import { useRef, useState } from "react";
import css from "../../AboutStudio.module.css";
import { EditableText, PanelStage, StageTabs, useL } from "../primitives";
import dc from "@/app/about/_components/panels/DesignSystemPanel.module.css";
import { ImageIcon, X } from "@/components/icons";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import Button from "@/components/ui/Button";
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
  const [tab, setTab] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const MAX = 8;
  const cur = Math.min(tab, Math.max(0, value.length - 1));
  const it = value[cur];
  const set = (p: Partial<ConceptItem>) => onChange(value.map((x, i) => (i === cur ? { ...x, ...p } : x)));
  /* 아무 입력 없는 컨셉 — 추가만 하고 이탈하면 자동 삭제해 빈 항목이 안 남게 */
  const isEmptyConcept = (c: ConceptItem) =>
    !c.title.trim() && !c.subtitle_ko.trim() && !c.subtitle_en.trim()
    && !c.description_ko.trim() && !c.description_en.trim() && !c.image.trim();
  const add = () => {
    onChange([...value, { id: `concept-${Date.now()}`, title: "", subtitle_ko: "", subtitle_en: "", description_ko: "", description_en: "", image: "" }]);
    setTab(value.length);
  };
  const removeAt = (i: number) => {
    onChange(value.filter((_, x) => x !== i));
    setTab(Math.max(0, i - 1));
  };
  /* 탭 전환 — 떠나는 컨셉이 비어있으면 버리고, 대상 인덱스를 당겨진 만큼 보정 */
  const selectTab = (next: number) => {
    if (next !== cur && it && isEmptyConcept(it)) {
      onChange(value.filter((_, i) => i !== cur));
      setTab(next > cur ? next - 1 : next);
      return;
    }
    setTab(next);
  };
  return (
    <section className={css.block}>
      <div className={css.slideTabs} ref={tabsRef}>
        <StageTabs count={value.length} active={cur} onSelect={selectTab} onAdd={add}
          canAdd={value.length < MAX}
          addLabel={L("컨셉 추가", "Add concept")}
          labelOf={(i) => value[i]?.title || (L("새 컨셉", "Untitled"))} />
      </div>
      {it && (
        <PanelStage>
          {/* key = 컨셉별 remount — 탭을 바꿔도 같은 input 을 재사용하면 autoFocus 가 안 걸린다 */}
          <div key={it.id} className={css.dsSlide}
            onBlur={(e) => {
              const rt = e.relatedTarget as Node | null;
              if (rt && e.currentTarget.contains(rt)) return;   // 슬라이드 내부 이동
              if (rt && tabsRef.current?.contains(rt)) return;  // 탭 클릭 → selectTab 이 처리
              if (isEmptyConcept(it)) removeAt(cur);            // 입력 없이 이탈 → 빈 컨셉 삭제
            }}>
            <div className={`${dc.dcCardBg} ${css.dsBg}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {it.image && <img src={it.image} alt="" />}
            </div>
            <div className={`${dc.dcCardOverlay} ${css.dsOverlay}`}>
              <EditableText className={dc.dcCardTitle} value={it.title} autoFocus={isEmptyConcept(it)}
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
              <Button variant="difference" shape="circle" size="xs" onClick={() => removeAt(cur)} aria-label={L("삭제", "Remove")}>
                <X size={14} />
              </Button>
            </div>
          </div>
        </PanelStage>
      )}
    </section>
  );
}
