"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { marked } from "marked";
import { useLanguage } from "@/providers/LanguageProvider";
import AdminEditorShell, {
  adminEditorStyles as es,
} from "@/components/admin/AdminEditorShell";
import EditorToggle from "@/components/posts/EditorToggle";
import MarkdownEditor from "@/components/posts/MarkdownEditor";
import type { Work, WorkFormData, TeamMember } from "@/types/work";
import { useRevisions } from "@/hooks/useRevisions";
import { autoTranslate } from "@/utils/autoTranslate";
import Select from "@/components/ui/Select";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import styles from "./WorkEditor.module.css";

const RichTextEditor = dynamic(() => import("@/components/posts/RichTextEditor"), {
  ssr: false,
});

interface WorkEditorProps {
  work?: Work;
}

const SIZES = ["large", "small", "medium", "tall", "wide"] as const;

const TEMPLATE_KO = `## Overview

프로젝트 개요를 작성하세요.

## Background

프로젝트를 시작하게 된 배경과 동기를 설명하세요.

## Key Features

주요 기능을 나열하세요.

## Architecture

기술 아키텍처를 설명하세요.

## Challenges

기술적 도전과 문제를 설명하세요.

## Solutions

문제를 어떻게 해결했는지 설명하세요.

## Results

프로젝트의 결과와 성과를 설명하세요.

## Lessons Learned

프로젝트를 통해 배운 점을 정리하세요.`;

const TEMPLATE_EN = `## Overview

Describe what this project is about.

## Background

Explain the motivation behind this project.

## Key Features

List the main features.

## Architecture

Explain the technical architecture.

## Challenges

Describe technical challenges faced.

## Solutions

How you solved the challenges.

## Results

Project outcomes and impact.

## Lessons Learned

Key takeaways from this project.`;

function workToFormData(work: Work): WorkFormData {
  let contentKo = work.content_ko || "";
  let contentEn = work.content_en || "";

  if (!contentKo && (work.overview_ko || work.challenge_ko || work.solution_ko)) {
    const parts: string[] = [];
    if (work.overview_ko) {
      parts.push(`## Overview\n\n${work.overview_ko}`);
      if (work.overview_image) parts.push(`\n\n![Overview](${work.overview_image})`);
    }
    if (work.challenge_ko) {
      parts.push(`## Challenges\n\n${work.challenge_ko}`);
      if (work.challenge_image) parts.push(`\n\n![Challenges](${work.challenge_image})`);
    }
    if (work.solution_ko) {
      parts.push(`## Solutions\n\n${work.solution_ko}`);
      if (work.solution_image) parts.push(`\n\n![Solutions](${work.solution_image})`);
    }
    contentKo = parts.join("\n\n");
  }

  if (!contentEn && (work.overview_en || work.challenge_en || work.solution_en)) {
    const parts: string[] = [];
    if (work.overview_en) {
      parts.push(`## Overview\n\n${work.overview_en}`);
      if (work.overview_image) parts.push(`\n\n![Overview](${work.overview_image})`);
    }
    if (work.challenge_en) {
      parts.push(`## Challenges\n\n${work.challenge_en}`);
      if (work.challenge_image) parts.push(`\n\n![Challenges](${work.challenge_image})`);
    }
    if (work.solution_en) {
      parts.push(`## Solutions\n\n${work.solution_en}`);
      if (work.solution_image) parts.push(`\n\n![Solutions](${work.solution_image})`);
    }
    contentEn = parts.join("\n\n");
  }

  return {
    number: work.number,
    title: work.title,
    subtitle_ko: work.subtitle_ko,
    subtitle_en: work.subtitle_en,
    category_ko: work.category_ko,
    category_en: work.category_en,
    year: work.year,
    description_ko: work.description_ko,
    description_en: work.description_en,
    role_ko: work.role_ko,
    role_en: work.role_en,
    tech: work.tech,
    image: work.image,
    size: work.size,
    content_ko: contentKo,
    content_en: contentEn,
    content_type: work.content_type || "markdown",
    team_members: work.team_members ?? [],
    gallery: work.gallery,
    live_url: work.live_url,
    github_url: work.github_url,
    published: work.published,
    sort_order: work.sort_order,
  };
}

const defaultForm: WorkFormData = {
  number: "",
  title: "",
  subtitle_ko: "",
  subtitle_en: "",
  category_ko: "",
  category_en: "",
  year: new Date().getFullYear().toString(),
  description_ko: "",
  description_en: "",
  role_ko: "",
  role_en: "",
  tech: [],
  image: "",
  size: "medium",
  content_ko: "",
  content_en: "",
  content_type: "markdown",
  team_members: [],
  gallery: [],
  live_url: "",
  github_url: "",
  published: false,
  sort_order: 1,
};

