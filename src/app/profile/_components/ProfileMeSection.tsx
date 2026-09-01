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
  bunnyProfile as staticBunny,
  profileInfoBlocks as staticInfoBlocks,
} from "@/data/profile";
import type { ProfileData } from "@/types/profile";
import { formatPeriod } from "@/utils/formatPeriod";
import CreditsPanel from "@/components/layout/CreditsFooter/CreditsPanel";
import T from "@/components/ui/T";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { useProfileSectionStore } from "@/stores/profileSectionStore";
import ProfileWindows from "./ProfileWindows";
import MarqueeDivider from "./MarqueeDivider";
import HoverEmphasis from "./HoverEmphasis/HoverEmphasis";
import ScrollDrawScene from "./ScrollDrawScene/ScrollDrawScene";
import BunnyShowcasePanel from "./BunnyShowcase/BunnyShowcasePanel";
import NightSky from "./BunnyShowcase/NightSky";
import { useBunnyExpressionCycle } from "./BunnyShowcase/useBunnyExpressionCycle";
import ProfileGithub from "./ProfileGithub/ProfileGithub";
import type { GithubShowcase } from "@/lib/githubShowcase";
import KineticHeroTitle from "@/components/common/KineticHeroTitle";
import styles from "./ProfileMeSection.module.css";

// 12 panels + 3 break dividers = 15 elements per set
// GitHub showcase 가 있으면 패널이 하나 늘어난다 — 무한 스크롤의 한 세트 크기와
// 네비게이션 dot 개수가 실제 개수와 어긋나면 되감기 지점이 틀어진다.
const PANEL_COUNT = 15;
const NAV_SECTION_COUNT = 12;
/** GitHub 패널이 들어가는 자리(구분선 제외 인덱스: Hero 0 · Bunny 1 · Profile 2 · GitHub 3)
 *  — 말풍선 키가 이 번호에 묶여 있다. */
const GITHUB_PANEL_INDEX = 3;
/** 몽이 패널 자리(구분선 제외 인덱스). 여기에 머무는 동안만 표정을 조종한다. */
const BUNNY_PANEL_INDEX = 1;
/** GitHub 이 차지할 수 있는 최대 패널 수 — 개요 + Pinned. 말풍선 키는 이 배치를 기준으로 쓰였다. */
const GITHUB_PANEL_SPAN = 2;
const REPETITIONS = 3;

interface ProfileMeSectionProps {
  profileData?: ProfileData;
  /** GitHub 활동 지표·저장소 — 있으면 트랙 끝쪽에 패널 하나로 들어간다. */
  showcase?: GithubShowcase | null;
}

