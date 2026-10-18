"use client";

// ── 브랜드 미리보기 띠 (설정 › 외관 › 브랜드 맨 위) ──
// 지금 고치는 중인 설정(저장 전 draft)으로 네비 · 로딩 화면 · 브라우저 탭에 실제로 어떻게 보이는지 한 줄로.
// 네비 로고(Navigation)는 로딩 · 모핑 흐름까지 품은 큰 컴포넌트라 그대로 못 쓴다 — 같은 순수 부품
// (resolveBrandLogos · logoOnBg · ThemedLogoImage · FaviconBadge)과 같은 분기로 다시 그린다.
// ThemedLogoImage 의 테마 리컬러는 useSiteConfig 를 읽으므로 draft 로 감싼 Provider 안에서 그린다.
import type { ReactNode } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { SiteConfigProvider, useSiteConfig } from "@/providers/SiteConfigProvider";
import ThemedLogoImage from "@/components/common/ThemedLogoImage";
import {
  FaviconBadge,
  firstGrapheme,
  DEFAULT_FAVICON_TEXT_SHADOW,
  DEFAULT_FAVICON_BG_SHADOW,
  type FaviconRenderInput,
  type FaviconShape,
  type FaviconWeight,
} from "@/lib/favicon";
import { resolveBrandLogos, logoOnBg } from "@/lib/brandLogos";
import { contrastRatio, contrastLevel } from "@/utils/contrast";
import type { SiteConfigData } from "@/config/site.config";
import styles from "./BrandPreview.module.css";

type Variant = "light" | "dark";

const IMAGE_CLASSES = { image: styles.logoImage, invert: styles.logoImageInvert, tinted: styles.logoImageTinted };

/** 글자색 대비 — 텍스트 로고만(이미지는 픽셀을 모른다). 3:1 미만이면 경고색 */
function Contrast({ fg, bg }: { fg: string; bg: string }) {
  const { t } = useLanguage();
  const ratio = contrastRatio(fg, bg);
  if (ratio == null) return null;
  const level = contrastLevel(ratio);
  return (
    <span className={styles.contrast} data-fail={level === "fail" ? "" : undefined} title={t(`admin.settings.faviconContrast_${level}`)}>
      {ratio.toFixed(1)}:1
    </span>
  );
}

/** 묶음 이름 — 어디에 보이는지 + 어느 설정이 그리는지(아래 파트 이름과 같은 말) */
function GroupLabel({ name, source }: { name: string; source: string }) {
  return (
    <span className={styles.groupLabel}>
      {name}
      <span className={styles.groupSource}>{source}</span>
    </span>
  );
}

function Cell({ label, bg, dark, square, children, foot }: { label?: string; bg: string; dark?: boolean; square?: boolean; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className={styles.cell}>
      <div className={`${styles.stage}${square ? ` ${styles.stageSquare}` : ""}`} style={{ background: bg }} data-dark={dark ? "" : undefined}>{children}</div>
      {(label || foot) && (
        <span className={styles.cellFoot}>
          {label}
          {foot}
        </span>
      )}
    </div>
  );
}

