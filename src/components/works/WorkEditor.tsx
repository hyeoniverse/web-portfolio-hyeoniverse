"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { marked } from "marked";
import { useLanguage } from "@/providers/LanguageProvider";
import { validateContentSecurity } from "@/utils/contentSecurity";
import AdminEditorShell, {
  adminEditorStyles as es,
} from "@/components/admin/AdminEditorShell";
import EditorToggle from "@/components/posts/EditorToggle";
import MarkdownEditor from "@/components/posts/MarkdownEditor";
import type { Work, WorkFormData } from "@/types/work";
import { useRevisions } from "@/hooks/useRevisions";
import { useEditorAutoSave } from "@/hooks/useEditorAutoSave";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import { useTagInput } from "@/hooks/useTagInput";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { autoTranslate } from "@/utils/autoTranslate";
import { SIZES, TEMPLATE_KO, TEMPLATE_EN } from "@/data/workTemplates";
import { workToFormData, defaultForm } from "@/utils/workFormUtils";
import { stripHtml } from "@/utils/htmlUtils";
import Select from "@/components/ui/Select";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import styles from "./WorkEditor.module.css";

const Editor = dynamic(() => import("@/components/posts/PlateEditor"), {
  ssr: false,
});

interface WorkEditorProps {
  work?: Work;
}

interface WorksCategory {
  ko: string;
  en: string;
}


