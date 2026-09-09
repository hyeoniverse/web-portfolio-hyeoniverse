"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback, Fragment } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
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
/* 원통 배치는 코드가 크고 다른 배치에선 안 쓰이므로 따로 떼어 둔다. ssr: false 는 쓰지
   않는다 — 그러면 이 화면 전체가 서버 HTML 에서 빠진다. 3D 부분만 CylinderLayout 안에서
   다시 한 번 ssr: false 로 갈라 놨다. */
const CylinderLayout = dynamic(() => import("./layouts/CylinderLayout"));
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
  const configLayout = (siteConfig.works as Record<string, unknown>).layout as LayoutType | undefined;

  /* ?layout= 은 다른 배치를 미리 볼 때만 쓰는 덮어쓰기다. 그것을 useSearchParams 로 읽으면
     이 화면 전체가 서버에서 그려지지 않는다 — 정적 생성과 함께 쓰면 Next 가 그 아래를
     통째로 브라우저 몫으로 미루기 때문이다(서버가 보내는 HTML 의 글자가 83자였다).
     그래서 기본 배치로 먼저 그리고, 화면이 붙은 뒤 주소에 값이 있으면 그때 바꾼다. */
  const [layoutOverride, setLayoutOverride] = useState<LayoutType | null>(null);
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("layout") as LayoutType | null;
    /* 초기값으로 읽으면 서버(값 없음)와 화면(값 있음)이 어긋나 React 가 트리를 다시 그린다.
       주소를 읽는 일은 화면이 붙은 뒤에만 할 수 있으므로 여기서 상태를 바꾼다. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (v) setLayoutOverride(v);
  }, []);
  const layout = layoutOverride || configLayout || "flow";

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
  /* 첫 화면에 보이는 카드의 표지를 우선 로드한다.
     세로 레이아웃(모바일)은 세트를 한 벌만 그리므로 첫 카드가 곧 첫 화면이다. 가로 무한
     스크롤일 때만 가운데 세트가 첫 화면이라 그쪽 첫 카드를 가리킨다.
     이 구분이 없어서 모바일에서는 인덱스가 카드 수를 넘어가 아무 카드도 우선순위를
     못 받았고, 표지가 lazy 로 남아 화면에 보이는 첫 카드가 5.3초에야 그려졌다. */
  const priorityIndex = isVerticalLayout || !infiniteScroll
    ? 0
    : PROJECT_COUNT * Math.floor(INFINITE_SCROLL_SETS / 2);

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
