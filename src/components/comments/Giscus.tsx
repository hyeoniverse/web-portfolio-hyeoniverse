"use client";

import { useEffect, useRef } from "react";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./Giscus.module.css";

const GISCUS_ORIGIN = "https://giscus.app";

/**
 * giscus 댓글 위젯 — GitHub Discussions 기반.
 * config.comments.giscus 값으로 https://giscus.app/client.js 를 컨테이너에 주입한다.
 * - data-theme: 사이트 테마(useTheme)를 따름. 테마 변경 시 iframe 에 postMessage 로 갱신(재주입 X).
 * - data-lang: useLanguage 의 ko/en. 언어 변경 시 재주입.
 * - repo/카테고리 미설정 시 위젯 대신 관리자 안내 문구.
 * giscus 는 URL(pathname) 매핑이라 페이지별 스레드가 자동 분리된다.
 */
export default function Giscus() {
  const { comments } = useSiteConfig();
  const { theme } = useTheme();
  const { language, t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  const g = comments?.giscus;
  const repo = g?.repo?.trim() ?? "";
  const repoId = g?.repoId?.trim() ?? "";
  const category = g?.category?.trim() ?? "";
  const categoryId = g?.categoryId?.trim() ?? "";
  const mapping = g?.mapping || "pathname";
  const reactionsEnabled = g?.reactionsEnabled !== false;
  const inputPosition = g?.inputPosition === "top" ? "top" : "bottom";
  // giscus.app 부가 옵션 (기본값은 기존 하드코딩 동작과 동일)
  const strict = g?.strict === true;
  const emitMetadata = g?.emitMetadata === true;
  const lazyLoading = g?.lazyLoading !== false;
  // 커스텀 테마 — giscus 프리셋 이름("light","dark","noborder_dark"…) 또는 커스텀 CSS URL. 빈 값이면 기본 light/dark.
  const themeLight = g?.themeLight?.trim() || "light";
  const themeDark = g?.themeDark?.trim() || "dark";
  const resolvedTheme = theme === "dark" ? themeDark : themeLight;

  const configured = !!(repo && repoId && category && categoryId);

  // 스크립트 주입 — giscus 설정 또는 언어 변경 시 재주입. (테마는 아래 postMessage 로 별도 처리)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !configured) return;

    // 기존 위젯 정리 후 재주입
    el.innerHTML = "";

    const script = document.createElement("script");
    script.src = `${GISCUS_ORIGIN}/client.js`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", repo);
    script.setAttribute("data-repo-id", repoId);
    script.setAttribute("data-category", category);
    script.setAttribute("data-category-id", categoryId);
    script.setAttribute("data-mapping", mapping);
    script.setAttribute("data-strict", strict ? "1" : "0");
    script.setAttribute("data-reactions-enabled", reactionsEnabled ? "1" : "0");
    script.setAttribute("data-emit-metadata", emitMetadata ? "1" : "0");
    script.setAttribute("data-input-position", inputPosition);
    script.setAttribute("data-theme", resolvedTheme);
    script.setAttribute("data-lang", language === "ko" ? "ko" : "en");
    script.setAttribute("data-loading", lazyLoading ? "lazy" : "eager");
    el.appendChild(script);

    return () => {
      el.innerHTML = "";
    };
    // theme(사이트 dark/light 전환)은 deps 제외 — 재주입 대신 postMessage 로 갱신. 단 테마 "설정값"(URL/프리셋) 변경은 재주입.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, repo, repoId, category, categoryId, mapping, reactionsEnabled, inputPosition, strict, emitMetadata, lazyLoading, language, themeLight, themeDark]);

  // 테마 변경 — 재주입 없이 giscus iframe 에 setConfig 로 반영
  useEffect(() => {
    if (!configured) return;
    const el = containerRef.current;
    const iframe = el?.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
    iframe?.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: resolvedTheme } } },
      GISCUS_ORIGIN,
    );
  }, [resolvedTheme, configured]);

  if (!configured) {
    return <p className={styles.notice}>{t("comments.giscusNotConfigured")}</p>;
  }

  return <div ref={containerRef} className={styles.giscus} />;
}
