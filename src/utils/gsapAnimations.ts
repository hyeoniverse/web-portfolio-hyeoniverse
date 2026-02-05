import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Easing functions
export const EASE = {
  expoOut: "expo.out",
  expoInOut: "expo.inOut",
  powerOut: "power3.out",
  powerInOut: "power3.inOut",
  backOut: "back.out(1.7)",
  elasticOut: "elastic.out(1, 0.5)",
};

// ============================================
// Cinematic Reveal - Curtain style
// ============================================
export const cinematicReveal = (
  element: HTMLElement | string,
  options: {
    duration?: number;
    trigger?: string | HTMLElement;
    start?: string;
  } = {}
) => {
  const { duration = 1.5, trigger, start = "top 80%" } = options;

  return gsap.fromTo(
    element,
    {
      clipPath: "inset(0 50% 0 50%)",
      opacity: 0,
    },
    {
      clipPath: "inset(0 0% 0 0%)",
      opacity: 1,
      duration,
      ease: "power4.out",
      scrollTrigger: trigger
        ? {
            trigger: trigger || element,
            start,
            toggleActions: "play none none reverse",
          }
        : undefined,
    }
  );
};

// ============================================
// Parallax Depth Effect
// ============================================
export const parallaxDepth = (
  element: HTMLElement | string,
  speed: number = 0.5,
  options: {
    trigger?: string | HTMLElement;
  } = {}
) => {
  const { trigger } = options;

  return gsap.to(element, {
    yPercent: -100 * speed,
    ease: "none",
    scrollTrigger: {
      trigger: trigger || element,
      start: "top bottom",
      end: "bottom top",
      scrub: true,
    },
  });
};

// ============================================
// Text Split Reveal
// ============================================
export const textSplitReveal = (
  element: HTMLElement | string,
  options: {
    stagger?: number;
    duration?: number;
    trigger?: string | HTMLElement;
    start?: string;
  } = {}
) => {
  const { stagger = 0.02, duration = 0.8, trigger, start = "top 80%" } = options;

  // Assume chars are already split with class .char
  const chars = gsap.utils.toArray(`${element} .char`);

  if (!chars.length) return null;

  return gsap.fromTo(
    chars,
    {
      opacity: 0,
      y: 100,
      rotateX: -90,
    },
    {
      opacity: 1,
      y: 0,
      rotateX: 0,
      duration,
      stagger,
      ease: "back.out(1.7)",
      scrollTrigger: trigger
        ? {
            trigger: trigger || element,
            start,
            toggleActions: "play none none reverse",
          }
        : undefined,
    }
  );
};

// ============================================
// Scale Reveal
// ============================================
export const scaleReveal = (
  element: HTMLElement | string,
  options: {
    duration?: number;
    trigger?: string | HTMLElement;
    start?: string;
    scale?: number;
  } = {}
) => {
  const { duration = 1, trigger, start = "top 85%", scale = 0.8 } = options;

  return gsap.fromTo(
    element,
    {
      scale,
      opacity: 0,
      y: 60,
    },
    {
      scale: 1,
      opacity: 1,
      y: 0,
      duration,
      ease: "power3.out",
      scrollTrigger: trigger
        ? {
            trigger: trigger || element,
            start,
            toggleActions: "play none none reverse",
          }
        : undefined,
    }
  );
};

// ============================================
// Stagger Cards Reveal
// ============================================
export const staggerCardsReveal = (
  container: HTMLElement | string,
  options: {
    stagger?: number;
    duration?: number;
    start?: string;
    childSelector?: string;
  } = {}
) => {
  const { stagger = 0.15, duration = 0.8, start = "top 75%", childSelector = "> *" } = options;

  const cards = gsap.utils.toArray(`${container} ${childSelector}`);

  if (!cards.length) return null;

  return gsap.fromTo(
    cards,
    {
      opacity: 0,
      y: 80,
      scale: 0.95,
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration,
      stagger,
      ease: "power2.out",
      scrollTrigger: {
        trigger: container,
        start,
        toggleActions: "play none none reverse",
      },
    }
  );
};

// ============================================
// Fade Up Animation
// ============================================
export const fadeUp = (
  element: HTMLElement | string,
  options: {
    duration?: number;
    delay?: number;
    y?: number;
    trigger?: string | HTMLElement;
    start?: string;
  } = {}
) => {
  const { duration = 0.8, delay = 0, y = 60, trigger, start = "top 85%" } = options;

  return gsap.fromTo(
    element,
    {
      opacity: 0,
      y,
    },
    {
      opacity: 1,
      y: 0,
      duration,
      delay,
      ease: "power3.out",
      scrollTrigger: trigger
        ? {
            trigger: trigger || element,
            start,
            toggleActions: "play none none reverse",
          }
        : undefined,
    }
  );
};

// ============================================
// Slide In from Side
// ============================================
export const slideIn = (
  element: HTMLElement | string,
  direction: "left" | "right" = "left",
  options: {
    duration?: number;
    distance?: number;
    trigger?: string | HTMLElement;
    start?: string;
  } = {}
) => {
  const { duration = 0.8, distance = 100, trigger, start = "top 85%" } = options;

  const x = direction === "left" ? -distance : distance;

  return gsap.fromTo(
    element,
    {
      opacity: 0,
      x,
    },
    {
      opacity: 1,
      x: 0,
      duration,
      ease: "power3.out",
      scrollTrigger: trigger
        ? {
            trigger: trigger || element,
            start,
            toggleActions: "play none none reverse",
          }
        : undefined,
    }
  );
};

// ============================================
// Counter Animation
// ============================================
export const countUp = (
  element: HTMLElement,
  endValue: number,
  options: {
    duration?: number;
    trigger?: string | HTMLElement;
    start?: string;
    prefix?: string;
    suffix?: string;
  } = {}
) => {
  const { duration = 2, trigger, start = "top 85%", prefix = "", suffix = "" } = options;

  const obj = { value: 0 };

  return gsap.to(obj, {
    value: endValue,
    duration,
    ease: "power2.out",
    onUpdate: () => {
      element.textContent = `${prefix}${Math.round(obj.value)}${suffix}`;
    },
    scrollTrigger: trigger
      ? {
          trigger: trigger || element,
          start,
          toggleActions: "play none none none",
        }
      : undefined,
  });
};

// ============================================
// Magnetic Effect (for buttons/elements)
// ============================================
export const magneticEffect = (element: HTMLElement, strength: number = 0.3) => {
  const handleMouseMove = (e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;

    gsap.to(element, {
      x: deltaX,
      y: deltaY,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = () => {
    gsap.to(element, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: "elastic.out(1, 0.3)",
    });
  };

  element.addEventListener("mousemove", handleMouseMove);
  element.addEventListener("mouseleave", handleMouseLeave);

  // Return cleanup function
  return () => {
    element.removeEventListener("mousemove", handleMouseMove);
    element.removeEventListener("mouseleave", handleMouseLeave);
  };
};

// ============================================
// Create Timeline for Complex Animations
// ============================================
export const createTimeline = (options?: gsap.TimelineVars) => {
  return gsap.timeline(options);
};

// ============================================
// Utility: Kill all ScrollTriggers for element
// ============================================
export const killScrollTriggers = (element: HTMLElement | string) => {
  ScrollTrigger.getAll()
    .filter((trigger) => trigger.trigger === element)
    .forEach((trigger) => trigger.kill());
};

// ============================================
// Utility: Refresh ScrollTrigger
// ============================================
export const refreshScrollTrigger = () => {
  ScrollTrigger.refresh();
};
