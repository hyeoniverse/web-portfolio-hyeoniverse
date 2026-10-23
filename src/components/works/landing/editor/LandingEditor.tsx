"use client";

import { useMemo, useState, type ReactNode } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, ArrowRight, ArrowUp, ChevronDown, Columns3, GripDotsIcon, Hash, Image as ImageIcon, Images, Plus, Smartphone, Trash2, Upload, X } from "@/components/icons";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Popover, { MenuItem } from "@/components/ui/Popover";
import Pressable from "@/components/ui/Pressable";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
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
type Media = { src: string; alt: LandingL10n };

const EMPTY: LandingL10n = { ko: "", en: "" };
const KINDS: LandingItemKind[] = ["frame", "phones", "sequence", "marquee", "numbers"];
const KIND_ICON: Record<LandingItemKind, ReactNode> = {
  frame: <ImageIcon size={14} />, phones: <Smartphone size={14} />, sequence: <Images size={14} />, marquee: <Columns3 size={14} />, numbers: <Hash size={14} />,
};
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

/** 항목의 그림들 — 타일 · 접은 섹션의 썸네일 */
function itemMedia(it: LandingItem): string[] {
  switch (it.kind) {
    case "frame": return [it.src || it.video || ""].filter(Boolean);
    case "marquee": return it.rows.flat().map((m) => m.src);
    case "sequence": case "phones": return it.items.map((m) => m.src);
    case "numbers": return [];
  }
}

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

function useTl() {
  const { t } = useLanguage();
  return (k: string) => t(`admin.works.editor.landing.${k}`);
}

function Thumb({ src, video }: { src?: string; video?: string }) {
  if (video || (src && isVideoUrl(src))) return <video className={styles.media} src={video || src} muted playsInline preload="metadata" />;
  /* eslint-disable-next-line @next/next/no-img-element */
  return src ? <img className={styles.media} src={src} alt="" loading="lazy" /> : null;
}

/** 아이콘 단추(32 정사각) — 옮기기 · 펼치기 · 지우기 */
function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <Pressable className={`${styles.iconBtn}${danger ? ` ${styles.iconBtnDanger}` : ""}`} onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      {children}
    </Pressable>
  );
}

function UploadBtn({ onUpload, onDone, multiple, accept, children }: { onUpload: Upload; onDone: (urls: string[]) => void; multiple?: boolean; accept?: string; children: ReactNode }) {
  const { busy, pick } = useUploader(onUpload);
  return (
    <Button variant="ghost" className={es.toolBtn} icon={<Upload size={14} />} loading={busy} onClick={() => pick(!!multiple, onDone, accept)}>
      {children}
    </Button>
  );
}

/** 그림 여러 장(넘기는 장면 · 흐르는 띠 한 줄) — 작은 타일마다 설명, 끝에 더하기 */
function MediaGrid({ items, lang, onUpload, onChange }: { items: Media[]; lang: Lang; onUpload: Upload; onChange: (next: Media[]) => void }) {
  const tl = useTl();
  const { busy, pick } = useUploader(onUpload);
  return (
    <div className={styles.mediaGrid}>
      {items.map((m, i) => (
        <div key={`${m.src}-${i}`} className={styles.mediaCell}>
          <div className={styles.mediaBox}>
            <Thumb src={m.src} />
            <Pressable className={styles.mediaRemove} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={tl("remove")}><X size={12} /></Pressable>
          </div>
          <Input size="sm" clearable={false} value={m.alt[lang]} placeholder={tl("alt")}
            onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, alt: { ...x.alt, [lang]: v } } : x)))} />
        </div>
      ))}
      <Pressable className={styles.mediaAdd} data-busy={busy ? "" : undefined}
        onClick={() => pick(true, (urls) => onChange([...items, ...urls.map((src) => ({ src, alt: EMPTY }))]), "image/*")}>
        <Plus size={14} />{tl("addImages")}
      </Pressable>
    </div>
  );
}

