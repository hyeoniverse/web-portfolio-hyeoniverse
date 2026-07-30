"use client";

import { memo } from "react";
import type { Language } from "@/providers/LanguageProvider";
import { erdTables as staticErdTables, erdRelations as staticErdRelations, erdDesignNotes } from "@/data/about/erd";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { useNearViewport } from "../../_hooks/useNearViewport";
/* 다이어그램·선택 상태·연관 계산·설계 노트는 전부 공유 컴포넌트가 맡는다.
   예전에는 이 파일이 그 전부를 따로 들고 있어서 admin 쪽과 동작이 갈렸다
   (노트가 여기선 하나만 떴고, 클릭 결과도 서로 달랐다). */
import ErdExplorer from "@/components/about/ErdExplorer";
import PinnedTitleRow from "../PinnedTitleRow";
import shared from "../AboutSection.module.css";
import local from "./ErdPanel.module.css";
const styles = { ...shared, ...local };

interface ErdPanelProps {
  language: Language;
  scrollBy?: (deltaX: number) => void;
}

const ERD_HINT = {
  pointer: {
    ko: "휠로 확대 · 드래그로 이동 · 테이블 클릭",
    en: "scroll to zoom · drag to pan · click table to inspect",
  },
  touch: {
    ko: "손가락으로 확대 · 테이블 탭",
    en: "pinch to zoom · tap a table",
  },
} as const;

function ErdPanel({ language }: ErdPanelProps) {
  /* admin(about.erdTables/erdRelations) override — 비어있으면 정적 데이터 */
  const cfg = useSiteConfig();
  const cfgTables = cfg.about.erdTables;
  const cfgRelations = cfg.about.erdRelations;
  const erdTables = cfgTables && cfgTables.length > 0 ? cfgTables : staticErdTables;
  const erdRelations = cfgRelations && cfgRelations.length > 0 ? cfgRelations : staticErdRelations;

  const isMobile = useMobileLayout();
  /* 이 패널은 무한 스크롤 때문에 3 벌 렌더된다 — 보이는 것만 실제로 켠다.
     크기는 CSS 로 잡혀 있어 켜지기 전에도 레이아웃이 흔들리지 않는다. */
  const { ref: boxRef, near } = useNearViewport<HTMLDivElement>();

  return (
    <div className={styles.panel}>
      <div className={styles.erdViewport}>
        <PinnedTitleRow panelKey="erd" className={isMobile ? styles.erdTitleRow : undefined} title="Database Design." />

        <div className={styles.erdZoomViewport} ref={boxRef}>
          {/* 조작 안내는 입력 방식마다 다르다 — 터치에는 scroll/drag 가 아니라
              pinch/tap 이고, 좁은 폭에서 긴 문구는 3줄로 접히며 끝이 잘린다. */}
          <div className={styles.erdHint}>
            <span>{ERD_HINT[isMobile ? "touch" : "pointer"][language === "ko" ? "ko" : "en"]}</span>
          </div>
          {near && (
            <ErdExplorer
              tables={erdTables}
              relations={erdRelations}
              notes={erdDesignNotes}
              lang={language === "ko" ? "ko" : "en"}
              initialZoom={0.5}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ErdPanel);
