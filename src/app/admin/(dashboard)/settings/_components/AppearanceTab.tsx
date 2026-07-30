"use client";

import { useState, useRef } from "react";
import { FAVICON_FONT_SIZE_PRESETS, FAVICON_SHADOW_PRESETS, FAVICON_SIZE_BLUR } from "../_data/faviconPresets";
import type { Dispatch, SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X, Equal, ArrowLeftRight } from "lucide-react";
import { useLanguage, type TFunction } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import TextLink from "@/components/ui/TextLink";
import Checkbox from "@/components/ui/Checkbox";
import ColorPicker from "@/components/ui/ColorPicker";
import Input from "@/components/ui/Input";
import HighlightInput from "@/components/ui/HighlightInput";
import Button from "@/components/ui/Button";
import RadioGroup from "@/components/ui/RadioGroup";
import Select from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import NumberInput from "@/components/ui/NumberInput";
import { Slider } from "@/components/ui/Slider";
import FieldRow from "@/components/ui/FieldRow";
import FontPicker from "@/components/ui/FontPicker";
import {
  resolveFavicon,
  resolveFaviconFontSize,
  resolveFaviconShadow,
  resolveFaviconRadius,
  resolveFaviconRatio,
  faviconContentTransform,
  FaviconFilter,
  DEFAULT_FAVICON_TEXT_SHADOW,
  DEFAULT_FAVICON_BG_SHADOW,
  lastGrapheme,
  type FaviconShape,
  type FaviconWeight,
  type FaviconShadow,
} from "@/lib/favicon";
import { contrastRatio, contrastLevel } from "@/utils/contrast";
import { FONT_GROUPS, FONT_FAMILIES_FLAT } from "@/components/posts/plate/constants";
import { showToast } from "@/stores/toastStore";
import type { SiteConfigData } from "@/config/site.config";
import type { SettingsTabProps } from "../_types";
import { ColorField, UploadField, FieldHelp } from "./SettingsFormFields";
import FontSelect from "./FontSelect";
import SectionHeader from "./SectionHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { THEME_PRESETS } from "../_data/settingsConstants";
import styles from "./AppearanceTab.module.css";
import shared from "../Settings.module.css";

type LogoColorPreset = { name: string; light: string; dark: string };

/** 라이트/다크 색 쌍 편의 버튼 — 맞추기(다크=라이트) / 서로 바꾸기 / 지우기 */
function ColorDuoTools({
  light,
  dark,
  onLight,
  onDark,
  labels,
}: {
  light: string;
  dark: string;
  onLight: (v: string) => void;
  onDark: (v: string) => void;
  labels: { match: string; swap: string; clear: string };
}) {
  return (
    <div className={styles.faviconColorTools}>
      <button type="button" className={styles.faviconColorTool} title={labels.match} aria-label={labels.match} onClick={() => onDark(light)}>
        <Equal size={13} strokeWidth={2} />
      </button>
      <button type="button" className={styles.faviconColorTool} title={labels.swap} aria-label={labels.swap} onClick={() => { const l = light; onLight(dark); onDark(l); }}>
        <ArrowLeftRight size={13} strokeWidth={2} />
      </button>
      <button type="button" className={styles.faviconColorTool} title={labels.clear} aria-label={labels.clear} onClick={() => { onLight(""); onDark(""); }}>
        <X size={13} strokeWidth={2} />
      </button>
    </div>
  );
}

/** logoColorPresets 가 config 에 없는 legacy 환경용 minimal fallback */
const LOGO_COLOR_PRESETS_FALLBACK: LogoColorPreset[] = [
  { name: "Default", light: "", dark: "" },
];


