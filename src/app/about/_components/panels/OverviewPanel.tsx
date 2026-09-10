import type { Language } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { usePanelTitle } from "../../_hooks/usePanelTitle";
import frame from "../AboutPanel.module.css";
import shell from "../AboutSection.module.css";
import local from "./OverviewPanel.module.css";
const shared = { ...frame, ...shell };
const styles = { ...shared, ...local };

interface OverviewPanelProps {
  language: Language;
  /** 폴백 — content/about/overview.md 에서 생성된 값. admin 편집본이 없을 때 쓴다. */
  overview: CfgOverview | null;
}

/* admin(siteConfig.about.overview_*)과 폴백이 같은 평평한 모양이라 한 타입으로 받는다. */
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
  /* admin 이 설명을 한 줄이라도 적었으면 admin 편집본이 이긴다. 나머지 항목은 비어 있으면
     폴백으로 되돌아간다 — 설명만 고치고 칩·수치는 그대로 두는 경우가 있다. */
  const edited = !!(a.overview_description_ko || a.overview_description_en);
  const src = edited ? a : (overview ?? {});
  const back = overview ?? {};
  const stats = (src.overview_stats ?? []).length > 0 ? src.overview_stats! : (back.overview_stats ?? []);
  const highlightsRaw = src.overview_highlights || back.overview_highlights || "";
  const view = {
    description: {
      ko: src.overview_description_ko ?? back.overview_description_ko ?? "",
      en: src.overview_description_en ?? back.overview_description_en ?? "",
    } as Record<Language, string>,
    highlights: highlightsRaw.split(",").map((x) => x.trim()).filter(Boolean),
    stats: stats.map((x) => ({ value: x.value, label: { ko: x.label_ko, en: x.label_en } as Record<Language, string> })),
  };
  return (
    <div className={styles.panel}>
      <h2 className={`${styles.panelTitle} ${styles.animate}`}>{panelTitle}</h2>
      <div className={styles.overviewLayout}>
        <div className={styles.overviewTop}>
          <p className={`${styles.overviewDesc} ${styles.animate}`}>
            {view.description[language]}
          </p>
          <div className={`${styles.overviewHighlights} ${styles.animate}`}>
            {view.highlights.map((tag) => (
              <span key={tag} className={styles.overviewTag}>{tag}</span>
            ))}
          </div>
        </div>
        <div className={`${styles.overviewStats} ${styles.animate}`}>
          {view.stats.map((stat, i) => (
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
