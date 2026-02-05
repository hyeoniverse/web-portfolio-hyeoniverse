"use client";

import { useRef, useLayoutEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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

export default function WorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const introTitleRef = useRef<HTMLHeadingElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const router = useRouter();

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
    setActiveIndex(-1);
  }, []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const container = containerRef.current;
    if (!section || !container) return;

    const ctx = gsap.context(() => {
      // Calculate total scroll width
      const totalWidth = container.scrollWidth - window.innerWidth;

      // Main horizontal scroll animation
      const scrollTween = gsap.to(container, {
        x: -totalWidth,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${totalWidth}`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Update progress bar
            if (progressBarRef.current) {
              progressBarRef.current.style.width = `${self.progress * 100}%`;
            }

            // Update active card based on progress
            const cardIndex = Math.floor(self.progress * projects.length);
            setActiveIndex(Math.min(cardIndex, projects.length - 1));
          },
        },
      });

      // Intro title split animation
      if (introTitleRef.current) {
        const lines = introTitleRef.current.querySelectorAll(`.${styles.introLine}`);
        gsap.fromTo(
          lines,
          {
            y: 100,
            opacity: 0,
            rotateX: -45,
          },
          {
            y: 0,
            opacity: 1,
            rotateX: 0,
            duration: 1.2,
            stagger: 0.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 80%",
              end: "top 20%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      // Animate each card with stagger and parallax
      cardsRef.current.forEach((card, index) => {
        if (!card) return;

        const image = card.querySelector(`.${styles.cardImage}`);
        const content = card.querySelector(`.${styles.cardContent}`);
        const number = card.querySelector(`.${styles.cardNumber}`);

        // Card entrance animation
        gsap.fromTo(
          card,
          {
            opacity: 0,
            scale: 0.8,
            rotateY: -15,
          },
          {
            opacity: 1,
            scale: 1,
            rotateY: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              containerAnimation: scrollTween,
              start: "left 90%",
              end: "left 60%",
              scrub: true,
            },
          }
        );

        // Parallax effect on images (faster movement)
        if (image) {
          gsap.fromTo(
            image,
            { scale: 1.3, x: -50 },
            {
              scale: 1,
              x: 50,
              ease: "none",
              scrollTrigger: {
                trigger: card,
                containerAnimation: scrollTween,
                start: "left right",
                end: "right left",
                scrub: true,
              },
            }
          );
        }

        // Content fade in
        if (content) {
          gsap.fromTo(
            content,
            { y: 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              ease: "power2.out",
              scrollTrigger: {
                trigger: card,
                containerAnimation: scrollTween,
                start: "left 70%",
                end: "left 40%",
                scrub: true,
              },
            }
          );
        }

        // Number animation
        if (number) {
          gsap.fromTo(
            number,
            { scale: 0, rotate: -180 },
            {
              scale: 1,
              rotate: 0,
              duration: 0.6,
              ease: "back.out(2)",
              scrollTrigger: {
                trigger: card,
                containerAnimation: scrollTween,
                start: "left 75%",
                toggleActions: "play none none reverse",
              },
            }
          );
        }
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

    return () => ctx.revert();
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
        <span className={styles.label}>Selected Works</span>
        <div className={styles.scrollHint}>
          <div className={styles.scrollLine} />
          <span>Scroll</span>
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
        {/* Intro Panel */}
        <div className={styles.introPanel}>
          <div className={styles.introContent}>
            <span className={styles.introLabel}>Portfolio 2024</span>
            <h1 className={styles.introTitle} ref={introTitleRef}>
              <span className={styles.introLine}>Creative</span>
              <span className={styles.introLine}>Works &</span>
              <span className={styles.introLine}>
                <span className={styles.outlineText}>Projects</span>
              </span>
            </h1>
            <p className={styles.introText}>
              A curated selection of projects showcasing expertise in design,
              development, and creative problem-solving.
            </p>
            <div className={styles.introStats}>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>50+</span>
                <span className={styles.statLabel}>Projects</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>30+</span>
                <span className={styles.statLabel}>Clients</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>5+</span>
                <span className={styles.statLabel}>Years</span>
              </div>
            </div>
          </div>
        </div>

        {/* Project Cards */}
        {projects.map((project, index) => (
          <div
            key={project.id}
            ref={setCardRef(index)}
            className={`${styles.card} ${styles[project.size]}`}
            style={{
              transform: `translateY(${project.offset}px)`,
              perspective: "1000px",
            }}
            onClick={() => handleCardClick(project.id)}
            onMouseMove={(e) => handleMouseMove(e, index)}
            onMouseEnter={() => setActiveIndex(index)}
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
                    <span className={styles.actionText}>Explore</span>
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

        {/* End Panel */}
        <div className={styles.endPanel}>
          <div className={styles.endContent}>
            <span className={styles.endLabel}>Get in Touch</span>
            <h2 className={styles.endTitle}>
              <span>Let's Create</span>
              <span className={styles.endTitleAccent}>Something</span>
              <span>Amazing</span>
            </h2>
            <p className={styles.endText}>
              Have a project in mind? Let's discuss how we can bring your vision to life.
            </p>
            <button className={styles.contactButton}>
              <span>Start a Project</span>
              <div className={styles.buttonIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12H19M19 12L12 5M19 12L12 19"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>
          </div>
        </div>
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
