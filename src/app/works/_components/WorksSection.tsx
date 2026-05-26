"use client";

import {
  useRef,
  useLayoutEffect,
  useState,
  useEffect,
  useCallback,
  Fragment,
} from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import Image from "next/image";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "@/providers/LenisProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";
import { useLanguage } from "@/providers/LanguageProvider";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  projects as staticProjects,
  Project,
  INFINITE_SCROLL_SETS,
  LONG_PRESS_DURATION,
  INITIAL_MARGIN,
} from "@/data/projects";
import CreditsPanel from "@/components/layout/CreditsFooter/CreditsPanel";
import {
  SCROLL_LERP,
  VELOCITY_DECAY,
  MOUSE_EFFECT_RADIUS,
  MAX_CARD_OFFSET,
  MOUSE_SENSITIVITY,
  IMAGE_PARALLAX_MULTIPLIER,
  META_REVEAL_THRESHOLD,
} from "../_constants";
import FullscreenLayout from "./layouts/FullscreenLayout";
import CinematicLayout from "./layouts/CinematicLayout";
import GridLayout from "./layouts/GridLayout";
import SplitLayout from "./layouts/SplitLayout";
const CylinderLayout = dynamic(() => import("./layouts/CylinderLayout"), { ssr: false });
import styles from "./WorksSection.module.css";

// 타입
interface TransitionData {
  id: string;
  image: string;
  rect: DOMRect;
}

interface PressedCard {
  index: number;
  project: Project;
}

interface WorksSectionProps {
  projects?: Project[];
}

type LayoutType = "flow" | "fullscreen" | "cinematic" | "grid" | "split" | "cylinder";

