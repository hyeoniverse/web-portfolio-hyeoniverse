"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import TextLink from "@/components/ui/TextLink";
import Checkbox from "@/components/ui/Checkbox";
import ColorPicker from "@/components/ui/ColorPicker";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import RadioGroup from "@/components/ui/RadioGroup";
import Select from "@/components/ui/Select";
import FontPicker from "@/components/ui/FontPicker";
import { FONT_GROUPS, FONT_FAMILIES_FLAT } from "@/components/posts/plate/constants";
import { showToast } from "@/stores/toastStore";
import type { SiteConfigData } from "@/config/site.config";
import type { SettingsTabProps } from "../_types";
import Field, { ColorField, LogoUpload } from "./SettingsFormFields";
import FontSelect from "./FontSelect";
import SectionHeader from "./SectionHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { THEME_PRESETS } from "../_data/settingsConstants";
import styles from "../Settings.module.css";

type LogoColorPreset = { name: string; light: string; dark: string };

/** logoColorPresets 가 config 에 없는 legacy 환경용 minimal fallback */
const LOGO_COLOR_PRESETS_FALLBACK: LogoColorPreset[] = [
  { name: "Default", light: "", dark: "" },
];

interface AppearanceTabProps extends SettingsTabProps {
  setConfig: Dispatch<SetStateAction<SiteConfigData>>;
}

