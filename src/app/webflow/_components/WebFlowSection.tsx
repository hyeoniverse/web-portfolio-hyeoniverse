"use client";

import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { siteConfig } from "@/config/site.config";
import styles from "./WebFlowSection.module.css";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const designFeatures = [
  {
    icon: "01",
    title: "Infinite Scroll Loop",
    description: "Lenis smooth scroll과 무한 루프를 결합하여 끊김 없는 순환 스크롤 경험을 구현했습니다.",
    tech: ["Lenis", "Infinite Scroll", "Bridge Section"],
  },
  {
    icon: "02",
    title: "Mouse Parallax",
    description: "Framer Motion의 useSpring과 useTransform을 활용한 마우스 반응형 패럴랙스 효과를 적용했습니다.",
    tech: ["Framer Motion", "useMotionValue", "Parallax"],
  },
  {
    icon: "03",
    title: "Scroll-Triggered Animations",
    description: "GSAP ScrollTrigger로 스크롤 위치에 따라 자연스럽게 등장하는 요소들을 구현했습니다.",
    tech: ["GSAP", "ScrollTrigger", "once: true"],
  },
  {
    icon: "04",
    title: "Mix-Blend Navigation",
    description: "mix-blend-mode: difference를 활용해 배경에 따라 자동으로 반전되는 네비게이션을 구현했습니다.",
    tech: ["CSS Blend Mode", "Fixed Nav", "z-index"],
  },
  {
    icon: "05",
    title: "StaggerText Animation",
    description: "텍스트를 개별 문자로 분리하여 호버 시 순차적 외곽선 애니메이션을 구현했습니다. 호버 해제 시 역순으로 색상이 채워지며 stroke가 유지됩니다.",
    tech: ["React State", "CSS text-stroke", "Stagger Delay"],
  },
];

const techStack = [
  { name: "Next.js 15", category: "Framework" },
  { name: "React 19", category: "Library" },
  { name: "TypeScript", category: "Language" },
  { name: "GSAP + ScrollTrigger", category: "Animation" },
  { name: "Lenis Smooth Scroll", category: "Scroll" },
  { name: "Framer Motion", category: "Interaction" },
  { name: "CSS Modules", category: "Styling" },
  { name: "CSS Variables", category: "Design Tokens" },
  { name: "Instrument Serif", category: "Typography" },
  { name: "Space Grotesk", category: "Typography" },
];

const designProcess = [
  {
    step: "01",
    title: "Design System 구축",
    description: "CSS Variables를 활용한 디자인 토큰 시스템 구축. 컬러, 타이포그래피, 스페이싱, 그림자 등 일관된 디자인 언어를 정의했습니다.",
  },
  {
    step: "02",
    title: "컴포넌트 설계",
    description: "재사용 가능한 UI 컴포넌트와 레이아웃 시스템 설계. CSS Modules로 스타일 캡슐화를 구현했습니다.",
  },
  {
    step: "03",
    title: "애니메이션 레이어",
    description: "GSAP과 Framer Motion을 조합하여 스크롤 기반 애니메이션과 인터랙션을 구현했습니다.",
  },
  {
    step: "04",
    title: "무한 스크롤 구현",
    description: "Lenis infinite scroll과 Bridge 섹션을 결합하여 자연스러운 순환 스크롤 경험을 완성했습니다.",
  },
];

