"use client";

import {
  useRef,
  useLayoutEffect,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useHasMounted } from "@/hooks/useHasMounted";
import { useLenis } from "@/providers/LenisProvider";
import { siteConfig } from "@/config/site.config";
import styles from "./Home.module.css";
import OptimizedImage from "@/components/ui/OptimizedImage";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Split text into individual characters for hover effect
function SplitText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {children.split("").map((char, i) => (
        <span
          key={i}
          className={styles.char}
          style={{ transitionDelay: `${i * 0.03}s` }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}

// Magnetic effect hook
function useMagnetic(strength: number = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set((e.clientX - centerX) * strength);
      y.set((e.clientY - centerY) * strength);
    },
    [strength, x, y],
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return { ref, x: springX, y: springY, handleMouseMove, handleMouseLeave };
}

// Works data
const worksData = [
  {
    id: "1",
    main: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop",
    hover:
      "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400&h=400&fit=crop",
  },
  {
    id: "2",
    main: "https://images.unsplash.com/photo-1634017839464-5c339bbe3c35?w=400&h=400&fit=crop",
    hover:
      "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=400&fit=crop",
  },
  {
    id: "3",
    main: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&h=400&fit=crop",
    hover:
      "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=400&fit=crop",
  },
  {
    id: "4",
    main: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400&h=400&fit=crop",
    hover:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop",
  },
  {
    id: "5",
    main: "https://images.unsplash.com/photo-1633167606207-d840b5070fc2?w=400&h=400&fit=crop",
    hover:
      "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=400&h=400&fit=crop",
  },
  {
    id: "6",
    main: "https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=400&h=400&fit=crop",
    hover:
      "https://images.unsplash.com/photo-1634017839464-5c339bbe3c35?w=400&h=400&fit=crop",
  },
  {
    id: "7",
    main: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=400&fit=crop",
    hover:
      "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&h=400&fit=crop",
  },
  {
    id: "8",
    main: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=400&fit=crop",
    hover:
      "https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=400&h=400&fit=crop",
  },
  {
    id: "9",
    main: "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=400&h=400&fit=crop",
    hover:
      "https://images.unsplash.com/photo-1633167606207-d840b5070fc2?w=400&h=400&fit=crop",
  },
  {
    id: "10",
    main: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop",
    hover:
      "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400&h=400&fit=crop",
  },
  {
    id: "11",
    main: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&h=400&fit=crop",
    hover:
      "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=400&fit=crop",
  },
];

export default function HomePage() {
  const hasMounted = useHasMounted();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLElement>(null);
  const servicesRef = useRef<HTMLElement>(null);
  const marqueeRef = useRef<HTMLElement>(null);
  const worksRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  const [expandingWork, setExpandingWork] = useState<{
    id: string;
    rect: DOMRect;
    image: string;
  } | null>(null);
  const [pressingWork, setPressingWork] = useState<{
    id: string;
    scale: number;
    element: HTMLElement | null;
  } | null>(null);
  const pressStartTimeRef = useRef<number>(0);
  const pressAnimationRef = useRef<number>(0);
  const hasNavigatedRef = useRef<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [, setMousePos] = useState({ x: 0, y: 0 });
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth mouse following
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  // Transform for floating elements
  const floatX = useTransform(
    smoothMouseX,
    [0, typeof window !== "undefined" ? window.innerWidth : 1920],
    [-30, 30],
  );
  const floatY = useTransform(
    smoothMouseY,
    [0, typeof window !== "undefined" ? window.innerHeight : 1080],
    [-30, 30],
  );

  // Pre-computed transforms for ovals (to avoid useTransform in JSX)
  const oval2X = useTransform(floatX, (v) => -v * 0.5);
  const oval2Y = useTransform(floatY, (v) => -v * 0.5);
  const ctaOvalX = useTransform(floatX, (v) => v * 0.3);
  const ctaOvalY = useTransform(floatY, (v) => v * 0.3);

  const magnetic = useMagnetic(0.4);

  // Long press threshold (ms) - navigate after this duration
  const LONG_PRESS_THRESHOLD = 800;
  const MAX_SCALE = 1.5;
  const MIN_SCALE = 1;

  // Handle press start
  const handlePressStart = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
      work: (typeof worksData)[0],
    ) => {
      const target = e.currentTarget;
      pressStartTimeRef.current = Date.now();
      hasNavigatedRef.current = false;

      setPressingWork({ id: work.id, scale: MIN_SCALE, element: target });

      const animate = () => {
        if (hasNavigatedRef.current) return;

        const elapsed = Date.now() - pressStartTimeRef.current;
        const progress = Math.min(elapsed / LONG_PRESS_THRESHOLD, 1);
        const newScale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * progress;

        setPressingWork((prev) => (prev ? { ...prev, scale: newScale } : null));

        // Navigate when threshold reached
        if (elapsed >= LONG_PRESS_THRESHOLD && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          const rect = target.getBoundingClientRect();
          setExpandingWork({ id: work.id, rect, image: work.main });

          setTimeout(() => {
            router.push(`/works/${work.id}`);
          }, 600);
          return;
        }

        pressAnimationRef.current = requestAnimationFrame(animate);
      };

      pressAnimationRef.current = requestAnimationFrame(animate);
    },
    [router],
  );

  // Handle press end
  const handlePressEnd = useCallback(() => {
    cancelAnimationFrame(pressAnimationRef.current);
    setPressingWork(null);
  }, []);

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const { lenis } = useLenis();

  // Lenis infinite scroll handles the loop automatically
  // We just need to ensure animations work correctly
  useEffect(() => {
    if (!hasMounted || !lenis) return;

    // No additional handling needed - Lenis infinite is enabled in provider
  }, [hasMounted, lenis]);

  // GSAP Scroll Animations
  useEffect(() => {
    if (!hasMounted) return;

    let ctx: gsap.Context;

    // Delay GSAP initialization to ensure DOM is fully rendered
    const initTimeout = requestAnimationFrame(() => {
      // Force layout recalculation
      document.body.offsetHeight;

      ctx = gsap.context(() => {
        // Hero section animations - animate from current state
        gsap.from(".hero-line", {
          y: 120,
          opacity: 0,
          duration: 1.2,
          stagger: 0.15,
          ease: "power4.out",
          delay: 0.3,
        });

        gsap.from(".hero-oval", {
          scale: 0,
          opacity: 0,
          duration: 1.5,
          ease: "elastic.out(1, 0.5)",
          delay: 0.8,
        });

        gsap.from(".hero-line-decoration", {
          scaleX: 0,
          duration: 1,
          ease: "power3.inOut",
          delay: 1,
        });

        // About section reveal
        gsap.from(".about-text", {
          y: 100,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: aboutRef.current,
            start: "top 70%",
            once: true,
          },
        });

        gsap.from(".about-line", {
          scaleX: 0,
          duration: 1.2,
          ease: "power3.inOut",
          immediateRender: false,
          scrollTrigger: {
            trigger: aboutRef.current,
            start: "top 60%",
            once: true,
          },
        });

        // Services section stagger reveal
        gsap.from(".service-item", {
          y: 80,
          opacity: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: servicesRef.current,
            start: "top 65%",
            once: true,
          },
        });

        // Horizontal lines animation
        gsap.from(".horizontal-rule", {
          scaleX: 0,
          duration: 1,
          stagger: 0.1,
          ease: "power2.inOut",
          immediateRender: false,
          scrollTrigger: {
            trigger: servicesRef.current,
            start: "top 70%",
            once: true,
          },
        });

        // Marquee continuous scroll
        gsap.to(".marquee-track", {
          xPercent: -50,
          duration: 25,
          ease: "none",
          repeat: -1,
        });

        // Works section circles reveal
        gsap.from(".work-circle", {
          scale: 0,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "back.out(1.7)",
          immediateRender: false,
          scrollTrigger: {
            trigger: worksRef.current,
            start: "top 70%",
            once: true,
          },
        });

        // CTA oval scale on scroll
        gsap.from(".cta-oval", {
          scale: 0.8,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: ctaRef.current,
            start: "top 70%",
            once: true,
          },
        });

        // Text reveal animation
        gsap.from(".reveal-text", {
          clipPath: "inset(100% 0 0 0)",
          y: 50,
          duration: 1,
          stagger: 0.1,
          ease: "power4.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: ctaRef.current,
            start: "top 60%",
            once: true,
          },
        });
      });

      // Force ScrollTrigger refresh after setup
      ScrollTrigger.refresh(true);
    });

    return () => {
      cancelAnimationFrame(initTimeout);
      ctx?.revert();
    };
  }, [hasMounted]);

  if (!hasMounted) return null;

  return (
    <div className={styles.home} ref={containerRef}>
      {/* ========== HERO SECTION ========== */}
      <section className={styles.hero} ref={heroRef}>
        {/* Floating Ovals */}
        <motion.div
          className={`${styles.floatingOval} ${styles.oval1} parallax-oval-1`}
          style={{ x: floatX, y: floatY }}
        />
        <motion.div
          className={`${styles.floatingOval} ${styles.oval2} parallax-oval-2`}
          style={{ x: oval2X, y: oval2Y }}
        />
        <div className={`${styles.floatingOval} ${styles.oval3} hero-oval`} />

        {/* Decorative Lines */}
        <div
          className={`${styles.heroLine} ${styles.lineTop} hero-line-decoration`}
        />
        <div
          className={`${styles.heroLine} ${styles.lineBottom} hero-line-decoration`}
        />

        {/* Navigation */}
        <nav className={styles.nav}>
          <Link href="/" className={styles.logo}>
            <span className="glith-on-hover">H</span>
          </Link>
          <div className={styles.navLinks}>
            {[
              { name: "Works", href: "/works" },
              { name: "About", href: "/about" },
              { name: "Web Flow", href: "/webflow" },
            ].map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`${styles.navLink} glith-on-hover`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

        {/* Hero Content */}
        <div className={`${styles.heroContent} hero-content`}>
          <h1 className={styles.heroTitle}>
            <span className={`${styles.titleLine} hero-line`}>
              <SplitText className={styles.titleText}>Creative</SplitText>
            </span>
            <span className={`${styles.titleLine} hero-line`}>
              <SplitText className={styles.titleText}>Developer</SplitText>
              <span className={styles.titleOval}>
                <motion.span
                  className={styles.ovalInline}
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </span>
            </span>
            <span className={`${styles.titleLine} hero-line`}>
              <span className={styles.titleAccent}>&</span>
              <SplitText className={styles.titleText}>Problem Solver</SplitText>
            </span>
          </h1>

          <div className={styles.heroMeta}>
            <span className="hero-line">Based in Seoul, KR</span>
            <span className={styles.metaDivider} />
            <span className="hero-line">Available for projects</span>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className={styles.scrollIndicator}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <motion.div
            className={styles.scrollLine}
            animate={{ scaleY: [0, 1, 0], y: [0, 0, 20] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </section>

      {/* ========== ABOUT SECTION ========== */}
      <section className={styles.about} ref={aboutRef}>
        <div className={`${styles.aboutLine} about-line`} />
        <div className={styles.aboutContent}>
          <p className={`${styles.aboutText} about-text`}>
            I craft digital experiences where
            <span className="highlighted-text"> aesthetics </span>
            meet
            <span className="highlighted-text"> functionality</span>. Focused on
            creating memorable interactions through thoughtful design and clean
            code.
          </p>
        </div>
        <div className={`${styles.aboutLine} about-line`} />
      </section>

      {/* ========== SERVICES SECTION ========== */}
      <section className={styles.services} ref={servicesRef}>
        <div className={styles.servicesHeader}>
          <span className={styles.sectionLabel}>What I Do</span>
          <div className={`${styles.sectionLine} horizontal-rule`} />
        </div>

        <div className={styles.servicesList}>
          {[
            {
              num: "01",
              title: "Web Development",
              desc: "React, Next.js, TypeScript",
            },
            {
              num: "02",
              title: "UI/UX Design",
              desc: "Figma, Prototyping, Systems",
            },
            {
              num: "03",
              title: "Motion Design",
              desc: "GSAP, Framer Motion, CSS",
            },
            {
              num: "04",
              title: "Brand Identity",
              desc: "Visual Language, Guidelines",
            },
          ].map((service) => (
            <motion.div
              key={service.num}
              className={`${styles.serviceItem} service-item`}
              whileHover={{ x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`${styles.serviceLine} horizontal-rule`} />
              <div className={styles.serviceContent}>
                <span className={styles.serviceNum}>{service.num}</span>
                <h3 className={styles.serviceTitle}>{service.title}</h3>
                <span className={styles.serviceDesc}>{service.desc}</span>
                <motion.div
                  className={styles.serviceOval}
                  whileHover={{ scale: 1.2 }}
                />
              </div>
            </motion.div>
          ))}
          <div className={`${styles.serviceLine} horizontal-rule`} />
        </div>
      </section>

      {/* ========== MARQUEE SECTION ========== */}
      <section className={styles.marquee} ref={marqueeRef}>
        <div className={`${styles.marqueeTrack} marquee-track`}>
          {[...Array(4)].map((_, idx) => (
            <span key={idx} className={styles.marqueeText}>
              <SplitText className={styles.marqueeWord}>CREATIVE</SplitText>{" "}
              <span className={styles.marqueeOval} />{" "}
              <SplitText className={styles.marqueeWord}>FRONTEND</SplitText>{" "}
              <span className={styles.marqueeLine} />{" "}
              <SplitText className={styles.marqueeWord}>DEVELOPER</SplitText>{" "}
              <span className={styles.marqueeOval} />{" "}
              <SplitText className={styles.marqueeWord}>INNOVATOR</SplitText>{" "}
              <span className={styles.marqueeLine} />{" "}
            </span>
          ))}
        </div>
      </section>

      {/* ========== SELECTED WORKS SECTION ========== */}
      <section className={styles.works} ref={worksRef}>
        <div className={styles.worksContainer}>
          <div className={styles.worksGrid}>
            {(() => {
              const items = [];
              let workIndex = 0;

              /*
                Pattern:
                ◼☐☐☐◼  (row 0: col 0,4)
                ☐◼☐◼☐  (row 1: col 1,3)
                ◼☐◼☐◼  (row 2: col 0,2,4)
                ☐◼☐◼☐  (row 3: col 1,3)
                ◼텍스트◼ (row 4: col 0,4 + text in 1-3)
              */
              const imagePositions = [
                [0, 4], // row 0
                [1, 3], // row 1
                [0, 2, 4], // row 2
                [1, 3], // row 3
                [0, 4], // row 4
              ];

              for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                  const index = row * 5 + col;

                  // Skip text area (row 4, cols 1-3)
                  if (row === 4 && col >= 1 && col <= 3) continue;

                  const hasImage = imagePositions[row].includes(col);
                  const work =
                    hasImage && workIndex < worksData.length
                      ? worksData[workIndex++]
                      : null;

                  const isPressing = pressingWork?.id === work?.id;
                  const pressScale =
                    isPressing && pressingWork ? pressingWork.scale : 1;

                  items.push(
                    <div key={index} className={styles.worksGridItem}>
                      {work && (
                        <motion.div
                          className={`${styles.workCircle} work-circle`}
                          onMouseDown={(e) => handlePressStart(e, work)}
                          onMouseUp={handlePressEnd}
                          onMouseLeave={handlePressEnd}
                          onTouchStart={(e) => handlePressStart(e, work)}
                          onTouchEnd={handlePressEnd}
                          animate={{ scale: isPressing ? pressScale : 1 }}
                          whileHover={{ scale: isPressing ? pressScale : 1.05 }}
                          transition={{ duration: 0.1, ease: "easeOut" }}
                        >
                          <div className={styles.workImageWrapper}>
                            <img
                              src={work.main}
                              alt=""
                              className={styles.workImage}
                            />
                            <img
                              src={work.hover}
                              alt=""
                              className={styles.workImageHover}
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>,
                  );
                }
              }

              // Add title at bottom center (row 4, cols 1-3)
              items.push(
                <div key="title" className={styles.worksTitle}>
                  <h2 className={styles.worksTitleText}>
                    Selected
                    <br />
                    Works
                  </h2>
                </div>,
              );

              return items;
            })()}
          </div>
        </div>
      </section>

      {/* Expanding Work Overlay */}
      <AnimatePresence>
        {expandingWork && (
          <motion.div
            className={styles.workExpandOverlay}
            initial={{
              position: "fixed",
              top: expandingWork.rect.top,
              left: expandingWork.rect.left,
              width: expandingWork.rect.width,
              height: expandingWork.rect.height,
              borderRadius: "50%",
              zIndex: 9999,
            }}
            animate={{
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              borderRadius: "0%",
            }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <img
              src={expandingWork.image}
              alt=""
              className={styles.workExpandImage}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== CTA SECTION ========== */}
      <section className={styles.cta} ref={ctaRef}>
        {/* Decorative Lines - mirroring hero section */}
        <div className={`${styles.ctaDecorLine} ${styles.ctaLineTop}`} />
        <div className={`${styles.ctaDecorLine} ${styles.ctaLineBottom}`} />

        {/* Floating Ovals - creating visual continuity */}
        <motion.div
          className={`${styles.ctaOval} cta-oval`}
          style={{ x: ctaOvalX, y: ctaOvalY }}
        />
        <motion.div
          className={`${styles.ctaOvalSecondary}`}
          style={{ x: floatX, y: floatY }}
        />

        <div className={styles.ctaContent}>
          <p className={`${styles.ctaLabel} reveal-text`}>
            {siteConfig.cta.label}
          </p>
          <h2 className={styles.ctaTitle}>
            {siteConfig.cta.title.map((line, i) => (
              <span key={i} className={`${styles.ctaLine} reveal-text`}>
                {line}
              </span>
            ))}
          </h2>

          <motion.div
            ref={magnetic.ref}
            className={styles.ctaButtonWrapper}
            style={{ x: magnetic.x, y: magnetic.y }}
            onMouseMove={magnetic.handleMouseMove}
            onMouseLeave={magnetic.handleMouseLeave}
          >
            <button
              className={styles.ctaButton}
              onClick={() => setIsDrawerOpen(true)}
            >
              <span>{siteConfig.cta.buttonText}</span>
              <motion.span
                className={styles.buttonOval}
                whileHover={{ scale: 1.5 }}
              />
            </button>
          </motion.div>
        </div>

        <div className={styles.ctaFooter}>
          <a href={`mailto:${siteConfig.contact.email}?subject=Hello!`}>
            {siteConfig.contact.email}
          </a>
          <span>{siteConfig.footer.copyright}</span>
        </div>
      </section>

      {/* ========== BRIDGE SECTION - connects CTA to Hero ========== */}
      {/* Must match Hero section exactly for seamless infinite scroll */}
      <section className={styles.bridge}>
        {/* Floating Ovals - identical to Hero */}
        <motion.div
          className={`${styles.floatingOval} ${styles.oval1}`}
          style={{ x: floatX, y: floatY }}
        />
        <motion.div
          className={`${styles.floatingOval} ${styles.oval2}`}
          style={{ x: oval2X, y: oval2Y }}
        />

        {/* Decorative Lines - identical to Hero */}
        <div className={`${styles.heroLine} ${styles.lineTop}`} />
        <div className={`${styles.heroLine} ${styles.lineBottom}`} />

        {/* Content - identical to Hero */}
        <div className={styles.bridgeContent}>
          <h2 className={styles.heroTitle}>
            <span className={styles.titleLine}>
              <span className={styles.titleText}>Creative</span>
            </span>
            <span className={styles.titleLine}>
              <span className={styles.titleText}>Developer</span>
              <span className={styles.titleOval}>
                <motion.span
                  className={styles.ovalInline}
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </span>
            </span>
            <span className={styles.titleLine}>
              <span className={styles.titleAccent}>&</span>
              <span className={styles.titleText}>Problem Solver</span>
            </span>
          </h2>

          <div className={styles.heroMeta}>
            <span>Based in Seoul, KR</span>
            <span className={styles.metaDivider} />
            <span>Available for projects</span>
          </div>
        </div>

        {/* Scroll Indicator - identical to Hero */}
        <div className={styles.scrollIndicator}>
          <motion.div
            className={styles.scrollLine}
            animate={{ scaleY: [0, 1, 0], y: [0, 0, 20] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </section>

      {/* ========== CONTACT DRAWER ========== */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            className={styles.drawerBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }}
            exit={{ opacity: 0, transition: { duration: 0.4, delay: 0.35, ease: "easeInOut" } }}
            onClick={(e) => {
              if (
                drawerRef.current &&
                !drawerRef.current.contains(e.target as Node)
              ) {
                setIsDrawerOpen(false);
              }
            }}
          >
            <motion.div
              ref={drawerRef}
              className={styles.drawer}
              initial={{ x: "-100%" }}
              animate={{ x: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } }}
              exit={{ x: "-100%", transition: { duration: 0.6, delay: 0.15, ease: [0.4, 0, 0.6, 1] } }}
            >
              {/* Close Button */}
              <motion.button
                className={styles.drawerClose}
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.3, delay: 0.7 } }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                <svg width="18" height="2" viewBox="0 0 18 2" fill="none">
                  <path
                    d="M1 1H17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </motion.button>

              {/* Left: Form Card */}
              <motion.div
                className={styles.drawerFormCard}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1, transition: { duration: 0.4, delay: 0.35, ease: "easeOut" } }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.25, delay: 0.1, ease: "easeIn" } }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.55, ease: "easeOut" } }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                >
                  <h2 className={styles.drawerTitle}>Fill out the form</h2>

                  <div className={styles.drawerFormRow}>
                    <input
                      type="text"
                      className={styles.drawerInput}
                      placeholder="Name"
                    />
                    <input
                      type="email"
                      className={styles.drawerInput}
                      placeholder="Email"
                    />
                  </div>

                  {/* File Upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setFileName(file.name);
                    }}
                  />
                  <button
                    className={`${styles.drawerFileBtn} ${fileName ? styles.drawerFileBtnActive : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {fileName || "Attach a pdf/doc file, max 10Mb"}
                  </button>

                  {/* Textarea */}
                  <textarea
                    className={styles.drawerTextarea}
                    placeholder="Share more about the project"
                    rows={6}
                  />

                  {/* Footer */}
                  <div className={styles.drawerFormFooter}>
                    <label className={styles.drawerPrivacy}>
                      <input type="checkbox" />
                      <span>
                        Accept the <a href="#">Privacy Policy</a>
                      </span>
                    </label>

                    <button className={styles.drawerSubmitBtn}>Submit</button>
                  </div>
                </motion.div>
              </motion.div>

              {/* Right: Info Cards */}
              <div className={styles.drawerRightColumn}>
                {/* Email Card */}
                <motion.div
                  className={styles.drawerEmailCard}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1, transition: { duration: 0.4, delay: 0.35, ease: "easeOut" } }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.25, delay: 0.05, ease: "easeIn" } }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.55, ease: "easeOut" } }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  >
                    <h3 className={styles.drawerEmailTitle}>Or email me</h3>
                    <button
                      className={styles.drawerEmailAddress}
                      onClick={() => {
                        navigator.clipboard?.writeText(siteConfig.contact.email);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      <span className={`${styles.drawerEmailTextWrapper} ${copied ? styles.hiddenKeepSpace : ""}`}>
                        {siteConfig.contact.email}
                        <svg
                          className={styles.drawerCopyIcon}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      </span>
                      <span className={`${styles.drawerCopiedText} ${copied ? "" : styles.hidden}`}>
                        Copied!
                      </span>
                    </button>
                  </motion.div>
                </motion.div>

                {/* Profile Card */}
                <motion.div
                  className={styles.drawerProfileCard}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1, transition: { duration: 0.4, delay: 0.35, ease: "easeOut" } }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.25, ease: "easeIn" } }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.55, ease: "easeOut" } }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  >
                    <div className={styles.drawerProfileImage}>
                      <span className={styles.drawerProfilePlaceholder}>
                        <OptimizedImage
                          src="/images/profile_pic.webp"
                          alt="Profile"
                          width={400}
                          height={400}
                          priority={false}
                          placeholder="blur"
                        />
                      </span>
                    </div>
                    <h4 className={styles.drawerProfileName}>
                      {siteConfig.personal.name}
                    </h4>
                    <p className={styles.drawerProfileRole}>
                      {siteConfig.personal.role}
                    </p>
                  </motion.div>
                </motion.div>

                {/* Social Card */}
                <motion.div
                  className={styles.drawerSocialCard}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1, transition: { duration: 0.4, delay: 0.35, ease: "easeOut" } }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.25, ease: "easeIn" } }}
                >
                  <motion.div
                    className={styles.drawerSocialIcons}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.55, ease: "easeOut" } }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  >
                    {siteConfig.social.github && (
                      <a
                        className={styles.drawerSocialIcon}
                        href={siteConfig.social.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="GitHub"
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                        </svg>
                      </a>
                    )}
                    {siteConfig.social.linkedin && (
                      <a
                        className={styles.drawerSocialIcon}
                        href={siteConfig.social.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="LinkedIn"
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                      </a>
                    )}
                    {siteConfig.social.blog && (
                      <a
                        className={styles.drawerSocialIcon}
                        href={siteConfig.social.blog}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Blog"
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M19.199 24C19.199 13.467 10.533 4.8 0 4.8V0c13.165 0 24 10.835 24 24h-4.801zM3.291 17.415a3.3 3.3 0 013.293 3.295A3.303 3.303 0 013.283 24C1.47 24 0 22.526 0 20.71s1.475-3.294 3.291-3.295zM15.909 24h-4.665c0-6.169-5.075-11.245-11.244-11.245V8.09c8.727 0 15.909 7.184 15.909 15.91z" />
                        </svg>
                      </a>
                    )}
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
