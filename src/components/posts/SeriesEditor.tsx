"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Series } from "@/types/post";
import { useCategories } from "@/hooks/useCategories";
import Checkbox from "@/components/ui/Checkbox";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import AdminEditorShell from "@/components/admin/AdminEditorShell";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import T from "@/components/ui/T";
import styles from "./SeriesEditor.module.css";

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

interface SeriesEditorProps {
  series?: Series;
}

export default function SeriesEditor({ series }: SeriesEditorProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const categories = useCategories();
  const isEdit = !!series;

  const ts = (key: string) => t(`admin.posts.seriesModal.${key}`);
  const defaultCatKo = categories[0]?.ko || "";

  const [editorLang, setEditorLang] = useState<"ko" | "en">("ko");
  const [form, setForm] = useState<SeriesForm>({
    title: series?.title ?? "",
    title_en: series?.title_en ?? "",
    description: series?.description ?? "",
    description_en: series?.description_en ?? "",
    category: series?.category || defaultCatKo,
    cover_image: series?.cover_image ?? "",
    published: series?.published ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [posts, setPosts] = useState<SeriesPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);

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

  const handleSave = useCallback(
    async (asPublished: boolean) => {
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

      const payload = { ...form, published: asPublished };

      try {
        if (isEdit && series) {
          const res = await fetch(`/api/series/${series.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error(ts("saveFailed"));
          setStatus(t("admin.posts.seriesModal.save"));
        } else {
          const res = await fetch("/api/series", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error(ts("saveFailed"));
          router.push("/admin/posts");
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : ts("saveFailed"));
      } finally {
        setSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, isEdit, series, router],
  );

  const handleDelete = useCallback(async () => {
    if (!series || !confirm(t("admin.posts.seriesDeleteConfirm"))) return;
    setDeleting(true);
    await fetch(`/api/series/${series.id}`, { method: "DELETE" });
    router.push("/admin/posts");
  }, [series, router, t]);

  const labels = {
    delete: t("admin.posts.delete"),
    deleting: "...",
    saving: "...",
    saveDraft: ts("save"),
    update: ts("save"),
    publish: ts("create"),
  };

  return (
    <AdminEditorShell
      backHref="/admin/posts"
      backLabel={t("admin.posts.title")}
      editorLang={editorLang}
      onEditorLangChange={setEditorLang}
      isEdit={isEdit}
      saving={saving}
      deleting={deleting}
      published={form.published}
      onDelete={isEdit ? handleDelete : undefined}
      onSaveDraft={() => handleSave(false)}
      onPublish={() => handleSave(true)}
      status={status}
      statusType="success"
      error={error}
      labels={labels}
    >
      <div className={styles.container}>
        <div className={styles.body}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}><T k="admin.posts.seriesModal.titleKO" /></label>
            <input
              className={styles.input}
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder={ts("titlePlaceholder")}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}><T k="admin.posts.seriesModal.titleEN" /></label>
            <input
              className={styles.input}
              value={form.title_en}
              onChange={(e) => updateField("title_en", e.target.value)}
              placeholder={ts("titlePlaceholderEN")}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}><T k="admin.posts.seriesModal.descriptionKO" /></label>
            <Textarea
              textareaClassName={styles.textarea}
              value={form.description}
              onChange={(v) => updateField("description", v)}
              placeholder={ts("descPlaceholder")}
              rows={3}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}><T k="admin.posts.seriesModal.descriptionEN" /></label>
            <Textarea
              textareaClassName={styles.textarea}
              value={form.description_en}
              onChange={(v) => updateField("description_en", v)}
              placeholder={ts("descPlaceholderEN")}
              rows={3}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}><T k="admin.posts.seriesModal.category" /></label>
              <Select
                value={form.category}
                options={categories.map((cat) => ({
                  value: cat.ko,
                  label: language === "ko" ? cat.ko : cat.en,
                }))}
                onChange={(v) => updateField("category", v)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}><T k="admin.posts.seriesModal.published" /></label>
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
            <label className={styles.label}><T k="admin.posts.seriesModal.coverImage" /></label>
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
                  <T k="admin.posts.seriesModal.remove" />
                </button>
              </div>
            ) : (
              <>
                <div className={styles.coverActions}>
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    onClick={handleImageUpload}
                    disabled={uploading}
                  >
                    {uploading ? <T k="admin.posts.seriesModal.uploading" /> : <T k="admin.posts.seriesModal.uploadCover" />}
                  </button>
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    onClick={() => setShowCoverPicker((v) => !v)}
                  >
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
            <div className={styles.postsSection}>
              <label className={styles.label}>
                <T k="admin.posts.seriesModal.posts" /> ({posts.length})
              </label>
              {postsLoading ? (
                <p className={styles.postsEmpty}><T k="admin.posts.seriesModal.postsLoading" /></p>
              ) : posts.length === 0 ? (
                <p className={styles.postsEmpty}><T k="admin.posts.seriesModal.postsEmpty" /></p>
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
                          <ChevronUp size={10} strokeWidth={1.5} />
                        </button>
                        <span className={styles.orderNum}>{idx + 1}</span>
                        <button
                          type="button"
                          className={styles.orderBtn}
                          disabled={idx === posts.length - 1}
                          onClick={() => handleReorder(idx, 1)}
                          aria-label="Move down"
                        >
                          <ChevronDown size={10} strokeWidth={1.5} />
                        </button>
                      </div>
                      <span className={styles.postTitle}>
                        {post.title || <T k="admin.posts.seriesModal.untitled" />}
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
      </div>
    </AdminEditorShell>
  );
}
