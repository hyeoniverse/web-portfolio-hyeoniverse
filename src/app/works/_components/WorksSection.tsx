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
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  projects,
  allProjects,
  Project,
  PROJECT_COUNT,
  LONG_PRESS_DURATION,
  INITIAL_MARGIN,
} from "@/data/projects";
import Footer from "@/components/layout/Footer";
import styles from "./WorksSection.module.css";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Types
interface TransitionData {
  id: string;
  image: string;
  rect: DOMRect;
}

interface PressedCard {
  index: number;
  project: Project;
}

// Animation constants
const SCROLL_LERP = 0.08;
const VELOCITY_DECAY = 0.96;
const MOUSE_EFFECT_RADIUS = 500;
const MAX_CARD_OFFSET = 12;
const MOUSE_SENSITIVITY = 0.012;
const IMAGE_PARALLAX_MULTIPLIER = 1.3;

export default function WorksSection() {
  // Refs
  const galleryRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());
  const pressStartRef = useRef<number | null>(null);
  const pressRafRef = useRef<number | null>(null);

  // State
  const [activeIndex, setActiveIndex] = useState(0);
  const [transitionData, setTransitionData] = useState<TransitionData | null>(
    null,
  );
  const [pressedCard, setPressedCard] = useState<PressedCard | null>(null);
  const [introVisible, setIntroVisible] = useState(true);

  // Hooks
  const router = useRouter();
  const { t, language } = useLanguage();
  const { setInfinite } = useLenis();
  const { isMobile: isVerticalLayout } = useIsMobile();

  // Disable Lenis infinite scroll on mount
  useEffect(() => {
    setInfinite(false);
    const timer = setTimeout(() => ScrollTrigger.refresh(), 100);
    return () => {
      clearTimeout(timer);
      setInfinite(true);
    };
  }, [setInfinite]);

  // Horizontal scroll animation (desktop only)
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

      // Start at the middle intro (one intro per project set)
      const introEls = slider.querySelectorAll(`.${styles.intro}`);
      const middleIntro = introEls[Math.floor(introEls.length / 2)] as HTMLElement;
      const initialX = middleIntro
        ? -(middleIntro.offsetLeft - INITIAL_MARGIN)
        : -(projectItems[PROJECT_COUNT * 5].offsetLeft - INITIAL_MARGIN);

      // Calculate one set width for infinite wrapping
      let oneSetWidth = 0;
      if (introEls.length >= 2) {
        oneSetWidth =
          (introEls[1] as HTMLElement).offsetLeft -
          (introEls[0] as HTMLElement).offsetLeft;
      }

      // Scroll state
      let scrollX = 0;
      let targetScrollX = 0;
      let velocity = 0;
      let imageOffset = 0;
      let targetImageOffset = 0;

      // Mouse state
      let mouseX = 0;
      let mouseY = 0;
      let lastMouseX = 0;
      let lastMouseY = 0;
      let lastMouseTime = performance.now();
      let mouseVelocityX = 0;
      let mouseVelocityY = 0;

      // Per-element offsets
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

      // Event handlers
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

      // Set initial position
      gsap.set(slider, { x: initialX });

      // Animation loop
      const animate = () => {
        // Smooth scroll interpolation
        const prevScrollX = scrollX;
        scrollX += (targetScrollX - scrollX) * SCROLL_LERP;
        velocity = scrollX - prevScrollX;

        // Image parallax + velocity skew
        targetImageOffset = gsap.utils.clamp(-80, 80, -velocity * 2.5);
        imageOffset += (targetImageOffset - imageOffset) * 0.08;

        // Infinite scroll wrapping: when scrolled too far, jump back by one set
        if (oneSetWidth > 0) {
          while (scrollX > oneSetWidth * 3) {
            scrollX -= oneSetWidth;
            targetScrollX -= oneSetWidth;
          }
          while (scrollX < -oneSetWidth * 3) {
            scrollX += oneSetWidth;
            targetScrollX += oneSetWidth;
          }
        }

        // Update slider position
        gsap.set(slider, { x: initialX - scrollX });

        // Update active index (find closest project to viewport center)
        const viewportCenter = window.innerWidth / 2;
        let closestIndex = 0;
        let closestDist = Infinity;
        for (let i = 0; i < projectItems.length; i++) {
          const rect = projectItems[i].getBoundingClientRect();
          const dist = Math.abs(rect.left + rect.width / 2 - viewportCenter);
          if (dist < closestDist) {
            closestDist = dist;
            closestIndex = i;
          }
        }
        setActiveIndex(closestIndex % PROJECT_COUNT);

        // Check if any intro is closer to center than the closest project
        let introCloser = false;
        for (let i = 0; i < introEls.length; i++) {
          const rect = (introEls[i] as HTMLElement).getBoundingClientRect();
          const dist = Math.abs(rect.left + rect.width / 2 - viewportCenter);
          if (dist < closestDist) {
            introCloser = true;
            break;
          }
        }
        setIntroVisible(introCloser);

        // Decay mouse velocity
        mouseVelocityX *= VELOCITY_DECAY;
        mouseVelocityY *= VELOCITY_DECAY;

        // Update per-card effects
        cards.forEach((card, i) => {
          const rect = card.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const distance = Math.hypot(mouseX - centerX, mouseY - centerY);
          const normalizedDist = Math.min(1, distance / MOUSE_EFFECT_RADIUS);
          const strength = Math.pow(1 - normalizedDist, 2);

          // Card offset
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

          // Image offset (parallax)
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

        requestAnimationFrame(animate);
      };

      const rafId = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(rafId);
        gallery.removeEventListener("mousemove", handleMouseMove);
        gallery.removeEventListener("wheel", handleWheel);
      };
    }, gallery);

    return () => ctx.revert();
  }, [isVerticalLayout]);

  // Navigation handlers
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

      // Cancel ongoing press animation
      if (pressRafRef.current) cancelAnimationFrame(pressRafRef.current);

      // Clean up press state
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

  // Helper to get project class names
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
      {/* Gallery Track */}
      <div className={styles.galleryTrack}>
        <div className={styles.gallerySlider} ref={sliderRef}>
          {(isVerticalLayout ? projects : allProjects).map((project, index) => (
            <Fragment key={`${project.id}-${index}`}>
              {/* Intro: appears at the start of each project set */}
              {index % PROJECT_COUNT === 0 && introBlock}
              <div
                className={getProjectClassName(project, index)}
              >
              {/* Metadata */}
              <span className={styles.metaNumber}>{project.number}</span>
              <span className={styles.metaCategory}>{project.category[language]}</span>

              {/* Card */}
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
                  />
                </div>
                <div className={styles.cardBorder} />
                <div className={styles.cardOverlay}>
                  <h3 className={styles.metaTitle}>{project.title}</h3>
                  <span className={styles.metaSubtitle}>
                    {project.subtitle[language]}
                  </span>
                  <span className={styles.metaYear}>{project.year}</span>
                </div>
              </article>

              {/* More Metadata */}
              <div className={styles.metaTech}>
                {project.tech.slice(0, 2).map((tech: string, i: number) => (
                  <span key={i}>#{tech}</span>
                ))}
              </div>
              <span className={styles.metaRole}>{project.role[language]}</span>
              <p className={styles.metaDesc}>{project.description[language]}</p>
            </div>
            </Fragment>
          ))}
        </div>
      </div>

      {/* Active Project Info */}
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
              {projects[activeIndex]?.subtitle[language]}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Page Transition */}
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
    {isVerticalLayout && <Footer />}
    </>
  );
}
