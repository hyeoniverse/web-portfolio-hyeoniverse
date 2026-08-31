"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "@/components/icons";
import { useLanguage, type TFunction } from "@/providers/LanguageProvider";
import ColorPicker from "@/components/ui/ColorPicker";
import Input from "@/components/ui/Input";
import HighlightInput from "@/components/ui/HighlightInput";
import Button from "@/components/ui/Button";
import RadioGroup from "@/components/ui/RadioGroup";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import NumberInput from "@/components/ui/NumberInput";
import { Slider } from "@/components/ui/Slider";
import FieldRow from "@/components/ui/FieldRow";
import FontPicker from "@/components/ui/FontPicker";
import {
  resolveFavicon,
  resolveFaviconFontSize,
  resolveFaviconRadius,
  resolveFaviconRatio,
  faviconContentTransform,
  FaviconFilter,
  DEFAULT_FAVICON_TEXT_SHADOW,
  DEFAULT_FAVICON_BG_SHADOW,
  lastGrapheme,
  type FaviconShape,
  type FaviconWeight,
} from "@/lib/favicon";
import { contrastRatio, contrastLevel } from "@/utils/contrast";
import { FONT_GROUPS, FONT_FAMILIES_FLAT } from "@/components/posts/plate/constants";
import { showToast } from "@/stores/toastStore";
import { FAVICON_FONT_SIZE_PRESETS } from "../_data/faviconPresets";
import type { SiteConfigData } from "@/config/site.config";
import type { SettingsTabProps } from "../_types";
import { UploadField, FieldHelp } from "./SettingsFormFields";
import SectionHeader from "./SectionHeader";
import { ColorDuoTools, FaviconShadowControls, PresetNameAddRow } from "./FaviconControls";
import styles from "./AppearanceTab.module.css";
import shared from "../Settings.module.css";
import Pressable from "@/components/ui/Pressable";

type LogoColorPreset = { name: string; light: string; dark: string };

/** logoColorPresets 가 config 에 없는 legacy 환경용 minimal fallback */
const LOGO_COLOR_PRESETS_FALLBACK: LogoColorPreset[] = [
  { name: "Default", light: "", dark: "" },
];

type BrandSectionProps = SettingsTabProps & {
  setConfig: Dispatch<SetStateAction<SiteConfigData>>;
};

/** hex 색 입력 한 칸 — ColorPicker(트리거) + 직접 입력 Input. picker/input 값을 따로 받아
 *  "빈 값이면 fallback 색으로 미리보기"(picker) vs "빈 값은 빈 채로 표시"(input) 차이를 표현. */
function HexColorField({ pickerValue, inputValue, onChange, placeholder }: {
  pickerValue: string;
  inputValue: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className={shared.colorField}>
      <ColorPicker value={pickerValue} onChange={(c) => onChange(c.hex)} triggerClassName={shared.colorPicker} />
      <Input className={shared.colorInput} value={inputValue} onChange={onChange} placeholder={placeholder} maxLength={7} />
    </div>
  );
}

/** 라이트/다크 색 한 쌍 — 캡션 + HexColorField ×2, 옵션으로 ColorDuoTools(맞추기/스왑/지우기). */
function ColorDuoRow({ t, placeholder, light, dark, tools = false }: {
  t: TFunction;
  placeholder?: string;
  light: { picker: string; input: string; onChange: (v: string) => void };
  dark: { picker: string; input: string; onChange: (v: string) => void };
  tools?: boolean;
}) {
  return (
    <div className={styles.faviconColorDuo}>
      <div className={styles.faviconColorItem}>
        <span className={styles.faviconColorCaption}>{t("admin.settings.faviconVariantLight")}</span>
        <HexColorField pickerValue={light.picker} inputValue={light.input} onChange={light.onChange} placeholder={placeholder} />
      </div>
      <div className={styles.faviconColorItem}>
        <span className={styles.faviconColorCaption}>{t("admin.settings.faviconVariantDark")}</span>
        <HexColorField pickerValue={dark.picker} inputValue={dark.input} onChange={dark.onChange} placeholder={placeholder} />
      </div>
      {tools && (
        <ColorDuoTools
          light={light.input}
          dark={dark.input}
          onLight={light.onChange}
          onDark={dark.onChange}
          labels={{ match: t("admin.settings.colorMatch"), swap: t("admin.settings.colorSwap"), clear: t("admin.settings.colorClear") }}
        />
      )}
    </div>
  );
}

