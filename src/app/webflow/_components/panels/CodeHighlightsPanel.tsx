"use client";

import { useState, useMemo } from "react";
import type { Language } from "@/providers/LanguageProvider";
import type { CodeExample } from "@/data/webflow";
import DynamicFrameLayout from "@/components/common/DynamicFrame/DynamicFrameLayout";
import type { Frame } from "@/components/common/DynamicFrame/DynamicFrameLayout";
import CodeHighlight from "../CodeHighlight";
import styles from "../WebFlowSection.module.css";

interface CodeHighlightsPanelProps {
  language: Language;
  codeExamples: CodeExample[];
}

export default function CodeHighlightsPanel({
  language,
  codeExamples,
}: CodeHighlightsPanelProps) {
  const [expandedMobileCode, setExpandedMobileCode] = useState<number | null>(
    null,
  );

  const codeFrames: Frame[] = useMemo(
    () =>
      codeExamples.map((_, i) => ({
        id: i + 1,
        video: "",
        defaultPos: {
          x: (i % 3) * 4,
          y: Math.floor(i / 3) * 4,
          w: 4,
          h: 4,
        },
        mediaSize: 1,
        borderThickness: 0,
        borderSize: 80,
        autoplayMode: "all" as const,
        isHovered: false,
      })),
    [codeExamples],
  );

  return (
    <div className={`${styles.panel} ${styles.panelCode}`}>
      <span className={`${styles.panelNumber} ${styles.animate}`}>06</span>
      <h3 className={`${styles.panelTitleCompact} ${styles.animate}`}>
        Code Highlights.
      </h3>
      {/* Desktop: DynamicFrame grid */}
      <div className={styles.codeGridWrap}>
        <DynamicFrameLayout
          initialFrames={codeFrames}
          initialGapSize={4}
          initialHoverSize={9}
          renderCell={({ index, isHovered }) => {
            if (index >= codeExamples.length) return null;
            const example = codeExamples[index];
            return (
              <div
                className={`${styles.codeItem} ${isHovered ? styles.codeItemActive : ""}`}
              >
                <div className={styles.codeItemHeader}>
                  <span className={styles.codeNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h4 className={styles.codeTitle}>{example.title}</h4>
                </div>
                <p className={styles.codeDesc}>
                  {example.description[language]}
                </p>
                <div
                  className={`${styles.codeReveal} ${isHovered ? styles.codeRevealVisible : ""}`}
                >
                  <CodeHighlight
                    code={example.code}
                    language={example.language}
                  />
                </div>
              </div>
            );
          }}
        />
      </div>
      {/* Mobile: list with border-bottom dividers */}
      <div className={styles.codeListMobile}>
        {codeExamples.map((example, index) => {
          const isOpen = expandedMobileCode === index;
          return (
            <div
              key={index}
              className={styles.codeItemMobile}
              onClick={() => setExpandedMobileCode(isOpen ? null : index)}
            >
              <div className={styles.codeMobileHeader}>
                <span className={styles.codeNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className={styles.codeMobilePreview}>
                  <h4 className={styles.codeTitle}>{example.title}</h4>
                  <p className={styles.codeDesc}>
                    {example.description[language]}
                  </p>
                </div>
                <span
                  className={`${styles.codeMobileToggle} ${isOpen ? styles.codeMobileToggleOpen : ""}`}
                >
                  +
                </span>
              </div>
              <div
                className={`${styles.codeMobileBody} ${isOpen ? styles.codeMobileBodyOpen : ""}`}
              >
                <CodeHighlight
                  code={example.code}
                  language={example.language}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
