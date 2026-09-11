"use client";

import css from "../../AboutStudio.module.css";
import { ListLimit, RemoveButton, SortableList, useSortableItem } from "../listControls";
import { EditableText, PanelStage, sec, useL } from "../primitives";
import proc from "@/app/about/_components/panels/ProcessPanel.module.css";
import { GripVertical, Plus } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import { type SiteConfigData } from "@/config/site.config";
import { type TFunction } from "@/providers/LanguageProvider";
import { type Language } from "@/types";
import { arrayMove } from "@dnd-kit/sortable";
export type ProcessItem = NonNullable<SiteConfigData["about"]["process"]>[number];

/* ═══════════ Process ═══════════ */
/* 단계 번호는 자리에서 나온다. 저장된 step 값도 자리에 맞춰 다시 매긴다 —
   공개 페이지와 마크다운 frontmatter 가 이 값을 읽으므로 화면과 어긋나면 안 된다.
   불러올 때는 손대지 않는다. 열기만 해도 "저장 안 됨" 이 켜지면 안 되니까. */
const stepNo = (i: number) => String(i + 1).padStart(2, "0");

const renumberSteps = (list: ProcessItem[]) => list.map((it, i) => ({ ...it, step: stepNo(i) }));

export function ProcessBlock({ value, onChange, lang, t, title }: {
  value: ProcessItem[]; onChange: (v: ProcessItem[]) => void; lang: Language; t: TFunction; title: string;
}) {
  const L = useL();
  const set = (i: number, p: Partial<ProcessItem>) => onChange(value.map((it, x) => (x === i ? { ...it, ...p } : it)));
  const MAX = 8;
  const atMax = value.length >= MAX;

  return (
    <PanelStage>
      <h3 className={sec.panelTitle}>{title}</h3>
      <p className={css.procHint}>{L("** 로 감싼 텍스트는 강조 색으로 표시됩니다.", "Text wrapped in ** appears as an accent highlight.")}</p>
      {/* 타임라인 (실제 렌더 그대로) */}
      <div className={proc.processTimeline}>
        <div className={`${proc.processTimelineTrack} ${css.procTrack}`}><div className={proc.processTimelineProgress} style={{ width: "100%" }} /></div>
        <div className={proc.processTimelineNodes}>
          {value.map((_, i) => (
            <div key={i} className={proc.processTimelineNode}>
              <div className={`${proc.processNodeDotWrap} ${css.procDotWrap}`}><div className={`${proc.processNodeDot} ${proc.processNodeDotDone} ${css.procDot}`} /></div>
              <span className={`${proc.processNodeLabel} ${css.procNodeLabel}`}>{stepNo(i)}</span>
            </div>
          ))}
        </div>
      </div>
      {/* 스텝 리스트 (스크롤 단일뷰 대신 전체 편집) */}
      <div className={css.procList}>
        <SortableList layout="list" count={value.length} onMove={(from, to) => onChange(renumberSteps(arrayMove(value, from, to)))}>
          {value.map((it, i) => (
            <ProcessRow key={i} index={i} item={it} lang={lang} t={t} set={set}
              onRemove={() => onChange(renumberSteps(value.filter((_, x) => x !== i)))} />
          ))}
        </SortableList>
        {atMax ? <ListLimit max={MAX} /> : (
          <Pressable className={css.addStepBtn} onClick={() => onChange(renumberSteps([...value, { step: "", title_ko: "새 단계", title_en: "New", description_ko: "", description_en: "" }]))}>
            <Plus size={18} /> {L("단계 추가", "Add step")}
          </Pressable>
        )}
      </div>
    </PanelStage>
  );
}

/* 번호가 곧 손잡이다. 끌어서 자리를 옮기면 번호가 따라 바뀐다 — 번호를 고쳐 적어서
   순서를 바꾸려던 예전 방식은 실제로는 순서를 안 바꿔서 01·03·02 같은 목록이 나왔다. */
function ProcessRow({ index, item, lang, t, set, onRemove }: {
  index: number; item: ProcessItem; lang: Language; t: TFunction;
  set: (i: number, p: Partial<ProcessItem>) => void; onRemove: () => void;
}) {
  const L = useL();
  const { ref, style, isDragging, handle } = useSortableItem(index);
  return (
    <div ref={ref} style={style} className={`${css.procRow} ${isDragging ? css.procRowDragging : ""}`}>
      <span className={css.procNum} data-cursor="grab"
        title={L("끌어서 순서 변경", "Drag to reorder")}
        aria-label={L("끌어서 순서 변경", "Drag to reorder")}
        {...handle}>
        <GripVertical className={css.procGrip} size={16} strokeWidth={1.8} aria-hidden />
        {stepNo(index)}
      </span>
      <div className={css.procBody}>
        <EditableText wrap className={css.procTitle} value={lang === "ko" ? item.title_ko : item.title_en}
          onChange={(v) => set(index, lang === "ko" ? { title_ko: v } : { title_en: v })} placeholder={t("admin.settings.aboutItemTitle")} ariaLabel={L("제목", "Title")} style={{ maxWidth: "100%" }} />
        <EditableText multiline className={css.procDesc} value={lang === "ko" ? item.description_ko : item.description_en}
          onChange={(v) => set(index, lang === "ko" ? { description_ko: v } : { description_en: v })} placeholder={t("admin.settings.aboutItemDesc")} ariaLabel={L("설명", "Description")} style={{ width: "100%" }} />
      </div>
      <span className={css.itemTools}><RemoveButton onClick={onRemove} /></span>
    </div>
  );
}
