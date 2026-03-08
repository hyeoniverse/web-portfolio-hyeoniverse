"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import Select from "@/components/ui/Select";
import Toggle from "@/components/ui/Toggle";
import type { Series } from "@/types/post";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import Field from "./SettingsFormFields";
import T from "@/components/ui/T";
import { SkeletonLine } from "@/components/ui/Skeleton";
import styles from "../Settings.module.css";

/* ── SeriesManager ── */

interface BilingualCategory {
  ko: string;
  en: string;
}

interface SeriesManagerProps {
  categories: BilingualCategory[];
}

export default function SeriesManager({ categories }: SeriesManagerProps) {
  const { t } = useLanguage();
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [page, setPage] = useState(0);
  const newFormRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 5;

  const fetchSeries = useCallback(async () => {
    try {
      const res = await fetch("/api/series?all=true");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setSeriesList(list);
      setPage((prev) => {
        const maxPage = Math.max(0, Math.ceil(list.length / PAGE_SIZE) - 1);
        return prev > maxPage ? maxPage : prev;
      });
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSeries(); }, [fetchSeries]);

  const totalPages = Math.ceil(seriesList.length / PAGE_SIZE);
  const pagedList = useMemo(
    () => seriesList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [seriesList, page],
  );

  if (loading) return (
    <div className={styles.seriesList}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.seriesItem} style={{ padding: "var(--spacing-sm) var(--spacing-md)" }}>
          <SkeletonLine width="60%" height={14} />
        </div>
      ))}
    </div>
  );

  return (
    <div className={styles.seriesList}>
      {pagedList.map((s) => {
        const expanded = expandedId === s.id;
        return (
          <div key={s.id}>
            <button
              type="button"
              className={`${styles.seriesCardHead} ${expanded ? styles.seriesCardHeadExpanded : ""}`}
              onClick={() => setExpandedId(expanded ? null : s.id)}
            >
              <div className={styles.seriesCardInfo}>
                <p className={styles.seriesCardName}>{s.title || <T k="admin.posts.untitled" />}</p>
                <div className={styles.seriesCardMeta}>
                  {s.category && <span>{s.category}</span>}
                  <span>{s.post_count ?? 0} <T k="admin.posts.postsCount" /></span>
                  <span className={`${styles.seriesBadge} ${s.published ? styles.seriesBadgePublished : styles.seriesBadgeDraft}`}>
                    {s.published ? <T k="admin.posts.published" /> : <T k="admin.posts.draft" />}
                  </span>
                </div>
              </div>
              <svg className={`${styles.seriesChevron} ${expanded ? styles.seriesChevronOpen : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {expanded && (
              <SeriesInlineEditor
                series={s}
                categories={categories}
                onSave={() => { setExpandedId(null); fetchSeries(); }}
                onCancel={() => setExpandedId(null)}
                onDelete={async () => {
                  if (!confirm(`"${s.title}" — ${t("admin.posts.seriesDeleteConfirm")}`)) return;
                  await fetch(`/api/series/${s.id}`, { method: "DELETE" });
                  setExpandedId(null);
                  fetchSeries();
                }}
              />
            )}
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className={styles.seriesPagination}>
          <button
            type="button"
            className={styles.seriesPageBtn}
            disabled={page === 0}
            onClick={() => { setPage((p) => p - 1); setExpandedId(null); }}
          >
            &lsaquo;
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.seriesPageBtn} ${i === page ? styles.seriesPageBtnActive : ""}`}
              onClick={() => { setPage(i); setExpandedId(null); }}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            className={styles.seriesPageBtn}
            disabled={page === totalPages - 1}
            onClick={() => { setPage((p) => p + 1); setExpandedId(null); }}
          >
            &rsaquo;
          </button>
        </div>
      )}

      {creatingNew && (
        <div ref={newFormRef}>
          <SeriesInlineEditor
            series={null}
            categories={categories}
            onSave={() => { setCreatingNew(false); fetchSeries(); }}
            onCancel={() => setCreatingNew(false)}
          />
        </div>
      )}
      {!creatingNew && (
        <button
          type="button"
          className={styles.profileAddBtn}
          onClick={() => {
            setCreatingNew(true);
            setExpandedId(null);
            requestAnimationFrame(() => {
              newFormRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
            });
          }}
        >
          <T k="admin.posts.newSeries" />
        </button>
      )}
    </div>
  );
}

/* ── SeriesInlineEditor ── */

interface SeriesPostItem {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  series_order: number;
}

interface SeriesInlineEditorProps {
  series: Series | null;
  categories: BilingualCategory[];
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function SeriesInlineEditor({
  series,
  categories,
  onSave,
  onCancel,
  onDelete,
}: SeriesInlineEditorProps) {
  const { t, language } = useLanguage();
  const ts = (key: string) => t(`admin.posts.seriesModal.${key}`);
  const isEdit = !!series;

  const defaultCatKo = categories[0]?.ko || "";

  const [form, setForm] = useState({
    title: series?.title ?? "",
    title_en: series?.title_en ?? "",
    description: series?.description ?? "",
    description_en: series?.description_en ?? "",
    category: series?.category || defaultCatKo,
    cover_image: series?.cover_image ?? "",
    published: series?.published ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [error, setError] = useState("");
  const [posts, setPosts] = useState<SeriesPostItem[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  useEffect(() => {
    if (!series?.id) return;
    setPostsLoading(true);
    fetch(`/api/series/${series.id}`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(
          (data.posts ?? []).sort(
            (a: SeriesPostItem, b: SeriesPostItem) => a.series_order - b.series_order
          )
        );
      })
      .finally(() => setPostsLoading(false));
  }, [series?.id]);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleImageUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
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
  };

  const handleRemovePost = async (postId: string) => {
    await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ series_id: null, series_order: 0 }),
    });
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleReorder = async (index: number, direction: -1 | 1) => {
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
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError(ts("titleRequired"));
      return;
    }
    if (!form.category) {
      setError(ts("categoryRequired"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = isEdit && series ? `/api/series/${series.id}` : "/api/series";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(ts("saveFailed"));
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : ts("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.seriesCardBody}>
      <div className={styles.fieldPair}>
        <Field label={ts("titleKO")} value={form.title} onChange={(v) => updateField("title", v)} />
        <Field label={ts("titleEN")} value={form.title_en} onChange={(v) => updateField("title_en", v)} />
      </div>
      <div className={styles.fieldPair}>
        <Field label={ts("descriptionKO")} value={form.description} onChange={(v) => updateField("description", v)} multiline />
        <Field label={ts("descriptionEN")} value={form.description_en} onChange={(v) => updateField("description_en", v)} multiline />
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}><T k="admin.posts.seriesModal.category" /></label>
        <Select
          value={form.category}
          options={categories.map((cat) => ({
            value: cat.ko,
            label: language === "ko" ? cat.ko : cat.en,
          }))}
          onChange={(v) => updateField("category", v)}
        />
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}><T k="admin.posts.seriesModal.published" /></label>
        <Toggle
          label={form.published ? ts("publishedLabel") : ts("draftLabel")}
          checked={form.published}
          onChange={(v) => updateField("published", v)}
        />
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}><T k="admin.posts.seriesModal.coverImage" /></label>
        {form.cover_image ? (
          <div className={styles.logoUpload}>
            <div className={styles.logoPreview}>
              <Image src={form.cover_image} alt="" width={120} height={75} className={styles.logoPreviewImage} unoptimized />
            </div>
            <button type="button" className={styles.logoBtnRemove} onClick={() => updateField("cover_image", "")}>
              <T k="admin.posts.seriesModal.remove" />
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
              <button type="button" className={styles.logoBtn} onClick={handleImageUpload} disabled={uploading}>
                {uploading ? <T k="admin.posts.seriesModal.uploading" /> : <T k="admin.posts.seriesModal.uploadCover" />}
              </button>
              <button type="button" className={styles.logoBtn} onClick={() => setShowCoverPicker((v) => !v)}>
                {showCoverPicker ? <T k="admin.posts.seriesModal.closePicker" /> : <T k="admin.posts.seriesModal.chooseCover" />}
              </button>
            </div>
            {showCoverPicker && (
              <CoverImagePicker
                onSelect={(url) => { updateField("cover_image", url); setShowCoverPicker(false); }}
                onClose={() => setShowCoverPicker(false)}
                postContext={{ title: form.title, tags: form.category ? [form.category] : [], excerpt: form.description }}
              />
            )}
          </>
        )}
      </div>

      {isEdit && (
        <div className={styles.seriesPostsSection}>
          <label className={styles.fieldLabel} style={{ flexDirection: "row", gap: "4px", whiteSpace: "nowrap" }}><T k="admin.posts.seriesModal.posts" /> ({posts.length})</label>
          {postsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
              {[0, 1, 2].map((i) => <SkeletonLine key={i} width="100%" height={32} />)}
            </div>
          ) : posts.length === 0 ? (
            <p className={styles.seriesPostsEmpty}><T k="admin.posts.seriesModal.postsEmpty" /></p>
          ) : (
            <div className={styles.seriesPostsList}>
              {posts.map((post, idx) => (
                <div key={post.id} className={styles.seriesPostItem}>
                  <div className={styles.seriesPostOrder}>
                    <button
                      type="button"
                      className={styles.seriesPostOrderBtn}
                      disabled={idx === 0}
                      onClick={() => handleReorder(idx, -1)}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 6.5 L5 3.5 L8 6.5" />
                      </svg>
                    </button>
                    <span className={styles.seriesPostOrderNum}>{idx + 1}</span>
                    <button
                      type="button"
                      className={styles.seriesPostOrderBtn}
                      disabled={idx === posts.length - 1}
                      onClick={() => handleReorder(idx, 1)}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 3.5 L5 6.5 L8 3.5" />
                      </svg>
                    </button>
                  </div>
                  <a
                    href={`/admin/posts/${post.id}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.seriesPostTitle}
                  >
                    {post.title || <T k="admin.posts.seriesModal.untitled" />}
                  </a>
                  <a
                    href={`/posts/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.seriesPostViewBtn}
                    title={t("admin.posts.seriesModal.viewPost")}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                  <span className={`${styles.seriesPostStatus} ${post.published ? styles.seriesPostPublished : styles.seriesPostDraft}`}>
                    {post.published ? "P" : "D"}
                  </span>
                  <button
                    type="button"
                    className={styles.seriesPostRemove}
                    onClick={() => handleRemovePost(post.id)}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className={styles.sectionHint} style={{ color: "var(--color-accent)" }}>{error}</p>}

      <div className={styles.seriesCardActions}>
        {onDelete && (
          <button type="button" className={styles.logoBtnRemove} onClick={onDelete}>
            <T k="admin.posts.delete" />
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button type="button" className={styles.resetBtn} onClick={onCancel}>
          <T k="admin.posts.seriesModal.cancel" />
        </button>
        <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? "..." : isEdit ? <T k="admin.posts.seriesModal.save" /> : <T k="admin.posts.seriesModal.create" />}
        </button>
      </div>
    </div>
  );
}
