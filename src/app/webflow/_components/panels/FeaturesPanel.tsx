"use client";

import { useCallback, useRef, useLayoutEffect, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Language } from "@/providers/LanguageProvider";
import type { DesignFeature } from "@/data/webflow";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}
import DynamicFrameLayout, {
  type Frame,
  defaultFrames,
} from "@/components/common/DynamicFrame/DynamicFrameLayout";
import { useMobileLayout } from "../../_hooks/mobileCheck";
import styles from "../WebFlowSection.module.css";

interface FeaturesPanelProps {
  language: Language;
  features: DesignFeature[];
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

export default function FeaturesPanel({
  language,
  features,
}: FeaturesPanelProps) {
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
      const vh = window.innerHeight;
      const desiredTopPadding = (tabH + 48) * 2; // 넉넉한 상단 여백

      // 스택 전체 높이: (카드 수-1) × 탭 간격 + 마지막 카드 탭 + bodyPeek
      const stackTotal = slots * spacing + tabH + bodyPeek;

      let topPadding: number;
      let collapseCount = 0;

      if (vh >= stackTotal + desiredTopPadding) {
        // 모든 카드가 여유롭게 들어감
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

      // 가시 카드: 탭만 보이는 간격 (본체는 다음 카드에 가려짐)
      // 겹침 카드: 완전 겹침 → 마지막 카드 바로 위에 숨김
      // 마지막 카드: uniformMargin으로 항상 spacing 간격 유지
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

  /* 모바일/태블릿: GSAP ScrollTrigger로 .featureGrid를 뷰포트에 고정.
     카드가 순서대로 위로 날아감 — 마지막 카드는 고정 유지.
     겹침 카드도 스크롤 시 날아가며 자연스럽게 드러남.
     useEffect + rAF: Lenis 동기화 및 DOM 안정화 후 ScrollTrigger 생성. */
  useEffect(() => {
    if (!isMobile || !gridRef.current) return;

    const grid = gridRef.current;
    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>(`.${styles.featureFolderWrap}`),
    );
    const count = cards.length;
    if (count === 0) return;

    const lastIdx = count - 1;

    const pinnedEl = grid.querySelector(
      `.${styles.featureGridPinned}`,
    ) as HTMLElement | null;

    let ctx: gsap.Context | null = null;

    const setup = () => {
      // 이전 인스턴스 정리
      cards.forEach((card) => { card.style.transform = ""; });
      if (pinnedEl) pinnedEl.style.transform = "";
      if (ctx) ctx.revert();

      const isTablet = window.innerWidth >= 768;
      const baseScroll = isTablet ? 300 : 200;
      const scrollDist = count * baseScroll;

      ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: grid,
          start: "top top",
          end: `+=${scrollDist}`,
          pin: true,
          pinSpacing: true,
          onUpdate: (self) => {
            const cardHeight = cards[0].offsetHeight;
            const animFraction = Math.min(self.progress / 0.95, 1);
            const step = lastIdx > 0 ? 1 / lastIdx : 1;

            // 순차 애니메이션: 카드 n이 완전히 사라진 후 카드 n+1이 올라감
            for (let i = 0; i < count; i++) {
              if (i < lastIdx) {
                const cardStart = i * step;
                const animProgress = Math.max(
                  0,
                  Math.min(1, (animFraction - cardStart) / step),
                );

                if (animProgress > 0) {
                  const exitY = -(cardHeight + window.innerHeight);
                  cards[i].style.transform = `translateY(${exitY * animProgress}px)`;
                } else {
                  cards[i].style.transform = "";
                }
              } else {
                cards[i].style.transform = "";
              }
            }

            if (pinnedEl) pinnedEl.style.transform = "";
          },
        });
      }, grid);
    };

    // 초기 설정: 1프레임 대기 — BreakpointGuard 리마운트 후 DOM 안정화 보장
    const rafId = requestAnimationFrame(setup);
    window.addEventListener("resize", setup);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", setup);
      cards.forEach((card) => { card.style.transform = ""; });
      if (pinnedEl) pinnedEl.style.transform = "";
      if (ctx) ctx.revert();
    };
  }, [isMobile, language]);

  const renderOverlay = useCallback(
    (_frame: Frame, index: number) => {
      const feature = features[index];
      if (!feature) return null;
      return (
        <div className={styles.featureDfOverlay}>
          <div className={styles.featureDfInfo}>
            <h4 className={styles.featureDfTitle}>{feature.title}</h4>
            <p className={styles.featureDfDesc}>
              {feature.description[language]}
            </p>
            <p className={styles.featureDfTech}>{feature.tech.join(" · ")}</p>
          </div>
        </div>
      );
    },
    [features, language],
  );

  return (
    <div className={`${styles.panel} ${styles.panelWide}`}>
      <span className={`${styles.panelNumber} ${styles.animate}`}>03</span>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>
        Key Features.
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
