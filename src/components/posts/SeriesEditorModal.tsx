"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import type { Series } from "@/types/post";
import styles from "./SeriesEditorModal.module.css";

interface SeriesForm {
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  category: string;
  cover_image: string;
  published: boolean;
}

interface SeriesEditorModalProps {
  /** null → create new, object → edit existing */
  series: Series | null;
  categories: string[];
  onSave: (series: Series) => void;
  onClose: () => void;
}

export default function SeriesEditorModal({
  series,
  categories,
  onSave,
  onClose,
}: SeriesEditorModalProps) {
  const isEdit = !!series;

  const [form, setForm] = useState<SeriesForm>({
    title: series?.title ?? "",
    title_en: series?.title_en ?? "",
    description: series?.description ?? "",
    description_en: series?.description_en ?? "",
    category: series?.category ?? "",
    cover_image: series?.cover_image ?? "",
    published: series?.published ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const updateField = <K extends keyof SeriesForm>(key: K, value: SeriesForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleImageUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        updateField("cover_image", data.url);
      } catch {
        setError("Image upload failed");
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (isEdit && series) {
        // PATCH existing
        const res = await fetch(`/api/series/${series.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Save failed");
        onSave({ ...series, ...form });
      } else {
        // POST new
        const res = await fetch("/api/series", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Create failed");
        const created = await res.json();
        onSave(created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [form, isEdit, series, onSave]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {isEdit ? "Edit Series" : "New Series"}
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Title (KO)</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="시리즈 제목"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Title (EN)</label>
            <input
              className={styles.input}
              value={form.title_en}
              onChange={(e) => updateField("title_en", e.target.value)}
              placeholder="Series title"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Description (KO)</label>
            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="시리즈 설명"
              rows={3}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Description (EN)</label>
            <textarea
              className={styles.textarea}
              value={form.description_en}
              onChange={(e) => updateField("description_en", e.target.value)}
              placeholder="Series description"
              rows={3}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Category</label>
              <select
                className={styles.select}
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
              >
                <option value="">None</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Published</label>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => updateField("published", e.target.checked)}
                />
                <span>{form.published ? "Published" : "Draft"}</span>
              </label>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Cover Image</label>
            {form.cover_image ? (
              <div className={styles.coverPreview}>
                <Image
                  src={form.cover_image}
                  alt="Series cover"
                  width={120}
                  height={75}
                  className={styles.coverThumb}
                />
                <button
                  type="button"
                  className={styles.coverRemove}
                  onClick={() => updateField("cover_image", "")}
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={handleImageUpload}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Cover"}
              </button>
            )}
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : isEdit ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
