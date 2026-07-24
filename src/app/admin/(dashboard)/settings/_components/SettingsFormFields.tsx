"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { ExternalLink, Volume2, HelpCircle } from "lucide-react";
import type { SiteConfigData } from "@/config/site.config";
import ColorPicker from "@/components/ui/ColorPicker";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import EditableInput from "@/components/ui/EditableInput";
import Textarea, { type MaxHintPreset } from "@/components/ui/Textarea";
import Tooltip from "@/components/ui/Tooltip";
import { uploadFile } from "@/lib/adminUpload";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "../Settings.module.css";

/* ── FieldHelp — 라벨 옆 ? 아이콘 + Tooltip. 필드 값·옵션 설명용 (raw label/Switch 케이스도 재사용). ── */
export function FieldHelp({ content }: { content: React.ReactNode }) {
  return (
    <Tooltip content={content} placement="top">
      <span className={styles.fieldHelp} role="button" tabIndex={0} aria-label="설명">
        <HelpCircle size={13} />
      </span>
    </Tooltip>
  );
}

/* ── FieldCounter — n / max. count 숫자만 상태별 색상 (warn / over). 슬래시·max 는 tertiary. ── */
function _FieldCounter({ value, hintNum }: { value: number; hintNum: number }) {
  const over = value > hintNum;
  const warn = !over && value >= hintNum * 0.8;
  return (
    <span className={styles.fieldCounter} aria-live="polite">
      <span className={over ? styles.fieldCounterOver : warn ? styles.fieldCounterWarn : undefined}>{value}</span>
      {" / "}{hintNum}
    </span>
  );
}

/* ── Field ── */

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  hint?: string;
  labelInline?: boolean;
  required?: boolean;
  /** 언어 배지 — label 옆에 capsule 형태로 표시 (예: "KO" / "EN") */
  langBadge?: "ko" | "en";
  /** Soft 글자수 권장 한도 — 카운터 표시, 80% 부터 warning, 100% 초과 시 over.
   *  - 명시 안 하면 default: multiline=300 / single-line=100 (admin/settings 전반 자동 counter)
   *  - null 명시 → counter 미표시 (URL/email 등 자유 입력) */
  maxHint?: number | MaxHintPreset | null;
  /** Hard 글자수 상한 — 입력/붙여넣기 단계에서 잘라 근본 차단 (single-line 에만 적용). maxHint 와 별개. */
  maxLength?: number;
  /** 라벨 옆 ? 툴팁 내용 — 있으면 FieldHelp 렌더 (additive, 없으면 기존과 동일). */
  help?: React.ReactNode;
}

const MAX_HINT_PRESETS: Record<MaxHintPreset, number> = {
  short: 200,
  basic: 500,
  long: 2000,
};
const DEFAULT_MAX_HINT_SINGLE = 100;
const DEFAULT_MAX_HINT_MULTI = 300;

function resolveMaxHint(v: number | MaxHintPreset | undefined | null, multiline: boolean): number | undefined {
  if (v === null) return undefined; // 명시적 opt-out
  if (v === undefined) return multiline ? DEFAULT_MAX_HINT_MULTI : DEFAULT_MAX_HINT_SINGLE;
  return typeof v === "string" ? MAX_HINT_PRESETS[v] : v;
}

export default function Field({ label, value, onChange, multiline, placeholder, hint, labelInline, required, langBadge, maxHint, maxLength, help }: FieldProps) {
  const badgeStr = langBadge ? langBadge.toUpperCase() : undefined;
  const hintNum = resolveMaxHint(maxHint, !!multiline);
  /* langBadge 위치:
     - single-line (Input) → input 박스 안 inlineLabel
     - multiline (Textarea) → label 옆 capsule (textarea 안 inlineLabel 은 큰 영역에 시각적 어색) */
  return (
    <div className={`${styles.fieldRow} ${labelInline ? styles.fieldRowInline : ""}`}>
      <label className={styles.fieldLabel}>
        <span className={styles.fieldLabelText}>
          {label}
          {multiline && badgeStr && <span className={styles.fieldLangBadge}>{badgeStr}</span>}
          {required && <span className={styles.fieldRequiredDot} aria-label="필수">•</span>}
          {help && <FieldHelp content={help} />}
        </span>
        {hint && <span className={styles.fieldLabelHint}>{hint}</span>}
      </label>
      {multiline ? (
        <Textarea size="md" value={value} onChange={onChange} placeholder={placeholder} maxHint={hintNum} />
      ) : hintNum != null ? (
        /* EditableInput — counter / clear / inline mark 모두 내부 처리 (외부 wrap 불필요) */
        <EditableInput
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          inlineLabel={badgeStr}
          maxHint={hintNum}
          maxLength={maxLength}
        />
      ) : (
        <Input value={value} onChange={onChange} placeholder={placeholder} inlineLabel={badgeStr} />
      )}
    </div>
  );
}

/* ── ColorField ── */

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div className={styles.fieldRow}>
      <label className={styles.fieldLabel}>{label}</label>
      <ColorPicker value={value} onChange={(c) => onChange(c.hex)}>
        {({ open, toggle }) => (
          <span className={styles.colorField}>
            <button
              type="button"
              className={styles.colorPicker}
              style={{ background: value }}
              onClick={toggle}
              aria-label="색 선택 popover 열기"
            />
            <Input
              className={styles.colorInput}
              value={value}
              onChange={onChange}
              maxLength={7}
              onFocus={() => { if (!open) toggle(); }}
            />
          </span>
        )}
      </ColorPicker>
    </div>
  );
}

