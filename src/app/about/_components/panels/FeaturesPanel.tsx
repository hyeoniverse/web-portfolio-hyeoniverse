"use client";

import { useCallback, useRef, useLayoutEffect, useEffect, memo } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Language } from "@/providers/LanguageProvider";
import type { DesignFeature } from "@/data/about";

import DynamicFrameLayout, {
  type Frame,
  defaultFrames,
} from "@/components/common/DynamicFrame/DynamicFrameLayout";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import T from "@/components/ui/T";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { usePanelTitle } from "../../_hooks/usePanelTitle";
import shared from "../AboutSection.module.css";
import local from "./FeaturesPanel.module.css";
const styles = { ...shared, ...local };

interface FeaturesPanelProps {
  language: Language;
  features: DesignFeature[];
}

/* admin (siteConfig.about.features) 의 flat shape → DesignFeature 의 nested shape 로 변환. */
type CfgFeature = { icon: string; title: string; description_ko: string; description_en: string; tech: string; image: string };
function adaptFeatures(cfgList: CfgFeature[]): DesignFeature[] {
  return cfgList.map((f) => ({
    icon: f.icon,
    title: f.title,
    description: { ko: f.description_ko, en: f.description_en },
    tech: (f.tech || "").split(",").map((s) => s.trim()).filter(Boolean),
    image: f.image,
  }));
}

/* 기능 → 3×3 그리드, 기능별 이미지 사용 */
function buildFrames(features: DesignFeature[]): Frame[] {
  return features.map((feature, i) => ({
    ...defaultFrames[i % defaultFrames.length],
    id: i + 1,
    defaultPos: { x: (i % 3) * 4, y: Math.floor(i / 3) * 4, w: 4, h: 4 },
    image: feature.image,
    video: feature.image ? undefined : defaultFrames[i % defaultFrames.length].video,
  }));
}

