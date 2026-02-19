import KineticHeroTitle from "@/components/common/KineticHeroTitle";
import styles from "../AboutSection.module.css";

interface HeroPanelProps {
  t: (key: string) => string;
}

export default function HeroPanel({ t }: HeroPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.heroContent}>
        <span className={`${styles.label} ${styles.animate}`}>
          {t("aboutPage.title")}
        </span>
        <KineticHeroTitle
          lines={[
            { text: "Behind" },
            { text: "the Scenes", accent: true },
          ]}
        />
        <p className={`${styles.heroSubtitle} ${styles.animate}`}>
          {t("aboutPage.description")}
        </p>
        <span className={styles.heroWatermark}>the build</span>
      </div>
    </div>
  );
}
