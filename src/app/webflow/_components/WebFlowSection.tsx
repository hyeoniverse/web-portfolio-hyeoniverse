"use client";

import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLanguage } from "@/providers/LanguageProvider";
import { siteConfig } from "@/config/site.config";
import {
  designFeatures,
  techStack,
  designProcess,
  codeExamples,
  troubleShootingItems,
} from "@/data/webflow";
import styles from "./WebFlowSection.module.css";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function WebFlowSection() {
  const { t, language } = useLanguage();
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
        <span className={styles.label}>{t("webflow.title")}</span>
        <h2 className={styles.title}>
          Web Flow
          <br />
          <span className={styles.titleAccent}>& Implementation</span>
        </h2>
        <p className={styles.subtitle}>
          {t("webflow.description")}
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
            <p className={styles.featureDescription}>{feature.description[language]}</p>
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
                <h4 className={styles.processTitle}>{process.title[language]}</h4>
                <p className={styles.processDescription}>{process.description[language]}</p>
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
              <p className={styles.codeDescription}>{example.description[language]}</p>
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
                <h4 className={styles.troubleTitle}>{item.problem[language]}</h4>
              </div>
              <div className={styles.troubleBody}>
                <div className={styles.troubleItem}>
                  <span className={styles.troubleLabel}>{t("webflow.troubleshooting.cause")}</span>
                  <p>{item.cause[language]}</p>
                </div>
                <div className={styles.troubleItem}>
                  <span className={styles.troubleLabel}>{t("webflow.troubleshooting.solution")}</span>
                  <p>{item.solution[language]}</p>
                </div>
                <div className={styles.troubleItem}>
                  <span className={styles.troubleLabel}>{t("webflow.troubleshooting.keyInsight")}</span>
                  <p className={styles.troubleInsight}>{item.keyInsight[language]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credits */}
      <div className={styles.credits}>
        <p className={styles.creditsText}>
          {t("webflow.credits")}{" "}
          {siteConfig.personal.nickname}
        </p>
      </div>
    </section>
  );
}
