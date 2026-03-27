"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import type { SiteConfigData } from "@/config/site.config";
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
}

export default function Field({ label, value, onChange, multiline, placeholder, hint, labelInline }: FieldProps) {
  return (
    <div className={`${styles.fieldRow} ${labelInline ? styles.fieldRowInline : ""}`}>
      <label className={styles.fieldLabel}>
        {label}
        {hint && <span className={styles.fieldLabelHint}>{hint}</span>}
      </label>
      {multiline ? (
        <textarea
          className={styles.fieldTextarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          data-lenis-prevent
        />
      ) : (
        <input
          className={styles.fieldInput}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
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
        <input
          type="color"
          className={styles.colorPicker}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
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
          <button
            type="button"
            className={styles.logoBtn}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "..." : uploadLabel}
          </button>
          {url && (
            <button type="button" className={styles.logoBtnRemove} onClick={onRemove}>
              {removeLabel}
            </button>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {decodeURIComponent(url.split("/").pop() ?? "resume.pdf")}
          </a>
        )}
        <div className={styles.logoActions}>
          <button
            type="button"
            className={styles.logoBtn}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "..." : uploadLabel}
          </button>
          {url && (
            <button type="button" className={styles.logoBtnRemove} onClick={onRemove}>
              {removeLabel}
            </button>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            {decodeURIComponent(url.split("/").pop() ?? "audio.mp3")}
          </a>
        )}
        <div className={styles.logoActions}>
          <button
            type="button"
            className={styles.logoBtn}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "..." : uploadLabel}
          </button>
          {url && (
            <button type="button" className={styles.logoBtnRemove} onClick={onRemove}>
              {removeLabel}
            </button>
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

/* ── TagField ── */

interface TagFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  separator?: string;
  hint?: string;
  placeholder?: string;
}

export function TagField({
  label,
  value,
  onChange,
  separator = ", ",
  hint,
  placeholder,
}: TagFieldProps) {
  const [input, setInput] = useState("");
  const tags = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const addTags = () => {
    const newTags = input.split(",").map((s) => s.trim()).filter(Boolean);
    if (newTags.length === 0) return;
    const merged = [...tags];
    for (const tag of newTags) {
      if (!merged.includes(tag)) merged.push(tag);
    }
    onChange(merged.join(separator));
    setInput("");
  };

  const removeTag = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx).join(separator));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      addTags();
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className={styles.scopeTagField}>
      <label className={styles.fieldLabel}>
        {label}
        {hint && <span className={styles.fieldLabelHint}>{hint}</span>}
      </label>
      {tags.length > 0 && (
        <div className={styles.scopeTags}>
          {tags.map((tag, i) => (
            <span key={i} className={styles.scopeTag}>
              {tag}
              <button type="button" className={styles.scopeTagRemove} onClick={() => removeTag(i)}>
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      <div className={styles.scopeInputRow}>
        <input
          className={styles.fieldInput}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <button type="button" className={styles.scopeAddBtn} onClick={addTags} disabled={!input.trim()}>
          +
        </button>
      </div>
    </div>
  );
}

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
    onChange(reordered);
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
