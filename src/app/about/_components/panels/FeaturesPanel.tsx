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
import { useSiteConfig } from "@/providers/SiteConfigProvider";
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
  features,
}: FeaturesPanelProps) {
  const cfg = useSiteConfig();
  const panelTitle = usePanelTitle("features");
  const cfgList = cfg.about.features;
  const effectiveFeatures = cfgList && cfgList.length > 0 ? adaptFeatures(cfgList) : features;
  /* effectiveFeatures 를 이후 모든 사용처에서 features 대신 사용 */
  features = effectiveFeatures;
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
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>
        {panelTitle}
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
