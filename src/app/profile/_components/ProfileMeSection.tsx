"use client";

import { Fragment, useEffect, useMemo } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import {
  experiences as staticExperiences,
  education as staticEducation,
  activities as staticActivities,
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

/* 한 세트에 늘 들어가는 구분선 수 — 패널 사이에 세 번 들어간다.
   패널 수는 고정할 수 없다. 스킬 묶음 수가 사람마다 다르고, 비워 둔 묶음은 그리지 않기 때문이다.
   무한 스크롤의 한 세트 크기와 네비게이션 dot 개수가 실제 개수와 어긋나면 되감기 지점이 틀어지므로
   둘 다 아래에서 실제로 그리는 목록으로 센다. */
const BREAK_COUNT = 3;
/** 말풍선(profilePage.bubble.N)이 묶여 있는 본래 번호. 빈 묶음을 건너뛰어 차례가 당겨져도
 *  말풍선은 이 번호로 찾는다 — 안 그러면 엉뚱한 패널에서 엉뚱한 말이 나온다. */
const BUBBLE_INDEX: Record<string, number> = {
  hero: 0, bunny: 1, profile: 2, github: 3, pinned: 4, experience: 5,
  philosophy: 10, process: 11, credentials: 12, credits: 13,
  education: 14, activities: 15,
};
/** 스킬은 묶음마다 패널 하나 — 본래 번호는 6부터 네 자리다. 그보다 많으면 마지막 것을 같이 쓴다 */
const SKILL_BUBBLE_START = 6;
const SKILL_BUBBLE_LAST = 9;
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
  const education = profileData?.education ?? staticEducation;
  const activities = profileData?.activities ?? staticActivities;
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

  /* 실제로 그리는 패널의 차례 — 적지 않은 묶음은 그리지 않으므로 사람마다 다르다.
     세는 일(무한 스크롤 한 세트·dot 개수)과 말풍선 번호를 모두 이 목록에서 뽑는다 */
  const panelIds = useMemo(() => {
    const ids = ["hero", "bunny", "profile"];
    if (githubPanels >= 1) ids.push("github");
    if (githubPanels >= 2) ids.push("pinned");
    if (experiences.length > 0) ids.push("experience");
    if (education.length > 0) ids.push("education");
    if (activities.length > 0) ids.push("activities");
    skillGroups.forEach((_, i) => ids.push(`skill-${i}`));
    if (philosophy.length > 0) ids.push("philosophy");
    if (approachSteps.length > 0) ids.push("process");
    if (certifications.length > 0 || awards.length > 0) ids.push("credentials");
    ids.push("credits");
    return ids;
  }, [githubPanels, experiences.length, education.length, activities.length, skillGroups, philosophy.length, approachSteps.length, certifications.length, awards.length]);

  const { sectionRef, trackRef, activeSection } = useHorizontalScroll(styles, {
    infinite: infiniteScroll,
    panelSetSize: panelIds.length + BREAK_COUNT,
    navSectionCount: panelIds.length,
    mobileAnimateVisible: true,
  });

  /* 이 패널에 머무는 동안만 표정을 돌린다 — 사본이 여러 벌이라 여기서 한 번만 부른다. */
  useBunnyExpressionCycle(panelIds[activeSection] === "bunny");

  useEffect(() => {
    /* 말풍선은 패널의 본래 번호에 묶여 있다. 빈 묶음을 건너뛰어 차례가 당겨져도 본래 번호로 넘긴다 */
    const id = panelIds[activeSection];
    if (!id) return;
    const skill = id.startsWith("skill-") ? Number(id.slice(6)) : -1;
    const bubbleIndex = skill >= 0
      ? Math.min(SKILL_BUBBLE_START + skill, SKILL_BUBBLE_LAST)
      : BUBBLE_INDEX[id] ?? 0;
    useProfileSectionStore.getState().setActiveSection(bubbleIndex);
  }, [activeSection, panelIds]);

  /* 시간순 판 셋 — 적은 것만 그린다. 차례와 무늬는 panelIds 와 같은 순서다 */
  const timelinePanels = useMemo(
    () => [
      { id: "experience", watermark: "experience", titleKey: "profilePage.experience", items: experiences, indent: true },
      { id: "education", watermark: "education", titleKey: "profilePage.education", items: education, indent: false },
      { id: "activities", watermark: "activities", titleKey: "profilePage.activities", items: activities, indent: true },
    ].filter((panel) => panel.items.length > 0),
    [experiences, education, activities],
  );

  /** GitHub 패널이 지금 몇 번째인지 — 그 패널 안의 연출이 활성 여부를 본다 */
  const githubIndex = panelIds.indexOf("github");

  const panelSet = (key: number) => (
    <Fragment key={key}>
      {/* Panel 1: Hero — data-set-anchor 는 한 세트의 시작점.
          배경의 ScrollDrawScene 이 여기서부터 얼마나 왔는지로 진행도를 잰다.
          무한 스크롤이면 세트가 여러 벌이라, 기준점 사이 거리가 곧 한 바퀴 길이다. */}
      {/* 히어로 패널의 글에는 .animate 를 붙이지 않는다. 모바일에서 .animate 는
          opacity: 0 으로 시작해 IntersectionObserver 가 .animateVisible 을 붙여야 보이는데,
          그 관찰은 하이드레이션 뒤에야 시작된다. 히어로는 처음부터 화면 안에 있으므로
          감출 이유가 없고, 감추면 가장 큰 글이 7.6초까지 안 보여 LCP 가 그만큼 밀린다.
          데스크톱 경로(useHorizontalScroll)도 히어로 패널은 건너뛴다 — 동작을 맞춘 것이다. */}
      <div className={styles.panel} data-set-anchor>
        <div className={styles.heroContent}>
          <span className={styles.label}>
            <T ko={p.title_ko} en={p.title} />
          </span>
          <KineticHeroTitle
            as="h1"
            lines={[
              { text: "Crafting Digital" },
              { text: "Experiences", accent: true },
            ]}
          />
          <p className={styles.heroSubtitle}>
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
              active={activeSection === githubIndex}
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
              active={activeSection === githubIndex + 1}
              part="pinned"
            />
          </div>
        </div>
      )}

      {/* Panel 6~8: 경력·교육·활동 — 같은 모양이라 한 틀로 그린다.
          적지 않은 묶음은 아예 그리지 않는다(빈 판이 서 있으면 고장 난 것처럼 보인다) */}
      {timelinePanels.map(({ id, watermark, titleKey, items, indent }) => (
        <div key={id} className={`${styles.panel} ${indent ? styles.panelIndent : ""}`} data-emph-panel>
          <span className={styles.panelWatermark}>{watermark}</span>
          <div className={styles.panelInner}>
            <HoverEmphasis>
              <h3 className={`${styles.sectionSubtitle} ${styles.animate}`}>
                <T k={titleKey} />
              </h3>
              <div className={styles.expTimeline}>
                {items.map((item, index) => (
                  <div key={index} className={`${styles.expRow} ${styles.animate}`} data-emph-row>
                    <span className={styles.expPeriod}>{formatPeriod(item.period, language)}</span>

                    <div className={styles.expMarker}>
                      <span className={styles.expDot} />
                      {index < items.length - 1 && <span className={styles.expLine} />}
                    </div>

                    <div className={styles.expContent}>
                      <h4 className={styles.expRole} data-emph>{item.role[language]}</h4>
                      <span className={styles.expCompany} data-emph>{item.company}</span>
                      <p className={styles.expDesc}>{item.description[language]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </HoverEmphasis>
          </div>
        </div>
      ))}

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
      {(philosophy.length > 0) && (
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
      )}

      {/* Panel 12: My Approach */}
      {(approachSteps.length > 0) && (
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
      )}

      {/* Panel 13: Certifications & Awards */}
      {(certifications.length > 0 || awards.length > 0) && (
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
      )}

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
