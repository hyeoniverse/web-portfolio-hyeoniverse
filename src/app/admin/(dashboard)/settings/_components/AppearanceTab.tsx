"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Plus, X } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import TextLink from "@/components/ui/TextLink";
import { showToast } from "@/stores/toastStore";
import type { SiteConfigData } from "@/config/site.config";
import type { SettingsTabProps } from "../_types";
import { ColorField } from "./SettingsFormFields";
import FontSelect from "./FontSelect";
import CustomFontsField from "./CustomFontsField";
import SectionHeader from "./SectionHeader";
import BrandSection from "./BrandSection";
import { PresetNameAddRow } from "./FaviconControls";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { THEME_PRESETS } from "../_data/settingsConstants";
import styles from "./AppearanceTab.module.css";
import shared from "../Settings.module.css";
import Pressable from "@/components/ui/Pressable";

interface AppearanceTabProps extends SettingsTabProps {
  setConfig: Dispatch<SetStateAction<SiteConfigData>>;
}

export default function AppearanceTab({ config, savedConfig, update, saveSection, revertSection, resetSection, savingPaths, setConfig, validationError }: AppearanceTabProps) {
  const { t } = useLanguage();

  const sh = { config, savedConfig, saveSection, revertSection, resetSection, savingPaths, validationError, titleClassName: shared.sectionTitle };

  const [addingThemePreset, setAddingThemePreset] = useState(false);
  const [newThemePresetName, setNewThemePresetName] = useState("");

  return (
    <>
      {/* Design System Preview Link */}
      <section className={`${shared.section} ${shared.sectionWide}`}>
        <SectionHeader
          title={t("admin.settings.designSystem")}
          paths={[]}
          customActions={
            <div className={styles.dsActions}>
              <span className={styles.dsHint}><T k="admin.settings.designSystemPreview" /></span>
              <span className={styles.dsDivider} aria-hidden />
              <TextLink className={shared.dsLink} href="/design-system" external><T k="admin.settings.openDesignSystem" /></TextLink>
            </div>
          }
          {...sh}
        />
      </section>

      {/* Theme Colors — 프리셋(빠른 선택) + 개별 색상 미세조정 통합.
          프리셋 선택은 theme + brand.logoColor 를 함께 바꾸므로 섹션 paths 에 포함. */}
      <section className={`${shared.section} ${shared.sectionWide}`}>
        <SectionHeader title={t("admin.settings.themeColors")} paths={["theme", "brand.logoColor", "brand.logoColorDark"]} {...sh} />
        {/* 프리셋 빠른 선택 (테마색 + 로고색 한 번에) */}
        <div className={shared.presetGrid}>
          {(() => {
            const userPresets = config.theme.presets ?? [];
            const allPresets = [
              ...THEME_PRESETS.map((p) => ({ ...p, removable: false })),
              ...userPresets.map((p) => ({ ...p, removable: true })),
            ];
            const matchesCurrent = (p: typeof allPresets[number]) =>
              config.theme.accentColor === p.theme.accentColor &&
              config.theme.lightBg === p.theme.lightBg &&
              config.theme.darkBg === p.theme.darkBg &&
              config.theme.lightText === p.theme.lightText &&
              config.theme.darkText === p.theme.darkText;
            const anyMatch = allPresets.some(matchesCurrent);
            const canAdd = !anyMatch;
            return (
              <>
                {allPresets.map((preset, idx) => (
                  <div key={`${preset.name}-${idx}`} className={shared.presetCardWrap}>
                    <Pressable
                      className={`${shared.presetCard} ${matchesCurrent(preset) ? shared.presetCardActive : ""}`}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, ...preset.theme },
                          brand: {
                            ...prev.brand,
                            logoColor: preset.theme.lightText,
                            logoColorDark: preset.theme.darkText,
                          },
                        }))
                      }
                    >
                      <div className={styles.presetSwatches}>
                        <span className={styles.presetSwatch} style={{ background: preset.theme.darkBg }} />
                        <span className={styles.presetSwatch} style={{ background: preset.theme.accentColor }} />
                        <span className={styles.presetSwatch} style={{ background: preset.theme.lightBg }} />
                      </div>
                      <span className={shared.presetName}>{preset.name}</span>
                    </Pressable>
                    {preset.removable && (
                      <Pressable
                        className={shared.presetCardRemove}
                        onClick={() => {
                          const next = userPresets.filter((_, i) => i !== idx - THEME_PRESETS.length);
                          update("theme", "presets", next);
                        }}
                        aria-label={`Remove ${preset.name}`}
                        title={t("admin.settings.removeThemePreset")}
                      >
                        <X size={10} strokeWidth={2.5} />
                      </Pressable>
                    )}
                  </div>
                ))}
                {/* 현재 테마가 어떤 preset 과도 다르면 "+" 버튼 → 이름 input 펼침 */}
                {canAdd && (
                  <Pressable
                    className={styles.presetCardAddBtn}
                    onClick={() => { setAddingThemePreset(true); showToast(t("admin.settings.enterPresetName"), "info"); }}
                    title={t("admin.settings.saveThemePreset")}
                    aria-label={t("admin.settings.saveThemePreset")}
                  >
                    <Plus size={16} strokeWidth={2} />
                  </Pressable>
                )}
              </>
            );
          })()}
        </div>
        {/* 개별 색상 미세조정 — 강조색 단독 1행, 라이트(bg+text) / 다크(bg+text) 각각 2열 */}
        <div className={shared.fields}>
          {/* 강조색은 fieldPair 의 1번째 컬럼만 차지 (2번째 컬럼은 빈 공간) */}
          <div className={shared.fieldPair}>
            <ColorField label={t("admin.settings.accentColor")} value={config.theme.accentColor} onChange={(v) => update("theme", "accentColor", v)} />
          </div>
          <div className={shared.fieldPair}>
            <ColorField label={t("admin.settings.lightBg")} value={config.theme.lightBg} onChange={(v) => update("theme", "lightBg", v)} />
            <ColorField label={t("admin.settings.lightText")} value={config.theme.lightText} onChange={(v) => update("theme", "lightText", v)} />
          </div>
          <div className={shared.fieldPair}>
            <ColorField label={t("admin.settings.darkBg")} value={config.theme.darkBg} onChange={(v) => update("theme", "darkBg", v)} />
            <ColorField label={t("admin.settings.darkText")} value={config.theme.darkText} onChange={(v) => update("theme", "darkText", v)} />
          </div>
        </div>
        {/* 테마 프리셋 이름 input row — 테마 색상 .fields 바깥 (아래) 에 배치 */}
        <PresetNameAddRow
          open={addingThemePreset}
          value={newThemePresetName}
          onChange={setNewThemePresetName}
          saveDisabled={!newThemePresetName.trim()}
          onCancel={() => { setAddingThemePreset(false); setNewThemePresetName(""); }}
          onSave={() => {
            const name = newThemePresetName.trim();
            const userPresets = config.theme.presets ?? [];
            if (!name || userPresets.some((p) => p.name === name) || THEME_PRESETS.some((p) => p.name === name)) return;
            update("theme", "presets", [
              ...userPresets,
              {
                name,
                theme: {
                  accentColor: config.theme.accentColor,
                  lightBg: config.theme.lightBg,
                  lightText: config.theme.lightText,
                  darkBg: config.theme.darkBg,
                  darkText: config.theme.darkText,
                },
              },
            ]);
            setNewThemePresetName("");
            setAddingThemePreset(false);
          }}
          t={t}
        />
      </section>

      <BrandSection
        config={config}
        savedConfig={savedConfig}
        update={update}
        saveSection={saveSection}
        revertSection={revertSection}
        resetSection={resetSection}
        savingPaths={savingPaths}
        setConfig={setConfig}
        validationError={validationError}
      />

      {/* Date Picker Style — 노트북/PC(2열)에서 마지막 행 좌측이라 하단 border 제거 */}
      <section className={`${shared.section} ${styles.sectionFlushDesktop}`}>
        <SectionHeader title={t("admin.settings.datePickerStyle")} paths={["datePickerStyle"]} {...sh} />
        <SegmentedControl<"spinner" | "calendar">
          items={[
            { value: "spinner", label: <T k="admin.settings.datePickerSpinner" /> },
            { value: "calendar", label: <T k="admin.settings.datePickerCalendar" /> },
          ]}
          value={config.datePickerStyle as "spinner" | "calendar"}
          onChange={(v) => setConfig((prev) => ({ ...prev, datePickerStyle: v }))}
        />
      </section>

      {/* Typography */}
      <section className={shared.section}>
        <SectionHeader
          title={t("admin.settings.typography")}
          paths={["typography"]}
          extra={<TextLink href="https://fonts.google.com" external>Google Fonts</TextLink>}
          {...sh}
        />
        <p className={shared.sectionHint}>
          <T k="admin.settings.fontHint" />
        </p>
        <div className={shared.fields}>
          <FontSelect
            label={t("admin.settings.headingFont")}
            value={config.typography?.headingFont ?? "Instrument Serif"}
            onChange={(v) => update("typography", "headingFont", v)}
          />
          <FontSelect
            label={t("admin.settings.bodyFont")}
            value={config.typography?.bodyFont ?? "Space Grotesk"}
            onChange={(v) => update("typography", "bodyFont", v)}
          />
          <FontSelect
            label={t("admin.settings.monoFont")}
            value={config.typography?.monoFont ?? "JetBrains Mono"}
            onChange={(v) => update("typography", "monoFont", v)}
          />
        </div>
        {/* 커스텀 폰트 — 업로드(Storage) + public/fonts 스캔. 위 3개 선택 + 로고·에디터 FontPicker 전체에 노출.
            라벨과 필드를 한 블록으로 묶는다 — 그리드 형제로 두면 라벨 margin-bottom 에 섹션 row-gap 까지
            더해져 사이가 두 배로 벌어진다 */}
        <div className={styles.customFontsBlock}>
          <p className={`${shared.sectionHint} ${styles.customFontsLabel}`}>
            <T k="admin.settings.customFontsLabel" />
          </p>
          <CustomFontsField
            fonts={config.typography?.customFonts ?? []}
            onChange={(v) => update("typography", "customFonts", v)}
          />
        </div>
      </section>

    </>
  );
}
