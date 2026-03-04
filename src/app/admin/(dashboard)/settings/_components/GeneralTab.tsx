"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import type { SettingsTabProps } from "../_types";
import Field, { AudioUpload, LogoUpload } from "./SettingsFormFields";
import styles from "../Settings.module.css";

export default function GeneralTab({ config, update }: SettingsTabProps) {
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
          <div>
            <Field
              label={t("admin.settings.splitName")}
              value={config.brand.splitName.join(", ")}
              onChange={(v) =>
                update("brand", "splitName", v.split(",").map((s) => s.trim()))
              }
            />
            <p className={styles.fieldHint}>{t("admin.settings.commaHint")}</p>
          </div>
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

      {/* Contact */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("admin.settings.contact")}</h2>
        <div className={styles.fields}>
          <Field label={t("admin.settings.email")} value={config.contact.email} onChange={(v) => update("contact", "email", v)} />
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

      {/* Footer & BGM */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("admin.settings.ctaFooter")}</h2>
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
          <AudioUpload
            label={t("admin.settings.bgmFile")}
            url={config.bgm.url}
            uploadLabel={t("admin.settings.uploadBgm")}
            removeLabel={t("admin.settings.removeLogo")}
            onUploaded={(url) => update("bgm", "url", url)}
            onRemove={() => update("bgm", "url", "")}
          />
        </div>
      </section>
    </>
  );
}
