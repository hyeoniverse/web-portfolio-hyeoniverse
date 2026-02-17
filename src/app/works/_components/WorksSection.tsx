"use client";

import {
  useRef,
  useLayoutEffect,
  useState,
  useEffect,
  useCallback,
  Fragment,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "@/providers/LenisProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { siteConfig } from "@/config/site.config";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  projects,
  allProjects,
  Project,
  PROJECT_COUNT,
  INFINITE_SCROLL_SETS,
  LONG_PRESS_DURATION,
  INITIAL_MARGIN,
} from "@/data/projects";
import CreditsFooter from "@/components/layout/CreditsFooter/CreditsFooter";
import styles from "./WorksSection.module.css";

// GSAP 플러그인 등록
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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

// 애니메이션 상수
const SCROLL_LERP = 0.08;
const VELOCITY_DECAY = 0.96;
const MOUSE_EFFECT_RADIUS = 500;
const infiniteScroll = siteConfig.works.infiniteScroll;
const MAX_CARD_OFFSET = 12;
const MOUSE_SENSITIVITY = 0.012;
const IMAGE_PARALLAX_MULTIPLIER = 1.3;

export default function WorksSection() {
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
  const router = useRouter();
  const { t, language } = useLanguage();
  const { setInfinite } = useLenis();
  const { isMobile: isVerticalLayout } = useIsMobile(768, 700);

  // 마운트 시 Lenis 무한 스크롤 비활성화
  // useLayoutEffect 사용: cleanup이 다음 페이지의 useLayoutEffect 전에 실행되어
  // ScrollTrigger가 올바른 Lenis 상태에서 생성되도록 보장
  useLayoutEffect(() => {
    setInfinite(false);
    const timer = setTimeout(() => ScrollTrigger.refresh(), 100);
    return () => {
      clearTimeout(timer);
      setInfinite(true);
    };
  }, [setInfinite]);

  // 브라우저 리사이즈 시 페이지 리로드 (수평 스크롤 레이아웃 재계산)
  useEffect(() => {
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
  }, []);

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
      }));
      const imageOffsets = cardImages.map(() => ({
        x: 0,
        y: 0,
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

          const scale = parseFloat(card.dataset.hoverScale || "1");
          gsap.set(card, { x: cardOffsets[i].x, y: cardOffsets[i].y, scale });

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

            gsap.set(cardImages[i], {
              x: imageOffset + imageOffsets[i].x,
              y: imageOffsets[i].y,
              scale: 1.2,
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
  }, [isVerticalLayout]);

  // 네비게이션 핸들러
  const triggerTransition = useCallback(
    (index: number, project: Project) => {
      const card = cardRefs.current.get(index);
      if (!card) return;

      setTransitionData({
        id: project.id,
        image: project.image,
        rect: card.getBoundingClientRect(),
      });

      setTimeout(() => router.push(`/works/${project.id}`), 800);
    },
    [router],
  );

  const handleCardClick = useCallback(
    (index: number, project: Project) => {
      if (transitionData) return;

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
    [transitionData, pressedCard, triggerTransition],
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

  // 프로젝트 클래스명 가져오기 헬퍼
  const getProjectClassName = (project: Project, index: number) => {
    const sizeClass = `size${project.size.charAt(0).toUpperCase()}${project.size.slice(1)}`;
    const layoutClass = `layout${(index % 6) + 1}`;
    return `${styles.project} ${styles[sizeClass]} ${styles[layoutClass]}`;
  };

  const introBlock = (
    <div className={styles.intro}>
      <span className={styles.introLabel}>{t("works.introLabel")}</span>
      <h1 className={styles.introTitle}>{t("works.introTitle")}</h1>
      <span className={styles.introTagline}>{t("works.introTagline")}</span>
      <div className={styles.introDivider} />
      <p className={styles.introDesc}>{t("works.introDesc")}</p>
      <p className={styles.introDetail}>{t("works.introDetail")}</p>
      <div className={styles.introStats}>
        <div className={styles.introStat}>
          <span className={styles.introStatNumber}>
            {String(PROJECT_COUNT).padStart(2, "0")}
          </span>
          <span className={styles.introStatLabel}>
            {t("works.stats.projects")}
          </span>
        </div>
        <div className={styles.introStatDivider} />
        <div className={styles.introStat}>
          <span className={styles.introStatNumber}>05</span>
          <span className={styles.introStatLabel}>
            {t("works.stats.clients")}
          </span>
        </div>
      </div>
      <span className={styles.introScope}>{t("works.introScope")}</span>
      <blockquote className={styles.introQuote}>
        {t("works.introQuote")}
      </blockquote>
    </div>
  );

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
                className={getProjectClassName(project, index)}
              >
              {/* 메타데이터 */}
              <span className={styles.metaNumber}>{project.number}</span>
              <span className={styles.metaCategory}>{project.category.en}</span>

              {/* 카드 */}
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
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 500px"
                    className={styles.cardImage}
                    priority={index === (infiniteScroll ? PROJECT_COUNT * Math.floor(INFINITE_SCROLL_SETS / 2) : 0)}
                  />
                </div>
                <div className={styles.cardBorder} />
                <div className={styles.cardOverlay}>
                  <h3 className={styles.metaTitle}>{project.title}</h3>
                  <span className={styles.metaSubtitle}>
                    {project.subtitle.en}
                  </span>
                  <span className={styles.metaYear}>{project.year}</span>
                </div>
              </article>

              {/* 추가 메타데이터 */}
              <div className={styles.metaTech}>
                {project.tech.slice(0, 2).map((tech: string, i: number) => (
                  <span key={i}>#{tech}</span>
                ))}
              </div>
              <span className={styles.metaRole}>{project.role.en}</span>
              <p className={styles.metaDesc}>{project.description[language]}</p>
            </div>
            {/* 크레딧 패널: 각 세트의 마지막 프로젝트 뒤에 배치 */}
            {(index + 1) % PROJECT_COUNT === 0 && (
              <div className={styles.creditsPanel}>
                <CreditsFooter variant="panel" />
              </div>
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
            <h2 className={styles.activeTitle}>
              {projects[activeIndex]?.title}
            </h2>
            <p className={styles.activeSubtitle}>
              {projects[activeIndex]?.subtitle.en}
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
