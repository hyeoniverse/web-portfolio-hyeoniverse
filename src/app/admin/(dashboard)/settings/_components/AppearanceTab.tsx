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
import { Switch } from "@/components/ui/Switch";
import NumberInput from "@/components/ui/NumberInput";
import FieldRow from "@/components/ui/FieldRow";
import FontPicker from "@/components/ui/FontPicker";
import {
  resolveFavicon,
  resolveFaviconFontSize,
  FaviconFilter,
  FAVICON_SHADOW_DIRECTIONS,
  DEFAULT_FAVICON_TEXT_SHADOW,
  DEFAULT_FAVICON_BG_SHADOW,
  type FaviconShape,
  type FaviconWeight,
  type FaviconShadow,
  type FaviconShadowSize,
} from "@/lib/favicon";
import { contrastRatio, contrastLevel } from "@/utils/contrast";
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

/** favicon 폰트 크기 프리셋 (px). 이 목록에 없는 값이면 "직접 입력"(stepper) 모드 */
const FAVICON_FONT_SIZE_PRESETS = ["14", "18", "20", "24", "28"];

/** 텍스트/배경 그림자 각각의 on·off / inset / size / custom blur / 색상 컨트롤 */
function FaviconShadowControls({
  label,
  value,
  onChange,
  t,
}: {
  label: string;
  value: FaviconShadow;
  onChange: (v: FaviconShadow) => void;
  t: (key: string) => string;
}) {
  return (
    <div className={styles.faviconShadowCard}>
      <div className={styles.faviconShadowHead}>
        <span className={styles.faviconShadowTitle}>{label}</span>
        <Switch
          checked={value.enabled}
          onCheckedChange={(v) => onChange({ ...value, enabled: v })}
          showStateText
          size="lg"
          variant="accent"
        />
      </div>
      {value.enabled && (
        <div className={styles.faviconShadowBody}>
          <FieldRow label={t("admin.settings.faviconShadowSize")}>
            <Select
              value={value.size}
              onChange={(v) => onChange({ ...value, size: v as FaviconShadowSize })}
              width="min"
              options={[
                { value: "sm", label: "S" },
                { value: "md", label: "M" },
                { value: "lg", label: "L" },
                { value: "custom", label: t("admin.settings.faviconShadowSizeCustom") },
              ]}
            />
          </FieldRow>
          {value.size === "custom" && (
            <FieldRow label={t("admin.settings.faviconShadowCustom")}>
              <Input
                value={value.custom}
                onChange={(v) => onChange({ ...value, custom: v })}
                placeholder={t("admin.settings.faviconShadowCustomPlaceholder")}
                maxLength={4}
              />
            </FieldRow>
          )}
          {/* 방향 — 8방향 세그먼트 (나침반식: 0=위, 시계방향). 화살표와 실제 그림자 방향 일치 */}
          <FieldRow label={t("admin.settings.faviconShadowDirection")}>
            <SegmentedControl<string>
              size="sm"
              className={styles.faviconDirControl}
              items={FAVICON_SHADOW_DIRECTIONS.map((d) => ({ value: d.value, label: d.arrow }))}
              value={value.angle || "135"}
              onChange={(v) => onChange({ ...value, angle: v })}
            />
          </FieldRow>
          <label className={styles.inlineToggle}>
            {t("admin.settings.faviconShadowInset")}
            <Checkbox checked={value.inset} onChange={(v) => onChange({ ...value, inset: v })} shape="square" />
          </label>
          <FieldRow label={t("admin.settings.faviconShadowColor")}>
            <div className={styles.colorField}>
              <ColorPicker
                value={value.color || "rgba(0,0,0,0.4)"}
                onChange={(c) => onChange({ ...value, color: c.hex })}
                triggerClassName={styles.colorPicker}
              />
              <Input
                className={styles.colorInput}
                value={value.color}
                onChange={(v) => onChange({ ...value, color: v })}
                placeholder={t("admin.settings.faviconShadowColorPlaceholder")}
              />
            </div>
          </FieldRow>
        </div>
      )}
    </div>
  );
}

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
  // favicon 폰트 크기 — 프리셋 Select + "직접 입력"(stepper) 하이브리드. 초기값이 프리셋에 없으면 커스텀 모드.
  const [fontSizeCustom, setFontSizeCustom] = useState(
    () => !FAVICON_FONT_SIZE_PRESETS.includes(config.brand.faviconFontSize ?? "20"),
  );

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
              <Field label={t("admin.settings.logoText")} hint={t("admin.settings.logoTextHint")} value={config.brand.logoText} onChange={(v) => update("brand", "logoText", v)} maxLength={4} maxHint={4} />
              <Field label={t("admin.settings.logoFullText")} hint={t("admin.settings.logoFullTextHint")} value={config.brand.logoFullText} onChange={(v) => update("brand", "logoFullText", v)} maxLength={20} maxHint={20} />
            </div>
          </div>
        </div>

        {/* Sub: 로고 색상 */}
        <div className={styles.subSection}>
          <h3 className={styles.sectionSubTitle}>{t("admin.settings.logoColorSection")}</h3>
          <div className={styles.fields}>
          <FieldRow label={t("admin.settings.logoColorPresets")}>
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
          </FieldRow>
          <div className={styles.fieldPair}>
            <FieldRow label={t("admin.settings.logoColor")}>
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
            </FieldRow>
            <FieldRow label={t("admin.settings.logoColorDark")}>
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
            </FieldRow>
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
                  // preset 색 — 미리보기는 theme.lightText/darkText 로 fallback (route.ts 와 동일 계산 구조)
                  const presetLight = config.brand.logoColor || config.theme.lightText;
                  const presetDark = config.brand.logoColorDark || config.theme.darkText;
                  const render = resolveFavicon(
                    {
                      shape: (config.brand.faviconShape ?? "circle") as FaviconShape,
                      weight: (config.brand.faviconWeight ?? "light") as FaviconWeight,
                      logoText: config.brand.logoText ?? "H",
                      logoFont: config.brand.logoFont ?? "",
                      logoFontStretch: config.brand.logoFontStretch ?? "",
                      faviconBgLight: config.brand.faviconBgLight ?? "",
                      faviconBgDark: config.brand.faviconBgDark ?? "",
                      faviconFontSize: config.brand.faviconFontSize ?? "20",
                      faviconColor: config.brand.faviconColor ?? "",
                      faviconColorDark: config.brand.faviconColorDark ?? "",
                      faviconTextShadow: config.brand.faviconTextShadow ?? DEFAULT_FAVICON_TEXT_SHADOW,
                      faviconBgShadow: config.brand.faviconBgShadow ?? DEFAULT_FAVICON_BG_SHADOW,
                      presetLight,
                      presetDark,
                    },
                    variant,
                  );
                  const textShadowId = `favicon-text-shadow-${variant}`;
                  const bgShadowId = `favicon-bg-shadow-${variant}`;
                  // 대비율 — 배경 있을 때만(글자색 vs 배경색). shape=none 이면 배경 없어 N/A
                  const ratio = render.hasBg ? contrastRatio(render.fgColor, render.bgColor) : null;
                  const level = ratio != null ? contrastLevel(ratio) : null;
                  return (
                    <div key={variant} className={styles.faviconPreviewCell}>
                      <svg
                        className={styles.faviconPreview}
                        viewBox="0 0 32 32"
                        width="48"
                        height="48"
                        aria-hidden
                        style={render.shape === "none" ? { border: "1px dashed var(--border-light-color)", borderRadius: 4 } : undefined}
                      >
                        {(render.textShadow || render.bgShadow) && (
                          <defs>
                            {render.bgShadow && <FaviconFilter resolved={render.bgShadow} id={bgShadowId} />}
                            {render.textShadow && <FaviconFilter resolved={render.textShadow} id={textShadowId} />}
                          </defs>
                        )}
                        {render.hasBg && (
                          <rect
                            x="0"
                            y="0"
                            width="32"
                            height="32"
                            rx={render.radius}
                            ry={render.radius}
                            fill={render.bgColor}
                            filter={render.bgShadow ? `url(#${bgShadowId})` : undefined}
                          />
                        )}
                        <text
                          x="50%"
                          y="50%"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontFamily={render.fontFamily}
                          fontSize={render.fontSize}
                          fontWeight={render.fontWeight}
                          fill={render.fgColor}
                          transform={render.transform}
                          filter={render.textShadow ? `url(#${textShadowId})` : undefined}
                        >
                          {render.logoText}
                        </text>
                      </svg>
                      <span className={styles.faviconPreviewLabel}>{variant}</span>
                      {/* 대비율 + WCAG 배지 — favicon 은 그래픽 글리프라 3:1(1.4.11)이 실질 최소 */}
                      <span className={styles.faviconContrast}>
                        {!render.hasBg ? (
                          <span className={styles.faviconContrastMuted}>
                            {t("admin.settings.faviconContrastNoBg")}
                          </span>
                        ) : ratio == null || level == null ? (
                          <span className={styles.faviconContrastMuted}>—</span>
                        ) : (
                          <>
                            <span className={styles.faviconContrastRatio}>{ratio.toFixed(2)}:1</span>
                            <span
                              className={`${styles.faviconContrastBadge} ${level === "fail" ? styles.faviconContrastFail : styles.faviconContrastPass}`}
                              title={t(`admin.settings.faviconContrast_${level}`)}
                            >
                              {t(`admin.settings.faviconContrast_${level}`)}
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className={styles.faviconControls}>
                <FieldRow label={t("admin.settings.faviconShape")}>
                  <RadioGroup<"circle" | "square" | "none">
                    value={(config.brand.faviconShape ?? "circle") as "circle" | "square" | "none"}
                    onChange={(v) => {
                      const prev = (config.brand.faviconShape ?? "circle") as FaviconShape;
                      // 배경 있던(circle/square) → none 전환 시, 텍스트가 배경 없이 떠서 대비가 필요.
                      // 텍스트 그림자가 꺼져 있으면 자동으로 켜준다 (이미 켜져 있으면 그대로).
                      if (v === "none" && prev !== "none") {
                        const ts = config.brand.faviconTextShadow ?? DEFAULT_FAVICON_TEXT_SHADOW;
                        if (!ts.enabled) {
                          setConfig((p) => ({
                            ...p,
                            brand: { ...p.brand, faviconShape: v, faviconTextShadow: { ...ts, enabled: true } },
                          }));
                          return;
                        }
                      }
                      update("brand", "faviconShape", v);
                    }}
                    options={[
                      { value: "circle", label: "Circle" },
                      { value: "square", label: "Square" },
                      { value: "none", label: "None" },
                    ]}
                  />
                </FieldRow>
                {/* 로고 폰트 — 로고와 favicon 둘 다 결정. FontPicker (Google Fonts 검색 + 부분매칭). */}
                <FieldRow label={t("admin.settings.logoFont")}>
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
                </FieldRow>
                <FieldRow label={t("admin.settings.faviconWeight")}>
                  <RadioGroup<"light" | "regular" | "bold">
                    value={(config.brand.faviconWeight ?? "light") as "light" | "regular" | "bold"}
                    onChange={(v) => update("brand", "faviconWeight", v)}
                    options={[
                      { value: "light", label: "Light" },
                      { value: "regular", label: "Regular" },
                      { value: "bold", label: "Bold" },
                    ]}
                  />
                </FieldRow>
                {/* 장평 — 폰트 가로 너비 (scaleX 배수). 로고/favicon 모두 적용. 더블클릭 시 자유 입력 */}
                <FieldRow label={t("admin.settings.logoFontStretch")}>
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
                </FieldRow>
                {/* 폰트 크기 — 프리셋 Select + "직접 입력" 선택 시 stepper(NumberInput) 노출. 8~30 clamp */}
                <FieldRow label={t("admin.settings.faviconFontSize")}>
                  <div className={styles.faviconFontSizeControl}>
                    <Select
                      value={fontSizeCustom ? "custom" : (config.brand.faviconFontSize ?? "20")}
                      onChange={(v) => {
                        if (v === "custom") { setFontSizeCustom(true); return; }
                        setFontSizeCustom(false);
                        update("brand", "faviconFontSize", v);
                      }}
                      width="min"
                      options={[
                        { value: "14", label: "14" },
                        { value: "18", label: "18" },
                        { value: "20", label: "20" },
                        { value: "24", label: "24" },
                        { value: "28", label: "28" },
                        { value: "custom", label: t("admin.settings.faviconFontSizeCustom") },
                      ]}
                    />
                    {fontSizeCustom && (
                      <NumberInput
                        value={resolveFaviconFontSize(config.brand.faviconFontSize)}
                        onCommit={(n) => update("brand", "faviconFontSize", String(n))}
                        min={8}
                        max={30}
                        step={1}
                        unit="px"
                        ariaLabel={t("admin.settings.faviconFontSize")}
                      />
                    )}
                  </div>
                </FieldRow>
                <div className={styles.faviconBgRow}>
                  <FieldRow label={t("admin.settings.faviconBgLight")}>
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
                  </FieldRow>
                  <FieldRow label={t("admin.settings.faviconBgDark")}>
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
                  </FieldRow>
                </div>
                {/* 글자색 — favicon 텍스트 색 override. 빈 값이면 preset 자동 계산 (하위호환) */}
                <div className={styles.faviconBgRow}>
                  <FieldRow label={t("admin.settings.faviconTextColorLight")}>
                    <div className={styles.colorField}>
                      <ColorPicker
                        value={config.brand.faviconColor || config.brand.logoColor || config.theme.lightText}
                        onChange={(c) => update("brand", "faviconColor", c.hex)}
                        triggerClassName={styles.colorPicker}
                      />
                      <Input
                        className={styles.colorInput}
                        value={config.brand.faviconColor}
                        onChange={(v) => update("brand", "faviconColor", v)}
                        placeholder={t("admin.settings.faviconBgPlaceholder")}
                        maxLength={7}
                      />
                    </div>
                  </FieldRow>
                  <FieldRow label={t("admin.settings.faviconTextColorDark")}>
                    <div className={styles.colorField}>
                      <ColorPicker
                        value={config.brand.faviconColorDark || config.brand.logoColorDark || config.theme.darkText}
                        onChange={(c) => update("brand", "faviconColorDark", c.hex)}
                        triggerClassName={styles.colorPicker}
                      />
                      <Input
                        className={styles.colorInput}
                        value={config.brand.faviconColorDark}
                        onChange={(v) => update("brand", "faviconColorDark", v)}
                        placeholder={t("admin.settings.faviconBgPlaceholder")}
                        maxLength={7}
                      />
                    </div>
                  </FieldRow>
                </div>
              </div>
            </div>
            {/* 그림자 — 텍스트 / 배경(rect) 각각 on·off / inset / size / 색상 */}
            <div className={styles.faviconShadowGroup}>
              <FaviconShadowControls
                label={t("admin.settings.faviconTextShadow")}
                value={config.brand.faviconTextShadow ?? DEFAULT_FAVICON_TEXT_SHADOW}
                onChange={(v) => update("brand", "faviconTextShadow", v)}
                t={t}
              />
              <FaviconShadowControls
                label={t("admin.settings.faviconBgShadow")}
                value={config.brand.faviconBgShadow ?? DEFAULT_FAVICON_BG_SHADOW}
                onChange={(v) => update("brand", "faviconBgShadow", v)}
                t={t}
              />
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
