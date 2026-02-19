import styles from "../AboutSection.module.css";

interface HeroPanelProps {
  t: (key: string) => string;
}

export default function HeroPanel({ t }: HeroPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.heroContent}>
        <span className={styles.label}>{t("aboutPage.title")}</span>
        <h2 className={styles.heroTitle}>
          Behind
          <br />
          <span className={styles.heroTitleAccent}>the Scenes</span>
        </h2>
        <p className={styles.heroSubtitle}>{t("aboutPage.description")}</p>
        <span className={styles.heroWatermark}>the build</span>
      </div>
    </div>
  );
}
