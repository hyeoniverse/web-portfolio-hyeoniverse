"use client";

/* ─────────────────────────────────────────────────────────────
   About Studio — WYSIWYG 편집기. 폼이 아니라 결과물 위에서 직접 편집.
   Hero: 실제 렌더 → 텍스트 클릭해 인라인 수정, 포커스 시 플로팅 타입 툴바,
   배경 직접 조작. 나머지 패널: 결과형 카드 + 인라인 텍스트 편집. KO/EN 토글.
   저장은 탭 상단 Save Tab 에 위임(폼 헤더 없음).
   ───────────────────────────────────────────────────────────── */

import dynamic from "next/dynamic";
import { ABOUT_PANELS } from "./aboutPanels";
import type { TFunction } from "@/providers/LanguageProvider";
import type { Language } from "@/types";
import { useState, useEffect, useMemo, useRef, useDeferredValue, type CSSProperties, type Dispatch, type FocusEvent, type ReactNode, type SetStateAction } from "react";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import {
  Plus, X, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Image as ImageIcon, Lock, LayoutTemplate,
  Folder, FolderOpen, FileCode, Code2,
} from "@/components/icons";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import { type SiteConfigData, siteConfig } from "@/config/site.config";
import type { SettingsTabProps } from "../../_types";
import Button from "@/components/ui/Button";
import { deepEqual, getByPath } from "../../_data/settingsConstants";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { designConcepts } from "@/data/about/concepts";
import { codeExamples } from "@/data/about/codeExamples";
import Select from "@/components/ui/Select";
import Chip from "@/components/ui/Chip";
import { useChipReorder } from "@/components/ui/Chip/useChipReorder";
import FontPicker from "@/components/ui/FontPicker";
import { FONT_GROUPS, FONT_FAMILIES_FLAT } from "@/components/posts/plate/constants";
import Popover from "@/components/ui/Popover";
import ColorPicker from "@/components/ui/ColorPicker";
import NumberInput from "@/components/ui/NumberInput";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import SegmentedControl from "@/components/ui/SegmentedControl";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import FloatingBar from "@/components/posts/plate/toolbars/FloatingBar";
import { AlignIcon } from "@/components/posts/plate/icons";
import ArchDiagramEditor from "./ArchDiagramEditor";
import FlowDiagramEditor from "./FlowDiagramEditor";
import ErdCanvas from "./ErdCanvas";
/* CodeMirror 기반 — Sandpack 이 무거워서 lazy */
const CodeBlockEditor = dynamic(() => import("./CodeBlockEditor"), { ssr: false });
/* Sandpack 은 무거워서 실제로 실행 코드 편집을 열 때만 로드 */
const DemoFilesEditor = dynamic(() => import("./DemoFilesEditor"), {
  ssr: false,
  loading: () => <div className={css.demoEditorLoading}>Loading editor…</div>,
});
import { type ArchDiagramData } from "@/app/about/_components/panels/archDiagramData";
import css from "./AboutStudio.module.css";
import sub from "./AboutSubTab.module.css";
/* 실제 About Hero 와 픽셀 동일하게 렌더하려고 그 CSS 모듈을 그대로 재사용 */
import sec from "@/app/about/_components/AboutSection.module.css";
import hero from "@/app/about/_components/panels/HeroPanel.module.css";
import kin from "@/components/common/KineticHeroTitle.module.css";
import ov from "@/app/about/_components/panels/OverviewPanel.module.css";
import feat from "@/app/about/_components/panels/FeaturesPanel.module.css";
import proc from "@/app/about/_components/panels/ProcessPanel.module.css";
import secu from "@/app/about/_components/panels/SecurityPanel.module.css";
import bk from "@/app/about/_components/panels/BackendPanel.module.css";
import uf from "@/app/about/_components/panels/UserFlowPanel.module.css";
import { erdTables as staticErdTables, erdRelations as staticErdRelations } from "@/data/about/erd";
import { troubleShootingItems } from "@/data/about/troubleshooting";
import type { TroubleShootingItem } from "@/data/about/types";
import type { ErdTable, ErdRelation } from "@/data/about/types";
import { parseSqlErd, type ParsedErd } from "./parseSqlErd";
import SqlEditor from "./SqlEditor";
import { mergeErd, describeImport, type ImportPlan } from "./mergeErd";
import { useModalStore } from "@/stores/modalStore";
import { userFlows } from "@/data/about/architecture";
import type { UserFlow } from "@/data/about/types";
import { backendItems } from "@/data/about/backend";
import type { BackendItem } from "@/data/about/types";
import cf from "@/components/layout/CreditsFooter/CreditsFooter.module.css";
import dc from "@/app/about/_components/panels/DesignSystemPanel.module.css";
import ch from "@/app/about/_components/panels/CodeHighlightsPanel.module.css";
import CodeDemoSlot, { type CodeDemoMode } from "@/app/about/_components/panels/CodeDemoSlot";
import { securityIcons } from "@/app/about/_components/panels/SecurityPanel";

/* ═══════════ 타입 ═══════════ */
type ThemeBg = { primary: string; secondary: string; accent: string };
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
type OverviewStat = NonNullable<SiteConfigData["about"]["overview_stats"]>[number];
type FeatureItem = NonNullable<SiteConfigData["about"]["features"]>[number];
type ProcessItem = NonNullable<SiteConfigData["about"]["process"]>[number];
type SecurityItem = NonNullable<SiteConfigData["about"]["security"]>[number];
type ArchitectureItem = { path: string; description_ko: string; description_en: string; indent: number };

/* ═══════════ 상수 ═══════════ */
const WEIGHTS = [
  { value: "100", label: "100 · Thin" }, { value: "200", label: "200 · ExtraLight" },
  { value: "300", label: "300 · Light" }, { value: "400", label: "400 · Regular" },
  { value: "500", label: "500 · Medium" }, { value: "600", label: "600 · SemiBold" },
  { value: "700", label: "700 · Bold" }, { value: "800", label: "800 · ExtraBold" },
  { value: "900", label: "900 · Black" },
];
const TYPO = {
  heroLine1: { min: 2, max: 20, step: 0.25, def: 4, fb: "primary" as const },
  heroLine2: { min: 2, max: 20, step: 0.25, def: 4, fb: "accent" as const },
  heroSubtitle: { min: 0.75, max: 3, step: 0.05, def: 1, fb: "primary" as const },
  heroWatermark: { min: 3, max: 24, step: 0.5, def: 12, fb: "primary" as const },
};
type TypoKey = keyof typeof TYPO;
type ActiveKey = TypoKey | "heroAccent";

/* Hero 미니어처 — 실제 데스크톱 뷰포트 비율(≈16:10)로 그린 뒤 stage 폭에 맞게 scale 다운 */
const DESIGN_W = 1440;
const DESIGN_H = 860;

const mediaUrlOf = (bg: string) => bg.match(/url\(["']?([^"')]+)["']?\)/)?.[1] ?? bg.match(/^(\S+)/)?.[1] ?? "";
const isVideoUrl = (u: string) => /\.(mp4|webm|mov|ogv)(\?|#|$)/i.test(u);

/* ═══════════ 인라인 편집 텍스트 ═══════════ */
function EditableText({ value, onChange, placeholder, multiline, className, style, ariaLabel, onFocus, autoFocus }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  onFocus?: (e: FocusEvent<HTMLElement>) => void;
  autoFocus?: boolean;
}) {
  const cls = `${css.edit} ${className ?? ""}`;
  if (multiline) {
    return (
      <textarea className={cls} style={style} value={value} placeholder={placeholder} aria-label={ariaLabel}
        rows={1} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} onFocus={onFocus} />
    );
  }
  return (
    <input className={cls} style={style} value={value} placeholder={placeholder} aria-label={ariaLabel}
      autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} onFocus={onFocus} />
  );
}

/* 패널 라이브 프리뷰 스테이지 — 실제 뷰포트 폭으로 그린 뒤 scale 다운(미니어처).
   높이는 콘텐츠에 맞춰 grow(min DESIGN_H) → 넘쳐도 안 잘림. 실제 높이 측정해 stage 높이 = 실제높이×scale. */
