"use client";

import { useRef, useState, type ReactNode, useEffect } from "react";
import { motion } from "framer-motion";
import { lazySectionReveal } from "@/animations";

interface LazySectionProps {
  children: ReactNode;
  id: string;
  className?: string;
  threshold?: number;
  rootMargin?: string;
}

export default function LazySection({
  children,
  id,
  className = "",
  threshold = 0.1,
  rootMargin = "100px",
}: LazySectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const currentSection = sectionRef.current;
    if (!currentSection) return;

    // Intersection Observer로 실제 lazy loading 구현
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasLoaded) {
            setIsVisible(true);
            setHasLoaded(true); // 한 번만 로드
          }
        });
      },
      {
        threshold,
        rootMargin, // 뷰포트 진입 전에 미리 로드
      },
    );

    observer.observe(currentSection);

    return () => {
      if (currentSection) {
        observer.unobserve(currentSection);
      }
    };
  }, [threshold, rootMargin, hasLoaded]);

  const handleAnimationComplete = () => {
    document.dispatchEvent(
      new CustomEvent("lazySectionLoaded", { detail: id }),
    );
  };

  return (
    <section ref={sectionRef} id={id} className={className}>
      {isVisible ? (
        <motion.div
          variants={lazySectionReveal}
          initial="hidden"
          animate="visible"
          onAnimationComplete={handleAnimationComplete}
        >
          {children}
        </motion.div>
      ) : (
        <div className="min-h-screen" />
      )}
    </section>
  );
}
