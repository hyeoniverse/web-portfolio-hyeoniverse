"use client";

import { useRef, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useHasMounted } from "@/hooks/useHasMounted";
import { siteConfig } from "@/config/site.config";
import styles from "./HeroSection.module.css";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Animation easing
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Stagger container
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

// Title line animation - slide up with rotation
const titleLineVariants = {
  hidden: {
    opacity: 0,
    y: 120,
    rotateX: -40,
    transformOrigin: "bottom",
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      duration: 1.2,
      ease: EASE_OUT_EXPO,
    },
  },
};

// Fade up animation
const fadeUpVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: EASE_OUT_EXPO,
    },
  },
};

// Service tag animation
const serviceVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: EASE_OUT_EXPO,
    },
  },
};

// Scroll indicator animation
const scrollIndicatorVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delay: 1.5,
      duration: 0.8,
    },
  },
};

const services = [
  "Branding",
  "Marketing Design",
  "UX/UI",
  "Webflow",
  "Development",
  "Motion",
];

export default function HeroSection() {
  const hasMounted = useHasMounted();
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  // GSAP Parallax Effect on Scroll
  useLayoutEffect(() => {
    if (!heroRef.current) return;

    const ctx = gsap.context(() => {
      // Parallax effect for content
      if (contentRef.current) {
        gsap.to(contentRef.current, {
          yPercent: 30,
          opacity: 0,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }

      // Scale effect for title
      if (titleRef.current) {
        gsap.to(titleRef.current, {
          scale: 0.9,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    }, heroRef);

    return () => ctx.revert();
  }, [hasMounted]);

  if (!hasMounted) return null;

  return (
    <div className={styles.hero} ref={heroRef}>
      {/* Background Layers for Parallax */}
      <div className={styles.bgLayer} />

      {/* Navigation Bar */}
      <motion.nav
        className={styles.nav}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: EASE_OUT_EXPO }}
      >
        <div className={styles.navLogo}>{siteConfig.brand.name}</div>
        <div className={styles.navLinks}>
          <Link href="/works" className={styles.navLink}>
            Works
          </Link>
          <Link href="/about" className={styles.navLink}>
            About
          </Link>
          <Link href="/webflow" className={styles.navLink}>
            WebFlow
          </Link>
        </div>
      </motion.nav>

      {/* Main Content */}
      <motion.div
        className={styles.content}
        ref={contentRef}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Tagline */}
        <motion.span className={styles.tagline} variants={fadeUpVariants}>
          {siteConfig.brand.tagline}
        </motion.span>

        {/* Main Title */}
        <div className={styles.titleWrapper} ref={titleRef}>
          <div className={styles.titleLine}>
            <motion.span variants={titleLineVariants}>WE CREATE</motion.span>
          </div>
          <div className={styles.titleLine}>
            <motion.span variants={titleLineVariants} className={styles.titleAccent}>
              DIGITAL
            </motion.span>
          </div>
          <div className={styles.titleLine}>
            <motion.span variants={titleLineVariants}>EXPERIENCES</motion.span>
          </div>
        </div>

        {/* Description */}
        <motion.p className={styles.description} variants={fadeUpVariants}>
          We help brands stand out in the digital age through
          <br />
          strategic design and innovative technology.
        </motion.p>

        {/* Services List */}
        <motion.div className={styles.services} variants={containerVariants}>
          {services.map((service, index) => (
            <motion.span
              key={service}
              className={styles.serviceTag}
              variants={serviceVariants}
              custom={index}
            >
              {service}
              {index < services.length - 1 && (
                <span className={styles.serviceDot} />
              )}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        className={styles.scrollIndicator}
        variants={scrollIndicatorVariants}
        initial="hidden"
        animate="visible"
      >
        <span className={styles.scrollText}>Scroll to explore</span>
        <div className={styles.scrollLine}>
          <motion.div
            className={styles.scrollDot}
            animate={{
              y: [0, 24, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      </motion.div>

      {/* Bottom Info */}
      <motion.div
        className={styles.bottomInfo}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        <span className={styles.email}>{siteConfig.contact.email}</span>
        <span className={styles.location}>{siteConfig.personal.location}</span>
      </motion.div>
    </div>
  );
}
