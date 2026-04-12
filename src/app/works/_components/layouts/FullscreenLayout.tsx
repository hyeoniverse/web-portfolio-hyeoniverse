"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import T from "@/components/ui/T";
import type { WorksLayoutProps } from "./shared";
import styles from "./FullscreenLayout.module.css";

export default function FullscreenLayout({ projects, onProjectClick }: WorksLayoutProps) {
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  // IntersectionObserver — reveal + active tracking
  useEffect(() => {
    const sections = sectionRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number((entry.target as HTMLElement).dataset.idx);
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            if (entry.intersectionRatio >= 0.4) setActiveIdx(idx);
          } else {
            entry.target.classList.remove(styles.visible);
          }
        });
      },
      { threshold: [0.2, 0.4] },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [projects.length]);

  const handleClick = useCallback(
    (i: number, id: string, image: string) => {
      const el = sectionRefs.current[i];
      if (el) onProjectClick(id, el.getBoundingClientRect(), image);
    },
    [onProjectClick],
  );

  return (
    <div className={styles.wrap}>
      {/* Fixed background images — crossfade */}
      <div className={styles.bgLayer}>
        {projects.map((p, i) => (
          <div
            key={p.id}
            className={`${styles.bgImage} ${i === activeIdx ? styles.bgImageActive : ""}`}
            aria-hidden="true"
          >
            <Image
              src={p.image}
              alt=""
              fill
              sizes="100vw"
              priority={i === 0}
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </div>

      {/* Project sections */}
      {projects.map((p, i) => (
        <div
          key={p.id}
          ref={(el) => { sectionRefs.current[i] = el; }}
          data-idx={i}
          className={styles.section}
          onClick={() => handleClick(i, p.id, p.image)}
        >
          <span className={styles.number}>{p.number}</span>

          <div className={styles.inner}>
            <span className={styles.category}>
              <T ko={p.category.ko} en={p.category.en} />
            </span>
            <h2 className={styles.title}>{p.title}</h2>
            <p className={styles.subtitle}>
              <T ko={p.subtitle.ko} en={p.subtitle.en} />
            </p>
            <div className={styles.cta}>
              <span className={styles.ctaBg} />
              <span className={styles.ctaArrow}>↗</span>
            </div>
          </div>

          <span className={styles.year}>{p.year}</span>
          <div className={styles.tech}>
            {p.tech.slice(0, 4).map((tech: string, j: number) => (
              <span key={j}>{tech}</span>
            ))}
          </div>
        </div>
      ))}

      {/* Fixed counter */}
      <div className={styles.counter}>
        {String(activeIdx + 1).padStart(2, "0")} — {String(projects.length).padStart(2, "0")}
      </div>

      {/* Scroll hint */}
      <div className={styles.scrollHint}>
        scroll
        <span>↓</span>
      </div>
    </div>
  );
}
