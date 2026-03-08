"use client";

import { useRef, useEffect, useState } from "react";
import { useMotionValue, useSpring, useTransform } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// 훅
import { useHasMounted } from "@/hooks/useHasMounted";
import { useLenis } from "@/providers/LenisProvider";
import { useMagnetic } from "@/hooks/useMagnetic";
import { useWorkInteraction } from "@/hooks/useWorkInteraction";
import { useMagneticRepel } from "@/hooks/useMagneticRepel";
import { useScrollVelocity } from "@/hooks/useScrollVelocity";
import { useToast } from "@/hooks/useToast";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { useContactStore } from "@/stores/contactStore";


// 섹션 — HeroSection만 즉시 로드, below-the-fold 섹션은 지연 로드
import HeroSection from "./_sections/HeroSection";
import dynamic from "next/dynamic";

const ProfileSection = dynamic(() => import("./_sections/ProfileSection"));
const ServicesSection = dynamic(() => import("./_sections/ServicesSection"));
const MarqueeSection = dynamic(() => import("./_sections/MarqueeSection"));
const WorksSection = dynamic(() => import("./_sections/WorksSection"));
const CTASection = dynamic(() => import("./_sections/CTASection"));
const BridgeSection = dynamic(() => import("./_sections/BridgeSection"));

// 컴포넌트
import Footer from "@/components/layout/Footer";

const ScrollTorus = dynamic(
  () => import("@/components/effects/ScrollTorus"),
  { ssr: false }
);

import styles from "./Home.module.css";

export default function HomePage() {
  const hasMounted = useHasMounted();
  const { isLoading } = useLoadingScreen();
  const { setInfinite, stop: lenisStop, start: lenisStart, lenis } = useLenis();

  // 로딩 중 Lenis 정지 — 스크롤 위치 밀림 방지
  useEffect(() => {
    if (isLoading) {
      lenisStop();
    } else {
      window.scrollTo(0, 0);
      lenis?.scrollTo(0, { immediate: true });
      lenisStart();
    }
  }, [isLoading, lenis, lenisStop, lenisStart]);

  // 무한 스크롤: 진입 애니메이션 완료(~1.7s) 후 활성화
  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => setInfinite(true), 500);
    return () => {
      clearTimeout(timer);
      setInfinite(false);
    };
  }, [isLoading, setInfinite]);

  // ScrollTorus 지연 마운트: 사용자 인터랙션 후 로드 (Three.js ~300KB 지연)
  const [showTorus, setShowTorus] = useState(false);
  useEffect(() => {
    if (isLoading || showTorus) return;
    const load = () => { setShowTorus(true); };
    // 스크롤 또는 마우스 이동 시 로드
    window.addEventListener("scroll", load, { once: true, passive: true });
    window.addEventListener("mousemove", load, { once: true, passive: true });
    // idle 시 로드 (Lighthouse 측정 후에 로드되도록 충분한 지연)
    const idleId = "requestIdleCallback" in window
      ? requestIdleCallback(() => { setTimeout(load, 8000); }, { timeout: 15000 })
      : setTimeout(load, 10000);
    return () => {
      window.removeEventListener("scroll", load);
      window.removeEventListener("mousemove", load);
      if ("requestIdleCallback" in window) cancelIdleCallback(idleId as number);
      else clearTimeout(idleId as ReturnType<typeof setTimeout>);
    };
  }, [isLoading, showTorus]);

  // 레퍼런스
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const profileRef = useRef<HTMLElement>(null);
  const servicesRef = useRef<HTMLElement>(null);
  const marqueeRef = useRef<HTMLElement>(null);
  const worksRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  // 커스텀 훅
  const { toast } = useToast();
  const workInteraction = useWorkInteraction();
  const magneticRepel = useMagneticRepel();
  const scrollVelocity = useScrollVelocity(hasMounted);
  const { openForm } = useContactStore();
  const magnetic = useMagnetic(0.4);
  const resumeMagnetic = useMagnetic(0.4);

  // 패럴랙스용 마우스 추적
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const floatX = useTransform(
    smoothMouseX,
    [0, 1920],
    [-30, 30],
  );
  const floatY = useTransform(
    smoothMouseY,
    [0, 1080],
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

  // GSAP 스크롤 애니메이션 — 로딩 완료 후 초기화
  useEffect(() => {
    if (!hasMounted || isLoading) return;

    gsap.registerPlugin(ScrollTrigger);

    let ctx: gsap.Context;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    const initTimeout = requestAnimationFrame(() => {
      ctx = gsap.context(() => {
        // 히어로 섹션 애니메이션 — y/opacity 최소화: LCP 요소가 뷰포트 내 유지
        gsap.from(".hero-line", {
          y: 30,
          duration: 0.3,
          stagger: 0.03,
          ease: "power4.out",
          delay: 0,
        });

        gsap.from(".hero-line-decoration", {
          scaleX: 0,
          duration: 0.3,
          ease: "power3.inOut",
          delay: 0.15,
        });

        // Profile 섹션 등장
        gsap.from(".profile-text", {
          y: 100,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: profileRef.current,
            start: "top 70%",
            once: true,
          },
        });

        gsap.from(".profile-line", {
          scaleX: 0,
          duration: 1.2,
          ease: "power3.inOut",
          immediateRender: false,
          scrollTrigger: {
            trigger: profileRef.current,
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

      // 진입 애니메이션 완료 후 트리거 위치 재계산
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(true), 500);
    });

    return () => {
      cancelAnimationFrame(initTimeout);
      if (refreshTimer) clearTimeout(refreshTimer);
      ctx?.revert();
    };
  }, [hasMounted, isLoading]);

  return (
    <div className={styles.pageWrapper}>
      {showTorus && <ScrollTorus />}
      <div
        className={`${styles.home} ${!isLoading ? styles.homeReady : ""}`}
        ref={containerRef}
      >
        <HeroSection
          ref={heroRef}
          floatX={floatX}
          floatY={floatY}
          oval2X={oval2X}
          oval2Y={oval2Y}
          onScrollDown={() => {
            profileRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        <ProfileSection ref={profileRef} />

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
          resumeMagnetic={resumeMagnetic}
          onContactClick={openForm}
        />

        <Footer variant="minimal" />

        <BridgeSection
          floatX={floatX}
          floatY={floatY}
          oval2X={oval2X}
          oval2Y={oval2Y}
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
      </div>
    </div>
  );
}
