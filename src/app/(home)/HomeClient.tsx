"use client";

import { useRef, useEffect, useLayoutEffect, useState } from "react";
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
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { useContactStore } from "@/stores/contactStore";
import { useSiteConfig } from "@/providers/SiteConfigProvider";


// 섹션 — HeroSection만 즉시 로드, below-the-fold 섹션은 지연 로드
import HeroSection from "./_sections/HeroSection";
import dynamic from "next/dynamic";

const IntroSection = dynamic(() => import("./_sections/IntroSection"));
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

// GSAP 플러그인 등록 ("use client" 컴포넌트 — 항상 브라우저)
gsap.registerPlugin(ScrollTrigger);

export default function HomeClient() {
  const hasMounted = useHasMounted();
  const { isLoading } = useLoadingScreen();
  const cfg = useSiteConfig();
  const gsapInitRef = useRef(false);

  const { setInfinite, stop: lenisStop, start: lenisStart, lenis } = useLenis();

  // 브라우저 스크롤 복원 비활성 + 페인트 전 스크롤 0 확정.
  // Bridge 섹션(페이지 하단, Hero와 동일 레이아웃)이 스크롤 복원으로 노출되어
  // "최종 상태가 먼저 보이는" 플래시를 만드는 문제를 차단.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

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
    const timer = setTimeout(() => setInfinite(true), 2200);
    return () => {
      clearTimeout(timer);
      setInfinite(false);
    };
  }, [isLoading, setInfinite]);

  // ScrollTorus 지연 마운트: 로딩 직후 유휴 시간에 미리 마운트 (Three.js ~300KB 지연 로드).
  // Three.js/WebGL 초기화는 첫 마운트에서 프레임이 수십 ms 튄다. 예전엔 scroll 이벤트로
  // 트리거해서, 스크롤 도중 마운트되면 페이지 "중간"에서 눈에 띄게 끊겼다(무한스크롤 시 특히).
  // 스크롤과 분리해 로딩 직후 유휴 구간에 미리 마운트하면, 초기화 비용이 스크롤 전 조용한
  // 시점으로 옮겨져 스크롤 중 끊김이 사라진다.
  const [showTorus, setShowTorus] = useState(false);
  useEffect(() => {
    if (isLoading || showTorus || !cfg.home3d.scrollTorus) return;
    const mount = () => setShowTorus(true);
    const idleId = "requestIdleCallback" in window
      ? requestIdleCallback(mount, { timeout: 800 })
      : setTimeout(mount, 300);
    return () => {
      if ("requestIdleCallback" in window) cancelIdleCallback(idleId as number);
      else clearTimeout(idleId as ReturnType<typeof setTimeout>);
    };
  }, [isLoading, showTorus, cfg.home3d.scrollTorus]);

  // 레퍼런스
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLElement>(null);
  const servicesRef = useRef<HTMLElement>(null);
  const marqueeRef = useRef<HTMLElement>(null);
  const worksRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  // 커스텀 훅
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
    if (!hasMounted || isLoading || gsapInitRef.current) return;
    gsapInitRef.current = true;

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    const initTimeout = requestAnimationFrame(() => {
      // 레이아웃 재계산 강제 실행
      void document.body.offsetHeight;

      gsap.context(() => {
        // Hero 진입 애니메이션 제거 — .home 컨테이너의 CSS transition(슬라이드 업)만
        // 단일 진입 애니메이션으로 사용하여 여러 애니메이션 겹침으로 인한 플래시 방지

        // Profile 섹션 등장
        gsap.from(".intro-text", {
          y: 100,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: introRef.current,
            start: "top 70%",
            once: true,
          },
        });

        gsap.from(".intro-line", {
          scaleX: 0,
          duration: 1.2,
          ease: "power3.inOut",
          // 애니메이션 완료 후 inline transform 제거 — sub-pixel 렌더링으로
          // 1px 라인이 두껍게 보이는 현상 방지
          clearProps: "transform",
          scrollTrigger: {
            trigger: introRef.current,
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
          clearProps: "transform",
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
          scrollTrigger: {
            trigger: worksRef.current,
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
          scrollTrigger: {
            trigger: ctaRef.current,
            start: "top 60%",
            once: true,
          },
        });
      }, containerRef.current!);

      ScrollTrigger.refresh(true);

      // 진입 애니메이션(1.0s slide + 0.6s expand) 완료 후 트리거 위치 재계산
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(true), 2000);
    });

    return () => {
      cancelAnimationFrame(initTimeout);
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [hasMounted, isLoading]);

  if (!hasMounted) return null;

  return (
    <div className={styles.pageWrapper}>
      {showTorus && cfg.home3d.scrollTorus && <ScrollTorus />}
      <div className={styles.home} ref={containerRef}>
        <HeroSection
          ref={heroRef}
          floatX={floatX}
          floatY={floatY}
          oval2X={oval2X}
          oval2Y={oval2Y}
          onScrollDown={() => {
            introRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        <IntroSection ref={introRef} />

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
      </div>
    </div>
  );
}
