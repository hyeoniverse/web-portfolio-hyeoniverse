"use client";

import { Fragment } from "react";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  experiences,
  skills,
  toolCategories,
  approachSteps,
  philosophy,
} from "@/data/about";
import CreditsPanel from "@/components/layout/CreditsFooter/CreditsPanel";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import styles from "./AboutMeSection.module.css";

const PANEL_COUNT = 8;
const REPETITIONS = 3;

export default function AboutMeSection() {
  const { t, language } = useLanguage();
  const isMobile = useMobileLayout();
  const { sectionRef, trackRef } = useHorizontalScroll(styles, {
    infinite: !isMobile,
    panelSetSize: PANEL_COUNT,
    navSectionCount: PANEL_COUNT,
    mobileAnimateVisible: true,
  });

  const panelSet = (key: number) => (
    <Fragment key={key}>
      {/* Panel 1: Hero */}
      <div className={styles.panel}>
        <div className={`${styles.heroContent} ${styles.animate}`}>
          <span className={styles.label}>{t("aboutPage.title")}</span>
          <h2 className={styles.title}>
            Crafting Digital
            <br />
            <span className={styles.titleAccent}>Experiences</span>
          </h2>
        </div>
      </div>

      {/* Panel 2: Profile */}
      <div className={styles.panel}>
        <div className={`${styles.splitContent} ${styles.animate}`}>
          <div className={styles.imageContainer}>
            <Image
              src="/images/profile_pic.webp"
              alt="Profile"
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className={styles.profileImage}
            />
            <div className={styles.imageDecor} />
          </div>

          <div className={styles.bioContainer}>
            <p className={styles.bioHighlight}>
              {t("aboutPage.bio.highlight")}
            </p>
            <p className={styles.bioText}>{t("aboutPage.bio.text1")}</p>
            <p className={styles.bioText}>{t("aboutPage.bio.text2")}</p>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statNumber}>
                  {t("aboutPage.stats.yearsValue")}
                </span>
                <span className={styles.statLabel}>
                  {t("aboutPage.stats.years")}
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statNumber}>
                  {t("aboutPage.stats.projectsValue")}
                </span>
                <span className={styles.statLabel}>
                  {t("aboutPage.stats.projects")}
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statNumber}>
                  {t("aboutPage.stats.clientsValue")}
                </span>
                <span className={styles.statLabel}>
                  {t("aboutPage.stats.clients")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel 3: Experience */}
      <div className={styles.panel}>
        <div className={styles.panelInner}>
          <h3 className={`${styles.sectionSubtitle} ${styles.animate}`}>
            Experience
          </h3>
          <div className={styles.experienceList}>
            {experiences.map((exp, index) => (
              <div
                key={index}
                className={`${styles.experienceCard} ${styles.animate}`}
              >
                <span className={styles.experiencePeriod}>
                  {exp.period[language]}
                </span>
                <h4 className={styles.experienceRole}>
                  {exp.role[language]}
                </h4>
                <span className={styles.experienceCompany}>
                  {exp.company}
                </span>
                <p className={styles.experienceDescription}>
                  {exp.description[language]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel 4: Skills */}
      <div className={styles.panel}>
        <div className={styles.panelInner}>
          <h3 className={`${styles.sectionSubtitle} ${styles.animate}`}>
            Skills
          </h3>
          <div className={styles.skillsList}>
            {skills.map((skill, index) => (
              <div
                key={index}
                className={`${styles.skillItem} ${styles.animate}`}
              >
                <div className={styles.skillHeader}>
                  <span className={styles.skillName}>{skill.name}</span>
                  <span className={styles.skillLevel}>{skill.level}%</span>
                </div>
                <div className={styles.skillBar}>
                  <div
                    className={styles.skillProgress}
                    style={{ transform: `scaleX(${skill.level / 100})` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel 5: Tools & Technologies */}
      <div className={styles.panel}>
        <div className={styles.panelInner}>
          <h3 className={`${styles.sectionSubtitle} ${styles.animate}`}>
            {t("aboutPage.tools.subtitle")}
          </h3>
          <p className={`${styles.toolsDescription} ${styles.animate}`}>
            {t("aboutPage.tools.description")}
          </p>
          <div className={styles.toolsGrid}>
            {toolCategories.map((cat, index) => (
              <div
                key={index}
                className={`${styles.toolCategory} ${styles.animate}`}
              >
                <h4 className={styles.toolCategoryTitle}>{cat.category}</h4>
                <div className={styles.toolTags}>
                  {cat.tools.map((tool) => (
                    <span key={tool} className={styles.toolTag}>
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel 6: Philosophy */}
      <div className={styles.panel}>
        <div className={styles.panelInner}>
          <h3 className={`${styles.sectionSubtitle} ${styles.animate}`}>
            My Philosophy
          </h3>
          <div className={styles.philosophyGrid}>
            {philosophy.map((item, index) => (
              <div
                key={index}
                className={`${styles.philosophyCard} ${styles.animate}`}
              >
                <span className={styles.philosophyNumber}>
                  0{index + 1}
                </span>
                <h4 className={styles.philosophyTitle}>{item.title}</h4>
                <p className={styles.philosophyDescription}>
                  {item.description[language]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel 7: My Approach */}
      <div className={styles.panel}>
        <div className={styles.panelInner}>
          <h3 className={`${styles.sectionSubtitle} ${styles.animate}`}>
            {t("aboutPage.approach.subtitle")}
          </h3>
          <p className={`${styles.toolsDescription} ${styles.animate}`}>
            {t("aboutPage.approach.description")}
          </p>
          <div className={styles.approachGrid}>
            {approachSteps.map((step, index) => (
              <div
                key={index}
                className={`${styles.approachCard} ${styles.animate}`}
              >
                <span className={styles.approachNumber}>{step.number}</span>
                <h4 className={styles.approachTitle}>{step.title}</h4>
                <p className={styles.approachDescription}>
                  {step.description[language]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel 8: Credits */}
      <CreditsPanel className={`${styles.panel} ${styles.animate}`} />
    </Fragment>
  );

  return (
    <section ref={sectionRef} className={styles.section}>
      <div ref={trackRef} className={styles.track}>
        {isMobile
          ? panelSet(0)
          : Array.from({ length: REPETITIONS }, (_, i) => panelSet(i))}
      </div>
    </section>
  );
}
