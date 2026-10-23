"use client";

import { useMemo, useState, type ReactNode } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, ChevronDown, GripDotsIcon, ImagePlus, Plus, Trash2, X } from "@/components/icons";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Pressable from "@/components/ui/Pressable";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { useLanguage } from "@/providers/LanguageProvider";
import { showToast } from "@/stores/toastStore";
import { errorText } from "@/lib/apiError";
import { pickFiles } from "@/lib/pickFiles";
import { fillTemplate } from "@/utils/format";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { sectionNo, type LandingFrameAt, type LandingItem, type LandingItemKind, type LandingL10n, type LandingSection, type WorkLanding } from "@/lib/workLanding";
import styles from "./LandingEditor.module.css";

type Lang = "ko" | "en";
type Upload = (file: File) => Promise<string>;

const EMPTY: LandingL10n = { ko: "", en: "" };
const KINDS: LandingItemKind[] = ["frame", "phones", "sequence", "marquee", "numbers"];
const ATS: LandingFrameAt[] = ["bleed", "wide", "left", "right", "center"];

/** 저장된 값이 랜딩 모양이면 그대로 편집한다 — 정규화하면 막 추가한 빈 항목(그림 올리기 전)이 사라진다 */
export function asEditableLanding(raw: unknown): WorkLanding | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<WorkLanding>;
  if (!Array.isArray(o.sections) || !Array.isArray(o.hero)) return null;
  return { eyebrow: o.eyebrow ?? EMPTY, hero: o.hero, sections: o.sections };
}

function newItem(kind: LandingItemKind): LandingItem {
  switch (kind) {
    case "frame": return { kind, at: "wide", alt: EMPTY };
    case "marquee": return { kind, rows: [[], []] };
    case "sequence": return { kind, items: [] };
    case "phones": return { kind, items: [] };
    case "numbers": return { kind, items: [{ value: "", label: EMPTY }] };
  }
}

const move = <T,>(list: T[], from: number, to: number) => (to < 0 || to >= list.length ? list : arrayMove([...list], from, to));

/** 그림 · 영상을 골라 올린다 — 여럿이면 차례대로. 실패한 파일은 알리고 건너뛴다 */
function useUploader(onUpload: Upload) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const pick = (multiple: boolean, onDone: (urls: string[]) => void, accept = "image/*,video/*") => {
    pickFiles({ accept, multiple }, async (files) => {
      setBusy(true);
      const urls: string[] = [];
      for (const f of files) {
        try { urls.push(await onUpload(f)); } catch (err) { showToast(errorText(err, t, t("admin.common.uploadFailed")), "error"); }
      }
      setBusy(false);
      if (urls.length) onDone(urls);
    });
  };
  return { busy, pick };
}

function Thumb({ src, video }: { src?: string; video?: string }) {
  if (video || (src && isVideoUrl(src))) return <video className={styles.media} src={video || src} muted playsInline preload="metadata" />;
  /* eslint-disable-next-line @next/next/no-img-element */
  return src ? <img className={styles.media} src={src} alt="" loading="lazy" /> : null;
}

/** 그림 한 칸 — 비었으면 올리기, 있으면 눌러서 바꾸기 */
function MediaSlot({ src, video, onUpload, onChange, onRemove, accept, wide }: {
  src?: string; video?: string; onUpload: Upload; onChange: (url: string) => void; onRemove?: () => void; accept?: string; wide?: boolean;
}) {
  const { t } = useLanguage();
  const { busy, pick } = useUploader(onUpload);
  const has = !!(src || video);
  return (
    <div className={`${styles.slot}${wide ? ` ${styles.slotWide}` : ""}`} data-busy={busy ? "" : undefined}>
      <Pressable className={styles.slotPick} onClick={() => pick(false, ([u]) => onChange(u), accept)} aria-label={t("admin.works.editor.landing.upload")}>
        {has ? <Thumb src={src} video={video} /> : <span className={styles.slotEmpty}><ImagePlus size={18} strokeWidth={1.5} />{t("admin.works.editor.landing.upload")}</span>}
      </Pressable>
      {has && onRemove && (
        <Pressable className={styles.slotRemove} onClick={onRemove} aria-label={t("admin.works.editor.landing.remove")}><X size={12} /></Pressable>
      )}
    </div>
  );
}

