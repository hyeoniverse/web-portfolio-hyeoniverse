"use client";

import { useRef, useLayoutEffect } from "react";
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
    image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&h=800&fit=crop",
    description: "Complete brand identity and website design for an innovative space technology company.",
    tags: ["Branding", "Web", "3D"],
    color: "#1a1a2e",
  },
  {
    id: "2",
    number: "02",
    title: "Fitil App",
    category: "UX/UI / Mobile",
    year: "2023",
    image: "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=1200&h=800&fit=crop",
    description: "Mobile app design for a fitness tracking platform with gamification elements.",
    tags: ["UX/UI", "Mobile", "App"],
    color: "#16213e",
  },
  {
    id: "3",
    number: "03",
    title: "Amway Digital",
    category: "E-commerce / Development",
    year: "2023",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop",
    description: "Digital transformation project for a global brand, including platform redesign.",
    tags: ["E-commerce", "Development", "Strategy"],
    color: "#0f3460",
  },
  {
    id: "4",
    number: "04",
    title: "Nova Finance",
    category: "Dashboard / Development",
    year: "2024",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop",
    description: "Fintech dashboard with real-time data visualization and intuitive user experience.",
    tags: ["Dashboard", "Fintech", "Data Viz"],
    color: "#1a1a2e",
  },
];

export default function WorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const wrapper = wrapperRef.current;
    const progress = progressRef.current;
    const header = headerRef.current;

    if (!section || !wrapper) return;

    const ctx = gsap.context(() => {
      // Calculate scroll distance
      const getScrollDistance = () => wrapper.scrollWidth - window.innerWidth;

      // Header animation on enter
      if (header) {
        gsap.fromTo(
          header,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      // Main horizontal scroll
      const horizontalTween = gsap.to(wrapper, {
        x: () => -getScrollDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${getScrollDistance()}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (progress) {
              gsap.set(progress, { scaleX: self.progress });
            }
          },
        },
      });

      // Animate project cards
      const cards = wrapper.querySelectorAll(`.${styles.projectCard}`);
      cards.forEach((card) => {
        // Initial state
        gsap.set(card, { opacity: 0.4, scale: 0.9 });

        // Animate in
        gsap.to(card, {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            containerAnimation: horizontalTween,
            start: "left 85%",
            end: "left 50%",
            scrub: true,
          },
        });

        // Parallax effect on image
        const image = card.querySelector(`.${styles.projectImage}`);
        if (image) {
          gsap.to(image, {
            xPercent: -20,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              containerAnimation: horizontalTween,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          });
        }
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section id="works" className={styles.section} ref={sectionRef}>
      {/* Fixed Header */}
      <div className={styles.header} ref={headerRef}>
        <span className={styles.label}>Selected Works</span>
        <h2 className={styles.title}>Our Portfolio</h2>
      </div>

      {/* Horizontal Scroll Container */}
      <div className={styles.wrapper} ref={wrapperRef}>
        {/* Intro Panel */}
        <div className={styles.introPanel}>
          <div className={styles.introContent}>
            <span className={styles.introNumber}>02</span>
            <h3 className={styles.introTitle}>Works</h3>
            <p className={styles.introDescription}>
              A selection of our latest projects showcasing our expertise in
              branding, UX/UI design, and web development.
            </p>
            <div className={styles.scrollHint}>
              <span>Scroll to explore</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12H19M19 12L12 5M19 12L12 19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Project Cards */}
        {projects.map((project) => (
          <article
            key={project.id}
            className={styles.projectCard}
            style={{ "--card-color": project.color } as React.CSSProperties}
          >
            <div className={styles.projectImageContainer}>
              <img
                src={project.image}
                alt={project.title}
                className={styles.projectImage}
              />
              <div className={styles.projectImageOverlay} />
            </div>

            <div className={styles.projectContent}>
              <div className={styles.projectMeta}>
                <span className={styles.projectNumber}>{project.number}</span>
                <span className={styles.projectYear}>{project.year}</span>
              </div>

              <h3 className={styles.projectTitle}>{project.title}</h3>
              <p className={styles.projectCategory}>{project.category}</p>
              <p className={styles.projectDescription}>{project.description}</p>

              <div className={styles.projectTags}>
                {project.tags.map((tag) => (
                  <span key={tag} className={styles.projectTag}>
                    {tag}
                  </span>
                ))}
              </div>

              <button className={styles.projectButton}>
                <span>View Project</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 17L17 7M17 7H7M17 7V17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </article>
        ))}

        {/* Outro Panel */}
        <div className={styles.outroPanel}>
          <div className={styles.outroContent}>
            <span className={styles.outroLabel}>Want to see more?</span>
            <h3 className={styles.outroTitle}>View All Projects</h3>
            <button className={styles.outroButton}>
              <span>Explore Portfolio</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 17L17 7M17 7H7M17 7V17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={styles.progress}>
        <div ref={progressRef} className={styles.progressBar} />
      </div>

      {/* Navigation Dots */}
      <div className={styles.dots}>
        {projects.map((project, i) => (
          <div key={project.id} className={styles.dot} data-index={i}>
            <span className={styles.dotLabel}>{project.number}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
