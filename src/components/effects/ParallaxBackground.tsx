"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useAppStore } from "@/stores/appStore";
import styles from "./ParallaxBackground.module.css";
import {
  fadeInUp,
  staggerContainer,
  elementRotateScaleIn,
  textRotateXIn,
} from "@/animations";

const sectionTitles = {
  hero: "PORTFOLIO",
  about: "ABOUT",
  interview: "INTERVIEW",
  skills: "SKILLS",
  experience: "EXPERIENCE",
  projects: "PROJECTS",
  blog: "BLOG",
  contact: "CONTACT",
};

// 개발자 여정을 나타내는 스토리텔링 요소들
const storyElements = {
  hero: {
    subtitle: "DEVELOPER",
    story: "새로운 시작",
    elements: ["</>", "{ }", "HTML", "CSS", "JS"],
  },
  about: {
    subtitle: "JOURNEY",
    story: "나를 알아가는 시간",
    elements: ["💭", "🎯", "✨", "🚀", "💡"],
  },
  interview: {
    subtitle: "INSIGHT",
    story: "생각을 나누는 시간",
    elements: ["Q1", "Q2", "Q3", "Q4", "👤"],
  },
  skills: {
    subtitle: "GROWTH",
    story: "기술을 쌓아가며",
    elements: ["React", "Next.js", "TypeScript", "Node.js", "Git"],
  },
  experience: {
    subtitle: "MILESTONE",
    story: "경험이 쌓여가며",
    elements: ["2020", "2021", "2023", "2024", "NOW"],
  },
  projects: {
    subtitle: "CREATION",
    story: "아이디어를 현실로",
    elements: ["💻", "🎨", "⚡", "🔧", "🎉"],
  },
  blog: {
    subtitle: "SHARING",
    story: "지식을 나누며",
    elements: ["📝", "💬", "📚", "🌱", "🔗"],
  },
  contact: {
    subtitle: "CONNECTION",
    story: "새로운 만남을 향해",
    elements: ["📧", "🤝", "🌟", "🚀", "∞"],
  },
};

export default function ParallaxBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentSection } = useAppStore();
  const [displayTitle, setDisplayTitle] = useState("FRONTEND");
  const [displayStory, setDisplayStory] = useState(storyElements.hero);
  const prevTitleRef = useRef("FRONTEND");

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // 레이어별 다른 패럴랙스 속도
  const layer1Y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  // const layer2Y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const layer3Y = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);
  // const layer4Y = useTransform(scrollYProgress, [0, 1], ["0%", "80%"]);

  // 회전 및 스케일 변환
  // const rotate1 = useTransform(scrollYProgress, [0, 1], [0, 360]);
  // const rotate2 = useTransform(scrollYProgress, [0, 1], [0, -180]);
  // const scale1 = useTransform(scrollYProgress, [0, 1], [1, 1.5]);

  // 타이틀 변경 최적화
  const newTitle = useMemo(() => {
    return (
      sectionTitles[currentSection as keyof typeof sectionTitles] || "FRONTEND"
    );
  }, [currentSection]);

  const newStory = useMemo(() => {
    return (
      storyElements[currentSection as keyof typeof storyElements] ||
      storyElements.hero
    );
  }, [currentSection]);

  const shouldAnimateTitle = useMemo(() => {
    return newTitle !== prevTitleRef.current;
  }, [newTitle]);

  useEffect(() => {
    if (shouldAnimateTitle) {
      setDisplayTitle(newTitle);
      setDisplayStory(newStory);
      prevTitleRef.current = newTitle;
    }
  }, [newTitle, newStory, shouldAnimateTitle]);

  return (
    <div ref={containerRef} className={styles.parallaxContainer}>
      {/* 배경 그라데이션 */}
      <div className={styles.backgroundGradient} />

      {/* 떠다니는 스토리 요소 */}
      <motion.div
        className={styles.storyLayer}
        style={{ y: layer1Y }}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {displayStory.elements.map((element, index) => (
          <motion.div
            key={
              shouldAnimateTitle
                ? `${displayTitle}-${element}-${index}`
                : `static-${index}`
            }
            className={styles.storyElement}
            style={{
              left: `${15 + index * 18}%`,
              top: `${20 + Math.sin(index) * 30}%`,
            }}
            variants={elementRotateScaleIn}
            custom={index}
          >
            {element}
          </motion.div>
        ))}
      </motion.div>

      {/* 코드 스니펫 레이어
      <motion.div className={styles.codeLayer} style={{ y: layer2Y }}>
        <div className={styles.codeSnippet} style={{ top: "15%", left: "5%" }}>
          const developer = {"{"}
        </div>
        <div className={styles.codeSnippet} style={{ top: "25%", left: "10%" }}>
          passion: "frontend",
        </div>
        <div className={styles.codeSnippet} style={{ top: "35%", left: "8%" }}>
          growth: "continuous"
        </div>
        <div className={styles.codeSnippet} style={{ top: "45%", left: "12%" }}>
          {"}"}
        </div>
        
        <div className={styles.codeSnippet} style={{ top: "60%", right: "5%" }}>
          function createAmazingThings() {"{"}
        </div>
        <div className={styles.codeSnippet} style={{ top: "70%", right: "10%" }}>
          return "innovation";
        </div>
        <div className={styles.codeSnippet} style={{ top: "80%", right: "8%" }}>
          {"}"}
        </div>
      </motion.div>
        */}

      {/* 애니메이션 타이포그래피 레이어 */}
      <motion.div className={styles.typographyLayer} style={{ y: layer1Y }}>
        <motion.div
          className={styles.mainTitle}
          key={shouldAnimateTitle ? displayTitle : undefined}
          variants={staggerContainer}
          initial="hidden"
          animate={shouldAnimateTitle ? "visible" : "hidden"}
        >
          {displayTitle.split("").map((char, index) => (
            <motion.span
              key={
                shouldAnimateTitle
                  ? `${displayTitle}-${index}`
                  : `static-${index}`
              }
              className={styles.titleChar}
              variants={textRotateXIn}
              custom={index}
            >
              {char}
            </motion.span>
          ))}
        </motion.div>

        <motion.div
          className={styles.subTitle}
          variants={fadeInUp}
          initial="hidden"
          animate={shouldAnimateTitle ? "visible" : "hidden"}
          transition={{ delay: 0.5 }}
        >
          {displayStory.subtitle}
        </motion.div>

        <motion.div
          className={styles.storyText}
          variants={fadeInUp}
          initial="hidden"
          animate={shouldAnimateTitle ? "visible" : "hidden"}
          transition={{ delay: 0.8 }}
        >
          {displayStory.story}
        </motion.div>
      </motion.div>

      {/* 연결선 레이어 */}
      <motion.div className={styles.connectionsLayer} style={{ y: layer3Y }}>
        <svg
          className={styles.connectionsSvg}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M10,20 Q30,15 50,30 T90,25"
            stroke="rgba(102, 126, 234, 0.2)"
            strokeWidth="0.5"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.path
            d="M20,80 Q40,65 60,75 T85,70"
            stroke="rgba(102, 126, 234, 0.3)"
            strokeWidth="0.3"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />
        </svg>
      </motion.div>
    </div>
  );
}
