"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import type { SettingsTabProps } from "../_types";
import Checkbox from "@/components/ui/Checkbox";
import ColorPicker from "@/components/ui/ColorPicker";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Field, { AudioUpload, LogoUpload, TagField } from "./SettingsFormFields";
import SectionHeader from "./SectionHeader";
import styles from "../Settings.module.css";

type LogoColorPreset = { name: string; light: string; dark: string };

/** logoColorPresets 가 config 에 없는 legacy 환경용 minimal fallback */
const LOGO_COLOR_PRESETS_FALLBACK: LogoColorPreset[] = [
  { name: "Default", light: "", dark: "" },
];

export default function GeneralTab({ config, savedConfig, update, saveSection, revertSection, savingPaths }: SettingsTabProps) {
  const { t } = useLanguage();

  /** 공통 props 묶음 — SectionHeader 에 spread */
  const sh = { config, savedConfig, saveSection, revertSection, savingPaths, titleClassName: styles.sectionTitle };

  const presets: LogoColorPreset[] = config.brand.logoColorPresets ?? LOGO_COLOR_PRESETS_FALLBACK;
  // 현재 색상이 기존 preset 중 하나와 일치하는지 — 일치하면 \"추가\" 버튼 숨김
  const currentLight = config.brand.logoColor;
  const currentDark = config.brand.logoColorDark;
  const matchesExisting = presets.some((p) => p.light === currentLight && p.dark === currentDark);
  // 추가 가능 조건: 일치 X + 적어도 light/dark 중 하나 비어있지 않음
  const canAddPreset = !matchesExisting && !!(currentLight || currentDark);

  const [addingPresetName, setAddingPresetName] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

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
      {/* Personal — 2-col 배치 */}
      <section className={`${styles.section} ${styles.sectionWide}`}>
        <SectionHeader title={t("admin.settings.personal")} paths={["personal", "contact.email"]} {...sh} />
        <div className={`${styles.fields} ${styles.fieldsGrid2}`}>
          <Field label={t("admin.settings.name")} value={config.personal.name} onChange={(v) => update("personal", "name", v)} />
          <Field label={t("admin.settings.role")} value={config.personal.role} onChange={(v) => update("personal", "role", v)} />
          <Field label={t("admin.settings.nickname")} value={config.personal.nickname} onChange={(v) => update("personal", "nickname", v)} />
          <Field label={t("admin.settings.location")} value={config.personal.location} onChange={(v) => update("personal", "location", v)} />
          <Field label={t("admin.settings.status")} value={config.personal.status} onChange={(v) => update("personal", "status", v)} />
          <Field label={t("admin.settings.email")} value={config.contact.email} onChange={(v) => update("contact", "email", v)} />
        </div>
      </section>

      {/* Brand */}
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
            </div>
          </div>
          <div className={styles.fieldPair}>
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>{t("admin.settings.logoColor")}</label>
              <div className={styles.colorField}>
                <ColorPicker value={config.brand.logoColor || "#000000"} onChange={(c) => update("brand", "logoColor", c.hex)} triggerClassName={styles.colorPicker} />
                <Input
                  size="sm"
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
                  size="sm"
                  className={styles.colorInput}
                  value={config.brand.logoColorDark || "#ffffff"}
                  onChange={(v) => update("brand", "logoColorDark", v)}
                  placeholder={t("admin.settings.logoColorPlaceholder")}
                  maxLength={7}
                />
              </div>
            </div>
          </div>
          {/* 색상 변경 시 — 현재 색상을 새 프리셋으로 저장 */}
          {canAddPreset && (
            <div className={styles.logoColorPresetAddRow}>
              {addingPresetName ? (
                <>
                  <Input
                    size="sm"
                    className={styles.logoColorPresetNameInput}
                    placeholder={t("admin.settings.presetNamePlaceholder")}
                    value={newPresetName}
                    onChange={setNewPresetName}
                    autoFocus
                  />
                  <Button
                    variant="outline"
                    size="2xs"
                    onClick={addCurrentAsPreset}
                    disabled={!newPresetName.trim() || presets.some((p) => p.name === newPresetName.trim())}
                    icon={<Plus size={12} strokeWidth={2} />}
                  >
                    {t("admin.settings.saveEdit")}
                  </Button>
                  <Button
                    variant="outline"
                    size="2xs"
                    onClick={() => { setAddingPresetName(false); setNewPresetName(""); }}
                    icon={<X size={12} strokeWidth={2.5} />}
                  >
                    {t("admin.settings.cancel")}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="2xs"
                  onClick={() => setAddingPresetName(true)}
                  icon={<Plus size={12} strokeWidth={2} />}
                >
                  {t("admin.settings.savePreset")}
                </Button>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Sub: 로고 파일 — Light / Dark 그룹 */}
        <div className={styles.subSection}>
          <h3 className={styles.sectionSubTitle}>
            {t("admin.settings.logoFilesSection")}
            <span className={styles.fieldGroupTitleHint}>{t("admin.settings.logoUploadHint")}</span>
          </h3>
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

      {/* SEO / Metadata */}
      <section className={styles.section} style={{ gridRow: "span 2", borderBottom: "none" }}>
        <SectionHeader title={t("admin.settings.seoMetadata")} paths={["metadata"]} {...sh} />
        <div className={styles.fields}>
          <Field label={t("admin.settings.siteTitle")} hint={t("admin.settings.siteTitleHint")} value={config.metadata.title} onChange={(v) => update("metadata", "title", v)} />
          <Field label={t("admin.settings.description")} hint={t("admin.settings.descriptionHint")} value={config.metadata.description} onChange={(v) => update("metadata", "description", v)} multiline />
          <TagField label={t("admin.settings.keywords")} hint={t("admin.settings.keywordsHint")} value={config.metadata.keywords} onChange={(v) => update("metadata", "keywords", v)} placeholder={t("admin.settings.tagPlaceholder")} />
          <Field label={t("admin.settings.author")} value={config.metadata.author} onChange={(v) => update("metadata", "author", v)} />
        </div>
      </section>

      {/* BGM */}
      <section className={styles.section}>
        <SectionHeader title={t("admin.settings.bgm")} paths={["bgm"]} {...sh} />
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
