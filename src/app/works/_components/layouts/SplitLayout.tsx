"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import T from "@/components/ui/T";
import type { WorksLayoutProps } from "./shared";
import styles from "./SplitLayout.module.css";

export default function SplitLayout({ projects, onProjectClick }: WorksLayoutProps) {
  const [active, setActive] = useState(-1);
  const siteConfig = useSiteConfig();
  const w = siteConfig.works;
  const introVideoSrc = w.introVideoUrl || "/intro-bg.mp4";
  const introRef = useRef<HTMLDivElement>(null);
  const [sets, setSets] = useState(2);
  const rightRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const allProjects = Array(sets).fill(projects).flat();

  // IntersectionObserver로 active 감지 (intro 포함)
  useEffect(() => {
    const cards = cardRefs.current.filter((el): el is HTMLDivElement => el !== null);
    const targets: HTMLElement[] = [];
    if (introRef.current) targets.push(introRef.current);
    targets.push(...cards);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === introRef.current) {
              setActive(-1);
            } else {
              const idx = Number(entry.target.getAttribute("data-idx"));
              if (!isNaN(idx)) setActive(idx % projects.length);
            }
          }
        });
      },
      { threshold: 0.5 },
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [projects.length, sets]);

  // 끝에 도달하면 세트 추가
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setSets((s) => s + 1); },
      { rootMargin: "400px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((idx: number) => {
    const card = cardRefs.current[idx];
    if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleCardClick = useCallback(
    (i: number, id: string, image: string) => {
      const el = cardRefs.current[i];
      if (el) onProjectClick(id, el.getBoundingClientRect(), image);
    },
    [onProjectClick],
  );

  const p = active >= 0 ? projects[active] : projects[0];

  return (
    <div className={styles.wrap}>
      {/* 전체 배경 — fixed video. 오른쪽 panel 에서만 backdrop blur 로 흐림 */}
      <video
        className={styles.bgVideo}
        src={introVideoSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />

      {/* Left — fixed meta / intro */}
      <div className={styles.left}>
        <AnimatePresence mode="wait">
          {active === -1 ? (
            <motion.div
              key="intro"
              className={styles.leftInner}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className={styles.category}><T ko={w.introLabel_ko} en={w.introLabel} /></div>
              <h2 className={styles.title}><T ko={w.introTitle_ko} en={w.introTitle} /></h2>
              <p className={styles.subtitle}><T ko={w.introTagline_ko} en={w.introTagline} /></p>
              <p className={styles.desc}><T ko={w.introDesc_ko} en={w.introDesc} /></p>
              <div className={styles.tech}>
                {(w.introScope || w.introScope_ko).split(" · ").map((s, i) => (
                  <span key={i}>{s}</span>
                ))}
              </div>
              <div className={styles.counter}>
                {String(projects.length).padStart(2, "0")} Projects
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={active}
              className={styles.leftInner}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className={styles.number}>{p.number}</div>
              <div className={styles.category}>
                <T ko={p.category.ko} en={p.category.en} />
              </div>
              {/* 제목은 우측 imageCard 중앙 큰 타이포로 이동 */}
              <p className={styles.subtitle}>
                <T ko={p.subtitle.ko} en={p.subtitle.en} />
              </p>
              <p className={styles.desc}>
                <T ko={p.description.ko} en={p.description.en} />
              </p>
              <div className={styles.tech}>
                {p.tech.slice(0, 5).map((t, i) => (
                  <span key={i}>{t}</span>
                ))}
              </div>
              <div className={styles.role}>
                <T ko={p.role.ko} en={p.role.en} />
              </div>
              <div className={styles.counter}>
                {String(active + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Right — scrolling images */}
      <div ref={rightRef} className={styles.right}>
        {/* Intro card — 우측. 거대 quote mark 데코 + scroll 힌트 */}
        <div ref={introRef} className={styles.introCard}>
          <span className={styles.introQuoteMark} aria-hidden="true">&ldquo;</span>
          <blockquote className={styles.introQuote}>
            <T ko={w.introQuote_ko} en={w.introQuote} />
          </blockquote>
          <p className={styles.introDetail}>
            <T ko={w.introDetail_ko} en={w.introDetail} />
          </p>
          <div className={styles.introScrollHint} aria-hidden="true">
            <span>scroll</span>
            <span className={styles.introScrollLine} />
          </div>
        </div>
        {allProjects.map((proj, i) => (
          <div
            key={`${proj.id}-${i}`}
            ref={(el) => { cardRefs.current[i] = el; }}
            data-idx={i}
            data-clickable="true"
            className={styles.imageCard}
            onClick={() => handleCardClick(i, proj.id, proj.image)}
          >
            <Image
              src={proj.image}
              alt={proj.title}
              fill
              sizes="55vw"
              priority={i === 0}
              loading={i === 0 ? "eager" : "lazy"}
            />
            <h2 className={styles.imageCardTitle}>{proj.title}</h2>
            <div className={styles.imageOverlay}>
              <div className={styles.imageYear}>{proj.year}</div>
            </div>
            {/* 모바일용 메타 오버레이 */}
            <div className={styles.imageMeta}>
              <span className={styles.imageMetaNumber}>{proj.number}</span>
              <h3 className={styles.imageMetaTitle}>{proj.title}</h3>
              <p className={styles.imageMetaSub}>
                <T ko={proj.subtitle.ko} en={proj.subtitle.en} />
              </p>
              <div className={styles.imageMetaTech}>
                {proj.tech.slice(0, 3).map((tech: string, j: number) => (
                  <span key={j}>{tech}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>

      {/* Navigation dots */}
      <div className={styles.dots}>
        {projects.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === active ? styles.dotActive : ""}`}
            onClick={() => scrollTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
