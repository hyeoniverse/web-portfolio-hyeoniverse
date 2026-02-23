"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useLenis } from "@/providers/LenisProvider";
import { siteConfig } from "@/config/site.config";
import type { SiteConfigData } from "@/config/site.config";
import { useLanguage } from "@/providers/LanguageProvider";
import { SkeletonLine } from "@/components/ui/Skeleton";
import Toggle from "@/components/ui/Toggle";
import styles from "./Settings.module.css";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

const TABS = [
  { id: "general", label: "General" },
  { id: "content", label: "Content" },
  { id: "appearance", label: "Appearance" },
  { id: "services", label: "Services" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const THEME_PRESETS: { name: string; theme: SiteConfigData["theme"] }[] = [
  {
    name: "Default",
    theme: { accentColor: "#d40063", lightBg: "#f5f5f0", lightText: "#1a1a1a", darkBg: "#0a0a0a", darkText: "#f5f5f0" },
  },
  {
    name: "Ocean",
    theme: { accentColor: "#0077b6", lightBg: "#f0f5f8", lightText: "#1a1a2e", darkBg: "#0b1622", darkText: "#e8f0f8" },
  },
  {
    name: "Forest",
    theme: { accentColor: "#2d8a4e", lightBg: "#f2f5f0", lightText: "#1a2418", darkBg: "#0c1a0e", darkText: "#e6f0e8" },
  },
  {
    name: "Sunset",
    theme: { accentColor: "#e05a2b", lightBg: "#faf5f0", lightText: "#2a1a10", darkBg: "#1a0e08", darkText: "#f5ebe0" },
  },
  {
    name: "Violet",
    theme: { accentColor: "#7c3aed", lightBg: "#f5f2fa", lightText: "#1a1528", darkBg: "#0e0a1a", darkText: "#ede8f5" },
  },
  {
    name: "Mono",
    theme: { accentColor: "#555555", lightBg: "#f5f5f5", lightText: "#1a1a1a", darkBg: "#0a0a0a", darkText: "#e5e5e5" },
  },
  {
    name: "Rose",
    theme: { accentColor: "#e11d48", lightBg: "#fdf2f4", lightText: "#1c1017", darkBg: "#120a0c", darkText: "#f5e6ea" },
  },
  {
    name: "Amber",
    theme: { accentColor: "#d97706", lightBg: "#faf6ee", lightText: "#221a0a", darkBg: "#141008", darkText: "#f5eede" },
  },
];

export default function SettingsPage() {
  const { t } = useLanguage();
  const { setInfinite, lenis, stop, start } = useLenis();
  const [config, setConfig] = useState<SiteConfigData>(
    structuredClone(siteConfig) as unknown as SiteConfigData
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("general");

  useEffect(() => {
    stop();
    setInfinite(false);
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      start();
    }, 50);
    return () => { clearTimeout(timer); setInfinite(true); };
  }, [setInfinite, lenis, stop, start]);

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
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const detail = body?.error ?? `HTTP ${res.status}`;
        console.error("[Settings] Save failed:", detail);
        throw new Error(detail);
      }
      setMessage(t("admin.settings.saveSuccess"));
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setMessage(`${t("admin.settings.saveError")}${msg ? ` (${msg})` : ""}`);
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
        <div className={styles.header}>
          <SkeletonLine width={120} height={32} />
          <SkeletonLine width={80} height={36} />
        </div>
        <div className={styles.layout}>
          <div className={`${styles.sideNav} ${styles.skeletonNav}`}>
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonLine key={i} width={120} height={36} />
            ))}
          </div>
          <div className={styles.panel}>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className={styles.skeletonSection}>
                <SkeletonLine width={140} height={16} />
                <div className={styles.skeletonFields}>
                  <SkeletonLine width="100%" height={36} />
                  <SkeletonLine width="100%" height={36} />
                  <SkeletonLine width="100%" height={36} />
                  <SkeletonLine width="60%" height={36} />
                </div>
              </div>
            ))}
          </div>
        </div>
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
            type="button"
            className={styles.resetBtn}
            onClick={() => setConfig(structuredClone(siteConfig) as unknown as SiteConfigData)}
          >
            Reset
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t("admin.settings.saving") : t("admin.settings.save")}
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Side Nav ── */}
        <nav className={styles.sideNav}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.navItem} ${activeTab === tab.id ? styles.navItemActive : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ── Panel ── */}
        <div className={styles.panel}>
          {activeTab === "general" && (
            <>
              {/* Personal */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.personal")}</h2>
                <div className={styles.fields}>
                  <Field label={t("admin.settings.name")} value={config.personal.name} onChange={(v) => update("personal", "name", v)} />
                  <Field label={t("admin.settings.nickname")} value={config.personal.nickname} onChange={(v) => update("personal", "nickname", v)} />
                  <Field label={t("admin.settings.role")} value={config.personal.role} onChange={(v) => update("personal", "role", v)} />
                  <Field label={t("admin.settings.location")} value={config.personal.location} onChange={(v) => update("personal", "location", v)} />
                  <Field label={t("admin.settings.status")} value={config.personal.status} onChange={(v) => update("personal", "status", v)} />
                </div>
              </section>

              {/* Brand */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.brand")}</h2>
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

              {/* Contact & Social */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.contactSocial")}</h2>
                <div className={styles.fields}>
                  <Field label={t("admin.settings.email")} value={config.contact.email} onChange={(v) => update("contact", "email", v)} />
                  <Field label={t("admin.settings.github")} value={config.social.github ?? ""} onChange={(v) => updateSocial("github", v)} />
                  <Field label={t("admin.settings.linkedin")} value={config.social.linkedin ?? ""} onChange={(v) => updateSocial("linkedin", v)} />
                  <Field label={t("admin.settings.blog")} value={config.social.blog ?? ""} onChange={(v) => updateSocial("blog", v)} />
                </div>
              </section>

              {/* SEO / Metadata */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.seoMetadata")}</h2>
                <div className={styles.fields}>
                  <Field label={t("admin.settings.siteTitle")} value={config.metadata.title} onChange={(v) => update("metadata", "title", v)} />
                  <Field label={t("admin.settings.description")} value={config.metadata.description} onChange={(v) => update("metadata", "description", v)} multiline />
                  <Field label={t("admin.settings.keywords")} value={config.metadata.keywords} onChange={(v) => update("metadata", "keywords", v)} />
                  <Field label={t("admin.settings.author")} value={config.metadata.author} onChange={(v) => update("metadata", "author", v)} />
                </div>
              </section>

              {/* Post Categories */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Post Categories</h2>
                <div className={styles.fields}>
                  <CategoriesEditor
                    categories={config.posts?.categories ?? []}
                    onChange={(cats) => update("posts", "categories", cats as SiteConfigData["posts"]["categories"])}
                  />
                </div>
              </section>
            </>
          )}

          {activeTab === "content" && (
            <>
              {/* Hero */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Hero</h2>
                <div className={styles.fields}>
                  <div className={styles.fieldPair}>
                    <Field
                      label={`${t("admin.settings.heroHeadline")} (EN)`}
                      value={config.hero.headline.join("\n")}
                      onChange={(v) => update("hero", "headline", v.split("\n") as string[] & SiteConfigData["hero"]["headline"])}
                      multiline
                    />
                    <Field
                      label={`${t("admin.settings.heroHeadline")} (KO)`}
                      value={config.hero.headline_ko.join("\n")}
                      onChange={(v) => update("hero", "headline_ko", v.split("\n") as string[] & SiteConfigData["hero"]["headline_ko"])}
                      multiline
                    />
                  </div>
                  <div className={styles.fieldPair}>
                    <Field
                      label={`${t("admin.settings.heroSubtext")} (EN)`}
                      value={config.hero.subtext.join("\n")}
                      onChange={(v) => update("hero", "subtext", v.split("\n") as string[] & SiteConfigData["hero"]["subtext"])}
                      multiline
                    />
                    <Field
                      label={`${t("admin.settings.heroSubtext")} (KO)`}
                      value={config.hero.subtext_ko.join("\n")}
                      onChange={(v) => update("hero", "subtext_ko", v.split("\n") as string[] & SiteConfigData["hero"]["subtext_ko"])}
                      multiline
                    />
                  </div>
                  <div className={styles.fieldPair}>
                    <Field label="Scroll Label (EN)" value={config.hero.scrollLabel} onChange={(v) => update("hero", "scrollLabel", v)} />
                    <Field label="Scroll Label (KO)" value={config.hero.scrollLabel_ko} onChange={(v) => update("hero", "scrollLabel_ko", v)} />
                  </div>
                </div>
              </section>

              {/* Home About */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.homeAboutIntro")}</h2>
                <p className={styles.sectionHint}>{"{중괄호}"} 안의 텍스트가 하이라이트 처리됩니다</p>
                <div className={styles.fields}>
                  <div className={styles.fieldPair}>
                    <Field label="Intro (EN)" value={config.homeAbout.intro} onChange={(v) => update("homeAbout", "intro", v)} multiline />
                    <Field label="Intro (KO)" value={config.homeAbout.intro_ko} onChange={(v) => update("homeAbout", "intro_ko", v)} multiline />
                  </div>
                  <div className={styles.fieldPair}>
                    <Field label="Description (EN)" value={config.homeAbout.description} onChange={(v) => update("homeAbout", "description", v)} multiline />
                    <Field label="Description (KO)" value={config.homeAbout.description_ko} onChange={(v) => update("homeAbout", "description_ko", v)} multiline />
                  </div>
                </div>
              </section>

              {/* Services */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.servicesLabel")}</h2>
                <div className={styles.fields}>
                  <div className={styles.fieldPair}>
                    <Field label="Label (EN)" value={config.services.label} onChange={(v) => update("services", "label", v)} />
                    <Field label="Label (KO)" value={config.services.label_ko} onChange={(v) => update("services", "label_ko", v)} />
                  </div>
                </div>
                <ServiceItemsEditor
                  items={config.services.items}
                  onChange={(items) => update("services", "items", items as SiteConfigData["services"]["items"])}
                />
              </section>

              {/* Marquee */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.marqueeWords")}</h2>
                <div className={styles.fields}>
                  <div className={styles.fieldPair}>
                    <Field
                      label="Words (EN)"
                      value={config.marquee.words.join(", ")}
                      onChange={(v) => update("marquee", "words", v.split(",").map((s) => s.trim()) as string[] & SiteConfigData["marquee"]["words"])}
                    />
                    <Field
                      label="Words (KO)"
                      value={config.marquee.words_ko.join(", ")}
                      onChange={(v) => update("marquee", "words_ko", v.split(",").map((s) => s.trim()) as string[] & SiteConfigData["marquee"]["words_ko"])}
                    />
                  </div>
                </div>
              </section>

              {/* CTA & Footer */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>CTA &amp; Footer</h2>
                <div className={styles.fields}>
                  <div className={styles.fieldPair}>
                    <Field label={`${t("admin.settings.ctaLabel")} (EN)`} value={config.cta.label} onChange={(v) => update("cta", "label", v)} />
                    <Field label={`${t("admin.settings.ctaLabel")} (KO)`} value={config.cta.label_ko} onChange={(v) => update("cta", "label_ko", v)} />
                  </div>
                  <div className={styles.fieldPair}>
                    <Field
                      label={`${t("admin.settings.ctaTitle")} (EN)`}
                      value={config.cta.title.join("\n")}
                      onChange={(v) => update("cta", "title", v.split("\n") as string[] & SiteConfigData["cta"]["title"])}
                      multiline
                    />
                    <Field
                      label={`${t("admin.settings.ctaTitle")} (KO)`}
                      value={config.cta.title_ko.join("\n")}
                      onChange={(v) => update("cta", "title_ko", v.split("\n") as string[] & SiteConfigData["cta"]["title_ko"])}
                      multiline
                    />
                  </div>
                  <div className={styles.fieldPair}>
                    <Field label={`${t("admin.settings.ctaButtonText")} (EN)`} value={config.cta.buttonText} onChange={(v) => update("cta", "buttonText", v)} />
                    <Field label={`${t("admin.settings.ctaButtonText")} (KO)`} value={config.cta.buttonText_ko} onChange={(v) => update("cta", "buttonText_ko", v)} />
                  </div>
                  <div className={styles.fieldPair}>
                    <Field label={`${t("admin.settings.footerCopyright")} (EN)`} value={config.footer.copyright} onChange={(v) => update("footer", "copyright", v)} />
                    <Field label={`${t("admin.settings.footerCopyright")} (KO)`} value={config.footer.copyright_ko} onChange={(v) => update("footer", "copyright_ko", v)} />
                  </div>
                  <Field label={t("admin.settings.loadingDisplayName")} value={config.loading.displayName} onChange={(v) => update("loading", "displayName", v)} />
                </div>
              </section>

              {/* Works Intro */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.worksIntro")}</h2>
                <div className={styles.fields}>
                  <div className={styles.fieldPair}>
                    <Field label="Label (EN)" value={config.works.introLabel} onChange={(v) => update("works", "introLabel", v)} />
                    <Field label="Label (KO)" value={config.works.introLabel_ko} onChange={(v) => update("works", "introLabel_ko", v)} />
                  </div>
                  <div className={styles.fieldPair}>
                    <Field label="Title (EN)" value={config.works.introTitle} onChange={(v) => update("works", "introTitle", v)} />
                    <Field label="Title (KO)" value={config.works.introTitle_ko} onChange={(v) => update("works", "introTitle_ko", v)} />
                  </div>
                  <div className={styles.fieldPair}>
                    <Field label="Tagline (EN)" value={config.works.introTagline} onChange={(v) => update("works", "introTagline", v)} />
                    <Field label="Tagline (KO)" value={config.works.introTagline_ko} onChange={(v) => update("works", "introTagline_ko", v)} />
                  </div>
                  <div className={styles.fieldPair}>
                    <Field label="Description (EN)" value={config.works.introDesc} onChange={(v) => update("works", "introDesc", v)} multiline />
                    <Field label="Description (KO)" value={config.works.introDesc_ko} onChange={(v) => update("works", "introDesc_ko", v)} multiline />
                  </div>
                  <div className={styles.fieldPair}>
                    <Field label="Detail (EN)" value={config.works.introDetail} onChange={(v) => update("works", "introDetail", v)} multiline />
                    <Field label="Detail (KO)" value={config.works.introDetail_ko} onChange={(v) => update("works", "introDetail_ko", v)} multiline />
                  </div>
                  <div className={styles.fieldPair}>
                    <Field label="Quote (EN)" value={config.works.introQuote} onChange={(v) => update("works", "introQuote", v)} />
                    <Field label="Quote (KO)" value={config.works.introQuote_ko} onChange={(v) => update("works", "introQuote_ko", v)} />
                  </div>
                  <div className={styles.fieldPair}>
                    <Field label="Scope (EN)" value={config.works.introScope} onChange={(v) => update("works", "introScope", v)} />
                    <Field label="Scope (KO)" value={config.works.introScope_ko} onChange={(v) => update("works", "introScope_ko", v)} />
                  </div>
                </div>
              </section>

              {/* Works Stats */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.worksStats")}</h2>
                <div className={styles.fields}>
                  <div className={styles.fieldPair}>
                    <Field label="Projects Label (EN)" value={config.works.statsProjects} onChange={(v) => update("works", "statsProjects", v)} />
                    <Field label="Projects Label (KO)" value={config.works.statsProjects_ko} onChange={(v) => update("works", "statsProjects_ko", v)} />
                  </div>
                  <div className={styles.fieldPair}>
                    <Field label="Clients Label (EN)" value={config.works.statsClients} onChange={(v) => update("works", "statsClients", v)} />
                    <Field label="Clients Label (KO)" value={config.works.statsClients_ko} onChange={(v) => update("works", "statsClients_ko", v)} />
                  </div>
                </div>
              </section>

            </>
          )}

          {activeTab === "appearance" && (
            <>
              {/* Theme Presets */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Presets</h2>
                <div className={styles.presetGrid}>
                  {THEME_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      className={styles.presetCard}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          theme: { ...preset.theme },
                        }))
                      }
                    >
                      <div className={styles.presetSwatches}>
                        <span
                          className={styles.presetSwatch}
                          style={{ background: preset.theme.darkBg }}
                        />
                        <span
                          className={styles.presetSwatch}
                          style={{ background: preset.theme.accentColor }}
                        />
                        <span
                          className={styles.presetSwatch}
                          style={{ background: preset.theme.lightBg }}
                        />
                      </div>
                      <span className={styles.presetName}>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Theme Colors */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("admin.settings.themeColors")}</h2>
                <div className={styles.fields}>
                  <ColorField label={t("admin.settings.accentColor")} value={config.theme.accentColor} onChange={(v) => update("theme", "accentColor", v)} />
                  <ColorField label={t("admin.settings.lightBg")} value={config.theme.lightBg} onChange={(v) => update("theme", "lightBg", v)} />
                  <ColorField label={t("admin.settings.lightText")} value={config.theme.lightText} onChange={(v) => update("theme", "lightText", v)} />
                  <ColorField label={t("admin.settings.darkBg")} value={config.theme.darkBg} onChange={(v) => update("theme", "darkBg", v)} />
                  <ColorField label={t("admin.settings.darkText")} value={config.theme.darkText} onChange={(v) => update("theme", "darkText", v)} />
                </div>
              </section>


            </>
          )}

          {activeTab === "services" && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Services &amp; Integrations</h2>
              <div className={styles.fields}>
                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>Email Service Provider</label>
                  <select
                    className={styles.fieldSelect}
                    value={config.emailService.provider}
                    onChange={(e) =>
                      update("emailService", "provider", e.target.value as SiteConfigData["emailService"]["provider"])
                    }
                  >
                    <option value="formspree">Formspree</option>
                    <option value="web3forms">Web3Forms</option>
                    <option value="emailjs">EmailJS</option>
                  </select>
                </div>
                <Toggle
                  label="Email File Upload"
                  checked={config.emailService.enableFileUpload}
                  onChange={(v) => update("emailService", "enableFileUpload", v)}
                />
                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>AI Cover Provider</label>
                  <select
                    className={styles.fieldSelect}
                    value={config.aiCover.provider}
                    onChange={(e) =>
                      update("aiCover", "provider", e.target.value as SiteConfigData["aiCover"]["provider"])
                    }
                  >
                    <option value="nanobanana">NanoBanana (Gemini)</option>
                    <option value="huggingface">Hugging Face (FLUX)</option>
                  </select>
                </div>
                <Toggle
                  label="reCAPTCHA Enabled"
                  checked={config.recaptcha.enabled}
                  onChange={(v) => update("recaptcha", "enabled", v)}
                />
                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>reCAPTCHA Version</label>
                  <select
                    className={styles.fieldSelect}
                    value={config.recaptcha.version}
                    onChange={(e) =>
                      update("recaptcha", "version", e.target.value as SiteConfigData["recaptcha"]["version"])
                    }
                  >
                    <option value="v2">v2 (Checkbox)</option>
                    <option value="v3">v3 (Invisible)</option>
                  </select>
                </div>
              </div>
            </section>
          )}
        </div>
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

function ServiceItemsEditor({
  items,
  onChange,
}: {
  items: SiteConfigData["services"]["items"];
  onChange: (items: SiteConfigData["services"]["items"]) => void;
}) {
  const updateItem = (index: number, key: string, value: string) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, [key]: value } : item,
    );
    onChange(next);
  };

  return (
    <div className={styles.serviceItems}>
      {items.map((item, i) => (
        <div key={i} className={styles.serviceItem}>
          <span className={styles.serviceItemNum}>{item.num}</span>
          <div className={styles.serviceItemFields}>
            <div className={styles.fieldPair}>
              <Field label="Title (EN)" value={item.title} onChange={(v) => updateItem(i, "title", v)} />
              <Field label="Title (KO)" value={item.title_ko} onChange={(v) => updateItem(i, "title_ko", v)} />
            </div>
            <div className={styles.fieldPair}>
              <Field label="Desc (EN)" value={item.desc} onChange={(v) => updateItem(i, "desc", v)} />
              <Field label="Desc (KO)" value={item.desc_ko} onChange={(v) => updateItem(i, "desc_ko", v)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoriesEditor({
  categories,
  onChange,
}: {
  categories: string[];
  onChange: (cats: string[]) => void;
}) {
  const [newCat, setNewCat] = useState("");

  const addCategory = () => {
    const cat = newCat.trim();
    if (cat && !categories.includes(cat)) {
      onChange([...categories, cat]);
    }
    setNewCat("");
  };

  const removeCategory = (cat: string) => {
    onChange(categories.filter((c) => c !== cat));
  };

  return (
    <div>
      <div className={styles.catList}>
        {categories.map((cat) => (
          <span key={cat} className={styles.catTag}>
            {cat}
            <button
              type="button"
              className={styles.catRemove}
              onClick={() => removeCategory(cat)}
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <div className={styles.catInput}>
        <input
          className={styles.fieldInput}
          type="text"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCategory();
            }
          }}
          placeholder="New category name"
        />
        <button
          type="button"
          className={styles.catAddBtn}
          onClick={addCategory}
          disabled={!newCat.trim()}
        >
          Add
        </button>
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
