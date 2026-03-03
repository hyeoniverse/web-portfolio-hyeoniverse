"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { marked } from "marked";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Post, PostFormData, Series } from "@/types/post";
import { useCategories } from "@/hooks/useCategories";
import Checkbox from "@/components/ui/Checkbox";
import Select from "@/components/ui/Select";
import AdminEditorShell, {
  adminEditorStyles as es,
} from "@/components/admin/AdminEditorShell";
import { useRevisions } from "@/hooks/useRevisions";
import { autoTranslate } from "@/utils/autoTranslate";
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
  const { tLang } = useLanguage();
  const isEdit = !!post;
  const categories = useCategories();

  const [editorLang, setEditorLang] = useState<"ko" | "en">("ko");

  const te = useCallback(
    (key: string) => tLang(`admin.posts.editor.${key}`, editorLang),
    [tLang, editorLang],
  );

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
  const [translating, setTranslating] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success">("info");
  const [error, setError] = useState("");
  const [slugManual, setSlugManual] = useState(isEdit);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const initialFormRef = useRef(form);
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialFormRef.current),
    [form],
  );

  const { revisions: dbRevisions, saveRevision, loadRevisionSnapshot } = useRevisions({
    entityType: "post",
    entityId: post?.id,
  });

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

  // status 메시지는 다음 액션까지 유지

  /* ── Auto-save (5s debounce, new + edit) ── */
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoSaveSkip = useRef(true);
  const autoSaveBusy = useRef(false);
  const savedId = useRef<string | undefined>(post?.id);
  autoSaveBusy.current = saving || translating;

  useEffect(() => {
    if (autoSaveSkip.current) {
      autoSaveSkip.current = false;
      return;
    }

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (autoSaveBusy.current) return;
      // 새 글은 제목이 있어야 자동 저장
      if (!savedId.current && !form.title.trim()) return;

      try {
        const url = savedId.current
          ? `/api/posts/${savedId.current}`
          : "/api/posts";
        const method = savedId.current ? "PATCH" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          if (!savedId.current) {
            const data = await res.json();
            savedId.current = data.id;
          }
          saveRevision({ ...form }, form.title || form.title_en || "(untitled)");
          setStatus(te("autoSaved"));
          setStatusType("success");
        }
      } catch {
        // silent fail
      }
    }, 5000);

    return () => clearTimeout(autoSaveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const updateField = useCallback(
    <K extends keyof PostFormData>(key: K, value: PostFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setStatus("");
      setError("");
    },
    []
  );

  const translateFields = useCallback(
    async (fieldKeys: string[], lang: "ko" | "en") => {
      const isToEn = lang === "en";
      const sourceLang: "ko" | "en" = isToEn ? "ko" : "en";
      const targetLang: "ko" | "en" = isToEn ? "en" : "ko";
      const want = new Set(fieldKeys);

      const srcTitle = isToEn ? form.title : form.title_en;
      const srcContent = isToEn ? form.content : form.content_en;
      const srcExcerpt = isToEn ? form.excerpt : form.excerpt_en;

      const texts: string[] = [];
      const keys: (keyof PostFormData)[] = [];

      if (want.has("title") && srcTitle.trim()) {
        texts.push(srcTitle);
        keys.push(isToEn ? "title_en" : "title");
      }
      if (want.has("content") && srcContent.trim()) {
        texts.push(srcContent);
        keys.push(isToEn ? "content_en" : "content");
      }
      if (want.has("excerpt") && srcExcerpt.trim()) {
        texts.push(srcExcerpt);
        keys.push(isToEn ? "excerpt_en" : "excerpt");
      }

      if (texts.length === 0) return;

      setTranslating(true);
      setStatus(tLang("admin.posts.editor.translating", lang));
      setStatusType("info");

      const result = await autoTranslate(texts, sourceLang, targetLang);
      setTranslating(false);

      if ("translations" in result) {
        const patch: Partial<PostFormData> = {};
        keys.forEach((k, i) => {
          (patch as Record<string, string>)[k] = result.translations[i];
        });
        setForm((prev) => ({ ...prev, ...patch }));
        setStatus(tLang("admin.posts.editor.autoTranslated", lang));
        setStatusType("success");
      } else {
        setError(result.error);
      }
    },
    [form, tLang],
  );

  const handleEditorLangChange = useCallback(
    async (newLang: "ko" | "en") => {
      if (translating) return;
      setEditorLang(newLang);

      const isToEn = newLang === "en";
      const dstTitle = isToEn ? form.title_en : form.title;
      const dstContent = isToEn ? form.content_en : form.content;
      const srcTitle = isToEn ? form.title : form.title_en;
      const srcContent = isToEn ? form.content : form.content_en;

      const hasSource = !!(srcTitle.trim() || srcContent.trim());
      const hasDest = !!(dstTitle.trim() || dstContent.trim());

      if (hasSource && !hasDest) {
        await translateFields(["title", "content", "excerpt"], newLang);
      }
    },
    [form, translating, translateFields],
  );

  const handleRetranslate = useCallback(
    async (fieldKeys?: string[]) => {
      if (translating) return;
      await translateFields(fieldKeys ?? ["title", "content", "excerpt"], editorLang);
    },
    [translating, editorLang, translateFields],
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
      const willPublish = publish !== undefined ? publish : form.published;

      if (willPublish) {
        const missing: string[] = [];
        if (!form.title.trim()) missing.push(te("title"));
        if (!form.slug.trim()) missing.push(te("slug"));
        if (!form.category.trim()) missing.push(te("category"));
        if (missing.length > 0) {
          setError(`${te("requiredFields")}: ${missing.join(", ")}`);
          return;
        }
      }

      setSaving(true);
      setError("");
      setStatus("");

      const body = {
        ...form,
        published: willPublish,
      };

      try {
        const url = savedId.current
          ? `/api/posts/${savedId.current}`
          : "/api/posts";
        const method = savedId.current ? "PATCH" : "POST";

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

        if (!savedId.current) savedId.current = data.id;

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

  const handleRestoreRevision = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return;
      const snapshot = await loadRevisionSnapshot(rev.id);
      if (snapshot) {
        setForm(snapshot as PostFormData);
        setStatus(te("restored"));
        setStatusType("success");
      }
    },
    [dbRevisions, loadRevisionSnapshot, te],
  );

  const handleLoadRevisionDetail = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return null;
      const snapshot = await loadRevisionSnapshot(rev.id);
      if (!snapshot) return null;
      const s = snapshot as PostFormData;
      return {
        excerpt: s.excerpt || s.excerpt_en || "",
        content: s.content || s.content_en || "",
      };
    },
    [dbRevisions, loadRevisionSnapshot],
  );

  const handleRevert = useCallback(() => {
    setForm(initialFormRef.current);
    setStatus(te("reverted"));
    setStatusType("info");
  }, [te]);

  const shellLabels = useMemo(
    () => ({
      delete: te("delete"),
      deleting: te("deleting"),
      preview: te("preview"),
      saving: te("saving"),
      saveDraft: te("saveDraft"),
      update: te("update"),
      publish: te("publish"),
      revert: te("revert"),
      revisionHistory: te("revisionHistory"),
      restore: te("restore"),
      retranslate: te("retranslate"),
      retranslateAll: te("retranslateAll"),
    }),
    [te]
  );

  const retranslateOptions = useMemo(
    () => [
      { key: "title", label: te("title") },
      { key: "excerpt", label: te("excerpt") },
      { key: "content", label: te("content") },
    ],
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
      onEditorLangChange={handleEditorLangChange}
      isEdit={isEdit}
      isDirty={isDirty}
      saving={saving || translating}
      deleting={deleting}
      published={form.published}
      onDelete={handleDelete}
      onSaveDraft={() => handleSave()}
      onPublish={() => handleSave(true)}
      onPreview={handlePreview}
      status={status}
      statusType={statusType}
      error={error}
      labels={shellLabels}
      revisions={dbRevisions.map((r) => ({
        timestamp: r.timestamp,
        title: r.title,
      }))}
      onRevert={handleRevert}
      onRestoreRevision={handleRestoreRevision}
      onLoadRevisionDetail={handleLoadRevisionDetail}
      onRetranslate={handleRetranslate}
      retranslateOptions={retranslateOptions}
      currentSnapshot={{
        title: form.title || form.title_en,
        excerpt: form.excerpt || form.excerpt_en || "",
        content: form.content || form.content_en || "",
      }}
    >
      <div className={styles.meta}>
        <div className={es.field}>
          <label className={es.fieldLabel}>{te("title")}</label>
          <input
            className={es.titleInput}
            type="text"
            value={form[titleKey]}
            onChange={(e) => updateField(titleKey, e.target.value)}
            placeholder={te("titlePlaceholder")}
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

        <div className={es.field}>
          <label className={es.fieldLabel}>{te("excerpt")}</label>
          <textarea
            className={styles.excerptInput}
            value={form[excerptKey]}
            onChange={(e) => updateField(excerptKey, e.target.value)}
            placeholder={te("excerptPlaceholder")}
            rows={2}
          />
        </div>

        <div className={styles.contentGroup}>
          <div className={styles.contentGroupHeader}>
            <span className={styles.contentGroupLabel}>
              {te("category")} &amp; {te("series")}
            </span>
            <a
              href="/admin/settings?tab=content&sub=posts"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.manageLink}
            >
              {te("seriesManage")}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>

          <div className={es.field}>
            <label className={es.fieldLabel}>{te("category")}</label>
            <div className={styles.categoryWrap}>
              <Select
                value={categories.includes(form.category) ? form.category : "__custom__"}
                options={[
                  ...categories.map((cat) => ({ value: cat, label: cat })),
                  { value: "__custom__", label: te("customCategory") },
                ]}
                onChange={(v) => {
                  if (v === "__custom__") {
                    updateField("category", "");
                    return;
                  }
                  updateField("category", v);
                }}
              />
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

          <div className={es.row}>
            <div className={es.field}>
              <label className={es.fieldLabel}>{te("series")}</label>
              <Select
                value={form.series_id ?? ""}
                options={[
                  { value: "", label: te("seriesNone") },
                  ...seriesList.map((s) => ({
                    value: s.id,
                    label: `${s.title} (${s.post_count ?? 0})${s.category ? ` — ${s.category}` : ""}`,
                  })),
                ]}
                onChange={(v) => {
                  updateField("series_id", v || null);
                  if (v) {
                    const selected = seriesList.find((s) => s.id === v);
                    if (selected?.category) {
                      updateField("category", selected.category);
                    }
                  }
                }}
              />
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
          <span className={styles.editorLabel}>{te("content")}</span>
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
            editLabel={te("editorLabel")}
            previewLabel={te("previewLabel")}
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
