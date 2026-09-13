"use client";

import { useRef, useEffect, useState } from "react";
import MediaThumb from "@/components/ui/MediaThumb";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useLenis } from "@/providers/LenisProvider";
import T from "@/components/ui/T";
import TransitionLink from "@/components/ui/TransitionLink";
import { workHref, type WorksLayoutProps } from "./shared";
import styles from "./FullscreenLayout.module.css";

/** intro HUD — 매 초 갱신되는 KST 시계 */
function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** intro HUD — rAF 기반 실시간 FPS (1s window 평균) */
function useFps() {
  const [fps, setFps] = useState(60);
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let rafId = 0;
    const loop = (t: number) => {
      frames++;
      if (t - last >= 1000) {
        setFps(Math.round((frames * 1000) / (t - last)));
        frames = 0;
        last = t;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);
  return fps;
}

export default function FullscreenLayout({ projects, onProjectClick }: WorksLayoutProps) {
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  // -1 = intro, 0..N-1 = projects. 시작 시 intro 활성.
  const [activeIdx, setActiveIdx] = useState(-1);
  const siteConfig = useSiteConfig();
  const w = siteConfig.works;
  const infiniteScroll = w.infiniteScroll;
  const introVideoSrc = w.introVideoUrl || "/cover/videos/bg-1.mp4";
  const { lenis } = useLenis();
  // 무한 스크롤일 땐 프로젝트 sections 를 2 번 렌더해 seamless wrap. wrap 로직이 끝에서 oneSet 만큼 scroll 되돌림
  const sets = infiniteScroll ? 2 : 1;
  // intro HUD — 시계 + FPS
  const now = useClock();
  const fps = useFps();
  const timeStr = now ? now.toLocaleTimeString("en-GB", { hour12: false, timeZone: "Asia/Seoul" }) : "--:--:--";


  // IntersectionObserver — reveal + active tracking. intro 포함 (data-idx="-1")
  useEffect(() => {
    const sections = sectionRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number((entry.target as HTMLElement).dataset.idx);
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            if (entry.intersectionRatio >= 0.4) setActiveIdx(idx);
          } else {
            entry.target.classList.remove(styles.visible);
          }
        });
      },
      { threshold: [0.2, 0.4] },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [projects.length]);

  // 무한 스크롤 wrap — set 2 진입 시 set 1 위치로 scroll 되돌림 (oneSet 만큼 빼서 seamless).
  // DOM 복제로 시각적으로 같은 콘텐츠이므로 사용자는 jump 인지 못 함.
  useEffect(() => {
    if (!lenis || !infiniteScroll) return;
    const onScroll = ({ scroll }: { scroll: number }) => {
      const introH = window.innerHeight;
      const oneSet = projects.length * window.innerHeight;
      if (oneSet <= 0) return;
      // scroll 이 (intro + 1.5 set) 넘어가면 oneSet 빼서 set 1 의 mid 로 점프
      if (scroll > introH + 1.5 * oneSet) {
        lenis.scrollTo(scroll - oneSet, { immediate: true });
      }
    };
    lenis.on("scroll", onScroll);
    return () => { lenis.off("scroll", onScroll); };
  }, [lenis, infiniteScroll, projects.length]);

  return (
    <div className={styles.wrap}>
      {/* Fixed background images — crossfade. intro 일 땐 모두 hide (어두운 black + vignette 만) */}
      <div className={styles.bgLayer}>
        {projects.map((p, i) => (
          <div
            key={p.id}
            className={`${styles.bgImage} ${i === activeIdx ? styles.bgImageActive : ""}`}
            aria-hidden="true"
          >
            <MediaThumb
              src={p.image}
              fill
              sizes="100vw"
              priority={i === 0}
              loading={i === 0 ? "eager" : "lazy"}
              fallbackSeed={p.id}
            />
          </div>
        ))}
      </div>

      {/* Intro section — Live HUD (live data 코너) + scroll-driven 타이틀 morph (editorial typography). */}
      <div
        ref={(el) => { sectionRefs.current[0] = el; }}
        data-idx={-1}
        className={`${styles.section} ${styles.introSection}`}
      >
        {/* (D) Flow video — siteConfig.works.introVideoUrl 또는 /cover/videos/bg-1.mp4 fallback.
             없으면 자동 fade-out (errored 시 안 보임). 100MB 초과면 외부 CDN 사용 권장. */}
        <video
          className={styles.flowVideo}
          src={introVideoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div className={styles.flowVideoOverlay} aria-hidden="true" />

        {/* HUD — 4 코너 monospace 라이브 데이터 */}
        <div className={`${styles.hud} ${styles.hudTL}`} aria-hidden="true">
          <span className={styles.hudKey}>LOC</span>
          <span className={styles.hudVal}>SEOUL · KR</span>
          <span className={styles.hudMeta}>37.5665° N · 126.9780° E</span>
        </div>
        <div className={`${styles.hud} ${styles.hudTR}`} aria-hidden="true">
          <span className={styles.hudKey}>TIME</span>
          <span className={styles.hudVal} suppressHydrationWarning>{timeStr} KST</span>
          <span className={styles.hudMeta} suppressHydrationWarning>fps {String(fps).padStart(3, " ")}</span>
        </div>
        <div className={`${styles.hud} ${styles.hudBL}`} aria-hidden="true">
          <span className={styles.hudKey}>WORKS</span>
          <span className={styles.hudVal}>{String(projects.length).padStart(2, "0")} projects</span>
          <span className={styles.hudMeta}>scroll to explore</span>
        </div>
        <div className={`${styles.hud} ${styles.hudBR}`} aria-hidden="true">
          <span className={styles.hudKey}>STACK</span>
          <span className={styles.hudVal}>{(w.introScope_ko || w.introScope || "").split(" · ").slice(0, 3).join(" · ")}</span>
          <span className={styles.hudMeta}>+{Math.max(0, (w.introScope_ko || w.introScope || "").split(" · ").length - 3)} more</span>
        </div>

        {/* 중앙 editorial 타이틀 — scroll-driven morph (CSS view-timeline) */}
        <div className={styles.introInner}>
          <span className={styles.introLabel}>
            <span className={styles.introLabelDot} aria-hidden="true" />
            <T ko={w.introLabel_ko} en={w.introLabel} />
          </span>
          <h2 className={styles.introTitle}><T ko={w.introTitle_ko} en={w.introTitle} /></h2>
          <p className={styles.introTagline}><T ko={w.introTagline_ko} en={w.introTagline} /></p>
        </div>

      </div>

      {/* Project sections — infiniteScroll 시 sets 만큼 반복 (seamless wrap 위해 DOM 복제) */}
      {Array.from({ length: sets }).flatMap((_, setIdx) =>
        projects.map((p, i) => {
          const refIdx = 1 + setIdx * projects.length + i;
          return (
            <TransitionLink
              key={`${p.id}-${setIdx}`}
              href={workHref(p)}
              ref={(el: HTMLAnchorElement | null) => { sectionRefs.current[refIdx] = el; }}
              data-idx={i}
              className={styles.section}
              navigate={(rect) => onProjectClick(p, rect)}
            >
              <span className={styles.number}>{p.number}</span>

              <div className={styles.inner}>
                <span className={styles.category}>
                  <T ko={p.category.ko} en={p.category.en} />
                </span>
                <h2 className={styles.title}><T ko={p.title.ko} en={p.title.en} /></h2>
                <p className={styles.subtitle}>
                  <T ko={p.subtitle.ko} en={p.subtitle.en} />
                </p>
                <div className={styles.cta}>
                  <span className={styles.ctaBg} />
                  <span className={styles.ctaArrow}>↗</span>
                </div>
              </div>

              <span className={styles.year}>{p.year}</span>
              <div className={styles.tech}>
                {p.tech.slice(0, 4).map((tech: string, j: number) => (
                  <span key={j}>{tech}</span>
                ))}
              </div>
            </TransitionLink>
          );
        }),
      )}

      {/* Fixed counter — intro 에선 00, 이후 01..N */}
      <div className={styles.counter}>
        {activeIdx === -1 ? "00" : String(activeIdx + 1).padStart(2, "0")} — {String(projects.length).padStart(2, "0")}
      </div>

      {/* Scroll hint */}
      <div className={styles.scrollHint}>
        scroll
        <span>↓</span>
      </div>
    </div>
  );
}
