"use client";

import { useRef, useLayoutEffect, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
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
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&h=1000&fit=crop",
    size: "large",
  },
  {
    id: "2",
    number: "02",
    title: "Fitil App",
    category: "UX/UI / Mobile",
    year: "2023",
    image:
      "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&h=1000&fit=crop",
    size: "small",
  },
  {
    id: "3",
    number: "03",
    title: "Amway Digital",
    category: "E-commerce",
    year: "2023",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=1000&fit=crop",
    size: "medium",
  },
  {
    id: "4",
    number: "04",
    title: "Nova Finance",
    category: "Dashboard",
    year: "2024",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=1000&fit=crop",
    size: "tall",
  },
  {
    id: "5",
    number: "05",
    title: "Luxe Brand",
    category: "Branding",
    year: "2024",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=1000&fit=crop",
    size: "wide",
  },
  {
    id: "6",
    number: "06",
    title: "TechStart",
    category: "Web App",
    year: "2023",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=1000&fit=crop",
    size: "small",
  },
];

// Triple the projects for seamless infinite scroll
const allProjects = [...projects, ...projects, ...projects];

export default function WorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
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

      const scrollDistance = oneSetWidth * 6;

      // Velocity tracking
      let lastProgress = 0;
      let lastTime = performance.now();
      let targetOffset = 0;
      let currentOffset = 0;

      // Start from middle set
      gsap.set(container, { x: -oneSetWidth });

      // Smooth velocity animation loop
      const smoothVelocity = () => {
        // Lerp offset for smooth transition
        currentOffset += (targetOffset - currentOffset) * 0.08;

        // Apply horizontal offset to images based on velocity
        // Scale 1.2 ensures no empty space when moving up to 25px
        cardImages.forEach((img) => {
          gsap.set(img, {
            x: currentOffset,
            scale: 1.2
          });
        });

        requestAnimationFrame(smoothVelocity);
      };

      const rafId = requestAnimationFrame(smoothVelocity);

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

            // Map velocity to horizontal offset (pixels)
            // Positive velocity = scrolling right = image shifts left (negative offset)
            const maxOffset = 25;
            targetOffset = gsap.utils.clamp(-maxOffset, maxOffset, -velocity * 1200);

            // Position within cycle
            const posInCycle = totalScrolled % oneSetWidth;
            const xPos = -(oneSetWidth + posInCycle);

            gsap.set(container, { x: xPos });

            // Progress bar
            const progressInSet = posInCycle / oneSetWidth;
            if (progressBarRef.current) {
              progressBarRef.current.style.width = `${progressInSet * 100}%`;
            }

            // Active card index
            const cardIndex = Math.floor(progressInSet * projects.length);
            setActiveIndex(cardIndex % projects.length);
          },
        },
      });

      // Cleanup RAF on context revert
      return () => {
        cancelAnimationFrame(rafId);
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

  const handleCardClick = (id: string) => {
    router.push(`/works/${id}`);
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
              className={`${styles.card} ${styles[`card${project.size?.charAt(0).toUpperCase()}${project.size?.slice(1)}`]}`}
              onClick={() => handleCardClick(project.id)}
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
    </section>
  );
}
