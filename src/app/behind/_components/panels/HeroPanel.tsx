import styles from "../BehindSection.module.css";

interface HeroPanelProps {
  t: (key: string) => string;
}

export default function HeroPanel({ t }: HeroPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.heroContent}>
        <span className={styles.label}>{t("behind.title")}</span>
        <h2 className={styles.heroTitle}>
          Behind
          <br />
          <span className={styles.heroTitleAccent}>the Scenes</span>
        </h2>
        <p className={styles.heroSubtitle}>{t("behind.description")}</p>
        <span className={styles.heroWatermark}>the build</span>
      </div>
    </div>
  );
}