export default function BrandPreview({ config, renderTab }: {
  config: SiteConfigData;
  /** 브라우저 탭 아이콘 + 아래 덧붙임(대비) — 파비콘 렌더는 BrandSection 이 갖고 있다(이미지 · 텍스트 모드별 계산) */
  renderTab: (variant: Variant) => { icon: ReactNode; contrast?: { fg: string; bg: string } };
}) {
  const { t } = useLanguage();
  const live = useSiteConfig();
  const brand = config.brand;
  const theme = config.theme;
  const isText = brand.logoMode === "system";
  const logos = resolveBrandLogos(brand);
  const displayName = brand.logoFullText || config.loading?.displayName || "";
  const logoText = firstGrapheme(brand.logoText) || firstGrapheme(displayName);
  const stretch = parseFloat(brand.logoFontStretch || "1") || 1;
  const pageBg = (v: Variant) => (v === "light" ? theme.lightBg : theme.darkBg);
  const textColor = (v: Variant) => (v === "light" ? brand.logoColor || theme.lightText : brand.logoColorDark || theme.darkText);
  const glitch = brand.logoGlitch ? "glith-on-hover" : "";
  const variantLabel = (v: Variant) => t(v === "light" ? "admin.settings.faviconVariantLight" : "admin.settings.faviconVariantDark");

  /* 네비 배지 — Navigation 과 같은 입력(그림자는 굽지 않는다) */
  const badgeInput: FaviconRenderInput = {
    shape: (brand.faviconShape ?? "circle") as FaviconShape,
    faviconRadius: brand.faviconRadius ?? "",
    faviconBgRatio: brand.faviconBgRatio ?? "1",
    faviconBorderWidth: brand.faviconBorderWidth ?? "0",
    faviconBorderColorLight: brand.faviconBorderColorLight ?? "",
    faviconBorderColorDark: brand.faviconBorderColorDark ?? "",
    weight: (brand.faviconWeight ?? "light") as FaviconWeight,
    logoText: brand.logoText ?? "",
    logoFont: brand.logoFont ?? "",
    logoFontStretch: brand.logoFontStretch ?? "",
    faviconBgLight: brand.faviconBgLight ?? "",
    faviconBgDark: brand.faviconBgDark ?? "",
    faviconFontSize: brand.faviconFontSize ?? "20",
    faviconColor: brand.faviconColor ?? "",
    faviconColorDark: brand.faviconColorDark ?? "",
    faviconTextShadow: { ...DEFAULT_FAVICON_TEXT_SHADOW, enabled: false },
    faviconBgShadow: { ...DEFAULT_FAVICON_BG_SHADOW, enabled: false },
    presetLight: brand.logoColor || theme.lightText,
    presetDark: brand.logoColorDark || theme.darkText,
  };
  const useBadge = isText && (brand.faviconShape ?? "circle") !== "none";

  const nav = (v: Variant) => {
    if (!isText) {
      const pick = logoOnBg(logos.short, v);
      if (pick.url) {
        return (
          <span className={glitch}>
            <ThemedLogoImage src={pick.url} bg={v} width={32} alt="" tint={pick.tint || undefined} invert={pick.invert} classNames={IMAGE_CLASSES} />
          </span>
        );
      }
    }
    if (useBadge) return <FaviconBadge input={badgeInput} variant={v} size={34} idPrefix={`brandpv-${v}`} />;
    return (
      <span className={`${styles.logoText} ${glitch}`} style={{ fontFamily: brand.logoFont || undefined, color: textColor(v), transform: `scaleX(${stretch})` }}>
        {logoText}
      </span>
    );
  };

  /* 로딩 덮개는 늘 검정 — 풀로고(없으면 숏로고) 다크 변형, 텍스트면 사이트 이름 */
  const loading = () => {
    if (!isText) {
      const full = logoOnBg(logos.full, "dark");
      const pick = full.url ? full : logoOnBg(logos.short, "dark");
      if (pick.url) {
        return <ThemedLogoImage src={pick.url} bg="dark" width={full.url ? 120 : 32} alt="" tint={pick.tint || undefined} invert={pick.invert} classNames={IMAGE_CLASSES} />;
      }
    }
    return (
      <span className={styles.loadingText} style={{ fontFamily: brand.logoFont || undefined, color: brand.logoColorDark || theme.darkText, transform: `scaleX(${stretch})` }}>
        {displayName}
      </span>
    );
  };

  return (
    <SiteConfigProvider initialConfig={{ ...live, brand, theme }} publicKeys={live.publicKeys}>
      <div className={styles.strip}>
        {/* 숏로고 — 같은 자산이 네비 마크와 브라우저 탭 아이콘이 된다(아래 숏로고 파트) */}
        <div className={styles.group}>
          <GroupLabel name={t("admin.settings.logoShortPart")} source={t("admin.settings.logoShortPartHint")} />
          <div className={styles.cells}>
            {(["light", "dark"] as const).map((v) => (
              <Cell
                key={`nav-${v}`}
                bg={pageBg(v)}
                dark={v === "dark"}
                label={`${t("admin.settings.brandPreviewNav")} · ${variantLabel(v)}`}
                foot={isText && !useBadge ? <Contrast fg={textColor(v)} bg={pageBg(v)} /> : undefined}
              >
                {nav(v)}
              </Cell>
            ))}
            {(["light", "dark"] as const).map((v) => {
              const tab = renderTab(v);
              return (
                <Cell
                  key={`tab-${v}`}
                  square
                  bg={pageBg(v)}
                  dark={v === "dark"}
                  label={`${t("admin.settings.brandPreviewTab")} · ${variantLabel(v)}`}
                  foot={tab.contrast ? <Contrast fg={tab.contrast.fg} bg={tab.contrast.bg} /> : undefined}
                >
                  {tab.icon}
                </Cell>
              );
            })}
          </div>
        </div>
        {/* 풀로고 — 로딩 화면(덮개는 늘 검정) */}
        <div className={styles.group}>
          <GroupLabel name={t("admin.settings.logoFullPart")} source={t("admin.settings.logoFullPartHint")} />
          <div className={styles.cells}>
            <Cell bg="var(--bg-black)" dark>{loading()}</Cell>
          </div>
        </div>
      </div>
    </SiteConfigProvider>
  );
}
