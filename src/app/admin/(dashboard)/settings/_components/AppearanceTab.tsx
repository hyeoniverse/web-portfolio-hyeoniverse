"use client";

import type { Dispatch, SetStateAction } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import type { SiteConfigData } from "@/config/site.config";
import type { SettingsTabProps } from "../_types";
import { ColorField } from "./SettingsFormFields";
import FontSelect from "./FontSelect";
import { THEME_PRESETS } from "../_data/settingsConstants";
import styles from "../Settings.module.css";

interface AppearanceTabProps extends SettingsTabProps {
  setConfig: Dispatch<SetStateAction<SiteConfigData>>;
}

export default function AppearanceTab({ config, update, setConfig }: AppearanceTabProps) {
  const { t } = useLanguage();

  return (
    <>
      {/* Theme Presets */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("admin.settings.presets")}</h2>
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

      {/* Typography */}
      <section className={styles.section}>
        <div className={styles.sectionTitleRow}>
          <h2 className={styles.sectionTitle}>{t("admin.settings.typography")}</h2>
          <a
            href="https://fonts.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.hintLink}
          >
            Google Fonts ↗
          </a>
        </div>
        <p className={styles.sectionHint}>
          프리셋에서 선택하거나, 직접 입력란에 Google Fonts 이름을 입력하세요. (예: Roboto, Nanum Gothic)
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
