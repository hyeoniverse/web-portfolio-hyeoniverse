"use client";

import { useState, useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import DraggableTag from "@/components/ui/DraggableTag";
import { SOCIAL_ICONS, SOCIAL_PLATFORM_OPTIONS } from "../_data/socialIcons";
import styles from "../Settings.module.css";

type SocialLink = { platform: string; url: string; label?: string; icon?: string };

const MAX_SOCIAL_LINKS = 6;

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

  const socialIds = useMemo(() => socialLinks.map((_, i) => `social-${i}`), [socialLinks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleSocialDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = socialIds.indexOf(String(active.id));
      const newIdx = socialIds.indexOf(String(over.id));
      if (oldIdx === -1 || newIdx === -1) return;
      updateSocialLinks((prev) => arrayMove([...prev], oldIdx, newIdx));
    },
    [socialIds, updateSocialLinks],
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
              <Field label={t("admin.settings.loadingDisplayName")} hint={t("admin.settings.loadingDisplayNameHint")} value={config.loading.displayName} onChange={(v) => update("loading", "displayName", v)} />
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
          <section className={styles.section} style={{ gridRow: "span 2", borderBottom: "none" }}>
            <h2 className={styles.sectionTitle}><T k="admin.settings.servicesLabel" /></h2>
            <div className={styles.fields}>
              <div className={styles.fieldPair}>
                <Field label="Section Title (EN)" value={config.services.label} onChange={(v) => update("services", "label", v)} />
                <Field label="Section Title (KO)" value={config.services.label_ko} onChange={(v) => update("services", "label_ko", v)} />
              </div>
            </div>
            <hr className={styles.sectionDivider} />
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

          {/* CTA */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>CTA</h2>
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
            </div>
          </section>

          {/* Footer */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Footer</h2>
            <div className={styles.fields}>
              <div className={styles.fieldPair}>
                <Field label={`${t("admin.settings.footerCopyright")} (EN)`} value={config.footer.copyright} onChange={(v) => update("footer", "copyright", v)} />
                <Field label={`${t("admin.settings.footerCopyright")} (KO)`} value={config.footer.copyright_ko} onChange={(v) => update("footer", "copyright_ko", v)} />
              </div>
              <div className={styles.fieldPair}>
                <Field label={t("admin.settings.musicCreditTitle")} value={config.footer.musicCreditTitle} onChange={(v) => update("footer", "musicCreditTitle", v)} placeholder="Ghost Duet" />
                <Field label={t("admin.settings.musicCreditArtist")} value={config.footer.musicCreditArtist} onChange={(v) => update("footer", "musicCreditArtist", v)} placeholder="Louie Zong" />
              </div>
              <Field label={t("admin.settings.musicCreditUrl")} value={config.footer.musicCreditUrl} onChange={(v) => update("footer", "musicCreditUrl", v)} placeholder="https://youtube.com/..." />
            </div>
          </section>

          {/* Social Links */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><T k="admin.settings.socialLinks" /></h2>
            <p className={styles.sectionHint}><T k="admin.settings.socialHint" /></p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSocialDragEnd}>
              <SortableContext items={socialIds} strategy={verticalListSortingStrategy}>
            <div className={styles.socialEditor}>
              {socialLinks.map((link, idx) => (
                <SortableSocialItem key={socialIds[idx]} id={socialIds[idx]}>
                  <SocialIconArea
                    link={link}
                    isCustom={link.platform === "custom"}
                    onUploaded={(url) => updateSocialItem(idx, "icon", url)}
                  />
                  <div className={styles.socialItemFields}>
                    <Select
                      value={link.platform}
                      options={SOCIAL_PLATFORM_OPTIONS}
                      onChange={(v) => updateSocialItem(idx, "platform", v)}
                    />
                    {link.platform === "custom" && (
                      <>
                        <input
                          className={styles.fieldInput}
                          placeholder={t("admin.settings.socialLabelPlaceholder")}
                          value={link.label ?? ""}
                          onChange={(e) => updateSocialItem(idx, "label", e.target.value)}
                        />
                        <SocialIconUploadRow
                          icon={link.icon ?? ""}
                          onIconChange={(v) => updateSocialItem(idx, "icon", v)}
                          onUploaded={(url) => updateSocialItem(idx, "icon", url)}
                          placeholder={t("admin.settings.socialIconPlaceholder")}
                        />
                      </>
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
                    <span className={styles.socialRemoveLine} />
                    <span className={styles.socialRemoveLine} />
                  </button>
                </SortableSocialItem>
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
              </SortableContext>
            </DndContext>
          </section>
        </>
      )}

      {contentSubTab === "profile" && (
        <ProfileSections data={profileData} setData={setProfileData} styles={styles} />
      )}

      {contentSubTab === "posts" && (
        <>
          {/* Banner Settings */}
          <section className={`${styles.section} ${styles.sectionWide}`}>
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
          {/* Works Layout */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><T k="admin.settings.worksLayout" /></h2>
            <div className={styles.fields}>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}><T k="admin.settings.worksLayout" /></label>
                <Select
                  value={config.works.layout ?? "flow"}
                  options={[
                    { value: "flow", label: "Flow" },
                    { value: "fullscreen", label: "Fullscreen" },
                    { value: "cinematic", label: "Cinematic" },
                    { value: "grid", label: "Grid" },
                    { value: "split", label: "Split" },
                    { value: "cylinder", label: "Cylinder" },
                  ]}
                  onChange={(v) => update("works", "layout", v)}
                />
              </div>
            </div>
          </section>

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
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
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

  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const next = [...tags];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    onChange(next.join(SCOPE_SEPARATOR));
    setDragIdx(null);
    setOverIdx(null);
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
            <DraggableTag
              key={`${tag}-${i}`}
              label={tag}
              index={i}
              dragging={dragIdx === i}
              over={overIdx === i && dragIdx !== i}
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
              onDrop={(e) => { e.preventDefault(); handleDrop(i); }}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              onRemove={() => removeTag(i)}
            />
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

/* ── Sortable social link item ── */
function SortableSocialItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.socialItem} ${isDragging ? styles.socialItemDragging : ""}`}
      {...attributes}
    >
      <button type="button" className={styles.socialDragHandle} {...listeners} aria-label="Drag to reorder">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>
      {children}
    </div>
  );
}

/* ── Clickable social icon area with upload ── */
function SocialIconArea({ link, isCustom, onUploaded }: {
  link: SocialLink;
  isCustom: boolean;
  onUploaded: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "icons");
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (!res.ok) return;
      const data = await res.json();
      onUploaded(data.url);
    } catch {
      // upload failed
    } finally {
      setUploading(false);
    }
  };

  const icon = SOCIAL_ICONS[link.platform];

  return (
    <>
      <span
        className={`${styles.socialIcon} ${isCustom ? styles.socialIconClickable : ""}`}
        onClick={isCustom ? () => fileRef.current?.click() : undefined}
        title={isCustom ? "Click to upload icon" : undefined}
      >
        {uploading ? (
          <span className={styles.socialIconSpinner}>…</span>
        ) : link.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={link.icon} alt="" className={styles.socialIconImg} />
        ) : icon?.stroke ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon.path} /></svg>
        ) : icon ? (
          <svg viewBox="0 0 24 24"><path d={icon.path} fill="currentColor" /></svg>
        ) : null}
      </span>
      {isCustom && (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
      )}
    </>
  );
}

/* ── Social icon upload row (input + button + error as placeholder) ── */
function SocialIconUploadRow({ icon, onIconChange, onUploaded, placeholder }: {
  icon: string;
  onIconChange: (v: string) => void;
  onUploaded: (url: string) => void;
  placeholder: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "icons");
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Upload failed");
        return;
      }
      const data = await res.json();
      onUploaded(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.socialIconUpload}>
      <input
        className={`${styles.fieldInput} ${error ? styles.fieldInputError : ""}`}
        placeholder={error || placeholder}
        value={icon}
        onChange={(e) => { onIconChange(e.target.value); if (error) setError(""); }}
      />
      <button
        type="button"
        className={styles.socialIconUploadBtn}
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "..." : "↑"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