/** 고른 장면의 폼 — 장면 줄 바로 아래, 그 자리에서 열린다 */
function ItemForm({ item, lang, onUpload, onChange }: { item: LandingItem; lang: Lang; onUpload: Upload; onChange: (next: LandingItem) => void }) {
  const tl = useTl();
  switch (item.kind) {
    case "frame":
      return (
        <div className={styles.frameForm}>
          <div className={styles.frameMedia}>
            <div className={styles.framePreview}>
              {item.src || item.video ? <Thumb src={item.src} video={item.video} /> : <span className={styles.emptyLine}>{tl("noMedia")}</span>}
            </div>
            <div className={styles.inline}>
              <UploadBtn onUpload={onUpload} onDone={([u]) => onChange(isVideoUrl(u)
                ? { ...item, video: u, src: undefined, width: undefined, height: undefined }
                : { ...item, src: u, video: undefined, width: undefined, height: undefined })}>
                {item.src || item.video ? tl("replace") : tl("upload")}
              </UploadBtn>
            </div>
          </div>
          <div className={styles.fields}>
            <div className={es.field}>
              <span className={es.fieldLabel}>{tl("atLabel")}</span>
              <Select value={item.at} onChange={(v) => onChange({ ...item, at: v as LandingFrameAt })}
                options={ATS.map((a) => ({ value: a, label: tl(`at.${a}`) }))} />
            </div>
            <Input label={tl("alt")} value={item.alt[lang]} onChange={(v) => onChange({ ...item, alt: { ...item.alt, [lang]: v } })} />
          </div>
        </div>
      );
    case "sequence":
      return <MediaGrid items={item.items} lang={lang} onUpload={onUpload} onChange={(items) => onChange({ ...item, items })} />;
    case "marquee":
      return (
        <div className={styles.stack}>
          {item.rows.map((row, r) => (
            <div key={r} className={es.field}>
              <span className={es.fieldLabel}>{fillTemplate(tl("rowN"), { n: r + 1 })}</span>
              <MediaGrid items={row} lang={lang} onUpload={onUpload} onChange={(next) => onChange({ ...item, rows: item.rows.map((x, j) => (j === r ? next : x)) })} />
            </div>
          ))}
        </div>
      );
    case "phones":
      return (
        <div className={styles.stack}>
          {item.items.length > 0 ? (
            <ul className={styles.rows}>
              {item.items.map((p, i) => {
                const set = (patch: Partial<typeof p>) => onChange({ ...item, items: item.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                return (
                  <li key={`${p.src}-${i}`} className={styles.phoneRow}>
                    <span className={styles.phoneThumb}><Thumb src={p.src} /></span>
                    <div className={styles.pair}>
                      <Input size="sm" clearable={false} value={p.route[lang]} placeholder={tl("route")} onChange={(v) => set({ route: { ...p.route, [lang]: v } })} />
                      <Input size="sm" clearable={false} value={p.alt[lang]} placeholder={tl("alt")} onChange={(v) => set({ alt: { ...p.alt, [lang]: v } })} />
                    </div>
                    <div className={styles.rowEnd}>
                      <UploadBtn onUpload={onUpload} accept="video/*" onDone={([video]) => set({ video })}>
                        {p.video ? tl("videoReplace") : tl("videoAdd")}
                      </UploadBtn>
                      <IconBtn label={tl("moveUp")} disabled={i === 0} onClick={() => onChange({ ...item, items: move(item.items, i, i - 1) })}><ArrowUp size={14} /></IconBtn>
                      <IconBtn label={tl("remove")} danger onClick={() => onChange({ ...item, items: item.items.filter((_, j) => j !== i) })}><Trash2 size={14} /></IconBtn>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : <p className={styles.emptyLine}>{tl("noScreens")}</p>}
          <div className={styles.inline}>
            <UploadBtn onUpload={onUpload} multiple accept="image/*" onDone={(urls) => onChange({ ...item, items: [...item.items, ...urls.map((src) => ({ src, alt: EMPTY, route: EMPTY }))] })}>
              {tl("addScreen")}
            </UploadBtn>
          </div>
        </div>
      );
    case "numbers":
      return (
        <div className={styles.stack}>
          <ul className={styles.rows}>
            {item.items.map((n, i) => (
              <li key={i} className={styles.numberRow}>
                <Input size="sm" clearable={false} value={n.value} placeholder={tl("value")}
                  onChange={(v) => onChange({ ...item, items: item.items.map((x, j) => (j === i ? { ...x, value: v } : x)) })} />
                <Input size="sm" clearable={false} value={n.label[lang]} placeholder={tl("label")}
                  onChange={(v) => onChange({ ...item, items: item.items.map((x, j) => (j === i ? { ...x, label: { ...x.label, [lang]: v } } : x)) })} />
                <IconBtn label={tl("remove")} danger onClick={() => onChange({ ...item, items: item.items.filter((_, j) => j !== i) })}><Trash2 size={14} /></IconBtn>
              </li>
            ))}
          </ul>
          <div className={styles.inline}>
            <Button variant="ghost" className={es.toolBtn} icon={<Plus size={14} />} onClick={() => onChange({ ...item, items: [...item.items, { value: "", label: EMPTY }] })}>
              {tl("addNumber")}
            </Button>
          </div>
        </div>
      );
  }
}

/** 장면 타일 하나 — 대표 그림(숫자는 첫 값)과 종류 · 장 수 */
function Tile({ item, active, onClick }: { item: LandingItem; active: boolean; onClick: () => void }) {
  const tl = useTl();
  const media = itemMedia(item);
  const count = item.kind === "numbers" ? item.items.length : media.length;
  return (
    <Pressable className={styles.tile} data-active={active ? "" : undefined} onClick={onClick} aria-pressed={active}>
      <span className={styles.tileMedia}>
        {item.kind === "numbers"
          ? <span className={styles.tileNumber}>{item.items[0]?.value || "0"}</span>
          : media[0] ? <Thumb src={media[0]} /> : <span className={styles.tileEmpty}>{KIND_ICON[item.kind]}</span>}
      </span>
      <span className={styles.tileLabel}>
        {tl(`kind.${item.kind}`)}
        {item.kind !== "frame" && <span className={styles.tileCount}>{count}</span>}
      </span>
    </Pressable>
  );
}

/** 장면 줄 — 타일을 누르면 그 아래에서 폼이 열리고, 끝의 "장면"으로 종류를 골라 더한다 */
function SceneStrip({ items, lang, onUpload, onChange }: { items: LandingItem[]; lang: Lang; onUpload: Upload; onChange: (next: LandingItem[]) => void }) {
  const tl = useTl();
  const [sel, setSel] = useState<number | null>(null);
  const cur = sel !== null && sel < items.length ? sel : null;
  return (
    <div className={styles.strip}>
      <div className={styles.tiles}>
        {items.map((it, i) => <Tile key={i} item={it} active={cur === i} onClick={() => setSel(cur === i ? null : i)} />)}
        <Popover placement="bottom-start" responsive={false} maxHeight={false} menu
          trigger={<Pressable className={styles.tileAdd}><Plus size={16} /><span>{tl("addItem")}</span></Pressable>}>
          {({ close }) => (
            <>
              {KINDS.map((k) => (
                <MenuItem key={k} icon={KIND_ICON[k]} label={tl(`kind.${k}`)}
                  onClick={() => { onChange([...items, newItem(k)]); setSel(items.length); close(); }} />
              ))}
            </>
          )}
        </Popover>
      </div>
      {cur !== null && (
        <div className={styles.form}>
          <div className={styles.formHead}>
            <span className={styles.formTitle}>{KIND_ICON[items[cur].kind]}{tl(`kind.${items[cur].kind}`)}</span>
            <div className={styles.rowEnd}>
              <IconBtn label={tl("moveLeft")} disabled={cur === 0} onClick={() => { onChange(move(items, cur, cur - 1)); setSel(cur - 1); }}><ArrowLeft size={14} /></IconBtn>
              <IconBtn label={tl("moveRight")} disabled={cur === items.length - 1} onClick={() => { onChange(move(items, cur, cur + 1)); setSel(cur + 1); }}><ArrowRight size={14} /></IconBtn>
              <IconBtn label={tl("removeItem")} danger onClick={() => { onChange(items.filter((_, j) => j !== cur)); setSel(null); }}><Trash2 size={14} /></IconBtn>
            </div>
          </div>
          <ItemForm item={items[cur]} lang={lang} onUpload={onUpload} onChange={(next) => onChange(items.map((x, j) => (j === cur ? next : x)))} />
        </div>
      )}
    </div>
  );
}

function SortableSection({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={styles.section} data-dragging={isDragging ? "" : undefined} {...attributes}>
      {children(<Pressable className={styles.grip} {...listeners} aria-label="Drag to reorder"><GripDotsIcon /></Pressable>)}
    </li>
  );
}

/**
 * 작업물 랜딩 편집기 — 머리 한 줄, 첫 장면들, 번호가 붙는 섹션 목록(끌어서 차례 바꾸기 · 제목 · 설명 · 장면).
 * 섹션은 접힌 한 줄(번호 · 제목 · 설명 · 썸네일)로 두고, 누르면 그 자리에서 펼친다. 글은 편집 언어(lang) 칸만 고친다.
 * 처음에는 저장소 기본 데이터 · 카드 정보로 만든 기본 랜딩을 보여 주고, 고치면 그 값이 저장된다.
 */
export default function LandingEditor({ value, isDefault, lang, onUpload, onChange, onReset }: {
  value: WorkLanding; isDefault: boolean; lang: Lang; onUpload: Upload; onChange: (next: WorkLanding) => void; onReset: () => void;
}) {
  const tl = useTl();
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
      <div className={styles.status}>
        <span>{isDefault ? tl("defaultNotice") : tl("customNotice")}</span>
        {!isDefault && <Button variant="ghost" className={es.toolBtn} onClick={onReset}>{tl("reset")}</Button>}
      </div>

      <Input label={tl("eyebrow")} value={value.eyebrow[lang]} onChange={(v) => onChange({ ...value, eyebrow: { ...value.eyebrow, [lang]: v } })} />

      <div className={es.field}>
        <span className={es.fieldLabel}>{tl("hero")}</span>
        <SceneStrip items={value.hero} lang={lang} onUpload={onUpload} onChange={(hero) => onChange({ ...value, hero })} />
      </div>

      <div className={es.field}>
        <span className={es.fieldLabel}>{tl("sections")}</span>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ol className={styles.sections}>
              {value.sections.map((s, i) => {
                const isOpen = open.has(s.id);
                const thumbs = s.items.flatMap(itemMedia).slice(0, 4);
                return (
                  <SortableSection key={s.id} id={s.id}>
                    {(grip) => (
                      <>
                        <div className={styles.sectionHead}>
                          {grip}
                          <span className={styles.no}>{sectionNo(i)}</span>
                          {isOpen ? (
                            <Input className={styles.sectionTitle} value={s.title[lang]} placeholder={tl("sectionTitle")}
                              onChange={(v) => setSection(i, { title: { ...s.title, [lang]: v } })} />
                          ) : (
                            <Pressable className={styles.sectionSummary} onClick={() => toggle(s.id)}>
                              <span className={styles.sectionName}>{s.title[lang] || <span className={styles.placeholder}>{tl("sectionTitle")}</span>}</span>
                              {s.body?.[lang] && <span className={styles.sectionDesc}>{s.body[lang]}</span>}
                            </Pressable>
                          )}
                          <div className={styles.rowEnd}>
                            {!isOpen && thumbs.length > 0 && (
                              <span className={styles.thumbs} aria-hidden>
                                {thumbs.map((src, k) => <span key={k} className={styles.thumb}><Thumb src={src} /></span>)}
                              </span>
                            )}
                            {!isOpen && <span className={styles.count}>{fillTemplate(tl("itemCount"), { n: s.items.length })}</span>}
                            <IconBtn label={tl(isOpen ? "collapse" : "expand")} onClick={() => toggle(s.id)}>
                              <ChevronDown size={14} className={isOpen ? styles.chevronOpen : undefined} />
                            </IconBtn>
                            <IconBtn label={tl("removeSection")} danger onClick={() => onChange({ ...value, sections: value.sections.filter((_, j) => j !== i) })}>
                              <Trash2 size={14} />
                            </IconBtn>
                          </div>
                        </div>
                        {isOpen && (
                          <div className={styles.sectionForm}>
                            <Textarea label={tl("sectionBody")} value={s.body?.[lang] ?? ""} rows={2}
                              onChange={(v) => setSection(i, { body: { ...(s.body ?? EMPTY), [lang]: v } })} />
                            <div className={es.field}>
                              <span className={es.fieldLabel}>{tl("scenes")}</span>
                              <SceneStrip items={s.items} lang={lang} onUpload={onUpload} onChange={(items) => setSection(i, { items })} />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </SortableSection>
                );
              })}
            </ol>
          </SortableContext>
        </DndContext>
        {value.sections.length === 0 && <p className={styles.emptyLine}>{tl("noSections")}</p>}
        <div className={styles.inline}>
          <Button variant="ghost" className={es.toolBtn} icon={<Plus size={14} />} onClick={addSection}>{tl("addSection")}</Button>
        </div>
      </div>
    </div>
  );
}
