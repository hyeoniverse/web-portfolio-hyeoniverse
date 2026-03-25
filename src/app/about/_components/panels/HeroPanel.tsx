import KineticHeroTitle from "@/components/common/KineticHeroTitle";
import T from "@/components/ui/T";
import shared from "../AboutSection.module.css";
import local from "./HeroPanel.module.css";
const styles = { ...shared, ...local };

export default function HeroPanel() {
  return (
    <div className={`${styles.panel} ${styles.heroPanelBg}`}>
      <div className={styles.heroContent}>
        <span className={`${styles.heroLabel} ${styles.animate} ${styles.heroFadeIn1}`}>
          <T k="aboutPage.title" />
        </span>
        <KineticHeroTitle
          lines={[
            { text: "Behind" },
            { text: "the Scenes", accent: true },
          ]}
        />
        <p className={`${styles.heroSubtitle} ${styles.animate} ${styles.heroFadeIn2}`}>
          <T k="aboutPage.description" />
        </p>
        <span className={styles.heroAccentLine} />
        <span className={styles.heroWatermark}>the build</span>
      </div>
    </div>
  );
}