function FeaturesPanel({
  language,
  features,
}: FeaturesPanelProps) {
  const cfg = useSiteConfig();
  const titleOverride = usePanelTitle("features");
  const cfgList = (cfg.about as { features?: CfgFeature[] }).features;
  const effectiveFeatures = cfgList && cfgList.length > 0 ? adaptFeatures(cfgList) : features;
  /* effectiveFeatures 를 이후 모든 사용처에서 features 대신 사용 */
  features = effectiveFeatures;
  const frames = buildFrames(features);
  const gridRef = useRef<HTMLDivElement>(null);
  const collapseRef = useRef({ firstCollapsedIdx: 0, collapseCount: 0, spacing: 0 });
  const isMobile = useMobileLayout();

  /* 모바일/태블릿: 폴더 크기·탭 너비 균일화, 음수 마진으로 겹침 배치.
     뷰포트에 안 들어가는 하단 카드만 추가로 겹침. */
  useLayoutEffect(() => {
    if (!isMobile || !gridRef.current) return;

    const grid = gridRef.current;
    const wraps = Array.from(
      grid.querySelectorAll<HTMLElement>(`.${styles.featureFolderWrap}`),
    );
    const tabs = Array.from(
      grid.querySelectorAll<HTMLElement>(`.${styles.featureFolderTab}`),
    );

    const pinnedEl = grid.querySelector(
      `.${styles.featureGridPinned}`,
    ) as HTMLElement | null;

    const measure = () => {
      // 측정을 위해 자연 크기로 초기화
      wraps.forEach((wrap) => {
        wrap.style.height = "auto";
        wrap.style.marginTop = "";
      });
      tabs.forEach((tab) => { tab.style.minWidth = ""; });
      if (pinnedEl) pinnedEl.style.paddingTop = "";

      // 가장 높은 카드, 가장 넓은 탭, 탭 요소 높이 계산
      let maxCardHeight = 0;
      let maxTabWidth = 0;
      wraps.forEach((wrap) => { maxCardHeight = Math.max(maxCardHeight, wrap.offsetHeight); });
      tabs.forEach((tab) => { maxTabWidth = Math.max(maxTabWidth, tab.offsetWidth); });
      const tabH = tabs[0] ? tabs[0].offsetHeight : 40;

      // 마지막 카드: description 영역만 가려지도록 bodyPeek 계산
      // card의 paddingTop 영역까지만 보이고 desc 텍스트는 뷰포트 아래
      const lastCardEl = wraps[wraps.length - 1]?.querySelector(
        `.${styles.featureFolderCard}`,
      ) as HTMLElement | null;
      const bodyPeek = lastCardEl
        ? parseFloat(window.getComputedStyle(lastCardEl).paddingTop)
        : (maxCardHeight - tabH) * 0.3;

      // 균일한 크기 적용
      wraps.forEach((wrap) => { wrap.style.height = `${maxCardHeight}px`; });
      tabs.forEach((tab) => { tab.style.minWidth = `${maxTabWidth}px`; });

      const count = wraps.length;
      const slots = count - 1;
      const isTabletLayout = window.innerWidth >= 768;
      const spacing = tabH + (isTabletLayout ? 48 : 32); // 탭 + 여백 (태블릿은 더 넓게)
      const vh = window.innerHeight - 120; // padding-top 120px 반영

      // 스택 전체 높이: (카드 수-1) × 탭 간격 + 마지막 카드 탭 + bodyPeek
      const stackTotal = slots * spacing + tabH + bodyPeek;
      const desiredTopPadding = (tabH + 48) * 2;

      let topPadding: number;
      let collapseCount = 0;

      if (vh >= stackTotal + desiredTopPadding) {
        topPadding = vh - stackTotal;
      } else {
        // 공간 부족 → 하단 카드들을 완전히 겹쳐서 공간 확보
        const available = vh - desiredTopPadding - tabH - bodyPeek;
        const maxSlots = Math.max(0, Math.floor(available / spacing));
        collapseCount = Math.max(0, Math.min(slots - maxSlots, count - 2));

        const collapsedTotal =
          (slots - collapseCount) * spacing + tabH + bodyPeek;
        topPadding = Math.max(0, vh - collapsedTotal);
      }

      const uniformMargin = -(maxCardHeight - spacing);
      const fullyOverlappedMargin = -maxCardHeight;
      const lastIdx = count - 1;
      const firstCollapsedIdx = lastIdx - collapseCount;

      wraps.forEach((wrap, i) => {
        if (i === 0) return;
        wrap.style.marginTop = `${i > firstCollapsedIdx ? fullyOverlappedMargin : uniformMargin}px`;
      });

      collapseRef.current = { firstCollapsedIdx, collapseCount, spacing };

      if (pinnedEl) {
        pinnedEl.style.paddingTop = `${topPadding}px`;
      }

      // 레이아웃 변경 후 ScrollTrigger 재계산 (리사이즈·HMR 대응)
      ScrollTrigger.refresh();
    };

    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      wraps.forEach((wrap) => { wrap.style.height = ""; wrap.style.marginTop = ""; });
      tabs.forEach((tab) => { tab.style.minWidth = ""; });
      if (pinnedEl) pinnedEl.style.paddingTop = "";
    };
  }, [isMobile, language]);

  /* 모바일/태블릿: 순차 카드 스크롤 애니메이션.
     카드 n만 translateY로 위로 올라감 → body가 다음 카드 위로 드러남.
     n의 description이 다 보이면(= body가 n+1 위로 완전히 분리) n+1이 올라가기 시작.
     n+1, n+2, ... 카드는 자기 차례 전까지 완전 고정.
     컨테이너(pinnedEl)는 이동하지 않음 — 개별 카드 transform만 사용. */
  useEffect(() => {
    if (!isMobile || !gridRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const grid = gridRef.current;

    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>(`.${styles.featureFolderWrap}`),
    );

    let ctx: gsap.Context | null = null;

    const setup = () => {
      cards.forEach((c) => { c.style.transform = ""; });
      if (ctx) ctx.revert();

      const { spacing, firstCollapsedIdx } = collapseRef.current;
      const isTablet = window.innerWidth >= 768;
      const scrollPerCard = isTablet ? 450 : 350;

      const count = cards.length;

      const pinnedEl = grid.querySelector(
        `.${styles.featureGridPinned}`,
      ) as HTMLElement | null;
      const padTop = pinnedEl
        ? parseFloat(window.getComputedStyle(pinnedEl).paddingTop)
        : 0;
      const cardHeight = cards[0] ? cards[0].offsetHeight : 0;

      // 카드 간 여백
      const revealGap = isTablet ? 32 : 24;

      // 카드별 reveal 거리: 다음 카드와의 겹침량 + 여백
      // - 일반 카드: cardHeight - spacing (다음 카드가 spacing 아래)
      // - collapsed 카드: cardHeight (다음 카드가 같은 위치)
      const getRevealDist = (i: number) => {
        if (i >= count - 1) return cardHeight + revealGap; // 마지막 카드
        const isNextCollapsed = i >= firstCollapsedIdx;
        return (isNextCollapsed ? cardHeight : cardHeight - spacing) + revealGap;
      };

      // 카드별 누적 스크롤 시작 지점 — reveal 거리에 비례하는 스크롤 배분
      // (일반 카드는 scrollPerCard, collapsed 카드는 더 긴 스크롤)
      const baseReveal = cardHeight - spacing + revealGap; // 일반 카드 기준
      const getScrollForCard = (i: number) => {
        const rd = getRevealDist(i);
        return scrollPerCard * (rd / baseReveal);
      };

      const cardStarts: number[] = [];
      let cumScroll = 0;
      for (let i = 0; i < count; i++) {
        cardStarts.push(cumScroll);
        if (i < count - 1) cumScroll += getScrollForCard(i);
      }

      // 카드별 속도: reveal 거리 / 해당 스크롤 구간 = 일정 (baseReveal / scrollPerCard)
      const speed = baseReveal / scrollPerCard;

      // 카드 i의 뷰포트 위치 (collapsed면 firstCollapsedIdx 위치 사용)
      const getExitY = (i: number) => {
        const pos = i <= firstCollapsedIdx
          ? padTop + i * spacing
          : padTop + firstCollapsedIdx * spacing;
        return pos + cardHeight;
      };

      // 마지막 카드까지 완전히 올라온 뒤 pin 해제
      const scrollDist = cardStarts[count - 1] + getScrollForCard(count - 1);

      ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: grid,
          start: "top top",
          end: `+=${scrollDist}`,
          pin: true,
          pinSpacing: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const scrollPx = self.progress * scrollDist;

            for (let i = 0; i < count; i++) {
              const exitY = getExitY(i);
              const elapsed = scrollPx - cardStarts[i];

              if (elapsed <= 0) {
                cards[i].style.transform = "";
              } else {
                const travel = Math.min(exitY, speed * elapsed);
                cards[i].style.transform = `translateY(${-travel}px)`;
              }
            }
          },
        });

      }, grid);

      ScrollTrigger.refresh();
    };

    // 초기 설정: 1프레임 대기 — BreakpointGuard 리마운트 후 DOM 안정화 보장
    const safeSetup = () => {
      try { setup(); } catch (e) {
        // DevTools 반응형 모드에서 cross-origin iframe 접근 시 SecurityError 무시
        if (!(e instanceof DOMException && e.name === "SecurityError")) throw e;
      }
    };
    const rafId = requestAnimationFrame(safeSetup);
    window.addEventListener("resize", safeSetup);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", safeSetup);
      cards.forEach((c) => { c.style.transform = ""; });
      if (ctx) ctx.revert();
    };
  }, [isMobile, language]);

  const renderOverlay = useCallback(
    (_frame: Frame, index: number, isHovered: boolean) => {
      const feature = features[index];
      if (!feature) return null;
      return (
        <div className={`${styles.featureDfOverlay} ${isHovered ? styles.featureDfOverlayHovered : ""}`}>
          <div className={styles.featureDfInfo}>
            <h4 className={styles.featureDfTitle}>{feature.title}</h4>
            <motion.div
              initial={false}
              animate={{
                height: isHovered ? "auto" : 0,
                opacity: isHovered ? 1 : 0,
              }}
              transition={{
                /* hover-in: width(0-0.3s) → height(0.3-0.55s) → opacity(0.55-0.75s) 순차.
                   hover-out: opacity(0-0.2s) → height(0.2-0.45s) → width 순차 (반대 방향).
                   분리된 transition 으로 텍스트가 height 변화 중에 같이 나타나서 튀는 효과 제거. */
                height: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: isHovered ? 0.3 : 0.2 },
                opacity: { duration: 0.2, ease: "easeOut", delay: isHovered ? 0.55 : 0 },
              }}
              style={{ overflow: "hidden" }}
            >
              <div className={styles.featureDfDetails}>
                <p className={styles.featureDfDesc}>
                  {feature.description[language]}
                </p>
                <p className={styles.featureDfTech}>
                  {feature.tech.join(" · ")}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      );
    },
    [features, language],
  );

  return (
    <div className={`${styles.panel} ${styles.panelWide}`}>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>
        {titleOverride ?? <T k="aboutPage.panels.keyFeatures" />}
      </h3>

      {/* 데스크톱: DynamicFrameLayout */}
      <div className={styles.featureDynamic}>
        <DynamicFrameLayout
          initialFrames={frames}
          initialGapSize={0}
          initialHoverSize={6}
          initialAutoplayMode="all"
          renderOverlay={renderOverlay}
        />
      </div>

      {/* 모바일: 겹쳐진 폴더 카드 (스크롤 애니메이션) */}
      <div
        className={styles.featureGrid}
        ref={gridRef}
        style={{ "--feature-count": features.length } as React.CSSProperties}
      >
        <div className={styles.featureGridPinned}>
          {features.map((feature, index) => (
            <div
              key={index}
              className={styles.featureFolderWrap}
              style={{ zIndex: index + 1 }}
            >
              <span className={styles.featureFolderTab}>{feature.title}</span>
              <div className={styles.featureFolderCard}>
                <p className={styles.featureFolderDesc}>
                  {feature.description[language]}
                </p>
                <p className={styles.featureFolderTech}>
                  {feature.tech.join(" · ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(FeaturesPanel);
