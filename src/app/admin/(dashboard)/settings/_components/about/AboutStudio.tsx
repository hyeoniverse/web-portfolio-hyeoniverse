"use client";

/* ─────────────────────────────────────────────────────────────
   About Studio — WYSIWYG 편집기. 폼이 아니라 결과물 위에서 직접 편집.
   Hero: 실제 렌더 → 텍스트 클릭해 인라인 수정, 포커스 시 플로팅 타입 툴바,
   배경 직접 조작. 나머지 패널: 결과형 카드 + 인라인 텍스트 편집. KO/EN 토글.
   저장은 탭 상단 Save Tab 에 위임(폼 헤더 없음).
   ───────────────────────────────────────────────────────────── */

import css from "./AboutStudio.module.css";
/* 실제 About Hero 와 픽셀 동일하게 렌더하려고 그 CSS 모듈을 그대로 재사용 */
import hero from "@/app/about/_components/panels/HeroPanel.module.css";
import kin from "@/components/common/KineticHeroTitle.module.css";
import { erdTables as staticErdTables, erdRelations as staticErdRelations } from "@/data/about/erd";
import { aboutDecisions } from "@/data/generated/aboutContent";
import type { TroubleShootingItem } from "@/data/about/types";
import type { ErdTable, ErdRelation } from "@/data/about/types";
import { userFlows } from "@/data/about/architecture";
import type { UserFlow } from "@/data/about/types";
import { backendItems } from "@/data/about/backend";
import type { BackendItem } from "@/data/about/types";
import Pressable from "@/components/ui/Pressable";
import { aboutPanelLabel, aboutPanelTitle } from "@/data/about/panels";
import type { TFunction } from "@/providers/LanguageProvider";
import type { Language } from "@/types";
import { useState, useEffect, useRef, type CSSProperties, type Dispatch, type FocusEvent, type ReactNode, type SetStateAction } from "react";
import { Image as ImageIcon, LayoutTemplate,
} from "@/components/icons";
import { type SiteConfigData } from "@/config/site.config";
import type { SettingsTabProps } from "../../_types";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Popover from "@/components/ui/Popover";
import ColorPicker from "@/components/ui/ColorPicker";
import NumberInput from "@/components/ui/NumberInput";
import { Slider } from "@/components/ui/Slider";
import SegmentedControl from "@/components/ui/SegmentedControl";
import FloatingBar from "@/components/posts/plate/toolbars/FloatingBar";
import { sec, mediaUrlOf, isVideoUrl, DESIGN_W, DESIGN_H, EditableText, type ThemeBg } from "./studio/primitives";
import { PanelGroup, PanelManager } from "./studio/panels";
import { AboutFontPicker, SwatchField, BgMedia } from "./studio/fields";
import { OverviewBlock } from "./studio/blocks/OverviewBlock";
import { FeaturesBlock } from "./studio/blocks/FeaturesBlock";
import { ProcessBlock } from "./studio/blocks/ProcessBlock";
import { SecurityBlock } from "./studio/blocks/SecurityBlock";
import { DesignSystemBlock, TYPO, WEIGHTS, seedConcepts, type TypoKey, type ActiveKey, type ConceptItem } from "./studio/blocks/DesignSystemBlock";
import { CodeHighlightsBlock, seedCode, type CodeItem } from "./studio/blocks/CodeHighlightsBlock";
import { UserFlowBlock } from "./studio/blocks/UserFlowBlock";
import { ErdBlock } from "./studio/blocks/ErdBlock";
import { BackendBlock } from "./studio/blocks/BackendBlock";
import { TroubleshootingBlock } from "./studio/blocks/TroubleshootingBlock";
import { CreditsBlock } from "./studio/blocks/CreditsBlock";
import { ArchitectureBlock, type ArchitectureItem } from "./studio/blocks/ArchitectureBlock";
import { BreakBlock } from "./studio/blocks/BreakBlock";
type AboutStudioProps = {
  config: SiteConfigData;
  setConfig: Dispatch<SetStateAction<SiteConfigData>>;
  update: SettingsTabProps["update"];
  savedConfig: SettingsTabProps["savedConfig"];
  saveSection: SettingsTabProps["saveSection"];
  revertSection: SettingsTabProps["revertSection"];
  resetSection: SettingsTabProps["resetSection"];
  savingPaths: SettingsTabProps["savingPaths"];
  t: TFunction;
  themeBg: ThemeBg;
  techStackSlot: ReactNode;
};
/* ═══════════ 메인 ═══════════ */
export default function AboutStudio({ config, setConfig, update, savedConfig, saveSection, revertSection, resetSection, savingPaths, t, themeBg, techStackSlot }: AboutStudioProps) {
  const about = config.about;
  const rec = about as unknown as Record<string, string | undefined>;
  const [lang, setLang] = useState<Language>("ko");
  const [active, setActive] = useState<ActiveKey | null>(null);
  const [bgTab, setBgTab] = useState<"media" | "color" | "gradient">("media");
  const [scale, setScale] = useState(0.5);
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeElRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setScale(Math.min(1, el.clientWidth / DESIGN_W));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* floating 타입 툴바 — 포커스된 요소에 앵커(공통 FloatingBar). 요소를 ref 로 잡아 rect 제공 */
  const openBar = (k: TypoKey, e: FocusEvent<HTMLElement>) => {
    setActive(k);
    activeElRef.current = e.currentTarget;
  };
  const closeBar = () => { setActive(null); };

  /* 바깥과 상호작용하면 floating 바를 닫는다. 유지 대상:
     - 활성 Hero 요소 / Hero 스테이지(다른 요소 재앵커·빈곳 클릭은 자체 처리)
     - 플로팅 바 프레임([data-floating-bar])
     - 열린 팝오버: Select/FontPicker/Popover 드롭다운은 data-lenis-prevent 로,
       ColorPicker 는 자체 pointerdown stopPropagation 으로 이 핸들러에 도달하지 않는다. */
  useEffect(() => {
    if (active == null) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (activeElRef.current?.contains(t)) return;
      if (wrapRef.current?.contains(t)) return;
      if (t.closest("[data-floating-bar]")) return;
      if (t.closest("[data-lenis-prevent]")) return;
      setActive(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [active]);

  const setAny = (key: string, value: unknown) =>
    update("about", key as keyof SiteConfigData["about"], value as SiteConfigData["about"][keyof SiteConfigData["about"]]);
  const setArch = (v: ArchitectureItem[]) => setAny("architectureItems", v);
  /* 패널 제목 — 관리자가 지정한 값(admin panelTitles)을 스튜디오 프리뷰에도 즉시 반영.
     날것으로 쓰지 않고 레지스트리를 거친다. 아래 패널 칩은 마침표를 뗀 이름을 보여 주고
     거기서 고치게 하므로, 저장된 값을 그대로 찍으면 이름을 바꾼 패널만 마침표가 없다. */
  const panelOverride = (k: string) => (about.panelTitles as Record<string, { ko?: string; en?: string }> | undefined)?.[k]?.[lang];
  /** 패널 안에 큰 제목으로 찍히는 형태 (마침표 포함) */
  const panelTitleOf = (k: string) => aboutPanelTitle(k, panelOverride(k));
  /** 저장 헤더·목록에 쓰는 형태 (마침표 없음) */
  const panelLabelOf = (k: string) => aboutPanelLabel(k, panelOverride(k));
  /* 패널별 저장 — 각 패널이 책임지는 about.* config 경로. hero/overview 는 prefix 로 자동 수집(키 추가돼도 유지). */
  const aboutKeys = Object.keys(config.about);
  const savePathsFor = (key: string): string[] => {
    switch (key) {
      case "panels": return ["about.panelOrder", "about.hiddenPanels", "about.panelTitles", "about.infiniteScroll"];
      case "hero": return aboutKeys.filter((k) => k.startsWith("hero")).map((k) => `about.${k}`);
      case "overview": return aboutKeys.filter((k) => k.startsWith("overview")).map((k) => `about.${k}`);
      case "architecture": return ["about.architectureItems", "about.archDiagram"];
      case "features": return ["about.features"];
      case "process": return ["about.process"];
      case "security": return ["about.security"];
      case "designSystem": return ["about.designSystem"];
      case "codeHighlights": return ["about.codeHighlights"];
      case "backend": return ["about.backend"];
      case "userflow": return ["about.userFlows"];
      case "erd": return ["about.erdTables", "about.erdRelations"];
      case "troubleshooting": return ["about.troubleshooting"];
      case "credits": return ["about.creditsNames", "about.creditsNote", "about.creditsNote_ko",
            "about.creditsNoteFontSize", "about.creditsNoteFontFamily",
            "about.creditsNoteLineHeight", "about.creditsNoteAlign"];
      case "visualBreak": return ["about.visualBreakImage"];
      case "techStack": return ["about.techStack"];
      default: return [];
    }
  };
  const saveHdr = { config, savedConfig, saveSection, revertSection, resetSection, savingPaths, setAny, lang, t };

  /* Hero 텍스트 (언어별) */
  type HeroBase = "heroLine1" | "heroLine2" | "heroWatermark" | "heroLabel" | "heroSubtitle";
  const heroText = (base: HeroBase) =>
    lang === "ko" ? (rec[`${base}_ko`] ?? "") : (rec[base] ?? "");
  const setHeroText = (base: HeroBase, v: string) =>
    setAny(lang === "ko" ? `${base}_ko` : base, v);

  /* Hero — 실제 HeroPanel.tsx 와 동일하게 panel 스타일 + --_hero-* CSS 변수 구성 (빈 값이면 미적용→기본 typography) */
  const grF = about.heroBgGradientFrom, grT = about.heroBgGradientTo, grA = about.heroBgGradientAngle ?? 135;
  const grFd = about.heroBgGradientFrom_dark, grTd = about.heroBgGradientTo_dark;
  const media = mediaUrlOf((about.heroBackground ?? "").trim());
  const isVideo = isVideoUrl(media);
  /* 색/그라디언트는 라이트/다크 따로 (미디어는 공용). 각 테마 값이 있을 때만 CSS 변수+marker 클래스로 적용. */
  const gradOf = (f?: string, t2?: string) => (f && t2 ? `linear-gradient(${grA}deg, ${f}, ${t2})` : "");
  const bgLight = gradOf(grF, grT) || about.heroBgColor || "";
  const bgDark = gradOf(grFd, grTd) || about.heroBgColor_dark || "";
  const overlayColor = about.heroVideoOverlayColor || "";
  const overlayStrength = about.heroVideoOverlayStrength ?? 0.5;
  const mediaOpacity = about.heroBgOpacity ?? 0.8;
  /* Hero 콘텐츠 정렬 + 요소 숨김 */
  const heroHidden = new Set((about.heroHidden ?? []) as string[]);
  const alignH = (about.heroAlignH ?? "left") as "left" | "center" | "right";
  const alignV = (about.heroAlignV ?? "center") as "top" | "center" | "bottom";
  const heroContentStyle: CSSProperties = {
    alignItems: alignH === "center" ? "center" : alignH === "right" ? "flex-end" : "flex-start",
    justifyContent: alignV === "top" ? "flex-start" : alignV === "bottom" ? "flex-end" : "center",
    textAlign: alignH,
  };
  const HERO_ELEMENTS: { key: string; label: string }[] = [
    { key: "label", label: lang === "ko" ? "라벨" : "Label" },
    { key: "line1", label: lang === "ko" ? "제목 1행" : "Title line 1" },
    { key: "line2", label: lang === "ko" ? "제목 2행" : "Title line 2" },
    { key: "subtitle", label: lang === "ko" ? "서브타이틀" : "Subtitle" },
    { key: "watermark", label: lang === "ko" ? "워터마크" : "Watermark" },
  ];
  const toggleHeroHidden = (k: string) => {
    const s = new Set(heroHidden);
    if (s.has(k)) s.delete(k); else s.add(k);
    setAny("heroHidden", Array.from(s));
  };

  const panelStyle: CSSProperties = {};
  if (bgLight) (panelStyle as Record<string, string>)["--_hero-bg-light"] = bgLight;
  if (bgDark) (panelStyle as Record<string, string>)["--_hero-bg-dark"] = bgDark;
  const setVar = (k: string, v: string | undefined) => { if (v) (panelStyle as Record<string, string>)[k] = v; };
  ([["heroLine1", "line1"], ["heroLine2", "line2"], ["heroSubtitle", "subtitle"], ["heroWatermark", "watermark"]] as const).forEach(([base, cssBase]) => {
    setVar(`--_hero-${cssBase}-color`, rec[`${base}Color`]);
    setVar(`--_hero-${cssBase}-font-size`, rec[`${base}FontSize`]);
    setVar(`--_hero-${cssBase}-font-weight`, rec[`${base}FontWeight`]);
    setVar(`--_hero-${cssBase}-font-family`, rec[`${base}FontFamily`]);
  });
  if (media) (panelStyle as Record<string, string>)["--_hero-bg-opacity"] = String(mediaOpacity);
  if (isVideo) {
    if (overlayColor) (panelStyle as Record<string, string>)["--_hero-overlay-color"] = overlayColor;
    (panelStyle as Record<string, string>)["--_hero-overlay-strength"] = String(overlayStrength);
  }
  /* 실제 .panel 은 100vw/100vh — 여기선 실제 화면 비율(DESIGN_W×DESIGN_H)로 그린 뒤
     transform: scale 로 축소해 위치·비율이 실제와 동일한 미니어처로 렌더 (폰트 크기도 함께 축소) */
  panelStyle.position = "absolute";
  panelStyle.top = "0";
  panelStyle.left = "0";
  panelStyle.width = `${DESIGN_W}px`;
  panelStyle.height = `${DESIGN_H}px`;
  panelStyle.transform = `scale(${scale})`;
  panelStyle.transformOrigin = "top left";

  /* ── 플로팅 타입 툴바 ── */
  const textFb = (k: TypoKey) => (k === "heroLine2" ? themeBg.accent : "var(--text-primary)");

  const typeToolbar = (k: ActiveKey) => {
    if (k === "heroAccent") {
      const av = rec.heroAccentColor || "";
      return (
        <>
          <span className={css.ttLabel}>밑줄</span>
          <ColorPicker value={av || themeBg.accent} onChange={(c) => setAny("heroAccentColor", c.hex)}>
            {({ toggle }) => <Pressable className={css.ttSwatch} style={{ background: av || themeBg.accent }} onClick={toggle} aria-label="색상" />}
          </ColorPicker>
        </>
      );
    }
    const cfg = TYPO[k];
    const fb = textFb(k);
    const colorVal = rec[`${k}Color`] || "";
    const remVal = parseFloat(rec[`${k}FontSize`] || "") || cfg.def;
    const px = Math.round(remVal * 16);
    const label = k === "heroLine1" ? "Line 1" : k === "heroLine2" ? "Line 2" : k === "heroSubtitle" ? "Subtitle" : "Watermark";
    return (
      <>
        <span className={css.ttLabel}>{label}</span>
        <ColorPicker value={colorVal || fb} onChange={(c) => setAny(`${k}Color`, c.hex)}>
          {({ toggle }) => <Pressable className={css.ttSwatch} style={{ background: colorVal || fb }} onClick={toggle} aria-label="색상" />}
        </ColorPicker>
        <NumberInput value={px} unit="px" width={46} ariaLabel="글자 크기"
          min={Math.round(cfg.min * 16)} max={Math.round(cfg.max * 16)} step={Math.max(1, Math.round(cfg.step * 16))}
          onCommit={(n) => setAny(`${k}FontSize`, `${Math.round((n / 16) * 1000) / 1000}rem`)} />
        <Select value={rec[`${k}FontWeight`] || "400"} onChange={(v) => setAny(`${k}FontWeight`, v)} options={WEIGHTS} />
        <AboutFontPicker value={rec[`${k}FontFamily`] || ""} onChange={(v) => setAny(`${k}FontFamily`, v)}
          fallbackLabel={t("admin.settings.aboutHeroDefault")} />
      </>
    );
  };

  return (
    <div className={css.studio} style={{ gridColumn: "1 / -1" }}>
      {/* ── 상단 바 ── */}
      <div className={css.bar}>
        <SegmentedControl<Language> size="sm" value={lang} onChange={setLang} className={css.segFit}
          items={[{ value: "ko", label: "KO" }, { value: "en", label: "EN" }]} />
        <p className={css.barHint}>{t("admin.settings.aboutStudioHint")}</p>
      </div>

      {/* 활성 Hero 요소에 앵커된 공통 FloatingBar — 핸들로 위치 이동 + 스크롤 추적 + body portal(안 잘림) */}
      <FloatingBar
        open={active != null}
        anchorKey={active}
        getAnchorRect={() => activeElRef.current?.getBoundingClientRect() ?? new DOMRect()}
        placement="top"
        inline
      >
        {active && typeToolbar(active)}
      </FloatingBar>

      {/* ── 패널 관리 (순서 DnD + 표시) ── 어느 패널을 어떤 순서로 낼지 먼저 정하고
           개별 내용으로 들어가는 흐름이라 맨 위에 둔다. ── */}
      <PanelGroup label={lang === "ko" ? "패널 순서·표시" : "Panel order & visibility"} paths={savePathsFor("panels")} panelKey="panels" {...saveHdr}>
        <PanelManager about={about} setAny={setAny} t={t} lang={lang} />
      </PanelGroup>

      {/* ── Hero 라이브 프리뷰 — 실제 About Hero CSS 를 데스크톱 비율로 그려 scale 다운 ── */}
      <PanelGroup label={panelLabelOf("hero")} paths={savePathsFor("hero")} panelKey="hero" {...saveHdr}>
        <div className={css.stageWrap} ref={wrapRef} style={{ height: DESIGN_H * scale }}>
          <div
            className={`${sec.section} ${sec.panel} ${hero.heroPanelBg} ${hero.heroReady} ${bgLight ? hero.heroBgLight : ""} ${bgDark ? hero.heroBgDark : ""} ${media ? hero.heroMediaMode : ""}`}
            style={panelStyle}
            onClick={(e) => { if (e.target === e.currentTarget) closeBar(); }}
          >
            {media && (isVideo
              ? <video className={hero.heroBgMedia} src={media} autoPlay muted loop playsInline aria-hidden />
              // eslint-disable-next-line @next/next/no-img-element
              : <img className={hero.heroBgMedia} src={media} alt="" aria-hidden />)}
            {media && <div className={hero.heroBgOverlay} aria-hidden />}

            <div className={hero.heroContent} style={heroContentStyle}>
              {/* 워터마크 — 콘텐츠보다 먼저 그려 겹침 영역은 텍스트가 클릭 우선, 빈 영역에선 편집 가능 */}
              {!heroHidden.has("watermark") && (
                <span className={hero.heroWatermark} style={{ pointerEvents: "auto", opacity: 0.09, userSelect: "auto" }} title="워터마크">
                  <EditableText value={heroText("heroWatermark")} onChange={(v) => setHeroText("heroWatermark", v)}
                    placeholder="watermark" ariaLabel="watermark" onFocus={(e) => openBar("heroWatermark", e)} />
                </span>
              )}
              {!heroHidden.has("label") && (
                <span className={hero.label} style={{ pointerEvents: "auto" }}>
                  <EditableText value={heroText("heroLabel") || t("aboutPage.title")} onChange={(v) => setHeroText("heroLabel", v)}
                    placeholder={t("aboutPage.title")} ariaLabel="label" />
                </span>
              )}
              <h2 className={kin.title}>
                {!heroHidden.has("line1") && (
                  <span className={kin.line}>
                    <EditableText value={heroText("heroLine1")} onChange={(v) => setHeroText("heroLine1", v)}
                      placeholder={lang === "ko" ? "1번째 줄" : "Line 1"} ariaLabel="line1" onFocus={(e) => openBar("heroLine1", e)} />
                  </span>
                )}
                {!heroHidden.has("line2") && (
                  <span className={kin.line}>
                    <EditableText value={heroText("heroLine2")} onChange={(v) => setHeroText("heroLine2", v)}
                      placeholder={lang === "ko" ? "2번째 줄" : "Line 2"} ariaLabel="line2" onFocus={(e) => openBar("heroLine2", e)} />
                  </span>
                )}
              </h2>
              {!heroHidden.has("subtitle") && (
                <p className={hero.heroSubtitle}>
                  <EditableText multiline value={heroText("heroSubtitle") || t("aboutPage.description")}
                    onChange={(v) => setHeroText("heroSubtitle", v)} placeholder={t("aboutPage.description")}
                    ariaLabel="subtitle" onFocus={(e) => openBar("heroSubtitle", e)} style={{ minWidth: "22ch", width: "100%" }} />
                </p>
              )}
              <Pressable className={css.accentHit} title="밑줄 색" aria-label="밑줄 색"
                onClick={(e) => { setActive("heroAccent"); activeElRef.current = e.currentTarget; }}>
                <span className={hero.heroAccentLine} />
              </Pressable>
            </div>
          </div>

          {/* 우상단 컨트롤 — 레이아웃(정렬·요소) + 배경 */}
          <div className={css.stageBgBtn}>
            <Popover placement="bottom-end" trigger={<Button variant="difference" size="md" icon={<LayoutTemplate size={16} />}>{t("admin.settings.aboutHeroLayout")}</Button>}>
              <div className={css.layoutPanel}>
                <div className={css.field}>
                  <span className={css.fieldLabel}>{lang === "ko" ? "가로 정렬" : "Horizontal"}</span>
                  <SegmentedControl<"left" | "center" | "right"> size="sm" value={alignH} onChange={(v) => setAny("heroAlignH", v)} className={css.segFit}
                    items={[{ value: "left", label: lang === "ko" ? "좌" : "L" }, { value: "center", label: lang === "ko" ? "중" : "C" }, { value: "right", label: lang === "ko" ? "우" : "R" }]} />
                </div>
                <div className={css.field}>
                  <span className={css.fieldLabel}>{lang === "ko" ? "세로 정렬" : "Vertical"}</span>
                  <SegmentedControl<"top" | "center" | "bottom"> size="sm" value={alignV} onChange={(v) => setAny("heroAlignV", v)} className={css.segFit}
                    items={[{ value: "top", label: lang === "ko" ? "상" : "T" }, { value: "center", label: lang === "ko" ? "중" : "M" }, { value: "bottom", label: lang === "ko" ? "하" : "B" }]} />
                </div>
                <div className={css.field}>
                  <span className={css.fieldLabel}>{lang === "ko" ? "표시 요소" : "Elements"}</span>
                  <div className={css.stripChips}>
                    {HERO_ELEMENTS.map((el) => {
                      const on = !heroHidden.has(el.key);
                      return (
                        <Pressable key={el.key} className={`${css.chip} ${on ? css.chipOn : css.chipOff}`} onClick={() => toggleHeroHidden(el.key)}>
                          <span className={css.chipDot} />{el.label}
                        </Pressable>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Popover>
            <Popover placement="bottom-end" trigger={<Button variant="difference" size="md" icon={<ImageIcon size={16} />}>{t("admin.settings.aboutHeroBackground")}</Button>}>
              <div className={css.bgPanel}>
                <SegmentedControl<"media" | "color" | "gradient"> size="sm" value={bgTab} onChange={setBgTab} className={css.segFit}
                  items={[
                    { value: "media", label: t("admin.settings.aboutHeroBgTypeMedia") },
                    { value: "color", label: t("admin.settings.aboutHeroBgTypeColor") },
                    { value: "gradient", label: t("admin.settings.aboutHeroBgTypeGradient") },
                  ]} />
                {bgTab === "media" && <BgMedia media={media} t={t} onSet={(u) => setAny("heroBackground", u)}
                  opacity={mediaOpacity} onOpacity={(n) => setAny("heroBgOpacity", n)}
                  overlay={overlayColor || themeBg.accent} onOverlay={(c) => setAny("heroVideoOverlayColor", c)}
                  strength={overlayStrength} onStrength={(n) => setAny("heroVideoOverlayStrength", n)} />}
                {bgTab === "color" && (
                  <div className={css.bgThemeRow}>
                    <div className={css.bgThemeCol}>
                      <span className={css.bgThemeLabel}>{t("admin.settings.aboutHeroThemeLight")}</span>
                      <div className={css.bgPreview} style={{ background: about.heroBgColor || themeBg.primary }} />
                      <SwatchField label={t("admin.settings.aboutHeroBgColor")} value={about.heroBgColor || themeBg.primary} onChange={(c) => setAny("heroBgColor", c)} />
                    </div>
                    <div className={css.bgThemeCol}>
                      <span className={css.bgThemeLabel}>{t("admin.settings.aboutHeroThemeDark")}</span>
                      <div className={css.bgPreview} style={{ background: about.heroBgColor_dark || themeBg.primary }} />
                      <SwatchField label={t("admin.settings.aboutHeroBgColor")} value={about.heroBgColor_dark || themeBg.primary} onChange={(c) => setAny("heroBgColor_dark", c)} />
                    </div>
                  </div>
                )}
                {bgTab === "gradient" && (
                  <>
                    <div className={css.bgThemeRow}>
                      <div className={css.bgThemeCol}>
                        <span className={css.bgThemeLabel}>{t("admin.settings.aboutHeroThemeLight")}</span>
                        <div className={css.bgPreview} style={{ background: `linear-gradient(${grA}deg, ${about.heroBgGradientFrom || themeBg.primary}, ${about.heroBgGradientTo || themeBg.secondary})` }} />
                        <SwatchField label={t("admin.settings.aboutHeroBgGradientFrom")} value={about.heroBgGradientFrom || themeBg.primary} onChange={(c) => setAny("heroBgGradientFrom", c)} />
                        <SwatchField label={t("admin.settings.aboutHeroBgGradientTo")} value={about.heroBgGradientTo || themeBg.secondary} onChange={(c) => setAny("heroBgGradientTo", c)} />
                      </div>
                      <div className={css.bgThemeCol}>
                        <span className={css.bgThemeLabel}>{t("admin.settings.aboutHeroThemeDark")}</span>
                        <div className={css.bgPreview} style={{ background: `linear-gradient(${grA}deg, ${about.heroBgGradientFrom_dark || themeBg.primary}, ${about.heroBgGradientTo_dark || themeBg.secondary})` }} />
                        <SwatchField label={t("admin.settings.aboutHeroBgGradientFrom")} value={about.heroBgGradientFrom_dark || themeBg.primary} onChange={(c) => setAny("heroBgGradientFrom_dark", c)} />
                        <SwatchField label={t("admin.settings.aboutHeroBgGradientTo")} value={about.heroBgGradientTo_dark || themeBg.secondary} onChange={(c) => setAny("heroBgGradientTo_dark", c)} />
                      </div>
                    </div>
                    <div className={css.field}>
                      <div className={css.sliderLabelRow}>
                        <span className={css.fieldLabel}>{t("admin.settings.aboutHeroBgGradientAngle")}</span>
                        <span className={css.sliderValue}>{grA}°</span>
                      </div>
                      <Slider min={0} max={360} step={1} value={[grA]} onValueChange={([n]) => setAny("heroBgGradientAngle", n)} />
                    </div>
                  </>
                )}
              </div>
            </Popover>
          </div>
        </div>
      </PanelGroup>

      {/* ── Overview ── */}
      <PanelGroup label={panelLabelOf("overview")} paths={savePathsFor("overview")} panelKey="overview" {...saveHdr}>
        <OverviewBlock about={about} lang={lang} setAny={setAny} t={t} title={panelTitleOf("overview")} />
      </PanelGroup>

      {/* ── Architecture ── */}
      <PanelGroup label={panelLabelOf("architecture")} paths={savePathsFor("architecture")} panelKey="architecture" {...saveHdr}>
        <ArchitectureBlock value={(about.architectureItems) ?? []} onChange={setArch}
          diagram={(about.archDiagram) ?? { nodes: [], edges: [] }}
          onDiagramChange={(v) => setAny("archDiagram", v)} t={t} lang={lang} />
      </PanelGroup>

      {/* ── User Flow ── */}
      <PanelGroup label={panelLabelOf("userflow")} paths={savePathsFor("userflow")} panelKey="userflow" {...saveHdr}>
        <UserFlowBlock lang={lang} t={t} title={panelTitleOf("userflow")}
          onChange={(v) => setAny("userFlows", v)}
          value={(about.userFlows as UserFlow[] | undefined)?.length ? (about.userFlows as UserFlow[]) : userFlows} />
      </PanelGroup>

      {/* ── Features ── */}
      <PanelGroup label={panelLabelOf("features")} paths={savePathsFor("features")} panelKey="features" {...saveHdr}>
        <FeaturesBlock value={about.features ?? []} onChange={(v) => setAny("features", v)} lang={lang} t={t} title={panelTitleOf("features")} />
      </PanelGroup>

      {/* ── Design System ── */}
      <PanelGroup label={panelLabelOf("designSystem")} paths={savePathsFor("designSystem")} panelKey="designSystem" {...saveHdr}>
        <DesignSystemBlock lang={lang} t={t} onChange={(v) => setAny("designSystem", v)}
          value={(about.designSystem as ConceptItem[] | undefined)?.length ? (about.designSystem as ConceptItem[]) : seedConcepts()} />
      </PanelGroup>

      {/* ── Process ── */}
      <PanelGroup label={panelLabelOf("process")} paths={savePathsFor("process")} panelKey="process" {...saveHdr}>
        <ProcessBlock value={about.process ?? []} onChange={(v) => setAny("process", v)} lang={lang} t={t} title={panelTitleOf("process")} />
      </PanelGroup>

      {/* ── Security ── */}
      <PanelGroup label={panelLabelOf("security")} paths={savePathsFor("security")} panelKey="security" {...saveHdr}>
        <SecurityBlock value={about.security ?? []} onChange={(v) => setAny("security", v)} lang={lang} t={t} title={panelTitleOf("security")} />
      </PanelGroup>

      {/* ── Break image ── */}
      <PanelGroup label={lang === "ko" ? "브레이크 이미지" : "Break image"} paths={savePathsFor("visualBreak")} panelKey="visualBreak" {...saveHdr}>
        <BreakBlock url={about.visualBreakImage ?? ""} t={t}
          onSet={(u) => setConfig((prev) => ({ ...prev, about: { ...prev.about, visualBreakImage: u } }))} />
      </PanelGroup>

      {/* ── Tech stack ── */}
      <PanelGroup label={panelLabelOf("techStack")} paths={savePathsFor("techStack")} panelKey="techStack" {...saveHdr}>
        <div className={css.block}>
          {techStackSlot}
        </div>
      </PanelGroup>

      {/* ── Backend ── */}
      <PanelGroup label={panelLabelOf("backend")} paths={savePathsFor("backend")} panelKey="backend" {...saveHdr}>
        <BackendBlock lang={lang} t={t} title={panelTitleOf("backend")}
          onChange={(v) => setAny("backend", v)}
          value={(about.backend as BackendItem[] | undefined)?.length ? (about.backend as BackendItem[]) : backendItems} />
      </PanelGroup>

      {/* ── ERD ── */}
      <PanelGroup label={panelLabelOf("erd")} paths={savePathsFor("erd")} panelKey="erd" {...saveHdr}>
        <ErdBlock lang={lang}
          tables={(about.erdTables as ErdTable[] | undefined)?.length ? (about.erdTables as ErdTable[]) : staticErdTables}
          relations={(about.erdRelations as ErdRelation[] | undefined)?.length ? (about.erdRelations as ErdRelation[]) : staticErdRelations}
          onChange={(tb, rl) => { setAny("erdTables", tb); setAny("erdRelations", rl); }} />
      </PanelGroup>

      {/* ── Code Highlights ── */}
      <PanelGroup label={panelLabelOf("codeHighlights")} paths={savePathsFor("codeHighlights")} panelKey="codeHighlights" {...saveHdr}>
        <CodeHighlightsBlock lang={lang} t={t} title={panelTitleOf("codeHighlights")}
          onChange={(v) => setAny("codeHighlights", v)}
          value={(about.codeHighlights as CodeItem[] | undefined)?.length ? (about.codeHighlights as CodeItem[]) : seedCode()} />
      </PanelGroup>

      {/* ── Troubleshooting ── */}
      <PanelGroup label={panelLabelOf("troubleshooting")} paths={savePathsFor("troubleshooting")} panelKey="troubleshooting" {...saveHdr}>
        <TroubleshootingBlock lang={lang} title={panelTitleOf("troubleshooting")}
          onChange={(v) => setAny("troubleshooting", v)}
          value={(about.troubleshooting as TroubleShootingItem[] | undefined)?.length
            ? (about.troubleshooting as TroubleShootingItem[]) : aboutDecisions} />
      </PanelGroup>

      {/* ── Credits ── */}
      <PanelGroup label={panelLabelOf("credits")} paths={savePathsFor("credits")} panelKey="credits" {...saveHdr}>
        <CreditsBlock about={about} setAny={setAny} lang={lang} t={t}
          nickname={config.personal?.nickname ?? ""} />
      </PanelGroup>
    </div>
  );
}
