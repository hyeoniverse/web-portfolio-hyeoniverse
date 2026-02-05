"use client";

import OptimizedImage from "@/components/ui/OptimizedImage";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { projectDetails } from "@/data";
import { useSoundManager } from "@/hooks/useSoundManager";
import { useProjectStore } from "@/stores/projectStore";

import styles from "./ProjectsDetail.module.css";
import {
  ExternalLink,
  Github,
  Zap,
  Code,
  Palette,
  Smartphone,
} from "lucide-react";
import { contentVariants, itemVariants } from "@/animations";
import ImageViewer from "@/components/common/ImageViewer";
import TitleBar from "@/app/ProjectsSection/_components/TitleBar";

export default function ProjectsDetail() {
  const { playSound } = useSoundManager();
  const { selectedProject: project } = useProjectStore();

  const [showImageViewer, setShowImageViewer] = useState(false);
  const [, setSelectedImageIndex] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const content = contentRef.current;
    const hero = heroRef.current;
    const heroContent = heroContentRef.current;
    const grid = gridRef.current;

    if (!content || !hero || !heroContent || !grid) return;

    // 이 컴포넌트가 만든 트리거/관련 인스턴스만 모아둘 배열
    const createdTriggers: Array<ScrollTrigger> = [];

    const timer = setTimeout(() => {
      const panels = [hero, grid];

      // gsap.to로 만든 tween에서 scrollTrigger를 얻어 저장
      const tween = gsap.to(heroContent, {
        scale: 0.85,
        opacity: 0.6,
        y: -50,
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scroller: content,
          scrub: true,
          invalidateOnRefresh: false,
        },
      });
      if (tween && (tween as gsap.core.Tween).scrollTrigger) {
        createdTriggers.push(
          (tween as gsap.core.Tween).scrollTrigger as ScrollTrigger
        );
      }

      // tops: 각 panel의 "top" 위치를 얻기 위한 ScrollTrigger들
      const tops = panels.map((panel) => {
        const st = ScrollTrigger.create({
          trigger: panel,
          start: "top top",
          scroller: content,
          invalidateOnRefresh: false,
        });
        createdTriggers.push(st);
        return st;
      });

      // 각 panel에 pin 처리하는 트리거들 (따로 저장)
      panels.forEach((panel) => {
        const st = ScrollTrigger.create({
          trigger: panel,
          start: () =>
            panel.offsetHeight < content.clientHeight
              ? "top top"
              : "bottom bottom",
          pin: true,
          pinSpacing: false,
          scroller: content,
          anticipatePin: 1,
          fastScrollEnd: true,
          invalidateOnRefresh: false,
        });
        createdTriggers.push(st);
      });

      // content 전체를 위한 스냅 트리거
      const contentTrigger = ScrollTrigger.create({
        trigger: content,
        start: "top top",
        end: "bottom bottom",
        scroller: content,
        snap: {
          snapTo: (progress, self) => {
            const panelStarts = tops.map((st) => st.start);
            const maxScroll = content.scrollHeight - content.clientHeight;
            const currentScroll = self ? self.scroll() : 0;
            const snapScroll = gsap.utils.snap(panelStarts, currentScroll);
            return gsap.utils.normalize(0, maxScroll, snapScroll);
          },
          duration: 0.5,
          ease: "power2.inOut",
        },
      });
      createdTriggers.push(contentTrigger);

      ScrollTrigger.refresh();
    }, 100);

    return () => {
      clearTimeout(timer);
      // **중요**: 이 컴포넌트가 만든 트리거만 종료
      createdTriggers.forEach((t) => {
        try {
          t?.kill();
        } catch (e) {
          console.log(e);
        }
      });
    };
  }, [project]);

  if (!project) return null;

  const details = projectDetails[project.id as keyof typeof projectDetails] || {
    period: "2023.07 - 2023.08",
    team: "6인 (프론트엔드 3명, 백엔드 3명)",
    role: "프론트엔드 개발자",
    features: [
      "반응형 웹 디자인",
      "실시간 데이터 동기화",
      "사용자 친화적 인터페이스",
      "성능 최적화",
    ],
    challenges: ["복잡한 상태 관리", "크로스 브라우저 호환성", "성능 최적화"],
    learned: ["React 고급 패턴", "TypeScript 활용", "팀 협업 프로세스"],
  };

  const allImages = [project.thumbnail, ...(project.images || [])].filter(
    (img): img is string => img !== undefined
  );

  const openImageViewer = (index = 0) => {
    setSelectedImageIndex(index);
    setShowImageViewer(true);
    playSound("click");
  };

  const techDescriptions: Record<string, string> = {
    React: "컴포넌트 기반 아키텍처로 재사용 가능한 UI 구축",
    TypeScript: "정적 타입 검사로 안정적인 코드 작성",
    "Next.js": "서버 사이드 렌더링과 정적 사이트 생성 지원",
    "Tailwind CSS": "유틸리티 퍼스트 CSS 프레임워크로 빠른 스타일링",
    "Framer Motion": "부드럽고 인터랙티브한 애니메이션 구현",
    Zustand: "가벼운 상태 관리 라이브러리",
    Vite: "빠른 개발 서버와 최적화된 빌드 도구",
    "Styled Components": "CSS-in-JS 라이브러리로 컴포넌트 기반 스타일링",
  };

  const galleryImages = [
    { src: "/placeholder.svg?height=300&width=500", caption: "메인 대시보드" },
    { src: "/placeholder.svg?height=200&width=300", caption: "사용자 프로필" },
    { src: "/placeholder.svg?height=200&width=300", caption: "설정 페이지" },
    { src: "/placeholder.svg?height=200&width=300", caption: "모바일 뷰" },
    { src: "/placeholder.svg?height=200&width=300", caption: "분석 화면" },
    { src: "/placeholder.svg?height=150&width=600", caption: "반응형 디자인" },
  ];

  const projectStats = [
    { number: "6", label: "팀 멤버" },
    { number: "2", label: "개발 기간 (월)" },
    { number: "15+", label: "주요 기능" },
    { number: "98%", label: "성능 점수" },
  ];

  return (
    <>
      <TitleBar />
      <motion.div
        ref={contentRef}
        className={styles.content}
        variants={contentVariants}
      >
        <motion.section
          ref={heroRef}
          variants={itemVariants}
          className={`${styles.projectsHero} panel`}
        >
          <div ref={heroContentRef} className={styles.heroContent}>
            <motion.div
              className={styles.projectCategory}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Web Application
            </motion.div>

            <motion.h1
              className={styles.heroTitle}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              {project.title}
            </motion.h1>

            <motion.p
              className={styles.heroSubtitle}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {project.description}
            </motion.p>

            <motion.div
              className={styles.heroMeta}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>기간</span>
                <span className={styles.metaValue}>{details.period}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>팀 구성</span>
                <span className={styles.metaValue}>{details.team}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>역할</span>
                <span className={styles.metaValue}>{details.role}</span>
              </div>
            </motion.div>

            <div className={styles.scrollHint}>
              <div className={styles.progressBarWrapper}>
                <div className={`${styles.progressBar} scroll-y`} />
              </div>
              <p className="blink">Scroll to explore</p>
            </div>
          </div>

          <motion.div
            className={styles.heroImage}
            initial={{ opacity: 0, scale: 1.25 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            onClick={() => openImageViewer(0)}
          >
            <OptimizedImage
              src={
                project.thumbnail ||
                "/placeholder.svg?height=400&width=600&query=project hero"
              }
              alt={project.title}
              width={600}
              height={400}
              className={styles.heroImageInner}
              priority={true}
            />
          </motion.div>
        </motion.section>

        <div ref={gridRef} className={`${styles.editorialGrid} panel`}>
          <div className={styles.sidebarLeft}>
            <motion.div
              className={`${styles.sidebarCard}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <h3 className={styles.sidebarTitle}>기술 스택</h3>
              <div className={styles.tagList}>
                {project.technologies.slice(0, 6).map((tech, index) => (
                  <span key={index} className={styles.tag}>
                    #{tech}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              className={styles.sidebarCard}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <h3 className={styles.sidebarTitle}>링크</h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <a
                  href="#"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "#3b82f6",
                    fontSize: "0.75rem",
                  }}
                >
                  <Github size={12} />
                  GitHub
                </a>
                <a
                  href="#"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "#3b82f6",
                    fontSize: "0.75rem",
                  }}
                >
                  <ExternalLink size={12} />
                  Demo
                </a>
              </div>
            </motion.div>
          </div>

          <div className={styles.mainContent}>
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <h2 className={styles.sectionTitle}>프로젝트 개요</h2>
              <p className={`${styles.bodyText} ${styles.large}`}>
                이 프로젝트는 현대적인 웹 애플리케이션의 모든 요소를 담고
                있습니다. 사용자 경험을 최우선으로 고려하여 직관적이고 반응형인
                인터페이스를 구현했습니다.
              </p>
              <p className={styles.bodyText}>
                최신 웹 기술 스택을 활용하여 성능과 확장성을 모두 고려한
                아키텍처를 설계했습니다. 특히 사용자의 다양한 디바이스 환경을
                고려한 반응형 디자인과 접근성을 중점적으로 개발했습니다.
              </p>

              <div className={styles.pullQuote}>
                사용자 중심의 디자인과 최신 기술의 조화로 만들어진 혁신적인 웹
                애플리케이션
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <h2 className={styles.sectionTitle}>주요 기능</h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                }}
              >
                {details.features.map((feature, index) => (
                  <motion.div
                    key={index}
                    className={styles.featureCard}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 + index * 0.1 }}
                  >
                    <div className={styles.featureNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <h3 className={styles.featureTitle}>{feature}</h3>
                    <p className={styles.featureDescription}>
                      {feature}을 통해 사용자에게 더 나은 경험을 제공합니다.
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            <motion.section
              className={styles.statsSection}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              {projectStats.map((stat, index) => (
                <div key={index} className={styles.statItem}>
                  <div className={styles.statNumber}>{stat.number}</div>
                  <div className={styles.statLabel}>{stat.label}</div>
                </div>
              ))}
            </motion.section>

            <motion.section
              className={styles.gallerySection}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3 }}
            >
              <h2 className={styles.galleryTitle}>프로젝트 갤러리</h2>
              <div className={styles.galleryGrid}>
                {galleryImages.map((image, index) => (
                  <motion.div
                    key={index}
                    className={styles.galleryItem}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.4 + index * 0.1 }}
                    onClick={() => openImageViewer(index)}
                  >
                    <OptimizedImage
                      src={image.src || "/placeholder.svg"}
                      alt={image.caption}
                      width={300}
                      height={200}
                      className={styles.galleryImage}
                      priority={false}
                    />
                    <div className={styles.galleryOverlay}>
                      <p className={styles.galleryCaption}>{image.caption}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            <motion.section
              className={styles.techSection}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
            >
              <h2 className={styles.techTitle}>기술 스택 상세</h2>
              <div className={styles.techGrid}>
                {project.technologies.slice(0, 6).map((tech, index) => (
                  <motion.div
                    key={`${tech}-${index}`}
                    className={styles.techItem}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.6 + index * 0.1 }}
                  >
                    <h3 className={styles.techName}>{tech}</h3>
                    <p className={styles.techDescription}>
                      {techDescriptions[tech] || `${tech}를 활용한 개발`}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>

          <div className={styles.sidebarRight}>
            <motion.div
              className={styles.sidebarCard}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <h3 className={styles.sidebarTitle}>개발 과정</h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Palette size={12} color="#3b82f6" />
                  <span style={{ fontSize: "0.75rem" }}>UI/UX 디자인</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Code size={12} color="#3b82f6" />
                  <span style={{ fontSize: "0.75rem" }}>프론트엔드 개발</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Smartphone size={12} color="#3b82f6" />
                  <span style={{ fontSize: "0.75rem" }}>반응형 최적화</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Zap size={12} color="#3b82f6" />
                  <span style={{ fontSize: "0.75rem" }}>성능 최적화</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              className={styles.sidebarCard}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <h3 className={styles.sidebarTitle}>학습한 점</h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {details.learned.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      fontSize: "0.75rem",
                      lineHeight: "1.4",
                    }}
                  >
                    • {item}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showImageViewer && (
          <ImageViewer
            images={[...allImages, ...galleryImages.map((img) => img.src)]}
            onClose={() => setShowImageViewer(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
