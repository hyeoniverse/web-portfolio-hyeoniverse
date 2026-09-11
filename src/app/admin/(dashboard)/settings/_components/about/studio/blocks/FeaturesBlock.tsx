"use client";

import { useState } from "react";
import css from "../../AboutStudio.module.css";
import { EditableText, PanelStage, sec } from "../primitives";
import feat from "@/app/about/_components/panels/FeaturesPanel.module.css";
import { ImageIcon, Plus, X } from "@/components/icons";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import Button from "@/components/ui/Button";
import Popover from "@/components/ui/Popover";
import Pressable from "@/components/ui/Pressable";
import { type SiteConfigData } from "@/config/site.config";
import { type TFunction } from "@/providers/LanguageProvider";
import { type Language } from "@/types";
export type FeatureItem = NonNullable<SiteConfigData["about"]["features"]>[number];

/* ═══════════ Features ═══════════ */
export function FeaturesBlock({ value, onChange, lang, t, title }: {
  value: FeatureItem[]; onChange: (v: FeatureItem[]) => void; lang: Language; t: TFunction; title: string;
}) {
  const set = (i: number, p: Partial<FeatureItem>) => onChange(value.map((it, x) => (x === i ? { ...it, ...p } : it)));
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null);
  const cols = 3;
  const MAX = 9; // 3×3 — 실제 defaultFrames 개수와 동일
  const atMax = value.length >= MAX;
  const rows = Math.max(1, Math.ceil((value.length + (atMax ? 0 : 1)) / cols));
  /* 실제 DynamicFrameLayout 흉내 — 기본 4fr, hover 한 row/col 은 6fr·나머지 3fr 로 확장 */
  const tpl = (n: number, active: number | null) => Array.from({ length: n }, (_, x) => (active == null ? "4fr" : x === active ? "6fr" : "3fr")).join(" ");
  return (
    <>
      <PanelStage>
        <h3 className={sec.panelTitle}>{title}</h3>
        <div className={css.featGrid}
          style={{ gridTemplateColumns: tpl(cols, hovered?.col ?? null), gridTemplateRows: tpl(rows, hovered?.row ?? null) }}
          onMouseLeave={() => setHovered(null)}>
          {value.map((it, i) => (
            <div key={i} className={css.featCell} onMouseEnter={() => setHovered({ row: Math.floor(i / cols), col: i % cols })}>
              {it.image
                // eslint-disable-next-line @next/next/no-img-element -- 관리자가 고른 임의 URL 이라 도메인을 미리 등록할 수 없다
                ? <img className={css.featImg} src={it.image} alt="" />
                : <div className={css.featNoImg} />}
              <div className={`${feat.featureDfInfo} ${css.featInfo}`}>
                <EditableText wrap className={feat.featureDfTitle} value={it.title} onChange={(v) => set(i, { title: v })} placeholder={t("admin.settings.aboutItemTitle")} ariaLabel="title" style={{ maxWidth: "100%" }} />
                <div className={`${feat.featureDfDetails} ${css.featDetails}`}>
                  <EditableText multiline className={feat.featureDfDesc} value={lang === "ko" ? it.description_ko : it.description_en}
                    onChange={(v) => set(i, lang === "ko" ? { description_ko: v } : { description_en: v })} placeholder={t("admin.settings.aboutItemDesc")} ariaLabel="description" style={{ width: "100%" }} />
                  <EditableText wrap className={feat.featureDfTech} value={it.tech} onChange={(v) => set(i, { tech: v })} placeholder="GSAP · Lenis" ariaLabel="tech" style={{ maxWidth: "100%" }} />
                </div>
              </div>
              <div className={css.featTools}>
                <Popover placement="bottom-end" trigger={<Button variant="difference" shape="circle" size="xs" className={css.featToolBtn} aria-label="이미지 변경"><ImageIcon size={16} /></Button>}>
                  <div className={css.bgPanel}>
                    <CoverImagePicker onSelect={(u) => set(i, { image: u })} onClose={() => { }} currentUrl={it.image}
                      postContext={{ title: it.title, tags: it.tech.split(",").map((s) => s.trim()).filter(Boolean), excerpt: it.description_en }} />
                  </div>
                </Popover>
                <Button variant="difference" shape="circle" size="xs" className={css.featToolBtn} onClick={() => onChange(value.filter((_, x) => x !== i))} aria-label="삭제"><X size={16} /></Button>
              </div>
            </div>
          ))}
          {!atMax && (
            <Pressable className={`${css.featCell} ${css.featAdd}`} onClick={() => onChange([...value, { icon: "", title: lang === "ko" ? "새 기능" : "New", description_ko: "", description_en: "", tech: "", image: "" }])}>
              <Plus size={22} />
            </Pressable>
          )}
        </div>
      </PanelStage>
    </>
  );
}
