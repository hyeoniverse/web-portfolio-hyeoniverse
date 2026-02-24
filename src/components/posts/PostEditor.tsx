"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { marked } from "marked";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Post, PostFormData, Series } from "@/types/post";
import { useCategories } from "@/hooks/useCategories";
import Checkbox from "@/components/ui/Checkbox";
import AdminEditorShell, {
  adminEditorStyles as es,
} from "@/components/admin/AdminEditorShell";
import EditorToggle from "./EditorToggle";
import MarkdownEditor from "./MarkdownEditor";
import CoverImagePicker from "./CoverImagePicker";
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
  const { t } = useLanguage();
  const isEdit = !!post;
  const categories = useCategories();

  const te = (key: string) => t(`admin.posts.editor.${key}`);

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

  useEffect(() => {
    fetch("/api/series?all=true")
      .then((res) => res.json())
      .then((data) => setSeriesList(Array.isArray(data) ? data : []));
  }, []);

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

  const addTag = useCallback(() => {
    const tag = tagInput.trim().replace(/,/g, "");
    if (tag && !form.tags.includes(tag)) {
      updateField("tags", [...form.tags, tag]);
    }
    setTagInput("");
  }, [tagInput, form.tags, updateField]);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag();
      }
    },
    [addTag]
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

        if (!isEdit && publish && savedSlug) {
          window.open(`/posts/${savedSlug}`, "_blank");
        }

        router.push("/admin/posts");
      } catch {
        setError(te("networkError"));
      } finally {
        setSaving(false);
      }
    },
    [form, isEdit, post, router, te]
  );

  const handleDelete = useCallback(async () => {
    if (!post) return;
    if (!confirm(`"${post.title}"${te("deleteConfirm")}`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/admin/posts");
    } catch {
      setError(te("deleteFailed"));
      setDeleting(false);
    }
  }, [post, router, te]);

  const handlePreview = useCallback(() => {
    sessionStorage.setItem("post-preview", JSON.stringify(form));
    window.open("/admin/posts/preview", "_blank");
  }, [form]);

  const shellLabels = useMemo(
    () => ({
      delete: te("delete"),
      deleting: te("deleting"),
      preview: te("preview"),
      saving: te("saving"),
      saveDraft: te("saveDraft"),
      update: te("update"),
      publish: te("publish"),
    }),
    [te]
  );

  const titleKey = editorLang === "ko" ? "title" : "title_en";
  const contentKey = editorLang === "ko" ? "content" : "content_en";
  const excerptKey = editorLang === "ko" ? "excerpt" : "excerpt_en";

  return (
    <AdminEditorShell
      backHref="/admin/posts"
      backLabel={te("backToPosts")}
      editorLang={editorLang}
      onEditorLangChange={setEditorLang}
      isEdit={isEdit}
      saving={saving}
      deleting={deleting}
      published={form.published}
      onDelete={handleDelete}
      onSaveDraft={() => handleSave(false)}
      onPublish={() => handleSave(true)}
      onPreview={handlePreview}
      status={status}
      error={error}
      labels={shellLabels}
    >
      <div className={styles.meta}>
        <div className={es.field}>
          <label className={es.fieldLabel}>
            {editorLang === "ko" ? te("title") : te("titleEN")}
          </label>
          <input
            className={es.titleInput}
            type="text"
            value={form[titleKey]}
            onChange={(e) => updateField(titleKey, e.target.value)}
            placeholder={editorLang === "ko" ? te("titlePlaceholder") : te("titlePlaceholderEN")}
          />
        </div>

        <div className={es.row}>
          <div className={es.field}>
            <label className={es.fieldLabel}>{te("slug")}</label>
            <input
              className={es.fieldInput}
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

        <div className={es.field}>
          <label className={es.fieldLabel}>
            {editorLang === "ko" ? te("excerpt") : te("excerptEN")}
          </label>
          <textarea
            className={styles.excerptInput}
            value={form[excerptKey]}
            onChange={(e) => updateField(excerptKey, e.target.value)}
            placeholder={
              editorLang === "ko"
                ? te("excerptPlaceholder")
                : te("excerptPlaceholderEN")
            }
            rows={2}
          />
        </div>

        <div className={es.row}>
          <div className={es.field}>
            <label className={es.fieldLabel}>{te("category")}</label>
            <div className={styles.categoryWrap}>
              <select
                className={es.fieldInput}
                value={categories.includes(form.category) ? form.category : "__custom__"}
                onChange={(e) => {
                  if (e.target.value === "__custom__") return;
                  updateField("category", e.target.value);
                }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__custom__">{te("customCategory")}</option>
              </select>
              {!categories.includes(form.category) && (
                <input
                  className={es.fieldInput}
                  type="text"
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  placeholder={te("customCategory")}
                />
              )}
            </div>
          </div>
          <div className={es.field}>
            <label className={es.fieldLabel}>{te("pin")}</label>
            <div className={styles.pinToggle}>
              <Checkbox
                checked={form.is_pinned}
                onChange={(v) => updateField("is_pinned", v)}
                label={te("pinLabel")}
              />
            </div>
          </div>
        </div>

        <div className={es.row}>
          <div className={es.field}>
            <label className={es.fieldLabel}>{te("series")}</label>
            <div className={styles.seriesRow}>
              <select
                className={es.fieldInput}
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
                <option value="">{te("seriesNone")}</option>
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.post_count ?? 0}){s.category ? ` — ${s.category}` : ""}
                  </option>
                ))}
              </select>
              <a
                href="/admin/settings?tab=content&sub=posts"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.seriesEditBtn}
              >
                {te("seriesManage")}
              </a>
            </div>
          </div>
          {form.series_id && (
            <div className={es.field}>
              <label className={es.fieldLabel}>{te("seriesOrder")}</label>
              <input
                className={es.fieldInput}
                type="number"
                min={0}
                value={form.series_order}
                onChange={(e) => updateField("series_order", parseInt(e.target.value) || 0)}
              />
            </div>
          )}
        </div>

        <div className={es.row}>
          <div className={es.field}>
            <label className={es.fieldLabel}>{te("tags")}</label>
            <div className={styles.tagInputRow}>
              <input
                className={es.fieldInput}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={te("tagsPlaceholder")}
              />
              <button
                type="button"
                className={styles.tagAddBtn}
                onClick={addTag}
                disabled={!tagInput.trim()}
              >
                +
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className={es.tags}>
                {form.tags.map((tag) => (
                  <span key={tag} className={es.tag}>
                    {tag}
                    <button
                      type="button"
                      className={es.tagRemove}
                      onClick={() => removeTag(tag)}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={es.field}>
            <label className={es.fieldLabel}>{te("coverImage")}</label>
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
                {te("remove")}
              </button>
            </div>
          ) : (
            <div className={styles.coverActions}>
              <button
                type="button"
                className={es.uploadBtn}
                onClick={handleCoverUpload}
              >
                {te("upload")}
              </button>
              <button
                type="button"
                className={es.uploadBtn}
                onClick={() => setShowCoverPicker((v) => !v)}
              >
                {showCoverPicker ? te("closePicker") : te("chooseCover")}
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
        <div className={es.editorHeader}>
          <span className={styles.editorLabel}>
            {editorLang === "ko" ? te("content") : te("contentEN")}
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

    </AdminEditorShell>
  );
}
