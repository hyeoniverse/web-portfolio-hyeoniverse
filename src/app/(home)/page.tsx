"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// 훅
import { useHasMounted } from "@/hooks/useHasMounted";
import { useMagnetic } from "@/hooks/useMagnetic";
import { useWorkInteraction } from "@/hooks/useWorkInteraction";
import { useMagneticRepel } from "@/hooks/useMagneticRepel";
import { useScrollVelocity } from "@/hooks/useScrollVelocity";
import { useContactForm } from "@/hooks/useContactForm";
import { useToast } from "@/hooks/useToast";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { useRecaptcha } from "@/providers/RecaptchaProvider";

// 섹션
import HeroSection from "./_sections/HeroSection";
import AboutSection from "./_sections/AboutSection";
import ServicesSection from "./_sections/ServicesSection";
import MarqueeSection from "./_sections/MarqueeSection";
import WorksSection from "./_sections/WorksSection";
import CTASection from "./_sections/CTASection";
import BridgeSection from "./_sections/BridgeSection";

// 컴포넌트
import ContactDrawer from "@/components/layout/ContactDrawer";
import dynamic from "next/dynamic";

const ScrollTorus = dynamic(
  () => import("@/components/effects/ScrollTorus"),
  { ssr: false }
);

import styles from "./Home.module.css";

// GSAP 플러그인 등록
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function HomePage() {
  const hasMounted = useHasMounted();
  const { isLoading } = useLoadingScreen();
  const { load: loadRecaptcha } = useRecaptcha();

  // 레퍼런스
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLElement>(null);
  const servicesRef = useRef<HTMLElement>(null);
  const marqueeRef = useRef<HTMLElement>(null);
  const worksRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  // 드로어 상태
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // 커스텀 훅
  const { toast, formToast, showFormToast } = useToast();
  const workInteraction = useWorkInteraction();
  const magneticRepel = useMagneticRepel();
  const scrollVelocity = useScrollVelocity(hasMounted);
  const contactForm = useContactForm();
  const magnetic = useMagnetic(0.4);

  // 토스트 핸들러 연결
  useEffect(() => {
    contactForm.onShowFormToast(showFormToast);
  }, [contactForm, showFormToast]);

  // 패럴랙스용 마우스 추적
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

  // 오벌 요소의 사전 계산된 변환
  const oval2X = useTransform(floatX, (v) => -v * 0.5);
  const oval2Y = useTransform(floatY, (v) => -v * 0.5);
  const ctaOvalX = useTransform(floatX, (v) => v * 0.3);
  const ctaOvalY = useTransform(floatY, (v) => v * 0.3);

  // 스크롤 압축을 위한 서비스 Y 변환
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

  // 마우스 위치 추적
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // GSAP 스크롤 애니메이션
  useEffect(() => {
    if (!hasMounted) return;

    let ctx: gsap.Context;

    const initTimeout = requestAnimationFrame(() => {
      // 레이아웃 재계산 강제 실행
      void document.body.offsetHeight;

      ctx = gsap.context(() => {
        // 히어로 섹션 애니메이션
        gsap.from(".hero-line", {
          y: 120,
          opacity: 0,
          duration: 1.2,
          stagger: 0.15,
          ease: "power4.out",
          delay: 0.3,
        });

        gsap.from(".hero-line-decoration", {
          scaleX: 0,
          duration: 1,
          ease: "power3.inOut",
          delay: 1,
        });

        // About 섹션 등장
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

        // 서비스 섹션 시차 등장
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

        // 수평선 애니메이션
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

        // Works 섹션 원형 요소 등장
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

        // CTA 오벌 스크롤 시 스케일
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

        // 텍스트 등장 애니메이션
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
      }, containerRef.current!);

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
      {!isLoading && <ScrollTorus />}
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
          onScrollDown={() => {
            aboutRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
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
          onContactClick={() => { loadRecaptcha(); setIsDrawerOpen(true); }}
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

        {/* 토스트 알림 */}
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
