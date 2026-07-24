"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import type { SettingsTabProps } from "../_types";
import Field, { UploadField, TagField } from "./SettingsFormFields";
import SectionHeader from "./SectionHeader";
import Select from "@/components/ui/Select";
import FieldRow from "@/components/ui/FieldRow";
import styles from "../Settings.module.css";

export default function GeneralTab({ config, savedConfig, update, saveSection, revertSection, resetSection, savingPaths }: SettingsTabProps) {
  const { t } = useLanguage();

  /** 공통 props 묶음 — SectionHeader 에 spread */
  const sh = { config, savedConfig, saveSection, revertSection, resetSection, savingPaths, titleClassName: styles.sectionTitle };

  return (
    <>
      {/* Personal — 2-col 배치 */}
      <section className={`${styles.section} ${styles.sectionWide}`}>
        <SectionHeader title={t("admin.settings.personal")} paths={["personal", "contact.email"]} {...sh} />
        <div className={`${styles.fields} ${styles.fieldsGrid2}`}>
          <Field label={t("admin.settings.name")} value={config.personal.name} onChange={(v) => update("personal", "name", v)} />
          <Field label={t("admin.settings.role")} value={config.personal.role} onChange={(v) => update("personal", "role", v)} />
          <Field label={t("admin.settings.nickname")} value={config.personal.nickname} onChange={(v) => update("personal", "nickname", v)} />
          <Field label={t("admin.settings.location")} value={config.personal.location} onChange={(v) => update("personal", "location", v)} />
          <Field label={t("admin.settings.status")} value={config.personal.status} onChange={(v) => update("personal", "status", v)} />
          <Field label={t("admin.settings.email")} value={config.contact.email} onChange={(v) => update("contact", "email", v)} maxHint={null} />
        </div>
      </section>

      {/* SEO / Metadata — 폼이 길어 2단에 넣으면 옆(BGM)이 비므로 전체 폭 세로 배치 */}
      <section className={`${styles.section} ${styles.sectionWide}`}>
        <SectionHeader title={t("admin.settings.seoMetadata")} paths={["metadata"]} {...sh} />
        <div className={styles.fields}>
          <Field label={t("admin.settings.siteTitle")} hint={t("admin.settings.siteTitleHint")} value={config.metadata.title} onChange={(v) => update("metadata", "title", v)} maxHint={60} />
          <Field label={t("admin.settings.description")} hint={t("admin.settings.descriptionHint")} value={config.metadata.description} onChange={(v) => update("metadata", "description", v)} multiline maxHint={160} />
          <TagField label={t("admin.settings.keywords")} hint={t("admin.settings.keywordsHint")} value={config.metadata.keywords} onChange={(v) => update("metadata", "keywords", v)} placeholder={t("admin.settings.tagPlaceholder")} size="md" />
          <Field label={t("admin.settings.author")} value={config.metadata.author} onChange={(v) => update("metadata", "author", v)} maxHint={80} />
          {/* Default Language — width:min Select (짧은 값이라 예외적으로 fit) */}
          <FieldRow
            label={t("admin.settings.defaultLanguage")}
            hint={t("admin.settings.defaultLanguageHint")}
          >
            <Select
              value={config.metadata.defaultLanguage}
              onChange={(v) => update("metadata", "defaultLanguage", v as "ko" | "en")}
              width="min"
              options={[
                { value: "ko", label: "한국어" },
                { value: "en", label: "English" },
              ]}
            />
          </FieldRow>
        </div>
      </section>

      {/* BGM */}
      <section className={styles.section}>
        <SectionHeader title={t("admin.settings.bgm")} paths={["bgm"]} {...sh} />
        <div className={styles.fields}>
          <UploadField
            kind="audio"
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
