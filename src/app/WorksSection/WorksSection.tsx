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
    image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&h=800&fit=crop",
  },
  {
    id: "2",
    number: "02",
    title: "Fitil App",
    category: "UX/UI / Mobile",
    year: "2023",
    image: "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&h=800&fit=crop",
  },
  {
    id: "3",
    number: "03",
    title: "Amway Digital",
    category: "E-commerce",
    year: "2023",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=800&fit=crop",
  },
  {
    id: "4",
    number: "04",
    title: "Nova Finance",
    category: "Dashboard",
    year: "2024",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=800&fit=crop",
  },
  {
    id: "5",
    number: "05",
    title: "Luxe Brand",
    category: "Branding",
    year: "2024",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=800&fit=crop",
  },
  {
    id: "6",
    number: "06",
    title: "TechStart",
    category: "Web App",
    year: "2023",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=800&fit=crop",
  },
  {
    id: "7",
    number: "07",
    title: "Artisan",
    category: "E-commerce",
    year: "2024",
    image: "https://images.unsplash.com/photo-1493934558415-9d19f0b2b4d2?w=800&h=800&fit=crop",
  },
];

export default function WorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<(HTMLDivElement | null)[]>([]);
  const blobsRef = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Animate thumbnails on scroll
      thumbsRef.current.forEach((thumb, index) => {
        if (!thumb) return;

        gsap.fromTo(
          thumb,
          {
            opacity: 0,
            scale: 0.6,
            y: 80,
          },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.8,
            delay: index * 0.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 70%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      // Animate blobs
      blobsRef.current.forEach((blob, index) => {
        if (!blob) return;

        gsap.fromTo(
          blob,
          {
            opacity: 0,
            scale: 0.5,
          },
          {
            opacity: 1,
            scale: 1,
            duration: 1.2,
            delay: 0.3 + index * 0.15,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              start: "top 70%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  const setThumbRef = (index: number) => (el: HTMLDivElement | null) => {
    thumbsRef.current[index] = el;
  };

  const setBlobRef = (index: number) => (el: HTMLDivElement | null) => {
    blobsRef.current[index] = el;
  };

  return (
    <section id="works" className={styles.section} ref={sectionRef}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.label}>Selected Works</span>
        <h2 className={styles.title}>Our Portfolio</h2>
      </div>

      {/* Center Background Title */}
      <div className={styles.centerTitle}>
        <h3 className={styles.centerTitleText}>Works</h3>
      </div>

      {/* Blob Decorations */}
      <div
        ref={setBlobRef(0)}
        className={`${styles.blob} ${styles.blobLeft}`}
      />
      <div
        ref={setBlobRef(1)}
        className={`${styles.blob} ${styles.blobRight}`}
      />
      <div
        ref={setBlobRef(2)}
        className={`${styles.blob} ${styles.blobBottom}`}
      />

      {/* Scattered Project Thumbnails */}
      <div className={styles.projectsContainer}>
        {projects.map((project, index) => (
          <div
            key={project.id}
            ref={setThumbRef(index)}
            className={`${styles.projectThumb} ${styles[`project-${index + 1}`]}`}
          >
            <img src={project.image} alt={project.title} />
            <div className={styles.projectLabel}>
              <span className={styles.projectNumber}>{project.number}</span>
              <span className={styles.projectName}>{project.title}</span>
            </div>
          </div>
        ))}
      </div>

      {/* View More Button */}
      <div className={styles.viewMore}>
        <button className={styles.viewMoreButton}>
          <span>View All Projects</span>
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
    </section>
  );
}
