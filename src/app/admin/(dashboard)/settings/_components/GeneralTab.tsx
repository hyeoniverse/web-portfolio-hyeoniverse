"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import type { SettingsTabProps } from "../_types";
import Field, { LogoUpload } from "./SettingsFormFields";
import styles from "../Settings.module.css";

interface GeneralTabProps extends SettingsTabProps {
  updateSocial: (key: string, value: string) => void;
}

export default function GeneralTab({ config, update, updateSocial }: GeneralTabProps) {
  const { t } = useLanguage();

  return (
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
              update("brand", "splitName", v.split(",").map((s) => s.trim()))
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
    </>
  );
}
