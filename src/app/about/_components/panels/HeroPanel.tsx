import KineticHeroTitle from "@/components/common/KineticHeroTitle";
import styles from "../AboutSection.module.css";

interface HeroPanelProps {
  t: (key: string) => string;
}

export default function HeroPanel({ t }: HeroPanelProps) {
  return (
    <div className={`${styles.panel} ${styles.heroPanelBg}`}>
      <div className={styles.heroContent}>
        <span className={`${styles.label} ${styles.animate} ${styles.heroFadeIn1}`}>
          {t("aboutPage.title")}
        </span>
        <KineticHeroTitle
          lines={[
            { text: "Behind" },
            { text: "the Scenes", accent: true },
          ]}
        />
        <p className={`${styles.heroSubtitle} ${styles.animate} ${styles.heroFadeIn2}`}>
          {t("aboutPage.description")}
        </p>
        <span className={styles.heroAccentLine} />
        <span className={styles.heroWatermark}>the build</span>
      </div>
    </div>
  );
}
