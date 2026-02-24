"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Series } from "@/types/post";
import Checkbox from "@/components/ui/Checkbox";
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

interface SeriesPost {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  series_order: number;
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
  const { t } = useLanguage();
  const isEdit = !!series;

  const ts = (key: string) => t(`admin.posts.seriesModal.${key}`);

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
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const [posts, setPosts] = useState<SeriesPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const fetchSeriesPosts = useCallback(async () => {
    if (!series?.id) return;
    setPostsLoading(true);
    try {
      const res = await fetch(`/api/series/${series.id}`);
      const data = await res.json();
      setPosts(
        (data.posts ?? []).sort(
          (a: SeriesPost, b: SeriesPost) => a.series_order - b.series_order,
        ),
      );
    } catch {
      /* ignore */
    } finally {
      setPostsLoading(false);
    }
  }, [series?.id]);

  useEffect(() => {
    if (isEdit) fetchSeriesPosts();
  }, [isEdit, fetchSeriesPosts]);

  const handleRemovePost = useCallback(async (postId: string) => {
    await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ series_id: null, series_order: 0 }),
    });
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const handleReorder = useCallback(
    async (index: number, direction: -1 | 1) => {
      const swapIndex = index + direction;
      if (swapIndex < 0 || swapIndex >= posts.length) return;

      const updated = [...posts];
      [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
      updated.forEach((p, i) => (p.series_order = i));
      setPosts(updated);

      await Promise.all([
        fetch(`/api/posts/${updated[index].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ series_order: updated[index].series_order }),
        }),
        fetch(`/api/posts/${updated[swapIndex].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ series_order: updated[swapIndex].series_order }),
        }),
      ]);
    },
    [posts],
  );

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
        setError(ts("uploadFailed"));
      } finally {
        setUploading(false);
      }
    };
    input.click();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      setError(ts("titleRequired"));
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (isEdit && series) {
        const res = await fetch(`/api/series/${series.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error(ts("saveFailed"));
        onSave({ ...series, ...form });
      } else {
        const res = await fetch("/api/series", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error(ts("saveFailed"));
        const created = await res.json();
        onSave(created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : ts("saveFailed"));
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, isEdit, series, onSave]);

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={onClose} data-lenis-prevent>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {isEdit ? ts("editTitle") : ts("newTitle")}
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>{ts("titleKO")}</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder={ts("titlePlaceholder")}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>{ts("titleEN")}</label>
            <input
              className={styles.input}
              value={form.title_en}
              onChange={(e) => updateField("title_en", e.target.value)}
              placeholder={ts("titlePlaceholderEN")}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>{ts("descriptionKO")}</label>
            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder={ts("descPlaceholder")}
              rows={3}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>{ts("descriptionEN")}</label>
            <textarea
              className={styles.textarea}
              value={form.description_en}
              onChange={(e) => updateField("description_en", e.target.value)}
              placeholder={ts("descPlaceholderEN")}
              rows={3}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>{ts("category")}</label>
              <select
                className={styles.select}
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
              >
                <option value="">{ts("categoryNone")}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>{ts("published")}</label>
              <div className={styles.toggle}>
                <Checkbox
                  checked={form.published}
                  onChange={(v) => updateField("published", v)}
                  label={form.published ? ts("publishedLabel") : ts("draftLabel")}
                />
              </div>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>{ts("coverImage")}</label>
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
                  {ts("remove")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={handleImageUpload}
                disabled={uploading}
              >
                {uploading ? ts("uploading") : ts("uploadCover")}
              </button>
            )}
          </div>

          {isEdit && (
            <div className={styles.postsSection}>
              <label className={styles.label}>
                {ts("posts")} ({posts.length})
              </label>
              {postsLoading ? (
                <p className={styles.postsEmpty}>{ts("postsLoading")}</p>
              ) : posts.length === 0 ? (
                <p className={styles.postsEmpty}>{ts("postsEmpty")}</p>
              ) : (
                <div className={styles.postsList}>
                  {posts.map((post, idx) => (
                    <div key={post.id} className={styles.postItem}>
                      <div className={styles.postOrder}>
                        <button
                          type="button"
                          className={styles.orderBtn}
                          disabled={idx === 0}
                          onClick={() => handleReorder(idx, -1)}
                          aria-label="Move up"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 6.5 L5 3.5 L8 6.5" />
                          </svg>
                        </button>
                        <span className={styles.orderNum}>{idx + 1}</span>
                        <button
                          type="button"
                          className={styles.orderBtn}
                          disabled={idx === posts.length - 1}
                          onClick={() => handleReorder(idx, 1)}
                          aria-label="Move down"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 3.5 L5 6.5 L8 3.5" />
                          </svg>
                        </button>
                      </div>
                      <span className={styles.postTitle}>
                        {post.title || ts("untitled")}
                      </span>
                      <span className={`${styles.postStatus} ${post.published ? styles.postPublished : styles.postDraft}`}>
                        {post.published ? "P" : "D"}
                      </span>
                      <button
                        type="button"
                        className={styles.postRemoveBtn}
                        onClick={() => handleRemovePost(post.id)}
                        aria-label="Remove from series"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            {ts("cancel")}
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "..." : isEdit ? ts("save") : ts("create")}
          </button>
        </div>
      </div>
    </div>
  );
}