/** favicon 미리보기 SVG — resolveFavicon 결과(render)를 배경 rect + 글자 + 그림자 filter 로 그린다. 순수 표현. */
function FaviconPreviewSvg({ render, textShadowId, bgShadowId }: {
  render: ReturnType<typeof resolveFavicon>;
  textShadowId: string;
  bgShadowId: string;
}) {
  return (
    <svg
      className={styles.faviconPreview}
      viewBox="0 0 32 32"
      width="48"
      height="48"
      aria-hidden
      style={render.shape === "none" ? { overflow: "visible", border: "1px dashed var(--border-color-light)", borderRadius: 4 } : { overflow: "visible" }}
    >
      {(render.textShadow || render.bgShadow) && (
        <defs>
          {render.bgShadow && <FaviconFilter resolved={render.bgShadow} id={bgShadowId} />}
          {render.textShadow && <FaviconFilter resolved={render.textShadow} id={textShadowId} />}
        </defs>
      )}
      <g transform={faviconContentTransform(render.contentScale) || undefined}>
        {render.hasBg && (
          <rect
            x={render.bgX}
            y={render.bgY}
            width={render.bgW}
            height={render.bgH}
            rx={render.radius}
            ry={render.radius}
            fill={render.bgColor}
            stroke={render.borderWidth > 0 ? render.borderColor : undefined}
            strokeWidth={render.borderWidth > 0 ? render.borderWidth : undefined}
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
      </g>
    </svg>
  );
}

export default function BrandSection({ config, savedConfig, update, saveSection, revertSection, resetSection, savingPaths, setConfig, validationError }: BrandSectionProps) {
  const { t } = useLanguage();

  const sh = { config, savedConfig, saveSection, revertSection, resetSection, savingPaths, validationError, titleClassName: shared.sectionTitle };

  const presets: LogoColorPreset[] = config.brand.logoColorPresets ?? LOGO_COLOR_PRESETS_FALLBACK;
  const currentLight = config.brand.logoColor;
  const currentDark = config.brand.logoColorDark;
  const matchesExisting = presets.some((p) => p.light === currentLight && p.dark === currentDark);
  const canAddPreset = !matchesExisting && !!(currentLight || currentDark);

  // 브랜드 그룹 탭 — 업로드 로고 / 시스템 로고(텍스트) 전환
  // 기본 탭 — 현재 설정 기준. 업로드 로고 이미지가 하나라도 있으면 "업로드", 없으면 "시스템(텍스트)".
  // (AppearanceTab 은 config 로드 후에만 마운트되므로 초기값이 실제 설정을 반영)
  const [brandTab, setBrandTab] = useState<"uploaded" | "system">(() =>
    (config.brand.logoShortUrl || config.brand.logoShortDarkUrl || config.brand.logoFullUrl || config.brand.logoFullDarkUrl)
      ? "uploaded"
      : "system"
  );
  const [addingPresetName, setAddingPresetName] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

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
      <section className={`${shared.section} ${shared.sectionWide}`}>
        <SectionHeader title={t("admin.settings.brand")} paths={["brand"]} {...sh} />

        {/* 그룹 탭 — 언더라인 탭(세그먼트 pill 과 구분). 업로드 로고 / 시스템 로고(텍스트) */}
        <div className={styles.brandTabs} role="tablist">
          <Pressable
            role="tab"
            aria-selected={brandTab === "uploaded"}
            className={`${styles.brandTab}${brandTab === "uploaded" ? ` ${styles.brandTabActive}` : ""}`}
            onClick={() => setBrandTab("uploaded")}
          >
            {t("admin.settings.uploadedLogoSection")}
          </Pressable>
          <Pressable
            role="tab"
            aria-selected={brandTab === "system"}
            className={`${styles.brandTab}${brandTab === "system" ? ` ${styles.brandTabActive}` : ""}`}
            onClick={() => setBrandTab("system")}
          >
            {t("admin.settings.systemLogoSection")}
          </Pressable>
        </div>
        <p className={styles.brandTabHint}>
          {brandTab === "uploaded" ? t("admin.settings.uploadedLogoHint") : t("admin.settings.systemLogoHint")}
        </p>

        {/* 로고 표시 효과 — 탭·숏/풀 무관하게 nav 로고 전체에 적용(숏 배지 포함). 그래서 탭 밖 섹션 레벨에 둔다 */}
        <div className={styles.logoEffectsRow}>
          <span className={styles.logoEffectsLabel}>{t("admin.settings.logoEffects")}</span>
          <div className={styles.logoEffectsToggles}>
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

        {/* ══ 업로드 로고 — 이미지. 올리면 텍스트 로고를 대체 ══ */}
        <AnimatePresence mode="wait">
        {brandTab === "uploaded" && (
        <motion.div
          key="uploaded"
          className={styles.brandGroup}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        >

          {/* Favicon(숏) 이미지 — 비우면 텍스트 favicon 으로 fallback */}
          <div className={styles.brandPart}>
            <div className={styles.brandPartHead}>
              <h4 className={styles.brandPartTitle}>
                {t("admin.settings.logoFaviconPart")}
                <span className={styles.brandPartTitleHint}>{t("admin.settings.logoFaviconPartHint")}</span>
              </h4>
              {(config.brand.logoShortUrl || config.brand.logoShortDarkUrl) && (
                <div className={styles.brandPartHeadEnd}>
                  <Button variant="outline" size="md" onClick={() => setConfig((prev) => ({ ...prev, brand: { ...prev.brand, logoShortUrl: "", logoShortDarkUrl: "" } }))}>
                    {t("admin.settings.useDefaultLogo")}
                  </Button>
                </div>
              )}
            </div>
            <div className={styles.brandDrops}>
              <UploadField kind="logo" tint={config.brand.logoShortColor} onTintChange={(c) => update("brand", "logoShortColor", c)} defaultTint={config.brand.logoColor || config.theme.lightText} recolorLabel={t("admin.settings.logoRecolor")} originalLabel={t("admin.settings.logoOriginal")} label={t("admin.settings.faviconVariantLight")} url={config.brand.logoShortUrl} uploadLabel={t("admin.settings.uploadLogo")} removeLabel={t("admin.settings.removeLogo")} onUploaded={(url) => update("brand", "logoShortUrl", url)} onRemove={() => update("brand", "logoShortUrl", "")} />
              <UploadField kind="logo" tint={config.brand.logoShortColorDark} onTintChange={(c) => update("brand", "logoShortColorDark", c)} defaultTint={config.brand.logoColorDark || config.theme.darkText} recolorLabel={t("admin.settings.logoRecolor")} originalLabel={t("admin.settings.logoOriginal")} label={t("admin.settings.faviconVariantDark")} url={config.brand.logoShortDarkUrl} uploadLabel={t("admin.settings.uploadLogo")} removeLabel={t("admin.settings.removeLogo")} onUploaded={(url) => update("brand", "logoShortDarkUrl", url)} onRemove={() => update("brand", "logoShortDarkUrl", "")} />
            </div>
          </div>

          {/* 풀로고(메인) 이미지 — 비우면 텍스트 풀로고로 fallback */}
          <div className={styles.brandPart}>
            <div className={styles.brandPartHead}>
              <h4 className={styles.brandPartTitle}>
                {t("admin.settings.logoFullPart")}
                <span className={styles.brandPartTitleHint}>{t("admin.settings.logoFullPartHint")}</span>
              </h4>
              {(config.brand.logoFullUrl || config.brand.logoFullDarkUrl) && (
                <div className={styles.brandPartHeadEnd}>
                  <Button variant="outline" size="md" onClick={() => setConfig((prev) => ({ ...prev, brand: { ...prev.brand, logoFullUrl: "", logoFullDarkUrl: "" } }))}>
                    {t("admin.settings.useDefaultLogo")}
                  </Button>
                </div>
              )}
            </div>
            <div className={styles.brandDrops}>
              <UploadField kind="logo" tint={config.brand.logoFullColor} onTintChange={(c) => update("brand", "logoFullColor", c)} defaultTint={config.brand.logoColor || config.theme.lightText} recolorLabel={t("admin.settings.logoRecolor")} originalLabel={t("admin.settings.logoOriginal")} label={t("admin.settings.faviconVariantLight")} url={config.brand.logoFullUrl} uploadLabel={t("admin.settings.uploadLogo")} removeLabel={t("admin.settings.removeLogo")} onUploaded={(url) => update("brand", "logoFullUrl", url)} onRemove={() => update("brand", "logoFullUrl", "")} />
              <UploadField kind="logo" tint={config.brand.logoFullColorDark} onTintChange={(c) => update("brand", "logoFullColorDark", c)} defaultTint={config.brand.logoColorDark || config.theme.darkText} recolorLabel={t("admin.settings.logoRecolor")} originalLabel={t("admin.settings.logoOriginal")} label={t("admin.settings.faviconVariantDark")} url={config.brand.logoFullDarkUrl} uploadLabel={t("admin.settings.uploadLogo")} removeLabel={t("admin.settings.removeLogo")} onUploaded={(url) => update("brand", "logoFullDarkUrl", url)} onRemove={() => update("brand", "logoFullDarkUrl", "")} />
            </div>
          </div>

          {/* 업로드 로고 옵션 (그룹 레벨) — 배경=favicon 전용, 그림자=모든 업로드 로고. 로고 하나라도 있으면 표시 */}
          {(config.brand.logoShortUrl || config.brand.logoShortDarkUrl || config.brand.logoFullUrl || config.brand.logoFullDarkUrl) && (
            <div className={styles.faviconImageOptions}>
              <h5 className={styles.faviconImageOptionsTitle}>{t("admin.settings.uploadedLogoOptions")}</h5>
              <p className={styles.faviconImageOptionsHint}>{t("admin.settings.uploadedLogoOptionsHint")}</p>
              <div className={styles.faviconImageBgRow}>
                <span className={styles.faviconImageBgLabel}>{t("admin.settings.faviconBg")}</span>
                <div className={styles.faviconImageBgFields}>
                  <div className={shared.faviconImageBgField}>
                    <span className={styles.faviconImageBgCap}>{t("admin.settings.faviconVariantLight")}</span>
                    <div className={shared.colorField}>
                      <ColorPicker value={config.brand.faviconImageBgLight || "#ffffff"} onChange={(c) => update("brand", "faviconImageBgLight", c.hex)}>
                        {({ toggle }) => (
                          <Pressable className={`${shared.colorPicker}${config.brand.faviconImageBgLight ? "" : ` ${styles.checkerBg}`}`} style={config.brand.faviconImageBgLight ? { background: config.brand.faviconImageBgLight } : undefined} onClick={toggle} aria-label={t("admin.settings.faviconBg")} />
                        )}
                      </ColorPicker>
                      <Input className={shared.colorInput} value={config.brand.faviconImageBgLight} onChange={(v) => update("brand", "faviconImageBgLight", v)} placeholder={t("admin.settings.faviconImageBgPlaceholder")} maxLength={7} />
                    </div>
                  </div>
                  <div className={shared.faviconImageBgField}>
                    <span className={styles.faviconImageBgCap}>{t("admin.settings.faviconVariantDark")}</span>
                    <div className={shared.colorField}>
                      <ColorPicker value={config.brand.faviconImageBgDark || "#0a0a0a"} onChange={(c) => update("brand", "faviconImageBgDark", c.hex)}>
                        {({ toggle }) => (
                          <Pressable className={`${shared.colorPicker}${config.brand.faviconImageBgDark ? "" : ` ${styles.checkerBg}`}`} style={config.brand.faviconImageBgDark ? { background: config.brand.faviconImageBgDark } : undefined} onClick={toggle} aria-label={t("admin.settings.faviconBg")} />
                        )}
                      </ColorPicker>
                      <Input className={shared.colorInput} value={config.brand.faviconImageBgDark} onChange={(v) => update("brand", "faviconImageBgDark", v)} placeholder={t("admin.settings.faviconImageBgPlaceholder")} maxLength={7} />
                    </div>
                  </div>
                </div>
              </div>
              <FaviconShadowControls
                single
                textShadow={config.brand.logoShadow ?? DEFAULT_FAVICON_TEXT_SHADOW}
                onChangeText={(v) => update("brand", "logoShadow", v)}
                t={t}
                textLabel={t("admin.settings.navLogoShadow")}
              />
              <p className={styles.faviconImageOptionsHint}>{t("admin.settings.navLogoShadowHint")}</p>
              <FaviconShadowControls
                textShadow={config.brand.faviconImageShadow ?? DEFAULT_FAVICON_TEXT_SHADOW}
                bgShadow={config.brand.faviconImageBgShadow ?? DEFAULT_FAVICON_BG_SHADOW}
                onChangeText={(v) => update("brand", "faviconImageShadow", v)}
                onChangeBg={(v) => update("brand", "faviconImageBgShadow", v)}
                t={t}
                textLabel={t("admin.settings.faviconLogoShadow")}
                bgLabel={t("admin.settings.faviconBgShadow")}
              />
            </div>
          )}
        </motion.div>
        )}

        {/* ══ 시스템 로고 (텍스트) — 이미지 없을 때 텍스트로 생성 ══ */}
        {brandTab === "system" && (
        <motion.div
          key="system"
          className={styles.brandGroup}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        >

          {/* Favicon(숏) — 짧은 텍스트 → 브라우저 탭 아이콘 렌더 */}
          <div className={styles.brandPart}>
            <div className={styles.brandPartHead}>
              <h4 className={styles.brandPartTitle}>
                {t("admin.settings.logoFaviconPart")}
                <span className={styles.brandPartTitleHint}>{t("admin.settings.logoFaviconPartHint")}</span>
                <FieldHelp content={t("admin.settings.wcagHelp")} />
              </h4>
            </div>
            <p className={styles.faviconImageOptionsHint}>{t("admin.settings.faviconThemeHint")}</p>
            {/* 프리뷰(상단 가로 카드) + 컨트롤 2패널(글자·모양 | 색상) + 그림자 카드 */}
            <div className={styles.faviconStudio}>
              <div className={styles.faviconPreviewBar}>
                {(["light", "dark"] as const).map((variant) => {
                  // preset 색 — 미리보기는 theme.lightText/darkText 로 fallback (route.ts 와 동일 계산 구조)
                  const presetLight = config.brand.logoColor || config.theme.lightText;
                  const presetDark = config.brand.logoColorDark || config.theme.darkText;
                  const render = resolveFavicon(
                    {
                      shape: (config.brand.faviconShape ?? "circle") as FaviconShape,
                      faviconRadius: config.brand.faviconRadius ?? "",
                      faviconBgRatio: config.brand.faviconBgRatio ?? "1",
                      weight: (config.brand.faviconWeight ?? "light") as FaviconWeight,
                      logoText: config.brand.logoText ?? "",
                      logoFont: config.brand.logoFont ?? "",
                      logoFontStretch: config.brand.logoFontStretch ?? "",
                      faviconBgLight: config.brand.faviconBgLight ?? "",
                      faviconBgDark: config.brand.faviconBgDark ?? "",
                      faviconBorderWidth: config.brand.faviconBorderWidth ?? "0",
                      faviconBorderColorLight: config.brand.faviconBorderColorLight ?? "",
                      faviconBorderColorDark: config.brand.faviconBorderColorDark ?? "",
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
                      <FaviconPreviewSvg render={render} textShadowId={textShadowId} bgShadowId={bgShadowId} />
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
              <div className={styles.faviconPanels}>
                <div className={styles.faviconPanel}>
                  <h5 className={styles.faviconPanelTitle}>{t("admin.settings.faviconGroupGlyph")}</h5>
                <FieldRow label={t("admin.settings.logoText")}>
                  <div className={styles.faviconTextInputWrap}>
                    {/* favicon 은 한 grapheme 만 렌더 → 마지막 입력 글자로 덮어쓰기(이모지 보존). 4글자 제한 제거 */}
                    <HighlightInput
                      value={config.brand.logoText}
                      onChange={(v) => update("brand", "logoText", lastGrapheme(v))}
                      placeholder={t("admin.settings.logoTextPlaceholder")}
                    />
                  </div>
                </FieldRow>
                <FieldRow label={t("admin.settings.faviconShape")}>
                  <RadioGroup<"circle" | "square" | "none">
                    // 선택 표시는 radius 에서 파생 — 슬라이더로 반경 바꾸면 원/사각 하이라이트가 따라 이동
                    value={
                      config.brand.faviconShape === "none"
                        ? "none"
                        : resolveFaviconRadius(config.brand.faviconRadius, config.brand.faviconShape === "square" ? 4 : 16) >= 10
                          ? "circle"
                          : "square"
                    }
                    onChange={(v) => {
                      const prev = (config.brand.faviconShape ?? "circle") as FaviconShape;
                      if (v === "none") {
                        // 배경 끄면 텍스트가 배경 없이 떠서 대비 필요 → 그림자 꺼져 있으면 자동 on
                        const ts = config.brand.faviconTextShadow ?? DEFAULT_FAVICON_TEXT_SHADOW;
                        if (prev !== "none" && !ts.enabled) {
                          setConfig((p) => ({
                            ...p,
                            brand: { ...p.brand, faviconShape: "none", faviconTextShadow: { ...ts, enabled: true } },
                          }));
                          return;
                        }
                        update("brand", "faviconShape", "none");
                        return;
                      }
                      // circle/square 프리셋 → 해당 기본 반경으로 설정 (라디오·슬라이더·미리보기 동기화)
                      setConfig((p) => ({
                        ...p,
                        brand: { ...p.brand, faviconShape: v, faviconRadius: v === "circle" ? "16" : "4" },
                      }));
                    }}
                    options={[
                      { value: "circle", label: "Circle" },
                      { value: "square", label: "Square" },
                      { value: "none", label: "None" },
                    ]}
                  />
                </FieldRow>
                {/* 배경 모서리 반경 — shape 프리셋 기본값을 미세 조정 (배경 있을 때만). 0=각짐 ~ 16=완전 둥금 */}
                {config.brand.faviconShape !== "none" && (
                  <FieldRow label={t("admin.settings.faviconRadius")}>
                    <div className={styles.faviconSliderControl}>
                      <Slider
                        min={0}
                        max={16}
                        step={1}
                        value={[resolveFaviconRadius(config.brand.faviconRadius, config.brand.faviconShape === "square" ? 4 : 16)]}
                        onValueChange={([v]) => update("brand", "faviconRadius", String(v))}
                        className={styles.faviconSlider}
                      />
                      <span className={styles.faviconSliderValue}>
                        {resolveFaviconRadius(config.brand.faviconRadius, config.brand.faviconShape === "square" ? 4 : 16)}
                      </span>
                    </div>
                  </FieldRow>
                )}
                {/* 배경 종횡비 — 배경 모양을 정사각/타원/직사각으로 (콘텐츠는 중심 고정). 세로 1:2 ~ 가로 2:1 */}
                {config.brand.faviconShape !== "none" && (
                  <FieldRow label={t("admin.settings.faviconBgRatio")}>
                    <div className={styles.faviconSliderControl}>
                      <Slider
                        min={50}
                        max={200}
                        step={10}
                        value={[Math.round(resolveFaviconRatio(config.brand.faviconBgRatio) * 100)]}
                        onValueChange={([v]) => update("brand", "faviconBgRatio", String(v / 100))}
                        className={styles.faviconSlider}
                      />
                      <span className={styles.faviconSliderValue}>
                        {(() => {
                          const r = resolveFaviconRatio(config.brand.faviconBgRatio);
                          return r > 1 ? `${r.toFixed(1)}:1` : r < 1 ? `1:${(1 / r).toFixed(1)}` : "1:1";
                        })()}
                      </span>
                    </div>
                  </FieldRow>
                )}
                {/* 로고 폰트 — 로고와 favicon 둘 다 결정. FontPicker (Google Fonts 검색 + 부분매칭). */}
                <FieldRow label={t("admin.settings.logoFont")}>
                  <FontPicker
                    value={config.brand.logoFont ?? ""}
                    onChange={(v) => update("brand", "logoFont", v)}
                    groups={FONT_GROUPS}
                    triggerClassName={shared.fontPickerSelect}
                    dropdownClassName={shared.fontPickerDropdown}
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
                </div>
                <div className={styles.faviconPanel}>
                  <h5 className={styles.faviconPanelTitle}>{t("admin.settings.faviconGroupColor")}</h5>
                {/* 배경 — 라이트/다크 한 행 (캡션 + 색) */}
                <FieldRow label={t("admin.settings.faviconBg")}>
                  <ColorDuoRow
                    t={t}
                    placeholder={t("admin.settings.faviconBgPlaceholder")}
                    light={{ picker: config.brand.faviconBgLight || config.brand.logoColorDark || "#f5f5f0", input: config.brand.faviconBgLight, onChange: (v) => update("brand", "faviconBgLight", v) }}
                    dark={{ picker: config.brand.faviconBgDark || config.brand.logoColor || "#0a0a0a", input: config.brand.faviconBgDark, onChange: (v) => update("brand", "faviconBgDark", v) }}
                    tools
                  />
                </FieldRow>
                {/* 배경 테두리 — 두께(px) + variant 색. 두께 0 이면 미표시 */}
                <FieldRow label={t("admin.settings.faviconBorder")}>
                  <div className={styles.faviconSliderControl}>
                    <Slider
                      min={0}
                      max={8}
                      step={1}
                      value={[Math.max(0, Math.min(8, Number(config.brand.faviconBorderWidth) || 0))]}
                      onValueChange={([v]) => update("brand", "faviconBorderWidth", String(v))}
                      className={styles.faviconSlider}
                    />
                    <span className={styles.faviconSliderValue}>
                      {Math.max(0, Math.min(8, Number(config.brand.faviconBorderWidth) || 0))}
                    </span>
                  </div>
                </FieldRow>
                {(Number(config.brand.faviconBorderWidth) || 0) > 0 && (
                  <FieldRow label={t("admin.settings.faviconBorderColor")}>
                    <ColorDuoRow
                      t={t}
                      placeholder={t("admin.settings.faviconBgPlaceholder")}
                      light={{ picker: config.brand.faviconBorderColorLight || "#0a0a0a", input: config.brand.faviconBorderColorLight, onChange: (v) => update("brand", "faviconBorderColorLight", v) }}
                      dark={{ picker: config.brand.faviconBorderColorDark || "#f5f5f0", input: config.brand.faviconBorderColorDark, onChange: (v) => update("brand", "faviconBorderColorDark", v) }}
                      tools
                    />
                  </FieldRow>
                )}
                {/* 글자색 — favicon 텍스트 색 override. 빈 값이면 preset 자동 계산 (하위호환) */}
                <FieldRow label={t("admin.settings.faviconTextColor")}>
                  <ColorDuoRow
                    t={t}
                    placeholder={t("admin.settings.faviconBgPlaceholder")}
                    light={{ picker: config.brand.faviconColor || config.brand.logoColor || config.theme.lightText, input: config.brand.faviconColor, onChange: (v) => update("brand", "faviconColor", v) }}
                    dark={{ picker: config.brand.faviconColorDark || config.brand.logoColorDark || config.theme.darkText, input: config.brand.faviconColorDark, onChange: (v) => update("brand", "faviconColorDark", v) }}
                    tools
                  />
                </FieldRow>
                </div>
              </div>
            </div>
          </div>

          {/* 풀로고(메인) — 긴 텍스트 + 로고 색상 + 효과. 이미지 없을 때 로딩/네비 로고 */}
          <div className={styles.brandPart}>
            <div className={styles.brandPartHead}>
              <h4 className={styles.brandPartTitle}>
                {t("admin.settings.logoFullPart")}
                <span className={styles.brandPartTitleHint}>{t("admin.settings.logoFullPartHint")}</span>
                <FieldHelp content={t("admin.settings.wcagHelp")} />
              </h4>
            </div>
            {/* 풀로고 미리보기 — 텍스트 로고를 폰트·색·장평 적용해 라이트/다크 배경에서 확인 */}
            <div className={styles.fullLogoPreview}>
              {(["light", "dark"] as const).map((variant) => {
                const bg = variant === "light" ? config.theme.lightBg : config.theme.darkBg;
                const color = variant === "light" ? (config.brand.logoColor || config.theme.lightText) : (config.brand.logoColorDark || config.theme.darkText);
                const stretch = parseFloat(config.brand.logoFontStretch || "0.8") || 0.8;
                const ratio = contrastRatio(color, bg);
                const level = ratio != null ? contrastLevel(ratio) : null;
                return (
                  <div key={variant} className={styles.fullLogoPreviewCell}>
                    <div className={styles.fullLogoPreviewBox} style={{ background: bg }}>
                      <span className={styles.fullLogoPreviewText} style={{ fontFamily: config.brand.logoFont || undefined, color, transform: `scaleX(${stretch})` }}>
                        {config.brand.logoFullText || "LOGO"}
                      </span>
                    </div>
                    <span className={styles.fullLogoPreviewMeta}>
                      <span className={styles.fullLogoPreviewCap}>{variant}</span>
                      {ratio != null && level != null && (
                        <span className={styles.faviconContrast}>
                          <span className={styles.faviconContrastRatio}>{ratio.toFixed(2)}:1</span>
                          <span className={`${styles.faviconContrastBadge} ${level === "fail" ? styles.faviconContrastFail : styles.faviconContrastPass}`} title={t(`admin.settings.faviconContrast_${level}`)}>
                            {t(`admin.settings.faviconContrast_${level}`)}
                          </span>
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className={styles.faviconForm}>
              <FieldRow label={t("admin.settings.logoFullText")}>
                <div className={styles.brandTextInputWrap}>
                  <HighlightInput value={config.brand.logoFullText} onChange={(v) => update("brand", "logoFullText", v)} maxHint={20} maxLength={20} />
                </div>
              </FieldRow>
              {/* 로고 색상 — 프리셋 + Light/Dark override (풀로고·텍스트 로고 색) */}
              <FieldRow label={t("admin.settings.logoColorPresets")}>
            <div className={styles.logoColorPresets}>
              {presets.map((p, i) => (
                <div key={`${p.name}-${i}`} className={styles.logoColorPresetWrap}>
                  <Pressable
                    title={p.name}
                    className={`${shared.logoColorPresetBtn} ${
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
                  </Pressable>
                  {presets.length > 1 && (
                    <Pressable
                      className={styles.logoColorPresetRemove}
                      onClick={() => removePreset(i)}
                      aria-label={`Remove ${p.name}`}
                      title="프리셋 제거"
                    >
                      <X size={10} strokeWidth={2.5} />
                    </Pressable>
                  )}
                </div>
              ))}
              {canAddPreset && (
                <Pressable
                  className={styles.logoColorPresetAddBtn}
                  onClick={() => { setAddingPresetName(true); showToast(t("admin.settings.enterPresetName"), "info"); }}
                  title={t("admin.settings.savePreset")}
                  aria-label={t("admin.settings.savePreset")}
                >
                  <Plus size={14} strokeWidth={2} />
                </Pressable>
              )}
            </div>
          </FieldRow>
              <FieldRow label={t("admin.settings.logoColorLabel")}>
                <ColorDuoRow
                  t={t}
                  placeholder={t("admin.settings.logoColorPlaceholder")}
                  light={{ picker: config.brand.logoColor || "#000000", input: config.brand.logoColor || "#000000", onChange: (v) => update("brand", "logoColor", v) }}
                  dark={{ picker: config.brand.logoColorDark || "#ffffff", input: config.brand.logoColorDark || "#ffffff", onChange: (v) => update("brand", "logoColorDark", v) }}
                />
              </FieldRow>
            </div>
          {/* 프리셋 이름 입력 row — .fields 바깥 */}
          <PresetNameAddRow
            open={addingPresetName}
            value={newPresetName}
            onChange={setNewPresetName}
            saveDisabled={!newPresetName.trim() || presets.some((p) => p.name === newPresetName.trim())}
            onCancel={() => { setAddingPresetName(false); setNewPresetName(""); }}
            onSave={addCurrentAsPreset}
            t={t}
          />
          </div>

          {/* ══ 그림자 — favicon(탭 아이콘) + 네비게이션 로고. 풀로고(로딩) 아래 별도 섹션 ══ */}
          <div className={styles.brandPart}>
            <div className={styles.brandPartHead}>
              <h4 className={styles.brandPartTitle}>{t("admin.settings.faviconGroupShadow")}</h4>
            </div>
            <div className={styles.faviconShadowGroup}>
              <div className={styles.faviconShadowItem}>
                <span className={styles.faviconShadowSubLabel}>{t("admin.settings.logoFaviconPart")}</span>
                <FaviconShadowControls
                  textShadow={config.brand.faviconTextShadow ?? DEFAULT_FAVICON_TEXT_SHADOW}
                  bgShadow={config.brand.faviconBgShadow ?? DEFAULT_FAVICON_BG_SHADOW}
                  onChangeText={(v) => update("brand", "faviconTextShadow", v)}
                  onChangeBg={(v) => update("brand", "faviconBgShadow", v)}
                  t={t}
                />
              </div>
              {/* 네비게이션 로고 그림자 — favicon(브라우저 탭)과 별개. ON 이면 이 값, OFF 면 favicon 텍스트 그림자 상속 */}
              <div className={styles.faviconShadowItem}>
                <span className={styles.faviconShadowSubLabel}>{t("admin.settings.navLogoShadow")}</span>
                <FaviconShadowControls
                  single
                  textLabel=""
                  textShadow={config.brand.logoShadow ?? DEFAULT_FAVICON_TEXT_SHADOW}
                  onChangeText={(v) => update("brand", "logoShadow", v)}
                  t={t}
                />
                <p className={styles.faviconImageOptionsHint}>{t("admin.settings.navLogoShadowHint")}</p>
              </div>
            </div>
          </div>
        </motion.div>
        )}
        </AnimatePresence>
      </section>
  );
}