export default function WorkEditor({ work }: WorkEditorProps) {
  const router = useRouter();
  const { tLang } = useLanguage();
  const { openModal } = useModalStore();
  const isEdit = !!work;
  const serviceStatus = useServiceStatus();

  const [editorLang, setEditorLang] = useState<"ko" | "en">("ko");

  const tw = useCallback(
    (key: string) => tLang(`admin.works.editor.${key}`, editorLang),
    [tLang, editorLang],
  );
  const [translating, setTranslating] = useState(false);

  const [form, setForm] = useState<WorkFormData>(() => {
    if (!work) return defaultForm;
    return workToFormData(work);
  });

  const initialFormRef = useRef(form);
  const formRef = useRef(form);
  formRef.current = form;
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialFormRef.current),
    [form],
  );

  const { revisions: dbRevisions, saveRevision, loadRevisionSnapshot, deleteRevision } = useRevisions({
    entityType: "work",
    entityId: work?.id,
  });

  // 편집기 진입 시 자동저장 초안 복원 확인
  const draftRestored = useRef(false);
  const applyDraft = useCallback((data: WorkFormData) => {
    autoSaveSkip.current = true;
    setForm(data);
    setStatus(tw("draftRestored"));
    setStatusType("info");
  }, [tw, autoSaveSkip]);

  const askRestore = useCallback((data: WorkFormData) => {
    const modalId = "draft-restore";
    openModal(
      <ModalConfirm
        desc={tw("draftFoundDesc")}
        cancelText={tw("draftFoundDiscard")}
        confirmText={tw("draftFoundLoad")}
        onConfirm={() => applyDraft(data)}
        onCancel={() => {}}
      />,
      { id: modalId, header: { title: tw("draftFoundTitle") }, width: "360px", closeButton: false },
    );
  }, [tw, openModal, applyDraft]);

  useEffect(() => {
    if (draftRestored.current || dbRevisions.length === 0) return;
    draftRestored.current = true;
    loadRevisionSnapshot(dbRevisions[0].id).then((snapshot) => {
      if (!snapshot) return;
      askRestore(snapshot as WorkFormData);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbRevisions]);

  const [totalWorks, setTotalWorks] = useState(0);

  useEffect(() => {
    fetch("/api/works?all=true")
      .then((r) => r.json())
      .then((d) => {
        const count = d.total ?? (d.works?.length ?? 0);
        setTotalWorks(isEdit ? count : count + 1);
      })
      .catch(() => {});
  }, [isEdit]);

  const [worksCategories, setWorksCategories] = useState<WorksCategory[]>([]);

  useEffect(() => {
    fetch("/api/works-categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setWorksCategories(data);
      })
      .catch(() => {});
  }, []);

  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success">("info");
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  /* ── Auto-save ── */
  const getWorkTitle = useCallback(
    () => (formRef.current as WorkFormData).title || "(untitled)",
    [],
  );
  const onAutoSaved = useCallback(() => {
    setStatus(tw("autoSaved"));
    setStatusType("success");
  }, [tw]);

  const { savedId, autoSaveSkip, scheduleAutoSave } =
    useEditorAutoSave({
      entityType: "work",
      entityId: work?.id,
      formRef: formRef as { current: unknown },
      saveRevision,
      getTitle: getWorkTitle,
      busyFlags: { saving, translating },
      onSaved: onAutoSaved,
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(scheduleAutoSave, [form]);

  const updateField = useCallback(
    <K extends keyof WorkFormData>(key: K, value: WorkFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setStatus("");
      setError("");
      setShowErrors(false);
    },
    [],
  );

  const tech = useTagInput(form.tech, (tags) => updateField("tech", tags));

  const TRANSLATABLE_FIELDS = useMemo(
    () => ["subtitle", "description", "role", "content"] as const,
    [],
  );

  const translateFields = useCallback(
    async (fieldKeys: string[], lang: "ko" | "en") => {
      const isToEn = lang === "en";
      const srcSuf = isToEn ? "_ko" : "_en";
      const dstSuf = isToEn ? "_en" : "_ko";
      const sourceLang: "ko" | "en" = isToEn ? "ko" : "en";
      const targetLang: "ko" | "en" = isToEn ? "en" : "ko";
      const want = new Set(fieldKeys);

      const activeFields = TRANSLATABLE_FIELDS.filter(
        (f) => want.has(f) && form[`${f}${srcSuf}`]?.trim(),
      );
      const texts = activeFields.map((f) => form[`${f}${srcSuf}`]) as string[];

      if (texts.length === 0) return;

      setTranslating(true);
      setStatus(tLang("admin.works.editor.translating", lang));
      setStatusType("info");

      const result = await autoTranslate(texts, sourceLang, targetLang);
      setTranslating(false);

      if ("translations" in result) {
        const patch: Partial<WorkFormData> = {};
        activeFields.forEach((f, i) => {
          patch[`${f}${dstSuf}` as keyof WorkFormData] = result.translations[i] as never;
        });
        setForm((prev) => ({ ...prev, ...patch }));
        setStatus(tLang("admin.works.editor.autoTranslated", lang));
        setStatusType("success");
      } else {
        setError(result.error);
      }
    },
    [form, tLang, TRANSLATABLE_FIELDS],
  );

  const handleEditorLangChange = useCallback(
    async (newLang: "ko" | "en") => {
      if (translating) return;
      setEditorLang(newLang);

      const isToEn = newLang === "en";
      const srcSuf = isToEn ? "_ko" : "_en";
      const dstSuf = isToEn ? "_en" : "_ko";

      const hasSrc = TRANSLATABLE_FIELDS.some((f) => form[`${f}${srcSuf}`]?.trim());
      const hasDst = TRANSLATABLE_FIELDS.some((f) => form[`${f}${dstSuf}`]?.trim());

      if (hasSrc && !hasDst) {
        await translateFields(
          TRANSLATABLE_FIELDS.slice(),
          newLang,
        );
      }
    },
    [form, translating, translateFields, TRANSLATABLE_FIELDS],
  );

  const handleRetranslate = useCallback(
    async (fieldKeys?: string[]) => {
      if (translating) return;
      await translateFields(fieldKeys ?? TRANSLATABLE_FIELDS.slice(), editorLang);
    },
    [translating, editorLang, translateFields, TRANSLATABLE_FIELDS],
  );

  const team = useTeamMembers(form.team_members, (members) => updateField("team_members", members));

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

      const [newKo, newEn] = await Promise.all([
        convert(form.content_ko),
        convert(form.content_en),
      ]);

      setForm((prev) => ({
        ...prev,
        content_ko: newKo,
        content_en: newEn,
        content_type: newType,
      }));
      setStatus("");
      setError("");
    },
    [form.content_type, form.content_ko, form.content_en],
  );

  const handleInsertTemplate = useCallback(() => {
    const contentKey = editorLang === "ko" ? "content_ko" : "content_en";
    const template = editorLang === "ko" ? TEMPLATE_KO : TEMPLATE_EN;
    const current = form[contentKey];

    if (current.trim()) {
      if (!confirm(tw("templateConfirm"))) return;
      updateField(contentKey, current + "\n\n" + template);
    } else {
      updateField(contentKey, template);
    }
  }, [editorLang, form, updateField, tw]);

  const handleContentImageUpload = useCallback(async (file: File): Promise<string> => {
    const { compressImage, validateFileSize } = await import("@/lib/compressImage");

    const sizeError = validateFileSize(file);
    if (sizeError) throw new Error(sizeError);

    const compressed = await compressImage(file);

    const fd = new FormData();
    fd.append("file", compressed);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.url;
  }, []);

  const handleImageUpload = useCallback(async (field: "image" | "gallery") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = field === "gallery";
    input.onchange = async () => {
      const files = input.files;
      if (!files) return;

      const { compressImage, validateFileSize } = await import("@/lib/compressImage");
      for (const file of Array.from(files)) {
        const sizeError = validateFileSize(file);
        if (sizeError) { alert(sizeError); continue; }
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append("file", compressed);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) continue;

        if (field === "image") {
          updateField("image", data.url);
        } else {
          setForm((prev) => ({ ...prev, gallery: [...prev.gallery, data.url] }));
        }
      }
    };
    input.click();
  }, [updateField]);

  const removeGalleryItem = useCallback(
    (index: number) => {
      setForm((prev) => ({
        ...prev,
        gallery: prev.gallery.filter((_, i) => i !== index),
      }));
    },
    [],
  );

  const handleSave = useCallback(
    async (publish?: boolean) => {
      const willPublish = publish !== undefined ? publish : form.published;

      if (willPublish) {
        const missing: string[] = [];
        if (!form.title.trim()) missing.push(tw("title"));
        if (!form.category_ko.trim()) missing.push(tw("category"));
        if (!form.year.trim()) missing.push(tw("year"));
        if (!form.image.trim()) missing.push(tw("mainImage"));
        if (!form.content_ko.trim() && !form.content_en.trim()) missing.push(tw("description"));
        if (missing.length > 0) {
          setError(`${missing.join(" · ")} ${tw("requiredFields")}`);
          setShowErrors(true);
          return;
        }

        const security = validateContentSecurity(form.content_ko + form.content_en);
        if (!security.safe) {
          setError(`${tw("securityWarning")}: ${security.warnings.join(", ")}`);
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
          ? `/api/works/${savedId.current}`
          : "/api/works";
        const method = savedId.current ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? tw("saveFailed"));
          return;
        }

        if (!savedId.current) savedId.current = data.id;

        // 발행 시 AI 요약 자동 생성 (fire-and-forget)
        if (willPublish && savedId.current) {
          fetch(`/api/works/${savedId.current}/ai-summary`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).catch(() => {});
        }

        router.push("/admin/works");
      } catch {
        setError(tw("networkError"));
      } finally {
        setSaving(false);
      }
    },
    [form, router, tw, savedId],
  );

  const handleDelete = useCallback(async () => {
    if (!work) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/works/${work.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/admin/works");
    } catch {
      setError(tw("deleteFailed"));
      setDeleting(false);
    }
  }, [work, router, tw]);

  const handlePreview = useCallback(() => {
    sessionStorage.setItem("work-preview", JSON.stringify(form));
    window.open("/admin/works/preview", "_blank");
  }, [form]);

  const handleRestoreRevision = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return;
      const snapshot = await loadRevisionSnapshot(rev.id);
      if (snapshot) {
        setForm(snapshot as WorkFormData);
        setStatus(tw("restored"));
        setStatusType("success");
      }
    },
    [dbRevisions, loadRevisionSnapshot, tw],
  );

  const handleLoadRevisionDetail = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return null;
      const snapshot = await loadRevisionSnapshot(rev.id);
      if (!snapshot) return null;
      const s = snapshot as WorkFormData;
      return {
        excerpt: s.description_ko || s.description_en || "",
        content: stripHtml(s.content_ko || s.content_en || ""),
        meta: {
          Category: s.category_ko || s.category_en || "",
          Year: s.year || "",
          Tech: s.tech?.join(", ") || "",
          Size: s.size || "",
          Role: s.role_ko || s.role_en || "",
        },
      };
    },
    [dbRevisions, loadRevisionSnapshot],
  );

  const handleDeleteRevision = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return false;
      return deleteRevision(rev.id);
    },
    [dbRevisions, deleteRevision],
  );

  const handleRevert = useCallback(() => {
    setForm(initialFormRef.current);
    setStatus(tw("reverted"));
    setStatusType("info");
  }, [tw]);

  const [generatingSummary, setRegeneratingSummary] = useState(false);

  const handleGenerateSummary = useCallback(async () => {
    const id = savedId.current ?? work?.id;
    if (!id) return;
    setRegeneratingSummary(true);
    try {
      const res = await fetch(`/api/works/${id}/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? tw("saveError"));
        return;
      }
      setStatus(tw("generateSummaryDone"));
      setStatusType("success");
    } catch {
      setError(tw("saveError"));
    } finally {
      setRegeneratingSummary(false);
    }
  }, [work?.id, tw, savedId]);

  const shellLabels = useMemo(
    () => ({
      delete: tw("delete"),
      deleting: tw("deleting"),
      deleteConfirm: tw("deleteConfirm"),
      deleteConfirmInput: tw("deleteConfirmInput"),
      deleteCancel: tw("deleteCancel"),
      preview: tw("preview"),
      saving: tw("saving"),
      saveDraft: tw("saveDraft"),
      update: tw("update"),
      publish: tw("publish"),
      revert: tw("revert"),
      revisionHistory: tw("revisionHistory"),
      restore: tw("restore"),
      retranslate: tw("retranslate"),
      retranslateAll: tw("retranslateAll"),
      retranslateDisabled: tw("retranslateDisabled"),
      generateSummary: tw("generateSummary"),
      generateSummaryDisabled: tw("generateSummaryDisabled"),
    }),
    [tw],
  );

  const retranslateOptions = useMemo(
    () => [
      { key: "subtitle", label: tw("subtitle") },
      { key: "description", label: tw("description") },
      { key: "role", label: tw("role") },
      { key: "content", label: tw("content") },
    ],
    [tw],
  );

  const suf = editorLang === "ko" ? "_ko" : "_en";
  const contentKey = editorLang === "ko" ? "content_ko" : "content_en";

  return (
    <AdminEditorShell
      backHref="/admin/works"
      backLabel={tw("backToWorks")}
      editorLang={editorLang}
      onEditorLangChange={handleEditorLangChange}
      isEdit={isEdit}
      isDirty={isDirty}
      saving={saving || translating}
      deleting={deleting}
      published={form.published}
      onDelete={handleDelete}
      deleteTargetName={work?.title}
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
      onDeleteRevision={handleDeleteRevision}
      onRetranslate={serviceStatus.translation ? handleRetranslate : undefined}
      retranslateOptions={retranslateOptions}
      retranslateDisabled={!serviceStatus.loading && !serviceStatus.translation}
      onGenerateSummary={isEdit || !!savedId.current ? (serviceStatus.aiSummary ? handleGenerateSummary : undefined) : undefined}
      aiSummaryDisabled={!serviceStatus.loading && !serviceStatus.aiSummary && (isEdit || !!savedId.current)}
      generatingSummary={generatingSummary}
      currentSnapshot={(() => {
        return {
          title: form.title,
          excerpt: form.description_ko || form.description_en || "",
          content: stripHtml(form.content_ko || form.content_en || ""),
          meta: {
            Category: form.category_ko || form.category_en || "",
            Year: form.year || "",
            Tech: form.tech?.join(", ") || "",
            Size: form.size || "",
            Role: form.role_ko || form.role_en || "",
          },
        };
      })()}
    >
      {/* Basic Info */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{tw("basicInfo")}</h2>
        <div className={es.field}>
          <label className={`${es.fieldLabel}${showErrors && !form.title.trim() ? ` ${es.fieldLabelError}` : ""}`}>{tw("title")}</label>
          <input
            className={`${es.titleInput}${showErrors && !form.title.trim() ? ` ${es.titleInputError}` : ""}`}
            type="text"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder={tw("titlePlaceholder")}
          />
        </div>

        <div className={styles.row3}>
          <div className={es.field}>
            <label className={es.fieldLabel}>{tw("number")}</label>
            <input
              className={es.fieldInput}
              type="text"
              value={form.number}
              onChange={(e) => updateField("number", e.target.value)}
              placeholder={tw("numberPlaceholder")}
            />
          </div>
          <div className={es.field}>
            <label className={`${es.fieldLabel}${showErrors && !form.year.trim() ? ` ${es.fieldLabelError}` : ""}`}>{tw("year")}</label>
            <input
              className={`${es.fieldInput}${showErrors && !form.year.trim() ? ` ${es.fieldInputError}` : ""}`}
              type="text"
              value={form.year}
              onChange={(e) => updateField("year", e.target.value)}
              placeholder={tw("yearPlaceholder")}
            />
          </div>
          <div className={es.field}>
            <label className={es.fieldLabel}>{tw("sortOrder")}</label>
            <Select
              value={String(form.sort_order)}
              options={
                totalWorks > 0
                  ? Array.from({ length: totalWorks }, (_, i) => ({
                      value: String(i + 1),
                      label: String(i + 1),
                    }))
                  : [{ value: String(form.sort_order), label: String(form.sort_order) }]
              }
              onChange={(v) => updateField("sort_order", parseInt(v) || 1)}
            />
          </div>
        </div>

        <div className={es.row}>
          <div className={es.field}>
            <label className={es.fieldLabel}>{tw("subtitle")}</label>
            <input
              className={es.fieldInput}
              type="text"
              value={form[`subtitle${suf}`]}
              onChange={(e) => updateField(`subtitle${suf}`, e.target.value)}
              placeholder={tw("subtitlePlaceholder")}
            />
          </div>
          <div className={es.field}>
            <label className={`${es.fieldLabel}${showErrors && !form.category_ko.trim() ? ` ${es.fieldLabelError}` : ""}`}>{tw("category")}</label>
            {worksCategories.length > 0 ? (
              <Select
                value={String(
                  worksCategories.findIndex(
                    (c) => c.ko === form.category_ko && c.en === form.category_en,
                  ),
                )}
                options={worksCategories.map((cat, i) => ({
                  value: String(i),
                  label: editorLang === "ko" ? cat.ko : cat.en,
                }))}
                onChange={(v) => {
                  const idx = parseInt(v);
                  const cat = worksCategories[idx];
                  if (cat) {
                    setForm((prev) => ({ ...prev, category_ko: cat.ko, category_en: cat.en }));
                    setStatus("");
                    setError("");
                  }
                }}
              />
            ) : (
              <input
                className={es.fieldInput}
                type="text"
                value={form[`category${suf}`]}
                onChange={(e) => updateField(`category${suf}`, e.target.value)}
                placeholder={tw("categoryPlaceholder")}
              />
            )}
          </div>
        </div>

        <div className={es.row}>
          <div className={es.field}>
            <label className={es.fieldLabel}>{tw("role")}</label>
            <input
              className={es.fieldInput}
              type="text"
              value={form[`role${suf}`]}
              onChange={(e) => updateField(`role${suf}`, e.target.value)}
              placeholder={tw("rolePlaceholder")}
            />
          </div>
          <div className={es.field}>
            <label className={es.fieldLabel}>{tw("cardSize")}</label>
            <Select
              value={form.size}
              options={SIZES.map((s) => ({ value: s, label: s }))}
              onChange={(v) => updateField("size", v as WorkFormData["size"])}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{tw("description")}</h2>
        <div className={es.field}>
          <textarea
            className={styles.fieldTextarea}
            value={form[`description${suf}`]}
            onChange={(e) => updateField(`description${suf}`, e.target.value)}
            placeholder={tw("descPlaceholder")}
            rows={3}
          />
        </div>
      </div>

      {/* Detail Content */}
      <div className={styles.section}>
        <div className={styles.editorHeader}>
          <div className={styles.editorHeaderLeft}>
            <h2 className={`${styles.sectionTitle}${showErrors && !form.content_ko.trim() && !form.content_en.trim() ? ` ${styles.sectionTitleError}` : ""}`} style={{ marginBottom: 0, paddingBottom: 0, borderBottom: "none" }}>
              {tw("content")}
            </h2>
            <button
              type="button"
              className={styles.templateBtn}
              onClick={handleInsertTemplate}
            >
              {tw("insertTemplate")}
            </button>
          </div>
          <EditorToggle
            value={form.content_type}
            onChange={handleContentTypeChange}
          />
        </div>

        <div className={styles.editorBlock}>
          {form.content_type === "markdown" ? (
            <MarkdownEditor
              key={editorLang}
              value={form[contentKey]}
              onChange={(v) => updateField(contentKey, v)}
              onImageUpload={handleContentImageUpload}
              compact
              editLabel={tw("editorLabel")}
              previewLabel={tw("previewLabel")}
            />
          ) : (
            <Editor
              key={editorLang}
              value={form[contentKey]}
              onChange={(v) => updateField(contentKey, v)}
              onImageUpload={handleContentImageUpload}
            />
          )}
        </div>
      </div>

      {/* Tech Stack */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{tw("techStack")}</h2>
        <div className={es.field}>
          <div className={styles.techInputRow}>
            <input
              className={es.fieldInput}
              type="text"
              value={tech.input}
              onChange={(e) => tech.setInput(e.target.value)}
              onKeyDown={tech.handleKeyDown}
              placeholder={tw("techPlaceholder")}
            />
            <button
              type="button"
              className={styles.techAddBtn}
              onClick={tech.add}
              disabled={!tech.input.trim()}
            >
              +
            </button>
          </div>
          {form.tech.length > 0 && (
            <div className={es.tags}>
              {form.tech.map((t) => (
                <span key={t} className={es.tag}>
                  {t}
                  <button type="button" className={es.tagRemove} onClick={() => tech.remove(t)}>
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Team Members */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{tw("teamMembers")}</h2>
        <div className={styles.memberForm}>
          <div className={styles.memberFormRow}>
            <input
              className={es.fieldInput}
              type="text"
              value={team.memberName}
              onChange={(e) => team.setMemberName(e.target.value)}
              placeholder={tw("memberName")}
            />
            <input
              className={es.fieldInput}
              type="text"
              value={team.memberRoleKo}
              onChange={(e) => team.setMemberRoleKo(e.target.value)}
              placeholder={tw("memberRole")}
            />
            <input
              className={es.fieldInput}
              type="text"
              value={team.memberRoleEn}
              onChange={(e) => team.setMemberRoleEn(e.target.value)}
              placeholder={tw("memberRoleEN")}
            />
          </div>
          <div className={styles.memberFormRow}>
            <input
              className={es.fieldInput}
              type="url"
              value={team.memberUrl}
              onChange={(e) => team.setMemberUrl(e.target.value)}
              placeholder={tw("memberUrl")}
            />
            <button
              type="button"
              className={styles.techAddBtn}
              onClick={team.addMember}
              disabled={!team.memberName.trim()}
            >
              +
            </button>
          </div>
        </div>
        {form.team_members.length > 0 && (
          <div className={styles.memberList}>
            {form.team_members.map((m, i) => (
              <div key={i} className={styles.memberItem}>
                <div className={styles.memberInfo}>
                  <span className={styles.memberItemName}>{m.name}</span>
                  <span className={styles.memberItemRole}>
                    {m.role_ko}{m.role_en ? ` / ${m.role_en}` : ""}
                  </span>
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className={styles.memberItemUrl}>
                      {m.url}
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  className={es.tagRemove}
                  onClick={() => team.removeMember(i)}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Images */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{tw("images")}</h2>

        <div className={es.field} style={{ marginBottom: "var(--spacing-lg)" }}>
          <label className={`${es.fieldLabel}${showErrors && !form.image.trim() ? ` ${es.fieldLabelError}` : ""}`}>{tw("mainImage")}</label>
          {form.image ? (
            <div className={styles.imagePreview}>
              <Image
                src={form.image}
                alt="Main"
                width={120}
                height={70}
                className={styles.imageThumb}
                unoptimized
              />
              <button
                type="button"
                className={styles.imageRemove}
                onClick={() => updateField("image", "")}
              >
                {tw("remove")}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
                <button
                  type="button"
                  className={es.uploadBtn}
                  onClick={() => handleImageUpload("image")}
                >
                  {tw("uploadImage")}
                </button>
                <button
                  type="button"
                  className={es.uploadBtn}
                  onClick={() => setShowCoverPicker((v) => !v)}
                >
                  {showCoverPicker ? tw("closePicker") : tw("chooseCover")}
                </button>
              </div>
              <input
                className={es.fieldInput}
                type="text"
                value={form.image}
                onChange={(e) => updateField("image", e.target.value)}
                placeholder={tw("pasteUrl")}
                style={{ marginTop: "var(--spacing-xs)", width: "100%" }}
              />
              {showCoverPicker && (
                <CoverImagePicker
                  onSelect={(url) => { updateField("image", url); setShowCoverPicker(false); }}
                  onClose={() => setShowCoverPicker(false)}
                  postContext={{ title: form.title, tags: form.tech, excerpt: form.description_ko || form.description_en }}
                />
              )}
            </div>
          )}
        </div>

        <div className={es.field}>
          <label className={es.fieldLabel}>{tw("gallery")}</label>
          <button
            type="button"
            className={es.uploadBtn}
            onClick={() => handleImageUpload("gallery")}
          >
            {tw("addGallery")}
          </button>
          {form.gallery.length > 0 && (
            <div className={styles.galleryGrid}>
              {form.gallery.map((src, i) => (
                <div key={i} className={styles.galleryItem}>
                  <Image
                    src={src}
                    alt={`Gallery ${i + 1}`}
                    fill
                    sizes="140px"
                    className={styles.galleryImg}
                    unoptimized
                  />
                  <button
                    type="button"
                    className={styles.galleryRemove}
                    onClick={() => removeGalleryItem(i)}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Links */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{tw("links")}</h2>
        <div className={es.row}>
          <div className={es.field}>
            <label className={es.fieldLabel}>{tw("liveUrl")}</label>
            <input
              className={es.fieldInput}
              type="url"
              value={form.live_url}
              onChange={(e) => updateField("live_url", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className={es.field}>
            <label className={es.fieldLabel}>{tw("githubUrl")}</label>
            <input
              className={es.fieldInput}
              type="url"
              value={form.github_url}
              onChange={(e) => updateField("github_url", e.target.value)}
              placeholder="https://github.com/..."
            />
          </div>
        </div>
      </div>
    </AdminEditorShell>
  );
}
