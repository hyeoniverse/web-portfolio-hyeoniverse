"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import MediaThumb from "@/components/ui/MediaThumb";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useLenis } from "@/providers/LenisProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickLocalized } from "@/types/common";
import T from "@/components/ui/T";
import type { WorksLayoutProps } from "./shared";
import styles from "./SplitLayout.module.css";

export default function SplitLayout({ projects, onProjectClick }: WorksLayoutProps) {
  const [active, setActive] = useState(-1);
  const { language } = useLanguage();
  const siteConfig = useSiteConfig();
  const w = siteConfig.works;
  const introVideoSrc = w.introVideoUrl || "/cover/videos/bg-1.mp4";
  const { lenis, scrollTo: lenisScrollTo } = useLenis();
  const rightRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const introRefs = useRef<(HTMLDivElement | null)[]>([]);

  // teleport 기반 seamless infinite scroll —
  // 3 cycle 로 cycle 1(middle) 을 viewport 기본 위치로 두고,
  // cycle 0 / cycle 2 는 bridge 역할(양쪽 buffer). cycle 1 boundary 넘으면 동일 콘텐츠 위치로 instant teleport → 시각적 단절 없음.
  const SETS = 3;
  type Item = { type: "intro"; key: string } | { type: "project"; project: typeof projects[number]; idx: number; key: string };
  const items: Item[] = [];
  for (let s = 0; s < SETS; s++) {
    items.push({ type: "intro", key: `intro-${s}` });
    for (let pi = 0; pi < projects.length; pi++) {
      items.push({ type: "project", project: projects[pi], idx: s * projects.length + pi, key: `proj-${s}-${pi}` });
    }
  }

  // 초기 위치 — middle cycle (cycle 1) 시작점으로. layout 측정이 끝난 뒤 한 프레임 미뤄 정확한 offsetTop 사용.
  useEffect(() => {
    if (!lenis) return;
    const id = requestAnimationFrame(() => {
      const cycle1 = introRefs.current[1];
      if (cycle1) lenisScrollTo(cycle1.offsetTop, { immediate: true });
    });
    return () => cancelAnimationFrame(id);
  }, [lenis, lenisScrollTo]);

  // boundary teleport —
  // scrollY 가 cycle 0 영역으로 내려가면 +1 cycle teleport (cycle 1 복귀)
  // scrollY 가 cycle 2 영역으로 들어가면 -1 cycle teleport (cycle 1 복귀)
  // cycle 들이 모두 동일 콘텐츠라 teleport 전후 visible 영역이 같음 → 단절 X.
  useEffect(() => {
    if (!lenis) return;
    const handleScroll = () => {
      const c1 = introRefs.current[1]?.offsetTop;
      const c2 = introRefs.current[2]?.offsetTop;
      if (c1 == null || c2 == null) return;
      const cycleH = c2 - c1;
      if (cycleH <= 0) return;
      const scrollY = window.scrollY;
      if (scrollY >= c2) {
        lenisScrollTo(scrollY - cycleH, { immediate: true });
      } else if (scrollY < c1) {
        lenisScrollTo(scrollY + cycleH, { immediate: true });
      }
    };
    lenis.on("scroll", handleScroll);
    return () => { lenis.off("scroll", handleScroll); };
  }, [lenis, lenisScrollTo]);

  // IntersectionObserver로 active 감지 (intro / 카드)
  useEffect(() => {
    const cards = cardRefs.current.filter((el): el is HTMLDivElement => el !== null);
    const intros = introRefs.current.filter((el): el is HTMLDivElement => el !== null);
    const targets: HTMLElement[] = [...intros, ...cards];
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target.getAttribute("data-intro") === "true") {
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
  }, [projects.length]);

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

      {/* Right — scrolling images. intro 가 cycle 마다 반복 노출되어 무한 스크롤 시 다시 만남 */}
      <div ref={rightRef} className={styles.right}>
        {items.map((item, i) => {
          if (item.type === "intro") {
            const introIdx = Number(item.key.split("-")[1]);
            return (
              <div
                key={item.key}
                ref={(el) => { introRefs.current[introIdx] = el; }}
                data-intro="true"
                className={styles.introCard}
              >
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
            );
          }
          const { project: proj, idx } = item;
          return (
            <div
              key={item.key}
              ref={(el) => { cardRefs.current[idx] = el; }}
              data-idx={idx}
              data-clickable="true"
              className={styles.imageCard}
              onClick={() => handleCardClick(idx, proj.id, proj.image)}
            >
              <MediaThumb
                src={proj.image}
                alt={pickLocalized(proj.title, language)}
                fill
                sizes="55vw"
                priority={i === 0}
                loading={i === 0 ? "eager" : "lazy"}
                fallbackSeed={proj.id}
              />
              <h2 className={styles.imageCardTitle}><T ko={proj.title.ko} en={proj.title.en} /></h2>
              <div className={styles.imageOverlay}>
                <div className={styles.imageYear}>{proj.year}</div>
              </div>
              {/* 모바일용 메타 오버레이 */}
              <div className={styles.imageMeta}>
                <span className={styles.imageMetaNumber}>{proj.number}</span>
                <h3 className={styles.imageMetaTitle}><T ko={proj.title.ko} en={proj.title.en} /></h3>
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
          );
        })}
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
