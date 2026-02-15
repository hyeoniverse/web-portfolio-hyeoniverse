"use client";

import { useRef, useLayoutEffect } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLanguage } from "@/providers/LanguageProvider";
import { experiences, skills, philosophy } from "@/data/about";
import CreditsFooter from "@/components/layout/CreditsFooter/CreditsFooter";
import styles from "./AboutMeSection.module.css";

// GSAP 플러그인 등록
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}


export default function AboutMeSection() {
  const { t, language } = useLanguage();
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const bioRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const philosophyRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // 헤더 애니메이션
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

      // 분할 화면 애니메이션 - 바이오 텍스트
      if (bioRef.current) {
        const bioElements = bioRef.current.querySelectorAll("p");
        gsap.fromTo(
          bioElements,
          { opacity: 0, x: 60 },
          {
            opacity: 1,
            x: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: bioRef.current,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      // 이미지 등장 애니메이션
      if (imageRef.current) {
        gsap.fromTo(
          imageRef.current,
          {
            clipPath: "inset(0 100% 0 0)",
            opacity: 0,
          },
          {
            clipPath: "inset(0 0% 0 0)",
            opacity: 1,
            duration: 1.2,
            ease: "power4.out",
            scrollTrigger: {
              trigger: imageRef.current,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      // 경력 카드 시차 등장
      if (experienceRef.current) {
        const cards = experienceRef.current.querySelectorAll(`.${styles.experienceCard}`);
        gsap.fromTo(
          cards,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: experienceRef.current,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      // 스킬 바 애니메이션
      if (skillsRef.current) {
        const bars = skillsRef.current.querySelectorAll(`.${styles.skillProgress}`);
        bars.forEach((bar, i) => {
          const level = skills[i]?.level || 0;
          gsap.fromTo(
            bar,
            { scaleX: 0 },
            {
              scaleX: level / 100,
              duration: 1,
              delay: i * 0.1,
              ease: "power3.out",
              scrollTrigger: {
                trigger: bar,
                start: "top 90%",
                toggleActions: "play none none reverse",
              },
            }
          );
        });
      }

      // 철학 카드
      if (philosophyRef.current) {
        const cards = philosophyRef.current.querySelectorAll(`.${styles.philosophyCard}`);
        gsap.fromTo(
          cards,
          { opacity: 0, scale: 0.9 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.8,
            stagger: 0.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: philosophyRef.current,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section id="about" className={styles.section} ref={sectionRef}>
      {/* 섹션 헤더 */}
      <div className={styles.header} ref={headerRef}>
        <span className={styles.label}>{t("aboutPage.title")}</span>
        <h2 className={styles.title}>
          Crafting Digital
          <br />
          <span className={styles.titleAccent}>Experiences</span>
        </h2>
      </div>

      {/* 분할 콘텐츠 - 이미지 + 바이오 */}
      <div className={styles.splitContent}>
        <div className={styles.imageContainer} ref={imageRef}>
          <Image
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop"
            alt="Profile"
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className={styles.profileImage}
          />
          <div className={styles.imageDecor} />
        </div>

        <div className={styles.bioContainer} ref={bioRef}>
          <p className={styles.bioHighlight}>
            {t("aboutPage.bio.highlight")}
          </p>
          <p className={styles.bioText}>
            {t("aboutPage.bio.text1")}
          </p>
          <p className={styles.bioText}>
            {t("aboutPage.bio.text2")}
          </p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{t("aboutPage.stats.yearsValue")}</span>
              <span className={styles.statLabel}>{t("aboutPage.stats.years")}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{t("aboutPage.stats.projectsValue")}</span>
              <span className={styles.statLabel}>{t("aboutPage.stats.projects")}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{t("aboutPage.stats.clientsValue")}</span>
              <span className={styles.statLabel}>{t("aboutPage.stats.clients")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 경력 타임라인 */}
      <div className={styles.experienceSection} ref={experienceRef}>
        <h3 className={styles.sectionSubtitle}>Experience</h3>
        <div className={styles.experienceList}>
          {experiences.map((exp, index) => (
            <div key={index} className={styles.experienceCard}>
              <span className={styles.experiencePeriod}>{exp.period[language]}</span>
              <h4 className={styles.experienceRole}>{exp.role[language]}</h4>
              <span className={styles.experienceCompany}>{exp.company}</span>
              <p className={styles.experienceDescription}>{exp.description[language]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 스킬 */}
      <div className={styles.skillsSection} ref={skillsRef}>
        <h3 className={styles.sectionSubtitle}>Skills</h3>
        <div className={styles.skillsList}>
          {skills.map((skill, index) => (
            <div key={index} className={styles.skillItem}>
              <div className={styles.skillHeader}>
                <span className={styles.skillName}>{skill.name}</span>
                <span className={styles.skillLevel}>{skill.level}%</span>
              </div>
              <div className={styles.skillBar}>
                <div className={styles.skillProgress} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 철학 */}
      <div className={styles.philosophySection} ref={philosophyRef}>
        <h3 className={styles.sectionSubtitle}>My Philosophy</h3>
        <div className={styles.philosophyGrid}>
          {philosophy.map((item, index) => (
            <div key={index} className={styles.philosophyCard}>
              <span className={styles.philosophyNumber}>0{index + 1}</span>
              <h4 className={styles.philosophyTitle}>{item.title}</h4>
              <p className={styles.philosophyDescription}>{item.description[language]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 크레딧 */}
      <CreditsFooter variant="section" />
    </section>
  );
}
