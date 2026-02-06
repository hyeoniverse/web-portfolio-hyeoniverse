"use client";

import { useRef, useLayoutEffect, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import styles from "./WorksSection.module.css";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const projects = [
  {
    id: "1",
    number: "01",
    title: "Sakharov Space",
    category: "Branding / Web Design",
    year: "2024",
    image:
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&h=700&fit=crop",
    size: "large",
  },
  {
    id: "2",
    number: "02",
    title: "Fitil App",
    category: "UX/UI / Mobile",
    year: "2023",
    image:
      "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=1200&h=700&fit=crop",
    size: "small",
  },
  {
    id: "3",
    number: "03",
    title: "Amway Digital",
    category: "E-commerce",
    year: "2023",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=700&fit=crop",
    size: "medium",
  },
  {
    id: "4",
    number: "04",
    title: "Nova Finance",
    category: "Dashboard",
    year: "2024",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=700&fit=crop",
    size: "tall",
  },
  {
    id: "5",
    number: "05",
    title: "Luxe Brand",
    category: "Branding",
    year: "2024",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=700&fit=crop",
    size: "wide",
  },
  {
    id: "6",
    number: "06",
    title: "TechStart",
    category: "Web App",
    year: "2023",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=700&fit=crop",
    size: "small",
  },
];

// Quintuple the projects for seamless bidirectional infinite scroll
const allProjects = [...projects, ...projects, ...projects, ...projects, ...projects];

interface TransitionData {
  id: string;
  image: string;
  rect: DOMRect;
}

const LONG_HOVER_DURATION = 2500; // 2.5 seconds for long hover

export default function WorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [transitionData, setTransitionData] = useState<TransitionData | null>(null);
  const [hoveredCard, setHoveredCard] = useState<{ index: number; project: typeof projects[0] } | null>(null);
  const hoverStartRef = useRef<number | null>(null);
  const hoverRafRef = useRef<number | null>(null);
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());
  const router = useRouter();
  const { t } = useLanguage();
  const { setInfinite } = useLenis();

  useEffect(() => {
    setInfinite(false);
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);
    return () => {
      clearTimeout(timer);
      setInfinite(true);
    };
  }, [setInfinite]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const container = containerRef.current;
    if (!section || !container) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(`.${styles.card}`, container);
      const cardImages = gsap.utils.toArray<HTMLElement>(`.${styles.cardImage}`, container);
      if (cards.length === 0) return;

      // Get computed gap
      const computedStyle = window.getComputedStyle(container);
      const gap = parseFloat(computedStyle.gap) || 40;

      // Calculate exact width of one set
      let oneSetWidth = 0;
      for (let i = 0; i < projects.length; i++) {
        oneSetWidth += cards[i].offsetWidth + gap;
      }

      // Longer scroll distance for bidirectional scrolling
      const scrollDistance = oneSetWidth * 10;
      const middleScrollPosition = scrollDistance / 2;

      // Scroll velocity tracking
      let lastProgress = 0;
      let lastTime = performance.now();
      let targetImageOffset = 0;
      let currentImageOffset = 0;

      // Mouse tracking
      let mouseX = 0;
      let mouseY = 0;
      let lastMouseX = 0;
      let lastMouseY = 0;
      let lastMouseTime = performance.now();
      let mouseVelocityX = 0;
      let mouseVelocityY = 0;

      // Per-card offset tracking
      const cardOffsets = cards.map(() => ({ x: 0, y: 0, targetX: 0, targetY: 0 }));
      const imageOffsets = cardImages.map(() => ({ x: 0, y: 0, targetX: 0, targetY: 0 }));

      // Mouse move handler
      const handleMouseMove = (e: MouseEvent) => {
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastMouseTime) / 1000;

        mouseX = e.clientX;
        mouseY = e.clientY;

        if (deltaTime > 0) {
          mouseVelocityX = (e.clientX - lastMouseX) / deltaTime;
          mouseVelocityY = (e.clientY - lastMouseY) / deltaTime;
        }

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        lastMouseTime = currentTime;
      };

      // Add mouse listener to section
      section.addEventListener("mousemove", handleMouseMove);

      // Start from middle set (2nd set of 5)
      gsap.set(container, { x: -oneSetWidth * 2 });

      // Smooth animation loop
      const smoothAnimation = () => {
        // Lerp scroll velocity offset
        currentImageOffset += (targetImageOffset - currentImageOffset) * 0.06;

        // Decay mouse velocity (slower for smoother feel)
        mouseVelocityX *= 0.96;
        mouseVelocityY *= 0.96;

        // Calculate per-card offsets based on distance to mouse
        const effectRadius = 500; // pixels
        const maxOffset = 12;
        const sensitivity = 0.012;

        cards.forEach((card, i) => {
          const rect = card.getBoundingClientRect();
          const cardCenterX = rect.left + rect.width / 2;
          const cardCenterY = rect.top + rect.height / 2;

          const distX = mouseX - cardCenterX;
          const distY = mouseY - cardCenterY;
          const distance = Math.sqrt(distX * distX + distY * distY);

          // Calculate effect strength based on distance with easing
          const normalizedDist = Math.min(1, distance / effectRadius);
          const strength = Math.pow(1 - normalizedDist, 2); // Ease out quad

          // Apply velocity-based offset with distance falloff
          cardOffsets[i].targetX = gsap.utils.clamp(-maxOffset, maxOffset, mouseVelocityX * sensitivity * strength);
          cardOffsets[i].targetY = gsap.utils.clamp(-maxOffset, maxOffset, mouseVelocityY * sensitivity * strength);

          // Slower lerp for smoother movement
          cardOffsets[i].x += (cardOffsets[i].targetX - cardOffsets[i].x) * 0.04;
          cardOffsets[i].y += (cardOffsets[i].targetY - cardOffsets[i].y) * 0.04;

          // Check for hover scale from data attribute
          const hoverScale = parseFloat(card.dataset.hoverScale || '1');

          // Apply to card (including hover scale for entire card)
          gsap.set(card, {
            x: cardOffsets[i].x,
            y: cardOffsets[i].y,
            scale: hoverScale
          });

          // Image moves slightly more + scroll velocity effect
          if (cardImages[i]) {
            imageOffsets[i].targetX = cardOffsets[i].targetX * 1.3;
            imageOffsets[i].targetY = cardOffsets[i].targetY * 1.3;

            imageOffsets[i].x += (imageOffsets[i].targetX - imageOffsets[i].x) * 0.035;
            imageOffsets[i].y += (imageOffsets[i].targetY - imageOffsets[i].y) * 0.035;

            // Image has base scale of 1.2 for parallax effect
            gsap.set(cardImages[i], {
              x: currentImageOffset + imageOffsets[i].x,
              y: imageOffsets[i].y,
              scale: 1.2
            });
          }
        });

        requestAnimationFrame(smoothAnimation);
      };

      const rafId = requestAnimationFrame(smoothAnimation);

      gsap.to(container, {
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${scrollDistance}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const progress = self.progress;
            const currentTime = performance.now();
            const totalScrolled = progress * scrollDistance;

            // Calculate velocity
            const deltaProgress = progress - lastProgress;
            const deltaTime = (currentTime - lastTime) / 1000; // seconds

            let velocity = 0;
            if (deltaTime > 0) {
              velocity = deltaProgress / deltaTime;
            }

            lastProgress = progress;
            lastTime = currentTime;

            // Map scroll velocity to horizontal image offset
            const maxOffset = 25;
            targetImageOffset = gsap.utils.clamp(-maxOffset, maxOffset, -velocity * 1200);

            // Position within cycle (handles both directions)
            // Offset by middle position to center the scroll range
            const adjustedScroll = totalScrolled - middleScrollPosition;
            let posInCycle = adjustedScroll % oneSetWidth;
            if (posInCycle < 0) posInCycle += oneSetWidth;
            // Keep within middle sets (2nd and 3rd of 5)
            const xPos = -(oneSetWidth * 2 + posInCycle);

            gsap.set(container, { x: xPos });

            // Progress bar
            const progressInSet = posInCycle / oneSetWidth;
            if (progressBarRef.current) {
              progressBarRef.current.style.width = `${progressInSet * 100}%`;
            }

            // Active card index
            const cardIndex = Math.floor(progressInSet * projects.length);
            setActiveIndex(Math.abs(cardIndex) % projects.length);
          },
        },
      });

      // Scroll to middle position on load for bidirectional scrolling
      const scrollToMiddle = () => {
        const scrollTriggerInstance = ScrollTrigger.getAll().find(
          (st) => st.trigger === section
        );
        if (scrollTriggerInstance) {
          const targetScroll = scrollTriggerInstance.start + middleScrollPosition;
          window.scrollTo(0, targetScroll);
        }
      };

      // Execute after ScrollTrigger is fully ready
      setTimeout(scrollToMiddle, 300);

      // Cleanup on context revert
      return () => {
        cancelAnimationFrame(rafId);
        section.removeEventListener("mousemove", handleMouseMove);
      };
    }, section);

    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    return () => {
      clearTimeout(refreshTimer);
      ctx.revert();
    };
  }, []);

  const handleCardClick = (
    e: React.MouseEvent<HTMLElement>,
    project: (typeof projects)[0]
  ) => {
    // Cancel any hover animation
    if (hoverRafRef.current) {
      cancelAnimationFrame(hoverRafRef.current);
    }

    // Clean up any existing hover state
    if (hoveredCard) {
      const prevCard = cardRefs.current.get(hoveredCard.index);
      if (prevCard) {
        delete prevCard.dataset.hoverScale;
        prevCard.classList.remove(styles.cardHovering);
      }
    }
    setHoveredCard(null);

    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();

    setTransitionData({
      id: project.id,
      image: project.image,
      rect,
    });

    // Navigate after animation
    setTimeout(() => {
      router.push(`/works/${project.id}`);
    }, 800);
  };

  const triggerTransition = (index: number, project: (typeof projects)[0]) => {
    const card = cardRefs.current.get(index);
    if (!card) return;

    const rect = card.getBoundingClientRect();
    setTransitionData({
      id: project.id,
      image: project.image,
      rect,
    });

    setTimeout(() => {
      router.push(`/works/${project.id}`);
    }, 800);
  };

  const handleCardHoverStart = (index: number, project: (typeof projects)[0]) => {
    if (transitionData) return; // Already transitioning

    const card = cardRefs.current.get(index);
    if (!card) return;

    setHoveredCard({ index, project });
    hoverStartRef.current = performance.now();
    card.classList.add(styles.cardHovering);

    // Set data attribute for GSAP to read
    card.dataset.hoverScale = '1';

    const animateHover = () => {
      if (!hoverStartRef.current) return;

      const elapsed = performance.now() - hoverStartRef.current;
      const progress = Math.min(elapsed / LONG_HOVER_DURATION, 1);

      // Update data attribute that GSAP will read
      const hoverScale = 1 + progress * 0.5; // 1 to 1.5
      card.dataset.hoverScale = String(hoverScale);

      if (progress >= 1) {
        // Trigger page transition
        triggerTransition(index, project);
        setHoveredCard(null);
        hoverStartRef.current = null;
        delete card.dataset.hoverScale;
        card.classList.remove(styles.cardHovering);
        return;
      }

      hoverRafRef.current = requestAnimationFrame(animateHover);
    };

    hoverRafRef.current = requestAnimationFrame(animateHover);
  };

  const handleCardHoverEnd = () => {
    if (hoverRafRef.current) {
      cancelAnimationFrame(hoverRafRef.current);
    }

    // Reset the hover scale data attribute
    if (hoveredCard) {
      const card = cardRefs.current.get(hoveredCard.index);
      if (card) {
        delete card.dataset.hoverScale;
        card.classList.remove(styles.cardHovering);
      }
    }

    hoverStartRef.current = null;
    setHoveredCard(null);
  };

  const currentProject = projects[activeIndex];
  const exploreText = t("works.explore");

  return (
    <section className={styles.section} ref={sectionRef}>
      {/* Current Project Title - Large */}
      <motion.div
        className={styles.currentProject}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <motion.h2
          key={currentProject?.title}
          className={styles.currentTitle}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {currentProject?.title}
        </motion.h2>
        <div className={styles.currentMeta}>
          <motion.span
            key={currentProject?.category}
            className={styles.currentCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {currentProject?.category}
          </motion.span>
          <span className={styles.currentDot} />
          <motion.span
            key={currentProject?.year}
            className={styles.currentYear}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            {currentProject?.year}
          </motion.span>
        </div>
      </motion.div>

      {/* Horizontal Scroll Container */}
      <div className={styles.scrollWrapper}>
        <div className={styles.horizontalContainer} ref={containerRef}>
          {allProjects.map((project, index) => (
            <article
              key={`${project.id}-${index}`}
              ref={(el) => {
                if (el) cardRefs.current.set(index, el);
              }}
              className={`${styles.card} ${styles[`card${project.size?.charAt(0).toUpperCase()}${project.size?.slice(1)}`]}`}
              onClick={(e) => handleCardClick(e, project)}
              onMouseEnter={() => handleCardHoverStart(index, project)}
              onMouseLeave={handleCardHoverEnd}
            >
              {/* Large Number */}
              <div className={styles.cardNumber}>
                <span>{project.number}</span>
              </div>

              {/* Image */}
              <div className={styles.cardImageWrapper}>
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 500px"
                  className={styles.cardImage}
                />
              </div>

              {/* Content Overlay */}
              <div className={styles.cardContent}>
                <div className={styles.cardInfo}>
                  <span className={styles.cardCategory}>{project.category}</span>
                  <h3 className={styles.cardTitle}>{project.title}</h3>
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.cardYear}>{project.year}</span>
                  <div className={styles.cardAction}>
                    <span>{exploreText}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M7 17L17 7M17 7H7M17 7V17"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Hover Frame */}
              <div className={styles.cardFrame} />
            </article>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <motion.div
        className={styles.bottomBar}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} ref={progressBarRef} />
        </div>
        <div className={styles.bottomContent}>
          <span className={styles.bottomHint}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M12 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t("works.scroll")}
          </span>
          <div className={styles.bottomDots}>
            {projects.map((_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ""}`}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Page Transition Overlay */}
      <AnimatePresence>
        {transitionData && (
          <motion.div
            className={styles.transitionOverlay}
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
              transition={{
                duration: 0.8,
                ease: [0.4, 0, 0.2, 1],
              }}
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
  );
}
