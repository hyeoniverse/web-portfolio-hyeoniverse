"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import type { SettingsTabProps } from "../_types";
import Checkbox from "@/components/ui/Checkbox";
import Field, { AudioUpload, LogoUpload, TagField } from "./SettingsFormFields";
import styles from "../Settings.module.css";

const LOGO_COLOR_PRESETS: { name: string; light: string; dark: string }[] = [
  { name: "Default", light: "", dark: "" },
  { name: "Accent", light: "#d40063", dark: "#ff4d8d" },
  { name: "Navy", light: "#1c3d5a", dark: "#a8c8e8" },
  { name: "Forest", light: "#2a4035", dark: "#b0be97" },
  { name: "Warm", light: "#5c3a1a", dark: "#f5cac3" },
  { name: "Coral", light: "#c44536", dark: "#ffa07a" },
  { name: "Violet", light: "#5b2c6f", dark: "#d4a5f5" },
  { name: "Teal", light: "#1a6b5a", dark: "#7eddd3" },
  { name: "Gold", light: "#8b6914", dark: "#f6d860" },
];

export default function GeneralTab({ config, update }: SettingsTabProps) {
  const { t } = useLanguage();

  return (
    <>
      {/* Personal */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.personal" /></h2>
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
        <h2 className={styles.sectionTitle}><T k="admin.settings.brand" /></h2>
        <div className={styles.fields}>
          <div className={styles.fieldPair}>
            <Field label={t("admin.settings.logoText")} hint={t("admin.settings.logoTextHint")} value={config.brand.logoText} onChange={(v) => update("brand", "logoText", v)} />
            <Field label={t("admin.settings.logoFullText")} hint={t("admin.settings.logoFullTextHint")} value={config.brand.logoFullText} onChange={(v) => update("brand", "logoFullText", v)} />
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}>{t("admin.settings.logoColorPresets")}</label>
            <div className={styles.logoColorPresets}>
              {LOGO_COLOR_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  title={p.name}
                  className={`${styles.logoColorPresetBtn} ${
                    config.brand.logoColor === p.light && config.brand.logoColorDark === p.dark
                      ? styles.logoColorPresetBtnActive : ""
                  }`}
                  onClick={() => {
                    update("brand", "logoColor", p.light);
                    update("brand", "logoColorDark", p.dark);
                  }}
                >
                  <span className={styles.logoColorPresetHalf} style={{ background: p.light || "#1a1a1a" }} />
                  <span className={styles.logoColorPresetHalf} style={{ background: p.dark || "#f5f5f0" }} />
                </button>
              ))}
            </div>
          </div>
          <div className={styles.fieldPair}>
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>{t("admin.settings.logoColor")}</label>
              <div className={styles.colorField}>
                <input
                  type="color"
                  className={styles.colorPicker}
                  value={config.brand.logoColor || "#000000"}
                  onChange={(e) => update("brand", "logoColor", e.target.value)}
                />
                <input
                  type="text"
                  className={styles.colorText}
                  value={config.brand.logoColor}
                  onChange={(e) => update("brand", "logoColor", e.target.value)}
                  placeholder={t("admin.settings.logoColorPlaceholder")}
                  maxLength={7}
                />
                {config.brand.logoColor && (
                  <button type="button" className={styles.envCancelBtn} onClick={() => update("brand", "logoColor", "")}>
                    &times;
                  </button>
                )}
              </div>
            </div>
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>{t("admin.settings.logoColorDark")}</label>
              <div className={styles.colorField}>
                <input
                  type="color"
                  className={styles.colorPicker}
                  value={config.brand.logoColorDark || "#ffffff"}
                  onChange={(e) => update("brand", "logoColorDark", e.target.value)}
                />
                <input
                  type="text"
                  className={styles.colorText}
                  value={config.brand.logoColorDark}
                  onChange={(e) => update("brand", "logoColorDark", e.target.value)}
                  placeholder={t("admin.settings.logoColorPlaceholder")}
                  maxLength={7}
                />
                {config.brand.logoColorDark && (
                  <button type="button" className={styles.envCancelBtn} onClick={() => update("brand", "logoColorDark", "")}>
                    &times;
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}>{t("admin.settings.logoGlitch")}</label>
            <Checkbox
              checked={config.brand.logoGlitch}
              onChange={(v) => update("brand", "logoGlitch", v)}
              shape="square"
            />
          </div>
          <LogoUpload
            label={t("admin.settings.logoShort")}
            hint={t("admin.settings.logoUploadHint")}
            url={config.brand.logoShortUrl}
            uploadLabel={t("admin.settings.uploadLogo")}
            removeLabel={t("admin.settings.removeLogo")}
            onUploaded={(url) => update("brand", "logoShortUrl", url)}
            onRemove={() => update("brand", "logoShortUrl", "")}
          />
          <LogoUpload
            label={t("admin.settings.logoShortDark")}
            hint={t("admin.settings.logoDarkHint")}
            url={config.brand.logoShortDarkUrl}
            uploadLabel={t("admin.settings.uploadLogo")}
            removeLabel={t("admin.settings.removeLogo")}
            onUploaded={(url) => update("brand", "logoShortDarkUrl", url)}
            onRemove={() => update("brand", "logoShortDarkUrl", "")}
          />
          <LogoUpload
            label={t("admin.settings.logoFull")}
            hint={t("admin.settings.logoUploadHint")}
            url={config.brand.logoFullUrl}
            uploadLabel={t("admin.settings.uploadLogo")}
            removeLabel={t("admin.settings.removeLogo")}
            onUploaded={(url) => update("brand", "logoFullUrl", url)}
            onRemove={() => update("brand", "logoFullUrl", "")}
          />
          <LogoUpload
            label={t("admin.settings.logoFullDark")}
            hint={t("admin.settings.logoDarkHint")}
            url={config.brand.logoFullDarkUrl}
            uploadLabel={t("admin.settings.uploadLogo")}
            removeLabel={t("admin.settings.removeLogo")}
            onUploaded={(url) => update("brand", "logoFullDarkUrl", url)}
            onRemove={() => update("brand", "logoFullDarkUrl", "")}
          />
        </div>
      </section>

      {/* Contact */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.contact" /></h2>
        <div className={styles.fields}>
          <Field label={t("admin.settings.email")} value={config.contact.email} onChange={(v) => update("contact", "email", v)} />
        </div>
      </section>

      {/* SEO / Metadata */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.seoMetadata" /></h2>
        <div className={styles.fields}>
          <Field label={t("admin.settings.siteTitle")} hint={t("admin.settings.siteTitleHint")} value={config.metadata.title} onChange={(v) => update("metadata", "title", v)} />
          <Field label={t("admin.settings.description")} hint={t("admin.settings.descriptionHint")} value={config.metadata.description} onChange={(v) => update("metadata", "description", v)} multiline />
          <TagField label={t("admin.settings.keywords")} hint={t("admin.settings.keywordsHint")} value={config.metadata.keywords} onChange={(v) => update("metadata", "keywords", v)} placeholder={t("admin.settings.tagPlaceholder")} />
          <Field label={t("admin.settings.author")} value={config.metadata.author} onChange={(v) => update("metadata", "author", v)} />
        </div>
      </section>

      {/* Footer */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.ctaFooter" /></h2>
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

      {/* BGM */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.bgm" /></h2>
        <div className={styles.fields}>
          <AudioUpload
            label={t("admin.settings.bgmFile")}
            hint={t("admin.settings.bgmUploadHint")}
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