export default function ProfileMeSection({ profileData, showcase }: ProfileMeSectionProps) {
  const experiences = profileData?.experiences ?? staticExperiences;
  const skillGroups = profileData?.skillGroups ?? staticSkillGroups;
  const approachSteps = profileData?.approachSteps ?? staticApproachSteps;
  const philosophy = profileData?.philosophy ?? staticPhilosophy;
  const certifications = profileData?.certifications ?? staticCertifications;
  const awards = profileData?.awards ?? staticAwards;
  const infoBlocks = profileData?.infoBlocks ?? staticInfoBlocks;
  const bunny = profileData?.bunny ?? staticBunny;

  const { language } = useLanguage();
  const siteConfig = useSiteConfig();
  const ko = language === "ko";
  const p = siteConfig.profile;
  const infiniteScroll = siteConfig.profile.infiniteScroll;
  const isMobile = useMobileLayout();
  /* 실제로 그리는 GitHub 패널 수 — 개요만(1) / 개요+Pinned(2) / 아예 없음(0).
     무한 스크롤의 한 세트 크기와 네비게이션 dot 개수가 실제 개수와 어긋나면 되감기가 틀어진다. */
  const githubPanels = showcase ? (showcase.repos.length > 0 ? GITHUB_PANEL_SPAN : 1) : 0;
  const { sectionRef, trackRef, activeSection } = useHorizontalScroll(styles, {
    infinite: infiniteScroll,
    panelSetSize: PANEL_COUNT + githubPanels,
    navSectionCount: NAV_SECTION_COUNT + githubPanels,
    mobileAnimateVisible: true,
  });

  /* 이 패널에 머무는 동안만 표정을 돌린다 — 사본이 여러 벌이라 여기서 한 번만 부른다. */
  useBunnyExpressionCycle(activeSection === BUNNY_PANEL_INDEX);

  useEffect(() => {
    /* 말풍선(profilePage.bubble.N)은 패널 번호에 묶여 있고, 키는 GitHub 이 두 패널을 다
       차지하는 배치를 기준으로 쓰였다. 실제로 덜 그려지면 그 뒤가 당겨져 엉뚱한 패널에
       뜨므로, 빠진 만큼 되돌려서 넘긴다. */
    const bubbleIndex =
      activeSection < GITHUB_PANEL_INDEX + githubPanels
        ? activeSection
        : activeSection + (GITHUB_PANEL_SPAN - githubPanels);
    useProfileSectionStore.getState().setActiveSection(bubbleIndex);
  }, [activeSection, githubPanels]);

  const panelSet = (key: number) => (
    <Fragment key={key}>
      {/* Panel 1: Hero — data-set-anchor 는 한 세트의 시작점.
          배경의 ScrollDrawScene 이 여기서부터 얼마나 왔는지로 진행도를 잰다.
          무한 스크롤이면 세트가 여러 벌이라, 기준점 사이 거리가 곧 한 바퀴 길이다. */}
      <div className={styles.panel} data-set-anchor>
        <div className={styles.heroContent}>
          <span className={`${styles.label} ${styles.animate}`}>
            <T ko={p.title_ko} en={p.title} />
          </span>
          <KineticHeroTitle
            lines={[
              { text: "Crafting Digital" },
              { text: "Experiences", accent: true },
            ]}
          />
          <p className={`${styles.heroSubtitle} ${styles.animate}`}>
            <T ko={p.intro_ko} en={p.intro} />
          </p>
          <span className={styles.heroWatermark}>about me</span>
        </div>
      </div>

      {/* Panel 2: Bunny Showcase */}
      <div className={`${styles.panel} ${styles.bunnyPanel}`}>
        <NightSky />
        <span className={styles.panelWatermark}>mongi</span>
        <div className={styles.panelInner}>
          <BunnyShowcasePanel animateClass={styles.animate} bunny={bunny} />
        </div>
      </div>

      {/* Break: Marquee 1 */}
      <MarqueeDivider className={styles.breakPanel} />

      {/* Panel 3: Profile */}
      <div className={`${styles.panel} ${styles.profilePanel}`} data-emph-panel>
        <ProfileWindows className={styles.animate} isMobile={isMobile} infoBlocks={infoBlocks} />
        <div className={`${styles.profileContent} ${styles.animate}`}>
          <HoverEmphasis>
          <h3 className={styles.sectionSubtitle}><T k="profilePage.profile" /></h3>
          <p className={styles.bioHighlight} data-emph-row>
            <T ko={p.bioHighlight_ko} en={p.bioHighlight} />
          </p>
          <p className={styles.bioText} data-emph-row><T ko={p.bioText1_ko} en={p.bioText1} /></p>
          <p className={styles.bioText} data-emph-row><T ko={p.bioText2_ko} en={p.bioText2} /></p>
          {(ko ? p.bioText3_ko : p.bioText3) && (
            <p className={styles.bioText} data-emph-row><T ko={p.bioText3_ko} en={p.bioText3} /></p>
          )}

          <div className={styles.stats}>
            <div className={styles.stat} data-emph-row>
              <span className={styles.statNumber} data-emph>{p.statsYearsValue}</span>
              <span className={styles.statLabel}>
                <T ko={p.statsYears_ko} en={p.statsYears} />
              </span>
            </div>
            <div className={styles.stat} data-emph-row>
              <span className={styles.statNumber} data-emph>{p.statsProjectsValue}</span>
              <span className={styles.statLabel}>
                <T ko={p.statsProjects_ko} en={p.statsProjects} />
              </span>
            </div>
            <div className={styles.stat} data-emph-row>
              <span className={styles.statNumber} data-emph>{p.statsClientsValue}</span>
              <span className={styles.statLabel}>
                <T ko={p.statsClients_ko} en={p.statsClients} />
              </span>
            </div>
          </div>
          </HoverEmphasis>
        </div>
      </div>

      {/* Panel 4: GitHub — 앞의 Profile 이 "누구인가" 라면 여기는 그 사람이 실제로 무엇을
          굴리고 있는가다. 이력·기술로 넘어가기 전에 근거를 먼저 보여준다. */}
      {showcase && (
        <div className={styles.panel}>
          <span className={styles.panelWatermark}>github</span>
          <div className={styles.panelInner}>
            {/* 연출 시작 신호를 직접 준다. 패널이 화면 가운데 왔을 때가 정확히 이 시점이다 —
                IntersectionObserver 로는 오른쪽에 걸치는 순간 이미 시작돼 다 끝나 버린다. */}
            <ProfileGithub
              showcase={showcase}
              animateClass={styles.animate}
              active={activeSection === GITHUB_PANEL_INDEX}
            />
          </div>
        </div>
      )}

      {/* Panel 5: Pinned — 지표와 한 패널에 넣으니 빽빽해서 훑기 어려웠다.
          다른 패널들처럼 한 패널에 한 가지만 둔다. */}
      {showcase && showcase.repos.length > 0 && (
        <div className={styles.panel}>
          <span className={styles.panelWatermark}>pinned</span>
          <div className={styles.panelInner}>
            <ProfileGithub
              showcase={showcase}
              animateClass={styles.animate}
              active={activeSection === GITHUB_PANEL_INDEX + 1}
              part="pinned"
            />
          </div>
        </div>
      )}

      {/* Panel 6: Experience */}
      <div className={`${styles.panel} ${styles.panelIndent}`} data-emph-panel>
        <span className={styles.panelWatermark}>experience</span>
        <div className={styles.panelInner}>
            <HoverEmphasis>
            <h3 className={`${styles.sectionSubtitle} ${styles.animate}`}>
              <T k="profilePage.experience" />
            </h3>
            <div className={styles.expTimeline}>
              {experiences.map((exp, index) => (
                <div
                  key={index}
                  className={`${styles.expRow} ${styles.animate}`}
                  data-emph-row
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
                    <h4 className={styles.expRole} data-emph>{exp.role[language]}</h4>
                    <span className={styles.expCompany} data-emph>{exp.company}</span>
                    <p className={styles.expDesc}>
                      {exp.description[language]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            </HoverEmphasis>
          </div>
      </div>

      {/* Break: Marquee 2 */}
      <MarqueeDivider className={styles.breakPanel} />

      {/* Panel 7–10: Skills (one panel per category) */}
      {skillGroups.map((group, gi) => (
        <div key={`skill-${gi}`} className={`${styles.panel} ${gi % 2 === 1 ? styles.panelIndent : ""}`} data-emph-panel>
          <span className={styles.panelWatermark}>
            {group.category.split(" ")[0].toLowerCase()}
          </span>
          <div className={styles.panelInner}>
            <HoverEmphasis>
              <h3 className={`${styles.sectionKicker} ${styles.animate}`}>
                <T k="profilePage.skills" />
              </h3>
              <div className={styles.skillPanelLayout}>
                <div className={`${styles.skillPanelHeader} ${styles.animate}`} data-emph-row>
                  <span className={styles.skillPanelNumber}>
                    0{gi + 1}
                  </span>
                  <h3 className={styles.skillPanelCategory} data-emph>
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
                      data-emph-row
                    >
                      <h4 className={styles.skillPanelItemName} data-emph>
                        {skill.name}
                      </h4>
                      <p className={styles.skillPanelItemDesc}>
                        {skill.description[language]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </HoverEmphasis>
          </div>
        </div>
      ))}

      {/* Break: Marquee 3 */}
      <MarqueeDivider className={styles.breakPanel} />

      {/* Panel 11: Philosophy */}
      <div className={styles.panel} data-emph-panel>
        <span className={styles.panelWatermark}>mindset</span>
        <div className={styles.panelInner}>
            <HoverEmphasis>
            <h3 className={`${styles.sectionSubtitle} ${styles.animate}`}>
              <T k="profilePage.principles" />
            </h3>
            <div className={styles.philosophyStack}>
              {philosophy.map((item, index) => (
                <div
                  key={index}
                  className={`${styles.philosophyRow} ${styles.animate}`}
                  data-emph-row
                >
                  <div className={styles.philosophyLeft}>
                    <span className={styles.philosophyIndex}>
                      0{index + 1}
                    </span>
                    <h3 className={styles.philosophyHeadline} data-emph>
                      {item.title}
                    </h3>
                  </div>
                  <p className={styles.philosophyBody}>
                    {item.description[language]}
                  </p>
                </div>
              ))}
            </div>
            </HoverEmphasis>
          </div>
      </div>

      {/* Panel 12: My Approach */}
      <div className={styles.panel} data-emph-panel>
        <span className={styles.panelWatermark}>process</span>
        <div className={styles.panelInner}>
            <HoverEmphasis>
            <h3 className={`${styles.sectionSubtitle} ${styles.animate}`}>
              <T k="profilePage.workflow" />
            </h3>
            <div className={styles.approachStack}>
              {approachSteps.map((step, index) => (
                <div
                  key={index}
                  className={`${styles.approachRow} ${styles.animate}`}
                  data-emph-row
                >
                  <div className={styles.approachLeft}>
                    <span className={styles.approachNum}>{step.number}</span>
                    <h3 className={styles.approachName} data-emph>{step.title}</h3>
                  </div>
                  <p className={styles.approachBody}>
                    {step.description[language]}
                  </p>
                </div>
              ))}
            </div>
            </HoverEmphasis>
          </div>
      </div>

      {/* Panel 13: Certifications & Awards */}
      <div className={`${styles.panel} ${styles.panelIndent}`} data-emph-panel>
        <span className={styles.panelWatermark}>credentials</span>
        <div className={styles.panelInner}>
            <HoverEmphasis>
            <h3 className={`${styles.sectionSubtitle} ${styles.animate}`}>
              <T k="profilePage.certsAndAwards" />
            </h3>
            <div className={styles.credentialColumns}>
              <div className={styles.credentialColumn}>
                <h4 className={`${styles.credentialHeading} ${styles.animate}`}>
                  <T k="profilePage.certifications" />
                </h4>
                <div className={styles.credentialList}>
                  {certifications.map((cert, index) => (
                    <div
                      key={index}
                      className={`${styles.credentialItem} ${styles.animate}`}
                      data-emph-row
                    >
                      <span className={styles.credentialYear}>{formatPeriod(cert.period, language)}</span>
                      <div className={styles.credentialInfo}>
                        <h5 className={styles.credentialName} data-emph>
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
                  <T k="profilePage.awards" />
                </h4>
                <div className={styles.credentialList}>
                  {awards.map((award, index) => (
                    <div
                      key={index}
                      className={`${styles.credentialItem} ${styles.animate}`}
                      data-emph-row
                    >
                      <span className={styles.credentialYear}>{formatPeriod(award.period, language)}</span>
                      <div className={styles.credentialInfo}>
                        <h5 className={styles.credentialName} data-emph>
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
            </HoverEmphasis>
          </div>
      </div>

      {/* Panel 14: Credits */}
      <CreditsPanel className={`${styles.panel} ${styles.animate}`} />
    </Fragment>
  );

  return (
    <section ref={sectionRef} className={styles.section}>
      {/* 가로 스크롤 전체에 걸쳐 그려지는 배경 장면. 트랙 밖(화면 고정)이라
          첫 패널부터 끝까지 계속 보이고, 스크롤한 만큼 그려진다. */}
      <ScrollDrawScene trackRef={trackRef} infinite={!isMobile && infiniteScroll} />
      <div ref={trackRef} className={styles.track}>
        {isMobile || !infiniteScroll
          ? panelSet(0)
          : Array.from({ length: REPETITIONS }, (_, i) => panelSet(i))}
      </div>
    </section>
  );
}
