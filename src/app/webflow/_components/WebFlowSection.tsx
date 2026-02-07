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
  {
    icon: "06",
    title: "Lighthouse Performance Optimization",
    description: "2차에 걸친 Lighthouse 분석 기반 성능 최적화. 미사용 폰트 4개(12파일) 제거, reCAPTCHA 인터랙션 기반 지연 로딩, font-display:swap 적용으로 모바일 Performance 60→98점, 페이지 용량 70% 감소를 달성했습니다.",
    tech: ["Font Optimization", "Lazy Loading", "font-display", "browserslist"],
  },
  {
    icon: "07",
    title: "Works Horizontal Gallery",
    description: "GSAP requestAnimationFrame 기반 가로 스크롤 갤러리. 인트로 섹션을 인플로우 아이템으로 배치하고, oneSetWidth 래핑으로 양방향 무한 스크롤을 구현했습니다. 언어 전환 시 min-height로 레이아웃 시프트를 방지합니다.",
    tech: ["GSAP", "Infinite Wrapping", "i18n Layout", "Responsive"],
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
  {
    step: "05",
    title: "Lighthouse 성능 최적화",
    description: "Lighthouse CLI로 프로덕션 빌드를 직접 측정하며 2차에 걸친 최적화를 진행. 1차: reCAPTCHA 지연 로딩, 접근성 수정. 2차: 미사용 폰트 제거, font-display:swap, 리소스 경량화로 모바일 98점 달성.",
  },
  {
    step: "06",
    title: "Works 가로 갤러리 구현",
    description: "GSAP rAF 기반 가로 스크롤 갤러리에 인트로 인플로우 배치, oneSetWidth 양방향 무한 래핑, 뷰포트 중심 기반 활성 카드 감지, 언어 전환 레이아웃 안정화를 구현.",
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
  {
    title: "reCAPTCHA Lazy Loading",
    description: "의도적 인터랙션 기반 서드파티 스크립트 지연 로딩 (타이머/scroll 제거)",
    code: `const [shouldLoad, setShouldLoad] = useState(false);

useEffect(() => {
  const load = () => setShouldLoad(true);
  // 의도적 인터랙션만 (scroll/timer 제거 → Lighthouse에서 미로드)
  const events = ["click", "touchstart", "keydown"];
  events.forEach((e) =>
    document.addEventListener(e, () => { load(); cleanup(); },
      { once: true, passive: true })
  );
  return cleanup;
}, []);

if (!shouldLoad) return <>{children}</>;
return <GoogleReCaptchaProvider ...>{children}</GoogleReCaptchaProvider>;`,
  },
  {
    title: "Infinite Scroll Wrapping",
    description: "oneSetWidth 기반 양방향 무한 스크롤 래핑",
    code: `// 연속된 인트로 간 거리로 한 세트 너비 계산
const introEls = slider.querySelectorAll('.intro');
const oneSetWidth = introEls[1].offsetLeft - introEls[0].offsetLeft;

// rAF 루프에서 양방향 래핑
while (scrollX > oneSetWidth * 3) {
  scrollX -= oneSetWidth;
  targetScrollX -= oneSetWidth;
}
while (scrollX < -oneSetWidth * 3) {
  scrollX += oneSetWidth;
  targetScrollX += oneSetWidth;
}`,
  },
  {
    title: "i18n Layout Shift Prevention",
    description: "언어 전환 시 min-height로 레이아웃 시프트 방지",
    code: `/* 최대 줄 수 × line-height로 공간 예약 */
.introDesc { min-height: 4.95em; }   /* 3줄 × 1.65 */
.introDetail { min-height: 6.6em; }  /* 4줄 × 1.65 */
.introQuote { min-height: 3.3em; }   /* 2줄 × 1.65 */

/* 모바일: 세로 스크롤이므로 불필요 */
@media (max-width: 768px) {
  .introDesc, .introDetail, .introQuote {
    min-height: auto;
  }
}`,
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
  {
    problem: "GSAP ScrollTrigger 수평 무한 스크롤 구현",
    cause: "ScrollTrigger는 유한한 스크롤 범위를 가지며, 끝에 도달 시 역방향 스크롤로 보이는 문제 발생",
    solution: "스크롤 거리를 콘텐츠의 10배로 설정하고, modulo 연산으로 컨테이너 x 위치를 순환시켜 한 방향 무한 스크롤 구현",
    keyInsight: "스크롤 위치 텔레포트 대신 긴 스크롤 범위 + 시각적 위치 루프 방식이 더 자연스러움",
  },
  {
    problem: "reCAPTCHA v3 초기 로드 성능 저하 (LCP 17.1s, TTI 18.2s)",
    cause: "GoogleReCaptchaProvider가 앱 루트를 감싸며 초기 로드 시 ~784KB JS를 즉시 다운로드. 메인 스레드 280ms 차단, Google 도메인 Preconnect 부재로 400ms 추가 지연",
    solution: "유저 인터랙션(scroll/click/touch/keydown) 또는 4초 타임아웃 후 reCAPTCHA 로드. Preconnect 힌트 추가. WCAG 색상 대비 및 heading order, aria-label 접근성 수정",
    keyInsight: "서드파티 스크립트는 초기 로드에서 제외하고 유저 인터랙션 후 로드하면 LCP/TTI에 큰 영향. mix-blend-mode: difference는 Lighthouse가 blend 전 색상으로 대비를 측정하므로 오탐 가능",
  },
  {
    problem: "미사용 폰트로 인한 리소스 낭비 (폰트 19파일, 페이지 1,489KB)",
    cause: "next/font/google로 등록된 9개 폰트 패밀리 중 4개(IBM Plex Mono, Bebas Neue, Cormorant Garamond, Abril Fatface)가 CSS에서 미참조. reCAPTCHA 4초 타이머가 Lighthouse 테스트 중 트리거. font-display 미설정으로 폰트 렌더링 차단",
    solution: "미사용 폰트 4개 제거(12파일 절약), Inter 가중치 7→5개 축소, font-display:swap 추가, reCAPTCHA 타이머/scroll 이벤트 제거, 미사용 preconnect 제거, browserslist 추가",
    keyInsight: "next/font로 등록만 해도 폰트 파일이 다운로드됨. 지연 로딩의 타이머 폴백은 성능 측정 도구에서 의도치 않게 트리거될 수 있으므로 의도적 인터랙션만 사용해야 함. 결과: Performance 60→98, 페이지 용량 70% 감소",
  },
  {
    problem: "Works 가로 갤러리 양방향 무한 스크롤",
    cause: "프로젝트 10세트를 반복 배치했지만 유한한 세트로는 양쪽 방향 끝이 존재하여 흰 화면이 나타남",
    solution: "연속된 인트로 요소의 offsetLeft 차이로 oneSetWidth를 계산하고, rAF 루프에서 while 문으로 scrollX/targetScrollX를 양방향 래핑",
    keyInsight: "콘텐츠 복제 세트 수를 늘리는 것보다 스크롤 위치 자체를 래핑하는 방식이 DOM 부담 없이 진정한 무한 스크롤을 구현할 수 있음",
  },
  {
    problem: "언어 전환 시 Works 인트로 레이아웃 시프트",
    cause: "한국어/영어 텍스트 길이 차이로 줄바꿈이 달라지고, justify-content: center가 적용된 flex 컨테이너에서 자식 높이 변화 시 공간이 재분배됨",
    solution: "min-height를 em 단위(줄 수 × line-height)로 설정하여 양쪽 언어 모두에서 일관된 공간 확보. 모바일에서는 세로 스크롤이므로 min-height: auto로 리셋",
    keyInsight: "다국어 지원 시 텍스트 영역에 min-height로 최대 줄 수 기준 공간을 예약하면 레이아웃 시프트 방지. em 단위 사용으로 font-size 변경에도 자동 대응",
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