/** 그림 여러 장(장면 넘기기 · 흐르는 띠 한 줄) — 장마다 설명, 끝에 더하기 */
function MediaList({ items, lang, onUpload, onChange }: {
  items: { src: string; alt: LandingL10n }[]; lang: Lang; onUpload: Upload; onChange: (next: { src: string; alt: LandingL10n }[]) => void;
}) {
  const { t } = useLanguage();
  const { busy, pick } = useUploader(onUpload);
  return (
    <div className={styles.grid}>
      {items.map((m, i) => (
        <div key={`${m.src}-${i}`} className={styles.cell}>
          <MediaSlot src={m.src} onUpload={onUpload} accept="image/*"
            onChange={(u) => onChange(items.map((x, j) => (j === i ? { ...x, src: u } : x)))}
            onRemove={() => onChange(items.filter((_, j) => j !== i))} />
          <Input size="sm" value={m.alt[lang]} placeholder={t("admin.works.editor.landing.alt")}
            onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, alt: { ...x.alt, [lang]: v } } : x)))} />
        </div>
      ))}
      <Pressable className={styles.addCell} data-busy={busy ? "" : undefined}
        onClick={() => pick(true, (urls) => onChange([...items, ...urls.map((src) => ({ src, alt: EMPTY }))]), "image/*")}>
        <Plus size={16} />{t("admin.works.editor.landing.addImages")}
      </Pressable>
    </div>
  );
}

