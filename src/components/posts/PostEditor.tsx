"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { marked } from "marked";
import { useLenis } from "@/providers/LenisProvider";
import type { Post, PostFormData, Series } from "@/types/post";
import { CATEGORIES } from "@/constants/categories";
import EditorToggle from "./EditorToggle";
import MarkdownEditor from "./MarkdownEditor";
import CoverImagePicker from "./CoverImagePicker";
import LanguageToggle from "@/components/ui/LanguageToggle";
import styles from "./PostEditor.module.css";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), {
  ssr: false,
});

interface PostEditorProps {
  post?: Post;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export default function PostEditor({ post }: PostEditorProps) {
  const router = useRouter();
  const { setInfinite, lenis } = useLenis();
  const isEdit = !!post;

  // Disable infinite scroll on editor pages
  useEffect(() => {
    setInfinite(false);
    window.scrollTo(0, 0);
    if (lenis) lenis.scrollTo(0, { immediate: true });

    return () => {
      setInfinite(true);
    };
  }, [setInfinite, lenis]);

  const [editorLang, setEditorLang] = useState<"ko" | "en">("ko");

  const [form, setForm] = useState<PostFormData>({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    content: post?.content ?? "",
    content_type: post?.content_type ?? "markdown",
    excerpt: post?.excerpt ?? "",
    cover_image: post?.cover_image ?? "",
    tags: post?.tags ?? [],
    category: post?.category ?? "General",
    is_pinned: post?.is_pinned ?? false,
    published: post?.published ?? false,
    language: post?.language ?? "ko",
    title_en: post?.title_en ?? "",
    content_en: post?.content_en ?? "",
    excerpt_en: post?.excerpt_en ?? "",
    series_id: post?.series_id ?? null,
    series_order: post?.series_order ?? 0,
  });

  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [slugManual, setSlugManual] = useState(isEdit);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [newSeriesTitle, setNewSeriesTitle] = useState("");

  // 시리즈 목록 불러오기
  useEffect(() => {
    fetch("/api/series?all=true")
      .then((res) => res.json())
      .then((data) => setSeriesList(Array.isArray(data) ? data : []));
  }, []);

  // Auto-generate slug from KO title
  useEffect(() => {
    if (!slugManual && form.title) {
      setForm((prev) => ({ ...prev, slug: generateSlug(prev.title) }));
    }
  }, [form.title, slugManual]);

  const updateField = useCallback(
    <K extends keyof PostFormData>(key: K, value: PostFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setStatus("");
      setError("");
    },
    []
  );

  const handleCreateSeries = useCallback(async () => {
    if (!newSeriesTitle.trim()) return;
    const res = await fetch("/api/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newSeriesTitle.trim(),
        published: true,
        category: form.category,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setSeriesList((prev) => [created, ...prev]);
      updateField("series_id", created.id);
      setNewSeriesTitle("");
    }
  }, [newSeriesTitle, updateField, form.category]);

  // Content type change with auto-conversion
  const handleContentTypeChange = useCallback(
    async (newType: "markdown" | "richtext") => {
      if (newType === form.content_type) return;

      const convert = async (content: string): Promise<string> => {
        if (!content) return content;
        if (form.content_type === "markdown" && newType === "richtext") {
          return marked.parse(content, { async: false }) as string;
        } else {
          const TurndownService = (await import("turndown")).default;
          const td = new TurndownService({ headingStyle: "atx" });
          return td.turndown(content);
        }
      };

      const [newContent, newContentEn] = await Promise.all([
        convert(form.content),
        convert(form.content_en),
      ]);

      setForm((prev) => ({
        ...prev,
        content: newContent,
        content_en: newContentEn,
        content_type: newType,
      }));
      setStatus("");
      setError("");
    },
    [form.content, form.content_en, form.content_type]
  );

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);
    return data.url;
  }, []);

  const handleCoverUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = await handleImageUpload(file);
      updateField("cover_image", url);
    };
    input.click();
  }, [handleImageUpload, updateField]);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return; // 한글 IME 조합 중 무시
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const tag = tagInput.trim().replace(/,/g, "");
        if (tag && !form.tags.includes(tag)) {
          updateField("tags", [...form.tags, tag]);
        }
        setTagInput("");
      }
    },
    [tagInput, form.tags, updateField]
  );

  const removeTag = useCallback(
    (tag: string) => {
      updateField(
        "tags",
        form.tags.filter((t) => t !== tag)
      );
    },
    [form.tags, updateField]
  );

  const handleSave = useCallback(
    async (publish?: boolean) => {
      setSaving(true);
      setError("");
      setStatus("");

      const body = {
        ...form,
        published: publish !== undefined ? publish : form.published,
      };

      try {
        const url = isEdit ? `/api/posts/${post!.id}` : "/api/posts";
        const method = isEdit ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Failed to save");
          return;
        }

        const savedSlug = data.slug || form.slug;

        // 발행(새 포스트) → 새 창으로 포스트 열기 + 목록 이동
        if (!isEdit && publish && savedSlug) {
          window.open(`/posts/${savedSlug}`, "_blank");
        }

        // 저장/발행 후 항상 목록으로 이동
        router.push("/admin/posts");
      } catch {
        setError("Network error");
      } finally {
        setSaving(false);
      }
    },
    [form, isEdit, post, router]
  );

  const handleDelete = useCallback(async () => {
    if (!post) return;
    if (!confirm(`"${post.title}" 을(를) 삭제하시겠습니까?`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/admin/posts");
    } catch {
      setError("삭제 실패");
      setDeleting(false);
    }
  }, [post, router]);

  // Language-aware field keys
  const titleKey = editorLang === "ko" ? "title" : "title_en";
  const contentKey = editorLang === "ko" ? "content" : "content_en";
  const excerptKey = editorLang === "ko" ? "excerpt" : "excerpt_en";

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <Link href="/admin/posts" className={styles.backLink}>
            &larr; Back to Posts
          </Link>
          <LanguageToggle lang={editorLang} onLangChange={setEditorLang} />
        </div>
        <div className={styles.actions}>
          {isEdit && (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}
          <div className={styles.actionsDivider} />
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => {
              sessionStorage.setItem("post-preview", JSON.stringify(form));
              window.open("/admin/posts/preview", "_blank");
            }}
          >
            Preview
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            className={styles.publishBtn}
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            {form.published ? "Update" : "Publish"}
          </button>
        </div>
      </div>
      {(status || error) && (
        <div className={styles.statusBar}>
          {status && <span className={styles.status}>{status}</span>}
          {error && <span className={styles.error}>{error}</span>}
        </div>
      )}

      <div className={styles.meta}>
        <input
          className={styles.titleInput}
          type="text"
          value={form[titleKey]}
          onChange={(e) => updateField(titleKey, e.target.value)}
          placeholder={editorLang === "ko" ? "포스트 제목" : "Post title (EN)"}
        />

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Slug</label>
            <input
              className={styles.fieldInput}
              type="text"
              value={form.slug}
              onChange={(e) => {
                setSlugManual(true);
                updateField("slug", e.target.value);
              }}
              placeholder="post-url-slug"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            Excerpt {editorLang === "en" && "(EN)"}
          </label>
          <textarea
            className={styles.excerptInput}
            value={form[excerptKey]}
            onChange={(e) => updateField(excerptKey, e.target.value)}
            placeholder={
              editorLang === "ko"
                ? "포스트 요약..."
                : "Brief description (EN)..."
            }
            rows={2}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Category</label>
            <div className={styles.categoryWrap}>
              <select
                className={styles.fieldInput}
                value={CATEGORIES.includes(form.category as never) ? form.category : "__custom__"}
                onChange={(e) => {
                  if (e.target.value === "__custom__") return;
                  updateField("category", e.target.value);
                }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__custom__">Custom...</option>
              </select>
              {!CATEGORIES.includes(form.category as never) && (
                <input
                  className={styles.fieldInput}
                  type="text"
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  placeholder="Custom category"
                />
              )}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Pin</label>
            <label className={styles.pinToggle}>
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(e) => updateField("is_pinned", e.target.checked)}
              />
              <span>Pin this post to top</span>
            </label>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Series</label>
            <select
              className={styles.fieldInput}
              value={form.series_id ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                updateField("series_id", val || null);
                if (val) {
                  const selected = seriesList.find((s) => s.id === val);
                  if (selected?.category) {
                    updateField("category", selected.category);
                  }
                }
              }}
            >
              <option value="">None</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.post_count ?? 0}){s.category ? ` — ${s.category}` : ""}
                </option>
              ))}
            </select>
            <div className={styles.newSeriesRow}>
              <input
                className={styles.fieldInput}
                type="text"
                value={newSeriesTitle}
                onChange={(e) => setNewSeriesTitle(e.target.value)}
                placeholder="New series name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateSeries();
                  }
                }}
              />
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={handleCreateSeries}
                disabled={!newSeriesTitle.trim()}
              >
                Create
              </button>
            </div>
          </div>
          {form.series_id && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Order in Series</label>
              <input
                className={styles.fieldInput}
                type="number"
                min={0}
                value={form.series_order}
                onChange={(e) => updateField("series_order", parseInt(e.target.value) || 0)}
              />
            </div>
          )}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Tags</label>
            <input
              className={styles.fieldInput}
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Type a tag and press Enter"
            />
            {form.tags.length > 0 && (
              <div className={styles.tags}>
                {form.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                    <button
                      type="button"
                      className={styles.tagRemove}
                      onClick={() => removeTag(tag)}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Cover Image</label>
          {form.cover_image ? (
            <div className={styles.coverPreview}>
              <Image
                src={form.cover_image}
                alt="Cover"
                width={80}
                height={50}
                className={styles.coverThumb}
              />
              <button
                type="button"
                className={styles.coverRemove}
                onClick={() => {
                  updateField("cover_image", "");
                  setShowCoverPicker(false);
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className={styles.coverActions}>
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={handleCoverUpload}
              >
                Upload
              </button>
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => setShowCoverPicker((v) => !v)}
              >
                {showCoverPicker ? "Close picker" : "Choose cover"}
              </button>
            </div>
          )}
          {showCoverPicker && !form.cover_image && (
            <CoverImagePicker
              onSelect={(url) => {
                updateField("cover_image", url);
                setShowCoverPicker(false);
              }}
              onClose={() => setShowCoverPicker(false)}
              postContext={{
                title: form.title,
                tags: form.tags,
                excerpt: form.excerpt,
              }}
            />
          )}
          </div>
        </div>
      </div>

      <div className={styles.editorSection}>
        <div className={styles.editorHeader}>
          <span className={styles.editorLabel}>
            Content {editorLang === "en" && "(EN)"}
          </span>
          <EditorToggle
            value={form.content_type}
            onChange={handleContentTypeChange}
          />
        </div>

        {form.content_type === "markdown" ? (
          <MarkdownEditor
            key={editorLang}
            value={form[contentKey]}
            onChange={(v) => updateField(contentKey, v)}
            onImageUpload={handleImageUpload}
          />
        ) : (
          <RichTextEditor
            key={editorLang}
            value={form[contentKey]}
            onChange={(v) => updateField(contentKey, v)}
            onImageUpload={handleImageUpload}
          />
        )}
      </div>
    </div>
  );
}
