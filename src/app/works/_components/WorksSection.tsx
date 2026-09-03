"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback, Fragment } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BREAKPOINT } from "@/constants";
import { useLenis } from "@/providers/LenisProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useIsMobile } from "@/hooks/useIsMobile";
import CreditsPanel from "@/components/layout/CreditsFooter/CreditsPanel";
import {
  projects as staticProjects,
  Project,
  INFINITE_SCROLL_SETS,
} from "@/data/projects";
import { useWorksHorizontalScroll } from "../_hooks/useWorksHorizontalScroll";
import { useWorksVerticalParallax } from "../_hooks/useWorksVerticalParallax";
import { useWorkTransition } from "../_hooks/useWorkTransition";
import WorksIntro from "./WorksIntro";
import WorksActiveInfo from "./WorksActiveInfo";
import WorkTransitionOverlay from "./WorkTransitionOverlay";
import WorksFlowCard, { flowCardClassNames } from "./WorksFlowCard";
import FullscreenLayout from "./layouts/FullscreenLayout";
import CinematicLayout from "./layouts/CinematicLayout";
import GridLayout from "./layouts/GridLayout";
import SplitLayout from "./layouts/SplitLayout";
const CylinderLayout = dynamic(() => import("./layouts/CylinderLayout"), { ssr: false });
import intro from "./WorksIntro.module.css";
import styles from "./WorksSection.module.css";

interface WorksSectionProps {
  projects?: Project[];
}

type LayoutType = "flow" | "fullscreen" | "cinematic" | "grid" | "split" | "cylinder";

/* 수평 엔진이 DOM 을 찾을 때 쓰는 클래스 이름. 모듈 스코프에 한 번만 만든다 —
   렌더마다 새 객체를 넘기면 엔진의 useLayoutEffect 가 매번 재실행되고,
   그때마다 스크롤 위치가 초기값으로 되돌아가 휠 입력이 먹지 않는다. */
const SCROLL_CLASS_NAMES = { ...flowCardClassNames, intro: intro.intro };

