import { memo } from "react";
import { Database, Shield, SquareCheck, Lock, Rows2, Route, Fingerprint, Key } from "@/components/icons";
import type { Language } from "@/providers/LanguageProvider";
import type { SecurityItem } from "@/data/about";
import { renderHighlight } from "../renderHighlight";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { usePanelTitle } from "../../_hooks/usePanelTitle";
import shared from "../AboutSection.module.css";
import local from "./SecurityPanel.module.css";
const styles = { ...shared, ...local };

/* admin (siteConfig.about.security) flat shape → SecurityItem nested shape 변환 */
type CfgSecurity = { layer: string; icon: string; title_ko: string; title_en: string; description_ko: string; description_en: string; scope_ko: string; scope_en: string };
function adaptSecurity(cfgList: CfgSecurity[]): SecurityItem[] {
  return cfgList.map((s) => ({
    layer: s.layer,
    icon: s.icon,
    title: { ko: s.title_ko, en: s.title_en },
    description: { ko: s.description_ko, en: s.description_en },
    scope: { ko: s.scope_ko, en: s.scope_en },
  }));
}

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
};

interface SecurityPanelProps {
  language: Language;
  items: SecurityItem[];
}

function SecurityPanel({ language, items }: SecurityPanelProps) {
  const cfg = useSiteConfig();
  const titleOverride = usePanelTitle("security");
  const cfgList = cfg.about.security;
  if (cfgList && cfgList.length > 0) items = adaptSecurity(cfgList);
  return (
    <div className={styles.panel}>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>
        {titleOverride ?? "Security."}
      </h3>
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