/** 텍스트/배경 그림자 — 미리보기 안 광원(빛)을 드래그해 방향·거리(blur)를 정하고, 색/inset 은 옆에서 조정. */
function FaviconShadowControls({
  textShadow,
  bgShadow,
  onChangeText,
  onChangeBg,
  t,
  textLabel,
  bgLabel,
}: {
  textShadow: FaviconShadow;
  bgShadow: FaviconShadow;
  onChangeText: (v: FaviconShadow) => void;
  onChangeBg: (v: FaviconShadow) => void;
  t: TFunction;
  textLabel?: string;
  bgLabel?: string;
}) {
  const [tab, setTab] = useState<"text" | "bg">("text");
  // 드래그 중엔 로컬 drag 값으로 미리보기(이 컴포넌트)만 갱신 → 가볍다. 놓을 때 config 에 commit.
  const [drag, setDrag] = useState<{ angle: string; blur: string; hx: number; hy: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const value = tab === "text" ? textShadow : bgShadow;
  const onChange = tab === "text" ? onChangeText : onChangeBg;
  const angle = drag?.angle ?? (value.angle || "135");
  const sizeBlur = drag?.blur ?? (value.size === "custom" ? value.custom : (FAVICON_SIZE_BLUR[value.size] ?? "2"));
  const blurN = parseFloat(sizeBlur) || 2;
  const liveValue: FaviconShadow = drag ? { ...value, angle, size: "custom", custom: sizeBlur } : value;

  const applyPreset = (p: (typeof FAVICON_SHADOW_PRESETS)[number]) =>
    onChange({ ...value, enabled: true, size: "custom", custom: p.custom, angle: p.angle, color: p.color, inset: p.inset });
  const isActivePreset = (p: (typeof FAVICON_SHADOW_PRESETS)[number]) =>
    value.custom === p.custom &&
    (value.angle || "135") === p.angle &&
    value.color === p.color &&
    value.inset === p.inset;
  const activePresetKey = FAVICON_SHADOW_PRESETS.find((p) => isActivePreset(p))?.key ?? "";

  // 현재(또는 드래그 중 로컬) 값 → 실시간 미리보기용 box-shadow (구체에 적용, inset 지원)
  const resolved = resolveFaviconShadow(liveValue);
  const previewBoxShadow = resolved ? `${resolved.inset ? "inset " : ""}${resolved.dx}px ${resolved.dy}px ${resolved.blur}px ${resolved.color}` : "none";

  // 핸들 위치(%) = 그림자 방향(커서와 일치). 드래그 중엔 커서 좌표(hx/hy), 아니면 angle/blur 로 계산.
  const angleRad = (parseFloat(angle) * Math.PI) / 180;
  const lightDist = 14 + (Math.min(blurN, 12) / 12) * 28; // 14~42%
  const lightX = drag ? drag.hx : 50 + Math.sin(angleRad) * lightDist;
  const lightY = drag ? drag.hy : 50 - Math.cos(angleRad) * lightDist;

  // 미리보기 안에서 빛을 드래그 → 그림자 방향(광원 반대, 45° 스냅) + 거리(blur 1~12)
  const handleLightDrag = (e: React.PointerEvent) => {
    const el = previewRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // rAF throttle — pointermove 마다 setConfig 하면 버벅이므로 프레임당 1회로 합친다
    let raf: number | null = null;
    let lx = e.clientX;
    let ly = e.clientY;
    const calc = () => {
      const dx = lx - cx;
      const dy = ly - cy;
      // 커서 방향 = 그림자 방향(0=위, 시계). 연속(45° 스냅 제거)이라 커서를 부드럽게 따라온다.
      let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxR = Math.min(rect.width, rect.height) / 2;
      const blur = Math.max(1, Math.min(12, Math.round((dist / maxR) * 12)));
      // 핸들을 커서 좌표(미리보기 상대 %)에 정확히 맞춘다
      const hx = ((lx - rect.left) / rect.width) * 100;
      const hy = ((ly - rect.top) / rect.height) * 100;
      return { angle: String(Math.round(deg)), blur: String(blur), hx, hy };
    };
    const schedule = (x: number, y: number) => {
      lx = x;
      ly = y;
      // 드래그 중엔 로컬 state 만 (setConfig 안 함 → AppearanceTab·favicon SVG 재계산 회피)
      if (raf == null) raf = requestAnimationFrame(() => { raf = null; setDrag(calc()); });
    };
    schedule(e.clientX, e.clientY);
    const onMove = (ev: PointerEvent) => schedule(ev.clientX, ev.clientY);
    const onUp = () => {
      if (raf != null) cancelAnimationFrame(raf);
      const d = calc(); // 놓을 때만 config 에 commit
      onChange({ ...value, angle: d.angle, size: "custom", custom: d.blur });
      setDrag(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className={styles.faviconShadowCard}>
      <div className={styles.faviconShadowHead}>
        <SegmentedControl<"text" | "bg">
          size="md"
          items={[
            { value: "text", label: textLabel ?? t("admin.settings.faviconTextShadow") },
            { value: "bg", label: bgLabel ?? t("admin.settings.faviconBgShadow") },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Switch
          checked={value.enabled}
          onCheckedChange={(v) => onChange({ ...value, enabled: v })}
          showStateText
          size="md"
        />
      </div>
      <AnimatePresence initial={false}>
        {value.enabled && (
          <motion.div
            key="shadow-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
        <div className={styles.faviconShadowBody}>
          {/* 광원 드래그 미리보기 — 빛(점)을 끌면 그림자 방향·거리(blur)가 실시간 반영 */}
          <div
            ref={previewRef}
            className={styles.shadowPreview}
            onPointerDown={handleLightDrag}
          >
            <div className={styles.shadowPreviewCircle} style={{ background: "#fff", boxShadow: previewBoxShadow }} />
            <span className={styles.shadowLight} style={{ left: `${lightX}%`, top: `${lightY}%` }} aria-hidden />
          </div>
          <div className={styles.shadowControls}>
            {/* 프리셋 — RadioGroup. 선택 시 광원/blur 세팅, 이후 드래그로 미세 조정 */}
            <RadioGroup<string>
              className={styles.shadowPresetRadio}
              value={activePresetKey}
              onChange={(key) => {
                const p = FAVICON_SHADOW_PRESETS.find((x) => x.key === key);
                if (p) applyPreset(p);
              }}
              options={FAVICON_SHADOW_PRESETS.map((p) => ({ value: p.key, label: p.label }))}
            />
            {/* 번짐(blur) px — 직접 미세 조정 (드래그 거리로도 조절됨) */}
            <FieldRow label={t("admin.settings.faviconShadowSize")} className={styles.faviconShadowRow}>
              <NumberInput
                className={styles.shadowBlurInput}
                value={parseFloat(sizeBlur) || 1}
                onCommit={(n) => onChange({ ...value, size: "custom", custom: String(n) })}
                min={1}
                max={12}
                step={1}
                unit="px"
                ariaLabel={t("admin.settings.faviconShadowSize")}
              />
            </FieldRow>
            <FieldRow label={t("admin.settings.faviconShadowColor")} className={styles.faviconShadowRow}>
              <div className={shared.colorField}>
                <ColorPicker
                  value={value.color || "rgba(0,0,0,0.4)"}
                  onChange={(c) => onChange({ ...value, color: c.hex })}
                  triggerClassName={shared.colorPicker}
                />
                <Input
                  className={shared.colorInput}
                  value={value.color}
                  onChange={(v) => onChange({ ...value, color: v })}
                  placeholder={t("admin.settings.faviconShadowColorPlaceholder")}
                />
              </div>
            </FieldRow>
            <FieldRow label={t("admin.settings.faviconShadowInset")} className={styles.faviconShadowRow}>
              <Checkbox checked={value.inset} onChange={(v) => onChange({ ...value, inset: v })} shape="square" />
            </FieldRow>
            <p className={styles.shadowDragHint}>미리보기의 빛을 드래그해 방향·거리를 조절하세요</p>
          </div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface AppearanceTabProps extends SettingsTabProps {
  setConfig: Dispatch<SetStateAction<SiteConfigData>>;
}

export default function AppearanceTab({ config, savedConfig, update, saveSection, revertSection, resetSection, savingPaths, setConfig }: AppearanceTabProps) {
  const { t } = useLanguage();

  const sh = { config, savedConfig, saveSection, revertSection, resetSection, savingPaths, titleClassName: shared.sectionTitle };

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
      <section className={`${shared.section} ${shared.sectionWide}`}>
        <SectionHeader
          title={t("admin.settings.designSystem")}
          paths={[]}
          rowClassName={shared.sectionTitleRow}
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
                    <button
                      type="button"
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
                    </button>
                    {preset.removable && (
                      <button
                        type="button"
                        className={shared.presetCardRemove}
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

      {/* Brand — 로고. 소스(업로드 이미지 vs 시스템 텍스트) × 종류(숏=Favicon / 풀) 2×2 */}
      <section className={`${shared.section} ${shared.sectionWide}`}>
        <SectionHeader title={t("admin.settings.brand")} paths={["brand"]} {...sh} />

        {/* 그룹 탭 — 언더라인 탭(세그먼트 pill 과 구분). 업로드 로고 / 시스템 로고(텍스트) */}
        <div className={styles.brandTabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={brandTab === "uploaded"}
            className={`${styles.brandTab}${brandTab === "uploaded" ? ` ${styles.brandTabActive}` : ""}`}
            onClick={() => setBrandTab("uploaded")}
          >
            {t("admin.settings.uploadedLogoSection")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={brandTab === "system"}
            className={`${styles.brandTab}${brandTab === "system" ? ` ${styles.brandTabActive}` : ""}`}
            onClick={() => setBrandTab("system")}
          >
            {t("admin.settings.systemLogoSection")}
          </button>
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
                          <button type="button" className={`${shared.colorPicker}${config.brand.faviconImageBgLight ? "" : ` ${styles.checkerBg}`}`} style={config.brand.faviconImageBgLight ? { background: config.brand.faviconImageBgLight } : undefined} onClick={toggle} aria-label={t("admin.settings.faviconBg")} />
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
                          <button type="button" className={`${shared.colorPicker}${config.brand.faviconImageBgDark ? "" : ` ${styles.checkerBg}`}`} style={config.brand.faviconImageBgDark ? { background: config.brand.faviconImageBgDark } : undefined} onClick={toggle} aria-label={t("admin.settings.faviconBg")} />
                        )}
                      </ColorPicker>
                      <Input className={shared.colorInput} value={config.brand.faviconImageBgDark} onChange={(v) => update("brand", "faviconImageBgDark", v)} placeholder={t("admin.settings.faviconImageBgPlaceholder")} maxLength={7} />
                    </div>
                  </div>
                </div>
              </div>
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
            {/* 프리뷰 스트립 + 아래 정렬 폼 (숏 텍스트 → 브라우저 탭 아이콘) */}
            <div className={styles.faviconLayout}>
              <div className={styles.faviconPreviewSlot}>
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
                      <svg
                        className={styles.faviconPreview}
                        viewBox="0 0 32 32"
                        width="48"
                        height="48"
                        aria-hidden
                        style={render.shape === "none" ? { overflow: "visible", border: "1px dashed var(--border-light-color)", borderRadius: 4 } : { overflow: "visible" }}
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
              <div className={styles.faviconForm}>
                <FieldRow label={t("admin.settings.logoText")} className={styles.faviconFormRow}>
                  <div className={styles.faviconTextInputWrap}>
                    {/* favicon 은 한 grapheme 만 렌더 → 마지막 입력 글자로 덮어쓰기(이모지 보존). 4글자 제한 제거 */}
                    <HighlightInput
                      value={config.brand.logoText}
                      onChange={(v) => update("brand", "logoText", lastGrapheme(v))}
                      placeholder={t("admin.settings.logoTextPlaceholder")}
                    />
                  </div>
                </FieldRow>
                <FieldRow label={t("admin.settings.faviconShape")} className={styles.faviconFormRow}>
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
                  <FieldRow label={t("admin.settings.faviconRadius")} className={styles.faviconFormRow}>
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
                  <FieldRow label={t("admin.settings.faviconBgRatio")} className={styles.faviconFormRow}>
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
                <FieldRow label={t("admin.settings.logoFont")} className={styles.faviconFormRow}>
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
                <FieldRow label={t("admin.settings.faviconWeight")} className={styles.faviconFormRow}>
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
                <FieldRow label={t("admin.settings.logoFontStretch")} className={styles.faviconFormRow}>
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
                <FieldRow label={t("admin.settings.faviconFontSize")} className={styles.faviconFormRow}>
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
                {/* 배경 — 라이트/다크 한 행 (캡션 + 색) */}
                <FieldRow label={t("admin.settings.faviconBg")} className={styles.faviconFormRow}>
                  <div className={styles.faviconColorDuo}>
                    <div className={styles.faviconColorItem}>
                      <span className={styles.faviconColorCaption}>{t("admin.settings.faviconVariantLight")}</span>
                      <div className={shared.colorField}>
                        <ColorPicker
                          value={config.brand.faviconBgLight || config.brand.logoColorDark || "#f5f5f0"}
                          onChange={(c) => update("brand", "faviconBgLight", c.hex)}
                          triggerClassName={shared.colorPicker}
                        />
                        <Input
                          className={shared.colorInput}
                          value={config.brand.faviconBgLight}
                          onChange={(v) => update("brand", "faviconBgLight", v)}
                          placeholder={t("admin.settings.faviconBgPlaceholder")}
                          maxLength={7}
                        />
                      </div>
                    </div>
                    <div className={styles.faviconColorItem}>
                      <span className={styles.faviconColorCaption}>{t("admin.settings.faviconVariantDark")}</span>
                      <div className={shared.colorField}>
                        <ColorPicker
                          value={config.brand.faviconBgDark || config.brand.logoColor || "#0a0a0a"}
                          onChange={(c) => update("brand", "faviconBgDark", c.hex)}
                          triggerClassName={shared.colorPicker}
                        />
                        <Input
                          className={shared.colorInput}
                          value={config.brand.faviconBgDark}
                          onChange={(v) => update("brand", "faviconBgDark", v)}
                          placeholder={t("admin.settings.faviconBgPlaceholder")}
                          maxLength={7}
                        />
                      </div>
                    </div>
                    <ColorDuoTools
                      light={config.brand.faviconBgLight}
                      dark={config.brand.faviconBgDark}
                      onLight={(v) => update("brand", "faviconBgLight", v)}
                      onDark={(v) => update("brand", "faviconBgDark", v)}
                      labels={{ match: t("admin.settings.colorMatch"), swap: t("admin.settings.colorSwap"), clear: t("admin.settings.colorClear") }}
                    />
                  </div>
                </FieldRow>
                {/* 배경 테두리 — 두께(px) + variant 색. 두께 0 이면 미표시 */}
                <FieldRow label={t("admin.settings.faviconBorder")} className={styles.faviconFormRow}>
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
                  <FieldRow label={t("admin.settings.faviconBorderColor")} className={styles.faviconFormRow}>
                    <div className={styles.faviconColorDuo}>
                      <div className={styles.faviconColorItem}>
                        <span className={styles.faviconColorCaption}>{t("admin.settings.faviconVariantLight")}</span>
                        <div className={shared.colorField}>
                          <ColorPicker
                            value={config.brand.faviconBorderColorLight || "#0a0a0a"}
                            onChange={(c) => update("brand", "faviconBorderColorLight", c.hex)}
                            triggerClassName={shared.colorPicker}
                          />
                          <Input
                            className={shared.colorInput}
                            value={config.brand.faviconBorderColorLight}
                            onChange={(v) => update("brand", "faviconBorderColorLight", v)}
                            placeholder={t("admin.settings.faviconBgPlaceholder")}
                            maxLength={7}
                          />
                        </div>
                      </div>
                      <div className={styles.faviconColorItem}>
                        <span className={styles.faviconColorCaption}>{t("admin.settings.faviconVariantDark")}</span>
                        <div className={shared.colorField}>
                          <ColorPicker
                            value={config.brand.faviconBorderColorDark || "#f5f5f0"}
                            onChange={(c) => update("brand", "faviconBorderColorDark", c.hex)}
                            triggerClassName={shared.colorPicker}
                          />
                          <Input
                            className={shared.colorInput}
                            value={config.brand.faviconBorderColorDark}
                            onChange={(v) => update("brand", "faviconBorderColorDark", v)}
                            placeholder={t("admin.settings.faviconBgPlaceholder")}
                            maxLength={7}
                          />
                        </div>
                      </div>
                      <ColorDuoTools
                        light={config.brand.faviconBorderColorLight}
                        dark={config.brand.faviconBorderColorDark}
                        onLight={(v) => update("brand", "faviconBorderColorLight", v)}
                        onDark={(v) => update("brand", "faviconBorderColorDark", v)}
                        labels={{ match: t("admin.settings.colorMatch"), swap: t("admin.settings.colorSwap"), clear: t("admin.settings.colorClear") }}
                      />
                    </div>
                  </FieldRow>
                )}
                {/* 글자색 — favicon 텍스트 색 override. 빈 값이면 preset 자동 계산 (하위호환) */}
                <FieldRow label={t("admin.settings.faviconTextColor")} className={styles.faviconFormRow}>
                  <div className={styles.faviconColorDuo}>
                    <div className={styles.faviconColorItem}>
                      <span className={styles.faviconColorCaption}>{t("admin.settings.faviconVariantLight")}</span>
                      <div className={shared.colorField}>
                        <ColorPicker
                          value={config.brand.faviconColor || config.brand.logoColor || config.theme.lightText}
                          onChange={(c) => update("brand", "faviconColor", c.hex)}
                          triggerClassName={shared.colorPicker}
                        />
                        <Input
                          className={shared.colorInput}
                          value={config.brand.faviconColor}
                          onChange={(v) => update("brand", "faviconColor", v)}
                          placeholder={t("admin.settings.faviconBgPlaceholder")}
                          maxLength={7}
                        />
                      </div>
                    </div>
                    <div className={styles.faviconColorItem}>
                      <span className={styles.faviconColorCaption}>{t("admin.settings.faviconVariantDark")}</span>
                      <div className={shared.colorField}>
                        <ColorPicker
                          value={config.brand.faviconColorDark || config.brand.logoColorDark || config.theme.darkText}
                          onChange={(c) => update("brand", "faviconColorDark", c.hex)}
                          triggerClassName={shared.colorPicker}
                        />
                        <Input
                          className={shared.colorInput}
                          value={config.brand.faviconColorDark}
                          onChange={(v) => update("brand", "faviconColorDark", v)}
                          placeholder={t("admin.settings.faviconBgPlaceholder")}
                          maxLength={7}
                        />
                      </div>
                    </div>
                    <ColorDuoTools
                      light={config.brand.faviconColor}
                      dark={config.brand.faviconColorDark}
                      onLight={(v) => update("brand", "faviconColor", v)}
                      onDark={(v) => update("brand", "faviconColorDark", v)}
                      labels={{ match: t("admin.settings.colorMatch"), swap: t("admin.settings.colorSwap"), clear: t("admin.settings.colorClear") }}
                    />
                  </div>
                </FieldRow>
              </div>
            </div>
            {/* 그림자 — 텍스트/배경 통합 카드 (세그먼트 탭으로 편집 대상 전환) */}
            <FaviconShadowControls
              textShadow={config.brand.faviconTextShadow ?? DEFAULT_FAVICON_TEXT_SHADOW}
              bgShadow={config.brand.faviconBgShadow ?? DEFAULT_FAVICON_BG_SHADOW}
              onChangeText={(v) => update("brand", "faviconTextShadow", v)}
              onChangeBg={(v) => update("brand", "faviconBgShadow", v)}
              t={t}
            />
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
              <FieldRow label={t("admin.settings.logoFullText")} className={styles.faviconFormRow}>
                <div className={styles.brandTextInputWrap}>
                  <HighlightInput value={config.brand.logoFullText} onChange={(v) => update("brand", "logoFullText", v)} maxHint={20} maxLength={20} />
                </div>
              </FieldRow>
              {/* 로고 색상 — 프리셋 + Light/Dark override (풀로고·텍스트 로고 색) */}
              <FieldRow label={t("admin.settings.logoColorPresets")} className={styles.faviconFormRow}>
            <div className={styles.logoColorPresets}>
              {presets.map((p, i) => (
                <div key={`${p.name}-${i}`} className={styles.logoColorPresetWrap}>
                  <button
                    type="button"
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
              <FieldRow label={t("admin.settings.logoColorLabel")} className={styles.faviconFormRow}>
                <div className={styles.faviconColorDuo}>
                  <div className={styles.faviconColorItem}>
                    <span className={styles.faviconColorCaption}>{t("admin.settings.faviconVariantLight")}</span>
                    <div className={shared.colorField}>
                      <ColorPicker value={config.brand.logoColor || "#000000"} onChange={(c) => update("brand", "logoColor", c.hex)} triggerClassName={shared.colorPicker} />
                      <Input className={shared.colorInput} value={config.brand.logoColor || "#000000"} onChange={(v) => update("brand", "logoColor", v)} placeholder={t("admin.settings.logoColorPlaceholder")} maxLength={7} />
                    </div>
                  </div>
                  <div className={styles.faviconColorItem}>
                    <span className={styles.faviconColorCaption}>{t("admin.settings.faviconVariantDark")}</span>
                    <div className={shared.colorField}>
                      <ColorPicker value={config.brand.logoColorDark || "#ffffff"} onChange={(c) => update("brand", "logoColorDark", c.hex)} triggerClassName={shared.colorPicker} />
                      <Input className={shared.colorInput} value={config.brand.logoColorDark || "#ffffff"} onChange={(v) => update("brand", "logoColorDark", v)} placeholder={t("admin.settings.logoColorPlaceholder")} maxLength={7} />
                    </div>
                  </div>
                </div>
              </FieldRow>
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
        </motion.div>
        )}
        </AnimatePresence>
      </section>

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
          rowClassName={shared.sectionTitleRow}
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