const codeExamples = [
  {
    title: "Mouse Parallax Effect",
    description: "Framer Motion을 활용한 마우스 추적 패럴랙스",
    code: `const mouseX = useMotionValue(0);
const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
const floatX = useTransform(smoothX, [0, window.innerWidth], [-30, 30]);`,
  },
  {
    title: "Scroll-Triggered Animation",
    description: "GSAP ScrollTrigger를 활용한 등장 애니메이션",
    code: `gsap.from(".element", {
  y: 100, opacity: 0,
  scrollTrigger: {
    trigger: ref.current,
    start: "top 70%",
    once: true
  }
});`,
  },
  {
    title: "Scroll Velocity Parallax",
    description: "Lenis velocity를 활용한 스크롤 속도 기반 이미지 패럴랙스",
    code: `const workImageOffsetY = useMotionValue(0);
const smoothY = useSpring(workImageOffsetY, { stiffness: 100, damping: 15 });

lenis.on("scroll", () => {
  const velocity = lenis.velocity;
  if (Math.abs(velocity) > 0.05) {
    const offset = Math.max(-50, Math.min(50, velocity * 30));
    workImageOffsetY.set(offset);
  }
});`,
  },
  {
    title: "StaggerText Component",
    description: "호버 시 순차적 외곽선 애니메이션, 해제 시 역순 색상 복원",
    code: `// 호버: 순방향 (첫 글자 → 마지막)
// 해제: 역방향 (마지막 → 첫 글자), stroke 유지
const forwardDelay = i * 0.04;
const reverseDelay = (totalChars - 1 - i) * 0.04;
const delay = isHovered ? forwardDelay : reverseDelay;

// CSS: step-end로 즉시 전환
.char { transition: color 0.01s step-end; }
.charHovered { color: transparent; -webkit-text-stroke: 1px; }
.charExiting { -webkit-text-stroke: 1px; } // stroke 유지`,
  },
];

const troubleShootingItems = [
  {
    problem: "Lenis Scroll Velocity 효과 미작동",
    cause: "RAF 폴링 방식으로 스크롤 위치를 직접 계산하면 velocity 값이 부정확하게 측정됨",
    solution: "Lenis의 네이티브 on('scroll') 이벤트를 사용하여 인스턴스에서 직접 velocity 속성 접근",
    keyInsight: "Lenis는 내부적으로 velocity를 계산하여 인스턴스 속성으로 제공. 직접 delta 계산보다 정확함",
  },
  {
    problem: "Framer Motion transform과 CSS transform 충돌",
    cause: "CSS에서 transform: translate(-50%, -50%)로 중앙 정렬 시 Framer Motion의 y 속성이 덮어씌워짐",
    solution: "margin 기반 중앙 정렬로 변경 (margin-left: -65%, margin-top: -65%)",
    keyInsight: "Framer Motion의 style 속성은 inline transform을 생성하므로 CSS transform과 분리 필요",
  },
  {
    problem: "TypeScript useRef 타입 에러",
    cause: "useRef<ReturnType<typeof setTimeout>>()에서 초기값 미제공으로 인한 타입 에러",
    solution: "useRef<ReturnType<typeof setTimeout> | undefined>(undefined)로 명시적 초기화",
    keyInsight: "clearTimeout은 undefined를 허용하지만 null은 허용하지 않음",
  },
];

