import styles from "../WebFlowSection.module.css";

interface HeroPanelProps {
  t: (key: string) => string;
}

export default function HeroPanel({ t }: HeroPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.heroContent}>
        <span className={styles.label}>{t("webflow.title")}</span>
        <h2 className={styles.heroTitle}>
          Web Flow
          <br />
          <span className={styles.heroTitleAccent}>& Implementation</span>
        </h2>
        <p className={styles.heroSubtitle}>{t("webflow.description")}</p>
        <span className={styles.heroWatermark}>Flow</span>
      </div>
    </div>
  );
}
