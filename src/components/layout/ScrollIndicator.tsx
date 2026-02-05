"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/stores/appStore";
import { scrollToSection } from "@/utils/scroll";
import { fadeInLeftDelayed, fadeSlideY } from "@/animations";
import styles from "./ScrollIndicator.module.css";

type HoverTarget = "prev" | "next" | null;

export default function ScrollIndicator() {
  const {
    currentSection,
    setCurrentSection,
    startTransition,
    isTransitioning,
  } = useAppStore();

  const scrollTrackRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const ticking = useRef(false);
  const isDragging = useRef(false);

  const [hovered, setHovered] = useState<HoverTarget>(null);

  const sections = [
    "hero",
    "about",
    "experience",
    "skills",
    "projects",
    "blog",
    "contact",
  ];

  const currentIndex = sections.indexOf(currentSection);
  const previousSection =
    sections[(currentIndex - 1 + sections.length) % sections.length];
  const nextSection = sections[(currentIndex + 1) % sections.length];

  const labelMap: Record<string, string> = {
    hero: "HOME",
    about: "ABOUT ME",
    experience: "EXPERIENCES",
    skills: "SKILLS",
    projects: "PROJECTS",
    blog: "BLOG",
    contact: "CONTACT",
  };

  /* ---------------- scroll → progress ---------------- */

  useEffect(() => {
    const updateScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop || 0;

      const scrollHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;

      const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

      if (!ticking.current) {
        requestAnimationFrame(() => {
          if (progressBarRef.current) {
            progressBarRef.current.style.height = `${progress * 100}%`;
          }
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();

    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  /* ---------------- scroll track click / drag ---------------- */

  const scrollByClientY = (clientY: number) => {
    if (!scrollTrackRef.current) return;

    const rect = scrollTrackRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const ratio = Math.min(Math.max(y / rect.height, 0), 1);

    const scrollHeight =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;

    window.scrollTo({
      top: scrollHeight * ratio,
      behavior: "auto",
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    scrollByClientY(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    scrollByClientY(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleClickSection = (section: string, dir: "up" | "down") => {
    if (isTransitioning) return;

    startTransition(dir);

    setTimeout(() => {
      setCurrentSection(section);
      scrollToSection(section);
    }, 300);
  };

  return (
    <motion.nav
      className={`${styles.indicator} ${
        hovered === "prev"
          ? styles.hoverPrev
          : hovered === "next"
            ? styles.hoverNext
            : ""
      }`}
      variants={fadeInLeftDelayed}
      initial="hidden"
      animate="visible"
    >
      {/* Previous */}
      <button
        className={`${styles.text} ${styles.previous}`}
        onMouseEnter={() => setHovered("prev")}
        onMouseLeave={() => setHovered(null)}
        onClick={() => handleClickSection(previousSection, "up")}
      >
        <u>{labelMap[previousSection]}</u>
      </button>

      {/* Current */}
      <AnimatePresence mode="wait">
        <motion.p
          key={currentSection}
          className={`${styles.text} ${styles.current}`}
          variants={fadeSlideY}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <u>{labelMap[currentSection]}</u>
        </motion.p>
      </AnimatePresence>

      {/* Scroll Track */}
      <div
        className={styles.scrollTrack}
        ref={scrollTrackRef}
        onPointerDown={(e) => scrollByClientY(e.clientY)}
      >
        <div
          className={styles.scrollProgress}
          ref={progressBarRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>

      {/* Next */}
      <button
        className={`${styles.text} ${styles.next}`}
        onMouseEnter={() => setHovered("next")}
        onMouseLeave={() => setHovered(null)}
        onClick={() => handleClickSection(nextSection, "down")}
      >
        <u>{labelMap[nextSection]}</u>
      </button>
    </motion.nav>
  );
}