export default function AppearanceTab({ config, savedConfig, update, saveSection, revertSection, resetSection, savingPaths, setConfig }: AppearanceTabProps) {
  const { t } = useLanguage();

  const sh = { config, savedConfig, saveSection, revertSection, resetSection, savingPaths, titleClassName: styles.sectionTitle };

  const presets: LogoColorPreset[] = config.brand.logoColorPresets ?? LOGO_COLOR_PRESETS_FALLBACK;
  const currentLight = config.brand.logoColor;
  const currentDark = config.brand.logoColorDark;
  const matchesExisting = presets.some((p) => p.light === currentLight && p.dark === currentDark);
  const canAddPreset = !matchesExisting && !!(currentLight || currentDark);

  const [addingPresetName, setAddingPresetName] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [addingThemePreset, setAddingThemePreset] = useState(false);
  const [newThemePresetName, setNewThemePresetName] = useState("");

  const addCurrentAsPreset = () => {
    const name = newPresetName.trim();
    if (!name || presets.some((p) => p.name === name)) return;
    update("brand", "logoColorPresets", [...presets, { name, light: currentLight, dark: currentDark }]);
    setNewPresetName("");
    setAddingPresetName(false);
  };

  const removePreset = (i: number) => {
    update("brand", "logoColorPresets", presets.filter((_, j) => j !== i));
  };

  return (
    <>
      {/* Design System Preview Link */}
      <section className={`${styles.section} ${styles.sectionWide}`}>
        <SectionHeader
          title={t("admin.settings.designSystem")}
          paths={[]}
          rowClassName={styles.sectionTitleRow}
          extra={<TextLink href="/design-system" external><T k="admin.settings.openDesignSystem" /></TextLink>}
          {...sh}
        />
        <p className={styles.sectionHint}>
          <T k="admin.settings.designSystemPreview" />
        </p>
      </section>

      {/* Theme Presets — built-in + 사용자 추가 */}
      <section className={`${styles.section} ${styles.sectionWide}`}>
        <SectionHeader title={t("admin.settings.presets")} paths={["theme", "brand.logoColor", "brand.logoColorDark"]} {...sh} />
        <div className={styles.presetGrid}>
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
                  <div key={`${preset.name}-${idx}`} className={styles.presetCardWrap}>
                    <button
                      type="button"
                      className={`${styles.presetCard} ${matchesCurrent(preset) ? styles.presetCardActive : ""}`}
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
                      <span className={styles.presetName}>{preset.name}</span>
                    </button>
                    {preset.removable && (
                      <button
                        type="button"
                        className={styles.presetCardRemove}
                        onClick={() => {
                          const next = userPresets.filter((_, i) => i !== idx - THEME_PRESETS.length);
                          update("theme", "presets", next);
                        }}
                        aria-label={`Remove ${preset.name}`}
                        title={t("admin.settings.removeThemePreset")}
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                ))}
                {/* 현재 테마가 어떤 preset 과도 다르면 "+" 버튼 → 이름 input 펼침 */}
                {canAdd && (
                  <button
                    type="button"
                    className={styles.presetCardAddBtn}
                    onClick={() => { setAddingThemePreset(true); showToast(t("admin.settings.enterPresetName"), "info"); }}
                    title={t("admin.settings.saveThemePreset")}
                    aria-label={t("admin.settings.saveThemePreset")}
                  >
                    <Plus size={16} strokeWidth={2} />
                  </button>
                )}
              </>
            );
          })()}
        </div>
      </section>

      {/* Theme Colors — 강조색은 단독 1행, 라이트(bg+text) / 다크(bg+text) 는 각각 2열 row */}
      <section className={styles.section} style={{ gridRow: "span 2", borderBottom: "none" }}>
        <SectionHeader title={t("admin.settings.themeColors")} paths={["theme"]} {...sh} />
        <div className={styles.fields}>
          {/* 강조색은 fieldPair 의 1번째 컬럼만 차지 (2번째 컬럼은 빈 공간) */}
          <div className={styles.fieldPair}>
            <ColorField label={t("admin.settings.accentColor")} value={config.theme.accentColor} onChange={(v) => update("theme", "accentColor", v)} />
          </div>
          <div className={styles.fieldPair}>
            <ColorField label={t("admin.settings.lightBg")} value={config.theme.lightBg} onChange={(v) => update("theme", "lightBg", v)} />
            <ColorField label={t("admin.settings.lightText")} value={config.theme.lightText} onChange={(v) => update("theme", "lightText", v)} />
          </div>
          <div className={styles.fieldPair}>
            <ColorField label={t("admin.settings.darkBg")} value={config.theme.darkBg} onChange={(v) => update("theme", "darkBg", v)} />
            <ColorField label={t("admin.settings.darkText")} value={config.theme.darkText} onChange={(v) => update("theme", "darkText", v)} />
          </div>
        </div>
        {/* 테마 프리셋 이름 input row — 테마 색상 .fields 바깥 (아래) 에 배치. 위 구분선 + 펼침/접힘 애니메이션 */}
        <AnimatePresence initial={false}>
          {addingThemePreset && (
            <motion.div
              key="theme-preset-add-row"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div className={styles.logoColorPresetAddRow}>
                <Input
                  className={styles.logoColorPresetNameInput}
                  placeholder={t("admin.settings.presetNamePlaceholder")}
                  value={newThemePresetName}
                  onChange={setNewThemePresetName}
                  autoFocus
                />
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
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
                  disabled={!newThemePresetName.trim()}
                >
                  {t("admin.settings.saveEdit")}
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => { setAddingThemePreset(false); setNewThemePresetName(""); }}
                >
                  {t("admin.settings.cancel")}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Brand — 로고 + Favicon */}
      <section className={`${styles.section} ${styles.sectionWide}`}>
        <SectionHeader title={t("admin.settings.brand")} paths={["brand"]} {...sh} />

        {/* Sub: 로고 텍스트 */}
        <div className={styles.subSection}>
          <div className={styles.sectionTitleRow}>
            <h3 className={styles.sectionSubTitle}>{t("admin.settings.logoTextSection")}</h3>
            <div className={styles.inlineToggleGroup}>
              <label className={styles.inlineToggle}>
                {t("admin.settings.logoGlitch")}
                <Checkbox checked={config.brand.logoGlitch} onChange={(v) => update("brand", "logoGlitch", v)} shape="square" />
              </label>
              <label className={styles.inlineToggle}>
                {t("admin.settings.logoDifference")}
                <Checkbox checked={config.brand.logoDifference !== false} onChange={(v) => update("brand", "logoDifference", v)} shape="square" />
              </label>
            </div>
          </div>
          <div className={styles.fields}>
            <div className={styles.fieldPair}>
              <Field label={t("admin.settings.logoText")} hint={t("admin.settings.logoTextHint")} value={config.brand.logoText} onChange={(v) => update("brand", "logoText", v)} />
              <Field label={t("admin.settings.logoFullText")} hint={t("admin.settings.logoFullTextHint")} value={config.brand.logoFullText} onChange={(v) => update("brand", "logoFullText", v)} />
            </div>
          </div>
        </div>

        {/* Sub: 로고 색상 */}
        <div className={styles.subSection}>
          <h3 className={styles.sectionSubTitle}>{t("admin.settings.logoColorSection")}</h3>
          <div className={styles.fields}>
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}>{t("admin.settings.logoColorPresets")}</label>
            <div className={styles.logoColorPresets}>
              {presets.map((p, i) => (
                <div key={`${p.name}-${i}`} className={styles.logoColorPresetWrap}>
                  <button
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
                  {presets.length > 1 && (
                    <button
                      type="button"
                      className={styles.logoColorPresetRemove}
                      onClick={() => removePreset(i)}
                      aria-label={`Remove ${p.name}`}
                      title="프리셋 제거"
                    >
                      <X size={10} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              ))}
              {canAddPreset && (
                <button
                  type="button"
                  className={styles.logoColorPresetAddBtn}
                  onClick={() => { setAddingPresetName(true); showToast(t("admin.settings.enterPresetName"), "info"); }}
                  title={t("admin.settings.savePreset")}
                  aria-label={t("admin.settings.savePreset")}
                >
                  <Plus size={14} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
          <div className={styles.fieldPair}>
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>{t("admin.settings.logoColor")}</label>
              <div className={styles.colorField}>
                <ColorPicker value={config.brand.logoColor || "#000000"} onChange={(c) => update("brand", "logoColor", c.hex)} triggerClassName={styles.colorPicker} />
                <Input
                  className={styles.colorInput}
                  value={config.brand.logoColor || "#000000"}
                  onChange={(v) => update("brand", "logoColor", v)}
                  placeholder={t("admin.settings.logoColorPlaceholder")}
                  maxLength={7}
                />
              </div>
            </div>
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>{t("admin.settings.logoColorDark")}</label>
              <div className={styles.colorField}>
                <ColorPicker value={config.brand.logoColorDark || "#ffffff"} onChange={(c) => update("brand", "logoColorDark", c.hex)} triggerClassName={styles.colorPicker} />
                <Input
                  className={styles.colorInput}
                  value={config.brand.logoColorDark || "#ffffff"}
                  onChange={(v) => update("brand", "logoColorDark", v)}
                  placeholder={t("admin.settings.logoColorPlaceholder")}
                  maxLength={7}
                />
              </div>
            </div>
          </div>
          </div>
          {/* 프리셋 이름 입력 row — .fields 바깥, 위 구분선 + AnimatePresence (펼침/접힘 height/opacity 애니메이션) */}
          <AnimatePresence initial={false}>
            {addingPresetName && (
              <motion.div
                key="preset-add-row"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div className={styles.logoColorPresetAddRow}>
                  <Input
                    className={styles.logoColorPresetNameInput}
                    placeholder={t("admin.settings.presetNamePlaceholder")}
                    value={newPresetName}
                    onChange={setNewPresetName}
                    autoFocus
                  />
                  <Button
                    variant="outline"
                    size="md"
                    onClick={addCurrentAsPreset}
                    disabled={!newPresetName.trim() || presets.some((p) => p.name === newPresetName.trim())}
                  >
                    {t("admin.settings.saveEdit")}
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => { setAddingPresetName(false); setNewPresetName(""); }}
                  >
                    {t("admin.settings.cancel")}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sub: Favicon */}
        <div className={styles.subSection}>
          <h3 className={styles.sectionSubTitle}>{t("admin.settings.faviconSection")}</h3>
          <div className={styles.fields}>
            <div className={styles.faviconLayout}>
              <div className={styles.faviconPreviewSlot}>
                {(["light", "dark"] as const).map((variant) => {
                  const shape = config.brand.faviconShape ?? "circle";
                  const weight = config.brand.faviconWeight ?? "light";
                  // 로고 폰트가 favicon 도 결정 — 빈 값이면 brand 기본 (Instrument Serif)
                  const fontFamily = config.brand.logoFont || "'Instrument Serif', Georgia, serif";
                  const fontWeight = weight === "light" ? 300 : weight === "regular" ? 500 : 700;
                  const presetLight = config.brand.logoColor || config.theme.lightText;
                  const presetDark = config.brand.logoColorDark || config.theme.darkText;
                  const faviconBgLight = config.brand.faviconBgLight || presetDark;
                  const faviconBgDark = config.brand.faviconBgDark || presetLight;
                  const bgColor = variant === "light" ? faviconBgLight : faviconBgDark;
                  const fgColor = shape === "none"
                    ? (variant === "light" ? presetDark : presetLight)
                    : (variant === "light" ? presetLight : presetDark);
                  const radius = shape === "circle" ? 16 : shape === "square" ? 4 : 0;
                  const logoText = ((config.brand.logoText || "H").trim() || "H").charAt(0);
                  // 장평 — viewBox 중심 (16,16) 기준 scaleX. 빈/invalid 면 0.8 default
                  const stretchRaw = parseFloat(config.brand.logoFontStretch ?? "");
                  const stretchN = Number.isFinite(stretchRaw) && stretchRaw > 0 ? stretchRaw : 0.8;
                  const textTransform = stretchN !== 1 ? `translate(${16 * (1 - stretchN)} 0) scale(${stretchN} 1)` : undefined;
                  return (
                    <div key={variant} className={styles.faviconPreviewCell}>
                      <svg
                        className={styles.faviconPreview}
                        viewBox="0 0 32 32"
                        width="48"
                        height="48"
                        aria-hidden
                        style={shape === "none" ? { border: "1px dashed var(--border-light-color)", borderRadius: 4 } : undefined}
                      >
                        {shape !== "none" && (
                          <rect x="0" y="0" width="32" height="32" rx={radius} ry={radius} fill={bgColor} />
                        )}
                        <text
                          x="50%"
                          y="50%"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontFamily={fontFamily}
                          fontSize="20"
                          fontWeight={fontWeight}
                          fill={fgColor}
                          transform={textTransform}
                        >
                          {logoText}
                        </text>
                      </svg>
                      <span className={styles.faviconPreviewLabel}>{variant}</span>
                    </div>
                  );
                })}
              </div>
              <div className={styles.faviconControls}>
                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>{t("admin.settings.faviconShape")}</label>
                  <RadioGroup<"circle" | "square" | "none">
                    value={(config.brand.faviconShape ?? "circle") as "circle" | "square" | "none"}
                    onChange={(v) => update("brand", "faviconShape", v)}
                    options={[
                      { value: "circle", label: "Circle" },
                      { value: "square", label: "Square" },
                      { value: "none", label: "None" },
                    ]}
                  />
                </div>
                {/* 로고 폰트 — 로고와 favicon 둘 다 결정. FontPicker (Google Fonts 검색 + 부분매칭). */}
                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>{t("admin.settings.logoFont")}</label>
                  <FontPicker
                    value={config.brand.logoFont ?? ""}
                    onChange={(v) => update("brand", "logoFont", v)}
                    groups={FONT_GROUPS}
                    triggerClassName={styles.fontPickerSelect}
                    dropdownClassName={styles.fontPickerDropdown}
                    renderValue={() => {
                      const v = config.brand.logoFont ?? "";
                      const matched = FONT_FAMILIES_FLAT.find((f) => f.value === v);
                      const label = matched
                        ? matched.label
                        : v.replace(/["']/g, "").split(",")[0].trim();
                      return <span style={{ fontFamily: v }}>{label}</span>;
                    }}
                    resolveMatch={(v, entries) => {
                      if (!v) return "";
                      if (entries.some((e) => e.value === v)) return v;
                      const normalized = v.replace(/["']/g, "").split(",")[0].trim();
                      const byName = entries.find((e) => e.label.toLowerCase() === normalized.toLowerCase());
                      return byName ? byName.value : "";
                    }}
                    toGoogleValue={(name) => `'${name}', sans-serif`}
                  />
                </div>
                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>{t("admin.settings.faviconWeight")}</label>
                  <RadioGroup<"light" | "regular" | "bold">
                    value={(config.brand.faviconWeight ?? "light") as "light" | "regular" | "bold"}
                    onChange={(v) => update("brand", "faviconWeight", v)}
                    options={[
                      { value: "light", label: "Light" },
                      { value: "regular", label: "Regular" },
                      { value: "bold", label: "Bold" },
                    ]}
                  />
                </div>
                {/* 장평 — 폰트 가로 너비 (scaleX 배수). 로고/favicon 모두 적용. 더블클릭 시 자유 입력 */}
                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>{t("admin.settings.logoFontStretch")}</label>
                  <Select
                    value={config.brand.logoFontStretch ?? "0.8"}
                    onChange={(v) => update("brand", "logoFontStretch", v)}
                    editable
                    editableInputProps={{ placeholder: t("admin.settings.logoFontStretchPlaceholder"), maxLength: 8 }}
                    options={[
                      { value: "0.8", label: "0.8 (-20%)" },
                      { value: "0.9", label: "0.9 (-10%)" },
                      { value: "1", label: "1.0" },
                      { value: "1.1", label: "1.1 (+10%)" },
                      { value: "1.2", label: "1.2 (+20%)" },
                    ]}
                  />
                </div>
                <div className={styles.faviconBgRow}>
                  <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>{t("admin.settings.faviconBgLight")}</label>
                    <div className={styles.colorField}>
                      <ColorPicker
                        value={config.brand.faviconBgLight || config.brand.logoColorDark || "#f5f5f0"}
                        onChange={(c) => update("brand", "faviconBgLight", c.hex)}
                        triggerClassName={styles.colorPicker}
                      />
                      <Input
                        className={styles.colorInput}
                        value={config.brand.faviconBgLight}
                        onChange={(v) => update("brand", "faviconBgLight", v)}
                        placeholder={t("admin.settings.faviconBgPlaceholder")}
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>{t("admin.settings.faviconBgDark")}</label>
                    <div className={styles.colorField}>
                      <ColorPicker
                        value={config.brand.faviconBgDark || config.brand.logoColor || "#0a0a0a"}
                        onChange={(c) => update("brand", "faviconBgDark", c.hex)}
                        triggerClassName={styles.colorPicker}
                      />
                      <Input
                        className={styles.colorInput}
                        value={config.brand.faviconBgDark}
                        onChange={(v) => update("brand", "faviconBgDark", v)}
                        placeholder={t("admin.settings.faviconBgPlaceholder")}
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sub: 로고 파일 — Light / Dark 그룹 */}
        <div className={styles.subSection}>
          <div className={styles.sectionTitleRow}>
            <h3 className={styles.sectionSubTitle}>
              {t("admin.settings.logoFilesSection")}
              <span className={styles.fieldGroupTitleHint}>{t("admin.settings.logoUploadHint")}</span>
            </h3>
            {/* 4개 URL 한 번에 비우기 → 텍스트 로고 (logoText/logoFullText) 로 자동 fallback */}
            {(config.brand.logoShortUrl || config.brand.logoShortDarkUrl || config.brand.logoFullUrl || config.brand.logoFullDarkUrl) && (
              <Button
                variant="outline"
                size="md"
                onClick={() => setConfig((prev) => ({
                  ...prev,
                  brand: {
                    ...prev.brand,
                    logoShortUrl: "",
                    logoShortDarkUrl: "",
                    logoFullUrl: "",
                    logoFullDarkUrl: "",
                  },
                }))}
              >
                {t("admin.settings.useDefaultLogo")}
              </Button>
            )}
          </div>
          <div className={styles.fields}>
            <div>
              <h4 className={styles.fieldGroupTitle}>{t("admin.settings.logoLightMode")}</h4>
              <div className={styles.fieldPair}>
                <LogoUpload label={t("admin.settings.logoShort")} url={config.brand.logoShortUrl} uploadLabel={t("admin.settings.uploadLogo")} removeLabel={t("admin.settings.removeLogo")} onUploaded={(url) => update("brand", "logoShortUrl", url)} onRemove={() => update("brand", "logoShortUrl", "")} />
                <LogoUpload label={t("admin.settings.logoFull")} url={config.brand.logoFullUrl} uploadLabel={t("admin.settings.uploadLogo")} removeLabel={t("admin.settings.removeLogo")} onUploaded={(url) => update("brand", "logoFullUrl", url)} onRemove={() => update("brand", "logoFullUrl", "")} />
              </div>
            </div>
            <div>
              <h4 className={styles.fieldGroupTitle}>
                {t("admin.settings.logoDarkMode")}
                <span className={styles.fieldGroupTitleHint}>{t("admin.settings.logoDarkHint")}</span>
              </h4>
              <div className={styles.fieldPair}>
                <LogoUpload label={t("admin.settings.logoShort")} url={config.brand.logoShortDarkUrl} uploadLabel={t("admin.settings.uploadLogo")} removeLabel={t("admin.settings.removeLogo")} onUploaded={(url) => update("brand", "logoShortDarkUrl", url)} onRemove={() => update("brand", "logoShortDarkUrl", "")} />
                <LogoUpload label={t("admin.settings.logoFull")} url={config.brand.logoFullDarkUrl} uploadLabel={t("admin.settings.uploadLogo")} removeLabel={t("admin.settings.removeLogo")} onUploaded={(url) => update("brand", "logoFullDarkUrl", url)} onRemove={() => update("brand", "logoFullDarkUrl", "")} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Date Picker Style */}
      <section className={styles.section}>
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
      <section className={styles.section}>
        <SectionHeader
          title={t("admin.settings.typography")}
          paths={["typography"]}
          rowClassName={styles.sectionTitleRow}
          extra={<TextLink href="https://fonts.google.com" external>Google Fonts</TextLink>}
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
