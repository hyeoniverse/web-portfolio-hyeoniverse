import { memo } from "react";
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
  db: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  rows: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18" />
    </svg>
  ),
  route: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </svg>
  ),
  fingerprint: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
      <path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M2 16h.01" />
      <path d="M21.8 16c.2-2 .131-5.354 0-6" />
      <path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" />
    </svg>
  ),
  key: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.3 9.3" />
      <path d="M18.5 5.5 20 7l-2 2" />
    </svg>
  ),
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
