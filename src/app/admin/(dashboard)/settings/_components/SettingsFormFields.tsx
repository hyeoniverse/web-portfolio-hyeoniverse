"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { ExternalLink, Volume2, Eraser } from "lucide-react";
import type { SiteConfigData } from "@/config/site.config";
import ColorPicker from "@/components/ui/ColorPicker";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import styles from "../Settings.module.css";

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
}

export default function Field({ label, value, onChange, multiline, placeholder, hint, labelInline, required }: FieldProps) {
  const showClear = !!value;
  return (
    <div className={`${styles.fieldRow} ${labelInline ? styles.fieldRowInline : ""}`}>
      <label className={styles.fieldLabel}>
        <span className={styles.fieldLabelText}>
          {label}
          {required && <span className={styles.fieldRequiredDot} aria-label="필수">•</span>}
        </span>
        {hint && <span className={styles.fieldLabelHint}>{hint}</span>}
      </label>
      {multiline ? (
        <Textarea size="sm" value={value} onChange={onChange} placeholder={placeholder} />
      ) : (
        <div className={styles.fieldInputWrap}>
          <input
            className={`${styles.fieldInput} ${showClear ? styles.fieldInputHasClear : ""}`}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
          {showClear && (
            <button
              type="button"
              className={styles.fieldClearBtn}
              data-cursor="big"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(""); }}
              aria-label="clear"
              title="지우기"
            >
              <Eraser size={11} strokeWidth={2} />
            </button>
          )}
        </div>
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
      <div className={styles.colorField}>
        <ColorPicker value={value} onChange={(c) => onChange(c.hex)} triggerClassName={styles.colorPicker} />
        <input
          type="text"
          className={styles.colorText}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
        />
      </div>
    </div>
  );
}

/* ── LogoUpload ── */

interface LogoUploadProps {
  label: string;
  url: string;
  uploadLabel: string;
  removeLabel: string;
  onUploaded: (url: string) => void;
  onRemove: () => void;
  hint?: string;
}

export function LogoUpload({
  label,
  url,
  uploadLabel,
  removeLabel,
  onUploaded,
  onRemove,
  hint,
}: LogoUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "logos");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onUploaded(data.url);
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
        {url && (
          <div className={styles.logoPreview}>
            <Image src={url} alt="Logo" width={80} height={32} unoptimized className={styles.logoPreviewImage} />
          </div>
        )}
        <div className={styles.logoActions}>
          <Button
            variant="outline"
            size="xs"
            onClick={() => fileRef.current?.click()}
            loading={uploading}
          >
            {uploadLabel}
          </Button>
          {url && (
            <Button variant="outline" size="xs" tone="danger" onClick={onRemove}>
              {removeLabel}
            </Button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
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

/* ── ResumeUpload ── */

export function ResumeUpload({
  label,
  url,
  uploadLabel,
  removeLabel,
  onUploaded,
  onRemove,
  hint,
}: LogoUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "resume");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onUploaded(data.url);
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
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.resumeFile}
          >
            <ExternalLink size={14} />
            {decodeURIComponent(url.split("/").pop() ?? "resume.pdf")}
          </a>
        )}
        <div className={styles.logoActions}>
          <Button
            variant="outline"
            size="xs"
            onClick={() => fileRef.current?.click()}
            loading={uploading}
          >
            {uploadLabel}
          </Button>
          {url && (
            <Button variant="outline" size="xs" tone="danger" onClick={onRemove}>
              {removeLabel}
            </Button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
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

/* ── AudioUpload ── */

export function AudioUpload({
  label,
  url,
  uploadLabel,
  removeLabel,
  onUploaded,
  onRemove,
  hint,
}: LogoUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "bgm");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onUploaded(data.url);
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
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.resumeFile}
          >
            <Volume2 size={14} />
            {decodeURIComponent(url.split("/").pop() ?? "audio.mp3")}
          </a>
        )}
        <div className={styles.logoActions}>
          <Button
            variant="outline"
            size="xs"
            onClick={() => fileRef.current?.click()}
            loading={uploading}
          >
            {uploadLabel}
          </Button>
          {url && (
            <Button variant="outline" size="xs" tone="danger" onClick={onRemove}>
              {removeLabel}
            </Button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
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
                  <Field label="Title (EN)" value={item.title} onChange={(v) => updateItem(i, "title", v)} />
                  <Field label="Title (KO)" value={item.title_ko} onChange={(v) => updateItem(i, "title_ko", v)} />
                </div>
                <div className={styles.fieldPair}>
                  <Field label="Desc (EN)" value={item.desc} onChange={(v) => updateItem(i, "desc", v)} />
                  <Field label="Desc (KO)" value={item.desc_ko} onChange={(v) => updateItem(i, "desc_ko", v)} />
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
