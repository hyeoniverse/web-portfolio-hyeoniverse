"use client";

import { useRef, useLayoutEffect, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./HorizontalScrollSection.module.css";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface HorizontalScrollSectionProps {
  children: ReactNode;
  id: string;
  className?: string;
  scrub?: number | boolean;
  showProgress?: boolean;
}

export default function HorizontalScrollSection({
  children,
  id,
  className = "",
  scrub = 1,
  showProgress = true,
}: HorizontalScrollSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    const progress = progressRef.current;

    if (!container || !wrapper) return;

    // Wait for content to be fully rendered
    const items = Array.from(wrapper.children) as HTMLElement[];
    if (!items.length) return;

    // Calculate dimensions
    const getScrollDistance = () => {
      const totalWidth = wrapper.scrollWidth;
      const viewportWidth = window.innerWidth;
      return totalWidth - viewportWidth;
    };

    const ctx = gsap.context(() => {
      // Create main horizontal scroll animation
      const horizontalTween = gsap.to(wrapper, {
        x: () => -getScrollDistance(),
        ease: "none",
        scrollTrigger: {
          id: `horizontal-${id}`,
          trigger: container,
          start: "top top",
          end: () => `+=${getScrollDistance()}`,
          pin: true,
          scrub,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onEnter: () => setIsActive(true),
          onLeave: () => setIsActive(false),
          onEnterBack: () => setIsActive(true),
          onLeaveBack: () => setIsActive(false),
          onUpdate: (self) => {
            // Update progress bar
            if (progress) {
              gsap.set(progress, { scaleX: self.progress });
            }
          },
        },
      });

      // Animate individual items as they come into view
      items.forEach((item) => {
        gsap.fromTo(
          item,
          {
            opacity: 0.5,
            scale: 0.95,
          },
          {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            scrollTrigger: {
              trigger: item,
              containerAnimation: horizontalTween,
              start: "left 90%",
              end: "left 50%",
              scrub: true,
            },
          }
        );
      });
    }, container);

    // Handle resize
    const handleResize = () => {
      ScrollTrigger.refresh();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      ctx.revert();
      window.removeEventListener("resize", handleResize);
    };
  }, [id, scrub]);

  return (
    <section
      id={id}
      ref={containerRef}
      className={`${styles.container} ${className}`}
    >
      <div
        ref={wrapperRef}
        className={styles.wrapper}
        data-horizontal-wrapper
      >
        {children}
      </div>

      {/* Progress indicator */}
      {showProgress && (
        <div className={`${styles.progress} ${isActive ? styles.progressActive : ""}`}>
          <div ref={progressRef} className={styles.progressBar} />
        </div>
      )}
    </section>
  );
}

// Export a child item component for consistent styling
interface HorizontalItemProps {
  children: ReactNode;
  className?: string;
}

export function HorizontalItem({ children, className = "" }: HorizontalItemProps) {
  return (
    <div className={`${styles.item} ${className}`}>
      {children}
    </div>
  );
}
