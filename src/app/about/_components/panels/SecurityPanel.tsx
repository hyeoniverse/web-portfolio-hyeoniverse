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

interface SecurityPanelProps {
  language: Language;
  items: SecurityItem[];
}

function SecurityPanel({ language, items }: SecurityPanelProps) {
  const about = useAboutConfig();
  const panelTitle = usePanelTitle("security");
  const cfgList = about.security;
  if (cfgList && cfgList.length > 0) items = adaptSecurity(cfgList);
  return (
    <div className={styles.panel}>
      <h2 className={`${styles.panelTitle} ${styles.animate}`}>
        {panelTitle}
      </h2>
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