export default function WebFlowSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const processRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Header animation
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: headerRef.current,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      // Features cards animation
      if (featuresRef.current) {
        const cards = featuresRef.current.querySelectorAll(`.${styles.featureCard}`);
        gsap.fromTo(
          cards,
          { opacity: 0, y: 60, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            stagger: 0.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: featuresRef.current,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      // Process steps animation
      if (processRef.current) {
        const steps = processRef.current.querySelectorAll(`.${styles.processStep}`);
        steps.forEach((step, i) => {
          gsap.fromTo(
            step,
            { opacity: 0, x: i % 2 === 0 ? -50 : 50 },
            {
              opacity: 1,
              x: 0,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: step,
                start: "top 85%",
                toggleActions: "play none none reverse",
              },
            }
          );
        });

        // Animate the line
        const line = processRef.current.querySelector(`.${styles.processLine}`);
        if (line) {
          gsap.fromTo(
            line,
            { scaleY: 0 },
            {
              scaleY: 1,
              duration: 1.5,
              ease: "power3.out",
              scrollTrigger: {
                trigger: processRef.current,
                start: "top 80%",
                toggleActions: "play none none reverse",
              },
            }
          );
        }
      }

      // Tech stack animation
      if (stackRef.current) {
        const items = stackRef.current.querySelectorAll(`.${styles.techItem}`);
        gsap.fromTo(
          items,
          { opacity: 0, scale: 0.8 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.08,
            ease: "back.out(1.7)",
            scrollTrigger: {
              trigger: stackRef.current,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section id="webflow" className={styles.section} ref={sectionRef}>
      {/* Header */}
      <div className={styles.header} ref={headerRef}>
        <span className={styles.label}>Behind the Scenes</span>
        <h2 className={styles.title}>
          Web Flow
          <br />
          <span className={styles.titleAccent}>& Implementation</span>
        </h2>
        <p className={styles.subtitle}>
          이 포트폴리오 사이트의 디자인 철학, 주요 기능 구현 방법,
          그리고 개발 과정에 대한 이야기입니다.
        </p>
      </div>

      {/* Feature Cards */}
      <div className={styles.featuresGrid} ref={featuresRef}>
        {designFeatures.map((feature, index) => (
          <div
            key={index}
            className={`${styles.featureCard} ${index === 1 ? styles.featureCardDark : ""}`}
          >
            <span className={styles.featureIcon}>{feature.icon}</span>
            <h3 className={styles.featureTitle}>{feature.title}</h3>
            <p className={styles.featureDescription}>{feature.description}</p>
            <div className={styles.featureTech}>
              {feature.tech.map((tech) => (
                <span key={tech} className={styles.featureTechTag}>
                  {tech}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Design Process */}
      <div className={styles.processSection} ref={processRef}>
        <h3 className={styles.sectionSubtitle}>Design Process</h3>
        <div className={styles.processContainer}>
          <div className={styles.processLine} />
          {designProcess.map((process, index) => (
            <div key={index} className={styles.processStep}>
              <div className={styles.processNumber}>{process.step}</div>
              <div className={styles.processContent}>
                <h4 className={styles.processTitle}>{process.title}</h4>
                <p className={styles.processDescription}>{process.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className={styles.stackSection} ref={stackRef}>
        <h3 className={styles.sectionSubtitle}>Tech Stack</h3>
        <div className={styles.stackGrid}>
          {techStack.map((tech, index) => (
            <div key={index} className={styles.techItem}>
              <span className={styles.techName}>{tech.name}</span>
              <span className={styles.techCategory}>{tech.category}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Code Examples */}
      <div className={styles.codeSection}>
        <h3 className={styles.sectionSubtitle}>Code Highlights</h3>
        <div className={styles.codeGrid}>
          {codeExamples.map((example, index) => (
            <div key={index} className={styles.codeCard}>
              <h4 className={styles.codeTitle}>{example.title}</h4>
              <p className={styles.codeDescription}>{example.description}</p>
              <pre className={styles.codeBlock}>
                <code>{example.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* Trouble Shooting */}
      <div className={styles.troubleSection}>
        <h3 className={styles.sectionSubtitle}>Trouble Shooting</h3>
        <div className={styles.troubleGrid}>
          {troubleShootingItems.map((item, index) => (
            <div key={index} className={styles.troubleCard}>
              <div className={styles.troubleHeader}>
                <span className={styles.troubleIcon}>!</span>
                <h4 className={styles.troubleTitle}>{item.problem}</h4>
              </div>
              <div className={styles.troubleBody}>
                <div className={styles.troubleItem}>
                  <span className={styles.troubleLabel}>원인</span>
                  <p>{item.cause}</p>
                </div>
                <div className={styles.troubleItem}>
                  <span className={styles.troubleLabel}>해결</span>
                  <p>{item.solution}</p>
                </div>
                <div className={styles.troubleItem}>
                  <span className={styles.troubleLabel}>핵심</span>
                  <p className={styles.troubleInsight}>{item.keyInsight}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credits */}
      <div className={styles.credits}>
        <p className={styles.creditsText}>
          Designed & Developed with{" "}
          <span className={styles.creditsHeart}>❤</span> by {siteConfig.personal.nickname}
        </p>
      </div>
    </section>
  );
}