function PanelStage({ scale, children }: { scale: number; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(DESIGN_H);
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const measure = () => setH(Math.max(DESIGN_H, el.offsetHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  /* --tool-scale = 1/scale → 패널 안 편집 버튼이 이걸로 counter-scale 하면 스케일 무관 동일 크기 */
  const panelStyle: CSSProperties = { position: "absolute", top: 0, left: 0, width: DESIGN_W, height: "auto", minHeight: DESIGN_H, padding: "clamp(24px, 2.4vw, 48px)", transform: `scale(${scale})`, transformOrigin: "top left" };
  (panelStyle as Record<string, string | number>)["--tool-scale"] = scale > 0 ? 1 / scale : 1;
  return (
    <div className={css.panelStage} style={{ height: h * scale }}>
      <div ref={panelRef} className={`${sec.section} ${sec.panel}`} style={panelStyle}>
        {children}
      </div>
    </div>
  );
}

/* 스테이지 전환 스트립 — 항목 제목을 탭으로 나열하면 길어져서 화면 밖으로 넘친다.
   실제 패널의 dotNav 처럼 번호 dot + 좌우 이동으로 고정 폭을 유지하고, 제목은 한 칸에서 줄임표 처리. */
function StageTabs({ count, active, onSelect, labelOf, addLabel, onAdd, canAdd }: {
  count: number; active: number; onSelect: (i: number) => void; labelOf: (i: number) => string;
  addLabel: string; onAdd: () => void; canAdd: boolean;
}) {
  return (
    <div className={css.stageTabs}>
      <Button variant="subtle" shape="circle" size="xs" aria-label="previous"
        disabled={active <= 0} onClick={() => onSelect(active - 1)}>
        <ChevronLeft size={14} />
      </Button>
      <div className={css.stageDots}>
        {Array.from({ length: count }, (_, i) => (
          <button key={i} type="button" title={labelOf(i)}
            className={`${css.stageDot} ${i === active ? css.stageDotOn : ""}`}
            onClick={() => onSelect(i)}>
            {String(i + 1).padStart(2, "0")}
          </button>
        ))}
      </div>
      <Button variant="subtle" shape="circle" size="xs" aria-label="next"
        disabled={active >= count - 1} onClick={() => onSelect(active + 1)}>
        <ChevronRight size={14} />
      </Button>
      <span className={css.stageTabLabel} title={labelOf(active)}>{labelOf(active)}</span>
      {canAdd && (
        <Button variant="subtle" size="xs" icon={<Plus size={14} />} onClick={onAdd}>{addLabel}</Button>
      )}
    </div>
  );
}

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
  /* 패널 제목 override (admin panelTitles) — 스튜디오 프리뷰에서도 즉시 반영 */
  const panelTitleOf = (k: string) => (about.panelTitles as Record<string, { ko?: string; en?: string }> | undefined)?.[k]?.[lang];
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
  const saveHdr = { config, savedConfig, saveSection, revertSection, resetSection, savingPaths, t };

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
            {({ toggle }) => <button type="button" className={css.ttSwatch} style={{ background: av || themeBg.accent }} onClick={toggle} aria-label="색상" />}
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
          {({ toggle }) => <button type="button" className={css.ttSwatch} style={{ background: colorVal || fb }} onClick={toggle} aria-label="색상" />}
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
      <div className="tw:flex tw:items-center tw:gap-md tw:flex-wrap">
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

      {/* ── Hero 라이브 프리뷰 — 실제 About Hero CSS 를 데스크톱 비율로 그려 scale 다운 ── */}
      <PanelSaveHeader label={panelTitleOf("hero") ?? "Intro"} paths={savePathsFor("hero")} {...saveHdr} />
      <div className={css.stageWrap} ref={wrapRef} style={{ height: DESIGN_H * scale }}>
        <div
          className={`${sec.section} ${sec.panel} ${hero.heroPanelBg} ${hero.heroReady} ${bgLight ? hero.heroBgLight : ""} ${bgDark ? hero.heroBgDark : ""} ${media ? hero.heroMediaMode : ""}`}
          style={panelStyle}
          onClick={(e) => { if (e.target === e.currentTarget) closeBar(); }}
        >
          {media && (isVideo
            // eslint-disable-next-line jsx-a11y/media-has-caption
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
            <button type="button" className={css.accentHit} title="밑줄 색" aria-label="밑줄 색"
              onClick={(e) => { setActive("heroAccent"); activeElRef.current = e.currentTarget; }}>
              <span className={hero.heroAccentLine} />
            </button>
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
                <div className="tw:flex tw:flex-wrap tw:gap-xs">
                  {HERO_ELEMENTS.map((el) => {
                    const on = !heroHidden.has(el.key);
                    return (
                      <button key={el.key} type="button" className={`${css.chip} ${on ? css.chipOn : css.chipOff}`} onClick={() => toggleHeroHidden(el.key)}>
                        <span className={css.chipDot} />{el.label}
                      </button>
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
                <div className="tw:grid tw:grid-cols-2 tw:gap-md">
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
                  <div className="tw:grid tw:grid-cols-2 tw:gap-md">
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

      {/* ── 패널 관리 (순서 DnD + 표시) ── */}
      <PanelSaveHeader label={lang === "ko" ? "패널 순서·표시" : "Panel order & visibility"} paths={savePathsFor("panels")} {...saveHdr} />
      <PanelManager about={about} setAny={setAny} t={t} lang={lang} />

      {/* ── Overview ── */}
      <PanelSaveHeader label={panelTitleOf("overview") ?? "Overview"} paths={savePathsFor("overview")} {...saveHdr} />
      <OverviewBlock about={about} lang={lang} setAny={setAny} t={t} scale={scale} titleOverride={panelTitleOf("overview")} />

      {/* ── Architecture ── */}
      <PanelSaveHeader label={panelTitleOf("architecture") ?? "Architecture"} paths={savePathsFor("architecture")} {...saveHdr} />
      <ArchitectureBlock value={(about.architectureItems) ?? []} onChange={setArch}
        diagram={(about.archDiagram) ?? { nodes: [], edges: [] }}
        onDiagramChange={(v) => setAny("archDiagram", v)} t={t} lang={lang} />

      {/* ── User Flow ── */}
      <PanelSaveHeader label={panelTitleOf("userflow") ?? "User Flow"} paths={savePathsFor("userflow")} {...saveHdr} />
      <UserFlowBlock lang={lang} t={t} scale={scale} titleOverride={panelTitleOf("userflow")}
        onChange={(v) => setAny("userFlows", v)}
        value={(about.userFlows as UserFlow[] | undefined)?.length ? (about.userFlows as UserFlow[]) : userFlows} />

      {/* ── Features ── */}
      <PanelSaveHeader label={panelTitleOf("features") ?? "Features"} paths={savePathsFor("features")} {...saveHdr} />
      <FeaturesBlock value={about.features ?? []} onChange={(v) => setAny("features", v)} lang={lang} t={t} scale={scale} titleOverride={panelTitleOf("features")} />

      {/* ── Design System ── */}
      <PanelSaveHeader label={panelTitleOf("designSystem") ?? "Design System"} paths={savePathsFor("designSystem")} {...saveHdr} />
      <DesignSystemBlock lang={lang} t={t} scale={scale} onChange={(v) => setAny("designSystem", v)}
        value={(about.designSystem as ConceptItem[] | undefined)?.length ? (about.designSystem as ConceptItem[]) : seedConcepts()} />

      {/* ── Process ── */}
      <PanelSaveHeader label={panelTitleOf("process") ?? "Process"} paths={savePathsFor("process")} {...saveHdr} />
      <ProcessBlock value={about.process ?? []} onChange={(v) => setAny("process", v)} lang={lang} t={t} scale={scale} titleOverride={panelTitleOf("process")} />

      {/* ── Security ── */}
      <PanelSaveHeader label={panelTitleOf("security") ?? "Security"} paths={savePathsFor("security")} {...saveHdr} />
      <SecurityBlock value={about.security ?? []} onChange={(v) => setAny("security", v)} lang={lang} t={t} scale={scale} titleOverride={panelTitleOf("security")} />

      {/* ── Break image ── */}
      <PanelSaveHeader label={lang === "ko" ? "브레이크 이미지" : "Break image"} paths={savePathsFor("visualBreak")} {...saveHdr} />
      <BreakBlock url={about.visualBreakImage ?? ""} t={t}
        onSet={(u) => setConfig((prev) => ({ ...prev, about: { ...prev.about, visualBreakImage: u } }))} />

      {/* ── Tech stack ── */}
      <PanelSaveHeader label={panelTitleOf("techStack") ?? "Tech Stack"} paths={savePathsFor("techStack")} {...saveHdr} />
      <section className={css.block}>
        {techStackSlot}
      </section>

      {/* ── Backend ── */}
      <PanelSaveHeader label={panelTitleOf("backend") ?? "Backend"} paths={savePathsFor("backend")} {...saveHdr} />
      <BackendBlock lang={lang} t={t} scale={scale} titleOverride={panelTitleOf("backend")}
        onChange={(v) => setAny("backend", v)}
        value={(about.backend as BackendItem[] | undefined)?.length ? (about.backend as BackendItem[]) : backendItems} />

      {/* ── ERD ── */}
      <PanelSaveHeader label={panelTitleOf("erd") ?? "ERD"} paths={savePathsFor("erd")} {...saveHdr} />
      <ErdBlock lang={lang}
        tables={(about.erdTables as ErdTable[] | undefined)?.length ? (about.erdTables as ErdTable[]) : staticErdTables}
        relations={(about.erdRelations as ErdRelation[] | undefined)?.length ? (about.erdRelations as ErdRelation[]) : staticErdRelations}
        onChange={(tb, rl) => { setAny("erdTables", tb); setAny("erdRelations", rl); }} />

      {/* ── Code Highlights ── */}
      <PanelSaveHeader label={panelTitleOf("codeHighlights") ?? "Code Highlights"} paths={savePathsFor("codeHighlights")} {...saveHdr} />
      <CodeHighlightsBlock lang={lang} t={t} scale={scale} titleOverride={panelTitleOf("codeHighlights")}
        onChange={(v) => setAny("codeHighlights", v)}
        value={(about.codeHighlights as CodeItem[] | undefined)?.length ? (about.codeHighlights as CodeItem[]) : seedCode()} />

      {/* ── Troubleshooting ── */}
      <PanelSaveHeader label={panelTitleOf("troubleshooting") ?? "Troubleshooting"} paths={savePathsFor("troubleshooting")} {...saveHdr} />
      <TroubleshootingBlock lang={lang} scale={scale} titleOverride={panelTitleOf("troubleshooting")}
        onChange={(v) => setAny("troubleshooting", v)}
        value={(about.troubleshooting as TroubleShootingItem[] | undefined)?.length
          ? (about.troubleshooting as TroubleShootingItem[]) : troubleShootingItems} />

      {/* ── Credits ── */}
      <PanelSaveHeader label={panelTitleOf("credits") ?? "Credits"} paths={savePathsFor("credits")} {...saveHdr} />
      <CreditsBlock about={about} setAny={setAny} lang={lang} t={t}
        nickname={config.personal?.nickname ?? ""} />
    </div>
  );
}

/* 폰트 선택 — 공통 FontPicker. "기본" (빈 값)만 앞에 덧붙인다. */
function AboutFontPicker({ value, onChange, fallbackLabel, dropAlign }: {
  value: string; onChange: (v: string) => void; fallbackLabel: string;
  dropAlign?: "active" | "below";
}) {
  return (
    <FontPicker
      value={value}
      onChange={(v) => onChange(v)}
      groups={[{ group: "", fonts: [{ label: fallbackLabel, value: "" }] }, ...FONT_GROUPS]}
      dropAlign={dropAlign}
      triggerClassName={css.fontTrigger}
      dropdownClassName={css.fontDropdown}
      enableGoogleSearch
      fallbackLabel={fallbackLabel}
      renderValue={() => {
        const matched = FONT_FAMILIES_FLAT.find((f) => f.value === value);
        const label = matched ? matched.label
          : value ? value.replace(/["']/g, "").split(",")[0].trim() : fallbackLabel;
        return <span style={{ fontFamily: value || undefined }}>{label}</span>;
      }}
    />
  );
}

/* ═══════════ 배경 서브 컨트롤 ═══════════ */
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className={css.bgSliderRow}>
      <span>{label}</span>
      <ColorPicker value={value} onChange={(c) => onChange(c.hex)}>
        {({ toggle }) => <button type="button" className={css.ttSwatch} style={{ background: value }} onClick={toggle} aria-label={label} />}
      </ColorPicker>
    </div>
  );
}
/* 색 선택 필드 — 스와치 + 라벨 + 값 (단색/그라데이션 stop 용) */
function SwatchField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <ColorPicker value={value} onChange={(c) => onChange(c.hex)}>
      {({ toggle }) => (
        <button type="button" className={css.swatchField} onClick={toggle}>
          <span className={css.swatchChip} style={{ background: value }} />
          <span className={css.swatchLabel}>{label}</span>
          <span className={css.swatchVal}>{value}</span>
        </button>
      )}
    </ColorPicker>
  );
}
function BgMedia({ media, t, onSet, opacity, onOpacity, overlay, onOverlay, strength, onStrength }: {
  media: string; t: TFunction; onSet: (u: string) => void;
  opacity: number; onOpacity: (n: number) => void;
  overlay: string; onOverlay: (c: string) => void;
  strength: number; onStrength: (n: number) => void;
}) {
  const [pick, setPick] = useState(false);
  return (
    <>
      <div className="tw:flex tw:gap-xs">
        <Button variant="outline" size="sm" onClick={() => setPick((v) => !v)}>
          {pick ? t("admin.posts.seriesModal.closePicker") : t("admin.posts.seriesModal.chooseCover")}
        </Button>
        {media && <Button variant="outline" size="sm" onClick={() => onSet("")}>{t("admin.settings.aboutHeroBgClear")}</Button>}
      </div>
      {pick && (
        <CoverImagePicker onSelect={(u) => { onSet(u); setPick(false); }} onClose={() => setPick(false)} currentUrl={media}
          postContext={{ title: "About hero background", tags: ["hero", "abstract"], excerpt: "" }} />
      )}
      {media && (
        <>
          <div className={css.bgSliderRow}><span>{t("admin.settings.aboutHeroBgOpacity")}</span><span>{Math.round(opacity * 100)}%</span></div>
          <Slider min={0} max={1} step={0.01} value={[opacity]} onValueChange={([n]) => onOpacity(Math.round(n * 100) / 100)} />
          <ColorRow label={t("admin.settings.aboutHeroVideoOverlayColor")} value={overlay} onChange={onOverlay} />
          <div className={css.bgSliderRow}><span>{t("admin.settings.aboutHeroVideoOverlayStrength")}</span><span>{Math.round(strength * 100)}%</span></div>
          <Slider min={0} max={1} step={0.01} value={[strength]} onValueChange={([n]) => onStrength(Math.round(n * 100) / 100)} />
        </>
      )}
    </>
  );
}

/* ═══════════ Panel manager — 순서(DnD) + 표시 토글. hero/credits 는 순서 고정 ═══════════ */
const LOCKED_PANELS = new Set(["hero", "credits"]);
function PanelManager({ about, setAny, t, lang }: {
  about: SiteConfigData["about"]; setAny: (k: string, v: unknown) => void; t: TFunction; lang: Language;
}) {
  const hidden = (about.hiddenPanels ?? []) as string[];
  const titles = about.panelTitles ?? {};
  const allKeys = ABOUT_PANELS.map((p) => p.key);
  const savedOrder = (about.panelOrder ?? []).filter((k) => allKeys.includes(k));
  const ordered = [...savedOrder, ...allKeys.filter((k) => !savedOrder.includes(k))];
  const middle = ordered.filter((k) => !LOCKED_PANELS.has(k));
  const defaultLabel = (k: string) => ABOUT_PANELS.find((p) => p.key === k)?.label ?? k;
  const labelOf = (k: string) => titles[k]?.[lang] || defaultLabel(k);
  const shownCount = allKeys.length - hidden.filter((k) => allKeys.includes(k) && !LOCKED_PANELS.has(k)).length;
  const [editKey, setEditKey] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = middle.indexOf(String(active.id));
    const newIdx = middle.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    setAny("panelOrder", ["hero", ...arrayMove(middle, oldIdx, newIdx), "credits"]);
  };
  const toggle = (k: string) => {
    const set = new Set(hidden);
    if (set.has(k)) set.delete(k); else set.add(k);
    setAny("hiddenPanels", Array.from(set));
  };
  const rename = (k: string, name: string) => {
    const next: Record<string, { ko?: string; en?: string }> = { ...titles };
    const cur = { ...(next[k] ?? {}) };
    const v = name.trim();
    if (v && v !== defaultLabel(k)) cur[lang] = v; else delete cur[lang];
    if (cur.ko || cur.en) next[k] = cur; else delete next[k];
    setAny("panelTitles", next);
    setEditKey(null);
  };

  const chipCls = (k: string) => `${css.chip} ${!hidden.includes(k) ? css.chipOn : css.chipOff}`;
  const editInput = (k: string) => (
    <input key={k} className={`${css.chip} ${css.chipEdit}`} autoFocus defaultValue={labelOf(k)} aria-label="패널 이름"
      onBlur={(e) => rename(k, e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") rename(k, e.currentTarget.value); else if (e.key === "Escape") setEditKey(null); }} />
  );
  /* intro/credits — 순서·표시 모두 잠금(항상 표시). 이름만 더블클릭으로 수정 가능. */
  const lockedChip = (k: string) => (
    <button type="button" className={`${css.chip} ${css.chipOn} ${css.chipLocked}`} onDoubleClick={() => setEditKey(k)} title={lang === "ko" ? "고정됨 · 더블클릭으로 이름만 수정" : "Locked · Double-click to rename"}>
      <Lock className={css.chipLock} size={11} />{labelOf(k)}
    </button>
  );

  return (
    <div className="tw:flex tw:flex-col tw:gap-sm">
      <div className="tw:flex tw:items-baseline tw:justify-between tw:gap-sm">
        <span className={css.stripTitle}>{t("admin.settings.aboutPanelVisibility")} · {shownCount}/{allKeys.length}</span>
        <Switch checked={about.infiniteScroll ?? false} onCheckedChange={(v) => setAny("infiniteScroll", v)}
          label={t("admin.settings.aboutInfiniteScrollLabel")} size="sm" showStateText stateLabels={{ on: "ON", off: "OFF" }} />
      </div>
      <p className={css.stripHint}>{lang === "ko" ? "드래그로 순서 변경 · 더블클릭으로 이름 수정 · 클릭으로 표시 전환" : "Drag to reorder · Double-click to rename · Click to toggle"}</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="tw:flex tw:flex-wrap tw:gap-xs">
          {editKey === "hero" ? editInput("hero") : lockedChip("hero")}
          <SortableContext items={middle} strategy={rectSortingStrategy}>
            {middle.map((k) => (
              editKey === k
                ? editInput(k)
                : <PanelSortChip key={k} id={k} className={chipCls(k)} label={labelOf(k)} onToggle={() => toggle(k)} onEdit={() => setEditKey(k)} />
            ))}
          </SortableContext>
          {editKey === "credits" ? editInput("credits") : lockedChip("credits")}
        </div>
      </DndContext>
    </div>
  );
}
function PanelSortChip({ id, className, label, onToggle, onEdit }: { id: string; className: string; label: string; onToggle: () => void; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = { transform: DndCSS.Transform.toString(transform), transition, zIndex: isDragging ? 2 : undefined, position: isDragging ? "relative" : undefined };
  return (
    <button ref={setNodeRef} style={style} type="button"
      className={`${className} ${css.chipDrag} ${isDragging ? css.chipDragging : ""}`}
      onClick={onToggle} onDoubleClick={onEdit} {...attributes} {...listeners}>
      <span className={css.chipDot} />{label}
    </button>
  );
}

/* ═══════════ 패널별 저장 헤더 — 해당 패널 config 경로만 저장/dirty 판정 ═══════════ */
function PanelSaveHeader({ label, hint, paths, config, savedConfig, saveSection, revertSection, resetSection, savingPaths, t }: {
  label: string; hint?: ReactNode; paths: string[]; config: SiteConfigData; savedConfig: SiteConfigData;
  saveSection: SettingsTabProps["saveSection"]; revertSection: SettingsTabProps["revertSection"];
  resetSection: SettingsTabProps["resetSection"]; savingPaths: SettingsTabProps["savingPaths"]; t: TFunction;
}) {
  const dirty = paths.some((p) => !deepEqual(getByPath(config, p), getByPath(savedConfig, p)));
  /* 이미 기본값이면 "기본값" 버튼은 할 일이 없다 */
  const atDefault = paths.every((p) => deepEqual(getByPath(config, p), getByPath(siteConfig as unknown as SiteConfigData, p)));
  const saving = savingPaths != null && savingPaths.length === paths.length && savingPaths.every((p) => paths.includes(p));
  return (
    /* data-settings-section — SectionJumpNav 가 About 패널도 섹션으로 스캔·점프.
       라벨이 h2 가 아니라 span 이라, 점프바가 읽을 값을 data-section-label 로 넘긴다. */
    <div className={css.psHeader} data-settings-section data-section-label={label}>
      <span className={css.psLabel}>{label}</span>
      <span className={`${css.psDot} ${dirty ? css.psDotOn : ""}`} aria-hidden />
      {hint && <span className={css.psHint}>{hint}</span>}
      <Button variant="outline" size="xs" disabled={atDefault || saving} onClick={() => resetSection(paths)}
        title={t("admin.settings.resetSection")}>
        {t("admin.settings.resetSection")}
      </Button>
      <Button variant="outline" size="xs" disabled={!dirty || saving} onClick={() => revertSection(paths)}
        title={t("admin.settings.revertSection")}>
        {t("admin.settings.revertSection")}
      </Button>
      <Button variant="subtle" size="xs" disabled={!dirty || saving} onClick={() => saveSection(paths)}>
        {t("admin.settings.saveSection")}
      </Button>
    </div>
  );
}

/* ═══════════ Overview ═══════════ */
function OverviewBlock({ about, lang, setAny, t, scale, titleOverride }: {
  about: SiteConfigData["about"]; lang: Language; setAny: (k: string, v: unknown) => void; t: TFunction; scale: number; titleOverride?: string;
}) {
  const stats = (about.overview_stats ?? []) as OverviewStat[];
  const setStats = (v: OverviewStat[]) => setAny("overview_stats", v);
  const descKey = lang === "ko" ? "overview_description_ko" : "overview_description_en";
  const rec = about as unknown as Record<string, string | undefined>;
  const highlights = (about.overview_highlights ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const setHighlights = (arr: string[]) => setAny("overview_highlights", arr.filter(Boolean).join(", "));
  return (
    <PanelStage scale={scale}>
        <h3 className={sec.panelTitle}>{titleOverride ?? "Overview."}</h3>
        <div className={ov.overviewLayout}>
          <div className={ov.overviewTop}>
            <EditableText multiline className={ov.overviewDesc} value={rec[descKey] ?? ""} onChange={(v) => setAny(descKey, v)}
              placeholder={t("admin.settings.aboutOverviewDesc")} ariaLabel="overview description" style={{ width: "100%" }} />
            <div className="tw:flex tw:gap-sm tw:flex-wrap">
              {highlights.map((tag, i) => (
                <span key={i} className={`${ov.overviewTag} ${css.editTag}`}>
                  <EditableText value={tag} onChange={(v) => { const n = [...highlights]; n[i] = v; setHighlights(n); }} ariaLabel="highlight" />
                  <span className={css.editTagX}><Button variant="subtle" shape="circle" size="2xs" onClick={() => setHighlights(highlights.filter((_, x) => x !== i))} aria-label="remove"><X size={11} /></Button></span>
                </span>
              ))}
              <button type="button" className={css.addTagBtn} onClick={() => setHighlights([...highlights, lang === "ko" ? "새 항목" : "New"])} aria-label="add"><Plus size={13} /></button>
            </div>
          </div>
          <div className={ov.overviewStats}>
            {stats.map((s, i) => (
              <div key={i} className={`${ov.overviewStat} ${css.editStat}`}>
                <EditableText className={ov.statValue} value={s.value} onChange={(v) => { const n = [...stats]; n[i] = { ...n[i], value: v }; setStats(n); }} placeholder="50+" ariaLabel="stat value" />
                <EditableText className={ov.statLabel} value={lang === "ko" ? s.label_ko : s.label_en}
                  onChange={(v) => { const n = [...stats]; n[i] = { ...n[i], [lang === "ko" ? "label_ko" : "label_en"]: v }; setStats(n); }}
                  placeholder={lang === "ko" ? "라벨" : "label"} ariaLabel="stat label" />
                <span className={css.editStatX}><Button variant="subtle" shape="circle" size="xs" onClick={() => setStats(stats.filter((_, x) => x !== i))} aria-label="remove"><X size={13} /></Button></span>
              </div>
            ))}
            {stats.length < 8 && (
              <button type="button" className={css.addStatCell} onClick={() => setStats([...stats, { value: "0", label_ko: "라벨", label_en: "Label" }])}>
                <Plus size={18} /> {lang === "ko" ? "지표 추가" : "Add metric"}
              </button>
            )}
          </div>
        </div>
    </PanelStage>
  );
}

/* ═══════════ Features ═══════════ */
function FeaturesBlock({ value, onChange, lang, t, scale, titleOverride }: {
  value: FeatureItem[]; onChange: (v: FeatureItem[]) => void; lang: Language; t: TFunction; scale: number; titleOverride?: string;
}) {
  const set = (i: number, p: Partial<FeatureItem>) => onChange(value.map((it, x) => (x === i ? { ...it, ...p } : it)));
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null);
  const cols = 3;
  const MAX = 9; // 3×3 — 실제 defaultFrames 개수와 동일
  const atMax = value.length >= MAX;
  const rows = Math.max(1, Math.ceil((value.length + (atMax ? 0 : 1)) / cols));
  /* 실제 DynamicFrameLayout 흉내 — 기본 4fr, hover 한 row/col 은 6fr·나머지 3fr 로 확장 */
  const tpl = (n: number, active: number | null) => Array.from({ length: n }, (_, x) => (active == null ? "4fr" : x === active ? "6fr" : "3fr")).join(" ");
  return (
    <>
      <PanelStage scale={scale}>
        <h3 className={sec.panelTitle}>{titleOverride ?? t("aboutPage.panels.keyFeatures")}</h3>
        <div className={css.featGrid}
          style={{ gridTemplateColumns: tpl(cols, hovered?.col ?? null), gridTemplateRows: tpl(rows, hovered?.row ?? null) }}
          onMouseLeave={() => setHovered(null)}>
          {value.map((it, i) => (
            <div key={i} className={css.featCell} onMouseEnter={() => setHovered({ row: Math.floor(i / cols), col: i % cols })}>
              {it.image
                ? /* eslint-disable-next-line @next/next/no-img-element */ <img className={css.featImg} src={it.image} alt="" />
                : <div className={css.featNoImg} />}
              <div className={`${feat.featureDfInfo} ${css.featInfo}`}>
                <EditableText className={feat.featureDfTitle} value={it.title} onChange={(v) => set(i, { title: v })} placeholder={t("admin.settings.aboutItemTitle")} ariaLabel="title" style={{ maxWidth: "100%" }} />
                <div className={`${feat.featureDfDetails} ${css.featDetails}`}>
                  <EditableText multiline className={feat.featureDfDesc} value={lang === "ko" ? it.description_ko : it.description_en}
                    onChange={(v) => set(i, lang === "ko" ? { description_ko: v } : { description_en: v })} placeholder={t("admin.settings.aboutItemDesc")} ariaLabel="description" style={{ width: "100%" }} />
                  <EditableText className={feat.featureDfTech} value={it.tech} onChange={(v) => set(i, { tech: v })} placeholder="GSAP · Lenis" ariaLabel="tech" style={{ maxWidth: "100%" }} />
                </div>
              </div>
              <div className={css.featTools}>
                <Popover placement="bottom-end" trigger={<Button variant="difference" shape="circle" size="xs" className={css.featToolBtn} aria-label="이미지 변경"><ImageIcon size={16} /></Button>}>
                  <div className={css.bgPanel}>
                    <CoverImagePicker onSelect={(u) => set(i, { image: u })} onClose={() => { }} currentUrl={it.image}
                      postContext={{ title: it.title, tags: it.tech.split(",").map((s) => s.trim()).filter(Boolean), excerpt: it.description_en }} />
                  </div>
                </Popover>
                <Button variant="difference" shape="circle" size="xs" className={css.featToolBtn} onClick={() => onChange(value.filter((_, x) => x !== i))} aria-label="삭제"><X size={16} /></Button>
              </div>
            </div>
          ))}
          {!atMax && (
            <button type="button" className={`${css.featCell} ${css.featAdd}`} onClick={() => onChange([...value, { icon: "", title: lang === "ko" ? "새 기능" : "New", description_ko: "", description_en: "", tech: "", image: "" }])}>
              <Plus size={22} />
            </button>
          )}
        </div>
      </PanelStage>
    </>
  );
}

/* ═══════════ Process ═══════════ */
function ProcessBlock({ value, onChange, lang, t, scale, titleOverride }: {
  value: ProcessItem[]; onChange: (v: ProcessItem[]) => void; lang: Language; t: TFunction; scale: number; titleOverride?: string;
}) {
  const set = (i: number, p: Partial<ProcessItem>) => onChange(value.map((it, x) => (x === i ? { ...it, ...p } : it)));
  const MAX = 8;
  const atMax = value.length >= MAX;
  return (
    <PanelStage scale={scale}>
      <h3 className={sec.panelTitle}>{titleOverride ?? t("aboutPage.panels.designProcess")}</h3>
      <p className={css.procHint}>{lang === "ko" ? "** 로 감싼 텍스트는 강조 색으로 표시됩니다." : "Text wrapped in ** appears as an accent highlight."}</p>
      {/* 타임라인 (실제 렌더 그대로) */}
      <div className={proc.processTimeline}>
        <div className={`${proc.processTimelineTrack} ${css.procTrack}`}><div className={proc.processTimelineProgress} style={{ width: "100%" }} /></div>
        <div className={proc.processTimelineNodes}>
          {value.map((it, i) => (
            <div key={i} className={proc.processTimelineNode}>
              <div className={`${proc.processNodeDotWrap} ${css.procDotWrap}`}><div className={`${proc.processNodeDot} ${proc.processNodeDotDone} ${css.procDot}`} /></div>
              <span className={`${proc.processNodeLabel} ${css.procNodeLabel}`}>{it.step || String(i + 1).padStart(2, "0")}</span>
            </div>
          ))}
        </div>
      </div>
      {/* 스텝 리스트 (스크롤 단일뷰 대신 전체 편집) */}
      <div className={css.procList}>
        {value.map((it, i) => (
          <div key={i} className={css.procRow}>
            <EditableText className={css.procNum} value={it.step} onChange={(v) => set(i, { step: v })} placeholder="01" ariaLabel="step" />
            <div className={css.procBody}>
              <EditableText className={css.procTitle} value={lang === "ko" ? it.title_ko : it.title_en}
                onChange={(v) => set(i, lang === "ko" ? { title_ko: v } : { title_en: v })} placeholder={t("admin.settings.aboutItemTitle")} ariaLabel="title" style={{ maxWidth: "100%" }} />
              <EditableText multiline className={css.procDesc} value={lang === "ko" ? it.description_ko : it.description_en}
                onChange={(v) => set(i, lang === "ko" ? { description_ko: v } : { description_en: v })} placeholder={t("admin.settings.aboutItemDesc")} ariaLabel="description" style={{ width: "100%" }} />
            </div>
            <span className={css.editStatX}><Button variant="subtle" shape="circle" size="xs" onClick={() => onChange(value.filter((_, x) => x !== i))} aria-label="remove"><X size={13} /></Button></span>
          </div>
        ))}
        {!atMax && (
          <button type="button" className={css.addStepBtn} onClick={() => onChange([...value, { step: String(value.length + 1).padStart(2, "0"), title_ko: "새 단계", title_en: "New", description_ko: "", description_en: "" }])}>
            <Plus size={18} /> {lang === "ko" ? "단계 추가" : "Add step"}
          </button>
        )}
      </div>
    </PanelStage>
  );
}

/* ═══════════ Security ═══════════ */
function SecurityBlock({ value, onChange, lang, t, scale, titleOverride }: {
  value: SecurityItem[]; onChange: (v: SecurityItem[]) => void; lang: Language; t: TFunction; scale: number; titleOverride?: string;
}) {
  const set = (i: number, p: Partial<SecurityItem>) => onChange(value.map((it, x) => (x === i ? { ...it, ...p } : it)));
  const MAX = 10;
  return (
    <PanelStage scale={scale}>
      <div className={css.secStage}>
      <h3 className={sec.panelTitle}>{titleOverride ?? "Security."}</h3>
      <div className={secu.secGrid}>
        {value.map((it, i) => (
          <div key={i} className={`${secu.secItem} ${css.editSecItem}`}>
            <div className="tw:flex tw:gap-md tw:items-center">
              <Popover placement="bottom-start" trigger={
                <button type="button" className={secu.secIcon} style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer" }} title={it.layer || "아이콘 · 분류"}>
                  {securityIcons[it.icon] ?? securityIcons.shield}
                </button>
              }>
                <div className={css.iconPickPanel}>
                  <div className="tw:grid tw:grid-cols-4 tw:gap-2xs">
                    {Object.keys(securityIcons).map((k) => (
                      <button key={k} type="button" className={`${css.iconPickBtn} ${it.icon === k ? css.iconPickOn : ""}`} onClick={() => set(i, { icon: k })} aria-label={k}>
                        {securityIcons[k]}
                      </button>
                    ))}
                  </div>
                  <label className={css.iconPickLabel}>분류(내부용)
                    <EditableText className={css.iconPickInput} value={it.layer} onChange={(v) => set(i, { layer: v })} placeholder="SQL Injection" ariaLabel="layer" />
                  </label>
                </div>
              </Popover>
              <EditableText className={secu.secTitle} value={lang === "ko" ? it.title_ko : it.title_en}
                onChange={(v) => set(i, lang === "ko" ? { title_ko: v } : { title_en: v })} placeholder={t("admin.settings.aboutItemTitle")} ariaLabel="title" />
            </div>
            <EditableText multiline className={secu.secDesc} value={lang === "ko" ? it.description_ko : it.description_en}
              onChange={(v) => set(i, lang === "ko" ? { description_ko: v } : { description_en: v })} placeholder={t("admin.settings.aboutItemDesc")} ariaLabel="description" style={{ width: "100%" }} />
            <EditableText className={secu.secScope} value={lang === "ko" ? it.scope_ko : it.scope_en}
              onChange={(v) => set(i, lang === "ko" ? { scope_ko: v } : { scope_en: v })} placeholder={t("admin.settings.aboutSecurityScope")} ariaLabel="scope" />
            <span className={css.editStatX}><Button variant="subtle" shape="circle" size="xs" onClick={() => onChange(value.filter((_, x) => x !== i))} aria-label="remove"><X size={13} /></Button></span>
          </div>
        ))}
        {value.length < MAX && (
          <button type="button" className={css.addSecCell}
            onClick={() => onChange([...value, { layer: "", icon: "shield", title_ko: "새 항목", title_en: "New", description_ko: "", description_en: "", scope_ko: "", scope_en: "" }])}>
            <Plus size={18} /> {lang === "ko" ? "항목 추가" : "Add item"}
          </button>
        )}
      </div>
      </div>
    </PanelStage>
  );
}

/* ═══════════ Design System ═══════════ */
type ConceptItem = { id: string; title: string; subtitle_ko: string; subtitle_en: string; description_ko: string; description_en: string; image: string };
/* config 가 비어있으면 현재 정적 데이터를 초기값으로 — 편집 시 전체 배열이 config 에 저장됨 */
const seedConcepts = (): ConceptItem[] => designConcepts.map((c) => ({
  id: c.id, title: c.title,
  subtitle_ko: c.subtitle.ko, subtitle_en: c.subtitle.en,
  description_ko: c.description.ko, description_en: c.description.en,
  image: c.image ?? "",
}));
/* 실제 패널과 동일 — 컨셉 1개 = 배경 이미지 풀블리드 슬라이드 + 흰 오버레이 텍스트.
   실제도 strip 으로 한 장씩 넘겨 보므로 스튜디오도 탭으로 전환하며 한 장씩 편집. */
function DesignSystemBlock({ value, onChange, lang, t, scale }: {
  value: ConceptItem[]; onChange: (v: ConceptItem[]) => void; lang: Language; t: TFunction; scale: number;
}) {
  const [tab, setTab] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const MAX = 8;
  const cur = Math.min(tab, Math.max(0, value.length - 1));
  const it = value[cur];
  const set = (p: Partial<ConceptItem>) => onChange(value.map((x, i) => (i === cur ? { ...x, ...p } : x)));
  /* 아무 입력 없는 컨셉 — 추가만 하고 이탈하면 자동 삭제해 빈 항목이 안 남게 */
  const isEmptyConcept = (c: ConceptItem) =>
    !c.title.trim() && !c.subtitle_ko.trim() && !c.subtitle_en.trim()
    && !c.description_ko.trim() && !c.description_en.trim() && !c.image.trim();
  const add = () => {
    onChange([...value, { id: `concept-${Date.now()}`, title: "", subtitle_ko: "", subtitle_en: "", description_ko: "", description_en: "", image: "" }]);
    setTab(value.length);
  };
  const removeAt = (i: number) => {
    onChange(value.filter((_, x) => x !== i));
    setTab(Math.max(0, i - 1));
  };
  /* 탭 전환 — 떠나는 컨셉이 비어있으면 버리고, 대상 인덱스를 당겨진 만큼 보정 */
  const selectTab = (next: number) => {
    if (next !== cur && it && isEmptyConcept(it)) {
      onChange(value.filter((_, i) => i !== cur));
      setTab(next > cur ? next - 1 : next);
      return;
    }
    setTab(next);
  };
  return (
    <section className={css.block}>
      <div className="tw:flex tw:gap-sm tw:items-center tw:flex-wrap" ref={tabsRef}>
        <StageTabs count={value.length} active={cur} onSelect={selectTab} onAdd={add}
          canAdd={value.length < MAX}
          addLabel={lang === "ko" ? "컨셉 추가" : "Add concept"}
          labelOf={(i) => value[i]?.title || (lang === "ko" ? "새 컨셉" : "Untitled")} />
      </div>
      {it && (
        <PanelStage scale={scale}>
          {/* key = 컨셉별 remount — 탭을 바꿔도 같은 input 을 재사용하면 autoFocus 가 안 걸린다 */}
          <div key={it.id} className={css.dsSlide}
            onBlur={(e) => {
              const rt = e.relatedTarget as Node | null;
              if (rt && e.currentTarget.contains(rt)) return;   // 슬라이드 내부 이동
              if (rt && tabsRef.current?.contains(rt)) return;  // 탭 클릭 → selectTab 이 처리
              if (isEmptyConcept(it)) removeAt(cur);            // 입력 없이 이탈 → 빈 컨셉 삭제
            }}>
            <div className={`${dc.dcCardBg} ${css.dsBg}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {it.image && <img src={it.image} alt="" />}
            </div>
            <div className={`${dc.dcCardOverlay} ${css.dsOverlay}`}>
              <EditableText className={dc.dcCardTitle} value={it.title} autoFocus={isEmptyConcept(it)}
                onChange={(v) => set({ title: v })} placeholder="TYPOGRAPHY" ariaLabel="title" />
              <EditableText className={dc.dcCardSubtitle} value={lang === "ko" ? it.subtitle_ko : it.subtitle_en}
                onChange={(v) => set(lang === "ko" ? { subtitle_ko: v } : { subtitle_en: v })}
                placeholder={lang === "ko" ? "4가지 서체 시스템" : "4-Font Type System"} ariaLabel="subtitle" />
              <EditableText multiline className={dc.dcCardDesc} value={lang === "ko" ? it.description_ko : it.description_en}
                onChange={(v) => set(lang === "ko" ? { description_ko: v } : { description_en: v })}
                placeholder={t("admin.settings.aboutItemDesc")} ariaLabel="description" style={{ width: "100%" }} />
            </div>
            <div className={css.slideTools}>
              <Popover placement="bottom-end" trigger={
                <Button variant="difference" shape="circle" size="xs" aria-label={lang === "ko" ? "배경 이미지" : "Background image"}>
                  <ImageIcon size={14} />
                </Button>
              }>
                <div className={css.bgPanel}>
                  <CoverImagePicker onSelect={(u) => set({ image: u })} onClose={() => { }} currentUrl={it.image}
                    postContext={{ title: it.title, tags: [], excerpt: it.description_en }} />
                </div>
              </Popover>
              <Button variant="difference" shape="circle" size="xs" onClick={() => removeAt(cur)} aria-label="remove">
                <X size={14} />
              </Button>
            </div>
          </div>
        </PanelStage>
      )}
    </section>
  );
}


/* ═══════════ Code Highlights ═══════════ */
type CodeItem = { title: string; description_ko: string; description_en: string; language: string; code: string;
  demoMode?: CodeDemoMode; demoMedia?: string; demoFiles?: Record<string, string>; demoTemplate?: string; demoBg?: string };

/* sandbox 기본 파일 — react-ts 템플릿의 index.tsx 가 ./styles.css 를 import 하므로 그대로 스타일이 먹는다 */
const DEMO_FILE_SEED: Record<string, string> = {
  "/App.tsx": `export default function App() {
  return <button className="demo">Hover Me</button>;
}
`,
  "/styles.css": `body {
  display: grid;
  place-items: center;
  min-height: 100vh;
  margin: 0;
  background: transparent;
  font-family: system-ui, sans-serif;
}
.demo {
  padding: 12px 24px;
  border: 1px solid crimson;
  border-radius: 999px;
  background: transparent;
  color: crimson;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
}
.demo:hover {
  background: crimson;
  color: white;
}
`,
};
const seedCode = (): CodeItem[] => codeExamples.map((c) => ({
  title: c.title, description_ko: c.description.ko, description_en: c.description.en,
  language: c.language, code: c.code,
  demoMode: c.demoMode, demoMedia: c.demoMedia,
  demoFiles: c.demoFiles, demoTemplate: c.demoTemplate, demoBg: c.demoBg,
}));
/* 실제 패널과 동일 — 번호 + 제목/설명 헤더, 본문은 데모 + 코드 2단.
   실제도 스크롤로 한 패인씩 넘겨 보므로 스튜디오도 탭으로 전환하며 하나씩 편집. */
function CodeHighlightsBlock({ value, onChange, lang, t, scale, titleOverride }: {
  value: CodeItem[]; onChange: (v: CodeItem[]) => void; lang: Language; t: TFunction; scale: number; titleOverride?: string;
}) {
  const [dropOver, setDropOver] = useState(false);

  const [dropErr, setDropErr] = useState(false);
  const [tab, setTab] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const MAX = 8;
  const cur = Math.min(tab, Math.max(0, value.length - 1));
  const it = value[cur];
  const set = (p: Partial<CodeItem>) => onChange(value.map((x, i) => (i === cur ? { ...x, ...p } : x)));
  /* 아무 입력 없는 스니펫 — 추가만 하고 이탈하면 자동 삭제 */
  /* 데모가 실제로 채워졌는지 — 모드만 골라둔 상태는 아직 빈 것으로 본다 */
  const hasDemo = it
    ? it.demoMode === "media"
      ? !!it.demoMedia?.trim()
      : it.demoMode === "sandbox"
        ? Object.values(it.demoFiles ?? {}).some((c) => c.trim())
        : false
    : false;
  /* sandbox 로 바꾸는 순간 기본 파일을 실제로 저장해야 슬롯이 안 빈다 */
  const setDemoMode = (m: CodeDemoMode) =>
    set(m === "sandbox" && !it?.demoFiles ? { demoMode: m, demoFiles: DEMO_FILE_SEED } : { demoMode: m });

  const isEmptySnippet = (c: CodeItem) =>
    !c.title.trim() && !c.description_ko.trim() && !c.description_en.trim() && !c.code.trim();
  const add = () => {
    onChange([...value, { title: "", description_ko: "", description_en: "", language: "tsx", code: "" }]);
    setTab(value.length);
  };
  const removeAt = (i: number) => {
    onChange(value.filter((_, x) => x !== i));
    setTab(Math.max(0, i - 1));
  };
  /* 탭 전환 — 떠나는 스니펫이 비어있으면 버리고 대상 인덱스 보정 */
  const selectTab = (next: number) => {
    if (next !== cur && it && isEmptySnippet(it)) {
      onChange(value.filter((_, i) => i !== cur));
      setTab(next > cur ? next - 1 : next);
      return;
    }
    setTab(next);
  };
  return (
    <section className={css.block}>
      <div className="tw:flex tw:gap-sm tw:items-center tw:flex-wrap" ref={tabsRef}>
        <StageTabs count={value.length} active={cur} onSelect={selectTab} onAdd={add}
          canAdd={value.length < MAX}
          addLabel={lang === "ko" ? "코드 추가" : "Add snippet"}
          labelOf={(i) => value[i]?.title || (lang === "ko" ? "새 스니펫" : "Untitled")} />
      </div>
      {it && (
        <PanelStage scale={scale}>
          {/* key = 스니펫별 remount — 같은 input 을 재사용하면 autoFocus 가 안 걸린다 */}
          <div key={cur} className={css.chStage}
            onBlur={(e) => {
              const rt = e.relatedTarget as Node | null;
              if (rt && e.currentTarget.contains(rt)) return;   // 패인 내부 이동
              if (rt && tabsRef.current?.contains(rt)) return;  // 탭 클릭 → selectTab 이 처리
              if (isEmptySnippet(it)) removeAt(cur);            // 입력 없이 이탈 → 빈 스니펫 삭제
            }}>
            <div className={css.chTools}>
              <Button variant="subtle" shape="circle" size="xs" onClick={() => removeAt(cur)} aria-label="remove">
                <X size={14} />
              </Button>
            </div>
            <h3 className={sec.panelTitle}>{titleOverride ?? "Code Highlights."}</h3>
            <div className={css.chPane}>
              <div className={ch.codeSingleHeader}>
                <span className={ch.codeSingleNumber}>{String(cur + 1).padStart(2, "0")}</span>
                <div className={ch.codeSingleMeta}>
                  <EditableText className={css.chTitle} value={it.title} autoFocus={isEmptySnippet(it)}
                    onChange={(v) => set({ title: v })} placeholder="StaggerText Component" ariaLabel="title" />
                  <EditableText multiline className={ch.codeSingleDesc} value={lang === "ko" ? it.description_ko : it.description_en}
                    onChange={(v) => set(lang === "ko" ? { description_ko: v } : { description_en: v })}
                    placeholder={t("admin.settings.aboutItemDesc")} ariaLabel="description" style={{ width: "100%" }} />
                </div>
              </div>
              <div className={`${ch.codeSingleBody} ${css.chBody}`}>
                <div className={`${ch.codeDemo} ${dropOver ? css.demoDropOver : ""}`}
                  style={it.demoBg ? { background: it.demoBg } : undefined}
                  onDragOver={(e) => {
                    if (!e.dataTransfer.types.includes("Files")) return;
                    e.preventDefault();
                    setDropOver(true);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                    setDropOver(false);
                  }}
                  onDrop={(e) => {
                    const file = e.dataTransfer.files?.[0];
                    if (!file) return;
                    e.preventDefault();
                    setDropOver(false);
                    /* 끌어다 놓으면 미디어 모드로 자동 전환 — 코드 모드에서 떨어뜨려도 의도대로 */
                    void uploadDemoFile(file)
                      .then((u) => set({ demoMode: "media", demoMedia: u }))
                      .catch(() => setDropErr(true));
                  }}>
                  <CodeDemoSlot mode={it.demoMode} media={it.demoMedia} files={it.demoFiles} template={it.demoTemplate} />
                  {hasDemo ? (
                    /* 채워진 뒤엔 데모를 가리지 않게 좌상단에서 hover 로만 */
                    <div className={css.demoEdit}>
                      <SegmentedControl size="sm" value={it.demoMode ?? "sandbox"}
                        onChange={(v) => setDemoMode(v as CodeDemoMode)}
                        items={[
                          { value: "media", label: lang === "ko" ? "미디어" : "Media" },
                          { value: "sandbox", label: lang === "ko" ? "코드" : "Code" },
                        ]} />
                      {/* 미설정(투명)일 때 피커 초기값 — 저장 전까진 demoBg 가 undefined 라 투명 유지 */}
                      <ColorPicker value={it.demoBg || "#ffffff"} onChange={(c) => set({ demoBg: c.hex })}>
                        {({ toggle }) => (
                          <button type="button" className={css.demoBgSwatch}
                            style={it.demoBg ? { background: it.demoBg } : undefined}
                            onClick={toggle} title={lang === "ko" ? "데모 배경색" : "Demo background"}
                            aria-label={lang === "ko" ? "데모 배경색" : "Demo background"} />
                        )}
                      </ColorPicker>
                      {it.demoBg && (
                        <Button variant="subtle" shape="circle" size="2xs" onClick={() => set({ demoBg: undefined })}
                          aria-label={lang === "ko" ? "배경색 지우기" : "Clear background"}>
                          <X size={11} />
                        </Button>
                      )}
                      {it.demoMode === "media"
                        ? <DemoMediaUpload lang={lang} url={it.demoMedia} onChange={(u) => set({ demoMedia: u })} />
                        : <Popover placement="top-start" trigger={
                            <Button variant="subtle" size="sm" icon={<Code2 size={15} />}>
                              {lang === "ko" ? "코드 편집" : "Edit code"}
                            </Button>
                          }>
                            <DemoFilesEditor key={cur} lang={lang}
                              files={it.demoFiles ?? DEMO_FILE_SEED}
                              onChange={(f) => set({ demoFiles: f })} />
                          </Popover>}
                    </div>
                  ) : (
                    /* 비었을 때는 칸 한가운데서 어떤 데모를 만들지 고르게 */
                    <div className={css.demoEmpty}>
                      <div className={css.demoEmptyInner}>
                      {it.demoMode === "media" ? (
                        <>
                          <span className={css.demoEmptyLabel}>
                            {lang === "ko" ? "실행 화면 녹화물을 올립니다" : "Upload a recording"}
                          </span>
                          <DemoMediaUpload lang={lang} url={it.demoMedia} onChange={(u) => set({ demoMedia: u })} />
                          <button type="button" className={css.demoSwitch} onClick={() => setDemoMode("sandbox")}>
                            {lang === "ko" ? "직접 코드로 만들기" : "Write code instead"}
                          </button>
                        </>
                      ) : (
                        <>
                          <span className={css.demoEmptyLabel}>{lang === "ko" ? "데모 추가" : "Add a demo"}</span>
                          <div className="tw:flex tw:gap-xs">
                            <Button variant="outline" size="sm" icon={<ImageIcon size={16} />}
                              onClick={() => setDemoMode("media")}>
                              {lang === "ko" ? "미디어 업로드" : "Upload media"}
                            </Button>
                            <Button variant="outline" size="sm" icon={<Code2 size={16} />}
                              onClick={() => setDemoMode("sandbox")}>
                              {lang === "ko" ? "코드" : "Code"}
                            </Button>
                          </div>
                        </>
                      )}
                      </div>
                    </div>
                  )}
                  {dropErr && (
                    <span className={css.demoDropErr}>
                      {lang === "ko" ? "업로드에 실패했습니다." : "Upload failed."}
                    </span>
                  )}
                </div>
                <div className={ch.codeScrollWrap}>
                  <CodeBlockEditor code={it.code} onChange={(v) => set({ code: v })} />
                </div>
              </div>
            </div>
          </div>
        </PanelStage>
      )}
    </section>
  );
}

/* 데모 미디어 업로드 — 실행 화면 녹화물(gif/mp4)이라 cover picker(언스플래시·그라디언트)는 안 맞는다.
   그냥 파일 하나 고르는 버튼. */
/* 이미지·영상 업로드 — 버튼과 drop 양쪽에서 쓴다 */
async function uploadDemoFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok || !json?.url) throw new Error(json?.error || "upload failed");
  return json.url as string;
}

function DemoMediaUpload({ url, onChange, lang }: {
  url?: string; onChange: (u: string) => void; lang: Language;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setErr(null);
    try {
      onChange(await uploadDemoFile(file));
    } catch {
      setErr(lang === "ko" ? "업로드에 실패했습니다." : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const name = url ? url.split("/").pop()?.slice(0, 28) : null;
  return (
    <>
      <input ref={inputRef} type="file" hidden accept="image/*,video/mp4,video/webm,video/quicktime"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }} />
      <Button variant="subtle" size="xs" icon={<ImageIcon size={14} />} disabled={busy}
        onClick={() => inputRef.current?.click()}>
        {busy ? (lang === "ko" ? "업로드 중" : "Uploading")
          : url ? (lang === "ko" ? "변경" : "Change")
            : (lang === "ko" ? "업로드" : "Upload")}
      </Button>
      {name && <span className={css.mediaName}>{name}</span>}
      {url && (
        <Button variant="subtle" shape="circle" size="2xs" onClick={() => onChange("")} aria-label="remove media">
          <X size={11} />
        </Button>
      )}
      {err && <span className={css.demoUploadErr}>{err}</span>}
    </>
  );
}

/* 덧붙일 문구 제한 — 저작자 표시 아래 보조 문구라 길어질 이유가 없다.
   행 수를 고정해 문구 길이와 무관하게 프리뷰 높이를 일정하게 유지한다. */
const CREDITS_NOTE_MAX = 160;
const CREDITS_NOTE_ROWS = 4;

/* ═══════════ User Flow ═══════════ */
const UF_MAX = 8;

/* 실제 패널과 동일 — 좌측 페르소나 정보 + 우측 플로우 다이어그램.
   다이어그램 좌표(row/col)는 flowLayout 이 계산하므로 여기선 값만 편집한다. */
function UserFlowBlock({ value, onChange, lang, t, scale, titleOverride }: {
  value: UserFlow[]; onChange: (v: UserFlow[]) => void; lang: Language; t: TFunction; scale: number; titleOverride?: string;
}) {
  const [tab, setTab] = useState(0);
  const cur = Math.min(tab, Math.max(0, value.length - 1));
  const it = value[cur];
  const set = (p: Partial<UserFlow>) => onChange(value.map((x, i) => (i === cur ? { ...x, ...p } : x)));
  const setLocal = (k: "persona" | "description", v: string) =>
    set({ [k]: { ...it[k], [lang]: v } } as Partial<UserFlow>);
  const add = () => {
    onChange([...value, { title: "", persona: { ko: "", en: "" }, description: { ko: "", en: "" }, nodes: [], edges: [] }]);
    setTab(value.length);
  };
  const removeAt = (i: number) => {
    onChange(value.filter((_, x) => x !== i));
    setTab(Math.max(0, i - 1));
  };
  const isEmpty = (f: UserFlow) => !f.title.trim() && f.nodes.length === 0;
  const selectTab = (next: number) => {
    if (next !== cur && it && isEmpty(it)) {
      onChange(value.filter((_, i) => i !== cur));
      setTab(next > cur ? next - 1 : next);
      return;
    }
    setTab(next);
  };


  return (
    <section className={css.block}>
      <div className="tw:flex tw:gap-sm tw:items-center tw:flex-wrap">
        <StageTabs count={value.length} active={cur} onSelect={selectTab} onAdd={add}
          canAdd={value.length < UF_MAX}
          addLabel={lang === "ko" ? "플로우 추가" : "Add flow"}
          labelOf={(i) => value[i]?.title || (lang === "ko" ? "새 플로우" : "Untitled")} />
      </div>
      {it && (
        <PanelStage scale={scale}>
          <div key={cur} className={css.ufStage}>
            <div className={css.chTools}>
              <Button variant="subtle" shape="circle" size="xs" onClick={() => removeAt(cur)} aria-label="remove">
                <X size={14} />
              </Button>
            </div>
            <h3 className={sec.panelTitle}>{titleOverride ?? "User Flow."}</h3>

            <div className={uf.ufFlowLayout}>
              {/* 좌측 — 실제와 같은 페르소나 카드 */}
              <div className={uf.ufFlowInfo}>
                <EditableText className={uf.ufFlowTitle} value={it.title}
                  onChange={(v) => set({ title: v })} placeholder={lang === "ko" ? "플로우 이름" : "Flow title"}
                  ariaLabel="title" autoFocus={isEmpty(it)} />
                <div className="tw:flex tw:items-center tw:gap-sm">
                  <div className="tw:flex tw:flex-col tw:gap-4xs">
                    <EditableText className={uf.ufFlowPersona} value={it.persona[lang] ?? ""}
                      onChange={(v) => setLocal("persona", v)}
                      placeholder={lang === "ko" ? "페르소나" : "Persona"} ariaLabel="persona" />
                    <EditableText multiline className={uf.ufFlowDesc} value={it.description[lang] ?? ""}
                      onChange={(v) => setLocal("description", v)}
                      placeholder={t("admin.settings.aboutItemDesc")} ariaLabel="description" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>

              {/* 우측 — 실제 도형 위에서 드래그·선택하는 비주얼 편집 */}
              <FlowDiagramEditor flow={it} onChange={set} lang={lang} />
            </div>
          </div>
        </PanelStage>
      )}
    </section>
  );
}

/* 테이블이 하나도 안 나올 때 "왜" 를 짚어준다.
   ALTER 를 지원하면서 "CREATE TABLE 을 못 찾았다" 고만 말하면 거짓말이 되고,
   멀쩡한 SQL 을 붙여넣은 사람이 자기 SQL 을 의심하게 된다. */
function emptyReason(parsed: ParsedErd, sql: string, lang: Language): string {
  const ko = lang === "ko";

  /* ALTER 대상이 없는 건 문법 문제가 아니다 — 원인이 다르니 먼저 말한다 */
  if (parsed.unresolved.length) {
    const names = parsed.unresolved.join(", ");
    return ko
      ? `ALTER 대상 테이블(${names})이 ERD 에 없습니다. 해당 CREATE TABLE 문을 함께 붙여넣어 주세요.`
      : `ALTER targets a table not in the ERD (${names}). Paste its CREATE TABLE too.`;
  }

  /* ALTER 를 읽긴 했는데 ERD 에 옮길 게 없던 경우 — 제약·기본값만 바꾸는 마이그레이션 */
  if (parsed.noEffect.length) {
    const names = parsed.noEffect.join(", ");
    return ko
      ? `${names} 의 변경을 읽었지만 다이어그램에 반영할 내용이 없습니다. 제약·기본값·인덱스·권한은 ERD 에 나타나지 않습니다.`
      : `Read changes to ${names}, but nothing to draw. Constraints, defaults, indexes and grants don't appear in the ERD.`;
  }

  if (parsed.skipped > 0) {
    return ko
      ? `읽지 못한 문장이 ${parsed.skipped}개 있습니다. CREATE TABLE · ALTER TABLE 문법을 확인해 주세요.`
      : `${parsed.skipped} statements couldn't be read. Check the CREATE TABLE / ALTER TABLE syntax.`;
  }

  /* 문법은 다 알아봤는데 그릴 게 없는 경우 — 함수·제약·인덱스만 있는 마이그레이션이 여기 걸린다 */
  if (parsed.statements > 0) {
    return ko
      ? `문장 ${parsed.statements}개를 읽었지만 ERD 가 달라지지 않습니다. 함수·제약·인덱스·권한은 다이어그램에 나타나지 않습니다.`
      : `Read ${parsed.statements} statements, but the ERD wouldn't change. Functions, constraints, indexes and grants don't appear in the diagram.`;
  }

  return ko ? "SQL 을 입력해 주세요" : "Enter some SQL";
}

/* 가져오기 적용 전 경고 — 숫자만 보여주면 "무엇이 덮어써지는지" 를 알 수 없다.
   바뀌는 컬럼을 이름과 전/후로 짚어주고, 사라지는 것은 따로 모아 보여준다. */
function ImportWarning({ plan, lang, onConfirm }: {
  plan: ImportPlan; lang: Language; onConfirm: () => void;
}) {
  const ko = lang === "ko";
  const changedCount = plan.updatedTables.reduce((n, t) => n + t.changed.length, 0);
  return (
    <ModalConfirm
      desc={plan.mode === "replace"
        ? (ko ? "기존 ERD 를 SQL 내용으로 통째로 교체합니다. 되돌릴 수 없습니다."
              : "This replaces the entire ERD with the parsed SQL. It cannot be undone.")
        : (ko ? "SQL 내용을 기존 ERD 에 병합합니다. 아래 항목은 SQL 정의로 덮어써집니다."
              : "This merges the parsed SQL into your ERD. The items below get overwritten by the SQL definition.")}
      confirmText={plan.mode === "replace" ? (ko ? "교체" : "Replace") : (ko ? "병합" : "Merge")}
      danger
      onConfirm={onConfirm}
    >
      <ul className={css.planList}>
        {plan.removedTables.length > 0 && (
          <li className={css.planDanger}>
            <strong>{ko ? `테이블 ${plan.removedTables.length}개가 삭제됩니다` : `${plan.removedTables.length} tables will be deleted`}</strong>
            <span className={css.planNames}>{plan.removedTables.join(", ")}</span>
          </li>
        )}
        {changedCount > 0 && (
          <li className={css.planDanger}>
            <strong>{ko ? `컬럼 ${changedCount}개가 덮어써집니다` : `${changedCount} columns will be overwritten`}</strong>
            <div className={css.planDiff}>
              {plan.updatedTables.flatMap((t) => t.changed.map((c) => (
                <span key={`${t.name}.${c.name}`} className={css.planDiffRow}>
                  <code>{t.name}.{c.name}</code>
                  <span className={css.planBefore}>{c.before}</span>
                  <span aria-hidden>→</span>
                  <span className={css.planAfter}>{c.after}</span>
                </span>
              )))}
            </div>
          </li>
        )}
        {plan.addedTables.length > 0 && (
          <li>
            <strong>{ko ? `테이블 ${plan.addedTables.length}개 추가` : `${plan.addedTables.length} tables added`}</strong>
            <span className={css.planNames}>{plan.addedTables.join(", ")}</span>
          </li>
        )}
        {plan.keptTables.length > 0 && (
          <li>{ko ? `테이블 ${plan.keptTables.length}개는 그대로 유지됩니다` : `${plan.keptTables.length} tables stay untouched`}</li>
        )}
      </ul>
    </ModalConfirm>
  );
}

/* ═══════════ ERD ═══════════ */
/* 테이블·컬럼을 하나씩 손으로 넣는 건 실수가 잦고 느리다.
   실제 스키마(CREATE TABLE)를 붙여넣으면 테이블·컬럼·관계를 한 번에 만든다. */
function ErdBlock({ tables, relations, onChange, lang }: {
  tables: ErdTable[]; relations: ErdRelation[];
  onChange: (t: ErdTable[], r: ErdRelation[]) => void; lang: Language;
}) {
  const openModal = useModalStore((st) => st.openModal);
  const [sql, setSql] = useState("");
  /* SQL 입력은 한 번 쓰고 마는 도구다 — 상시 펼쳐두면 캔버스를 계속 밀어낸다 */
  const [importOpen, setImportOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  /* Textarea 는 ref 를 받지 않아 래퍼에서 찾아 포커스한다 — 항상 마운트라 autoFocus 가 안 먹는다 */
  const sqlBoxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!importOpen) return;
    sqlBoxRef.current?.querySelector("textarea")?.focus();
  }, [importOpen]);
  const importRef = useRef<HTMLDivElement>(null);

  /* 바깥을 클릭하면 접는다. 입력한 내용이 있으면 실수로 날아가지 않게 열어둔다. */
  useEffect(() => {
    if (!importOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (t && importRef.current?.contains(t)) return;
      if (sql.trim()) return;
      setImportOpen(false);
      setErr(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [importOpen, sql]);
  const [dropOver, setDropOver] = useState(false);

  /* .sql 파일을 그대로 읽는다 — 스키마 덤프는 붙여넣기엔 길다 */
  const loadFile = async (f: File) => {
    setErr(null);
    try {
      const text = await f.text();
      setSql(text);
      setFileName(f.name);
      setImportOpen(true);
    } catch {
      setErr(lang === "ko" ? "파일을 읽지 못했습니다." : "Could not read the file.");
    }
  };
  const [result, setResult] = useState<{ tables: number; relations: number; skipped: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  /* 어떤 파일을 읽었는지 — 붙여넣기와 파일 업로드가 같은 칸을 쓰므로 출처가 보여야 한다 */
  const [fileName, setFileName] = useState<string | null>(null);
  /* 되돌리기가 없는 동작이라 파괴적인 쪽(교체)이 기본이면 안 된다 — 기존이 있으면 병합이 기본 */
  const [mode, setMode] = useState<"merge" | "replace">("merge");

  /* 생성 전에 무엇이 만들어질지 미리 보여준다 — 누르고 나서야 결과를 아는 건 되돌리기 어렵다.
     긴 덤프를 매 타건마다 파싱하면 입력이 밀리므로 deferred 값으로 한 박자 늦춘다. */
  const deferredSql = useDeferredValue(sql);
  /* 현재 테이블을 넘긴다 — ALTER 는 기존 테이블 위에서만 의미가 있어,
     빈 상태로 파싱하면 ALTER 만 붙여넣은 SQL 이 영영 아무것도 만들지 못한다. */
  const preview = useMemo(
    () => (deferredSql.trim() ? parseSqlErd(deferredSql, tables) : null),
    [deferredSql, tables],
  );

  /* 테이블을 하나도 만들지 않아도 DROP 만으로 충분히 유효한 입력이다 */
  const hasEffect = (p: ParsedErd) =>
    p.tables.length > 0 || p.removedTables.length > 0 || p.removedColumns.length > 0;

  const commit = (parsed: ParsedErd) => {
    const next = mode === "merge" && tables.length > 0
      ? mergeErd({ tables, relations }, parsed)
      : { tables: parsed.tables, relations: parsed.relations };
    onChange(next.tables, next.relations);
    setResult({ tables: next.tables.length, relations: next.relations.length, skipped: parsed.skipped });
    setImportOpen(false);
    setSql("");
    setFileName(null);
  };

  const applySql = () => {
    setErr(null);
    const parsed = parseSqlErd(sql, tables);
    if (!hasEffect(parsed)) {
      setErr(emptyReason(parsed, sql, lang));
      setResult(null);
      return;
    }
    /* 되돌릴 수 없는 동작이라, 무엇이 덮어써지고 무엇이 사라지는지 이름까지 보여주고 묻는다.
       병합도 규칙상 기존 컬럼 정의를 SQL 로 덮으므로 조용히 넘기지 않는다. */
    const plan = describeImport({ tables, relations }, parsed, tables.length > 0 ? mode : "replace");
    const destructive = plan.removedTables.length > 0
      || plan.updatedTables.some((t) => t.changed.length > 0);
    if (tables.length > 0 && destructive) {
      openModal(
        <ImportWarning plan={plan} lang={lang} onConfirm={() => commit(parsed)} />,
        { width: "min(92vw, 560px)" },
      );
      return;
    }
    commit(parsed);
  };

  return (
    <section className={css.block}>
      <div ref={importRef} className={`${css.erdImport} ${dropOver ? css.erdImportOver : ""}`}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDropOver(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setDropOver(false);
        }}
        onDrop={(e) => {
          const f = e.dataTransfer.files?.[0];
          if (!f) return;
          e.preventDefault();
          setDropOver(false);
          void loadFile(f);
        }}
>
        {/* 조건부 분기 밖에 둔다 — 안쪽에 두면 분기가 바뀔 때 언마운트돼 ref 가 null 이 된다 */}
        <input ref={fileRef} type="file" className={css.hiddenFile}
          accept=".sql,text/plain,application/sql"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void loadFile(f);
            e.target.value = "";
          }} />

        <div className="tw:flex tw:flex-col tw:gap-sm">
        {!importOpen && (
          <div className="tw:flex tw:gap-xs tw:items-center tw:flex-wrap">
            {/* 붙여넣기에는 실제로 포커스를 받는 대상이 필요하다.
                이 영역이 드롭 존이자 붙여넣기 대상 — 클릭해 포커스한 뒤 붙여넣으면 된다. */}
            {/* 포커스하는 순간 입력창으로 펼친다 — 뭔가 붙여넣어야 바뀌면 동작을 알 수 없다 */}
            <div className={css.erdDrop} tabIndex={0} role="button"
              aria-label={lang === "ko" ? "SQL 입력 열기" : "Open SQL input"}
              onFocus={() => setImportOpen(true)}
              onClick={() => setImportOpen(true)}>
              <FileCode size={14} />
              <span>
                {lang === "ko"
                  ? "여기에 .sql 파일을 놓거나 스키마(SQL)를 붙여넣습니다"
                  : "Drop a .sql file here, or paste your SQL schema"}
              </span>
            </div>
            {/* 파일 선택은 두 상태에서 늘 행의 오른쪽 끝 — 상태에 따라 자리가 옮겨다니면
                같은 버튼인지 알아보기 어렵다. 닫힘에선 flex:1 드롭존이 밀어서 오른쪽에 선다. */}
            <Button className={css.erdFileBtn} variant="subtle" size="md"
              icon={<FileCode size={15} />} onClick={() => fileRef.current?.click()}>
              {lang === "ko" ? "파일 선택" : "Choose file"}
            </Button>
          </div>
        )}
        {/* 상태 문구는 액션 행 밖으로 — 행 안에 있으면 파일 버튼을 왼쪽으로 밀어낸다 */}
        {!importOpen && (result || err) && (
          <div className={css.erdMeta}>
            {result && (
              <span className={css.erdResult}>
                {lang === "ko"
                  ? `테이블 ${result.tables}개 · 관계 ${result.relations}개 생성${result.skipped ? ` · ${result.skipped}줄 건너뜀` : ""}`
                  : `${result.tables} tables · ${result.relations} relations${result.skipped ? ` · ${result.skipped} skipped` : ""}`}
              </span>
            )}
            {err && <span className={css.erdErr}>{err}</span>}
          </div>
        )}
        {/* 항상 마운트해 두고 높이만 0↔auto — 열 때 새로 마운트하면 트랜지션이 걸리지 않는다.
            닫혀 있을 땐 inert 로 탭 이동·클릭에서 빠진다. */}
        <div className={`${css.erdCollapse} ${importOpen ? css.erdCollapseOpen : ""}`}>
          <div className="tw:flex tw:flex-col tw:gap-2xs" ref={sqlBoxRef} inert={!importOpen}>
            <p className={css.erdHint}>
              {lang === "ko"
                ? "CREATE TABLE · ALTER TABLE · DROP TABLE 을 순서대로 적용합니다. PRIMARY KEY 와 REFERENCES 로 키와 관계를 인식하고, 인덱스·정책·함수 등은 무시합니다."
                : "Applies CREATE TABLE, ALTER TABLE, and DROP TABLE in order. PRIMARY KEY and REFERENCES define keys and links; indexes, policies, and functions are ignored."}
            </p>
            {/* 하이라이팅되는 편집기 — 투명 textarea 오버레이는 캐럿·스크롤이 어긋나 쓰지 않는다
                (CodeBlockEditor 주석 참고). 편집은 CodeMirror 에 맡긴다. */}
            <SqlEditor value={sql} onChange={setSql} tables={tables} lang={lang}
              ariaLabel={lang === "ko" ? "SQL 스키마" : "SQL schema"} />
            {/* 무엇이 만들어질지 입력하는 동안 계속 알려준다 — 생성은 되돌릴 수 없다 */}
            <div className={css.erdMeta}>
              {fileName && (
                <span className={css.erdFile} title={fileName}>
                  <FileCode size={12} />{fileName}
                </span>
              )}
              {preview && (
                hasEffect(preview) ? (
                  <span className={css.erdPreviewOk}>
                    {(() => {
                      /* 모드에 따라 실제 결과가 다르다 — 인식 수만 보여주면 병합 결과를 오해한다 */
                      if (tables.length === 0 || mode === "replace") {
                        return lang === "ko"
                          ? `테이블 ${preview.tables.length}개 · 관계 ${preview.relations.length}개 인식`
                          : `${preview.tables.length} tables · ${preview.relations.length} relations detected`;
                      }
                      const m = mergeErd({ tables, relations }, preview).stats;
                      /* 삭제는 되돌릴 수 없어 0 이 아닐 때 반드시 드러나야 한다 */
                      const gone = lang === "ko"
                        ? [m.removedTables && `테이블 ${m.removedTables}개 삭제`,
                           m.removedColumns && `컬럼 ${m.removedColumns}개 삭제`]
                        : [m.removedTables && `${m.removedTables} tables removed`,
                           m.removedColumns && `${m.removedColumns} columns removed`];
                      const base = lang === "ko"
                        ? `새 테이블 ${m.addedTables}개 · 기존 ${m.updatedTables}개 갱신 · ${m.keptTables}개 유지`
                        : `${m.addedTables} new · ${m.updatedTables} updated · ${m.keptTables} untouched`;
                      return [base, ...gone.filter(Boolean)].join(" · ");
                    })()}
                    {preview.skipped > 0 && (
                      <span className={css.erdPreviewMuted}>
                        {lang === "ko" ? ` · ${preview.skipped}줄 건너뜀` : ` · ${preview.skipped} lines skipped`}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className={css.erdPreviewNone}>
                    {emptyReason(preview, deferredSql, lang)}
                  </span>
                )
              )}
              {tables.length > 0 && preview && hasEffect(preview) && mode === "replace" && (
                <span className={css.erdReplaceWarn}>
                  {lang === "ko"
                    ? `기존 ${tables.length}개 테이블이 모두 지워집니다`
                    : `All ${tables.length} existing tables will be removed`}
                </span>
              )}
            </div>
            <div className="tw:flex tw:gap-xs tw:items-center tw:flex-wrap">
              {/* 기존이 없으면 모드가 의미 없다 — 그냥 생성 */}
              {tables.length > 0 && (
                <SegmentedControl<"merge" | "replace"> size="sm" value={mode} onChange={setMode}
                  items={[
                    { value: "merge", label: lang === "ko" ? "병합" : "Merge" },
                    { value: "replace", label: lang === "ko" ? "교체" : "Replace" },
                  ]} />
              )}
              <Button variant="primary" size="md"
                disabled={!preview || !hasEffect(preview)} onClick={applySql}>
                {preview && hasEffect(preview)
                  ? (tables.length > 0 && mode === "merge"
                      ? (lang === "ko" ? "병합" : "Merge")
                      : (lang === "ko" ? `테이블 ${preview.tables.length}개 생성` : `Generate ${preview.tables.length} tables`))
                  : (lang === "ko" ? "생성" : "Generate")}
              </Button>
              <Button variant="subtle" size="md" onClick={() => { setImportOpen(false); setErr(null); setFileName(null); }}>
                {lang === "ko" ? "취소" : "Cancel"}
              </Button>
              {err && <span className={css.erdErr}>{err}</span>}
              {/* 닫힘 상태와 같은 라벨·같은 자리(오른쪽 끝) — 이름이나 위치가 바뀌면 다른 기능처럼 보인다 */}
              <Button className={css.erdFileBtn} variant="subtle" size="md"
                icon={<FileCode size={15} />} onClick={() => fileRef.current?.click()}>
                {lang === "ko" ? "파일 선택" : "Choose file"}
              </Button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* 미리보기 겸 편집 — 클릭한 테이블만 펼쳐진다 */}
      <div className={css.erdCanvasScroll}>
        <ErdCanvas tables={tables} relations={relations} onChange={onChange} lang={lang} />
      </div>
    </section>
  );
}

/* ═══════════ Backend ═══════════ */
const BK_MAX = 12;
/* 실제 패널과 동일 — 좌측 목록 + 우측 상세. 실제도 한 항목씩 보므로 탭으로 전환. */
function BackendBlock({ value, onChange, lang, t, scale, titleOverride }: {
  value: BackendItem[]; onChange: (v: BackendItem[]) => void; lang: Language; t: TFunction; scale: number; titleOverride?: string;
}) {
  const [tab, setTab] = useState(0);
  const cur = Math.min(tab, Math.max(0, value.length - 1));
  const it = value[cur];
  const set = (p: Partial<BackendItem>) => onChange(value.map((x, i) => (i === cur ? { ...x, ...p } : x)));
  const setLocal = (k: "description" | "designNote", v: string) =>
    set({ [k]: { ...(it[k] ?? { ko: "", en: "" }), [lang]: v } } as Partial<BackendItem>);
  const add = () => {
    onChange([...value, { name: "", kind: "api", description: { ko: "", en: "" }, endpoints: [] }]);
    setTab(value.length);
  };
  const removeAt = (i: number) => {
    onChange(value.filter((_, x) => x !== i));
    setTab(Math.max(0, i - 1));
  };
  const isEmpty = (c: BackendItem) => !c.name.trim() && !c.description.ko.trim() && !c.description.en.trim();
  const selectTab = (next: number) => {
    if (next !== cur && it && isEmpty(it)) {
      onChange(value.filter((_, i) => i !== cur));
      setTab(next > cur ? next - 1 : next);
      return;
    }
    setTab(next);
  };

  const endpoints = it?.endpoints ?? [];
  const setEndpoints = (v: NonNullable<BackendItem["endpoints"]>) => set({ endpoints: v });
  const columns = it?.columns ?? [];
  const setColumns = (v: NonNullable<BackendItem["columns"]>) => set({ columns: v });

  return (
    <section className={css.block}>
      <div className="tw:flex tw:gap-sm tw:items-center tw:flex-wrap">
        <StageTabs count={value.length} active={cur} onSelect={selectTab} onAdd={add}
          canAdd={value.length < BK_MAX}
          addLabel={lang === "ko" ? "항목 추가" : "Add item"}
          labelOf={(i) => value[i]?.name || (lang === "ko" ? "새 항목" : "Untitled")} />
      </div>
      {it && (
        <PanelStage scale={scale}>
          <div key={cur} className={css.bkStage}>
            <div className={css.chTools}>
              <SegmentedControl<"api" | "table"> size="sm" value={it.kind}
                onChange={(v) => set({ kind: v })}
                items={[{ value: "api", label: "API" }, { value: "table", label: "TABLE" }]} />
              <Button variant="subtle" shape="circle" size="xs" onClick={() => removeAt(cur)} aria-label="remove">
                <X size={14} />
              </Button>
            </div>
            <h3 className={sec.panelTitle}>{titleOverride ?? "Backend."}</h3>

            <div className={css.bkBody}>
              <div className={bk.dbList}>
                {value.map((item, i) => (
                  <div key={i} className={`${bk.dbListItem} ${i === cur ? bk.dbListItemActive : ""}`}
                    role="button" tabIndex={0}
                    onClick={() => selectTab(i)}
                    onKeyDown={(e) => { if (e.key === "Enter") selectTab(i); }}>
                    <span className={bk.dbNumber}>{String(i + 1).padStart(2, "0")}</span>
                    <div className={bk.dbListMeta}>
                      <span className={bk.dbListTitle}>
                        {item.name || (lang === "ko" ? "새 항목" : "Untitled")}
                        <span className={`${bk.dbKindBadge} ${bk.dbKindBadgeSm} ${item.kind === "api" ? bk.dbKindApi : bk.dbKindTable}`}>
                          {item.kind === "api" ? "API" : "TABLE"}
                        </span>
                      </span>
                      <span className={bk.dbListDesc}>{item.description[lang]}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={bk.dbDetail}>
                <div className={bk.detailHeader}>
                  <EditableText className={bk.dbTitle} value={it.name}
                    onChange={(v) => set({ name: v })} placeholder="posts" ariaLabel="name" autoFocus={isEmpty(it)} />
                </div>
                <EditableText multiline className={css.bkDesc} value={it.description[lang] ?? ""}
                  onChange={(v) => setLocal("description", v)}
                  placeholder={t("admin.settings.aboutItemDesc")} ariaLabel="description" style={{ width: "100%" }} />
                <EditableText multiline className={css.bkNote} value={it.designNote?.[lang] ?? ""}
                  onChange={(v) => setLocal("designNote", v)}
                  placeholder={lang === "ko" ? "설계 노트 (선택)" : "Design note (optional)"} ariaLabel="design note" style={{ width: "100%" }} />

                {it.kind === "api" ? (
                  <div className={bk.entryBlock}>
                    <span className={bk.entryLabel}>ENDPOINTS</span>
                    {endpoints.map((ep, i) => (
                      <div key={i} className={`${bk.dbEndpoint} ${css.bkRow}`}>
                        <EditableText className={css.bkMethod} value={ep.method}
                          onChange={(v) => setEndpoints(endpoints.map((x, j) => (j === i ? { ...x, method: v.toUpperCase() } : x)))}
                          placeholder="GET" ariaLabel="method" />
                        <EditableText className={bk.dbEndpointPath} value={ep.path}
                          onChange={(v) => setEndpoints(endpoints.map((x, j) => (j === i ? { ...x, path: v } : x)))}
                          placeholder="/api/posts" ariaLabel="path" />
                        <EditableText className={bk.dbEndpointDesc} value={ep.description[lang] ?? ""}
                          onChange={(v) => setEndpoints(endpoints.map((x, j) => (j === i ? { ...x, description: { ...x.description, [lang]: v } } : x)))}
                          placeholder={t("admin.settings.aboutItemDesc")} ariaLabel="endpoint description" style={{ flex: 1 }} />
                        <Button variant="subtle" shape="circle" size="2xs" aria-label="remove endpoint"
                          onClick={() => setEndpoints(endpoints.filter((_, j) => j !== i))}>
                          <X size={11} />
                        </Button>
                      </div>
                    ))}
                    <Button variant="subtle" size="xs" icon={<Plus size={13} />}
                      onClick={() => setEndpoints([...endpoints, { method: "GET", path: "", description: { ko: "", en: "" } }])}>
                      {lang === "ko" ? "엔드포인트 추가" : "Add endpoint"}
                    </Button>
                  </div>
                ) : (
                  <div className={bk.entryBlock}>
                    <span className={bk.entryLabel}>SCHEMA</span>
                    {columns.map((cl, i) => (
                      <div key={i} className={`${bk.dbSchemaRow} ${css.bkRow}`}>
                        <EditableText className={bk.dbColName} value={cl.name}
                          onChange={(v) => setColumns(columns.map((x, j) => (j === i ? { ...x, name: v } : x)))}
                          placeholder="id" ariaLabel="column name" />
                        <EditableText className={bk.dbColType} value={cl.type}
                          onChange={(v) => setColumns(columns.map((x, j) => (j === i ? { ...x, type: v } : x)))}
                          placeholder="uuid" ariaLabel="type" />
                        <EditableText className={bk.dbColConstraint} value={cl.constraint ?? ""}
                          onChange={(v) => setColumns(columns.map((x, j) => (j === i ? { ...x, constraint: v } : x)))}
                          placeholder="PK" ariaLabel="constraint" />
                        <EditableText className={bk.dbColDesc} value={cl.description[lang] ?? ""}
                          onChange={(v) => setColumns(columns.map((x, j) => (j === i ? { ...x, description: { ...x.description, [lang]: v } } : x)))}
                          placeholder={t("admin.settings.aboutItemDesc")} ariaLabel="column description" style={{ flex: 1 }} />
                        <Button variant="subtle" shape="circle" size="2xs" aria-label="remove column"
                          onClick={() => setColumns(columns.filter((_, j) => j !== i))}>
                          <X size={11} />
                        </Button>
                      </div>
                    ))}
                    <Button variant="subtle" size="xs" icon={<Plus size={13} />}
                      onClick={() => setColumns([...columns, { name: "", type: "", description: { ko: "", en: "" } }])}>
                      {lang === "ko" ? "컬럼 추가" : "Add column"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </PanelStage>
      )}
    </section>
  );
}

/* ═══════════ Troubleshooting ═══════════ */
const TS_MAX = 16;
const TS_FIELDS = ["problem", "definition", "cause", "solution", "keyInsight"] as const;

/* 항목이 길고 서술형이라 한 번에 하나씩 편집한다.
   비교표·다이어그램·이미지는 구조가 깊어 개수만 보여주고 본문 편집에 집중. */
function TroubleshootingBlock({ value, onChange, lang, scale, titleOverride }: {
  value: TroubleShootingItem[]; onChange: (v: TroubleShootingItem[]) => void;
  lang: Language; scale: number; titleOverride?: string;
}) {
  const [tab, setTab] = useState(0);
  const cur = Math.min(tab, Math.max(0, value.length - 1));
  const it = value[cur];
  const set = (p: Partial<TroubleShootingItem>) => onChange(value.map((x, i) => (i === cur ? { ...x, ...p } : x)));
  const setLocal = (k: (typeof TS_FIELDS)[number], v: string) =>
    set({ [k]: { ...(it[k] ?? { ko: "", en: "" }), [lang]: v } } as Partial<TroubleShootingItem>);

  const add = () => {
    onChange([...value, {
      problem: { ko: "", en: "" }, definition: { ko: "", en: "" },
      cause: { ko: "", en: "" }, solution: { ko: "", en: "" }, keyInsight: { ko: "", en: "" },
      difficulty: 2,
    }]);
    setTab(value.length);
  };
  const removeAt = (i: number) => {
    onChange(value.filter((_, x) => x !== i));
    setTab(Math.max(0, i - 1));
  };
  const isEmpty = (c: TroubleShootingItem) => !c.problem.ko.trim() && !c.problem.en.trim();
  const selectTab = (next: number) => {
    if (next !== cur && it && isEmpty(it)) {
      onChange(value.filter((_, i) => i !== cur));
      setTab(next > cur ? next - 1 : next);
      return;
    }
    setTab(next);
  };

  const tags = it?.tags ?? [];
  const label = (k: (typeof TS_FIELDS)[number]) => ({
    problem: lang === "ko" ? "문제" : "Problem",
    definition: lang === "ko" ? "정의" : "Definition",
    cause: lang === "ko" ? "원인" : "Cause",
    solution: lang === "ko" ? "해결" : "Solution",
    keyInsight: lang === "ko" ? "핵심" : "Key insight",
  }[k]);

  return (
    <section className={css.block}>
      <div className="tw:flex tw:gap-sm tw:items-center tw:flex-wrap">
        <StageTabs count={value.length} active={cur} onSelect={selectTab} onAdd={add}
          canAdd={value.length < TS_MAX}
          addLabel={lang === "ko" ? "항목 추가" : "Add item"}
          labelOf={(i) => value[i]?.problem[lang] || value[i]?.problem.ko || (lang === "ko" ? "새 항목" : "Untitled")} />
      </div>
      {it && (
        <PanelStage scale={scale}>
          <div key={cur} className={css.tsStage}>
            <div className={css.chTools}>
              <SegmentedControl<"1" | "2" | "3"> size="sm" value={String(it.difficulty ?? 2) as "1" | "2" | "3"}
                onChange={(v) => set({ difficulty: Number(v) as TroubleShootingItem["difficulty"] })}
                items={[{ value: "1", label: "L1" }, { value: "2", label: "L2" }, { value: "3", label: "L3" }]} />
              <Button variant={it.recommended ? "primary" : "subtle"} size="sm"
                onClick={() => set({ recommended: !it.recommended })}
                aria-pressed={!!it.recommended}>
                {lang === "ko" ? "추천" : "Featured"}
              </Button>
              <Button variant="subtle" shape="circle" size="xs" onClick={() => removeAt(cur)} aria-label="remove">
                <X size={14} />
              </Button>
            </div>
            <h3 className={sec.panelTitle}>{titleOverride ?? "Troubleshooting."}</h3>

            <div className="tw:flex tw:flex-col tw:gap-lg">
              {TS_FIELDS.map((k) => (
                <div key={k} className="tw:flex tw:flex-col tw:gap-2xs">
                  <span className={bk.entryLabel}>{label(k)}</span>
                  <EditableText multiline className={css.tsText} value={it[k]?.[lang] ?? ""}
                    onChange={(v) => setLocal(k, v)}
                    placeholder={label(k)} ariaLabel={k} style={{ width: "100%" }} />
                </div>
              ))}

              <div className="tw:flex tw:flex-col tw:gap-2xs">
                <span className={bk.entryLabel}>TAGS</span>
                <div className="tw:flex tw:gap-2xs tw:items-center tw:flex-wrap">
                  {tags.map((tg, i) => (
                    <Chip key={i} className={css.tsTag}
                      onRemove={() => set({ tags: tags.filter((_, j) => j !== i) })}>
                      {tg}
                    </Chip>
                  ))}
                  <Button variant="subtle" size="2xs" icon={<Plus size={12} />}
                    onClick={() => set({ tags: [...tags, `tag-${tags.length + 1}`] })}>
                    {lang === "ko" ? "태그" : "Tag"}
                  </Button>
                </div>
              </div>

              {/* 구조가 깊은 부가 콘텐츠는 개수만 — 본문 편집을 가리지 않게 */}
              <p className={css.tsMeta}>
                {lang === "ko"
                  ? `비교표 ${it.comparisons?.length ?? 0} · 다이어그램 ${it.diagrams?.length ?? 0} · 이미지 ${it.images?.length ?? 0}`
                  : `${it.comparisons?.length ?? 0} tables · ${it.diagrams?.length ?? 0} diagrams · ${it.images?.length ?? 0} images`}
              </p>
            </div>
          </div>
        </PanelStage>
      )}
    </section>
  );
}

/* ═══════════ Credits ═══════════ */
function CreditsBlock({ about, setAny, lang, nickname, t }: {
  about: SiteConfigData["about"]; setAny: (k: string, v: unknown) => void; lang: Language;
  nickname: string; t: TFunction;
}) {
  /* 저작자 표시 문구(로케일)와 소유자 이름은 고정 — 편집 대상이 아니다.
     문구를 자유롭게 바꿀 수 있으면 이름만 잠가봐야 표시 자체가 무력화된다. */
  const [before = "", after = ""] = t("aboutPage.credits").split("❤");

  const rec = about as unknown as Record<string, string | undefined>;
  const noteKey = lang === "ko" ? "creditsNote_ko" : "creditsNote";
  const note = rec[noteKey] ?? "";

  const noteAlign = (rec.creditsNoteAlign as "left" | "center" | "right") || "left";
  const notePx = parseInt(rec.creditsNoteFontSize || "", 10) || 14;
  const noteLh = parseFloat(rec.creditsNoteLineHeight || "") || 1.6;
  /* 보기/편집 양쪽에 같은 타이포를 적용해 전환해도 글자가 안 튄다 */
  /* 직접 속성은 보기 모드(p)용, --note-* 는 공통 Textarea 내부 규칙을 넘기 위한 편집 요소용.
     Textarea 는 style 을 편집 요소로 안 내려주고 자체 폰트 규칙이 상속을 덮는다. */
  const noteStyle = {
    fontSize: rec.creditsNoteFontSize || undefined,
    fontFamily: rec.creditsNoteFontFamily || undefined,
    lineHeight: rec.creditsNoteLineHeight || undefined,
    textAlign: noteAlign,
    "--note-ff": rec.creditsNoteFontFamily || "inherit",
    "--note-fs": rec.creditsNoteFontSize || "inherit",
    "--note-lh": rec.creditsNoteLineHeight || "inherit",
    /* 보기 모드 min-height 계산용 (단위 없는 배수) */
    "--note-lh-num": noteLh,
    "--note-align": noteAlign,
  } as CSSProperties;

  const names = (about.creditsNames ?? []);
  const setNames = (v: string[]) => setAny("creditsNames", v);
  const MAX_NAMES = 8;
  const [adding, setAdding] = useState(false);
  const [editingName, setEditingName] = useState<number | null>(null);
  /* 이름 순서 변경 — 공통 useChipReorder */
  const nameDrag = useChipReorder((from, to) => {
    const next = [...names];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setNames(next);
  });
  const noteRef = useRef<HTMLDivElement>(null);
  const [noteFocused, setNoteFocused] = useState(false);
  /* 바깥 클릭으로 닫는다. blur 로 판정하면 FontPicker 처럼 포커스를 안 가져가는
     트리거를 눌렀을 때 activeElement 가 body 가 되어 바가 즉시 닫힌다. */
  useEffect(() => {
    if (!noteFocused) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (noteRef.current?.contains(t)) return;
      if (t.closest('[class*="floatingBar"]')) return;
      /* 바 안 컨트롤이 여는 드롭다운(Select/FontPicker)은 body 로 portal 된다.
         이걸 "바깥"으로 보면 항목을 고르는 순간 편집이 닫혀 선택이 취소된다. */
      if (t.closest('[class*="Select-module"], [class*="FontPicker-module"], [class*="ColorPicker-module"]')) return;
      setNoteFocused(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [noteFocused]);

  return (
    <section className={css.block}>
      {/* 긴 문장이라 헤더 옆 inline 대신 헤더 아래 block hint 로 (AccountTab·AppearanceTab 과 동일 패턴) */}
      <p className={css.creditsNotice}>
        <Lock size={12} />
        {lang === "ko"
          ? "저작자 표시 문구와 원작자 이름은 고정입니다. 포크·재배포 시에도 유지해 주세요. 함께 만든 분의 이름과 덧붙일 문구는 추가할 수 있습니다."
          : "The attribution phrase and original author name are fixed. Please keep them when forking or redistributing — you may add contributor names and a note."}
      </p>
      <div className={css.creditsPreview}>
        {/* 폭 고정 — 이름을 추가하면 줄이 길어져 래퍼가 늘어나고 아래 textarea 까지 같이 넓어진다 */}
        <div className={css.creditsBody}>
          <p className={cf.text}>
            <span className={css.creditsLocked}>{before}</span>
            <span className={cf.heart}>❤</span>
            <span className={css.creditsLocked}>{after} </span>
            <span className={css.creditsFixed}
              title={lang === "ko"
                ? "원작자 표기 — 포크·재배포 시에도 유지해 주세요"
                : "Original author attribution — please keep it when forking or redistributing"}>
              {nickname}
              <Lock size={11} />
            </span>
            {names.map((n, i) => {
              const { dragging, dropSide, ...dragProps } = nameDrag.itemProps(i);
              if (editingName === i) {
                return (
                  <input key={i} className={css.creditsNameInput} autoFocus defaultValue={n}
                    aria-label={lang === "ko" ? "이름 수정" : "Edit name"}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      setEditingName(null);
                      setNames(v ? names.map((x, j) => (j === i ? v : x)) : names.filter((_, j) => j !== i));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setEditingName(null);
                    }} />
                );
              }
              return (
                <Chip key={i} className={css.creditsChip} showHandle
                  dragging={dragging} dropSide={dropSide}
                  dragHandlers={{ draggable: true, ...dragProps }}
                  onRemove={() => setNames(names.filter((_, x) => x !== i))}
                  onClick={(e) => { if (e.detail === 2) setEditingName(i); }}>
                  {n}
                </Chip>
              );
            })}
            {/* 이름 줄 안에서 바로 이어 붙인다 — 별도 줄로 빼면 무엇에 붙는 이름인지 흐려진다 */}
            {names.length < MAX_NAMES && (
              /* 버튼 ↔ 입력이 같은 캡슐 안에서 폭만 늘어나며 이어진다(morph).
                 서로 교체하면 튀어 보여서 껍데기는 유지하고 안쪽만 바꾼다. */
              <span className={`${css.creditsNameAdd} ${adding ? css.creditsNameAddOpen : ""}`}>
                {adding ? (
                  <input className={css.creditsNameInput} autoFocus
                    aria-label={lang === "ko" ? "추가할 이름" : "Name to add"}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      setAdding(false);
                      if (v && !names.includes(v)) setNames([...names, v]);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setAdding(false);
                    }} />
                ) : (
                  <button type="button" className={css.creditsNameAddBtn} onClick={() => setAdding(true)}
                    title={lang === "ko" ? "이름 추가" : "Add name"} aria-label={lang === "ko" ? "이름 추가" : "Add name"}>
                    <Plus size={13} />
                  </button>
                )}
              </span>
            )}
          </p>
          {/* 덧붙이는 문구 — 실제 화면에서도 표시 문구 아래에 약하게 들어간다.
              길이에 따라 프리뷰 높이가 출렁이지 않도록 최대 줄 수까지 미리 자리를 잡아둔다. */}
          {/* 공통 Textarea — maxHint 를 주면 글자수 카운터와 지우개가
              textarea 안쪽 우하단 glass chip 으로 함께 들어간다 */}
          {/* 평소엔 실제 모습 그대로, 클릭하면 그때 입력으로 바꾼다 —
              상시 textarea 면 테두리·플레이스홀더 때문에 결과를 가늠하기 어렵다 */}
          <div ref={noteRef} className={css.creditsNoteWrap} style={noteStyle} onFocusCapture={() => setNoteFocused(true)}>
          {/* 요소를 갈아끼우지 않고 같은 Textarea 를 유지한다 —
              보기/편집을 서로 다른 요소로 두면 박스 모델이 달라 높이가 튄다.
              편집이 아닐 때는 테두리·카운터를 숨겨 실제 렌더처럼 보이게만 한다. */}
          <Textarea className={`${css.creditsNote} ${noteFocused ? "" : css.creditsNoteQuiet}`}
            textareaClassName={css.creditsNoteInput}
            value={note} maxHint={CREDITS_NOTE_MAX} maxLength={CREDITS_NOTE_MAX} rows={CREDITS_NOTE_ROWS}
            onChange={(v) => setAny(noteKey, v.slice(0, CREDITS_NOTE_MAX))}
            placeholder={lang === "ko" ? "문구 추가" : "Add note"}
            aria-label={lang === "ko" ? "덧붙일 문구" : "Additional note"} />
          </div>
          {/* 타이포 컨트롤은 입력 중에만 뜨는 floating bar — 상시 노출하면 프리뷰가 어수선해진다 */}
          <FloatingBar inline open={noteFocused} getAnchorRect={() => noteRef.current?.getBoundingClientRect() ?? new DOMRect()}
            onFocusCapture={() => setNoteFocused(true)} onBlurCapture={() => setNoteFocused(false)}>
            <NumberInput className={css.barStepper} value={notePx} unit="px" width={52}
              ariaLabel={lang === "ko" ? "글자 크기" : "Font size"} min={10} max={28} step={1}
              onCommit={(n) => setAny("creditsNoteFontSize", `${n}px`)} />
            {/* floating bar 위를 덮지 않게 아래로 연다 */}
            <AboutFontPicker value={rec.creditsNoteFontFamily || ""}
              onChange={(v) => setAny("creditsNoteFontFamily", v)}
              fallbackLabel={t("admin.settings.aboutHeroDefault")} dropAlign="below" />
            <NumberInput className={css.barStepper} value={noteLh} width={56} step={0.1}
              min={1} max={2.4} label={lang === "ko" ? "줄" : "LH"}
              ariaLabel={lang === "ko" ? "줄 간격" : "Line height"}
              onCommit={(n) => setAny("creditsNoteLineHeight", String(Math.round(n * 10) / 10))} />
            {/* 타이포 컨트롤과 정렬은 성격이 달라 구분선으로 끊는다 */}
            <span className={css.barDivider} aria-hidden />
            {(["left", "center", "right"] as const).map((a) => (
              <Button key={a} variant={noteAlign === a ? "primary" : "subtle"} shape="circle" size="sm"
                onClick={() => setAny("creditsNoteAlign", a)}
                aria-label={a === "left" ? (lang === "ko" ? "왼쪽 정렬" : "Align left")
                  : a === "center" ? (lang === "ko" ? "가운데 정렬" : "Align center")
                    : (lang === "ko" ? "오른쪽 정렬" : "Align right")}
                aria-pressed={noteAlign === a}>
                <AlignIcon align={a} />
              </Button>
            ))}
          </FloatingBar>
        </div>
      </div>


    </section>
  );
}

/* ═══════════ Break image ═══════════ */
function BreakBlock({ url, onSet, t }: { url: string; onSet: (u: string) => void; t: TFunction }) {
  const [pick, setPick] = useState(false);
  return (
    <section className={css.block}>
      <div className={css.rcardMedia} style={{ maxWidth: 480 }}>
        {url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={url} alt="" /> : null}
      </div>
      <div className="tw:flex tw:gap-xs">
        <Button variant="outline" size="sm" onClick={() => setPick((v) => !v)}>{pick ? t("admin.posts.seriesModal.closePicker") : t("admin.posts.seriesModal.chooseCover")}</Button>
        {url && <Button variant="outline" size="sm" onClick={() => onSet("")}>{t("admin.settings.aboutHeroBgClear")}</Button>}
      </div>
      {pick && (
        <CoverImagePicker onSelect={(u) => { onSet(u); setPick(false); }} onClose={() => setPick(false)} currentUrl={url}
          postContext={{ title: "About page visual break", tags: ["abstract", "minimal"], excerpt: "" }} />
      )}
    </section>
  );
}

/* ═══════════ Architecture (비주얼 트리) ═══════════ */
function ArchitectureBlock({ value, onChange, diagram, onDiagramChange, t, lang }: {
  value: ArchitectureItem[]; onChange: (v: ArchitectureItem[]) => void;
  diagram: ArchDiagramData; onDiagramChange: (v: ArchDiagramData) => void; t: TFunction; lang: Language;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapse = (fp: string) => setCollapsed((s) => { const n = new Set(s); if (n.has(fp)) n.delete(fp); else n.add(fp); return n; });
  const [archTab, setArchTab] = useState<"tree" | "diagram">("tree");
  const empty = (indent: number): ArchitectureItem => ({ path: "", description_ko: "", description_en: "", indent });
  const end = (arr: ArchitectureItem[], i: number) => { let j = i + 1; while (j < arr.length && arr[j].indent > arr[i].indent) j++; return j; };
  const setItem = (i: number, p: Partial<ArchitectureItem>) => onChange(value.map((it, x) => (x === i ? { ...it, ...p } : it)));
  const addChild = (i: number) => { const n = [...value]; n.splice(i + 1, 0, empty(Math.min(2, value[i].indent + 1))); onChange(n); setSel(i + 1); };
  const addSibling = (i: number) => { const at = end(value, i); const n = [...value]; n.splice(at, 0, empty(value[i].indent)); onChange(n); setSel(at); };
  const addRoot = () => { onChange([...value, empty(0)]); setSel(value.length); };
  const remove = (i: number) => { const n = [...value]; n.splice(i, end(value, i) - i); onChange(n); setSel(null); };
  /* 아무 입력 없이 이탈한 새 노드는 자동 삭제 — 빈 항목이 남지 않게 */
  const isEmptyItem = (it: ArchitectureItem) => !it.path.trim() && !it.description_ko.trim() && !it.description_en.trim();
  const selectNode = (next: number | null) => {
    if (sel != null && sel !== next && value[sel] && isEmptyItem(value[sel])) {
      const cnt = end(value, sel) - sel;
      const n = [...value]; n.splice(sel, cnt); onChange(n);
      setSel(next == null ? null : next > sel ? next - cnt : next);
      return;
    }
    setSel(next);
  };
  const shift = (i: number, d: -1 | 1) => {
    if (d === -1 && value[i].indent === 0) return;
    if (d === 1 && value[i].indent >= 2) return;
    const e = end(value, i);
    onChange(value.map((it, k) => (k >= i && k < e ? { ...it, indent: Math.max(0, Math.min(2, it.indent + d)) } : it)));
  };
  const move = (i: number, dir: -1 | 1) => {
    const e = end(value, i); const sub2 = value.slice(i, e);
    if (dir === -1) {
      let k = i - 1; while (k >= 0 && value[k].indent > value[i].indent) k--;
      if (k < 0 || value[k].indent !== value[i].indent) return;
      const rest = [...value]; rest.splice(i, sub2.length); rest.splice(k, 0, ...sub2); onChange(rest); setSel(k);
    } else {
      if (e >= value.length || value[e].indent !== value[i].indent) return;
      const nE = end(value, e); const nSib = value.slice(e, nE);
      onChange([...value.slice(0, i), ...nSib, ...sub2, ...value.slice(nE)]); setSel(i + nSib.length);
    }
  };
  type TNode = { item: ArchitectureItem; index: number; children: TNode[]; fullPath: string };
  const roots: TNode[] = []; const stack: TNode[] = [];
  value.forEach((item, index) => {
    while (stack.length && stack[stack.length - 1].item.indent >= item.indent) stack.pop();
    const parent = stack.length ? stack[stack.length - 1] : null;
    /* collapse 용 안정 키 — 부모 경로 누적(실제 디렉토리라 유일). 빈 경로는 index fallback. */
    const fullPath = (parent ? parent.fullPath + ">" : "") + (item.path || `#${index}`);
    const node: TNode = { item, index, children: [], fullPath };
    (parent ? parent.children : roots).push(node);
    stack.push(node);
  });
  const render = (node: TNode): ReactNode => {
    const { item, index, children, fullPath } = node; const isSel = sel === index;
    const hasChildren = children.length > 0;
    const isCollapsed = collapsed.has(fullPath);
    const isFolder = item.path.trim().endsWith("/") || hasChildren;
    const Icon = isFolder ? (hasChildren && !isCollapsed ? FolderOpen : Folder) : FileCode;
    return (
      <div key={index} className={sub.nodeWrap}>
        <div className={`${sub.node} ${isSel ? sub.nodeSel : ""}`}>
          {hasChildren
            ? <button type="button" className={sub.nodeToggle} onClick={() => toggleCollapse(fullPath)} aria-label={isCollapsed ? "펼치기" : "접기"} aria-expanded={!isCollapsed}><ChevronRight size={13} className={isCollapsed ? undefined : sub.nodeToggleOpen} /></button>
            : <span className={sub.nodeToggleSpacer} aria-hidden />}
          <button type="button" className={sub.nodeLabel} onClick={() => selectNode(isSel ? null : index)}>
            <span className={sub.nodeIcon} data-folder={isFolder} data-empty={!item.path}><Icon size={15} /></span>
            {item.path ? <span className={sub.nodePath}>{item.path}</span> : <span className={sub.nodeEmpty}>이름 없음</span>}
            {(lang === "ko" ? item.description_ko : item.description_en) && <span className={sub.nodeDesc}>{lang === "ko" ? item.description_ko : item.description_en}</span>}
            {hasChildren && isCollapsed && <span className={sub.nodeCount}>{children.length}</span>}
          </button>
          {item.indent < 2 && <Button className={sub.nodeAdd} shape="circle" size="xs" variant="ghost" icon={<Plus size={13} />} onClick={() => addChild(index)} aria-label="하위 추가" />}
        </div>
        {hasChildren && !isCollapsed && <div className={sub.children}>{children.map(render)}</div>}
      </div>
    );
  };
  /* 선택 노드 편집 패널 — 트리 옆(우측) 고정 영역에서 편집. 트리 흐름을 끊지 않음. */
  const renderEditPane = (index: number, item: ArchitectureItem): ReactNode => (
    <div className={sub.editPane}
      onBlur={(e) => {
        const rt = e.relatedTarget as Node | null;
        if (e.currentTarget.contains(rt)) return;            // 패널 내부 이동
        if (rt && treeRef.current?.contains(rt)) return;      // 트리 노드 클릭 → selectNode 가 처리
        if (isEmptyItem(item)) remove(index);                 // 입력 없이 이탈 → 빈 항목 삭제
      }}>
      <div className={sub.editPaneHead}>
        <FolderOpen size={14} className={sub.editPaneIcon} />
        <span className={sub.editPaneTitle}>{item.path || "이름 없음"}</span>
      </div>
      <Input size="sm" label="경로" required clearable={false} className={sub.pathInput} autoFocus={isEmptyItem(item)}
        value={item.path} onChange={(v) => setItem(index, { path: v })} placeholder="src/app/" />
      <Input size="sm" label={lang === "ko" ? "설명" : "Description"} clearable={false}
        value={lang === "ko" ? item.description_ko : item.description_en}
        onChange={(v) => setItem(index, lang === "ko" ? { description_ko: v } : { description_en: v })}
        placeholder={lang === "ko" ? "소스 코드 루트" : "Source code root"} />
      <div className="tw:flex tw:items-center tw:gap-sm tw:flex-wrap">
        <div className={sub.nodeMoveGroup}>
          <Button variant="subtle" size="xs" shape="circle" icon={<ChevronUp size={14} />} onClick={() => move(index, -1)} aria-label="위로" />
          <Button variant="subtle" size="xs" shape="circle" icon={<ChevronDown size={14} />} onClick={() => move(index, 1)} aria-label="아래로" />
          <Button variant="subtle" size="xs" shape="circle" icon={<ChevronLeft size={14} />} onClick={() => shift(index, -1)} disabled={item.indent === 0} aria-label="상위 레벨로" />
          <Button variant="subtle" size="xs" shape="circle" icon={<ChevronRight size={14} />} onClick={() => shift(index, 1)} disabled={item.indent >= 2} aria-label="하위 레벨로" />
        </div>
        <div className={sub.nodeAddGroup}>
          <Button variant="subtle" size="xs" icon={<Plus size={12} />} onClick={() => addChild(index)} disabled={item.indent >= 2}>하위</Button>
          <Button variant="subtle" size="xs" icon={<Plus size={12} />} onClick={() => addSibling(index)}>형제</Button>
        </div>
        <Button className={sub.nodeDeleteBtn} variant="outline" size="xs" tone="danger" icon={<Trash2 size={12} />} onClick={() => remove(index)}>삭제</Button>
      </div>
    </div>
  );
  return (
    <section className={css.block}>
      <SegmentedControl<"tree" | "diagram"> size="sm" value={archTab} onChange={setArchTab} className={css.segFit}
        items={[{ value: "tree", label: "디렉토리 트리" }, { value: "diagram", label: "다이어그램" }]} />
      {archTab === "tree" ? (
        <div className={`${sub.treeLayout} ${sel != null && value[sel] ? sub.treeLayoutOpen : ""}`}>
          <div className={sub.tree} ref={treeRef}>
            {roots.map(render)}
            <Button className={sub.addRootBtn} variant="subtle" size="sm" icon={<Plus size={14} />} onClick={addRoot}>{t("admin.settings.aboutTechStackAdd")}</Button>
          </div>
          {sel != null && value[sel] && (
            <div className={sub.treeEditor}>{renderEditPane(sel, value[sel])}</div>
          )}
        </div>
      ) : (
        <ArchDiagramEditor value={diagram} onChange={onDiagramChange} />
      )}
    </section>
  );
}
