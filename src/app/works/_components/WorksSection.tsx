"use client";

import { useRef, useLayoutEffect, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  },
  {
    id: "2",
    number: "02",
    title: "Fitil App",
    category: "UX/UI / Mobile",
    year: "2023",
    image:
      "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&h=1000&fit=crop",
  },
  {
    id: "3",
    number: "03",
    title: "Amway Digital",
    category: "E-commerce",
    year: "2023",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=1000&fit=crop",
  },
  {
    id: "4",
    number: "04",
    title: "Nova Finance",
    category: "Dashboard",
    year: "2024",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=1000&fit=crop",
  },
  {
    id: "5",
    number: "05",
    title: "Luxe Brand",
    category: "Branding",
    year: "2024",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=1000&fit=crop",
  },
  {
    id: "6",
    number: "06",
    title: "TechStart",
    category: "Web App",
    year: "2023",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=1000&fit=crop",
  },
];

// Triple the projects for seamless infinite scroll
const allProjects = [...projects, ...projects, ...projects];

// Card component
const ProjectCard = ({
  project,
  onClick,
  exploreText,
}: {
  project: (typeof projects)[0];
  onClick: () => void;
  exploreText: string;
}) => (
  <div className={styles.card} onClick={onClick}>
    <div className={styles.cardFrame}>
      <span className={styles.frameCorner} />
      <span className={styles.frameCorner} />
      <span className={styles.frameCorner} />
      <span className={styles.frameCorner} />
    </div>

    <div className={styles.cardImageWrapper}>
      <img
        src={project.image}
        alt={project.title}
        className={styles.cardImage}
      />
      <div className={styles.cardImageOverlay} />
    </div>

    <div className={styles.cardTypo}>
      <span className={styles.cardNumber}>{project.number}</span>
    </div>

    <div className={styles.cardContent}>
      <span className={styles.cardCategory}>{project.category}</span>
      <h3 className={styles.cardTitle}>{project.title}</h3>
      <div className={styles.cardAction}>
        <span>{exploreText}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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

    <div className={styles.cardYearBadge}>
      <span>{project.year}</span>
    </div>
  </div>
);

export default function WorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const { t } = useLanguage();
  const { setInfinite } = useLenis();

  // Disable Lenis infinite scroll on this page for GSAP ScrollTrigger to work
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
      const cards = container.querySelectorAll(`.${styles.card}`);
      if (cards.length === 0) return;

      const cardWidth = (cards[0] as HTMLElement).offsetWidth;
      const gap = 60;
      const oneSetWidth = (cardWidth + gap) * projects.length;
      const scrollDistance = oneSetWidth * 8;

      // Start from middle set for seamless loop
      gsap.set(container, { x: -oneSetWidth });

      gsap.to(container, {
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${scrollDistance}`,
          pin: true,
          scrub: 0.3,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const totalProgress = self.progress * scrollDistance;
            // Start from oneSetWidth and loop within that range
            const baseOffset = oneSetWidth;
            const loopedX = baseOffset + (totalProgress % oneSetWidth);

            gsap.set(container, { x: -loopedX });

            if (progressBarRef.current) {
              const progressInSet = (totalProgress % oneSetWidth) / oneSetWidth;
              progressBarRef.current.style.width = `${progressInSet * 100}%`;
            }

            const progressInSet = (totalProgress % oneSetWidth) / oneSetWidth;
            const cardIndex = Math.floor(progressInSet * projects.length);
            setActiveIndex(cardIndex % projects.length);
          },
        },
      });
    }, section);

    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

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
      {/* Main Title - Cinematic Typography */}
      <div className={styles.cinematicTitle}>
        <span className={styles.titleLabel}>Featured Works</span>
        <h1 className={styles.mainTitle}>
          <span className={styles.titleLine}>Selected</span>
          <span className={styles.titleLine}>
            <span className={styles.titleOutline}>Projects</span>
          </span>
        </h1>
        <div className={styles.titleMeta}>
          <span>2023 — 2024</span>
          <span className={styles.titleDivider} />
          <span>Creative Portfolio</span>
        </div>
      </div>

      {/* Current Project Info - Left Side */}
      <div className={styles.projectInfo}>
        <div className={styles.projectNumber}>
          <span className={styles.numberLabel}>Project</span>
          <div className={styles.numberRow}>
            <span className={styles.numberValue}>{currentProject?.number}</span>
            <span className={styles.numberTotal}>
              /{String(projects.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className={styles.projectDetails}>
          <h2 className={styles.projectTitle}>{currentProject?.title}</h2>
          <span className={styles.projectCategory}>
            {currentProject?.category}
          </span>
        </div>

        <div className={styles.projectYear}>
          <span className={styles.yearLabel}>Year</span>
          <span className={styles.yearValue}>{currentProject?.year}</span>
        </div>
      </div>

      {/* Horizontal Scroll Container */}
      <div className={styles.horizontalContainer} ref={containerRef}>
        {allProjects.map((project, index) => (
          <ProjectCard
            key={`${project.id}-${index}`}
            project={project}
            onClick={() => handleCardClick(project.id)}
            exploreText={exploreText}
          />
        ))}
      </div>

      {/* Bottom Bar */}
      <div className={styles.bottomBar}>
        <div className={styles.progressWrapper}>
          <div className={styles.progressTrack}>
            <div className={styles.progressBar} ref={progressBarRef} />
          </div>
        </div>
        <div className={styles.bottomMeta}>
          <span className={styles.bottomLabel}>{t("works.scroll")}</span>
          <span className={styles.bottomDivider}>—</span>
          <span className={styles.bottomCount}>
            {String(activeIndex + 1).padStart(2, "0")} /{" "}
            {String(projects.length).padStart(2, "0")}
          </span>
        </div>
      </div>
    </section>
  );
}
