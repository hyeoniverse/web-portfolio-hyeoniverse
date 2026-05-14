"use client";

import type { Dispatch, SetStateAction } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import TextLink from "@/components/ui/TextLink";
import type { SiteConfigData } from "@/config/site.config";
import type { SettingsTabProps } from "../_types";
import { ColorField } from "./SettingsFormFields";
import FontSelect from "./FontSelect";
import SectionHeader from "./SectionHeader";
import { THEME_PRESETS } from "../_data/settingsConstants";
import styles from "../Settings.module.css";

interface AppearanceTabProps extends SettingsTabProps {
  setConfig: Dispatch<SetStateAction<SiteConfigData>>;
}

export default function AppearanceTab({ config, savedConfig, update, saveSection, savingPaths, setConfig }: AppearanceTabProps) {
  const { t } = useLanguage();

  const sh = { config, savedConfig, saveSection, savingPaths, titleClassName: styles.sectionTitle };

  return (
    <>
      {/* Design System Preview Link */}
      <section className={`${styles.section} ${styles.sectionWide}`}>
        <SectionHeader
          title={t("admin.settings.designSystem")}
          paths={[]}
          rowClassName={styles.sectionTitleRow}
          extra={<TextLink href="/design-system" external><T k="admin.settings.openDesignSystem" /> ↗</TextLink>}
          {...sh}
        />
        <p className={styles.sectionHint}>
          <T k="admin.settings.designSystemPreview" />
        </p>
      </section>

      {/* Theme Presets */}
      <section className={`${styles.section} ${styles.sectionWide}`}>
        <SectionHeader title={t("admin.settings.presets")} paths={["theme", "brand.logoColor", "brand.logoColorDark"]} {...sh} />
        <div className={styles.presetGrid}>
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className={`${styles.presetCard} ${
                config.theme.accentColor === preset.theme.accentColor &&
                config.theme.lightBg === preset.theme.lightBg &&
                config.theme.darkBg === preset.theme.darkBg
                  ? styles.presetCardActive
                  : ""
              }`}
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  theme: { ...preset.theme },
                  brand: {
                    ...prev.brand,
                    logoColor: preset.theme.lightText,
                    logoColorDark: preset.theme.darkText,
                  },
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
      <section className={styles.section} style={{ gridRow: "span 2", borderBottom: "none" }}>
        <SectionHeader title={t("admin.settings.themeColors")} paths={["theme"]} {...sh} />
        <div className={styles.fields}>
          <ColorField label={t("admin.settings.accentColor")} value={config.theme.accentColor} onChange={(v) => update("theme", "accentColor", v)} />
          <ColorField label={t("admin.settings.lightBg")} value={config.theme.lightBg} onChange={(v) => update("theme", "lightBg", v)} />
          <ColorField label={t("admin.settings.lightText")} value={config.theme.lightText} onChange={(v) => update("theme", "lightText", v)} />
          <ColorField label={t("admin.settings.darkBg")} value={config.theme.darkBg} onChange={(v) => update("theme", "darkBg", v)} />
          <ColorField label={t("admin.settings.darkText")} value={config.theme.darkText} onChange={(v) => update("theme", "darkText", v)} />
        </div>
      </section>

      {/* Date Picker Style */}
      <section className={styles.section}>
        <SectionHeader title={t("admin.settings.datePickerStyle")} paths={["datePickerStyle"]} {...sh} />
        <div className={styles.formatSegmentRow}>
          {(["spinner", "calendar"] as const).map((style) => (
            <button
              key={style}
              type="button"
              className={`${styles.formatSegmentBtn} ${config.datePickerStyle === style ? styles.formatSegmentBtnActive : ""}`}
              onClick={() => setConfig((prev) => ({ ...prev, datePickerStyle: style }))}
            >
              <T k={`admin.settings.datePicker${style.charAt(0).toUpperCase()}${style.slice(1)}`} />
            </button>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className={styles.section}>
        <SectionHeader
          title={t("admin.settings.typography")}
          paths={["typography"]}
          rowClassName={styles.sectionTitleRow}
          extra={<TextLink href="https://fonts.google.com" external>Google Fonts ↗</TextLink>}
          {...sh}
        />
        <p className={styles.sectionHint}>
          <T k="admin.settings.fontHint" />
        </p>
        <div className={styles.fields}>
          <FontSelect
            label={t("admin.settings.headingFont")}
            value={config.typography?.headingFont ?? "Instrument Serif"}
            options={["Instrument Serif", "Noto Serif KR", "Nanum Myeongjo", "Gowun Batang", "Hahmlet", "Playfair Display", "Cormorant Garamond", "Lora", "EB Garamond", "Merriweather"]}
            onChange={(v) => update("typography", "headingFont", v)}
          />
          <FontSelect
            label={t("admin.settings.bodyFont")}
            value={config.typography?.bodyFont ?? "Space Grotesk"}
            options={["Space Grotesk", "Noto Sans KR", "Gothic A1", "IBM Plex Sans KR", "Nanum Gothic", "Gowun Dodum", "Inter", "DM Sans", "Poppins", "Nunito"]}
            onChange={(v) => update("typography", "bodyFont", v)}
          />
          <FontSelect
            label={t("admin.settings.monoFont")}
            value={config.typography?.monoFont ?? "JetBrains Mono"}
            options={["JetBrains Mono", "Fira Code", "Source Code Pro", "IBM Plex Mono", "Roboto Mono", "Inconsolata", "Nanum Gothic Coding", "Ubuntu Mono", "DM Mono", "Courier Prime"]}
            onChange={(v) => update("typography", "monoFont", v)}
          />
        </div>
      </section>

    </>
  );
}
