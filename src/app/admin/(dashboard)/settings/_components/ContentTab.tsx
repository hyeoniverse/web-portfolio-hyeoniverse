"use client";

import type { Dispatch, SetStateAction } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import type { SiteConfigData } from "@/config/site.config";
import type { ProfileData } from "@/types/profile";
import ProfileSections from "@/components/admin/ProfileSections";
import type { SettingsTabProps } from "../_types";
import Field, { ResumeUpload, ServiceItemsEditor } from "./SettingsFormFields";
import CategoriesEditor from "./CategoriesEditor";
import SeriesManager from "./SeriesManager";
import styles from "../Settings.module.css";

interface ContentTabProps extends SettingsTabProps {
  profileData: ProfileData;
  setProfileData: Dispatch<SetStateAction<ProfileData>>;
  contentSubTab: "home" | "profile" | "works" | "posts";
}

export default function ContentTab({
  config,
  update,
  profileData,
  setProfileData,
  contentSubTab,
}: ContentTabProps) {
  const { t } = useLanguage();

  return (
    <>
      {contentSubTab === "home" && (
        <>
          {/* Hero */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("admin.settings.hero")}</h2>
            <div className={styles.fields}>
              <div className={styles.fieldPair}>
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
            <h2 className={styles.sectionTitle}>{t("admin.settings.homeAboutIntro")}</h2>
            <p className={styles.sectionHint}>{t("admin.settings.highlightHint")}</p>
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
            <h2 className={styles.sectionTitle}>{t("admin.settings.ctaFooter")}</h2>
            <div className={styles.fields}>
              <div className={styles.fieldPair}>
                <Field label={`${t("admin.settings.ctaLabel")} (EN)`} value={config.cta.label} onChange={(v) => update("cta", "label", v)} />
                <Field label={`${t("admin.settings.ctaLabel")} (KO)`} value={config.cta.label_ko} onChange={(v) => update("cta", "label_ko", v)} />
              </div>
              <div className={styles.fieldPair}>
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
              <div className={styles.fieldPair}>
                <Field label={`${t("admin.settings.footerCopyright")} (EN)`} value={config.footer.copyright} onChange={(v) => update("footer", "copyright", v)} />
                <Field label={`${t("admin.settings.footerCopyright")} (KO)`} value={config.footer.copyright_ko} onChange={(v) => update("footer", "copyright_ko", v)} />
              </div>
              <Field label={t("admin.settings.loadingDisplayName")} value={config.loading.displayName} onChange={(v) => update("loading", "displayName", v)} />
            </div>
          </section>
        </>
      )}

      {contentSubTab === "profile" && (
        <ProfileSections data={profileData} setData={setProfileData} styles={styles} />
      )}

      {contentSubTab === "posts" && (
        <>
          {/* Post Categories */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("admin.settings.postCategories")}</h2>
            <div className={styles.fields}>
              <CategoriesEditor
                categories={config.posts?.categories ?? []}
                onChange={(cats) => update("posts", "categories", cats as SiteConfigData["posts"]["categories"])}
              />
            </div>
          </section>

          {/* Series */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("admin.posts.series")}</h2>
            <SeriesManager categories={config.posts?.categories ?? []} />
          </section>
        </>
      )}

      {contentSubTab === "works" && (
        <>
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
    </>
  );
}
