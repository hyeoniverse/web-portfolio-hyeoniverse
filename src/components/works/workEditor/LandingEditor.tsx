"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ImageIcon, Plus, X } from "@/components/icons";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
import Textarea from "@/components/ui/Textarea";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
import { uploadFile } from "@/lib/adminUpload";
import type { LandingChapter, LandingPoint, WorkLanding } from "@/types/workLanding";
import styles from "./LandingEditor.module.css";

/**
 * 작업물 편집기 — 추가 정보의 '랜딩 페이지' 카드. 한 언어치(편집 중인 언어) 내용을 고친다.
 * 설정에서 작업물 상세를 랜딩 페이지로 고르면 이 내용으로 그려진다(WorkLanding). 비워 둔 칸은 다른 칸으로 채운다.
 * 목록은 모두 같은 모양 — 줄마다 위/아래 · 지우기, 끝에 '추가'.
 */
export default function LandingEditor({
  value,
  onChange,
  tw,
  modeHint,
}: {
  value: WorkLanding;
  onChange: (next: WorkLanding) => void;
  tw: (key: string) => string;
  /** 지금 설정이 게시물 형태면 알리는 줄 */
  modeHint?: ReactNode;
}) {
  const set = <K extends keyof WorkLanding>(key: K, v: WorkLanding[K]) => onChange({ ...value, [key]: v });

  return (
    <div className={styles.wrap}>
      <p className={styles.hint}>{tw("landingHint")}</p>
      {modeHint}

      <div className={styles.grid2}>
        <label className={es.field}>
          <span className={es.fieldLabel}>{tw("landingTagline")}</span>
          <input
            className={es.fieldInput}
            value={value.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder={tw("landingTaglinePlaceholder")}
          />
        </label>
        <div className={es.field}>
          <span className={es.fieldLabel}>{tw("landingContext")}</span>
          <Textarea
            value={value.context}
            onChange={(v) => set("context", v)}
            placeholder={tw("landingContextPlaceholder")}
            rows={2}
          />
        </div>
      </div>

      {/* 숫자 요약 */}
      <Group title={tw("landingFacts")} hint={tw("landingFactsHint")} onAdd={() => set("facts", [...value.facts, { value: "", label: "" }])} addLabel={tw("landingAdd")}>
        {value.facts.map((f, i) => (
          <Row key={i} index={i} list={value.facts} onList={(l) => set("facts", l)} tw={tw}>
            <input className={`${es.fieldInput} ${styles.short}`} value={f.value} placeholder="16"
              onChange={(e) => set("facts", replace(value.facts, i, { ...f, value: e.target.value }))} />
            <input className={es.fieldInput} value={f.label} placeholder={tw("landingFactLabelPlaceholder")}
              onChange={(e) => set("facts", replace(value.facts, i, { ...f, label: e.target.value }))} />
          </Row>
        ))}
      </Group>

      {/* 주요 기능 */}
      <Group title={tw("landingHighlights")} hint={tw("landingHighlightsHint")} onAdd={() => set("highlights", [...value.highlights, emptyPoint()])} addLabel={tw("landingAdd")}>
        {value.highlights.map((p, i) => (
          <Row key={i} index={i} list={value.highlights} onList={(l) => set("highlights", l)} tw={tw} block>
            <PointFields point={p} onChange={(np) => set("highlights", replace(value.highlights, i, np))} tw={tw} />
          </Row>
        ))}
      </Group>

      {/* 챕터 */}
      <Group title={tw("landingChapters")} hint={tw("landingChaptersHint")} onAdd={() => set("chapters", [...value.chapters, { title: "", lead: "", points: [] }])} addLabel={tw("landingAddChapter")}>
        {value.chapters.map((c, i) => (
          <Row key={i} index={i} list={value.chapters} onList={(l) => set("chapters", l)} tw={tw} block>
            <ChapterFields chapter={c} onChange={(nc) => set("chapters", replace(value.chapters, i, nc))} tw={tw} />
          </Row>
        ))}
      </Group>

      {/* 진행 과정 */}
      <Group title={tw("landingTimeline")} onAdd={() => set("timeline", [...value.timeline, { date: "", label: "" }])} addLabel={tw("landingAdd")}>
        {value.timeline.map((t, i) => (
          <Row key={i} index={i} list={value.timeline} onList={(l) => set("timeline", l)} tw={tw}>
            <input className={`${es.fieldInput} ${styles.short}`} value={t.date} placeholder="2026.03"
              onChange={(e) => set("timeline", replace(value.timeline, i, { ...t, date: e.target.value }))} />
            <input className={es.fieldInput} value={t.label} placeholder={tw("landingTimelinePlaceholder")}
              onChange={(e) => set("timeline", replace(value.timeline, i, { ...t, label: e.target.value }))} />
          </Row>
        ))}
      </Group>

      {/* 기술 사양 */}
      <Group title={tw("landingSpecs")} hint={tw("landingSpecsHint")} onAdd={() => set("specs", [...value.specs, { label: "", value: "" }])} addLabel={tw("landingAdd")}>
        {value.specs.map((s, i) => (
          <Row key={i} index={i} list={value.specs} onList={(l) => set("specs", l)} tw={tw}>
            <input className={`${es.fieldInput} ${styles.short}`} value={s.label} placeholder="Frontend"
              onChange={(e) => set("specs", replace(value.specs, i, { ...s, label: e.target.value }))} />
            <input className={es.fieldInput} value={s.value} placeholder="Next.js 16 · React 19"
              onChange={(e) => set("specs", replace(value.specs, i, { ...s, value: e.target.value }))} />
          </Row>
        ))}
      </Group>
    </div>
  );
}

const emptyPoint = (): LandingPoint => ({ title: "", body: "" });

function replace<T>(list: T[], i: number, item: T): T[] {
  return list.map((x, j) => (j === i ? item : x));
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

function Group({ title, hint, onAdd, addLabel, children }: { title: string; hint?: string; onAdd: () => void; addLabel: string; children: ReactNode }) {
  return (
    <section className={styles.group}>
      <div className={styles.groupHead}>
        <h3 className={es.fieldLabel}>{title}</h3>
        {hint && <span className={styles.groupHint}>{hint}</span>}
      </div>
      <div className={styles.rows}>{children}</div>
      <div>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus size={14} /> {addLabel}
        </Button>
      </div>
    </section>
  );
}

/** 목록 한 줄 — 오른쪽에 위/아래 · 지우기. block 이면 칸들이 세로로 쌓인다(기능 · 챕터) */
function Row<T>({ index, list, onList, tw, block, children }: {
  index: number; list: T[]; onList: (l: T[]) => void; tw: (k: string) => string; block?: boolean; children: ReactNode;
}) {
  return (
    <div className={`${styles.row}${block ? ` ${styles.rowBlock}` : ""}`}>
      <div className={styles.rowFields}>{children}</div>
      <div className={styles.rowActions}>
        <Pressable className={styles.iconBtn} onClick={() => onList(move(list, index, index - 1))} disabled={index === 0} aria-label={tw("landingMoveUp")}>
          <ArrowUp size={14} />
        </Pressable>
        <Pressable className={styles.iconBtn} onClick={() => onList(move(list, index, index + 1))} disabled={index === list.length - 1} aria-label={tw("landingMoveDown")}>
          <ArrowDown size={14} />
        </Pressable>
        <Pressable className={styles.iconBtn} onClick={() => onList(list.filter((_, j) => j !== index))} aria-label={tw("landingRemove")}>
          <X size={14} />
        </Pressable>
      </div>
    </div>
  );
}

function PointFields({ point, onChange, tw }: { point: LandingPoint; onChange: (p: LandingPoint) => void; tw: (k: string) => string }) {
  return (
    <>
      <input className={es.fieldInput} value={point.title} placeholder={tw("landingPointTitle")}
        onChange={(e) => onChange({ ...point, title: e.target.value })} />
      <Textarea value={point.body} onChange={(v) => onChange({ ...point, body: v })} placeholder={tw("landingPointBody")} rows={2} />
      <ImageInput value={point.image ?? ""} onChange={(image) => onChange({ ...point, image: image || undefined })} tw={tw} />
    </>
  );
}

function ChapterFields({ chapter, onChange, tw }: { chapter: LandingChapter; onChange: (c: LandingChapter) => void; tw: (k: string) => string }) {
  return (
    <>
      <input className={`${es.fieldInput} ${styles.chapterTitle}`} value={chapter.title} placeholder={tw("landingChapterTitle")}
        onChange={(e) => onChange({ ...chapter, title: e.target.value })} />
      <Textarea value={chapter.lead} onChange={(v) => onChange({ ...chapter, lead: v })} placeholder={tw("landingChapterLead")} rows={2} />
      <div className={styles.subRows}>
        {chapter.points.map((p, i) => (
          <Row key={i} index={i} list={chapter.points} onList={(points) => onChange({ ...chapter, points })} tw={tw} block>
            <PointFields point={p} onChange={(np) => onChange({ ...chapter, points: replace(chapter.points, i, np) })} tw={tw} />
          </Row>
        ))}
        <div>
          <Button size="sm" variant="ghost" onClick={() => onChange({ ...chapter, points: [...chapter.points, emptyPoint()] })}>
            <Plus size={14} /> {tw("landingAddPoint")}
          </Button>
        </div>
      </div>
    </>
  );
}

/** 이미지 — 주소를 적거나 파일을 올린다. 올린 그림은 작은 미리보기로 */
function ImageInput({ value, onChange, tw }: { value: string; onChange: (url: string) => void; tw: (k: string) => string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setFailed(false);
    try {
      onChange(await uploadFile(file, "works"));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  return (
    <div className={styles.image}>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element -- 편집기 미리보기(아무 주소나 들어온다)
        <img src={value} alt="" className={styles.imageThumb} />
      ) : (
        <span className={styles.imageThumb} aria-hidden><ImageIcon size={14} /></span>
      )}
      <input className={es.fieldInput} value={value} placeholder={tw("landingImagePlaceholder")} onChange={(e) => onChange(e.target.value)} />
      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? tw("landingUploading") : tw("landingUpload")}
      </Button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {failed && <span className={styles.imageError}>{tw("landingUploadFailed")}</span>}
    </div>
  );
}
