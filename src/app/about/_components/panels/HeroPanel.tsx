"use client";

import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { useAboutConfig } from "../AboutConfig";
import { useLanguage } from "@/providers/LanguageProvider";
import KineticHeroTitle from "@/components/common/KineticHeroTitle";
import { ABOUT_CHAPTERS } from "@/data/about/chapters";
import Pressable from "@/components/ui/Pressable";
import HeroDecor from "./HeroDecor";
import T from "@/components/ui/T";
import LoopVideo from "@/components/ui/LoopVideo";
import frame from "../AboutPanel.module.css";
import shell from "../AboutSection.module.css";
import local from "./HeroPanel.module.css";
const shared = { ...frame, ...shell };
const styles = { ...shared, ...local };


/* 패널 배경(색/그라디언트) — 라이트/다크를 따로 고른다. 두 테마 값을 light-dark() 로 묶어 한 값으로 내려준다
   (docs/design-system.md 2-5-4 — CSS 가 테마로 갈라 쓰지 않는다). 한 테마만 정했으면 다른 테마는 패널 기본
   바탕(--bg-primary)이다. 단색은 같은 색 두 점짜리 그라디언트로 바꿔 두 테마의 모양을 맞춘다. */
type HeroBgFields = {
  heroBgColor?: string; heroBgColor_dark?: string;
  heroBgGradientFrom?: string; heroBgGradientTo?: string;
  heroBgGradientFrom_dark?: string; heroBgGradientTo_dark?: string;
  heroBgGradientAngle?: number;
};
function panelBackground(a: HeroBgFields): string {
  const stops = (from?: string, to?: string, solid?: string): [string, string] | null =>
    from && to ? [from, to] : solid ? [solid, solid] : null;
  const light = stops(a.heroBgGradientFrom, a.heroBgGradientTo, a.heroBgColor);
  const dark = stops(a.heroBgGradientFrom_dark, a.heroBgGradientTo_dark, a.heroBgColor_dark);
  if (!light && !dark) return "";
  const base: [string, string] = ["var(--bg-primary)", "var(--bg-primary)"];
  const [l, d] = [light ?? base, dark ?? base];
  return `linear-gradient(${a.heroBgGradientAngle ?? 135}deg, light-dark(${l[0]}, ${d[0]}), light-dark(${l[1]}, ${d[1]}))`;
}