export default function WorksSection({ projects: projectsProp }: WorksSectionProps) {
  const projects = projectsProp ?? staticProjects;
  const PROJECT_COUNT = projects.length;
  // statsClients 라벨이 "Tech Stack" 이므로 전체 작품의 tech 항목 union → unique 개수로 카운트
  const TECH_COUNT = new Set(projects.flatMap((p) => p.tech ?? [])).size;
  const allProjects = Array(INFINITE_SCROLL_SETS).fill(projects).flat();

  const siteConfig = useSiteConfig();
  const infiniteScroll = siteConfig.works.infiniteScroll;
  const searchParams = useSearchParams();
  const configLayout = (siteConfig.works as Record<string, unknown>).layout as LayoutType | undefined;
  const layout = (searchParams.get("layout") as LayoutType) || configLayout || "flow";

  const galleryRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [introVisible, setIntroVisible] = useState(true);

  const { setInfinite } = useLenis();
  const { isMobile: isVerticalLayout } = useIsMobile(BREAKPOINT.tablet, 700);

  const {
    cardRefs,
    transitionData,
    handleCardClick,
    handlePressStart,
    handlePressEnd,
    handleLayoutProjectClick,
  } = useWorkTransition(flowCardClassNames.cardActive);

  const registerCard = useCallback(
    (index: number, el: HTMLElement | null) => {
      if (el) cardRefs.current.set(index, el);
    },
    [cardRefs],
  );

  // 마운트 시 Lenis 무한 스크롤 비활성화 — Lenis 단독 infinite 는 깜빡임 발생.
  // fullscreen 의 vertical loop 는 FullscreenLayout 내부에서 DOM 복제 + scrollTo 로 자체 처리
  // useLayoutEffect 사용: cleanup이 다음 페이지의 useLayoutEffect 전에 실행되어
  // ScrollTrigger가 올바른 Lenis 상태에서 생성되도록 보장
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    setInfinite(false);
    const timer = setTimeout(() => ScrollTrigger.refresh(), 100);
    return () => {
      clearTimeout(timer);
    };
  }, [setInfinite]);

  // 브라우저 리사이즈 시 페이지 리로드 (수평 스크롤 레이아웃 재계산)
  // cylinder 등 동적 대응 레이아웃은 리로드 불필요
  useEffect(() => {
    if (layout === "cylinder") return;
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => window.location.reload(), 200);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [layout]);

  useWorksHorizontalScroll({
    galleryRef,
    sliderRef,
    enabled: !isVerticalLayout,
    infiniteScroll,
    projectCount: PROJECT_COUNT,
    cls: SCROLL_CLASS_NAMES,
    onActiveIndex: setActiveIndex,
    onIntroVisible: setIntroVisible,
  });

  useWorksVerticalParallax({
    sliderRef,
    enabled: isVerticalLayout,
    cardClassName: flowCardClassNames.card,
    imageWrapClassName: flowCardClassNames.cardImageWrap,
  });

  const introBlock = (
    <WorksIntro
      works={siteConfig.works}
      projectCount={PROJECT_COUNT}
      techCount={TECH_COUNT}
      slotClassName={styles.introSlot}
    />
  );

  // 대체 레이아웃 렌더
  if (layout !== "flow") {
    const layoutProps = { projects, onProjectClick: handleLayoutProjectClick };
    let LayoutComponent: React.ReactNode = null;

    if (layout === "fullscreen") LayoutComponent = <FullscreenLayout {...layoutProps} />;
    else if (layout === "cinematic") LayoutComponent = <CinematicLayout {...layoutProps} />;
    else if (layout === "grid") LayoutComponent = <GridLayout {...layoutProps} />;
    else if (layout === "split") LayoutComponent = <SplitLayout {...layoutProps} />;
    else if (layout === "cylinder") LayoutComponent = <CylinderLayout {...layoutProps} />;

    return (
      <>
        {/* fullscreen / split / cylinder / grid 는 layout 내부에 자체 intro 보유. cinematic 만 wrapper intro 사용 */}
        {layout === "cinematic" && <div className={styles.altIntro}>{introBlock}</div>}
        {LayoutComponent}
        <WorkTransitionOverlay data={transitionData} plain />
      </>
    );
  }

  const trackProjects = isVerticalLayout ? projects : infiniteScroll ? allProjects : projects;
  // 무한 스크롤이면 가운데 세트가 첫 화면이라 그쪽 첫 카드를 우선 로드한다
  const priorityIndex = infiniteScroll ? PROJECT_COUNT * Math.floor(INFINITE_SCROLL_SETS / 2) : 0;

  return (
    <section className={styles.gallery} ref={galleryRef}>
      <div className={styles.galleryTrack}>
        <div className={styles.gallerySlider} ref={sliderRef}>
          {trackProjects.map((project, index) => (
            <Fragment key={`${project.id}-${index}`}>
              {/* 인트로: 각 프로젝트 세트 시작 부분에 표시 */}
              {index % PROJECT_COUNT === 0 && introBlock}
              <WorksFlowCard
                project={project}
                index={index}
                layoutVariant={(index % 6) + 1}
                priority={index === priorityIndex}
                slotClassName={styles.projectSlot}
                registerCard={registerCard}
                onClick={handleCardClick}
                onPressStart={handlePressStart}
                onPressEnd={handlePressEnd}
              />
              {/* 크레딧 패널: 각 세트의 마지막 프로젝트 뒤에 배치 */}
              {(index + 1) % PROJECT_COUNT === 0 && (
                <CreditsPanel className={styles.creditsPanel} />
              )}
            </Fragment>
          ))}
        </div>
      </div>

      <WorksActiveInfo projects={projects} activeIndex={activeIndex} hidden={introVisible} />
      <WorkTransitionOverlay data={transitionData} />
    </section>
  );
}