export default function WorkEditor({ work }: WorkEditorProps) {
  const router = useRouter();
  const { tLang } = useLanguage();
  const isEdit = !!work;

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
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialFormRef.current),
    [form],
  );

  const { revisions: dbRevisions, saveRevision, loadRevisionSnapshot, deleteRevision } = useRevisions({
    entityType: "work",
    entityId: work?.id,
  });

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

  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [techInput, setTechInput] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRoleKo, setMemberRoleKo] = useState("");
  const [memberRoleEn, setMemberRoleEn] = useState("");
  const [memberUrl, setMemberUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success">("info");
  const [error, setError] = useState("");

  /* ── Auto-save (5s debounce, new + edit) ── */
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoSaveSkip = useRef(true);
  const autoSaveBusy = useRef(false);
  const savedId = useRef<string | undefined>(work?.id);
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
          ? `/api/works/${savedId.current}`
          : "/api/works";
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
          saveRevision({ ...form }, form.title || "(untitled)");
          setStatus(tw("autoSaved"));
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
    <K extends keyof WorkFormData>(key: K, value: WorkFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setStatus("");
      setError("");
    },
    [],
  );

  const addTech = useCallback(() => {
    const tag = techInput.trim().replace(/,/g, "");
    if (tag && !form.tech.includes(tag)) {
      updateField("tech", [...form.tech, tag]);
    }
    setTechInput("");
  }, [techInput, form.tech, updateField]);

  const handleTechKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTech();
      }
    },
    [addTech],
  );

  const removeTech = useCallback(
    (tag: string) => {
      updateField("tech", form.tech.filter((t) => t !== tag));
    },
    [form.tech, updateField],
  );

  const TRANSLATABLE_FIELDS = ["subtitle", "category", "description", "role", "content"] as const;

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
    [form, tLang],
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
    [form, translating, translateFields],
  );

  const handleRetranslate = useCallback(
    async (fieldKeys?: string[]) => {
      if (translating) return;
      await translateFields(fieldKeys ?? TRANSLATABLE_FIELDS.slice(), editorLang);
    },
    [translating, editorLang, translateFields],
  );

  const addMember = useCallback(() => {
    if (!memberName.trim()) return;
    const member: TeamMember = {
      name: memberName.trim(),
      role_ko: memberRoleKo.trim(),
      role_en: memberRoleEn.trim(),
      url: memberUrl.trim() || undefined,
    };
    updateField("team_members", [...form.team_members, member]);
    setMemberName("");
    setMemberRoleKo("");
    setMemberRoleEn("");
    setMemberUrl("");
  }, [memberName, memberRoleKo, memberRoleEn, memberUrl, form.team_members, updateField]);

  const removeMember = useCallback(
    (index: number) => {
      updateField("team_members", form.team_members.filter((_, i) => i !== index));
    },
    [form.team_members, updateField],
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
    const fd = new FormData();
    fd.append("file", file);
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

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
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
        if (missing.length > 0) {
          setError(`${tw("requiredFields")}: ${missing.join(", ")}`);
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

        router.push("/admin/works");
      } catch {
        setError(tw("networkError"));
      } finally {
        setSaving(false);
      }
    },
    [form, isEdit, work, router, tw],
  );

  const handleDelete = useCallback(async () => {
    if (!work) return;
    if (!confirm(`"${work.title}"${tw("deleteConfirm")}`)) return;

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
        content: s.content_ko || s.content_en || "",
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

  const shellLabels = useMemo(
    () => ({
      delete: tw("delete"),
      deleting: tw("deleting"),
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
    }),
    [tw],
  );

  const retranslateOptions = useMemo(
    () => [
      { key: "subtitle", label: tw("subtitle") },
      { key: "category", label: tw("category") },
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
      onRetranslate={handleRetranslate}
      retranslateOptions={retranslateOptions}
      currentSnapshot={{
        title: form.title,
        excerpt: form.description_ko || form.description_en || "",
        content: form.content_ko || form.content_en || "",
        meta: {
          Category: form.category_ko || form.category_en || "",
          Year: form.year || "",
          Tech: form.tech?.join(", ") || "",
          Size: form.size || "",
          Role: form.role_ko || form.role_en || "",
        },
      }}
    >
      {/* Basic Info */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{tw("basicInfo")}</h2>
        <div className={es.field}>
          <label className={es.fieldLabel}>{tw("title")}</label>
          <input
            className={es.titleInput}
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
            <label className={es.fieldLabel}>{tw("year")}</label>
            <input
              className={es.fieldInput}
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
            <label className={es.fieldLabel}>{tw("category")}</label>
            <input
              className={es.fieldInput}
              type="text"
              value={form[`category${suf}`]}
              onChange={(e) => updateField(`category${suf}`, e.target.value)}
              placeholder={tw("categoryPlaceholder")}
            />
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
            <h2 className={styles.sectionTitle} style={{ marginBottom: 0, paddingBottom: 0, borderBottom: "none" }}>
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
            <RichTextEditor
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
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={handleTechKeyDown}
              placeholder={tw("techPlaceholder")}
            />
            <button
              type="button"
              className={styles.techAddBtn}
              onClick={addTech}
              disabled={!techInput.trim()}
            >
              +
            </button>
          </div>
          {form.tech.length > 0 && (
            <div className={es.tags}>
              {form.tech.map((t) => (
                <span key={t} className={es.tag}>
                  {t}
                  <button type="button" className={es.tagRemove} onClick={() => removeTech(t)}>
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
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder={tw("memberName")}
            />
            <input
              className={es.fieldInput}
              type="text"
              value={memberRoleKo}
              onChange={(e) => setMemberRoleKo(e.target.value)}
              placeholder={tw("memberRole")}
            />
            <input
              className={es.fieldInput}
              type="text"
              value={memberRoleEn}
              onChange={(e) => setMemberRoleEn(e.target.value)}
              placeholder={tw("memberRoleEN")}
            />
          </div>
          <div className={styles.memberFormRow}>
            <input
              className={es.fieldInput}
              type="url"
              value={memberUrl}
              onChange={(e) => setMemberUrl(e.target.value)}
              placeholder={tw("memberUrl")}
            />
            <button
              type="button"
              className={styles.techAddBtn}
              onClick={addMember}
              disabled={!memberName.trim()}
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
                  onClick={() => removeMember(i)}
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
          <label className={es.fieldLabel}>{tw("mainImage")}</label>
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
