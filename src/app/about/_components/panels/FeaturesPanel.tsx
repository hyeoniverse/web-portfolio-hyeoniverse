"use client";

import { useCallback, useRef, memo } from "react";

import { motion } from "framer-motion";

import type { Language } from "@/providers/LanguageProvider";
import type { DesignFeature } from "@/data/about";

import DynamicFrameLayout, {
  type Frame,
  defaultFrames,
} from "@/components/common/DynamicFrame/DynamicFrameLayout";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { useAboutConfig } from "../AboutConfig";
import { useFeatureFolderScroll } from "./features/useFeatureFolderScroll";
import { usePanelTitle } from "../../_hooks/usePanelTitle";
import { adaptFeatures } from "@/app/about/_config/adaptAbout";
import frame from "../AboutPanel.module.css";
import shell from "../AboutSection.module.css";
import local from "./FeaturesPanel.module.css";
const shared = { ...frame, ...shell };
const styles = { ...shared, ...local };

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

function FeaturesPanel({
  language,
  features: fallbackFeatures,
}: FeaturesPanelProps) {
  const about = useAboutConfig();
  const panelTitle = usePanelTitle("features");
  const cfgList = about.features;
  /* 사이트 설정에 목록이 있으면 그걸 쓰고, 없으면 props 로 받은 기본값을 쓴다.
     전에는 props 를 그대로 덮어썼는데, props 는 부모가 준 값이라 고칠 것이 아니다.
     받는 이름을 fallbackFeatures 로 바꾸고 아래에서 쓰는 features 는 지역 변수로 둔다. */
  const features = cfgList && cfgList.length > 0 ? adaptFeatures(cfgList) : fallbackFeatures;
  const frames = buildFrames(features);
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileLayout();
  useFeatureFolderScroll({ isMobile, language, gridRef });

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
      <h2 className={`${styles.panelTitle} ${styles.animate}`}>
        {panelTitle}
      </h2>

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
