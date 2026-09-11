"use client";

import { useState } from "react";
import css from "../../AboutStudio.module.css";
import { DragHandle, ListLimit, RemoveButton, SortableItem, SortableList } from "../listControls";
import { EditableText, PanelStage, sec, useL } from "../primitives";
import feat from "@/app/about/_components/panels/FeaturesPanel.module.css";
import { ImageIcon, Plus } from "@/components/icons";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import Button from "@/components/ui/Button";
import MediaThumb from "@/components/ui/MediaThumb";
import Popover from "@/components/ui/Popover";
import Pressable from "@/components/ui/Pressable";
import { type SiteConfigData } from "@/config/site.config";
import { type TFunction } from "@/providers/LanguageProvider";
import { type Language } from "@/types";
import { arrayMove } from "@dnd-kit/sortable";
export type FeatureItem = NonNullable<SiteConfigData["about"]["features"]>[number];

/* ═══════════ Features ═══════════ */
export function FeaturesBlock({ value, onChange, lang, t, title }: {
  value: FeatureItem[]; onChange: (v: FeatureItem[]) => void; lang: Language; t: TFunction; title: string;
}) {
  const L = useL();
  const set = (i: number, p: Partial<FeatureItem>) => onChange(value.map((it, x) => (x === i ? { ...it, ...p } : it)));
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null);
  /* 끄는 동안에는 hover 확장을 그 모양 그대로 멈춘다. 끌기 시작에 칸 크기를 되돌리면 잡은 칸이
     손에서 떨어져 나가고 다른 칸들이 밀려, 보이는 자리와 놓이는 자리가 한 칸씩 어긋났다.
     놓으면 옮긴 칸(손 아래)이 펼쳐진다. */
  const [dragging, setDragging] = useState(false);
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
          onMouseLeave={() => { if (!dragging) setHovered(null); }}>
          <SortableList count={value.length}
            onMove={(from, to) => { onChange(arrayMove(value, from, to)); setHovered({ row: Math.floor(to / cols), col: to % cols }); }}
            onDragStart={() => setDragging(true)} onDragEnd={() => setDragging(false)}>
            {value.map((it, i) => (
              <SortableItem key={i} index={i}>{(row) => (
                <div ref={row.ref} style={row.style} className={css.featCell}
                  onMouseEnter={() => { if (!dragging) setHovered({ row: Math.floor(i / cols), col: i % cols }); }}>
                  {/* 기본 이미지는 2,880px 까지 되는 PC 스크린샷 원본 PNG 라 8장에 3 MB 였다. 이미지 최적화를 거쳐
                      칸 크기(펼쳤을 때 화면의 1/3 남짓)만큼 받고, 화면 근처에 올 때 받는다. 허용 목록 밖 주소는
                      MediaThumb 가 원본으로 되돌린다. */}
                  {it.image
                    ? <MediaThumb className={css.featImg} src={it.image} fill sizes="(max-width: 768px) 100vw, 35vw" />
                    : <div className={css.featNoImg} />}
                  <div className={`${feat.featureDfInfo} ${css.featInfo}`}>
                    <EditableText wrap className={feat.featureDfTitle} value={it.title} onChange={(v) => set(i, { title: v })} placeholder={t("admin.settings.aboutItemTitle")} ariaLabel={L("제목", "Title")} style={{ maxWidth: "100%" }} />
                    <div className={`${feat.featureDfDetails} ${css.featDetails}`}>
                      <EditableText multiline className={feat.featureDfDesc} value={lang === "ko" ? it.description_ko : it.description_en}
                        onChange={(v) => set(i, lang === "ko" ? { description_ko: v } : { description_en: v })} placeholder={t("admin.settings.aboutItemDesc")} ariaLabel={L("설명", "Description")} style={{ width: "100%" }} />
                      <EditableText wrap className={feat.featureDfTech} value={it.tech} onChange={(v) => set(i, { tech: v })} placeholder="GSAP · Lenis" ariaLabel={L("기술", "Tech")} style={{ maxWidth: "100%" }} />
                    </div>
                  </div>
                  <div className={css.itemTools}>
                    <Popover placement="bottom-end" trigger={<Button variant="difference" shape="circle" size="xs" aria-label={L("이미지 변경", "Change image")}><ImageIcon size={13} /></Button>}>
                      <div className={css.bgPanel}>
                        <CoverImagePicker onSelect={(u) => set(i, { image: u })} onClose={() => { }} currentUrl={it.image}
                          postContext={{ title: it.title, tags: it.tech.split(",").map((s) => s.trim()).filter(Boolean), excerpt: it.description_en }} />
                      </div>
                    </Popover>
                    <DragHandle handle={row.handle} variant="difference" />
                    <RemoveButton variant="difference" onClick={() => onChange(value.filter((_, x) => x !== i))} />
                  </div>
                </div>
              )}</SortableItem>
            ))}
          </SortableList>
          {!atMax && (
            <Pressable className={`${css.featCell} ${css.featAdd}`} onClick={() => onChange([...value, { icon: "", title: lang === "ko" ? "새 기능" : "New", description_ko: "", description_en: "", tech: "", image: "" }])}>
              <Plus size={18} /> {L("기능 추가", "Add feature")}
            </Pressable>
          )}
        </div>
        {atMax && <ListLimit max={MAX} />}
      </PanelStage>
    </>
  );
}
