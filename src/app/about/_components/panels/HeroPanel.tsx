"use client";

import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import KineticHeroTitle from "@/components/common/KineticHeroTitle";
import T from "@/components/ui/T";
import shared from "../AboutSection.module.css";
import local from "./HeroPanel.module.css";
const styles = { ...shared, ...local };

export default function HeroPanel() {
  const { isLoading } = useLoadingScreen();
  const cfg = useSiteConfig();
  const { language } = useLanguage();
  const a = (cfg.about ?? {}) as {
    heroLine1?: string; heroLine1_ko?: string;
    heroLine2?: string; heroLine2_ko?: string;
    heroWatermark?: string; heroWatermark_ko?: string;
    heroBackground?: string;
    heroBgColor?: string;
    heroLine1Color?: string; heroLine1FontSize?: string; heroLine1FontWeight?: string; heroLine1FontFamily?: string;
    heroLine2Color?: string; heroLine2FontSize?: string; heroLine2FontWeight?: string; heroLine2FontFamily?: string;
    heroSubtitleColor?: string; heroSubtitleFontSize?: string; heroSubtitleFontWeight?: string; heroSubtitleFontFamily?: string;
    heroWatermarkColor?: string; heroWatermarkFontSize?: string; heroWatermarkFontWeight?: string; heroWatermarkFontFamily?: string;
    heroBgGradientFrom?: string;
    heroBgGradientTo?: string;
    heroBgGradientAngle?: number;
    heroBgOpacity?: number;
    heroVideoOverlayColor?: string;
    heroVideoOverlayStrength?: number;
  };
  const line1 = (language === "ko" ? a.heroLine1_ko : a.heroLine1) || a.heroLine1 || "Behind";
  const line2 = (language === "ko" ? a.heroLine2_ko : a.heroLine2) || a.heroLine2 || "the Scenes";
  const watermark = (language === "ko" ? a.heroWatermark_ko : a.heroWatermark) || a.heroWatermark || "the build";

  /* admin override 스타일 — 빈 문자열이면 미적용. font-size 는 CSS 변수 override 로 KineticHeroTitle 까지 전파.
   * font-weight 는 직접 cascade (KineticHeroTitle 가 자체 설정 안 함).
   * heroBackground 는 media URL (이미지/동영상). 동영상 URL 이면 <video> 로 렌더, 이미지면 panel bg.
   * solid color / gradient 는 항상 panel bg 로 합성 — video opacity < 1 일 때 뒤로 비춤. */
  const mediaRaw = (a.heroBackground ?? "").trim();
  const mediaUrl = mediaRaw.match(/url\(["']?([^"')]+)["']?\)/)?.[1] ?? (mediaRaw.match(/^(\S+)/)?.[1] ?? "");
  const isVideo = !!mediaUrl && /\.(mp4|webm|mov|ogv)(\?|#|$)/i.test(mediaUrl);
  const videoUrl = isVideo ? mediaUrl : undefined;
  const imageUrl = !isVideo && mediaUrl ? mediaUrl : undefined;

  const gradient = a.heroBgGradientFrom && a.heroBgGradientTo
    ? `linear-gradient(${a.heroBgGradientAngle ?? 135}deg, ${a.heroBgGradientFrom}, ${a.heroBgGradientTo})`
    : "";
  /* panelBg = gradient OR color. media (이미지/동영상) 는 별도 element 로 렌더 (opacity 적용 위해). */
  const panelBg = gradient || a.heroBgColor || "";

  const panelStyle: React.CSSProperties = {};
  if (panelBg) panelStyle.background = panelBg;
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
    <div className={[styles.panel, styles.heroPanelBg, (videoUrl || imageUrl) && styles.heroMediaMode, !isLoading && styles.heroReady].filter(Boolean).join(" ")} style={panelStyle} suppressHydrationWarning>
      {videoUrl && (
        <video
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
      <div className={styles.heroContent}>
        <span className={`${styles.label} ${styles.animate} ${styles.heroFadeIn1}`}>
          <T k="aboutPage.title" />
        </span>
        <KineticHeroTitle
          lines={[
            { text: line1 },
            { text: line2, accent: true },
          ]}
        />
        <p className={`${styles.heroSubtitle} ${styles.animate} ${styles.heroFadeIn2}`}>
          <T k="aboutPage.description" />
        </p>
        <span className={styles.heroAccentLine} />
        <span className={styles.heroWatermark}>{watermark}</span>
      </div>
    </div>
  );
}