export default function HeroPanel({ goToPanel }: { goToPanel?: (key: string) => void }) {
  const { isLoading } = useLoadingScreen();
  const about = useAboutConfig();
  const { language } = useLanguage();
  const a = (about ?? {}) as {
    heroLabel?: string; heroLabel_ko?: string;
    heroSubtitle?: string; heroSubtitle_ko?: string;
    heroLine1?: string; heroLine1_ko?: string;
    heroLine2?: string; heroLine2_ko?: string;
    heroWatermark?: string; heroWatermark_ko?: string;
    heroBackground?: string;
    heroBgColor?: string;
    heroBgColor_dark?: string;
    heroLine1Color?: string; heroLine1FontSize?: string; heroLine1FontWeight?: string; heroLine1FontFamily?: string;
    heroLine2Color?: string; heroLine2FontSize?: string; heroLine2FontWeight?: string; heroLine2FontFamily?: string;
    heroSubtitleColor?: string; heroSubtitleFontSize?: string; heroSubtitleFontWeight?: string; heroSubtitleFontFamily?: string;
    heroAccentColor?: string;
    heroWatermarkColor?: string; heroWatermarkFontSize?: string; heroWatermarkFontWeight?: string; heroWatermarkFontFamily?: string;
    heroBgGradientFrom?: string;
    heroBgGradientTo?: string;
    heroBgGradientFrom_dark?: string;
    heroBgGradientTo_dark?: string;
    heroBgGradientAngle?: number;
    heroBgOpacity?: number;
    heroVideoOverlayColor?: string;
    heroVideoOverlayStrength?: number;
    heroAlignH?: "left" | "center" | "right";
    heroAlignV?: "top" | "center" | "bottom";
    heroHidden?: string[];
  };
  const heroHidden = new Set(a.heroHidden ?? []);
  const alignH = a.heroAlignH ?? "left";
  const alignV = a.heroAlignV ?? "center";
  /* 정렬이 기본값(왼쪽·가운데)이면 데스크톱에서 전시회 입구 포스터 구도를 쓴다. 관리자가 정렬을 바꾸면 그 설정을 따른다 */
  const poster = alignH === "left" && alignV === "center";
  const contentStyle: React.CSSProperties = poster ? {} : {
    alignItems: alignH === "center" ? "center" : alignH === "right" ? "flex-end" : "flex-start",
    justifyContent: alignV === "top" ? "flex-start" : alignV === "bottom" ? "flex-end" : "center",
    textAlign: alignH,
  };
  const labelOverride = (language === "ko" ? a.heroLabel_ko : a.heroLabel) || a.heroLabel || "";
  const subtitleOverride = (language === "ko" ? a.heroSubtitle_ko : a.heroSubtitle) || a.heroSubtitle || "";
  const line1 = (language === "ko" ? a.heroLine1_ko : a.heroLine1) || a.heroLine1 || "Behind";
  const line2 = (language === "ko" ? a.heroLine2_ko : a.heroLine2) || a.heroLine2 || "the Scenes";
  const watermark = (language === "ko" ? a.heroWatermark_ko : a.heroWatermark) || a.heroWatermark || "the build";
  const titleLines = [
    ...(heroHidden.has("line1") ? [] : [{ text: line1 }]),
    ...(heroHidden.has("line2") ? [] : [{ text: line2, accent: true }]),
  ];

  /* admin override 스타일 — 빈 문자열이면 미적용. font-size 는 CSS 변수 override 로 KineticHeroTitle 까지 전파.
   * font-weight 는 직접 cascade (KineticHeroTitle 가 자체 설정 안 함).
   * heroBackground 는 media URL (이미지/동영상). 동영상 URL 이면 <video> 로 렌더, 이미지면 panel bg.
   * solid color / gradient 는 항상 panel bg 로 합성 — video opacity < 1 일 때 뒤로 비춤. */
  const mediaRaw = (a.heroBackground ?? "").trim();
  const mediaUrl = mediaRaw.match(/url\(["']?([^"')]+)["']?\)/)?.[1] ?? (mediaRaw.match(/^(\S+)/)?.[1] ?? "");
  const isVideo = !!mediaUrl && /\.(mp4|webm|mov|ogv)(\?|#|$)/i.test(mediaUrl);
  const videoUrl = isVideo ? mediaUrl : undefined;
  const imageUrl = !isVideo && mediaUrl ? mediaUrl : undefined;

  const panelStyle: React.CSSProperties = {};
  const heroBg = panelBackground(a);
  if (heroBg) (panelStyle as Record<string, string>)["--_hero-bg"] = heroBg;
  /* 각 요소 (line1 / line2 / subtitle / watermark) 별 CSS 변수 — 비어있으면 미적용 (기본 typography 사용). */
  const setVar = (key: string, v: string | undefined) => { if (v) (panelStyle as Record<string, string>)[key] = v; };
  setVar("--_hero-line1-color", a.heroLine1Color);
  setVar("--_hero-line1-font-size", a.heroLine1FontSize);
  setVar("--_hero-line1-font-weight", a.heroLine1FontWeight);
  setVar("--_hero-line1-font-family", a.heroLine1FontFamily);
  setVar("--_hero-line2-color", a.heroLine2Color);
  setVar("--_hero-line2-font-size", a.heroLine2FontSize);
  setVar("--_hero-line2-font-weight", a.heroLine2FontWeight);
  setVar("--_hero-line2-font-family", a.heroLine2FontFamily);
  setVar("--_hero-subtitle-color", a.heroSubtitleColor);
  setVar("--_hero-subtitle-font-size", a.heroSubtitleFontSize);
  setVar("--_hero-subtitle-font-weight", a.heroSubtitleFontWeight);
  setVar("--_hero-subtitle-font-family", a.heroSubtitleFontFamily);
  setVar("--_hero-accent-color", a.heroAccentColor);
  setVar("--_hero-watermark-color", a.heroWatermarkColor);
  setVar("--_hero-watermark-font-size", a.heroWatermarkFontSize);
  setVar("--_hero-watermark-font-weight", a.heroWatermarkFontWeight);
  setVar("--_hero-watermark-font-family", a.heroWatermarkFontFamily);
  if ((videoUrl || imageUrl) && typeof a.heroBgOpacity === "number") {
    (panelStyle as Record<string, string>)["--_hero-bg-opacity"] = String(a.heroBgOpacity);
  }
  if (videoUrl) {
    /* overlay color/strength — 빈 값이면 fallback 으로 accent. strength 0 이면 사실상 미적용 */
    if (a.heroVideoOverlayColor) {
      (panelStyle as Record<string, string>)["--_hero-overlay-color"] = a.heroVideoOverlayColor;
    }
    if (typeof a.heroVideoOverlayStrength === "number") {
      (panelStyle as Record<string, string>)["--_hero-overlay-strength"] = String(a.heroVideoOverlayStrength);
    }
  }

  return (
    <div className={[styles.panel, styles.heroPanelBg, heroBg && styles.heroBgCustom, (videoUrl || imageUrl) && styles.heroMediaMode, !isLoading && styles.heroReady].filter(Boolean).join(" ")} style={panelStyle} suppressHydrationWarning>
      {videoUrl && (
        <LoopVideo
          className={styles.heroBgMedia}
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        />
      )}
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.heroBgMedia}
          src={imageUrl}
          alt=""
          aria-hidden
        />
      )}
      {(videoUrl || imageUrl) && <div className={styles.heroBgOverlay} aria-hidden />}
      {poster && <HeroDecor />}
      <div className={`${styles.heroContent} ${poster ? styles.heroPoster : ""}`} style={contentStyle}>
        {!heroHidden.has("label") && (
          <span className={`${styles.label} ${styles.animate} ${styles.heroFadeIn1}`}>
            {labelOverride || <T k="aboutPage.title" />}
          </span>
        )}
        {titleLines.length > 0 && <KineticHeroTitle as="h1" lines={titleLines} />}
        {!heroHidden.has("subtitle") && (
          <p className={`${styles.heroSubtitle} ${styles.animate} ${styles.heroFadeIn2}`}>
            {subtitleOverride || <T k="aboutPage.description" />}
          </p>
        )}
        <span className={styles.heroAccentLine} />
        {/* 챕터 목차 — 눌러서 그 챕터의 첫 패널로. 포스터 구도에서만 보인다 */}
        {poster && (
          <nav className={`${styles.heroToc} ${styles.animate} ${styles.heroFadeIn2}`} aria-label={language === "ko" ? "챕터" : "Chapters"}>
            {ABOUT_CHAPTERS.map((chapter, i) => (
              <Pressable
                key={chapter.key}
                data-clickable="true"
                className={styles.heroTocItem}
                onClick={() => goToPanel?.(chapter.panels[0])}
              >
                <span className={styles.heroTocNum}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.heroTocTitle}>{chapter.title}</span>
                <span className={styles.heroTocSummary}>{chapter.summary[language]}</span>
              </Pressable>
            ))}
          </nav>
        )}
        {!heroHidden.has("watermark") && <span className={styles.heroWatermark}>{watermark}</span>}
      </div>
    </div>
  );
}
