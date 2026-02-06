"use client";

import { useRef, useLayoutEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLanguage } from "@/providers/LanguageProvider";
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
    image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&h=1000&fit=crop",
    description: "A complete brand identity and web experience for a space exploration company.",
    size: "large",
    offset: 0,
  },
  {
    id: "2",
    number: "02",
    title: "Fitil App",
    category: "UX/UI / Mobile",
    year: "2023",
    image: "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&h=1000&fit=crop",
    description: "Mobile fitness application with personalized workout plans.",
    size: "medium",
    offset: 80,
  },
  {
    id: "3",
    number: "03",
    title: "Amway Digital",
    category: "E-commerce",
    year: "2023",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=1000&fit=crop",
    description: "E-commerce platform redesign focusing on user experience.",
    size: "small",
    offset: -60,
  },
  {
    id: "4",
    number: "04",
    title: "Nova Finance",
    category: "Dashboard",
    year: "2024",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=1000&fit=crop",
    description: "Financial dashboard with real-time data visualization.",
    size: "large",
    offset: 40,
  },
  {
    id: "5",
    number: "05",
    title: "Luxe Brand",
    category: "Branding",
    year: "2024",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=1000&fit=crop",
    description: "Luxury brand identity for a high-end fashion label.",
    size: "medium",
    offset: -40,
  },
  {
    id: "6",
    number: "06",
    title: "TechStart",
    category: "Web App",
    year: "2023",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=1000&fit=crop",
    description: "SaaS platform for startup management and analytics.",
    size: "small",
    offset: 60,
  },
];

// Triple the projects for seamless infinite scroll
const allProjects = [...projects, ...projects, ...projects];

export default function WorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const { t } = useLanguage();

  // Magnetic hover effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, index: number) => {
    const card = cardsRef.current[index];
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) / 15;
    const deltaY = (e.clientY - centerY) / 15;

    gsap.to(card, {
      x: deltaX,
      y: deltaY,
      rotateY: deltaX / 2,
      rotateX: -deltaY / 2,
      duration: 0.3,
      ease: "power2.out",
    });
  }, []);

  const handleMouseLeave = useCallback((index: number) => {
    const card = cardsRef.current[index];
    if (!card) return;

    gsap.to(card, {
      x: 0,
      y: 0,
      rotateY: 0,
      rotateX: 0,
      duration: 0.5,
      ease: "elastic.out(1, 0.5)",
    });
  }, []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const container = containerRef.current;
    if (!section || !container) return;

    const ctx = gsap.context(() => {
      // Calculate dimensions
      const totalWidth = container.scrollWidth;
      const oneSetWidth = totalWidth / 3; // One third is one complete set

      // Very long scroll distance for "infinite" feel (10x the content)
      const scrollDistance = oneSetWidth * 10;

      // Main horizontal scroll animation with modulo positioning
      gsap.to(container, {
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${scrollDistance}`,
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Calculate the x position using modulo to loop
            const totalProgress = self.progress * scrollDistance;
            const loopedX = totalProgress % oneSetWidth;

            // Apply the looped position
            gsap.set(container, { x: -loopedX });

            // Update progress bar (loops within one set)
            if (progressBarRef.current) {
              const progressInSet = (loopedX % oneSetWidth) / oneSetWidth;
              progressBarRef.current.style.width = `${progressInSet * 100}%`;
            }

            // Update active card index
            const progressInSet = loopedX / oneSetWidth;
            const cardIndex = Math.floor(progressInSet * projects.length);
            setActiveIndex(cardIndex % projects.length);
          },
        },
      });

      // Floating decorative elements
      gsap.to(`.${styles.floatingCircle}`, {
        y: "random(-30, 30)",
        x: "random(-20, 20)",
        rotation: "random(-15, 15)",
        duration: "random(3, 5)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: {
          each: 0.5,
          from: "random",
        },
      });

    }, section);

    // Refresh ScrollTrigger after a small delay
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    return () => {
      clearTimeout(refreshTimer);
      ctx.revert();
    };
  }, []);

  const setCardRef = (index: number) => (el: HTMLDivElement | null) => {
    cardsRef.current[index] = el;
  };

  const handleCardClick = (id: string) => {
    router.push(`/works/${id}`);
  };

  return (
    <section className={styles.section} ref={sectionRef}>
      {/* Floating Decorative Elements */}
      <div className={styles.decorativeElements}>
        <div className={`${styles.floatingCircle} ${styles.circle1}`} />
        <div className={`${styles.floatingCircle} ${styles.circle2}`} />
        <div className={`${styles.floatingCircle} ${styles.circle3}`} />
        <div className={styles.gridPattern} />
      </div>

      {/* Fixed Header */}
      <div className={styles.fixedHeader}>
        <span className={styles.label}>{t("works.label")}</span>
        <div className={styles.scrollHint}>
          <div className={styles.scrollLine} />
          <span>{t("works.scroll")}</span>
        </div>
      </div>

      {/* Current Project Indicator */}
      <div className={styles.projectIndicator}>
        <span className={styles.currentNumber}>
          {String(activeIndex + 1).padStart(2, "0")}
        </span>
        <span className={styles.totalNumber}>/ {String(projects.length).padStart(2, "0")}</span>
      </div>

      {/* Horizontal Scroll Container */}
      <div className={styles.horizontalContainer} ref={containerRef}>
        {allProjects.map((project, index) => (
          <div
            key={`${project.id}-${index}`}
            ref={setCardRef(index)}
            className={`${styles.card} ${styles[project.size as keyof typeof styles]}`}
            style={{
              transform: `translateY(${project.offset}px)`,
              perspective: "1000px",
            }}
            onClick={() => handleCardClick(project.id)}
            onMouseMove={(e) => handleMouseMove(e, index)}
            onMouseEnter={() => setActiveIndex(index % projects.length)}
            onMouseLeave={() => handleMouseLeave(index)}
          >
            <div className={styles.cardInner}>
              {/* Glowing border effect */}
              <div className={styles.cardGlow} />

              <div className={styles.cardImageWrapper}>
                <img
                  src={project.image}
                  alt={project.title}
                  className={styles.cardImage}
                />
                <div className={styles.cardImageOverlay} />

                {/* Scan line effect */}
                <div className={styles.scanLine} />
              </div>

              <div className={styles.cardContent}>
                <span className={styles.cardNumber}>{project.number}</span>

                <div className={styles.cardInfo}>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardCategory}>{project.category}</span>
                    <span className={styles.cardYear}>{project.year}</span>
                  </div>
                  <h2 className={styles.cardTitle}>{project.title}</h2>
                  <p className={styles.cardDescription}>{project.description}</p>

                  <div className={styles.cardAction}>
                    <span className={styles.actionText}>{t("works.explore")}</span>
                    <div className={styles.actionIcon}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
              </div>

              {/* Corner accents */}
              <div className={`${styles.cornerAccent} ${styles.topLeft}`} />
              <div className={`${styles.cornerAccent} ${styles.bottomRight}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Progress Indicator */}
      <div className={styles.progressWrapper}>
        <div className={styles.progressDots}>
          {projects.map((project, idx) => (
            <div
              key={project.id}
              className={`${styles.progressDot} ${idx <= activeIndex ? styles.active : ""}`}
            />
          ))}
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} ref={progressBarRef} />
        </div>
      </div>
    </section>
  );
}
