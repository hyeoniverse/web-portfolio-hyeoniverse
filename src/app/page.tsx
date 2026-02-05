"use client";

import {
  useRef,
  useLayoutEffect,
  useEffect,
  useState,
  useCallback,
} from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useHasMounted } from "@/hooks/useHasMounted";
import { useLenis } from "@/providers/LenisProvider";
import styles from "./Home.module.css";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
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

export default function HomePage() {
  const hasMounted = useHasMounted();
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLElement>(null);
  const servicesRef = useRef<HTMLElement>(null);
  const marqueeRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

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
              <Link key={item.name} href={item.href} className={styles.navLink}>
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

        {/* Hero Content */}
        <div className={`${styles.heroContent} hero-content`}>
          <h1 className={styles.heroTitle}>
            <span className={`${styles.titleLine} hero-line`}>
              <span className={styles.titleText}>Creative</span>
            </span>
            <span className={`${styles.titleLine} hero-line`}>
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
            <span className={`${styles.titleLine} hero-line`}>
              <span className={styles.titleAccent}>&</span>
              <span className={styles.titleText}>Problem Solver</span>
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
              CREATIVE <span className={styles.marqueeOval} /> FRONTEND{" "}
              <span className={styles.marqueeLine} /> DEVELOPER{" "}
              <span className={styles.marqueeOval} /> INNOVATOR{" "}
              <span className={styles.marqueeLine} />{" "}
            </span>
          ))}
        </div>
      </section>

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
            Open to Opportunities
          </p>
          <h2 className={styles.ctaTitle}>
            <span className={`${styles.ctaLine} reveal-text`}>Looking for</span>
            <span className={`${styles.ctaLine} reveal-text`}>someone?</span>
          </h2>

          <motion.div
            ref={magnetic.ref}
            className={styles.ctaButtonWrapper}
            style={{ x: magnetic.x, y: magnetic.y }}
            onMouseMove={magnetic.handleMouseMove}
            onMouseLeave={magnetic.handleMouseLeave}
          >
            <Link href="/contact" className={styles.ctaButton}>
              <span>Get in touch</span>
              <motion.span
                className={styles.buttonOval}
                whileHover={{ scale: 1.5 }}
              />
            </Link>
          </motion.div>
        </div>

        <div className={styles.ctaFooter}>
          <a href="mailto:hello@example.com?subject=Hello!">
            hyeoniverse.dev@gmail.com
          </a>
          <span>HYEON © 2026, All Rights Reserved</span>
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
        <div className={`${styles.floatingOval} ${styles.oval3}`} />

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
    </div>
  );
}
