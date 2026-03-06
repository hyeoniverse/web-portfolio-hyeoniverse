"use client";

import { Fragment, useEffect } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import {
  experiences as staticExperiences,
  skillGroups as staticSkillGroups,
  approachSteps as staticApproachSteps,
  philosophy as staticPhilosophy,
  certifications as staticCertifications,
  awards as staticAwards,
} from "@/data/profile";
import type { ProfileData } from "@/types/profile";
import { formatPeriod } from "@/utils/formatPeriod";
import CreditsPanel from "@/components/layout/CreditsFooter/CreditsPanel";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { useProfileSectionStore } from "@/stores/profileSectionStore";
import ProfileWindows from "./ProfileWindows";
import MarqueeDivider from "./MarqueeDivider";
import BunnyShowcasePanel from "./BunnyShowcase/BunnyShowcasePanel";
import KineticHeroTitle from "@/components/common/KineticHeroTitle";
import styles from "./ProfileMeSection.module.css";

// 12 panels + 3 break dividers = 15 elements per set
const PANEL_COUNT = 15;
const NAV_SECTION_COUNT = 12;
const REPETITIONS = 3;

interface ProfileMeSectionProps {
  profileData?: ProfileData;
}

export default function ProfileMeSection({ profileData }: ProfileMeSectionProps) {
  const experiences = profileData?.experiences ?? staticExperiences;
  const skillGroups = profileData?.skillGroups ?? staticSkillGroups;
  const approachSteps = profileData?.approachSteps ?? staticApproachSteps;
  const philosophy = profileData?.philosophy ?? staticPhilosophy;
  const certifications = profileData?.certifications ?? staticCertifications;
  const awards = profileData?.awards ?? staticAwards;

  const { language } = useLanguage();
  const siteConfig = useSiteConfig();
  const ko = language === "ko";
  const p = siteConfig.profile;
  const infiniteScroll = siteConfig.profile.infiniteScroll;
  const isMobile = useMobileLayout();
  const { sectionRef, trackRef, activeSection } = useHorizontalScroll(styles, {
    infinite: infiniteScroll,
    panelSetSize: PANEL_COUNT,
    navSectionCount: NAV_SECTION_COUNT,
    mobileAnimateVisible: true,
  });

  useEffect(() => {
    useProfileSectionStore.getState().setActiveSection(activeSection);
  }, [activeSection]);

  const panelSet = (key: number) => (
    <Fragment key={key}>
      {/* Panel 1: Hero */}
      <div className={styles.panel}>
        <div className={styles.heroContent}>
          <span className={`${styles.label} ${styles.animate}`}>
            {ko ? p.title_ko : p.title}
          </span>
          <KineticHeroTitle
            lines={[
              { text: "Crafting Digital" },
              { text: "Experiences", accent: true },
            ]}
          />
          <p className={`${styles.heroSubtitle} ${styles.animate}`}>
            {ko ? p.intro_ko : p.intro}
          </p>
          <span className={styles.heroWatermark}>about me</span>
        </div>
      </div>

      {/* Panel 2: Bunny Showcase */}
      <div className={styles.panel}>
        <span className={styles.panelWatermark}>mongi</span>
        <div className={styles.panelInner}>
          <BunnyShowcasePanel animateClass={styles.animate} />
        </div>
      </div>

      {/* Break: Marquee 1 */}
      <MarqueeDivider className={styles.breakPanel} />

      {/* Panel 3: Profile */}
      <div className={`${styles.panel} ${styles.profilePanel}`}>
        <ProfileWindows className={styles.animate} isMobile={isMobile} />
        <div className={`${styles.profileContent} ${styles.animate}`}>
          <h3 className={styles.sectionSubtitle}>Profile</h3>
          <p className={styles.bioHighlight}>
            {ko ? p.bioHighlight_ko : p.bioHighlight}
          </p>
          <p className={styles.bioText}>{ko ? p.bioText1_ko : p.bioText1}</p>
          <p className={styles.bioText}>{ko ? p.bioText2_ko : p.bioText2}</p>
          <p className={styles.bioText}>{ko ? p.bioText3_ko : p.bioText3}</p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{p.statsYearsValue}</span>
              <span className={styles.statLabel}>
                {ko ? p.statsYears_ko : p.statsYears}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{p.statsProjectsValue}</span>
              <span className={styles.statLabel}>
                {ko ? p.statsProjects_ko : p.statsProjects}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{p.statsClientsValue}</span>
              <span className={styles.statLabel}>
                {ko ? p.statsClients_ko : p.statsClients}
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
          <h3 className={`${styles.sectionSubtitle} ${styles.animate}`}>
            Experience
          </h3>
          <div className={styles.expTimeline}>
            {experiences.map((exp, index) => (
              <div
                key={index}
                className={`${styles.expRow} ${styles.animate}`}
              >
                <span className={styles.expPeriod}>
                  {formatPeriod(exp.period, language)}
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
            <h3 className={`${styles.sectionSubtitle} ${styles.animate}`}>
              Skills
            </h3>
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
          <h3 className={`${styles.sectionSubtitle} ${styles.animate}`}>
            Principles
          </h3>
          <div className={styles.philosophyStack}>
            {philosophy.map((item, index) => (
              <div
                key={index}
                className={`${styles.philosophyRow} ${styles.animate}`}
              >
                <div className={styles.philosophyLeft}>
                  <span className={styles.philosophyIndex}>
                    0{index + 1}
                  </span>
                  <h3 className={styles.philosophyHeadline}>
                    {item.title}
                  </h3>
                </div>
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
          <h3 className={`${styles.sectionSubtitle} ${styles.animate}`}>
            Workflow
          </h3>
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
                    <span className={styles.credentialYear}>{formatPeriod(cert.period, language)}</span>
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
                    <span className={styles.credentialYear}>{formatPeriod(award.period, language)}</span>
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

      {/* Panel 12: Credits */}
      <CreditsPanel className={`${styles.panel} ${styles.animate}`} />
    </Fragment>
  );

  return (
    <section ref={sectionRef} className={styles.section}>
      <div ref={trackRef} className={styles.track}>
        {isMobile || !infiniteScroll
          ? panelSet(0)
          : Array.from({ length: REPETITIONS }, (_, i) => panelSet(i))}
      </div>
    </section>
  );
}
