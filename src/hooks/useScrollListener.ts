"use client";

import { useEffect, useCallback, useRef } from "react";
import { getCurrentSection, getLenisInstance } from "@/utils";
import { NAVIGATION_ITEMS, SCROLL_OFFSET } from "@/constants";

interface UseScrollListenerProps {
  currentSection: string;
  setCurrentSection: (section: string) => void;
  isTransitioning: boolean;
  onSidebarVisibilityChange?: (visible: boolean) => void;
}

// Sections where sidebar should be hidden
const SECTIONS_WITHOUT_SIDEBAR = ["hero"];

/**
 * Tracks section positions and auto-updates currentSection.
 * Works with both native scroll and Lenis smooth scroll.
 */
export function useScrollListener({
  currentSection,
  setCurrentSection,
  isTransitioning,
  onSidebarVisibilityChange,
}: UseScrollListenerProps) {
  const rafIdRef = useRef<number>(0);
  const lastSectionRef = useRef<string>(currentSection);
  const lastSidebarStateRef = useRef<boolean>(true);

  const handleScroll = useCallback(() => {
    if (isTransitioning) return;

    // Use requestAnimationFrame to throttle updates
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      // Update current section
      const sectionIds = NAVIGATION_ITEMS.map((item) => item.id);
      const newSection = getCurrentSection(sectionIds, SCROLL_OFFSET);

      if (newSection && newSection !== lastSectionRef.current) {
        lastSectionRef.current = newSection;
        setCurrentSection(newSection);
      }

      // Determine sidebar visibility
      let shouldShowSidebar = newSection
        ? !SECTIONS_WITHOUT_SIDEBAR.includes(newSection)
        : true;

      // Hide sidebar when at the bottom of webflow section
      const webflowSection = document.getElementById("webflow");
      if (webflowSection) {
        const webflowRect = webflowSection.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // If we're near the bottom of webflow section (last section), hide sidebar
        if (webflowRect.bottom <= windowHeight + 100) {
          shouldShowSidebar = false;
        }
      }

      // Update state only when it actually changes
      if (lastSidebarStateRef.current !== shouldShowSidebar) {
        lastSidebarStateRef.current = shouldShowSidebar;
        onSidebarVisibilityChange?.(shouldShowSidebar);
      }
    });
  }, [isTransitioning, onSidebarVisibilityChange, setCurrentSection]);

  useEffect(() => {
    // Check for Lenis instance
    const lenis = getLenisInstance();

    if (lenis) {
      // Use Lenis scroll event
      lenis.on("scroll", handleScroll);
    } else {
      // Fallback to native scroll
      window.addEventListener("scroll", handleScroll, { passive: true });
    }

    // Initial calculation
    handleScroll();

    return () => {
      if (lenis) {
        lenis.off("scroll", handleScroll);
      } else {
        window.removeEventListener("scroll", handleScroll);
      }

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [handleScroll]);
}