function ItemBody({ item, lang, onUpload, onChange }: { item: LandingItem; lang: Lang; onUpload: Upload; onChange: (next: LandingItem) => void }) {
  const { t } = useLanguage();
  const tl = (k: string) => t(`admin.works.editor.landing.${k}`);
  switch (item.kind) {
    case "frame":
      return (
        <div className={styles.frameRow}>
          <MediaSlot src={item.src} video={item.video} onUpload={onUpload} wide
            onChange={(u) => onChange(isVideoUrl(u) ? { ...item, video: u, src: undefined, width: undefined, height: undefined } : { ...item, src: u, video: undefined, width: undefined, height: undefined })} />
          <div className={styles.fields}>
            <Select value={item.at} onChange={(v) => onChange({ ...item, at: v as LandingFrameAt })}
              options={ATS.map((a) => ({ value: a, label: tl(`at.${a}`) }))} />
            <Input value={item.alt[lang]} placeholder={tl("alt")} onChange={(v) => onChange({ ...item, alt: { ...item.alt, [lang]: v } })} />
          </div>
        </div>
      );
    case "sequence":
      return <MediaList items={item.items} lang={lang} onUpload={onUpload} onChange={(items) => onChange({ ...item, items })} />;
    case "marquee":
      return (
        <div className={styles.rows}>
          {item.rows.map((row, r) => (
            <div key={r} className={styles.rowBlock}>
              <span className={styles.rowLabel}>{tl("row")} {r + 1}</span>
              <MediaList items={row} lang={lang} onUpload={onUpload} onChange={(next) => onChange({ ...item, rows: item.rows.map((x, j) => (j === r ? next : x)) })} />
            </div>
          ))}
        </div>
      );
    case "phones":
      return (
        <div className={styles.rows}>
          {item.items.map((p, i) => {
            const set = (patch: Partial<typeof p>) => onChange({ ...item, items: item.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <div key={`${p.src}-${i}`} className={styles.phoneRow}>
                <div className={styles.phoneMedia}>
                  <MediaSlot src={p.src} onUpload={onUpload} accept="image/*" onChange={(src) => set({ src })} />
                  <MediaSlot video={p.video} onUpload={onUpload} accept="video/*" onChange={(video) => set({ video })} onRemove={() => set({ video: undefined })} />
                </div>
                <div className={styles.fields}>
                  <Input value={p.route[lang]} placeholder={tl("route")} onChange={(v) => set({ route: { ...p.route, [lang]: v } })} />
                  <Input value={p.alt[lang]} placeholder={tl("alt")} onChange={(v) => set({ alt: { ...p.alt, [lang]: v } })} />
                </div>
                <ItemTools index={i} count={item.items.length}
                  onMove={(to) => onChange({ ...item, items: move(item.items, i, to) })}
                  onRemove={() => onChange({ ...item, items: item.items.filter((_, j) => j !== i) })} />
              </div>
            );
          })}
          <AddPhone onUpload={onUpload} onAdd={(src) => onChange({ ...item, items: [...item.items, { src, alt: EMPTY, route: EMPTY }] })} />
        </div>
      );
    case "numbers":
      return (
        <div className={styles.rows}>
          {item.items.map((n, i) => (
            <div key={i} className={styles.numberRow}>
              <Input value={n.value} placeholder={tl("value")}
                onChange={(v) => onChange({ ...item, items: item.items.map((x, j) => (j === i ? { ...x, value: v } : x)) })} />
              <Input value={n.label[lang]} placeholder={tl("label")}
                onChange={(v) => onChange({ ...item, items: item.items.map((x, j) => (j === i ? { ...x, label: { ...x.label, [lang]: v } } : x)) })} />
              <ItemTools index={i} count={item.items.length}
                onMove={(to) => onChange({ ...item, items: move(item.items, i, to) })}
                onRemove={() => onChange({ ...item, items: item.items.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={() => onChange({ ...item, items: [...item.items, { value: "", label: EMPTY }] })}>
            {tl("addNumber")}
          </Button>
        </div>
      );
  }
}

function AddPhone({ onUpload, onAdd }: { onUpload: Upload; onAdd: (src: string) => void }) {
  const { t } = useLanguage();
  const { busy, pick } = useUploader(onUpload);
  return (
    <Button variant="outline" size="sm" icon={<Plus size={14} />} loading={busy} onClick={() => pick(true, (urls) => urls.forEach(onAdd), "image/*")}>
      {t("admin.works.editor.landing.addScreen")}
    </Button>
  );
}

/** 위 · 아래로 옮기기와 지우기 */
function ItemTools({ index, count, onMove, onRemove }: { index: number; count: number; onMove: (to: number) => void; onRemove: () => void }) {
  const { t } = useLanguage();
  const tl = (k: string) => t(`admin.works.editor.landing.${k}`);
  return (
    <div className={styles.tools}>
      <Pressable className={styles.tool} onClick={() => onMove(index - 1)} disabled={index === 0} aria-label={tl("moveUp")}><ArrowUp size={14} /></Pressable>
      <Pressable className={styles.tool} onClick={() => onMove(index + 1)} disabled={index === count - 1} aria-label={tl("moveDown")}><ArrowDown size={14} /></Pressable>
      <Pressable className={styles.tool} onClick={onRemove} aria-label={tl("remove")}><Trash2 size={14} /></Pressable>
    </div>
  );
}

/** 항목 목록 — 종류 이름 · 옮기기 · 지우기가 붙은 카드들과 끝의 "항목 추가" */
function ItemList({ items, lang, onUpload, onChange }: { items: LandingItem[]; lang: Lang; onUpload: Upload; onChange: (next: LandingItem[]) => void }) {
  const { t } = useLanguage();
  const tl = (k: string) => t(`admin.works.editor.landing.${k}`);
  return (
    <div className={styles.items}>
      {items.map((item, i) => (
        <div key={i} className={styles.item}>
          <div className={styles.itemHead}>
            <span className={styles.kind}>{tl(`kind.${item.kind}`)}</span>
            <ItemTools index={i} count={items.length} onMove={(to) => onChange(move(items, i, to))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
          </div>
          <ItemBody item={item} lang={lang} onUpload={onUpload} onChange={(next) => onChange(items.map((x, j) => (j === i ? next : x)))} />
        </div>
      ))}
      <Select value="" placeholder={tl("addItem")} className={styles.addItem}
        options={KINDS.map((k) => ({ value: k, label: tl(`kind.${k}`) }))}
        onChange={(k) => onChange([...items, newItem(k as LandingItemKind)])} />
    </div>
  );
}

/** 항목들의 그림 — 접은 섹션의 썸네일 줄 */
function itemMedia(items: LandingItem[]): string[] {
  return items.flatMap((it) => {
    switch (it.kind) {
      case "frame": return [it.src || it.video || ""];
      case "marquee": return it.rows.flat().map((m) => m.src);
      case "sequence": case "phones": return it.items.map((m) => m.src);
      case "numbers": return [];
    }
  }).filter(Boolean);
}

function SortableSection({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <section ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={styles.section} data-dragging={isDragging ? "" : undefined} {...attributes}>
      {children(<Pressable className={styles.grip} {...listeners} aria-label="Drag to reorder"><GripDotsIcon /></Pressable>)}
    </section>
  );
}

/**
 * 작업물 랜딩 편집기 — 머리 한 줄, 첫 번호 앞의 장면들, 번호가 붙는 섹션들(끌어서 차례 바꾸기 · 제목 · 설명 · 장면).
 * 글은 편집 언어(lang) 칸만 고친다. 처음에는 저장소 기본 데이터 · 카드 정보로 만든 기본 랜딩을 보여 주고, 고치면 그 값이 저장된다.
 */
export default function LandingEditor({ value, isDefault, lang, onUpload, onChange, onReset }: {
  value: WorkLanding; isDefault: boolean; lang: Lang; onUpload: Upload; onChange: (next: WorkLanding) => void; onReset: () => void;
}) {
  const { t } = useLanguage();
  const tl = (k: string) => t(`admin.works.editor.landing.${k}`);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));
  const ids = useMemo(() => value.sections.map((s) => s.id), [value.sections]);
  /* 섹션은 접어 둔다 — 장면이 많아 다 펼치면 편집 화면이 끝없이 길어진다. 새로 만든 섹션은 펼친다 */
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) => setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const setSection = (i: number, patch: Partial<LandingSection>) =>
    onChange({ ...value, sections: value.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onChange({ ...value, sections: move(value.sections, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))) });
  };
  const addSection = () => {
    const id = `s${Date.now().toString(36)}`;
    onChange({ ...value, sections: [...value.sections, { id, title: EMPTY, body: EMPTY, items: [] }] });
    setOpen((prev) => new Set(prev).add(id));
  };

  return (
    <div className={styles.editor}>
      <div className={styles.notice}>
        <span>{isDefault ? tl("defaultNotice") : tl("customNotice")}</span>
        {!isDefault && <Button variant="outline" size="sm" shape="capsule" onClick={onReset}>{tl("reset")}</Button>}
      </div>

      <Input label={tl("eyebrow")} value={value.eyebrow[lang]} onChange={(v) => onChange({ ...value, eyebrow: { ...value.eyebrow, [lang]: v } })} />

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>{tl("hero")}</h3>
        <ItemList items={value.hero} lang={lang} onUpload={onUpload} onChange={(hero) => onChange({ ...value, hero })} />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {value.sections.map((s, i) => (
            <SortableSection key={s.id} id={s.id}>
              {(grip) => (
                <>
                  <div className={styles.sectionHead}>
                    {grip}
                    <span className={styles.no}>{sectionNo(i)}</span>
                    <Input className={styles.sectionTitle} value={s.title[lang]} placeholder={tl("sectionTitle")}
                      onChange={(v) => setSection(i, { title: { ...s.title, [lang]: v } })} />
                    <Pressable className={styles.tool} aria-label={tl(open.has(s.id) ? "collapse" : "expand")} aria-expanded={open.has(s.id)} onClick={() => toggle(s.id)}>
                      <ChevronDown size={14} className={open.has(s.id) ? styles.chevronOpen : undefined} />
                    </Pressable>
                    <Pressable className={styles.tool} aria-label={tl("removeSection")}
                      onClick={() => onChange({ ...value, sections: value.sections.filter((_, j) => j !== i) })}><Trash2 size={14} /></Pressable>
                  </div>
                  {open.has(s.id) ? (
                    <>
                      <Textarea value={s.body?.[lang] ?? ""} placeholder={tl("sectionBody")}
                        onChange={(v) => setSection(i, { body: { ...(s.body ?? EMPTY), [lang]: v } })} />
                      <ItemList items={s.items} lang={lang} onUpload={onUpload} onChange={(items) => setSection(i, { items })} />
                    </>
                  ) : (
                    <Pressable className={styles.summary} onClick={() => toggle(s.id)}>
                      {s.body?.[lang] && <span className={styles.summaryBody}>{s.body[lang]}</span>}
                      <span className={styles.strip}>
                        {itemMedia(s.items).slice(0, 12).map((src, k) => <span key={k} className={styles.stripThumb}><Thumb src={src} /></span>)}
                        <span className={styles.count}>{fillTemplate(tl("itemCount"), { n: s.items.length })}</span>
                      </span>
                    </Pressable>
                  )}
                </>
              )}
            </SortableSection>
          ))}
        </SortableContext>
      </DndContext>

      <Button variant="outline" fullWidth icon={<Plus size={14} />} onClick={addSection}>{tl("addSection")}</Button>
    </div>
  );
}
