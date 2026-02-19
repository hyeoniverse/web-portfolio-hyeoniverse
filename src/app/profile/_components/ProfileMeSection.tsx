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
} from "@/data/profile";
import CreditsPanel from "@/components/layout/CreditsFooter/CreditsPanel";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import ProfileWindows from "./ProfileWindows";
import MarqueeDivider from "./MarqueeDivider";
import KineticHeroTitle from "./KineticHeroTitle";
import styles from "./ProfileMeSection.module.css";

// 11 panels + 3 break dividers = 14 elements per set
const PANEL_COUNT = 14;
const NAV_SECTION_COUNT = 11;
const REPETITIONS = 3;

export default function ProfileMeSection() {
  const { t, language } = useLanguage();
  const isMobile = useMobileLayout();
  const { sectionRef, trackRef } = useHorizontalScroll(styles, {
    infinite: !isMobile,
    panelSetSize: PANEL_COUNT,
    navSectionCount: NAV_SECTION_COUNT,
    mobileAnimateVisible: true,
  });

  const panelSet = (key: number) => (
    <Fragment key={key}>
      {/* Panel 1: Hero */}
      <div className={styles.panel}>
        <div className={styles.heroContent}>
          <span className={`${styles.label} ${styles.animate}`}>
            {t("profilePage.title")}
          </span>
          <KineticHeroTitle
            lines={[
              { text: "Crafting Digital" },
              { text: "Experiences", accent: true },
            ]}
          />
          <p className={`${styles.heroSubtitle} ${styles.animate}`}>
            {t("profilePage.intro")}
          </p>
          <span className={styles.heroWatermark}>about me</span>
        </div>
      </div>

      {/* Break: Marquee 1 */}
      <MarqueeDivider className={styles.breakPanel} />

      {/* Panel 2: Profile */}
      <div className={`${styles.panel} ${styles.profilePanel}`}>
        <ProfileWindows className={styles.animate} isMobile={isMobile} />
        <div className={`${styles.profileContent} ${styles.animate}`}>
          <p className={styles.bioHighlight}>
            {t("profilePage.bio.highlight")}
          </p>
          <p className={styles.bioText}>{t("profilePage.bio.text1")}</p>
          <p className={styles.bioText}>{t("profilePage.bio.text2")}</p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>
                {t("profilePage.stats.yearsValue")}
              </span>
              <span className={styles.statLabel}>
                {t("profilePage.stats.years")}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>
                {t("profilePage.stats.projectsValue")}
              </span>
              <span className={styles.statLabel}>
                {t("profilePage.stats.projects")}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>
                {t("profilePage.stats.clientsValue")}
              </span>
              <span className={styles.statLabel}>
                {t("profilePage.stats.clients")}
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

      {/* Break: Marquee 2 */}
      <MarqueeDivider className={styles.breakPanel} />

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

      {/* Break: Marquee 3 */}
      <MarqueeDivider className={styles.breakPanel} />

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

      {/* Panel 11: Credits */}
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
