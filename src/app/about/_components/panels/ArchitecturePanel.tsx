"use client";

import { useMemo, memo } from "react";

import type { Language } from "@/providers/LanguageProvider";
import { projectStructure } from "@/data/about/architecture";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { usePanelTitle } from "../../_hooks/usePanelTitle";
import type { StructureItem } from "@/data/about/types";

import ArchitectureMap from "./architecture/ArchitectureMap";
import frame from "../AboutPanel.module.css";
import shell from "../AboutSection.module.css";
import local from "./ArchitecturePanel.module.css";

const shared = { ...frame, ...shell };
const styles = { ...shared, ...local };


interface ArchitecturePanelProps {
  language: Language;
}

function ArchitecturePanel({ language }: ArchitecturePanelProps) {
  /* admin 에서 architectureItems 수정 가능 — 비어있으면 정적 fallback 사용 */
  const cfg = useSiteConfig();
  const panelTitle = usePanelTitle("architecture");
  const cfgItems = cfg.about.architectureItems;
  const structure: StructureItem[] = useMemo(() => {
    if (!cfgItems || cfgItems.length === 0) return projectStructure;
    return cfgItems.map((it) => ({
      path: it.path,
      description: { ko: it.description_ko, en: it.description_en },
      indent: it.indent,
    }));
  }, [cfgItems]);
  return (
    <div className={`${styles.panel} ${styles.panelFlush}`}>
      <div className={styles.titleRowCompact}>
        <h2 className={`${styles.panelTitle} ${styles.archTitle} ${styles.animate}`}>{panelTitle}</h2>
      </div>

      <ArchitectureMap structure={structure} language={language} />

      {/* ── 모바일: 텍스트 그리드 ── */}
      <div className={styles.archGrid}>
        {structure.map((item, i) => (
          <div
            key={i}
            className={`${styles.archItem} ${styles.animate} ${
              item.indent === 1
                ? styles.archIndent1
                : item.indent === 2
                  ? styles.archIndent2
                  : ""
            }`}
          >
            <span className={styles.archPath}>{item.path}</span>
            <span className={styles.archDesc}>
              {item.description[language]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(ArchitecturePanel);
