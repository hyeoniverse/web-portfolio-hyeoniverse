"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import StaggerText from "@/components/effects/StaggerText/StaggerText";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { DemoMagnetic, DemoInfiniteScroll, DemoFrameGrid } from "./DemoComponents";
import shared from "../AboutSection.module.css";
import local from "./CodeHighlightsPanel.module.css";
const styles = { ...shared, ...local };

const LazyDemoScrollTorus = dynamic(() => import("./DemoScrollTorus"), {
  ssr: false,
  loading: () => <div className={styles.codeDemoInner} />,
});

/* =========================================================================
   2. DemoStaggerText — StaggerText 컴포넌트
   데스크탑: 호버 시 스트로크 시차 트리거
   모바일: 동일한 아웃라인→채우기 효과 자동 순환
   ========================================================================= */
function DemoStaggerText() {
  const isMobile = useMobileLayout();
  const text = "Hover Me";
  const chars = text.split("");
  const totalChars = chars.length;
  const delayPerChar = 0.04;
  const strokeColor = "var(--text-accent)";

  const [isOutlining, setIsOutlining] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // 모바일: 아웃라인 → 채우기 → 대기 자동 순환
  useEffect(() => {
    if (!isMobile) return;
    let timeout: ReturnType<typeof setTimeout>;
    const animDuration = totalChars * delayPerChar * 1000 + 100;

    const cycle = () => {
      // 1단계: 각 글자 아웃라인 (순방향)
      setIsExiting(false);
      setIsOutlining(true);
      timeout = setTimeout(() => {
        // 2단계: 각 글자 채우기 (역방향)
        setIsOutlining(false);
        setIsExiting(true);
        timeout = setTimeout(() => {
          // 3단계: 대기
          setIsExiting(false);
          timeout = setTimeout(cycle, 2000);
        }, animDuration);
      }, animDuration + 800);
    };

    timeout = setTimeout(cycle, 1000);
    return () => clearTimeout(timeout);
  }, [isMobile, totalChars, delayPerChar]);

  return (
    <div
      className={styles.codeDemoInner}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
        fontWeight: 600,
        color: "var(--text-accent)",
      }}
    >
      {isMobile ? (
        <span style={{ display: "inline" }}>
          {chars.map((char, i) => {
            const fwd = i * delayPerChar;
            const rev = (totalChars - 1 - i) * delayPerChar;
            const delay = isOutlining ? fwd : rev;

            const charStyle: React.CSSProperties = {
              display: "inline-block",
              transition: "color 0.01s step-end",
              transitionDelay: `${delay}s`,
            };

            if (isOutlining) {
              charStyle.color = "transparent";
              charStyle.WebkitTextStroke = `1px ${strokeColor}`;
            } else if (isExiting) {
              charStyle.WebkitTextStroke = `1px ${strokeColor}`;
            }

            return (
              <span key={i} style={charStyle}>
                {char === " " ? "\u00A0" : char}
              </span>
            );
          })}
        </span>
      ) : (
        <StaggerText
          strokeColor={strokeColor}
          strokeWidth={1}
          delayPerChar={delayPerChar}
        >
          Hover Me
        </StaggerText>
      )}
      {isMobile && (
        <span className={styles.demoHint}>Auto-playing</span>
      )}
    </div>
  );
}


/* =========================================================================
   내보내기: getCodeDemo(index)
   ========================================================================= */
const demos = [
  DemoStaggerText,
  DemoMagnetic,
  DemoInfiniteScroll,
  DemoFrameGrid,
  LazyDemoScrollTorus,
];

export function getCodeDemo(index: number): React.ReactNode {
  const Demo = demos[index];
  if (!Demo) return null;
  return <Demo />;
}
