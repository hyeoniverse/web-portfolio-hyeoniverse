"use client";

import { useCallback, useRef, useLayoutEffect } from "react";
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
import { checkMobileLayout } from "../../_hooks/mobileCheck";
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
  const isMobile = checkMobileLayout();

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
      const spacing = tabH + 32; // 탭 + 여백
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
        collapseCount = Math.max(0, slots - maxSlots);
        collapseCount = Math.min(collapseCount, count - 2);

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
      const firstCollapsedIdx = collapseCount > 0
        ? count - 1 - collapseCount
        : lastIdx;

      wraps.forEach((wrap, i) => {
        if (i === 0) return;
        if (collapseCount > 0 && i > firstCollapsedIdx) {
          wrap.style.marginTop = `${fullyOverlappedMargin}px`;
        } else {
          wrap.style.marginTop = `${uniformMargin}px`;
        }
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
     겹침 카드도 스크롤 시 날아가며 자연스럽게 드러남. */
  useLayoutEffect(() => {
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
            const progress = self.progress;
            const { firstCollapsedIdx: fci, collapseCount: cc, spacing: sp } =
              collapseRef.current;

            const animFraction = Math.min(progress / 0.95, 1);
            const step = lastIdx > 0 ? 1 / lastIdx : 1;
            const duration = step * 4;

            // 겹쳐진 카드가 날아가기 전, 아래로 펼쳐서 자연 간격 생성
            let globalSpread = 0;
            if (cc > 0) {
              const spreadStart = Math.max(0, (fci - 1) * step);
              const spreadEnd = fci * step;
              globalSpread =
                spreadEnd > spreadStart
                  ? Math.max(0, Math.min(1, (animFraction - spreadStart) / (spreadEnd - spreadStart)))
                  : animFraction >= spreadStart ? 1 : 0;
            }

            // 컨테이너 보상: 마지막 카드가 고정되어 보이도록 전체를 위로 이동
            const totalSpread = cc > 0 ? cc * sp * globalSpread : 0;
            if (pinnedEl) {
              pinnedEl.style.transform = totalSpread > 0
                ? `translateY(${-totalSpread}px)`
                : "";
            }

            for (let i = 0; i < count; i++) {
              // 겹쳐진 카드(i > fci): 아래로 이동하여 균일 간격 확보
              const spreadY = (cc > 0 && i > fci)
                ? (i - fci) * sp * globalSpread
                : 0;

              if (i < lastIdx) {
                const cardStart = i * step;
                const animProgress = Math.max(
                  0,
                  Math.min(1, (animFraction - cardStart) / duration),
                );

                if (animProgress > 0) {
                  const exitY = -(cardHeight + window.innerHeight);
                  cards[i].style.transform = `translateY(${spreadY + exitY * animProgress}px)`;
                } else if (spreadY !== 0) {
                  cards[i].style.transform = `translateY(${spreadY}px)`;
                } else {
                  cards[i].style.transform = "";
                }
              } else {
                // 마지막 카드: 개별 spread + 컨테이너 보상 = 시각적으로 고정
                cards[i].style.transform = spreadY !== 0
                  ? `translateY(${spreadY}px)`
                  : "";
              }
            }
          },
        });
      }, grid);
    };

    setup();
    window.addEventListener("resize", setup);
    return () => {
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
