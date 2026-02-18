"use client";

import { Fragment } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  experiences,
  skillGroups,
  approachSteps,
  philosophy,
  certifications,
  awards,
} from "@/data/about";
import CreditsPanel from "@/components/layout/CreditsFooter/CreditsPanel";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import ProfileWindows from "./ProfileWindows";
import styles from "./AboutMeSection.module.css";

const PANEL_COUNT = 11;
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
          <h2 className={styles.heroTitle}>
            Crafting Digital
            <br />
            <span className={styles.heroTitleAccent}>Experiences</span>
          </h2>
          <p className={styles.heroSubtitle}>{t("aboutPage.intro")}</p>
          <span className={styles.heroWatermark}>about me</span>
        </div>
      </div>

      {/* Panel 2: Profile */}
      <div className={`${styles.panel} ${styles.profilePanel}`}>
        <ProfileWindows className={styles.animate} isMobile={isMobile} />
        <div className={`${styles.profileContent} ${styles.animate}`}>
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

      {/* Panel 3: Experience */}
      <div className={styles.panel}>
        <span className={styles.panelWatermark}>experience</span>
        <span className={styles.decorBlob} />
        <div className={styles.panelInner}>
          <div className={styles.expTimeline}>
            {experiences.map((exp, index) => (
              <div
                key={index}
                className={`${styles.expRow} ${styles.animate}`}
              >
                <span className={styles.expPeriod}>
                  {exp.period[language]}
                </span>

                <div className={styles.expMarker}>
                  <span className={styles.expDot} />
                  {index < experiences.length - 1 && (
                    <span className={styles.expLine} />
                  )}
                </div>

                <div className={styles.expContent}>
                  <h4 className={styles.expRole}>{exp.role[language]}</h4>
                  <span className={styles.expCompany}>{exp.company}</span>
                  <p className={styles.expDesc}>
                    {exp.description[language]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel 4–7: Skills (one panel per category) */}
      {skillGroups.map((group, gi) => (
        <div key={`skill-${gi}`} className={styles.panel}>
          <span className={styles.panelWatermark}>
            {group.category.split(" ")[0].toLowerCase()}
          </span>
          <div className={styles.panelInner}>
            <div className={styles.skillPanelLayout}>
              <div className={`${styles.skillPanelHeader} ${styles.animate}`}>
                <span className={styles.skillPanelNumber}>
                  0{gi + 1}
                </span>
                <h3 className={styles.skillPanelCategory}>
                  {group.category}
                </h3>
                <span className={styles.skillPanelAccent} />
                <p className={styles.skillPanelDesc}>
                  {group.description[language]}
                </p>
              </div>

              <div className={styles.skillPanelList}>
                {group.skills.map((skill, si) => (
                  <div
                    key={si}
                    className={`${styles.skillPanelItem} ${styles.animate}`}
                  >
                    <h4 className={styles.skillPanelItemName}>
                      {skill.name}
                    </h4>
                    <p className={styles.skillPanelItemDesc}>
                      {skill.description[language]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Panel 8: Philosophy */}
      <div className={styles.panel}>
        <span className={styles.panelWatermark}>mindset</span>
        <span className={`${styles.decorBlob} ${styles.decorBlobAlt}`} />
        <div className={styles.panelInner}>
          <div className={styles.philosophyStack}>
            {philosophy.map((item, index) => (
              <div
                key={index}
                className={`${styles.philosophyRow} ${styles.animate}`}
              >
                <span className={styles.philosophyIndex}>
                  0{index + 1}
                </span>
                <h3 className={styles.philosophyHeadline}>
                  {item.title}
                  <span className={styles.philosophyDot} />
                </h3>
                <p className={styles.philosophyBody}>
                  {item.description[language]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel 9: My Approach */}
      <div className={styles.panel}>
        <span className={styles.panelWatermark}>process</span>
        <div className={styles.panelInner}>
          <div className={styles.approachStack}>
            {approachSteps.map((step, index) => (
              <div
                key={index}
                className={`${styles.approachRow} ${styles.animate}`}
              >
                <div className={styles.approachLeft}>
                  <span className={styles.approachNum}>{step.number}</span>
                  <h3 className={styles.approachName}>{step.title}</h3>
                </div>
                <p className={styles.approachBody}>
                  {step.description[language]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel 10: Certifications & Awards */}
      <div className={styles.panel}>
        <span className={styles.panelWatermark}>credentials</span>
        <div className={styles.panelInner}>
          <h3 className={`${styles.sectionSubtitle} ${styles.animate}`}>
            Certifications & Awards
          </h3>
          <div className={styles.credentialColumns}>
            <div className={styles.credentialColumn}>
              <h4 className={`${styles.credentialHeading} ${styles.animate}`}>
                {language === "ko" ? "자격증" : "Certifications"}
              </h4>
              <div className={styles.credentialList}>
                {certifications.map((cert, index) => (
                  <div
                    key={index}
                    className={`${styles.credentialItem} ${styles.animate}`}
                  >
                    <span className={styles.credentialYear}>{cert.year}</span>
                    <div className={styles.credentialInfo}>
                      <h5 className={styles.credentialName}>
                        {cert.name[language]}
                      </h5>
                      <span className={styles.credentialOrg}>
                        {cert.issuer[language]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.credentialColumn}>
              <h4 className={`${styles.credentialHeading} ${styles.animate}`}>
                {language === "ko" ? "수상내역" : "Awards"}
              </h4>
              <div className={styles.credentialList}>
                {awards.map((award, index) => (
                  <div
                    key={index}
                    className={`${styles.credentialItem} ${styles.animate}`}
                  >
                    <span className={styles.credentialYear}>{award.year}</span>
                    <div className={styles.credentialInfo}>
                      <h5 className={styles.credentialName}>
                        {award.name[language]}
                      </h5>
                      <span className={styles.credentialOrg}>
                        {award.organization[language]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel 9: Credits */}
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
