"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Hooks
import { useHasMounted } from "@/hooks/useHasMounted";
import { useMagnetic } from "@/hooks/useMagnetic";
import { useWorkInteraction } from "@/hooks/useWorkInteraction";
import { useMagneticRepel } from "@/hooks/useMagneticRepel";
import { useScrollVelocity } from "@/hooks/useScrollVelocity";
import { useContactForm } from "@/hooks/useContactForm";
import { useToast } from "@/hooks/useToast";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";

// Sections
import HeroSection from "./_sections/HeroSection";
import AboutSection from "./_sections/AboutSection";
import ServicesSection from "./_sections/ServicesSection";
import MarqueeSection from "./_sections/MarqueeSection";
import WorksSection from "./_sections/WorksSection";
import CTASection from "./_sections/CTASection";
import BridgeSection from "./_sections/BridgeSection";

// Components
import ContactDrawer from "@/components/layout/ContactDrawer";

import styles from "./Home.module.css";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function HomePage() {
  const hasMounted = useHasMounted();
  const { isLoading } = useLoadingScreen();

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLElement>(null);
  const servicesRef = useRef<HTMLElement>(null);
  const marqueeRef = useRef<HTMLElement>(null);
  const worksRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Custom hooks
  const { toast, formToast, showFormToast } = useToast();
  const workInteraction = useWorkInteraction();
  const magneticRepel = useMagneticRepel();
  const scrollVelocity = useScrollVelocity(hasMounted);
  const contactForm = useContactForm();
  const magnetic = useMagnetic(0.4);

  // Connect toast handlers
  useEffect(() => {
    contactForm.onShowFormToast(showFormToast);
  }, [contactForm, showFormToast]);

  // Mouse tracking for parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

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

  // Pre-computed transforms for ovals
  const oval2X = useTransform(floatX, (v) => -v * 0.5);
  const oval2Y = useTransform(floatY, (v) => -v * 0.5);
  const ctaOvalX = useTransform(floatX, (v) => v * 0.3);
  const ctaOvalY = useTransform(floatY, (v) => v * 0.3);

  // Service Y transforms for scroll compression
  const serviceY0 = useTransform(
    scrollVelocity.smoothServicesGap,
    (v) => v * 3,
  );
  const serviceY1 = useTransform(
    scrollVelocity.smoothServicesGap,
    (v) => v * 2,
  );
  const serviceY2 = useTransform(
    scrollVelocity.smoothServicesGap,
    (v) => v * 1,
  );

  // Mouse position tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // GSAP Scroll Animations
  useEffect(() => {
    if (!hasMounted) return;

    let ctx: gsap.Context;

    const initTimeout = requestAnimationFrame(() => {
      // Force layout recalculation
      void document.body.offsetHeight;

      ctx = gsap.context(() => {
        // Hero section animations
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

      ScrollTrigger.refresh(true);
    });

    return () => {
      cancelAnimationFrame(initTimeout);
      ctx?.revert();
    };
  }, [hasMounted]);

  if (!hasMounted) return null;

  return (
    <div className={styles.pageWrapper}>
      <motion.div
        className={styles.home}
        ref={containerRef}
        initial={{
          y: "100vh",
          width: "90vw",
          borderRadius: "var(--radius-2xl)",
        }}
        animate={{
          y: isLoading ? "100vh" : 0,
          width: isLoading ? "90vw" : "100vw",
          borderRadius: isLoading ? "var(--radius-2xl)" : "0px",
        }}
        transition={{
          y: {
            duration: 1.2,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
          width: {
            duration: 0.4,
            delay: 0.9,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
          borderRadius: {
            duration: 0.4,
            delay: 0.9,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        }}
      >
        <HeroSection
          ref={heroRef}
          floatX={floatX}
          floatY={floatY}
          oval2X={oval2X}
          oval2Y={oval2Y}
        />

        <AboutSection ref={aboutRef} />

        <ServicesSection
          ref={servicesRef}
          serviceY0={serviceY0}
          serviceY1={serviceY1}
          serviceY2={serviceY2}
        />

        <MarqueeSection ref={marqueeRef} />

        <WorksSection
          ref={worksRef}
          smoothWorkImageY={scrollVelocity.smoothWorkImageY}
          magneticOffsets={magneticRepel.magneticOffsets}
          setWorkCircleRef={magneticRepel.setWorkCircleRef}
          pressingWork={workInteraction.pressingWork}
          hoveringWork={workInteraction.hoveringWork}
          handlePressStart={workInteraction.handlePressStart}
          handlePressEnd={workInteraction.handlePressEnd}
          handleWorkClick={workInteraction.handleWorkClick}
          handleHoverStart={workInteraction.handleHoverStart}
          handleHoverEnd={workInteraction.handleHoverEnd}
        />

        <CTASection
          ref={ctaRef}
          floatX={floatX}
          floatY={floatY}
          ctaOvalX={ctaOvalX}
          ctaOvalY={ctaOvalY}
          magnetic={magnetic}
          onContactClick={() => setIsDrawerOpen(true)}
        />

        <BridgeSection
          floatX={floatX}
          floatY={floatY}
          oval2X={oval2X}
          oval2Y={oval2Y}
        />

        <ContactDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          formState={contactForm.formState}
          formRef={contactForm.formRef}
          fileInputRef={contactForm.fileInputRef}
          recaptchaRef={contactForm.recaptchaRef}
          privacyAccepted={contactForm.privacyAccepted}
          setPrivacyAccepted={contactForm.setPrivacyAccepted}
          fileName={contactForm.fileName}
          setFileName={contactForm.setFileName}
          setRecaptchaToken={contactForm.setRecaptchaToken}
          submittedData={contactForm.submittedData}
          recaptchaEnabled={contactForm.recaptchaEnabled}
          recaptchaVersion={contactForm.recaptchaVersion}
          handleSubmit={contactForm.handleSubmit}
          resetForm={contactForm.resetForm}
          formToast={formToast}
          copied={copied}
          setCopied={setCopied}
        />

        {/* Toast Notification */}
        <div
          className={`${styles.toast} ${toast ? styles.toastVisible : ""} ${
            toast?.type === "error"
              ? styles.toastError
              : toast?.type === "success"
                ? styles.toastSuccess
                : ""
          }`}
        >
          {toast?.message}
        </div>
      </motion.div>
    </div>
  );
}