/* ── UploadField ──
   로고(이미지)·이력서(PDF)·BGM(오디오) 업로드를 하나로 통합. kind 별로 업로드 폴더·
   accept·미리보기 방식만 프리셋에서 갈라진다. (기존 LogoUpload/ResumeUpload/AudioUpload
   세 벌 복제를 대체) */

type UploadKind = "logo" | "resume" | "audio";

interface UploadPreset {
  folder: string;
  accept: string;
  /** image: 썸네일 미리보기 / file: 파일명 링크 */
  preview: "image" | "file";
  /** file 미리보기 링크 앞 아이콘 */
  icon?: React.ReactNode;
  /** URL 에서 파일명을 못 뽑을 때 표시할 기본값 */
  fallbackName?: string;
}

const UPLOAD_PRESETS: Record<UploadKind, UploadPreset> = {
  logo: { folder: "logos", accept: "image/*", preview: "image" },
  resume: { folder: "resume", accept: "application/pdf", preview: "file", icon: <ExternalLink size={14} />, fallbackName: "resume.pdf" },
  audio: { folder: "bgm", accept: "audio/*", preview: "file", icon: <Volume2 size={14} />, fallbackName: "audio.mp3" },
};

interface UploadFieldProps {
  kind: UploadKind;
  label: string;
  url: string;
  uploadLabel: string;
  removeLabel: string;
  onUploaded: (url: string) => void;
  onRemove: () => void;
  hint?: string;
}

export function UploadField({ kind, label, url, uploadLabel, removeLabel, onUploaded, onRemove, hint }: UploadFieldProps) {
  const { folder, accept, preview, icon, fallbackName } = UPLOAD_PRESETS[kind];
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      onUploaded(await uploadFile(file, folder));
    } catch {
      // silent fail
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.fieldRow}>
      <label className={styles.fieldLabel}>
        {label}
        {hint && <span className={styles.fieldLabelHint}>{hint}</span>}
      </label>
      <div className={styles.logoUpload}>
        {url && (preview === "image" ? (
          <div className={styles.logoPreview}>
            <Image src={url} alt={label} width={80} height={32} unoptimized className={styles.logoPreviewImage} />
          </div>
        ) : (
          <a href={url} target="_blank" rel="noopener noreferrer" className={styles.resumeFile}>
            {icon}
            <span>{decodeURIComponent(url.split("/").pop() ?? fallbackName ?? "")}</span>
          </a>
        ))}
        <div className={styles.logoActions}>
          <Button variant="outline" size="md" onClick={() => fileRef.current?.click()} loading={uploading}>
            {uploadLabel}
          </Button>
          {url && (
            <Button variant="outline" size="md" tone="danger" onClick={onRemove}>
              {removeLabel}
            </Button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export { default as TagField } from "@/components/ui/TagListField";

/* ── ServiceItemsEditor ── */

interface ServiceItemsEditorProps {
  items: SiteConfigData["services"]["items"];
  onChange: (items: SiteConfigData["services"]["items"]) => void;
}

export function ServiceItemsEditor({ items, onChange }: ServiceItemsEditorProps) {
  const { t } = useLanguage();
  const updateItem = (index: number, key: string, value: string) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, [key]: value } : item,
    );
    onChange(next);
  };

  const ids = useMemo(() => items.map((_, i) => `svc-${i}`), [items]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove([...items], oldIdx, newIdx).map((item, i) => ({
      ...item,
      num: String(i + 1).padStart(2, "0"),
    }));
    onChange(reordered as typeof items);
  }, [ids, items, onChange]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={styles.serviceItems}>
          {items.map((item, i) => (
            <SortableServiceItem key={ids[i]} id={ids[i]}>
              <SlotNumber value={i + 1} />
              <div className={styles.serviceItemFields}>
                <div className={styles.fieldPair}>
                  <Field label={t("admin.settings.fieldTitle")} langBadge="en" value={item.title} onChange={(v) => updateItem(i, "title", v)} />
                  <Field label={t("admin.settings.fieldTitle")} langBadge="ko" value={item.title_ko} onChange={(v) => updateItem(i, "title_ko", v)} />
                </div>
                <div className={styles.fieldPair}>
                  <Field label={t("admin.settings.fieldDesc")} langBadge="en" value={item.desc} onChange={(v) => updateItem(i, "desc", v)} />
                  <Field label={t("admin.settings.fieldDesc")} langBadge="ko" value={item.desc_ko} onChange={(v) => updateItem(i, "desc_ko", v)} />
                </div>
              </div>
            </SortableServiceItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableServiceItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.serviceItem} ${isDragging ? styles.serviceItemDragging : ""}`}
      {...attributes}
    >
      <button type="button" className={styles.serviceItemDrag} {...listeners} aria-label="Drag">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>
      {children}
    </div>
  );
}

/* ── Slot machine number animation ── */
function SlotNumber({ value }: { value: number }) {
  const display = String(value).padStart(2, "0");
  return (
    <span className={styles.serviceItemNum}>
      {display.split("").map((digit, i) => (
        <span key={i} className={styles.slotDigit}>
          <span
            className={styles.slotReel}
            style={{ transform: `translateY(-${Number(digit) * 10}%)` }}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <span key={n} className={styles.slotChar}>{n}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
