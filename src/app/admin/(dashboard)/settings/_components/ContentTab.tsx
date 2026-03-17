"use client";

import { useState, useCallback, useMemo, type Dispatch, type SetStateAction } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import type { SiteConfigData } from "@/config/site.config";
import type { ProfileData } from "@/types/profile";
import ProfileSections from "@/components/admin/ProfileSections";
import type { SettingsTabProps } from "../_types";
import Select from "@/components/ui/Select";
import Field, { ResumeUpload, ServiceItemsEditor } from "./SettingsFormFields";
import CategoriesEditor from "./CategoriesEditor";
import WorksCategoriesEditor from "./WorksCategoriesEditor";
import SeriesManager from "./SeriesManager";
import styles from "../Settings.module.css";

type SocialLink = { platform: string; url: string; label?: string };

const MAX_SOCIAL_LINKS = 6;

const SOCIAL_ICONS: Record<string, { label: string; path: string; stroke?: boolean }> = {
  github: { label: "GitHub", path: "M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" },
  linkedin: { label: "LinkedIn", path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
  blog: { label: "Blog", path: "M19.199 24C19.199 13.467 10.533 4.8 0 4.8V0c13.165 0 24 10.835 24 24h-4.801zM3.291 17.415a3.3 3.3 0 013.293 3.295A3.303 3.303 0 013.283 24C1.47 24 0 22.526 0 20.71s1.475-3.294 3.291-3.295zM15.909 24h-4.665c0-6.169-5.075-11.245-11.244-11.245V8.09c8.727 0 15.909 7.184 15.909 15.91z" },
  twitter: { label: "X", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  instagram: { label: "Instagram", path: "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z" },
  youtube: { label: "YouTube", path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
  behance: { label: "Behance", path: "M22 7h-7V5h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14H15.97c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.988H0V5.021h6.953c5.476.081 5.58 5.444 2.72 6.906 3.461 1.26 3.577 8.061-3.207 8.061zM3 11h3.584c2.508 0 2.906-3-.312-3H3v3zm3.391 3H3v3.016h3.341c3.055 0 2.868-3.016.05-3.016z" },
  dribbble: { label: "Dribbble", path: "M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308a10.29 10.29 0 004.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4a10.161 10.161 0 006.29 2.166c1.42 0 2.77-.29 4.006-.816zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702A10.176 10.176 0 0012 1.764c-.825 0-1.63.1-2.4.288zm10.335 3.483c-.218.29-1.91 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z" },
  custom: { label: "Custom", path: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71", stroke: true },
};

const SOCIAL_PLATFORM_OPTIONS = Object.entries(SOCIAL_ICONS).map(([value, { label }]) => ({
  value,
  label,
}));

interface ContentTabProps extends SettingsTabProps {
  profileData: ProfileData;
  setProfileData: Dispatch<SetStateAction<ProfileData>>;
  setConfig: Dispatch<SetStateAction<SiteConfigData>>;
  contentSubTab: "home" | "profile" | "works" | "posts";
}

export default function ContentTab({
  config,
  update,
  profileData,
  setProfileData,
  setConfig,
  contentSubTab,
}: ContentTabProps) {
  const { t } = useLanguage();

  // Normalize: support old social object → socialLinks array
  const socialLinks: SocialLink[] = useMemo(() => {
    if (config.socialLinks && config.socialLinks.length > 0) return config.socialLinks;
    // Fallback: convert old social object
    const social = config.social as Record<string, string> | undefined;
    if (!social) return [];
    return Object.entries(social)
      .filter(([, url]) => !!url)
      .map(([platform, url]) => ({ platform, url }));
  }, [config.socialLinks, config.social]);

  const updateSocialLinks = useCallback(
    (fn: (prev: SocialLink[]) => SocialLink[]) => {
      setConfig((prev) => {
        const current: SocialLink[] =
          prev.socialLinks && prev.socialLinks.length > 0
            ? prev.socialLinks
            : Object.entries((prev.social as Record<string, string>) ?? {})
                .filter(([, url]) => !!url)
                .map(([platform, url]) => ({ platform, url }));
        const next = fn(current);
        // Also sync the social object for backward compat
        const socialObj: Record<string, string> = {};
        for (const link of next) {
          if (link.platform !== "custom") socialObj[link.platform] = link.url;
        }
        return { ...prev, socialLinks: next, social: socialObj as SiteConfigData["social"] };
      });
    },
    [setConfig],
  );

  const moveSocial = useCallback(
    (idx: number, dir: -1 | 1) => {
      updateSocialLinks((prev) => {
        const arr = [...prev];
        const target = idx + dir;
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        return arr;
      });
    },
    [updateSocialLinks],
  );

  const updateSocialItem = useCallback(
    (idx: number, field: keyof SocialLink, value: string) => {
      updateSocialLinks((prev) =>
        prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
      );
    },
    [updateSocialLinks],
  );

  const addSocialLink = useCallback(() => {
    updateSocialLinks((prev) => {
      if (prev.length >= MAX_SOCIAL_LINKS) return prev;
      return [...prev, { platform: "custom", url: "", label: "" }];
    });
  }, [updateSocialLinks]);

  const removeSocialLink = useCallback(
    (idx: number) => {
      updateSocialLinks((prev) => prev.filter((_, i) => i !== idx));
    },
    [updateSocialLinks],
  );

  // Normalize: support both old string[] and new { ko, en }[]
  const normalizedPostCats = useMemo(() => {
    const raw = config.posts?.categories ?? [];
    return (raw as unknown[]).map((item) =>
      typeof item === "string" ? { ko: item, en: item } : (item as { ko: string; en: string }),
    );
  }, [config.posts?.categories]);

  const normalizedWorksCats = useMemo(() => {
    const raw = config.works?.categories ?? [];
    return (raw as unknown[]).map((item) =>
      typeof item === "string" ? { ko: item, en: item } : (item as { ko: string; en: string }),
    );
  }, [config.works?.categories]);

  return (
    <>
      {contentSubTab === "home" && (
        <>
          {/* Hero */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><T k="admin.settings.hero" /></h2>
            <div className={styles.fields}>
              <Field
                label={t("admin.settings.splitName")}
                hint={t("admin.settings.splitNameHint")}
                value={config.brand.splitName.join(", ")}
                onChange={(v) =>
                  update("brand", "splitName", v.split(",").map((s) => s.trim()))
                }
              />
              <div className={styles.fieldPair}>
                <p className={styles.fieldHint}><T k="admin.settings.multilineHint" /></p>
                <Field
                  label={`${t("admin.settings.heroHeadline")} (EN)`}
                  value={config.hero.headline.join("\n")}
                  onChange={(v) => update("hero", "headline", v.split("\n"))}
                  multiline
                />
                <Field
                  label={`${t("admin.settings.heroHeadline")} (KO)`}
                  value={config.hero.headline_ko.join("\n")}
                  onChange={(v) => update("hero", "headline_ko", v.split("\n"))}
                  multiline
                />
              </div>
              <div className={styles.fieldPair}>
                <p className={styles.fieldHint}><T k="admin.settings.multilineHint" /></p>
                <Field
                  label={`${t("admin.settings.heroSubtext")} (EN)`}
                  value={config.hero.subtext.join("\n")}
                  onChange={(v) => update("hero", "subtext", v.split("\n"))}
                  multiline
                />
                <Field
                  label={`${t("admin.settings.heroSubtext")} (KO)`}
                  value={config.hero.subtext_ko.join("\n")}
                  onChange={(v) => update("hero", "subtext_ko", v.split("\n"))}
                  multiline
                />
              </div>
              <div className={styles.fieldPair}>
                <Field label={`${t("admin.settings.scrollLabel")} (EN)`} value={config.hero.scrollLabel} onChange={(v) => update("hero", "scrollLabel", v)} />
                <Field label={`${t("admin.settings.scrollLabel")} (KO)`} value={config.hero.scrollLabel_ko} onChange={(v) => update("hero", "scrollLabel_ko", v)} />
              </div>
            </div>
          </section>

          {/* Home About */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><T k="admin.settings.homeAboutIntro" /></h2>
            <p className={styles.sectionHint}><T k="admin.settings.highlightHint" /></p>
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
            <h2 className={styles.sectionTitle}><T k="admin.settings.servicesLabel" /></h2>
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
            <h2 className={styles.sectionTitle}><T k="admin.settings.marqueeWords" /></h2>
            <p className={styles.sectionHint}><T k="admin.settings.commaHint" /></p>
            <div className={styles.fields}>
              <div className={styles.fieldPair}>
                <Field
                  label="Words (EN)"
                  value={config.marquee.words.join(", ")}
                  onChange={(v) => update("marquee", "words", v.split(",").map((s) => s.trim()))}
                />
                <Field
                  label="Words (KO)"
                  value={config.marquee.words_ko.join(", ")}
                  onChange={(v) => update("marquee", "words_ko", v.split(",").map((s) => s.trim()))}
                />
              </div>
            </div>
          </section>

          {/* CTA & Footer */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><T k="admin.settings.homeCtaFooter" /></h2>
            <div className={styles.fields}>
              <div className={styles.fieldPair}>
                <Field label={`${t("admin.settings.ctaLabel")} (EN)`} value={config.cta.label} onChange={(v) => update("cta", "label", v)} />
                <Field label={`${t("admin.settings.ctaLabel")} (KO)`} value={config.cta.label_ko} onChange={(v) => update("cta", "label_ko", v)} />
              </div>
              <div className={styles.fieldPair}>
                <p className={styles.fieldHint}><T k="admin.settings.multilineHint" /></p>
                <Field
                  label={`${t("admin.settings.ctaTitle")} (EN)`}
                  value={config.cta.title.join("\n")}
                  onChange={(v) => update("cta", "title", v.split("\n"))}
                  multiline
                />
                <Field
                  label={`${t("admin.settings.ctaTitle")} (KO)`}
                  value={config.cta.title_ko.join("\n")}
                  onChange={(v) => update("cta", "title_ko", v.split("\n"))}
                  multiline
                />
              </div>
              <div className={styles.fieldPair}>
                <Field label={`${t("admin.settings.ctaButtonText")} (EN)`} value={config.cta.buttonText} onChange={(v) => update("cta", "buttonText", v)} />
                <Field label={`${t("admin.settings.ctaButtonText")} (KO)`} value={config.cta.buttonText_ko} onChange={(v) => update("cta", "buttonText_ko", v)} />
              </div>
              <ResumeUpload
                label={t("admin.settings.resumeFile")}
                hint={t("admin.settings.resumeUploadHint")}
                url={config.cta.resumeUrl}
                uploadLabel={t("admin.settings.uploadResume")}
                removeLabel={t("admin.settings.removeLogo")}
                onUploaded={(url) => update("cta", "resumeUrl", url)}
                onRemove={() => update("cta", "resumeUrl", "")}
              />
              <div className={styles.fieldPair}>
                <Field label={`${t("admin.settings.resumeButtonText")} (EN)`} value={config.cta.resumeButtonText} onChange={(v) => update("cta", "resumeButtonText", v)} />
                <Field label={`${t("admin.settings.resumeButtonText")} (KO)`} value={config.cta.resumeButtonText_ko} onChange={(v) => update("cta", "resumeButtonText_ko", v)} />
              </div>
              <Field label={t("admin.settings.loadingDisplayName")} hint={t("admin.settings.loadingDisplayNameHint")} value={config.loading.displayName} onChange={(v) => update("loading", "displayName", v)} />
            </div>
          </section>

          {/* Social Links */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><T k="admin.settings.socialLinks" /></h2>
            <p className={styles.sectionHint}><T k="admin.settings.socialHint" /></p>
            <div className={styles.socialEditor}>
              {socialLinks.map((link, idx) => (
                <div key={idx} className={styles.socialItem}>
                  <div className={styles.socialReorder}>
                    <button
                      type="button"
                      className={styles.socialReorderBtn}
                      disabled={idx === 0}
                      onClick={() => moveSocial(idx, -1)}
                      aria-label="Move up"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 2L1 7h8z" fill="currentColor" /></svg>
                    </button>
                    <button
                      type="button"
                      className={styles.socialReorderBtn}
                      disabled={idx === socialLinks.length - 1}
                      onClick={() => moveSocial(idx, 1)}
                      aria-label="Move down"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 8L1 3h8z" fill="currentColor" /></svg>
                    </button>
                  </div>
                  <span className={styles.socialIcon}>
                    {(() => {
                      const icon = SOCIAL_ICONS[link.platform];
                      if (!icon) return null;
                      return icon.stroke ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon.path} /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24"><path d={icon.path} fill="currentColor" /></svg>
                      );
                    })()}
                  </span>
                  <div className={styles.socialItemFields}>
                    <Select
                      value={link.platform}
                      options={SOCIAL_PLATFORM_OPTIONS}
                      onChange={(v) => updateSocialItem(idx, "platform", v)}
                    />
                    {link.platform === "custom" && (
                      <input
                        className={styles.fieldInput}
                        placeholder={t("admin.settings.socialLabelPlaceholder")}
                        value={link.label ?? ""}
                        onChange={(e) => updateSocialItem(idx, "label", e.target.value)}
                      />
                    )}
                    <input
                      className={styles.fieldInput}
                      placeholder="https://..."
                      value={link.url}
                      onChange={(e) => updateSocialItem(idx, "url", e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.socialRemoveBtn}
                    onClick={() => removeSocialLink(idx)}
                    aria-label="Remove"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={styles.profileAddBtn}
                onClick={addSocialLink}
                disabled={socialLinks.length >= MAX_SOCIAL_LINKS}
              >
                + <T k="admin.settings.addSocial" /> ({socialLinks.length}/{MAX_SOCIAL_LINKS})
              </button>
            </div>
          </section>
        </>
      )}

      {contentSubTab === "profile" && (
        <ProfileSections data={profileData} setData={setProfileData} styles={styles} />
      )}

      {contentSubTab === "posts" && (
        <>
          {/* Banner Settings */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><T k="admin.settings.banner" /></h2>
            <div className={styles.fields}>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}><T k="admin.settings.bannerLayout" /></label>
                <Select
                  value={config.posts.bannerLayout ?? "fullwidth"}
                  options={[
                    { value: "fullwidth", label: "Fullwidth" },
                    { value: "split", label: "Split" },
                    { value: "cards", label: "Cards" },
                    { value: "ticker", label: "Ticker" },
                  ]}
                  onChange={(v) => update("posts", "bannerLayout", v as SiteConfigData["posts"]["bannerLayout"])}
                />
              </div>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}><T k="admin.settings.bannerStyle" /></label>
                <Select
                  value={config.posts.bannerStyle ?? "editorial"}
                  options={[
                    { value: "editorial", label: "Editorial" },
                    { value: "minimal", label: "Minimal" },
                    { value: "cinematic", label: "Cinematic" },
                    { value: "magazine", label: "Magazine" },
                  ]}
                  onChange={(v) => update("posts", "bannerStyle", v as SiteConfigData["posts"]["bannerStyle"])}
                />
              </div>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}><T k="admin.settings.bannerTransition" /></label>
                <Select
                  value={config.posts.bannerTransition ?? "default"}
                  options={[
                    { value: "default", label: "Default" },
                    { value: "cylinder", label: "Cylinder" },
                  ]}
                  onChange={(v) => update("posts", "bannerTransition", v as SiteConfigData["posts"]["bannerTransition"])}
                />
              </div>
            </div>
          </section>

          {/* Pagination */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><T k="admin.settings.pagination" /></h2>
            <div className={styles.fields}>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}><T k="admin.settings.postsPerPage" /></label>
                <Select
                  value={String(config.posts.perPage ?? 10)}
                  options={[
                    { value: "10", label: "10" },
                    { value: "20", label: "20" },
                    { value: "50", label: "50" },
                    { value: "100", label: "100" },
                  ]}
                  onChange={(v) => update("posts", "perPage", Number(v))}
                />
              </div>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}><T k="admin.settings.adminPerPage" /></label>
                <Select
                  value={String(config.posts.adminPerPage ?? 20)}
                  options={[
                    { value: "10", label: "10" },
                    { value: "20", label: "20" },
                    { value: "50", label: "50" },
                    { value: "100", label: "100" },
                  ]}
                  onChange={(v) => update("posts", "adminPerPage", Number(v))}
                />
              </div>
            </div>
          </section>

          {/* Image Upload */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><T k="admin.settings.imageUpload" /></h2>
            <div className={styles.fields}>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}><T k="admin.settings.maxImageSizeMB" /></label>
                <Select
                  value={String(config.posts.maxImageSizeMB ?? 10)}
                  options={[
                    { value: "5", label: "5 MB" },
                    { value: "10", label: "10 MB" },
                    { value: "20", label: "20 MB" },
                    { value: "50", label: "50 MB" },
                  ]}
                  onChange={(v) => update("posts", "maxImageSizeMB", Number(v))}
                />
              </div>
            </div>
          </section>

          {/* Post Categories */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><T k="admin.settings.postCategories" /></h2>
            <div className={styles.fields}>
              <CategoriesEditor
                categories={normalizedPostCats}
                onChange={(cats) => update("posts", "categories", cats as SiteConfigData["posts"]["categories"])}
              />
            </div>
          </section>

          {/* Series */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><T k="admin.posts.series" /></h2>
            <SeriesManager categories={normalizedPostCats} />
          </section>
        </>
      )}

      {contentSubTab === "works" && (
        <>
          {/* Works Pagination */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><T k="admin.settings.pagination" /></h2>
            <div className={styles.fields}>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}><T k="admin.settings.adminPerPage" /></label>
                <Select
                  value={String(config.works.adminPerPage ?? 20)}
                  options={[
                    { value: "10", label: "10" },
                    { value: "20", label: "20" },
                    { value: "50", label: "50" },
                    { value: "100", label: "100" },
                  ]}
                  onChange={(v) => update("works", "adminPerPage", Number(v))}
                />
              </div>
            </div>
          </section>

          {/* Works Categories */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><T k="admin.settings.worksCategories" /></h2>
            <div className={styles.fields}>
              <WorksCategoriesEditor
                categories={normalizedWorksCats}
                onChange={(cats) => update("works", "categories", cats as SiteConfigData["works"]["categories"])}
              />
            </div>
          </section>

          {/* Works Intro */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><T k="admin.settings.worksIntro" /></h2>
            <div className={styles.fields}>
              <div className={styles.fieldPair}>
                <Field label={`${t("admin.settings.worksIntroLabel")} (EN)`} value={config.works.introLabel} onChange={(v) => update("works", "introLabel", v)} />
                <Field label={`${t("admin.settings.worksIntroLabel")} (KO)`} value={config.works.introLabel_ko} onChange={(v) => update("works", "introLabel_ko", v)} />
              </div>
              <div className={styles.fieldPair}>
                <Field label={`${t("admin.settings.worksIntroTitle")} (EN)`} value={config.works.introTitle} onChange={(v) => update("works", "introTitle", v)} />
                <Field label={`${t("admin.settings.worksIntroTitle")} (KO)`} value={config.works.introTitle_ko} onChange={(v) => update("works", "introTitle_ko", v)} />
              </div>
              <div className={styles.fieldPair}>
                <Field label={`${t("admin.settings.worksIntroTagline")} (EN)`} value={config.works.introTagline} onChange={(v) => update("works", "introTagline", v)} />
                <Field label={`${t("admin.settings.worksIntroTagline")} (KO)`} value={config.works.introTagline_ko} onChange={(v) => update("works", "introTagline_ko", v)} />
              </div>
              <div className={styles.fieldPair}>
                <Field label={`${t("admin.settings.worksIntroDesc")} (EN)`} value={config.works.introDesc} onChange={(v) => update("works", "introDesc", v)} multiline />
                <Field label={`${t("admin.settings.worksIntroDesc")} (KO)`} value={config.works.introDesc_ko} onChange={(v) => update("works", "introDesc_ko", v)} multiline />
              </div>
              <div className={styles.fieldPair}>
                <Field label={`${t("admin.settings.worksIntroDetail")} (EN)`} value={config.works.introDetail} onChange={(v) => update("works", "introDetail", v)} multiline />
                <Field label={`${t("admin.settings.worksIntroDetail")} (KO)`} value={config.works.introDetail_ko} onChange={(v) => update("works", "introDetail_ko", v)} multiline />
              </div>
              <div className={styles.fieldPair}>
                <Field label={`${t("admin.settings.worksIntroQuote")} (EN)`} value={config.works.introQuote} onChange={(v) => update("works", "introQuote", v)} />
                <Field label={`${t("admin.settings.worksIntroQuote")} (KO)`} value={config.works.introQuote_ko} onChange={(v) => update("works", "introQuote_ko", v)} />
              </div>
              <div className={styles.fieldPair}>
                <ScopeTagField
                  label={`${t("admin.settings.worksIntroScope")} (EN)`}
                  value={config.works.introScope}
                  onChange={(v) => update("works", "introScope", v)}
                  placeholder={t("admin.settings.tagPlaceholder")}
                />
                <ScopeTagField
                  label={`${t("admin.settings.worksIntroScope")} (KO)`}
                  value={config.works.introScope_ko}
                  onChange={(v) => update("works", "introScope_ko", v)}
                  placeholder={t("admin.settings.tagPlaceholder")}
                />
              </div>
            </div>
          </section>

          {/* Works Stats */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><T k="admin.settings.worksStats" /></h2>
            <div className={styles.fields}>
              <div className={styles.fieldPair}>
                <Field label={`${t("admin.settings.worksStatsProjects")} (EN)`} value={config.works.statsProjects} onChange={(v) => update("works", "statsProjects", v)} />
                <Field label={`${t("admin.settings.worksStatsProjects")} (KO)`} value={config.works.statsProjects_ko} onChange={(v) => update("works", "statsProjects_ko", v)} />
              </div>
              <div className={styles.fieldPair}>
                <Field label={`${t("admin.settings.worksStatsClients")} (EN)`} value={config.works.statsClients} onChange={(v) => update("works", "statsClients", v)} />
                <Field label={`${t("admin.settings.worksStatsClients")} (KO)`} value={config.works.statsClients_ko} onChange={(v) => update("works", "statsClients_ko", v)} />
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

/* ── Scope Tag Field ── */
const SCOPE_SEPARATOR = " · ";

function ScopeTagField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const tags = value ? value.split(SCOPE_SEPARATOR).filter(Boolean) : [];

  const addTag = () => {
    const tag = input.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag].join(SCOPE_SEPARATOR));
    }
    setInput("");
  };

  const removeTag = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx).join(SCOPE_SEPARATOR));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className={styles.scopeTagField}>
      <label className={styles.fieldLabel}>{label}</label>
      {tags.length > 0 && (
        <div className={styles.scopeTags}>
          {tags.map((tag, i) => (
            <span key={i} className={styles.scopeTag}>
              {tag}
              <button type="button" className={styles.scopeTagRemove} onClick={() => removeTag(i)}>
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      <div className={styles.scopeInputRow}>
        <input
          className={styles.fieldInput}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <button type="button" className={styles.scopeAddBtn} onClick={addTag} disabled={!input.trim()}>
          +
        </button>
      </div>
    </div>
  );
}
