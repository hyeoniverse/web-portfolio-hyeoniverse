import type { Language } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { usePanelTitle } from "../../_hooks/usePanelTitle";
import shared from "../AboutSection.module.css";
import local from "./OverviewPanel.module.css";
const styles = { ...shared, ...local };

interface OverviewPanelProps {
  language: Language;
  overview: {
    description: Record<Language, string>;
    highlights: string[];
    stats: { value: string; label: Record<Language, string> }[];
  };
}

/* admin (siteConfig.about.overview_*) flat shape → OverviewPanel nested shape.
 * 하나라도 값이 있으면 admin 편집본 사용. */
type CfgOverview = {
  overview_description_ko?: string;
  overview_description_en?: string;
  overview_highlights?: string;
  overview_stats?: Array<{ value: string; label_ko: string; label_en: string }>;
};

export default function OverviewPanel({ language, overview }: OverviewPanelProps) {
  const cfg = useSiteConfig();
  const panelTitle = usePanelTitle("overview");
  const a = (cfg.about as CfgOverview);
  const desc_ko = a.overview_description_ko;
  const desc_en = a.overview_description_en;
  if (desc_ko || desc_en) {
    overview = {
      description: { ko: desc_ko ?? overview.description.ko, en: desc_en ?? overview.description.en },
      highlights: a.overview_highlights ? a.overview_highlights.split(",").map((s) => s.trim()).filter(Boolean) : overview.highlights,
      stats: (a.overview_stats ?? []).length > 0
        ? a.overview_stats!.map((s) => ({ value: s.value, label: { ko: s.label_ko, en: s.label_en } }))
        : overview.stats,
    };
  }
  return (
    <div className={styles.panel}>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>{panelTitle}</h3>
      <div className={styles.overviewLayout}>
        <div className={styles.overviewTop}>
          <p className={`${styles.overviewDesc} ${styles.animate}`}>
            {overview.description[language]}
          </p>
          <div className={`${styles.overviewHighlights} ${styles.animate}`}>
            {overview.highlights.map((tag) => (
              <span key={tag} className={styles.overviewTag}>{tag}</span>
            ))}
          </div>
        </div>
        <div className={`${styles.overviewStats} ${styles.animate}`}>
          {overview.stats.map((stat, i) => (
            <div key={i} className={styles.overviewStat}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label[language]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
