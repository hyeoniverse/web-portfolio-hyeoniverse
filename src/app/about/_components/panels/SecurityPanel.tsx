"use client";

import { memo } from "react";
import { Database, Shield, SquareCheck, Lock, Rows2, Route, Fingerprint, Key, Crown } from "@/components/icons";
import type { Language } from "@/providers/LanguageProvider";
import type { SecurityItem } from "@/data/about";
import { renderHighlight } from "../renderHighlight";
import { useAboutConfig } from "../AboutConfig";
import { usePanelTitle } from "../../_hooks/usePanelTitle";
import { adaptSecurity } from "@/app/about/_config/adaptAbout";
import frame from "../AboutPanel.module.css";
import shell from "../AboutSection.module.css";
import local from "./SecurityPanel.module.css";
const shared = { ...frame, ...shell };
const styles = { ...shared, ...local };


/* Inline lucide-style SVG icons — admin 스튜디오 프리뷰에서도 재사용 */
export const securityIcons: Record<string, React.ReactNode> = {
  db: <Database size="1em" />,
  shield: <Shield size="1em" />,
  check: <SquareCheck size="1em" />,
  lock: <Lock size="1em" />,
  rows: <Rows2 size="1em" />,
  route: <Route size="1em" />,
  fingerprint: <Fingerprint size="1em" />,
  key: <Key size="1em" />,
  crown: <Crown size="1em" />,
};

/* 요청 흐름 단계 — 요청이 브라우저에서 데이터까지 들어가며 거치는 곳. 아이콘으로 항목이 걸리는 단계를 정하고,
   모르는 아이콘은 API 단계에 둔다 */
const STAGES = [
  { key: "browser", label: "Browser", icons: ["shield"] },
  { key: "route", label: "Route", icons: ["route", "crown"] },
  { key: "api", label: "API", icons: ["check", "lock", "fingerprint", "key"] },
  { key: "db", label: "Database", icons: ["rows", "db"] },
];

interface SecurityPanelProps {
  language: Language;
  items: SecurityItem[];
}

function SecurityPanel({ language, items: fallbackItems }: SecurityPanelProps) {
  const about = useAboutConfig();
  const panelTitle = usePanelTitle("security");
  const cfgList = about.security;
  const items = cfgList && cfgList.length > 0 ? adaptSecurity(cfgList) : fallbackItems;
  const stages = STAGES.map((stage) => ({
    ...stage,
    items: items.filter((item) => {
      const known = STAGES.some((st) => st.icons.includes(item.icon));
      return stage.icons.includes(item.icon) || (!known && stage.key === "api");
    }),
  }));

  return (
    <div className={`${styles.panel} ${styles.securityPanel}`}>
      <h2 className={`${styles.panelTitle} ${styles.animate}`}>
        {panelTitle}
      </h2>

      {/* 데스크톱: 요청 흐름 — 단계 노드를 잇는 화살표 줄, 단계마다 그 자리에서 걸리는 보안 항목 */}
      <div className={`${styles.flow} ${styles.animate}`}>
        {stages.map((stage, i) => (
          <section key={stage.key} className={styles.flowStage} data-wide={stage.items.length > 2 || undefined}>
            <div className={styles.flowNode}>
              <span className={styles.flowStep}>{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.flowName}>{stage.label}</span>
            </div>
            <ul className={styles.flowItems}>
              {stage.items.map((item) => (
                <li key={item.title.en} className={styles.flowItem}>
                  <span className={styles.flowItemHead}>
                    <span className={styles.secIcon}>{securityIcons[item.icon]}</span>
                    {item.title[language]}
                  </span>
                  <p className={styles.flowItemDesc}>{renderHighlight(item.description[language])}</p>
                  <span className={styles.flowScope}>{item.scope[language]}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* 모바일: 항목 목록 */}
      <div className={styles.secGrid}>
        {items.map((item, index) => (
          <div key={index} className={`${styles.secItem} ${styles.animate}`}>
            <div className={styles.secHeader}>
              <span className={styles.secIcon}>{securityIcons[item.icon]}</span>
              <span className={styles.secTitle}>{item.title[language]}</span>
            </div>
            <p className={styles.secDesc}>
              {renderHighlight(item.description[language])}
            </p>
            <span className={styles.secScope}>{item.scope[language]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(SecurityPanel);
