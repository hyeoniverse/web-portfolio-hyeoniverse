"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLenis } from "@/providers/LenisProvider";
import LanguageToggle from "@/components/ui/LanguageToggle";
import type { Work, WorkFormData } from "@/types/work";
import styles from "./WorkEditor.module.css";

interface WorkEditorProps {
  work?: Work;
}

const SIZES = ["large", "small", "medium", "tall", "wide"] as const;

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
  overview_ko: "",
  overview_en: "",
  challenge_ko: "",
  challenge_en: "",
  solution_ko: "",
  solution_en: "",
  gallery: [],
  live_url: "",
  github_url: "",
  published: false,
  sort_order: 0,
};

export default function WorkEditor({ work }: WorkEditorProps) {
  const router = useRouter();
  const { setInfinite, lenis } = useLenis();
  const isEdit = !!work;

  useEffect(() => {
    setInfinite(false);
    window.scrollTo(0, 0);
    if (lenis) lenis.scrollTo(0, { immediate: true });
    return () => { setInfinite(true); };
  }, [setInfinite, lenis]);

  const [editorLang, setEditorLang] = useState<"ko" | "en">("ko");

  const [form, setForm] = useState<WorkFormData>(() => {
    if (!work) return defaultForm;
    const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = work;
    return rest;
  });

  const [techInput, setTechInput] = useState("");
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

  const handleTechKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const tag = techInput.trim().replace(/,/g, "");
        if (tag && !form.tech.includes(tag)) {
          updateField("tech", [...form.tech, tag]);
        }
        setTechInput("");
      }
    },
    [techInput, form.tech, updateField],
  );

  const removeTech = useCallback(
    (tag: string) => {
      updateField("tech", form.tech.filter((t) => t !== tag));
    },
    [form.tech, updateField],
  );

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
          setError(data.error ?? "Failed to save");
          return;
        }

        router.push("/admin/works");
      } catch {
        setError("Network error");
      } finally {
        setSaving(false);
      }
    },
    [form, isEdit, work, router],
  );

  const handleDelete = useCallback(async () => {
    if (!work) return;
    if (!confirm(`"${work.title}" 을(를) 삭제하시겠습니까?`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/works/${work.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/admin/works");
    } catch {
      setError("삭제 실패");
      setDeleting(false);
    }
  }, [work, router]);

  // Language-aware field suffix
  const suf = editorLang === "ko" ? "_ko" : "_en";

  return (
    <div className={styles.container}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <Link href="/admin/works" className={styles.backLink}>
            &larr; Back to Works
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

      {/* Basic Info */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Basic Info</h2>
        <input
          className={styles.titleInput}
          type="text"
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="Work Title"
        />

        <div className={styles.row3}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Number</label>
            <input
              className={styles.fieldInput}
              type="text"
              value={form.number}
              onChange={(e) => updateField("number", e.target.value)}
              placeholder="01"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Year</label>
            <input
              className={styles.fieldInput}
              type="text"
              value={form.year}
              onChange={(e) => updateField("year", e.target.value)}
              placeholder="2024"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Sort Order</label>
            <input
              className={styles.fieldInput}
              type="number"
              value={form.sort_order}
              onChange={(e) => updateField("sort_order", parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Subtitle {editorLang === "en" && "(EN)"}
            </label>
            <input
              className={styles.fieldInput}
              type="text"
              value={form[`subtitle${suf}`]}
              onChange={(e) => updateField(`subtitle${suf}`, e.target.value)}
              placeholder={editorLang === "ko" ? "부제목" : "Subtitle (EN)"}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Category {editorLang === "en" && "(EN)"}
            </label>
            <input
              className={styles.fieldInput}
              type="text"
              value={form[`category${suf}`]}
              onChange={(e) => updateField(`category${suf}`, e.target.value)}
              placeholder={editorLang === "ko" ? "카테고리" : "Category (EN)"}
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Role {editorLang === "en" && "(EN)"}
            </label>
            <input
              className={styles.fieldInput}
              type="text"
              value={form[`role${suf}`]}
              onChange={(e) => updateField(`role${suf}`, e.target.value)}
              placeholder={editorLang === "ko" ? "역할" : "Role (EN)"}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Card Size</label>
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
          Description {editorLang === "en" && "(EN)"}
        </h2>
        <div className={styles.field}>
          <textarea
            className={styles.fieldTextarea}
            value={form[`description${suf}`]}
            onChange={(e) => updateField(`description${suf}`, e.target.value)}
            placeholder={editorLang === "ko" ? "프로젝트 설명..." : "Description (EN)..."}
            rows={3}
          />
        </div>
      </div>

      {/* Detail Content */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Detail Content {editorLang === "en" && "(EN)"}
        </h2>
        <div className={styles.field} style={{ marginBottom: "var(--spacing-lg)" }}>
          <label className={styles.fieldLabel}>Overview</label>
          <textarea
            className={styles.fieldTextarea}
            value={form[`overview${suf}`]}
            onChange={(e) => updateField(`overview${suf}`, e.target.value)}
            placeholder={editorLang === "ko" ? "프로젝트 개요..." : "Overview (EN)..."}
            rows={4}
          />
        </div>
        <div className={styles.field} style={{ marginBottom: "var(--spacing-lg)" }}>
          <label className={styles.fieldLabel}>Challenge</label>
          <textarea
            className={styles.fieldTextarea}
            value={form[`challenge${suf}`]}
            onChange={(e) => updateField(`challenge${suf}`, e.target.value)}
            placeholder={editorLang === "ko" ? "도전 과제..." : "Challenge (EN)..."}
            rows={4}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Solution</label>
          <textarea
            className={styles.fieldTextarea}
            value={form[`solution${suf}`]}
            onChange={(e) => updateField(`solution${suf}`, e.target.value)}
            placeholder={editorLang === "ko" ? "해결 방법..." : "Solution (EN)..."}
            rows={4}
          />
        </div>
      </div>

      {/* Tech Stack */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Tech Stack</h2>
        <div className={styles.field}>
          <input
            className={styles.fieldInput}
            type="text"
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            onKeyDown={handleTechKeyDown}
            placeholder="Type a tech and press Enter"
          />
          {form.tech.length > 0 && (
            <div className={styles.tags}>
              {form.tech.map((t) => (
                <span key={t} className={styles.tag}>
                  {t}
                  <button type="button" className={styles.tagRemove} onClick={() => removeTech(t)}>
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Images */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Images</h2>

        <div className={styles.field} style={{ marginBottom: "var(--spacing-lg)" }}>
          <label className={styles.fieldLabel}>Main Image</label>
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
                Remove
              </button>
            </div>
          ) : (
            <div>
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => handleImageUpload("image")}
              >
                Upload Image
              </button>
              <input
                className={styles.fieldInput}
                type="text"
                value={form.image}
                onChange={(e) => updateField("image", e.target.value)}
                placeholder="Or paste image URL"
                style={{ marginTop: "var(--spacing-xs)", width: "100%" }}
              />
            </div>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Gallery</label>
          <button
            type="button"
            className={styles.uploadBtn}
            onClick={() => handleImageUpload("gallery")}
          >
            Add Gallery Images
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
        <h2 className={styles.sectionTitle}>Links</h2>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Live URL</label>
            <input
              className={styles.fieldInput}
              type="url"
              value={form.live_url}
              onChange={(e) => updateField("live_url", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>GitHub URL</label>
            <input
              className={styles.fieldInput}
              type="url"
              value={form.github_url}
              onChange={(e) => updateField("github_url", e.target.value)}
              placeholder="https://github.com/..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
