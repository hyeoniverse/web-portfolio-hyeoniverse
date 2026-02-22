"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { siteConfig } from "@/config/site.config";
import type { SiteConfigData } from "@/config/site.config";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./Settings.module.css";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export default function SettingsPage() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<SiteConfigData>(
    structuredClone(siteConfig) as unknown as SiteConfigData
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.config && Object.keys(data.config).length > 0) {
          setConfig((prev) => deepMerge(prev, data.config));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage(t("admin.settings.saveSuccess"));
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage(t("admin.settings.saveError"));
    } finally {
      setSaving(false);
    }
  }, [config, t]);

  const update = <S extends keyof SiteConfigData>(
    section: S,
    key: keyof SiteConfigData[S],
    value: SiteConfigData[S][keyof SiteConfigData[S]]
  ) => {
    setConfig((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const updateSocial = (key: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      social: { ...prev.social, [key]: value },
    }));
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>{t("admin.settings.loading")}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("admin.settings.title")}</h1>
        <div className={styles.headerRight}>
          {message && (
            <span
              className={`${styles.message} ${message === t("admin.settings.saveError") ? styles.messageError : styles.messageSuccess}`}
            >
              {message}
            </span>
          )}
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t("admin.settings.saving") : t("admin.settings.save")}
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* ── Personal ── */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t("admin.settings.personal")}</h2>
          <div className={styles.fields}>
            <Field label={t("admin.settings.name")} value={config.personal.name} onChange={(v) => update("personal", "name", v)} />
            <Field label={t("admin.settings.nickname")} value={config.personal.nickname} onChange={(v) => update("personal", "nickname", v)} />
            <Field label={t("admin.settings.role")} value={config.personal.role} onChange={(v) => update("personal", "role", v)} />
            <Field label={t("admin.settings.location")} value={config.personal.location} onChange={(v) => update("personal", "location", v)} />
            <Field label={t("admin.settings.status")} value={config.personal.status} onChange={(v) => update("personal", "status", v)} />
          </div>
        </section>

        {/* ── Brand ── */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t("admin.settings.brand")}</h2>
          <div className={styles.fields}>
            <Field label={t("admin.settings.brandName")} value={config.brand.name} onChange={(v) => update("brand", "name", v)} />
            <Field
              label={t("admin.settings.splitName")}
              value={config.brand.splitName.join(", ")}
              onChange={(v) =>
                update("brand", "splitName", v.split(",").map((s) => s.trim()) as string[] & SiteConfigData["brand"]["splitName"])
              }
            />
            <Field label={t("admin.settings.tagline")} value={config.brand.tagline} onChange={(v) => update("brand", "tagline", v)} />
            <LogoUpload
              label={t("admin.settings.logoShort")}
              url={config.brand.logoShortUrl}
              uploadLabel={t("admin.settings.uploadLogo")}
              removeLabel={t("admin.settings.removeLogo")}
              onUploaded={(url) => update("brand", "logoShortUrl", url)}
              onRemove={() => update("brand", "logoShortUrl", "")}
            />
            <LogoUpload
              label={t("admin.settings.logoFull")}
              url={config.brand.logoFullUrl}
              uploadLabel={t("admin.settings.uploadLogo")}
              removeLabel={t("admin.settings.removeLogo")}
              onUploaded={(url) => update("brand", "logoFullUrl", url)}
              onRemove={() => update("brand", "logoFullUrl", "")}
            />
          </div>
        </section>

        {/* ── Theme Colors ── */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t("admin.settings.themeColors")}</h2>
          <div className={styles.fields}>
            <ColorField label={t("admin.settings.accentColor")} value={config.theme.accentColor} onChange={(v) => update("theme", "accentColor", v)} />
            <ColorField label={t("admin.settings.lightBg")} value={config.theme.lightBg} onChange={(v) => update("theme", "lightBg", v)} />
            <ColorField label={t("admin.settings.lightText")} value={config.theme.lightText} onChange={(v) => update("theme", "lightText", v)} />
            <ColorField label={t("admin.settings.darkBg")} value={config.theme.darkBg} onChange={(v) => update("theme", "darkBg", v)} />
            <ColorField label={t("admin.settings.darkText")} value={config.theme.darkText} onChange={(v) => update("theme", "darkText", v)} />
          </div>
        </section>

        {/* ── Contact & Social ── */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t("admin.settings.contactSocial")}</h2>
          <div className={styles.fields}>
            <Field label={t("admin.settings.email")} value={config.contact.email} onChange={(v) => update("contact", "email", v)} />
            <Field label={t("admin.settings.github")} value={config.social.github ?? ""} onChange={(v) => updateSocial("github", v)} />
            <Field label={t("admin.settings.linkedin")} value={config.social.linkedin ?? ""} onChange={(v) => updateSocial("linkedin", v)} />
            <Field label={t("admin.settings.blog")} value={config.social.blog ?? ""} onChange={(v) => updateSocial("blog", v)} />
          </div>
        </section>

        {/* ── SEO / Metadata ── */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t("admin.settings.seoMetadata")}</h2>
          <div className={styles.fields}>
            <Field label={t("admin.settings.siteTitle")} value={config.metadata.title} onChange={(v) => update("metadata", "title", v)} />
            <Field label={t("admin.settings.description")} value={config.metadata.description} onChange={(v) => update("metadata", "description", v)} multiline />
            <Field label={t("admin.settings.keywords")} value={config.metadata.keywords} onChange={(v) => update("metadata", "keywords", v)} />
            <Field label={t("admin.settings.author")} value={config.metadata.author} onChange={(v) => update("metadata", "author", v)} />
          </div>
        </section>

        {/* ── Site Content ── */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t("admin.settings.siteContent")}</h2>
          <div className={styles.fields}>
            <Field
              label={t("admin.settings.heroHeadline")}
              value={config.hero.headline.join("\n")}
              onChange={(v) => update("hero", "headline", v.split("\n") as string[] & SiteConfigData["hero"]["headline"])}
              multiline
            />
            <Field
              label={t("admin.settings.heroSubtext")}
              value={config.hero.subtext.join("\n")}
              onChange={(v) => update("hero", "subtext", v.split("\n") as string[] & SiteConfigData["hero"]["subtext"])}
              multiline
            />
            <Field label={t("admin.settings.ctaLabel")} value={config.cta.label} onChange={(v) => update("cta", "label", v)} />
            <Field
              label={t("admin.settings.ctaTitle")}
              value={config.cta.title.join("\n")}
              onChange={(v) => update("cta", "title", v.split("\n") as string[] & SiteConfigData["cta"]["title"])}
              multiline
            />
            <Field label={t("admin.settings.ctaButtonText")} value={config.cta.buttonText} onChange={(v) => update("cta", "buttonText", v)} />
            <Field label={t("admin.settings.footerCopyright")} value={config.footer.copyright} onChange={(v) => update("footer", "copyright", v)} />
            <Field label={t("admin.settings.loadingDisplayName")} value={config.loading.displayName} onChange={(v) => update("loading", "displayName", v)} />
          </div>
        </section>

        {/* ── Page Options ── */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t("admin.settings.pageOptions")}</h2>
          <div className={styles.fields}>
            <Toggle label={t("admin.settings.worksInfiniteScroll")} checked={config.works.infiniteScroll} onChange={(v) => update("works", "infiniteScroll", v)} />
            <Toggle label={t("admin.settings.aboutInfiniteScroll")} checked={config.about.infiniteScroll} onChange={(v) => update("about", "infiniteScroll", v)} />
            <Toggle label={t("admin.settings.bunnyCollisionSound")} checked={config.profile.bunnyCollisionSound} onChange={(v) => update("profile", "bunnyCollisionSound", v)} />
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>{t("admin.settings.designConceptTransition")}</label>
              <select
                className={styles.fieldSelect}
                value={config.about.designConceptTransition}
                onChange={(e) =>
                  update("about", "designConceptTransition", e.target.value as SiteConfigData["about"]["designConceptTransition"])
                }
              >
                <option value="strip">Strip (marquee)</option>
                <option value="stack">Stack (slide-out)</option>
              </select>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className={styles.fieldRow}>
      <label className={styles.fieldLabel}>{label}</label>
      {multiline ? (
        <textarea
          className={styles.fieldTextarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <input
          className={styles.fieldInput}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={styles.fieldRow}>
      <label className={styles.fieldLabel}>{label}</label>
      <button
        type="button"
        className={`${styles.toggle} ${checked ? styles.toggleOn : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={styles.fieldRow}>
      <label className={styles.fieldLabel}>{label}</label>
      <div className={styles.colorField}>
        <input
          type="color"
          className={styles.colorPicker}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className={styles.colorText}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
        />
      </div>
    </div>
  );
}

function LogoUpload({
  label,
  url,
  uploadLabel,
  removeLabel,
  onUploaded,
  onRemove,
}: {
  label: string;
  url: string;
  uploadLabel: string;
  removeLabel: string;
  onUploaded: (url: string) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "logos");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onUploaded(data.url);
    } catch {
      // silent fail
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.fieldRow}>
      <label className={styles.fieldLabel}>{label}</label>
      <div className={styles.logoUpload}>
        {url && (
          <div className={styles.logoPreview}>
            <Image src={url} alt="Logo" width={80} height={32} unoptimized className={styles.logoPreviewImage} />
          </div>
        )}
        <div className={styles.logoActions}>
          <button
            type="button"
            className={styles.logoBtn}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "..." : uploadLabel}
          </button>
          {url && (
            <button type="button" className={styles.logoBtnRemove} onClick={onRemove}>
              {removeLabel}
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

/* ── Deep merge ── */
/* eslint-disable @typescript-eslint/no-explicit-any */
function deepMerge<T extends Record<string, any>>(
  target: T,
  source: DeepPartial<T>
): T {
  const result = { ...target } as any;
  for (const key of Object.keys(source)) {
    const val = (source as any)[key];
    if (val === undefined || val === null) continue;
    if (
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], val);
    } else {
      result[key] = val;
    }
  }
  return result;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