export default function WorksSection({ projects: projectsProp }: WorksSectionProps) {
  const projects = projectsProp ?? staticProjects;
  const PROJECT_COUNT = projects.length;
  const allProjects = Array(INFINITE_SCROLL_SETS).fill(projects).flat();

  const { t } = useLanguage();
  const siteConfig = useSiteConfig();
  const infiniteScroll = siteConfig.works.infiniteScroll;
  const searchParams = useSearchParams();
  const configLayout = (siteConfig.works as Record<string, unknown>).layout as LayoutType | undefined;
  const layout = (searchParams.get("layout") as LayoutType) || configLayout || "flow";

  // 레퍼런스
  const galleryRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());
  const pressStartRef = useRef<number | null>(null);
  const pressRafRef = useRef<number | null>(null);

  // 상태
  const [activeIndex, setActiveIndex] = useState(0);
  const [transitionData, setTransitionData] = useState<TransitionData | null>(
    null,
  );
  const [pressedCard, setPressedCard] = useState<PressedCard | null>(null);
  const [introVisible, setIntroVisible] = useState(true);

  // 훅
  const { setInfinite } = useLenis();
  const { isMobile: isVerticalLayout } = useIsMobile(1024, 700);
  const { navigateWithTransition, isTransitioning } = usePageTransition();

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

  // 수평 스크롤 애니메이션 (데스크탑 전용)
  useLayoutEffect(() => {
    if (isVerticalLayout) return;

    const gallery = galleryRef.current;
    const slider = sliderRef.current;
    if (!gallery || !slider) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(`.${styles.card}`, slider);
      const cardImages = gsap.utils.toArray<HTMLElement>(
        `.${styles.cardImage}`,
        slider,
      );
      const projectItems = gsap.utils.toArray<HTMLElement>(
        `.${styles.project}`,
        slider,
      );

      if (cards.length === 0) return;

      // 시작 위치: 무한이면 중간 인트로, 아니면 첫 인트로
      const introEls = slider.querySelectorAll(`.${styles.intro}`);
      const startIntro = infiniteScroll
        ? (introEls[Math.floor(introEls.length / 2)] as HTMLElement)
        : (introEls[0] as HTMLElement);
      const initialX = startIntro
        ? -(startIntro.offsetLeft - INITIAL_MARGIN)
        : -(projectItems[0].offsetLeft - INITIAL_MARGIN);

      // 무한 래핑을 위한 한 세트 너비 계산
      let oneSetWidth = 0;
      if (introEls.length >= 2) {
        oneSetWidth =
          (introEls[1] as HTMLElement).offsetLeft -
          (introEls[0] as HTMLElement).offsetLeft;
      }

      // 전체 트랙 너비 (클램프용)
      const totalWidth = slider.scrollWidth;

      // 스크롤 상태
      let scrollX = 0;
      let targetScrollX = 0;
      let velocity = 0;
      let imageOffset = 0;
      let targetImageOffset = 0;

      // 마우스 상태
      let mouseX = 0;
      let mouseY = 0;
      let lastMouseX = 0;
      let lastMouseY = 0;
      let lastMouseTime = performance.now();
      let mouseVelocityX = 0;
      let mouseVelocityY = 0;

      // 요소별 오프셋
      const cardOffsets = cards.map(() => ({
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        rotateX: 0,
        rotateY: 0,
        targetRotateX: 0,
        targetRotateY: 0,
        hoverScale: 1,
        targetHoverScale: 1,
      }));
      const imageOffsets = cardImages.map(() => ({
        x: 0,
        y: 0,
        scale: 1.2,
        targetX: 0,
        targetY: 0,
      }));

      // 이벤트 핸들러
      const handleMouseMove = (e: MouseEvent) => {
        const now = performance.now();
        const dt = (now - lastMouseTime) / 1000;

        mouseX = e.clientX;
        mouseY = e.clientY;

        if (dt > 0) {
          mouseVelocityX = (e.clientX - lastMouseX) / dt;
          mouseVelocityY = (e.clientY - lastMouseY) / dt;
        }

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        lastMouseTime = now;
      };

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        targetScrollX += e.deltaY;
      };

      gallery.addEventListener("mousemove", handleMouseMove);
      gallery.addEventListener("wheel", handleWheel, { passive: false });

      // 초기 위치 설정
      gsap.set(slider, { x: initialX });

      // 애니메이션 루프
      const animate = () => {
        // 부드러운 스크롤 보간
        const prevScrollX = scrollX;
        scrollX += (targetScrollX - scrollX) * SCROLL_LERP;
        velocity = scrollX - prevScrollX;

        // 이미지 패럴랙스 + 속도 기울기
        targetImageOffset = gsap.utils.clamp(-80, 80, -velocity * 2.5);
        imageOffset += (targetImageOffset - imageOffset) * 0.08;

        // 무한 스크롤 래핑 또는 클램프
        if (infiniteScroll && oneSetWidth > 0) {
          while (scrollX > oneSetWidth * 3) {
            scrollX -= oneSetWidth;
            targetScrollX -= oneSetWidth;
          }
          while (scrollX < -oneSetWidth * 3) {
            scrollX += oneSetWidth;
            targetScrollX += oneSetWidth;
          }
        } else if (!infiniteScroll) {
          const maxScroll = totalWidth - window.innerWidth + initialX;
          targetScrollX = gsap.utils.clamp(0, maxScroll, targetScrollX);
          scrollX = gsap.utils.clamp(0, maxScroll, scrollX);
        }

        // 슬라이더 위치 업데이트
        gsap.set(slider, { x: initialX - scrollX });

        // 활성 인덱스 업데이트 (카드 왼쪽이 뷰포트에 진입하면 전환)
        let latestIndex = 0;
        for (let i = 0; i < cards.length; i++) {
          const rect = cards[i].getBoundingClientRect();
          if (rect.left < window.innerWidth) {
            latestIndex = i;
          }
        }
        setActiveIndex(latestIndex % PROJECT_COUNT);

        // intro가 화면에 보이면 고정 타이틀 숨김
        let introOnScreen = false;
        for (let i = 0; i < introEls.length; i++) {
          const rect = (introEls[i] as HTMLElement).getBoundingClientRect();
          if (rect.right > 0 && rect.left < window.innerWidth) {
            introOnScreen = true;
            break;
          }
        }
        setIntroVisible(introOnScreen);

        // 마우스 속도 감쇄
        mouseVelocityX *= VELOCITY_DECAY;
        mouseVelocityY *= VELOCITY_DECAY;

        // 카드별 효과 업데이트
        cards.forEach((card, i) => {
          const rect = card.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const distance = Math.hypot(mouseX - centerX, mouseY - centerY);
          const normalizedDist = Math.min(1, distance / MOUSE_EFFECT_RADIUS);
          const strength = Math.pow(1 - normalizedDist, 2);

          // 카드 오프셋
          cardOffsets[i].targetX = gsap.utils.clamp(
            -MAX_CARD_OFFSET,
            MAX_CARD_OFFSET,
            mouseVelocityX * MOUSE_SENSITIVITY * strength,
          );
          cardOffsets[i].targetY = gsap.utils.clamp(
            -MAX_CARD_OFFSET,
            MAX_CARD_OFFSET,
            mouseVelocityY * MOUSE_SENSITIVITY * strength,
          );
          cardOffsets[i].x +=
            (cardOffsets[i].targetX - cardOffsets[i].x) * 0.04;
          cardOffsets[i].y +=
            (cardOffsets[i].targetY - cardOffsets[i].y) * 0.04;

          // 3D tilt — 마우스가 카드 위에 있을 때
          const isHovering = mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom;
          if (isHovering) {
            const relX = (mouseX - rect.left) / rect.width - 0.5; // -0.5 ~ 0.5
            const relY = (mouseY - rect.top) / rect.height - 0.5;
            cardOffsets[i].targetRotateY = relX * 8; // max ±4deg
            cardOffsets[i].targetRotateX = -relY * 6; // max ±3deg
            cardOffsets[i].targetHoverScale = 1.02;
          } else {
            cardOffsets[i].targetRotateX = 0;
            cardOffsets[i].targetRotateY = 0;
            cardOffsets[i].targetHoverScale = 1;
          }
          cardOffsets[i].rotateX += (cardOffsets[i].targetRotateX - cardOffsets[i].rotateX) * 0.08;
          cardOffsets[i].rotateY += (cardOffsets[i].targetRotateY - cardOffsets[i].rotateY) * 0.08;
          cardOffsets[i].hoverScale += (cardOffsets[i].targetHoverScale - cardOffsets[i].hoverScale) * 0.08;

          const scale = parseFloat(card.dataset.hoverScale || "1") * cardOffsets[i].hoverScale;
          gsap.set(card, {
            x: cardOffsets[i].x,
            y: cardOffsets[i].y,
            scale,
            rotateX: cardOffsets[i].rotateX,
            rotateY: cardOffsets[i].rotateY,
          });

          // 이미지 오프셋 (패럴랙스)
          if (cardImages[i]) {
            imageOffsets[i].targetX =
              cardOffsets[i].targetX * IMAGE_PARALLAX_MULTIPLIER;
            imageOffsets[i].targetY =
              cardOffsets[i].targetY * IMAGE_PARALLAX_MULTIPLIER;
            imageOffsets[i].x +=
              (imageOffsets[i].targetX - imageOffsets[i].x) * 0.035;
            imageOffsets[i].y +=
              (imageOffsets[i].targetY - imageOffsets[i].y) * 0.035;

            const imgScale = isHovering ? 1.3 : 1.2;
            imageOffsets[i].scale = (imageOffsets[i].scale || 1.2) + (imgScale - (imageOffsets[i].scale || 1.2)) * 0.06;
            gsap.set(cardImages[i], {
              x: imageOffset + imageOffsets[i].x,
              y: imageOffsets[i].y,
              scale: imageOffsets[i].scale,
            });
          }

          // 메타데이터 reveal — 카드가 뷰포트에 들어오면 fade in
          const project = card.closest(`.${styles.project}`) as HTMLElement | null;
          if (project) {
            const rect = card.getBoundingClientRect();
            const viewportCenter = window.innerWidth * META_REVEAL_THRESHOLD;
            const progress = gsap.utils.clamp(0, 1, 1 - (rect.left - viewportCenter * 0.3) / viewportCenter);
            const metas = project.querySelectorAll(`.${styles.metaCategory}, .${styles.metaYear}, .${styles.metaTech}, .${styles.metaRole}, .${styles.metaDesc}`);
            metas.forEach((meta, mi) => {
              const delay = mi * 0.06;
              const p = gsap.utils.clamp(0, 1, (progress - delay) / (1 - delay));
              gsap.set(meta, { opacity: p, y: (1 - p) * 20 });
            });
          }
        });

        rafId = requestAnimationFrame(animate);
      };

      let rafId = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(rafId);
        gallery.removeEventListener("mousemove", handleMouseMove);
        gallery.removeEventListener("wheel", handleWheel);
      };
    }, gallery);

    return () => {
      ctx.revert();
      ScrollTrigger.refresh();
    };
  }, [isVerticalLayout, infiniteScroll, PROJECT_COUNT]);

  // 모바일 세로 스크롤 — 이미지 velocity 패럴랙스
  useLayoutEffect(() => {
    if (!isVerticalLayout) return;
    const slider = sliderRef.current;
    if (!slider) return;

    const cards = gsap.utils.toArray<HTMLElement>(`.${styles.card}`, slider);
    const cardImages = cards.map((c) => c.querySelector(`.${styles.cardImageWrap}`) as HTMLElement | null);

    let lastScrollY = window.scrollY;
    let velocity = 0;
    let imageOffset = 0;
    let targetImageOffset = 0;
    let rafId: number;

    const animate = () => {
      const scrollY = window.scrollY;
      velocity = scrollY - lastScrollY;
      lastScrollY = scrollY;

      targetImageOffset = gsap.utils.clamp(-40, 40, -velocity * 1.5);
      imageOffset += (targetImageOffset - imageOffset) * 0.08;

      cardImages.forEach((img) => {
        if (img) gsap.set(img, { y: imageOffset, scale: 1.05 });
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isVerticalLayout]);

  // 네비게이션 핸들러
  const triggerTransition = useCallback(
    (index: number, project: Project) => {
      const card = cardRefs.current.get(index);
      if (!card) return;

      const rect = card.getBoundingClientRect();
      setTransitionData({ id: project.id, image: project.image, rect });
      navigateWithTransition(`/works/${project.id}`, project.image, rect);
    },
    [navigateWithTransition],
  );

  const handleCardClick = useCallback(
    (index: number, project: Project) => {
      if (transitionData || isTransitioning) return;

      // 진행 중인 프레스 애니메이션 취소
      if (pressRafRef.current) cancelAnimationFrame(pressRafRef.current);

      // 프레스 상태 정리
      if (pressedCard) {
        const card = cardRefs.current.get(pressedCard.index);
        if (card) {
          delete card.dataset.hoverScale;
          card.classList.remove(styles.cardActive);
        }
      }
      setPressedCard(null);
      pressStartRef.current = null;

      triggerTransition(index, project);
    },
    [transitionData, pressedCard, triggerTransition, isTransitioning],
  );

  const handlePressStart = useCallback(
    (index: number, project: Project) => {
      if (transitionData) return;

      const card = cardRefs.current.get(index);
      if (!card) return;

      setPressedCard({ index, project });
      pressStartRef.current = performance.now();
      card.classList.add(styles.cardActive);
      card.dataset.hoverScale = "1";

      const animatePress = () => {
        if (!pressStartRef.current) return;

        const elapsed = performance.now() - pressStartRef.current;
        const progress = Math.min(elapsed / LONG_PRESS_DURATION, 1);

        card.dataset.hoverScale = String(1 + progress * 0.5);

        if (progress >= 1) {
          triggerTransition(index, project);
          setPressedCard(null);
          pressStartRef.current = null;
          delete card.dataset.hoverScale;
          card.classList.remove(styles.cardActive);
          return;
        }

        pressRafRef.current = requestAnimationFrame(animatePress);
      };

      pressRafRef.current = requestAnimationFrame(animatePress);
    },
    [transitionData, triggerTransition],
  );

  const handlePressEnd = useCallback(() => {
    if (pressRafRef.current) cancelAnimationFrame(pressRafRef.current);

    if (pressedCard) {
      const card = cardRefs.current.get(pressedCard.index);
      if (card) {
        delete card.dataset.hoverScale;
        card.classList.remove(styles.cardActive);
      }
    }

    pressStartRef.current = null;
    setPressedCard(null);
  }, [pressedCard]);

  // 대체 레이아웃 공통 클릭 핸들러
  const handleLayoutProjectClick = useCallback((id: string, rect: DOMRect, image: string) => {
    setTransitionData({ id, image, rect });
    navigateWithTransition(`/works/${id}`, image, rect);
  }, [navigateWithTransition]);

  const w = siteConfig.works;

  const introBlock = (
    <div className={styles.intro}>
      <span className={styles.introLabel}><T ko={w.introLabel_ko} en={w.introLabel} /></span>
      <h1 className={styles.introTitle}><T ko={w.introTitle_ko} en={w.introTitle} /></h1>
      <span className={styles.introTagline}><T ko={w.introTagline_ko} en={w.introTagline} /></span>
      <div className={styles.introDivider} />
      <p className={styles.introDesc}><T ko={w.introDesc_ko} en={w.introDesc} /></p>
      <p className={styles.introDetail}><T ko={w.introDetail_ko} en={w.introDetail} /></p>
      <div className={styles.introStats}>
        <div className={styles.introStat}>
          <span className={styles.introStatNumber}>
            {String(PROJECT_COUNT).padStart(2, "0")}
          </span>
          <span className={styles.introStatLabel}>
            <T ko={w.statsProjects_ko} en={w.statsProjects} />
          </span>
        </div>
        <div className={styles.introStatDivider} />
        <div className={styles.introStat}>
          <span className={styles.introStatNumber}>05</span>
          <span className={styles.introStatLabel}>
            <T ko={w.statsClients_ko} en={w.statsClients} />
          </span>
        </div>
      </div>
      <span className={styles.introScope}><T ko={w.introScope_ko} en={w.introScope} /></span>
      <blockquote className={styles.introQuote}>
        <T ko={w.introQuote_ko} en={w.introQuote} />
      </blockquote>
    </div>
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
        {layout === "cinematic" && (
          <div className={styles.altIntro}>
            {introBlock}
          </div>
        )}
        {LayoutComponent}
        {/* 페이지 전환 */}
        <AnimatePresence>
          {transitionData && (
            <motion.div
              style={{ position: "fixed", inset: 0, zIndex: 9999, background: "var(--bg-primary)", pointerEvents: "none" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // 프로젝트 클래스명 가져오기 헬퍼
  const getProjectClassName = (project: Project) => {
    const sizeClass = `size${project.size.charAt(0).toUpperCase()}${project.size.slice(1)}`;
    return `${styles.project} ${styles[sizeClass]}`;
  };

  return (
    <>
    <section className={styles.gallery} ref={galleryRef}>
      {/* 갤러리 트랙 */}
      <div className={styles.galleryTrack}>
        <div className={styles.gallerySlider} ref={sliderRef}>
          {(isVerticalLayout ? projects : infiniteScroll ? allProjects : projects).map((project, index) => (
            <Fragment key={`${project.id}-${index}`}>
              {/* 인트로: 각 프로젝트 세트 시작 부분에 표시 */}
              {index % PROJECT_COUNT === 0 && introBlock}
              <div
                className={getProjectClassName(project)}
                data-layout={(index % 6) + 1}
              >
              {/* 카드 */}
              <Tooltip content={`${project.title} · ${t("tooltip.viewProject")}`}>
              <article
                ref={(el) => {
                  if (el) cardRefs.current.set(index, el);
                }}
                className={styles.card}
                data-more="true"
                data-clickable="true"
                onClick={() => handleCardClick(index, project)}
                onMouseDown={() => handlePressStart(index, project)}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={() => handlePressStart(index, project)}
                onTouchEnd={handlePressEnd}
              >
                <div className={styles.cardImageWrap}>
                  <ProgressiveImage
                    src={project.image}
                    alt={project.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 500px"
                    className={styles.cardImage}
                    priority={index === (infiniteScroll ? PROJECT_COUNT * Math.floor(INFINITE_SCROLL_SETS / 2) : 0)}
                  />
                </div>
                <div className={styles.cardBorder} />
                <span className={styles.metaNumber}>{project.number}</span>
                <div className={styles.cardOverlay}>
                  <h3 className={styles.metaTitle}>{project.title}</h3>
                  <span className={styles.metaSubtitle}>
                    <T ko={project.subtitle.ko} en={project.subtitle.en} />
                  </span>
                  <span className={styles.metaYear}>{project.year}</span>
                </div>
              </article>
              </Tooltip>

              {/* 메타 그룹 (카드 옆 세로 배치용) */}
              <div className={styles.metaGroup}>
                <span className={styles.metaCategory}><T ko={project.category.ko} en={project.category.en} /></span>
                <span className={`${styles.metaYear} ${styles.metaYearDesktop}`}>{project.year}</span>
                <div className={styles.metaTech}>
                  {project.tech.slice(0, 2).map((tech: string, i: number) => (
                    <span key={i}>#{tech}</span>
                  ))}
                </div>
                <span className={styles.metaRole}><T ko={project.role.ko} en={project.role.en} /></span>
                <p className={styles.metaDesc}><T ko={project.description.ko} en={project.description.en} /></p>
              </div>
            </div>
            {/* 크레딧 패널: 각 세트의 마지막 프로젝트 뒤에 배치 */}
            {(index + 1) % PROJECT_COUNT === 0 && (
              <CreditsPanel className={styles.creditsPanel} />
            )}
            </Fragment>
          ))}
        </div>
      </div>

      {/* 활성 프로젝트 정보 */}
      <div className={styles.activeInfo} style={{ opacity: introVisible ? 0 : 1, transition: 'opacity 0.4s ease' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={styles.activeInfoInner}
          >
            <span className={styles.activeNumber}>{projects[activeIndex]?.number}</span>
            <h2 className={styles.activeTitle}>
              {projects[activeIndex]?.title}
            </h2>
            <p className={styles.activeSubtitle}>
              <T ko={projects[activeIndex]?.subtitle.ko} en={projects[activeIndex]?.subtitle.en} />
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 페이지 전환 */}
      <AnimatePresence>
        {transitionData && (
          <motion.div
            className={styles.transition}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className={styles.transitionImage}
              initial={{
                top: transitionData.rect.top,
                left: transitionData.rect.left,
                width: transitionData.rect.width,
                height: transitionData.rect.height,
                borderRadius: 8,
              }}
              animate={{
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                borderRadius: 0,
              }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            >
              <Image
                src={transitionData.image}
                alt="Transition"
                fill
                sizes="100vw"
                style={{ objectFit: "cover" }}
                priority
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
    </>
  );
}
