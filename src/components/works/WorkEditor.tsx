"use client";

import { useState, useCallback, useMemo } from "react";
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
  sort_order: 0,
};

export default function WorkEditor({ work }: WorkEditorProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const isEdit = !!work;

  const tw = (key: string) => t(`admin.works.editor.${key}`);

  const [editorLang, setEditorLang] = useState<"ko" | "en">("ko");

  const [form, setForm] = useState<WorkFormData>(() => {
    if (!work) return defaultForm;
    return workToFormData(work);
  });

  const [techInput, setTechInput] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRoleKo, setMemberRoleKo] = useState("");
  const [memberRoleEn, setMemberRoleEn] = useState("");
  const [memberUrl, setMemberUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

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
      setSaving(true);
      setError("");
      setStatus("");

      const body = {
        ...form,
        published: publish !== undefined ? publish : form.published,
      };

      try {
        const url = isEdit ? `/api/works/${work!.id}` : "/api/works";
        const method = isEdit ? "PATCH" : "POST";

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

  const shellLabels = useMemo(
    () => ({
      delete: tw("delete"),
      deleting: tw("deleting"),
      preview: tw("preview"),
      saving: tw("saving"),
      saveDraft: tw("saveDraft"),
      update: tw("update"),
      publish: tw("publish"),
    }),
    [tw],
  );

  const suf = editorLang === "ko" ? "_ko" : "_en";
  const contentKey = editorLang === "ko" ? "content_ko" : "content_en";

  return (
    <AdminEditorShell
      backHref="/admin/works"
      backLabel={tw("backToWorks")}
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
            <input
              className={es.fieldInput}
              type="number"
              value={form.sort_order}
              onChange={(e) => updateField("sort_order", parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className={es.row}>
          <div className={es.field}>
            <label className={es.fieldLabel}>
              {editorLang === "en" ? tw("subtitleEN") : tw("subtitle")}
            </label>
            <input
              className={es.fieldInput}
              type="text"
              value={form[`subtitle${suf}`]}
              onChange={(e) => updateField(`subtitle${suf}`, e.target.value)}
              placeholder={editorLang === "ko" ? tw("subtitlePlaceholder") : tw("subtitlePlaceholderEN")}
            />
          </div>
          <div className={es.field}>
            <label className={es.fieldLabel}>
              {editorLang === "en" ? tw("categoryEN") : tw("category")}
            </label>
            <input
              className={es.fieldInput}
              type="text"
              value={form[`category${suf}`]}
              onChange={(e) => updateField(`category${suf}`, e.target.value)}
              placeholder={editorLang === "ko" ? tw("categoryPlaceholder") : tw("categoryPlaceholderEN")}
            />
          </div>
        </div>

        <div className={es.row}>
          <div className={es.field}>
            <label className={es.fieldLabel}>
              {editorLang === "en" ? tw("roleEN") : tw("role")}
            </label>
            <input
              className={es.fieldInput}
              type="text"
              value={form[`role${suf}`]}
              onChange={(e) => updateField(`role${suf}`, e.target.value)}
              placeholder={editorLang === "ko" ? tw("rolePlaceholder") : tw("rolePlaceholderEN")}
            />
          </div>
          <div className={es.field}>
            <label className={es.fieldLabel}>{tw("cardSize")}</label>
            <select
              className={styles.fieldSelect}
              value={form.size}
              onChange={(e) => updateField("size", e.target.value as WorkFormData["size"])}
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {editorLang === "en" ? tw("descriptionEN") : tw("description")}
        </h2>
        <div className={es.field}>
          <textarea
            className={styles.fieldTextarea}
            value={form[`description${suf}`]}
            onChange={(e) => updateField(`description${suf}`, e.target.value)}
            placeholder={editorLang === "ko" ? tw("descPlaceholder") : tw("descPlaceholderEN")}
            rows={3}
          />
        </div>
      </div>

      {/* Detail Content */}
      <div className={styles.section}>
        <div className={styles.editorHeader}>
          <div className={styles.editorHeaderLeft}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 0, paddingBottom: 0, borderBottom: "none" }}>
              {editorLang === "en" ? tw("contentEN") : tw("content")}
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
              <button
                type="button"
                className={es.uploadBtn}
                onClick={() => handleImageUpload("image")}
              >
                {tw("uploadImage")}
              </button>
              <input
                className={es.fieldInput}
                type="text"
                value={form.image}
                onChange={(e) => updateField("image", e.target.value)}
                placeholder={tw("pasteUrl")}
                style={{ marginTop: "var(--spacing-xs)", width: "100%" }}
              />
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
